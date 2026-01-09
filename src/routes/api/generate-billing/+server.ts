import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$lib/services/supabase';
import {
	readInvoiceSummary,
	validateInvoiceSummaryRow,
	getCountryFromCurrency,
	extractMonthFromFilename,
	getSpanishMonthName,
	normalizeInvoiceNumber,
	generateBillingRows,
	createBillingFile,
	type InvoiceSummaryRow
} from '$lib/services/excel';

// Create admin client for server-side operations
// Use service role key if available, otherwise fall back to anon key
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

async function getOrCreateAgency(name: string, country: string): Promise<string> {
	const { data: existing } = await supabaseAdmin
		.from('agencies')
		.select('id')
		.eq('name', name)
		.eq('country', country.toLowerCase())
		.single();

	if (existing) {
		return existing.id;
	}

	const { data: inserted, error } = await supabaseAdmin
		.from('agencies')
		.insert({ name, country: country.toLowerCase() })
		.select('id')
		.single();

	if (error) throw new Error(`Error creating agency: ${error.message}`);
	return inserted.id;
}

async function getOrCreateClient(name: string, country: string): Promise<string> {
	const { data: existing } = await supabaseAdmin
		.from('clients')
		.select('id')
		.eq('name', name)
		.eq('country', country.toLowerCase())
		.single();

	if (existing) {
		return existing.id;
	}

	const { data: inserted, error } = await supabaseAdmin
		.from('clients')
		.insert({ name, country: country.toLowerCase() })
		.select('id')
		.single();

	if (error) throw new Error(`Error creating client: ${error.message}`);
	return inserted.id;
}

async function insertOrUpdateInvoice(
	row: InvoiceSummaryRow,
	agencyName: string,
	clientId: string,
	country: string,
	invoiceMonth: number,
	invoiceYear: number
): Promise<void> {
	const invoiceNumber = normalizeInvoiceNumber(row['Invoice #']);

	// Calculate last day of month for invoice date
	const lastDay = new Date(invoiceYear, invoiceMonth, 0).getDate();
	const invoiceDate = `${invoiceYear}-${String(invoiceMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

	const invoiceData = {
		invoice_number: invoiceNumber,
		invoice_date: invoiceDate,
		gross_value: row['Gross Invoice '] ? Number(row['Gross Invoice ']) : null,
		net_value: row['Net Invoice'] ? Number(row['Net Invoice']) : null,
		channel: row['Channel'] || null,
		agency: agencyName,
		order_reference: row['Order Reference'] || null,
		client_id: clientId,
		country: country.toLowerCase(),
		created_at: new Date().toISOString(),
		product: row['Product'] || null,
		feed: row['Feed'] || null,
		campaign_number: row['Campaign #'] ? String(row['Campaign #']) : null,
		commission_percent: row['Comm %'] ? Number(row['Comm %']) : null,
		commission_amount: row['Commission'] ? Number(row['Commission']) : null,
		sales_executive: row['Sales Exec.'] || null,
		system_source: row['System'] || null,
		spot_count: row['Spot Count'] ? Number(row['Spot Count']) : null,
		business_type: row['Business Type'] || null,
		document_type: row['Type'] || null,
		company_code: row['Company Code'] || null,
		channel_by_feed: row['Channel by Feed'] || null,
		due_date: null,
		exhibition_month: `${invoiceYear}-${String(invoiceMonth).padStart(2, '0')}`
	};

	// Check if invoice exists
	const { data: existing } = await supabaseAdmin
		.from('invoices')
		.select('id')
		.eq('invoice_number', invoiceNumber)
		.eq('country', country.toLowerCase())
		.single();

	if (existing) {
		// Update existing
		await supabaseAdmin
			.from('invoices')
			.update(invoiceData)
			.eq('id', existing.id);
	} else {
		// Insert new
		await supabaseAdmin
			.from('invoices')
			.insert(invoiceData);
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { month } = body;

		if (!month) {
			return json({ error: 'El mes es requerido' }, { status: 400 });
		}

		const monthNumber = MONTH_TO_NUMBER[month.toLowerCase()];
		if (!monthNumber) {
			return json({ error: 'Mes inválido' }, { status: 400 });
		}

		const monthName = getSpanishMonthName(monthNumber).toLowerCase();

		// Find invoice_summary file for the month
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
		console.log(`Processing file: ${fileRecord.filename}`);

		// Download file from storage
		const { data: fileData, error: downloadError } = await supabaseAdmin.storage
			.from('uploads')
			.download(fileRecord.storage_path);

		if (downloadError || !fileData) {
			return json({ error: `Error descargando archivo: ${downloadError?.message}` }, { status: 500 });
		}

		// Read Excel
		const buffer = await fileData.arrayBuffer();
		const invoiceData = readInvoiceSummary(buffer);

		if (invoiceData.length === 0) {
			return json({ error: 'El archivo no contiene datos válidos' }, { status: 400 });
		}

		// Validate all rows first
		for (let i = 0; i < invoiceData.length; i++) {
			const validation = validateInvoiceSummaryRow(invoiceData[i], i);
			if (!validation.valid) {
				return json({ error: validation.error }, { status: 400 });
			}
		}

		// Get country from currency
		const country = getCountryFromCurrency(invoiceData[0].Currency);
		const invoiceMonth = extractMonthFromFilename(fileRecord.filename);
		const invoiceYear = new Date().getFullYear();

		// Process each row - create clients/agencies and insert invoices
		for (const row of invoiceData) {
			// Create agency if needed
			await getOrCreateAgency(row.Agency, country);

			// Create client if needed
			const clientId = await getOrCreateClient(row.Client, country);

			// Insert or update invoice
			await insertOrUpdateInvoice(row, row.Agency, clientId, country, invoiceMonth, invoiceYear);
		}

		// Generate billing file
		const billingRows = generateBillingRows(invoiceData, invoiceMonth, invoiceYear);
		const billingBuffer = createBillingFile(billingRows);

		// Upload billing file to storage
		const outputFilename = `Facturacion_${getSpanishMonthName(invoiceMonth)}_${country.toUpperCase()}.xlsx`;
		const outputPath = `processed/${outputFilename}`;

		// Remove existing file if any
		await supabaseAdmin.storage.from('uploads').remove([outputPath]);

		// Upload new file
		const { error: uploadError } = await supabaseAdmin.storage
			.from('uploads')
			.upload(outputPath, billingBuffer, {
				contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			});

		if (uploadError) {
			return json({ error: `Error subiendo archivo: ${uploadError.message}` }, { status: 500 });
		}

		// Create file record for the billing file
		await supabaseAdmin.from('files').insert({
			filename: outputFilename,
			storage_path: outputPath,
			file_type: 'facturacion',
			processed: true,
			status: 'active'
		});

		// Mark original file as processed
		await supabaseAdmin
			.from('files')
			.update({ processed: true, processed_at: new Date().toISOString() })
			.eq('id', fileRecord.id);

		return json({
			success: true,
			message: `Archivo de facturación generado: ${outputFilename}`,
			invoicesProcessed: invoiceData.length,
			outputPath
		});
	} catch (error) {
		console.error('Error generating billing file:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Error desconocido' },
			{ status: 500 }
		);
	}
};
