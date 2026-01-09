import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$lib/services/supabase';
import { sendEmail, sendErrorNotification, getCertificationEmailSubject, getCertificationEmailBody } from '$lib/services/email';

// Create admin client for server-side operations
// Use service role key if available, otherwise fall back to anon key
const supabaseAdmin = createClient(
	SUPABASE_URL,
	env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
);

interface FileRecord {
	id: string;
	filename: string;
	file_type: string;
	storage_path: string;
}

interface GroupedFile {
	file_id: string;
	invoice_number: string;
	filename: string;
	storage_path: string;
}

function extractInvoiceNumberFromFilename(filename: string): string | null {
	const parts = filename.split('_');
	const lastPart = parts[parts.length - 1];
	const invoiceNumber = lastPart.toLowerCase().endsWith('.pdf')
		? lastPart.slice(0, -4)
		: lastPart;

	// Validate invoice number is numeric
	if (!invoiceNumber || !/^\d+$/.test(invoiceNumber)) {
		return null;
	}

	return invoiceNumber;
}

async function getClientIdFromInvoice(invoiceNumber: string): Promise<string | null> {
	// Try with original number
	let { data } = await supabaseAdmin
		.from('invoices')
		.select('client_id')
		.eq('invoice_number', invoiceNumber)
		.limit(1)
		.single();

	if (data?.client_id) {
		return data.client_id;
	}

	// Try with .0 suffix (decimal format)
	const result = await supabaseAdmin
		.from('invoices')
		.select('client_id')
		.eq('invoice_number', `${invoiceNumber}.0`)
		.limit(1)
		.single();

	return result.data?.client_id || null;
}

async function getClientEmails(clientId: string): Promise<string[]> {
	const { data: clientEmailIds } = await supabaseAdmin
		.from('client_emails')
		.select('email_id')
		.eq('client_id', clientId);

	if (!clientEmailIds || clientEmailIds.length === 0) {
		return [];
	}

	const emails: string[] = [];
	for (const rec of clientEmailIds) {
		if (!rec.email_id) continue;

		const { data: emailRecord } = await supabaseAdmin
			.from('emails')
			.select('email')
			.eq('id', rec.email_id)
			.single();

		if (emailRecord?.email) {
			emails.push(emailRecord.email);
		}
	}

	return emails;
}

async function getClientName(clientId: string): Promise<string> {
	const { data } = await supabaseAdmin
		.from('clients')
		.select('name')
		.eq('id', clientId)
		.single();

	return data?.name || clientId;
}

export const POST: RequestHandler = async () => {
	try {
		// Get files uploaded in the last 5 days
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - 5);

		const { data: files, error: filesError } = await supabaseAdmin
			.from('files')
			.select('id, filename, file_type, storage_path')
			.eq('file_type', 'certificaciones_pdf')
			.eq('processed', false)
			.eq('status', 'active')
			.gte('uploaded_at', cutoffDate.toISOString());

		if (filesError) {
			return json({ error: `Error buscando archivos: ${filesError.message}` }, { status: 500 });
		}

		if (!files || files.length === 0) {
			return json({ message: 'No hay archivos pendientes de envío' }, { status: 200 });
		}

		// Group files by client_id
		const grouped = new Map<string, GroupedFile[]>();

		for (const file of files as FileRecord[]) {
			const invoiceNumber = extractInvoiceNumberFromFilename(file.filename);

			if (!invoiceNumber) {
				console.log(`⚠️ Invoice inválido, saltando archivo: ${file.filename}`);
				continue;
			}

			const clientId = await getClientIdFromInvoice(invoiceNumber);

			if (!clientId) {
				console.log(`⚠️ No se encontró invoice con número ${invoiceNumber}`);
				continue;
			}

			const existing = grouped.get(clientId) || [];
			existing.push({
				file_id: file.id,
				invoice_number: invoiceNumber,
				filename: file.filename,
				storage_path: file.storage_path
			});
			grouped.set(clientId, existing);
		}

		if (grouped.size === 0) {
			return json({ message: 'No se encontraron facturas válidas para enviar.' }, { status: 200 });
		}

		let enviados = 0;
		let sinCorreo = 0;
		let clientesSinCorreo = 0;

		for (const [clientId, fileList] of grouped) {
			const clientName = await getClientName(clientId);
			const clientEmails = await getClientEmails(clientId);

			// If no custom emails, notify and skip
			if (clientEmails.length === 0) {
				console.log(`🚫 No se encontraron correos para el cliente ${clientName} (ID: ${clientId})`);

				const filenames = fileList.map((f) => f.filename);
				const subject = `[AVISO] Certificaciones sin correo del cliente - ${clientName}`;
				const body = `Las siguientes certificaciones no fueron enviadas porque no se encontraron correos para el cliente ${clientName}:\n\n${filenames.join('\n')}`;

				await sendErrorNotification(subject, body);

				sinCorreo += filenames.length;
				clientesSinCorreo++;
				continue;
			}

			// Download files from storage
			const attachments: { filename: string; content: Buffer; contentType: string }[] = [];

			for (const file of fileList) {
				const { data: fileData, error: downloadError } = await supabaseAdmin.storage
					.from('uploads')
					.download(file.storage_path);

				if (downloadError || !fileData) {
					console.error(`Error descargando ${file.filename}: ${downloadError?.message}`);
					continue;
				}

				const buffer = Buffer.from(await fileData.arrayBuffer());
				attachments.push({
					filename: file.filename,
					content: buffer,
					contentType: 'application/pdf'
				});
			}

			if (attachments.length === 0) {
				console.log(`⚠️ No se pudieron descargar archivos para ${clientName}`);
				continue;
			}

			// Send email
			const subject = getCertificationEmailSubject(clientName);
			const body = getCertificationEmailBody();

			const success = await sendEmail(clientEmails, subject, body, attachments);

			if (success) {
				// Mark files as processed
				const now = new Date().toISOString();
				for (const file of fileList) {
					await supabaseAdmin
						.from('files')
						.update({ processed: true, processed_at: now })
						.eq('id', file.file_id);
				}

				enviados += fileList.length;
				console.log(`✅ Enviado correo a ${clientName} con ${fileList.length} certificaciones`);
			} else {
				console.error(`❌ Error al enviar correo a ${clientName}`);
			}
		}

		return json({
			success: true,
			message: `${enviados} certificaciones enviadas, ${sinCorreo} no se enviaron por falta de correos (${clientesSinCorreo} clientes sin correo).`,
			enviados,
			sinCorreo,
			clientesSinCorreo
		});
	} catch (error) {
		console.error('Error sending certifications:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Error desconocido' },
			{ status: 500 }
		);
	}
};
