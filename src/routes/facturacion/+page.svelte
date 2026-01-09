<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Select, Badge, Spinner } from 'flowbite-svelte';
	import { FilterSolid } from 'flowbite-svelte-icons';
	import DataGrid from '$lib/components/ui/DataGrid.svelte';
	import {
		invoices,
		invoicesLoading,
		fetchInvoices,
		fetchChannels,
		channels,
		type InvoiceFilters,
		type InvoiceWithClient
	} from '$lib/stores/invoices';
	import { clientes, fetchClientes } from '$lib/stores/clientes';
	import { currentCountry, countries } from '$lib/stores/country';
	import { formatCurrency, formatDate } from '$lib/utils/currency';
	import type { ColDef } from 'ag-grid-community';

	// Filters
	let selectedChannel = 'all';
	let dateFrom = '';
	let dateTo = '';

	// Load data on mount
	onMount(async () => {
		await Promise.all([fetchChannels(), fetchClientes()]);
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

	function handleReset() {
		selectedChannel = 'all';
		dateFrom = '';
		dateTo = '';
		loadData();
	}

	// Calculate payment status
	function getPaymentStatus(invoice: InvoiceWithClient): { status: string; color: string } {
		// This is a simplified version - in a real app, you'd calculate based on payments
		const grossValue = invoice.gross_value || 0;
		if (grossValue === 0) return { status: 'Sin monto', color: 'gray' };
		// For now, assume all are pending
		return { status: 'Pendiente', color: 'yellow' };
	}

	// Column definitions for AG-Grid
	const columnDefs: ColDef[] = [
		{
			field: 'invoice_number',
			headerName: 'N° Factura',
			width: 130,
			sortable: true,
			filter: true
		},
		{
			field: 'internal_number',
			headerName: 'N° Interno',
			width: 120,
			valueFormatter: (params) => params.value || '-'
		},
		{
			field: 'client_name',
			headerName: 'Cliente',
			flex: 1,
			sortable: true,
			filter: true
		},
		{
			field: 'agency_name',
			headerName: 'Agencia',
			width: 150,
			valueFormatter: (params) => params.value || 'Sin agencia'
		},
		{
			field: 'channel',
			headerName: 'Canal',
			width: 120,
			valueFormatter: (params) => params.value || '-'
		},
		{
			field: 'invoice_date',
			headerName: 'Fecha',
			width: 110,
			valueFormatter: (params) => formatDate(params.value),
			sort: 'desc'
		},
		{
			field: 'gross_value',
			headerName: 'Valor Bruto',
			width: 130,
			valueFormatter: (params) => formatCurrency(params.value),
			type: 'numericColumn'
		},
		{
			field: 'net_value',
			headerName: 'Valor Neto',
			width: 130,
			valueFormatter: (params) => formatCurrency(params.value),
			type: 'numericColumn'
		},
		{
			field: 'country',
			headerName: 'País',
			width: 80,
			valueFormatter: (params) => {
				const country = $countries.find((c) => c.id === params.value);
				return country?.code || params.value || '-';
			}
		}
	];

	// Channel select items
	$: channelItems = [
		{ value: 'all', name: 'Todos los canales' },
		...$channels.map((c) => ({ value: c, name: c }))
	];

	// Calculate totals
	$: totals = {
		count: $invoices.length,
		grossTotal: $invoices.reduce((sum, inv) => sum + (inv.gross_value || 0), 0),
		netTotal: $invoices.reduce((sum, inv) => sum + (inv.net_value || 0), 0)
	};
</script>

<svelte:head>
	<title>Facturación - CMP Finance Manager</title>
</svelte:head>

<div class="w-full py-8 px-6">
	<h1 class="text-3xl font-bold mb-6 dark:text-white">Resumen de Facturación</h1>

	<!-- Filters -->
	<Card size="none" class="mb-6">
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

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
		<Card size="none">
			<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Facturas</h5>
			<p class="text-2xl font-bold dark:text-white">{totals.count}</p>
		</Card>
		<Card size="none">
			<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Bruto</h5>
			<p class="text-2xl font-bold dark:text-white">{formatCurrency(totals.grossTotal)}</p>
		</Card>
		<Card size="none">
			<h5 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Neto</h5>
			<p class="text-2xl font-bold dark:text-white">{formatCurrency(totals.netTotal)}</p>
		</Card>
	</div>

	<!-- Data Grid -->
	{#if $invoicesLoading}
		<div class="flex items-center justify-center h-64">
			<Spinner size="12" />
		</div>
	{:else}
		<Card size="none">
			<DataGrid
				rowData={$invoices}
				{columnDefs}
				height="600px"
				pagination={true}
				paginationPageSize={25}
				paginationPageSizeSelector={[10, 25, 50, 100]}
			/>
		</Card>
	{/if}
</div>
