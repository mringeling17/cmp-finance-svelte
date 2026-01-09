import { writable, get } from 'svelte/store';
import { supabase } from '$lib/services/supabase';
import { currentCountry } from './country';
import type { Invoice } from '$lib/types';

// Extended invoice type with client data
export interface InvoiceWithClient extends Invoice {
	client_name?: string;
	agency_id?: string | null;
	agency_name?: string | null;
}

// Invoices store
export const invoices = writable<InvoiceWithClient[]>([]);
export const invoicesLoading = writable(false);
export const invoicesError = writable<string | null>(null);

// Channels store
export const channels = writable<string[]>([]);

// Filters
export interface InvoiceFilters {
	clientIds?: string[];
	agencyIds?: string[];
	channel?: string;
	dateFrom?: Date;
	dateTo?: Date;
}

// Fetch channels from database
export async function fetchChannels(): Promise<void> {
	try {
		const { data, error } = await supabase
			.from('invoices')
			.select('channel')
			.not('channel', 'is', null);

		if (error) throw error;

		const uniqueChannels = [...new Set(data.map((item) => item.channel))].filter(Boolean) as string[];
		channels.set(uniqueChannels);
	} catch (error) {
		console.error('Error fetching channels:', error);
	}
}

// Fetch invoices from database
export async function fetchInvoices(filters: InvoiceFilters = {}): Promise<void> {
	invoicesLoading.set(true);
	invoicesError.set(null);

	try {
		const country = get(currentCountry);
		let query = supabase
			.from('invoices')
			.select(
				`
				*,
				clients(id, name, agency_id, agencies(id, name))
			`
			)
			.order('invoice_date', { ascending: false })
			.limit(10000);

		// Apply country filter
		if (country !== 'all') {
			query = query.eq('country', country);
		}

		// Apply client filter
		if (filters.clientIds && filters.clientIds.length > 0) {
			query = query.in('client_id', filters.clientIds);
		}

		// Apply channel filter
		if (filters.channel && filters.channel !== 'all') {
			query = query.eq('channel', filters.channel);
		}

		// Apply date filters
		if (filters.dateFrom) {
			query = query.gte('invoice_date', filters.dateFrom.toISOString().split('T')[0]);
		}

		if (filters.dateTo) {
			query = query.lte('invoice_date', filters.dateTo.toISOString().split('T')[0]);
		}

		const { data, error } = await query;

		if (error) throw error;

		// Process data to flatten client info
		const processedData: InvoiceWithClient[] = (data || []).map((invoice: any) => ({
			...invoice,
			client_name: invoice.clients?.name || 'Sin cliente',
			agency_id: invoice.clients?.agency_id || null,
			agency_name: invoice.clients?.agencies?.name || null
		}));

		// Apply agency filter in memory (since it's a nested relation)
		let filteredData = processedData;
		if (filters.agencyIds && filters.agencyIds.length > 0) {
			filteredData = processedData.filter(
				(invoice) => invoice.agency_id && filters.agencyIds!.includes(invoice.agency_id)
			);
		}

		invoices.set(filteredData);
	} catch (error) {
		console.error('Error fetching invoices:', error);
		invoicesError.set('Error al cargar facturas');
	} finally {
		invoicesLoading.set(false);
	}
}

// Calculate metrics from invoices
export function calculateMetrics(data: InvoiceWithClient[]) {
	const grossTotal = data.reduce((sum, invoice) => sum + (invoice.gross_value || 0), 0);
	const netTotal = data.reduce((sum, invoice) => sum + (invoice.net_value || 0), 0);
	const count = data.length;
	const uniqueClients = new Set(data.map((invoice) => invoice.client_id).filter(Boolean)).size;
	const avgInvoiceValue = count > 0 ? grossTotal / count : 0;

	return {
		grossTotal,
		netTotal,
		count,
		uniqueClients,
		avgInvoiceValue
	};
}

// Prepare chart data
export function prepareChartData(data: InvoiceWithClient[]) {
	// Client data (Top 10)
	const clientData: Record<string, { name: string; value: number }> = {};
	data.forEach((invoice) => {
		if (invoice.client_id && invoice.client_name) {
			const clientId = invoice.client_id;
			if (!clientData[clientId]) {
				clientData[clientId] = { name: invoice.client_name, value: 0 };
			}
			clientData[clientId].value += invoice.gross_value || 0;
		}
	});
	const topClients = Object.values(clientData)
		.sort((a, b) => b.value - a.value)
		.slice(0, 10);

	// Channel data
	const channelData: Record<string, { name: string; value: number }> = {};
	data.forEach((invoice) => {
		if (invoice.channel) {
			if (!channelData[invoice.channel]) {
				channelData[invoice.channel] = { name: invoice.channel, value: 0 };
			}
			channelData[invoice.channel].value += invoice.gross_value || 0;
		}
	});
	const channelChartData = Object.values(channelData).sort((a, b) => b.value - a.value);

	// Agency data
	const agencyData: Record<string, { name: string; value: number }> = {};
	data.forEach((invoice) => {
		const agencyKey = invoice.agency_id || 'no-agency';
		const agencyName = invoice.agency_name || 'Sin agencia';
		if (!agencyData[agencyKey]) {
			agencyData[agencyKey] = { name: agencyName, value: 0 };
		}
		agencyData[agencyKey].value += invoice.gross_value || 0;
	});
	const agencyChartData = Object.values(agencyData).sort((a, b) => b.value - a.value);

	// Monthly data
	const monthlyData: Record<string, { month: string; value: number; sortKey: string }> = {};
	data.forEach((invoice) => {
		if (invoice.invoice_date) {
			const date = new Date(invoice.invoice_date);
			const monthKey = date.toISOString().slice(0, 7);
			const monthName = date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
			if (!monthlyData[monthKey]) {
				monthlyData[monthKey] = { month: monthName, value: 0, sortKey: monthKey };
			}
			monthlyData[monthKey].value += invoice.gross_value || 0;
		}
	});
	const monthlyChartData = Object.values(monthlyData)
		.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
		.map(({ month, value }) => ({ month, value }));

	// Quarterly data
	const quarterlyData: Record<string, { quarter: string; value: number; sortKey: string }> = {};
	data.forEach((invoice) => {
		if (invoice.invoice_date) {
			const date = new Date(invoice.invoice_date);
			const quarter = Math.floor(date.getMonth() / 3) + 1;
			const year = date.getFullYear();
			const quarterKey = `${year}-Q${quarter}`;
			const quarterLabel = `Q${quarter} ${year}`;
			if (!quarterlyData[quarterKey]) {
				quarterlyData[quarterKey] = { quarter: quarterLabel, value: 0, sortKey: quarterKey };
			}
			quarterlyData[quarterKey].value += invoice.gross_value || 0;
		}
	});
	const quarterlyChartData = Object.values(quarterlyData)
		.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
		.map(({ quarter, value }) => ({ quarter, value }));

	return {
		topClients,
		channelChartData,
		agencyChartData,
		monthlyChartData,
		quarterlyChartData
	};
}
