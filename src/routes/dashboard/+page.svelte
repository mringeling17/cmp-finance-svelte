<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Select, Spinner } from 'flowbite-svelte';
	import { FilterSolid } from 'flowbite-svelte-icons';
	import Chart from '$lib/components/ui/Chart.svelte';
	import { formatCurrency } from '$lib/utils/currency';
	import {
		invoices,
		invoicesLoading,
		fetchInvoices,
		fetchChannels,
		channels,
		calculateMetrics,
		prepareChartData,
		type InvoiceFilters
	} from '$lib/stores/invoices';
	import { clientes, fetchClientes } from '$lib/stores/clientes';
	import { agencias, fetchAgencias } from '$lib/stores/agencias';
	import { currentCountry } from '$lib/stores/country';
	// Chart colors
	const COLORS = [
		'#0088FE',
		'#00C49F',
		'#FFBB28',
		'#FF8042',
		'#8884D8',
		'#83a6ed',
		'#8dd1e1',
		'#82ca9d',
		'#d0ed57',
		'#a4de6c'
	];

	// Filters
	let selectedChannel = 'all';
	let dateFrom: string = '';
	let dateTo: string = '';

	// Metrics
	let metrics = {
		grossTotal: 0,
		netTotal: 0,
		count: 0,
		uniqueClients: 0,
		avgInvoiceValue: 0
	};

	// Chart data
	let chartData = {
		topClients: [] as { name: string; value: number }[],
		channelChartData: [] as { name: string; value: number }[],
		agencyChartData: [] as { name: string; value: number }[],
		monthlyChartData: [] as { month: string; value: number }[],
		quarterlyChartData: [] as { quarter: string; value: number }[]
	};

	// Load data on mount and when country changes
	onMount(async () => {
		await Promise.all([fetchChannels(), fetchClientes(), fetchAgencias()]);
		await loadData();
	});

	// Reload when country changes
	$: if ($currentCountry) {
		loadData();
	}

	async function loadData() {
		const filters: InvoiceFilters = {
			channel: selectedChannel !== 'all' ? selectedChannel : undefined,
			dateFrom: dateFrom ? new Date(dateFrom) : undefined,
			dateTo: dateTo ? new Date(dateTo) : undefined
		};

		await fetchInvoices(filters);
	}

	// Update metrics and chart data when invoices change
	$: {
		metrics = calculateMetrics($invoices);
		chartData = prepareChartData($invoices);
	}

	function handleReset() {
		selectedChannel = 'all';
		dateFrom = '';
		dateTo = '';
		loadData();
	}

	// ECharts options
	$: clientBarOptions = {
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				const data = params[0];
				return `${data.name}<br/>Facturación: ${formatCurrency(data.value)}`;
			}
		},
		xAxis: {
			type: 'category',
			data: chartData.topClients.map((c) => c.name),
			axisLabel: {
				rotate: 45,
				formatter: (value: string) => (value.length > 15 ? value.slice(0, 15) + '...' : value)
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
				data: chartData.topClients.map((c) => c.value),
				type: 'bar',
				itemStyle: { color: '#0088FE' }
			}
		],
		grid: { bottom: 100 }
	};

	$: channelPieOptions = {
		tooltip: {
			trigger: 'item',
			formatter: (params: any) => `${params.name}: ${formatCurrency(params.value)} (${params.percent}%)`
		},
		legend: {
			type: 'scroll',
			orient: 'horizontal',
			bottom: 0,
			pageButtonPosition: 'end'
		},
		series: [
			{
				type: 'pie',
				radius: ['40%', '70%'],
				data: chartData.channelChartData.map((c, i) => ({
					name: c.name,
					value: c.value,
					itemStyle: { color: COLORS[i % COLORS.length] }
				})),
				label: {
					formatter: '{b}: {d}%',
					minShowLabelAngle: 5
				}
			}
		]
	};

	$: agencyPieOptions = {
		tooltip: {
			trigger: 'item',
			formatter: (params: any) => `${params.name}: ${formatCurrency(params.value)} (${params.percent}%)`
		},
		legend: {
			type: 'scroll',
			orient: 'horizontal',
			bottom: 0,
			pageButtonPosition: 'end'
		},
		series: [
			{
				type: 'pie',
				radius: ['40%', '70%'],
				data: chartData.agencyChartData.map((c, i) => ({
					name: c.name,
					value: c.value,
					itemStyle: { color: COLORS[i % COLORS.length] }
				})),
				label: {
					formatter: '{b}: {d}%',
					minShowLabelAngle: 5
				}
			}
		]
	};

	$: quarterlyBarOptions = {
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				const data = params[0];
				return `${data.name}<br/>Facturación: ${formatCurrency(data.value)}`;
			}
		},
		xAxis: {
			type: 'category',
			data: chartData.quarterlyChartData.map((q) => q.quarter)
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
				data: chartData.quarterlyChartData.map((q) => q.value),
				type: 'bar',
				itemStyle: { color: '#8884d8' }
			}
		]
	};

	$: monthlyLineOptions = {
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				const data = params[0];
				return `${data.name}<br/>Facturación: ${formatCurrency(data.value)}`;
			}
		},
		xAxis: {
			type: 'category',
			data: chartData.monthlyChartData.map((m) => m.month)
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
				data: chartData.monthlyChartData.map((m) => m.value),
				type: 'line',
				smooth: true,
				itemStyle: { color: '#8884d8' },
				areaStyle: { color: 'rgba(136, 132, 216, 0.2)' }
			}
		]
	};

	// Channel select items
	$: channelItems = [
		{ value: 'all', name: 'Todos los canales' },
		...$channels.map((c) => ({ value: c, name: c }))
	];
</script>

<svelte:head>
	<title>Dashboard - CMP Finance Manager</title>
</svelte:head>

<div class="w-full py-8 px-6">
	<h1 class="text-3xl font-bold mb-6 dark:text-white">Dashboard General</h1>

	<!-- Filters -->
	<Card size="none" class="mb-8">
		<div class="flex flex-wrap gap-4 items-end">
			<div class="w-full md:w-48">
				<label class="block text-sm font-medium mb-2 dark:text-white">Canal</label>
				<Select bind:value={selectedChannel} items={channelItems} on:change={loadData} />
			</div>

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
		<!-- KPIs Row 1 -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			<Card size="none">
				<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Bruto</h5>
				<p class="text-2xl font-bold dark:text-white">{formatCurrency(metrics.grossTotal)}</p>
			</Card>

			<Card size="none">
				<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Neto</h5>
				<p class="text-2xl font-bold dark:text-white">{formatCurrency(metrics.netTotal)}</p>
			</Card>

			<Card size="none">
				<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Cantidad de Facturas</h5>
				<p class="text-2xl font-bold dark:text-white">{metrics.count}</p>
			</Card>

			<Card size="none">
				<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Clientes Activos</h5>
				<p class="text-2xl font-bold dark:text-white">{metrics.uniqueClients}</p>
			</Card>
		</div>

		<!-- KPIs Row 2 -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
			<Card size="none">
				<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Promedio por Factura</h5>
				<p class="text-2xl font-bold dark:text-white">{formatCurrency(metrics.avgInvoiceValue)}</p>
			</Card>

			<Card size="none">
				<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Margen Promedio</h5>
				<p class="text-2xl font-bold dark:text-white">
					{metrics.grossTotal > 0
						? `${((metrics.netTotal / metrics.grossTotal) * 100).toFixed(1)}%`
						: '0%'}
				</p>
			</Card>

			<Card size="none">
				<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Facturas por Cliente</h5>
				<p class="text-2xl font-bold dark:text-white">
					{metrics.uniqueClients > 0 ? (metrics.count / metrics.uniqueClients).toFixed(1) : 0}
				</p>
			</Card>
		</div>

		<!-- Charts Row 1 -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
			<Card size="none" class="overflow-hidden">
				<h5 class="text-lg font-semibold mb-4 dark:text-white">Facturación por Cliente (Top 10)</h5>
				{#if chartData.topClients.length === 0}
					<div class="h-96 flex items-center justify-center text-gray-500">
						No hay datos disponibles
					</div>
				{:else}
					<Chart options={clientBarOptions} height="400px" />
				{/if}
			</Card>

			<Card size="none" class="overflow-hidden">
				<h5 class="text-lg font-semibold mb-4 dark:text-white">Distribución por Canal</h5>
				{#if chartData.channelChartData.length === 0}
					<div class="h-96 flex items-center justify-center text-gray-500">
						No hay datos disponibles
					</div>
				{:else}
					<Chart options={channelPieOptions} height="400px" />
				{/if}
			</Card>
		</div>

		<!-- Charts Row 2 -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
			<Card size="none" class="overflow-hidden">
				<h5 class="text-lg font-semibold mb-4 dark:text-white">Distribución por Agencia</h5>
				{#if chartData.agencyChartData.length === 0}
					<div class="h-96 flex items-center justify-center text-gray-500">
						No hay datos disponibles
					</div>
				{:else}
					<Chart options={agencyPieOptions} height="400px" />
				{/if}
			</Card>

			<Card size="none" class="overflow-hidden">
				<h5 class="text-lg font-semibold mb-4 dark:text-white">Resultados Trimestrales</h5>
				{#if chartData.quarterlyChartData.length === 0}
					<div class="h-96 flex items-center justify-center text-gray-500">
						No hay datos disponibles
					</div>
				{:else}
					<Chart options={quarterlyBarOptions} height="400px" />
				{/if}
			</Card>
		</div>

		<!-- Monthly Chart -->
		<Card size="none" class="mb-8 overflow-hidden">
			<h5 class="text-lg font-semibold mb-4 dark:text-white">Evolución Mensual</h5>
			{#if chartData.monthlyChartData.length === 0}
				<div class="h-96 flex items-center justify-center text-gray-500">
					No hay datos disponibles
				</div>
			{:else}
				<Chart options={monthlyLineOptions} height="400px" />
			{/if}
		</Card>
	{/if}
</div>
