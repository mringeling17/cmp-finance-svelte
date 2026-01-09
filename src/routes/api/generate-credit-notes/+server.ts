import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$lib/services/supabase';
import {
	readInvoiceSummary,
	readXubioFile,
	createXubioInvoiceMap,
	generateCreditNoteRows,
	createCreditNoteFile,
	getSpanishMonthName,
	extractMonthFromFilename,
	getCountryFromCurrency,
	normalizeInvoiceNumber
} from '$lib/services/excel';

// Create admin client for server-side operations
const supabaseAdmin = createClient(
	SUPABASE_URL,
	env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
);

const MONTH_TO_NUMBER: Record<string, number> = {
	'01': 1, '02': 2, '03': 3, '04': 4, '05': 5, '06': 6,
	'07': 7, '08': 8, '09': 9, '10': 10, '11': 11, '12': 12,
	enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
	julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const xubioFile = formData.get('file') as File;
		const month = formData.get('month') as string;

		if (!xubioFile) {
			return json({ error: 'El archivo de Xubio es requerido' }, { status: 400 });
		}

		if (!month) {
			return json({ error: 'El mes es requerido' }, { status: 400 });
		}

		const monthNumber = MONTH_TO_NUMBER[month.toLowerCase()];
		if (!monthNumber) {
			return json({ error: 'Mes inválido' }, { status: 400 });
		}

		const monthName = getSpanishMonthName(monthNumber).toLowerCase();

		// 1. Read Xubio file
		const xubioBuffer = await xubioFile.arrayBuffer();
		const xubioData = readXubioFile(xubioBuffer);

		if (xubioData.length === 0) {
			return json({ error: 'El archivo de Xubio no contiene datos válidos' }, { status: 400 });
		}

		// 2. Create map from Invoice # → Comprobante
		const xubioMap = createXubioInvoiceMap(xubioData);
		console.log(`Xubio map created with ${xubioMap.size} entries`);

		// 3. Find Invoice Summary file for the month (Argentina only)
		const { data: files, error: filesError } = await supabaseAdmin
			.from('files')
			.select('*')
			.eq('file_type', 'invoice_summary')
			.eq('status', 'active')
			.ilike('filename', `%${monthName}%`);

		if (filesError) {
			return json({ error: `Error buscando archivo: ${filesError.message}` }, { status: 500 });
		}

		if (!files || files.length === 0) {
			return json({ error: `No se encontró archivo Invoice Summary para ${monthName}` }, { status: 404 });
		}

		const fileRecord = files[0];
		console.log(`Processing Invoice Summary: ${fileRecord.filename}`);

		// 4. Download Invoice Summary from storage
		const { data: fileData, error: downloadError } = await supabaseAdmin.storage
			.from('uploads')
			.download(fileRecord.storage_path);

		if (downloadError || !fileData) {
			return json({ error: `Error descargando archivo: ${downloadError?.message}` }, { status: 500 });
		}

		// 5. Read Invoice Summary
		const buffer = await fileData.arrayBuffer();
		const invoiceData = readInvoiceSummary(buffer);

		if (invoiceData.length === 0) {
			return json({ error: 'El Invoice Summary no contiene datos válidos' }, { status: 400 });
		}

		// Check it's Argentina (ARS currency)
		const country = getCountryFromCurrency(invoiceData[0].Currency);
		if (country !== 'ar') {
			return json({
				error: 'Las notas de crédito solo están disponibles para Argentina (ARS)'
			}, { status: 400 });
		}

		// 6. Get agencies with receives_credit_note = true
		const { data: agencies, error: agenciesError } = await supabaseAdmin
			.from('agencies')
			.select('name')
			.eq('receives_credit_note', true)
			.eq('country', 'ar');

		if (agenciesError) {
			return json({ error: `Error obteniendo agencias: ${agenciesError.message}` }, { status: 500 });
		}

		const agenciesWithCreditNote = new Set(agencies?.map(a => a.name) || []);
		console.log(`Agencies with credit note: ${agenciesWithCreditNote.size}`);

		if (agenciesWithCreditNote.size === 0) {
			return json({
				error: 'No hay agencias marcadas para recibir notas de crédito. Marque agencias en la sección de Agencias.'
			}, { status: 400 });
		}

		// 7. Extract month from filename for invoice year calculation
		const invoiceMonth = extractMonthFromFilename(fileRecord.filename);
		const invoiceYear = new Date().getFullYear();

		// 8. Generate credit note rows
		const creditNoteRows = generateCreditNoteRows(
			invoiceData,
			xubioMap,
			agenciesWithCreditNote,
			invoiceMonth,
			invoiceYear
		);

		if (creditNoteRows.length === 0) {
			return json({
				error: 'No se generaron notas de crédito. Verifique que las agencias estén marcadas y los números de factura coincidan.'
			}, { status: 400 });
		}

		// 9. Update invoices with assigned_invoice_number
		let updatedCount = 0;
		for (const row of invoiceData) {
			const invoiceNum = normalizeInvoiceNumber(row['Invoice #']);
			const comprobante = xubioMap.get(invoiceNum);

			if (comprobante) {
				const { error: updateError } = await supabaseAdmin
					.from('invoices')
					.update({ assigned_invoice_number: comprobante })
					.eq('invoice_number', invoiceNum)
					.eq('country', 'ar');

				if (!updateError) {
					updatedCount++;
				}
			}
		}

		// 10. Create Excel file
		const creditNoteBuffer = createCreditNoteFile(creditNoteRows);

		// 11. Upload to storage
		const outputFilename = `NotasCredito_${getSpanishMonthName(invoiceMonth)}_AR.xlsx`;
		const outputPath = `processed/${outputFilename}`;

		// Remove existing file if any
		await supabaseAdmin.storage.from('uploads').remove([outputPath]);

		// Upload new file
		const { error: uploadError } = await supabaseAdmin.storage
			.from('uploads')
			.upload(outputPath, creditNoteBuffer, {
				contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			});

		if (uploadError) {
			return json({ error: `Error subiendo archivo: ${uploadError.message}` }, { status: 500 });
		}

		// 12. Create file record
		await supabaseAdmin.from('files').insert({
			filename: outputFilename,
			storage_path: outputPath,
			file_type: 'notas_credito',
			processed: true,
			status: 'active'
		});

		const creditNotesGenerated = creditNoteRows.length / 2; // Each credit note has 2 rows

		return json({
			success: true,
			message: `Archivo de notas de crédito generado: ${outputFilename}`,
			creditNotesGenerated,
			invoicesUpdated: updatedCount,
			outputPath
		});

	} catch (error) {
		console.error('Error generating credit notes:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Error desconocido' },
			{ status: 500 }
		);
	}
};
