import * as XLSX from 'xlsx';

export interface InvoiceSummaryRow {
	'Invoice #': string;
	'Invoice Date': string;
	Agency: string;
	Client: string;
	Channel: string;
	'Order Reference': string;
	'Gross Invoice ': number;
	'Net Invoice': number;
	Currency: string;
	Product?: string;
	Feed?: string;
	'Campaign #'?: string;
	'Comm %'?: number;
	Commission?: number;
	'Sales Exec.'?: string;
	System?: string;
	'Spot Count'?: number;
	'Business Type'?: string;
	Type?: string;
	'Company Code'?: string;
	'Channel by Feed'?: string;
}

export interface BillingRow {
	NUMERODECONTROL: number | string;
	CLIENTE: string;
	TIPO: number | string;
	NUMERO: string;
	FECHA: string;
	VENCIMIENTODELCOBRO: string;
	COMPROBANTEASOCIADO: string;
	MONEDA: string;
	COTIZACION: string;
	OBSERVACIONES: string;
	PRODUCTOSERVICIO: string;
	CENTRODECOSTO: string;
	PRODUCTOOBSERVACION: string;
	CANTIDAD: number | string;
	PRECIO: number | string;
	DESCUENTO: string;
	IMPORTE: number | string;
	IVA: number | string;
}

const MONTH_MAPPING: Record<string, number> = {
	enero: 1,
	january: 1,
	jan: 1,
	febrero: 2,
	february: 2,
	feb: 2,
	marzo: 3,
	march: 3,
	mar: 3,
	abril: 4,
	april: 4,
	apr: 4,
	mayo: 5,
	may: 5,
	junio: 6,
	june: 6,
	jun: 6,
	julio: 7,
	july: 7,
	jul: 7,
	agosto: 8,
	august: 8,
	aug: 8,
	septiembre: 9,
	september: 9,
	sep: 9,
	octubre: 10,
	october: 10,
	oct: 10,
	noviembre: 11,
	november: 11,
	nov: 11,
	diciembre: 12,
	december: 12,
	dec: 12
};

const SPANISH_MONTHS = [
	'',
	'Enero',
	'Febrero',
	'Marzo',
	'Abril',
	'Mayo',
	'Junio',
	'Julio',
	'Agosto',
	'Septiembre',
	'Octubre',
	'Noviembre',
	'Diciembre'
];

export function getCountryFromCurrency(currency: string): string {
	const currencyLower = currency?.toLowerCase().trim() || '';
	const currencyToCountry: Record<string, string> = {
		ars: 'ar',
		mxn: 'mx',
		clp: 'cl',
		ar: 'ar',
		mx: 'mx',
		cl: 'cl'
	};
	return currencyToCountry[currencyLower] || 'generico';
}

export function extractMonthFromFilename(filename: string): number {
	const filenameLower = filename.toLowerCase();
	const parts = filenameLower.split(/[_\-.\s]+/);

	for (const part of parts) {
		if (MONTH_MAPPING[part]) {
			return MONTH_MAPPING[part];
		}
	}

	return new Date().getMonth() + 1;
}

export function getSpanishMonthName(monthNumber: number): string {
	return SPANISH_MONTHS[monthNumber] || '';
}

export function getLastDayOfMonth(year: number, month: number): Date {
	return new Date(year, month, 0);
}

export function readInvoiceSummary(buffer: ArrayBuffer): InvoiceSummaryRow[] {
	const workbook = XLSX.read(buffer, { type: 'array' });
	const sheetName = 'Invoice Summary';

	if (!workbook.SheetNames.includes(sheetName)) {
		throw new Error(`No se encontró la hoja "${sheetName}" en el archivo`);
	}

	const sheet = workbook.Sheets[sheetName];

	// Read with header at row 5 (0-indexed: row 5 = index 4, but range starts at 6 for data)
	const data = XLSX.utils.sheet_to_json<InvoiceSummaryRow>(sheet, {
		range: 5, // Skip first 5 rows, header is at row 6 (1-indexed)
		defval: null
	});

	// Filter out empty rows and total rows
	const filteredData = data.filter((row) => {
		const invoiceDate = String(row['Invoice Date'] || '').trim().toUpperCase();
		const invoiceNumber = row['Invoice #'];
		const agency = row['Agency'];
		const client = row['Client'];

		// Skip TOTAL rows
		if (invoiceDate === 'TOTAL') return false;

		// Skip rows without required fields
		if (!invoiceNumber || String(invoiceNumber).trim() === '') return false;
		if (!agency || String(agency).trim() === '') return false;
		if (!client || String(client).trim() === '') return false;

		return true;
	});

	return filteredData;
}

export function validateInvoiceSummaryRow(
	row: InvoiceSummaryRow,
	index: number
): { valid: boolean; error?: string } {
	// Validate Invoice #
	if (!row['Invoice #'] || String(row['Invoice #']).trim() === '') {
		return { valid: false, error: `Fila ${index + 1}: 'Invoice #' es obligatorio` };
	}

	// Validate Agency
	if (!row['Agency'] || String(row['Agency']).trim() === '') {
		return { valid: false, error: `Fila ${index + 1}: 'Agency' es obligatorio` };
	}

	// Validate Client
	if (!row['Client'] || String(row['Client']).trim() === '') {
		return { valid: false, error: `Fila ${index + 1}: 'Client' es obligatorio` };
	}

	// Validate numeric fields
	if (row['Gross Invoice '] !== null && row['Gross Invoice '] !== undefined) {
		const gross = Number(row['Gross Invoice ']);
		if (isNaN(gross)) {
			return { valid: false, error: `Fila ${index + 1}: 'Gross Invoice' no es un número válido` };
		}
	}

	if (row['Net Invoice'] !== null && row['Net Invoice'] !== undefined) {
		const net = Number(row['Net Invoice']);
		if (isNaN(net)) {
			return { valid: false, error: `Fila ${index + 1}: 'Net Invoice' no es un número válido` };
		}
	}

	return { valid: true };
}

export function normalizeInvoiceNumber(invoiceNumber: string | number): string {
	let normalized = String(invoiceNumber).trim();
	if (normalized.endsWith('.0')) {
		normalized = normalized.slice(0, -2);
	}
	return normalized;
}

export function createBillingFile(rows: BillingRow[]): ArrayBuffer {
	const worksheet = XLSX.utils.json_to_sheet(rows);

	// Set column widths
	worksheet['!cols'] = [
		{ wch: 18 }, // NUMERODECONTROL
		{ wch: 40 }, // CLIENTE
		{ wch: 6 }, // TIPO
		{ wch: 20 }, // NUMERO
		{ wch: 12 }, // FECHA
		{ wch: 20 }, // VENCIMIENTODELCOBRO
		{ wch: 20 }, // COMPROBANTEASOCIADO
		{ wch: 18 }, // MONEDA
		{ wch: 12 }, // COTIZACION
		{ wch: 80 }, // OBSERVACIONES
		{ wch: 25 }, // PRODUCTOSERVICIO
		{ wch: 15 }, // CENTRODECOSTO
		{ wch: 25 }, // PRODUCTOOBSERVACION
		{ wch: 10 }, // CANTIDAD
		{ wch: 15 }, // PRECIO
		{ wch: 12 }, // DESCUENTO
		{ wch: 15 }, // IMPORTE
		{ wch: 15 } // IVA
	];

	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

	const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
	return buffer;
}

export function generateBillingRows(
	invoiceData: InvoiceSummaryRow[],
	invoiceMonth: number,
	invoiceYear: number
): BillingRow[] {
	const rows: BillingRow[] = [];
	const monthName = getSpanishMonthName(invoiceMonth);

	// Calculate dates
	const lastDayOfMonth = getLastDayOfMonth(invoiceYear, invoiceMonth);
	const nextMonth = invoiceMonth === 12 ? 1 : invoiceMonth + 1;
	const nextYear = invoiceMonth === 12 ? invoiceYear + 1 : invoiceYear;
	const lastDayOfNextMonth = getLastDayOfMonth(nextYear, nextMonth);

	const fechaStr = lastDayOfMonth.toISOString().split('T')[0];
	const vencimientoStr = lastDayOfNextMonth.toISOString().split('T')[0];

	invoiceData.forEach((row, index) => {
		const numero = index + 1;
		// Use original Invoice # without normalizing for observacion (matching Python)
		const observacion = `Certificacion ${row['Invoice #']} / ${row['Channel'] || ''} / ${row['Client'] || ''} / ${row['Order Reference'] || ''}`;
		const descripcion = `${monthName}, ${invoiceYear}`;
		const precio = Number(row['Gross Invoice ']) || 0;

		// Row 1 - Header
		rows.push({
			NUMERODECONTROL: numero,
			CLIENTE: row['Agency'],
			TIPO: 1,
			NUMERO: 'A-00002-00000000',
			FECHA: fechaStr,
			VENCIMIENTODELCOBRO: vencimientoStr,
			COMPROBANTEASOCIADO: '',
			MONEDA: 'Pesos Argentinos',
			COTIZACION: '',
			OBSERVACIONES: observacion,
			PRODUCTOSERVICIO: '',
			CENTRODECOSTO: '',
			PRODUCTOOBSERVACION: '',
			CANTIDAD: '',
			PRECIO: '',
			DESCUENTO: '',
			IMPORTE: '',
			IVA: ''
		});

		// Row 2 - Detail
		rows.push({
			NUMERODECONTROL: numero,
			CLIENTE: '',
			TIPO: '',
			NUMERO: '',
			FECHA: '',
			VENCIMIENTODELCOBRO: '',
			COMPROBANTEASOCIADO: '',
			MONEDA: '',
			COTIZACION: '',
			OBSERVACIONES: '',
			PRODUCTOSERVICIO: 'Servicio Publicidad',
			CENTRODECOSTO: 'NBCU ON AIR',
			PRODUCTOOBSERVACION: descripcion,
			CANTIDAD: 1,
			PRECIO: precio,
			DESCUENTO: '',
			IMPORTE: precio,
			IVA: Math.round(precio * 0.21 * 100) / 100
		});
	});

	return rows;
}

// ==================== CREDIT NOTES (NOTAS DE CRÉDITO) ====================

export interface XubioRow {
	Comprobante: string;
	Cliente: string;
	Observaciones: string;
	'Importe Bruto': number;
	Fecha: number | string;
}

/**
 * Reads Xubio billing file and returns rows with invoice data
 */
export function readXubioFile(buffer: ArrayBuffer): XubioRow[] {
	const workbook = XLSX.read(buffer, { type: 'array' });
	const sheetName = workbook.SheetNames[0]; // Use first sheet (usually 'hoja1')

	const sheet = workbook.Sheets[sheetName];
	const data = XLSX.utils.sheet_to_json<XubioRow>(sheet, {
		defval: null
	});

	// Filter valid rows (must have Comprobante and Observaciones)
	return data.filter((row) => {
		return row.Comprobante && row.Observaciones;
	});
}

/**
 * Extracts the original Invoice # from Observaciones field
 * Example: "Certificacion 20251230070 / Universal Channel / ..." → "20251230070"
 */
export function extractInvoiceNumberFromObservaciones(observaciones: string): string | null {
	if (!observaciones) return null;

	// Match "Certificacion XXXXXXX" pattern
	const match = observaciones.match(/Certificacion\s+(\d+)/i);
	return match ? match[1] : null;
}

/**
 * Creates a map from Invoice # → Comprobante (assigned invoice number)
 */
export function createXubioInvoiceMap(xubioData: XubioRow[]): Map<string, string> {
	const map = new Map<string, string>();

	for (const row of xubioData) {
		const invoiceNum = extractInvoiceNumberFromObservaciones(row.Observaciones);
		if (invoiceNum && row.Comprobante) {
			// Normalize the invoice number (remove .0 suffix if present)
			const normalized = normalizeInvoiceNumber(invoiceNum);
			map.set(normalized, row.Comprobante);
		}
	}

	return map;
}

/**
 * Generates credit note rows (2 rows per record)
 * Only for agencies with receives_credit_note = true
 */
export function generateCreditNoteRows(
	invoiceData: InvoiceSummaryRow[],
	xubioMap: Map<string, string>,
	agenciesWithCreditNote: Set<string>,
	invoiceMonth: number,
	invoiceYear: number
): BillingRow[] {
	const rows: BillingRow[] = [];
	const monthName = getSpanishMonthName(invoiceMonth);

	// Calculate dates
	const lastDayOfMonth = getLastDayOfMonth(invoiceYear, invoiceMonth);
	const nextMonth = invoiceMonth === 12 ? 1 : invoiceMonth + 1;
	const nextYear = invoiceMonth === 12 ? invoiceYear + 1 : invoiceYear;
	const lastDayOfNextMonth = getLastDayOfMonth(nextYear, nextMonth);

	const fechaStr = lastDayOfMonth.toISOString().split('T')[0];
	const vencimientoStr = lastDayOfNextMonth.toISOString().split('T')[0];

	let numero = 0;

	for (const row of invoiceData) {
		// Check if agency receives credit note
		if (!agenciesWithCreditNote.has(row.Agency)) {
			continue;
		}

		// Get the assigned invoice number from Xubio
		const invoiceNum = normalizeInvoiceNumber(row['Invoice #']);
		const comprobante = xubioMap.get(invoiceNum);

		if (!comprobante) {
			// Skip if no matching invoice number found in Xubio
			continue;
		}

		numero++;
		const observacion = `Certificacion ${row['Invoice #']} / ${row['Channel'] || ''} / ${row['Client'] || ''} / ${row['Order Reference'] || ''}`;
		const descripcion = `${monthName}, ${invoiceYear}`;
		const precio = Number(row['Gross Invoice ']) || 0;

		// Row 1 - Header (TIPO = 3 for credit note)
		rows.push({
			NUMERODECONTROL: numero,
			CLIENTE: row['Agency'],
			TIPO: 3, // Credit note type
			NUMERO: 'A-00002-00000000',
			FECHA: fechaStr,
			VENCIMIENTODELCOBRO: vencimientoStr,
			COMPROBANTEASOCIADO: comprobante, // The assigned invoice number
			MONEDA: 'Pesos Argentinos',
			COTIZACION: '1', // Credit notes have COTIZACION = 1
			OBSERVACIONES: observacion,
			PRODUCTOSERVICIO: '',
			CENTRODECOSTO: '',
			PRODUCTOOBSERVACION: '',
			CANTIDAD: '',
			PRECIO: '',
			DESCUENTO: '',
			IMPORTE: '',
			IVA: ''
		});

		// Row 2 - Detail
		rows.push({
			NUMERODECONTROL: numero,
			CLIENTE: '',
			TIPO: '',
			NUMERO: '',
			FECHA: '',
			VENCIMIENTODELCOBRO: '',
			COMPROBANTEASOCIADO: '',
			MONEDA: '',
			COTIZACION: '',
			OBSERVACIONES: '',
			PRODUCTOSERVICIO: 'Servicio Publicidad',
			CENTRODECOSTO: 'NBCU ON AIR',
			PRODUCTOOBSERVACION: descripcion,
			CANTIDAD: 1,
			PRECIO: precio,
			DESCUENTO: '0', // Credit notes have DESCUENTO = 0
			IMPORTE: precio,
			IVA: Math.round(precio * 0.21 * 100) / 100
		});
	}

	return rows;
}

/**
 * Creates credit note Excel file (same structure as billing file)
 */
export function createCreditNoteFile(rows: BillingRow[]): ArrayBuffer {
	// Uses the same structure as billing file
	return createBillingFile(rows);
}
