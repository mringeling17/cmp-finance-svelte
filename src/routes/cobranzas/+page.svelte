<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Select, Spinner } from 'flowbite-svelte';
	import { FilterSolid } from 'flowbite-svelte-icons';
	import Chart from '$lib/components/ui/Chart.svelte';
	import { formatCurrency } from '$lib/utils/currency';
	import { invoices, invoicesLoading, fetchInvoices, type InvoiceFilters } from '$lib/stores/invoices';
	import { clientes, fetchClientes } from '$lib/stores/clientes';
	import { currentCountry } from '$lib/stores/country';
	import { supabase } from '$lib/services/supabase';

	const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#83a6ed'];

	// Filters
	let dateFrom = '';
	let dateTo = '';

	// Payments data by invoice
	let paymentsByInvoice: Record<string, number> = {};

	// Load data on mount
	onMount(async () => {
		await fetchClientes();
		await loadData();
	});

	// Reload when country changes
	$: if ($currentCountry) {
		loadData();
	}

	async function loadData() {
		const filters: InvoiceFilters = {
			dateFrom: dateFrom ? new Date(dateFrom) : undefined,
			dateTo: dateTo ? new Date(dateTo) : undefined
		};

		await fetchInvoices(filters);
		await fetchPaymentsByInvoice();
	}

	// Fetch payments grouped by invoice
	async function fetchPaymentsByInvoice() {
		try {
			const country = $currentCountry;

			let query = supabase
				.from('payment_details')
				.select(`
					invoice_id,
					amount,
					payments!inner(country)
				`);

			if (country !== 'all') {
				query = query.eq('payments.country', country);
			}

			const { data, error } = await query;

			if (error) throw error;

			// Group payments by invoice_id
			paymentsByInvoice = {};
			(data || []).forEach((detail: any) => {
				const invoiceId = detail.invoice_id;
				if (!paymentsByInvoice[invoiceId]) {
					paymentsByInvoice[invoiceId] = 0;
				}
				paymentsByInvoice[invoiceId] += detail.amount || 0;
			});
		} catch (error) {
			console.error('Error fetching payments by invoice:', error);
			paymentsByInvoice = {};
		}
	}

	function handleReset() {
		dateFrom = '';
		dateTo = '';
		loadData();
	}

	// Calculate cobranzas data - reactive to both invoices and payments
	$: cobranzasData = calculateCobranzasData($invoices, paymentsByInvoice);

	function calculateCobranzasData(data: typeof $invoices, payments: Record<string, number>) {
		// Group by client for pending amounts
		const clientPending: Record<string, { name: string; pending: number; paid: number }> = {};

		data.forEach((invoice) => {
			const clientId = invoice.client_id || 'unknown';
			const clientName = invoice.client_name || 'Sin cliente';
			const grossValue = invoice.gross_value || 0;

			if (!clientPending[clientId]) {
				clientPending[clientId] = { name: clientName, pending: 0, paid: 0 };
			}

			// Use real payment data
			const paidAmount = payments[invoice.id] || 0;
			const pendingAmount = Math.max(0, grossValue - paidAmount);

			clientPending[clientId].pending += pendingAmount;
			clientPending[clientId].paid += paidAmount;
		});

		const clientData = Object.values(clientPending)
			.filter(c => c.pending > 0) // Only show clients with pending amounts
			.sort((a, b) => b.pending - a.pending)
			.slice(0, 10);

		// Monthly collection data
		const monthlyData: Record<string, { month: string; pending: number; collected: number }> = {};
		data.forEach((invoice) => {
			if (invoice.invoice_date) {
				const date = new Date(invoice.invoice_date);
				const monthKey = date.toISOString().slice(0, 7);
				const monthName = date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
				const grossValue = invoice.gross_value || 0;

				if (!monthlyData[monthKey]) {
					monthlyData[monthKey] = { month: monthName, pending: 0, collected: 0 };
				}

				// Use real payment data
				const paidAmount = payments[invoice.id] || 0;
				const pendingAmount = Math.max(0, grossValue - paidAmount);

				monthlyData[monthKey].pending += pendingAmount;
				monthlyData[monthKey].collected += paidAmount;
			}
		});

		const monthlyChartData = Object.entries(monthlyData)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([, data]) => data);

		// Age analysis (aging) - only for pending invoices
		const aging = {
			current: 0, // 0-30 days
			days30: 0, // 31-60 days
			days60: 0, // 61-90 days
			days90: 0 // 90+ days
		};

		const today = new Date();
		data.forEach((invoice) => {
			if (invoice.invoice_date) {
				const invoiceDate = new Date(invoice.invoice_date);
				const daysDiff = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));

				// Use real payment data
				const paidAmount = payments[invoice.id] || 0;
				const pendingAmount = Math.max(0, (invoice.gross_value || 0) - paidAmount);

				if (pendingAmount > 0) {
					if (daysDiff <= 30) aging.current += pendingAmount;
					else if (daysDiff <= 60) aging.days30 += pendingAmount;
					else if (daysDiff <= 90) aging.days60 += pendingAmount;
					else aging.days90 += pendingAmount;
				}
			}
		});

		// Calculate totals
		const totalPending = Object.values(clientPending).reduce((sum, c) => sum + c.pending, 0);
		const totalCollected = Object.values(clientPending).reduce((sum, c) => sum + c.paid, 0);
		const totalBilled = totalPending + totalCollected;

		return {
			clientData,
			monthlyChartData,
			aging,
			totalPending,
			totalCollected,
			collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0
		};
	}

	// ECharts options
	$: clientBarOptions = {
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				const data = params[0];
				return `${data.name}<br/>Pendiente: ${formatCurrency(data.value)}`;
			}
		},
		xAxis: {
			type: 'category',
			data: cobranzasData.clientData.map((c) => c.name),
			axisLabel: {
				rotate: 45,
				formatter: (value: string) => (value.length > 12 ? value.slice(0, 12) + '...' : value)
			}
		},
		yAxis: {
			type: 'value',
			axisLabel: {
				formatter: (value: number) =>
					new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(value)
			}
		},
		series: [
			{
				data: cobranzasData.clientData.map((c) => c.pending),
				type: 'bar',
				itemStyle: { color: '#FF8042' }
			}
		],
		grid: { bottom: 100 }
	};

	$: agingPieOptions = {
		tooltip: {
			trigger: 'item',
			formatter: (params: any) => `${params.name}: ${formatCurrency(params.value)} (${params.percent}%)`
		},
		legend: {
			orient: 'horizontal',
			bottom: 0
		},
		series: [
			{
				type: 'pie',
				radius: ['40%', '70%'],
				data: [
					{ name: '0-30 días', value: cobranzasData.aging.current, itemStyle: { color: '#00C49F' } },
					{ name: '31-60 días', value: cobranzasData.aging.days30, itemStyle: { color: '#FFBB28' } },
					{ name: '61-90 días', value: cobranzasData.aging.days60, itemStyle: { color: '#FF8042' } },
					{ name: '90+ días', value: cobranzasData.aging.days90, itemStyle: { color: '#FF4444' } }
				],
				label: {
					formatter: '{b}: {d}%'
				}
			}
		]
	};

	$: monthlyLineOptions = {
		tooltip: {
			trigger: 'axis'
		},
		legend: {
			data: ['Pendiente', 'Cobrado'],
			bottom: 0
		},
		xAxis: {
			type: 'category',
			data: cobranzasData.monthlyChartData.map((m) => m.month)
		},
		yAxis: {
			type: 'value',
			axisLabel: {
				formatter: (value: number) =>
					new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(value)
			}
		},
		series: [
			{
				name: 'Pendiente',
				data: cobranzasData.monthlyChartData.map((m) => m.pending),
				type: 'line',
				smooth: true,
				itemStyle: { color: '#FF8042' }
			},
			{
				name: 'Cobrado',
				data: cobranzasData.monthlyChartData.map((m) => m.collected),
				type: 'line',
				smooth: true,
				itemStyle: { color: '#00C49F' }
			}
		],
		grid: { bottom: 60 }
	};
</script>

<svelte:head>
	<title>Cobranzas - CMP Finance Manager</title>
</svelte:head>

<div class="w-full py-8 px-6">
	<h1 class="text-3xl font-bold mb-6 dark:text-white">Cobranzas</h1>

	<!-- Filters -->
	<Card size="none" class="mb-6">
		<div class="flex flex-wrap gap-4 items-end">
			<div class="w-full md:w-48">
				<label class="block text-sm font-medium mb-2 dark:text-white">Fecha desde</label>
				<input
					type="date"
					bind:value={dateFrom}
					on:change={loadData}
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
				/>
			</div>

			<div class="w-full md:w-48">
				<label class="block text-sm font-medium mb-2 dark:text-white">Fecha hasta</label>
				<input
					type="date"
					bind:value={dateTo}
					on:change={loadData}
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
				/>
			</div>

			<Button color="light" on:click={handleReset}>
				<FilterSolid class="mr-2 h-4 w-4" />
				Limpiar filtros
			</Button>
		</div>
	</Card>

	{#if $invoicesLoading}
		<div class="flex items-center justify-center h-64">
			<Spinner size="12" />
		</div>
	{:else}
		<!-- KPIs -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
			<Card size="none">
				<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pendiente</h5>
				<p class="text-2xl font-bold text-orange-600 dark:text-orange-400">
					{formatCurrency(cobranzasData.totalPending)}
				</p>
			</Card>
			<Card size="none">
				<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cobrado</h5>
				<p class="text-2xl font-bold text-green-600 dark:text-green-400">
					{formatCurrency(cobranzasData.totalCollected)}
				</p>
			</Card>
			<Card size="none">
				<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Tasa de Cobro</h5>
				<p class="text-2xl font-bold dark:text-white">
					{cobranzasData.collectionRate.toFixed(1)}%
				</p>
			</Card>
		</div>

		<!-- Charts Row 1 -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
			<Card size="none" class="overflow-hidden">
				<h5 class="text-lg font-semibold mb-4 dark:text-white">Pendiente por Cliente (Top 10)</h5>
				{#if cobranzasData.clientData.length === 0}
					<div class="h-96 flex items-center justify-center text-gray-500">
						No hay datos disponibles
					</div>
				{:else}
					<Chart options={clientBarOptions} height="400px" />
				{/if}
			</Card>

			<Card size="none" class="overflow-hidden">
				<h5 class="text-lg font-semibold mb-4 dark:text-white">Antigüedad de Deuda</h5>
				<Chart options={agingPieOptions} height="400px" />
			</Card>
		</div>

		<!-- Monthly Chart -->
		<Card size="none" class="mb-8 overflow-hidden">
			<h5 class="text-lg font-semibold mb-4 dark:text-white">Evolución Mensual de Cobranzas</h5>
			{#if cobranzasData.monthlyChartData.length === 0}
				<div class="h-96 flex items-center justify-center text-gray-500">
					No hay datos disponibles
				</div>
			{:else}
				<Chart options={monthlyLineOptions} height="400px" />
			{/if}
		</Card>
	{/if}
</div>
