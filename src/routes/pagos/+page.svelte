<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Modal, Label, Input, Textarea, Checkbox, Spinner } from 'flowbite-svelte';
	import { PlusOutline } from 'flowbite-svelte-icons';
	import DataGrid from '$lib/components/ui/DataGrid.svelte';
	import { payments, paymentsLoading, fetchPayments, createPayment, type PaymentWithDetails } from '$lib/stores/payments';
	import { invoices, fetchInvoices } from '$lib/stores/invoices';
	import { currentCountry, countries } from '$lib/stores/country';
	import { formatCurrency, formatDate } from '$lib/utils/currency';
	import type { ColDef } from 'ag-grid-community';

	// Selected payment
	let selectedPayment: PaymentWithDetails | null = null;

	// Modal state
	let showNewPaymentModal = false;
	let isSubmitting = false;

	// Form state
	let newPaymentReference = '';
	let newPaymentDate = '';
	let newPaymentCountry = '';
	let newPaymentNotes = '';

	// Invoice selection
	let invoiceSelections: Record<string, { selected: boolean; amount: number }> = {};

	// Load data on mount
	onMount(async () => {
		await fetchPayments();
	});

	// Reload when country changes
	$: if ($currentCountry) {
		fetchPayments();
	}

	// Column definitions for AG-Grid
	const columnDefs: ColDef[] = [
		{
			field: 'reference',
			headerName: 'Referencia',
			flex: 1,
			sortable: true,
			filter: true
		},
		{
			field: 'amount',
			headerName: 'Monto',
			width: 150,
			valueFormatter: (params) => formatCurrency(params.value)
		},
		{
			field: 'payment_date',
			headerName: 'Fecha de Pago',
			width: 130,
			valueFormatter: (params) => formatDate(params.value),
			sort: 'desc'
		},
		{
			field: 'country',
			headerName: 'País',
			width: 100,
			valueFormatter: (params) => {
				const country = $countries.find((c) => c.id === params.value);
				return country?.name || params.value || '-';
			}
		},
		{
			field: 'notes',
			headerName: 'Notas',
			flex: 1,
			valueFormatter: (params) => params.value || '-'
		},
		{
			field: 'invoices',
			headerName: 'Facturas',
			width: 100,
			valueGetter: (params) => params.data?.invoices?.length || 0
		}
	];

	// Row selection handler
	function onRowSelected(event: any) {
		if (event.node.isSelected()) {
			selectedPayment = event.data;
		}
	}

	// Open new payment modal
	async function openNewPaymentModal() {
		newPaymentReference = '';
		newPaymentDate = new Date().toISOString().split('T')[0];
		newPaymentCountry = $currentCountry === 'all' ? '' : $currentCountry;
		newPaymentNotes = '';
		invoiceSelections = {};

		// Load invoices
		await fetchInvoices({});

		// Initialize selections
		$invoices.forEach(inv => {
			invoiceSelections[inv.id] = { selected: false, amount: inv.gross_value || 0 };
		});

		showNewPaymentModal = true;
	}

	// Calculate total from selected invoices
	$: selectedTotal = Object.entries(invoiceSelections)
		.filter(([_, val]) => val.selected)
		.reduce((sum, [_, val]) => sum + (val.amount || 0), 0);

	// Get filtered invoices by selected country
	$: filteredInvoices = newPaymentCountry
		? $invoices.filter(inv => inv.country === newPaymentCountry)
		: $invoices;

	// Handle payment creation
	async function handleCreatePayment() {
		if (!newPaymentReference || !newPaymentDate || !newPaymentCountry) return;

		const selectedInvoiceAmounts = Object.entries(invoiceSelections)
			.filter(([_, val]) => val.selected && val.amount > 0)
			.map(([invoiceId, val]) => ({
				invoiceId,
				amount: val.amount
			}));

		if (selectedInvoiceAmounts.length === 0) {
			alert('Debe seleccionar al menos una factura');
			return;
		}

		isSubmitting = true;
		const result = await createPayment(
			{
				reference: newPaymentReference,
				amount: selectedTotal,
				payment_date: newPaymentDate,
				country: newPaymentCountry,
				notes: newPaymentNotes || null
			},
			selectedInvoiceAmounts
		);
		isSubmitting = false;

		if (result.success) {
			showNewPaymentModal = false;
		} else {
			alert('Error al crear pago: ' + result.error);
		}
	}
</script>

<svelte:head>
	<title>Pagos - CMP Finance Manager</title>
</svelte:head>

<div class="w-full py-8 px-6">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-3xl font-bold dark:text-white">Historial de Pagos</h1>
		<Button color="primary" on:click={openNewPaymentModal}>
			<PlusOutline class="mr-2 h-4 w-4" />
			Nuevo Pago
		</Button>
	</div>

	{#if $paymentsLoading}
		<div class="flex items-center justify-center h-64">
			<Spinner size="12" />
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Payments Grid -->
			<div class="lg:col-span-2">
				<Card size="none">
					<h5 class="text-lg font-semibold mb-4 dark:text-white">Pagos Registrados</h5>
					<DataGrid
						rowData={$payments}
						{columnDefs}
						rowSelection="single"
						onRowSelected={onRowSelected}
						height="600px"
						pagination={true}
						paginationPageSize={20}
					/>
				</Card>
			</div>

			<!-- Payment Details -->
			<div>
				<Card size="none">
					<h5 class="text-lg font-semibold mb-4 dark:text-white">Detalle del Pago</h5>
					{#if selectedPayment}
						<div class="space-y-4">
							<div>
								<p class="text-sm text-gray-500 dark:text-gray-400">Referencia</p>
								<p class="font-medium dark:text-white">{selectedPayment.reference}</p>
							</div>
							<div>
								<p class="text-sm text-gray-500 dark:text-gray-400">Monto Total</p>
								<p class="text-xl font-bold text-green-600 dark:text-green-400">
									{formatCurrency(selectedPayment.amount)}
								</p>
							</div>
							<div>
								<p class="text-sm text-gray-500 dark:text-gray-400">Fecha de Pago</p>
								<p class="font-medium dark:text-white">{formatDate(selectedPayment.payment_date)}</p>
							</div>
							{#if selectedPayment.notes}
								<div>
									<p class="text-sm text-gray-500 dark:text-gray-400">Notas</p>
									<p class="dark:text-white">{selectedPayment.notes}</p>
								</div>
							{/if}

							<!-- Invoices associated -->
							{#if selectedPayment.invoices && selectedPayment.invoices.length > 0}
								<div>
									<p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Facturas Asociadas</p>
									<div class="space-y-2">
										{#each selectedPayment.invoices as invoice}
											<div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
												<span class="text-sm dark:text-white">{invoice.invoice_number}</span>
												<span class="text-sm font-medium dark:text-white">
													{formatCurrency(invoice.amount)}
												</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<p class="text-center text-gray-500 dark:text-gray-400 py-8">
							Seleccione un pago para ver los detalles.
						</p>
					{/if}
				</Card>
			</div>
		</div>
	{/if}
</div>

<!-- New Payment Modal -->
<Modal bind:open={showNewPaymentModal} size="xl" title="Nuevo Pago">
	<form on:submit|preventDefault={handleCreatePayment} class="space-y-4">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="paymentReference">Referencia</Label>
				<Input id="paymentReference" bind:value={newPaymentReference} required placeholder="Ej: TRF-001" />
			</div>
			<div>
				<Label for="paymentDate">Fecha de Pago</Label>
				<input
					id="paymentDate"
					type="date"
					bind:value={newPaymentDate}
					required
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
				/>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="paymentCountry">País</Label>
				<select
					id="paymentCountry"
					bind:value={newPaymentCountry}
					required
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
				>
					<option value="">Seleccionar país</option>
					{#each $countries.filter(c => c.id !== 'all') as country}
						<option value={country.id}>{country.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<Label for="paymentNotes">Notas (opcional)</Label>
				<Input id="paymentNotes" bind:value={newPaymentNotes} placeholder="Notas adicionales..." />
			</div>
		</div>

		<!-- Invoice Selection -->
		<div>
			<Label>Seleccionar Facturas</Label>
			<div class="mt-2 max-h-64 overflow-y-auto border rounded-lg dark:border-gray-600">
				{#if filteredInvoices.length === 0}
					<p class="p-4 text-center text-gray-500 dark:text-gray-400">
						{newPaymentCountry ? 'No hay facturas para este país' : 'Seleccione un país primero'}
					</p>
				{:else}
					<table class="w-full text-sm">
						<thead class="bg-gray-100 dark:bg-gray-700 sticky top-0">
							<tr>
								<th class="p-2 text-left w-10"></th>
								<th class="p-2 text-left">N° Factura</th>
								<th class="p-2 text-left">Cliente</th>
								<th class="p-2 text-right">Monto Original</th>
								<th class="p-2 text-right w-32">Monto a Pagar</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredInvoices as invoice}
								<tr class="border-t dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
									<td class="p-2">
										<Checkbox
											checked={invoiceSelections[invoice.id]?.selected || false}
											on:change={(e) => {
												invoiceSelections[invoice.id] = {
													...invoiceSelections[invoice.id],
													selected: e.target.checked
												};
												invoiceSelections = invoiceSelections;
											}}
										/>
									</td>
									<td class="p-2 dark:text-white">{invoice.invoice_number}</td>
									<td class="p-2 dark:text-white">{invoice.client_name || '-'}</td>
									<td class="p-2 text-right dark:text-white">{formatCurrency(invoice.gross_value)}</td>
									<td class="p-2">
										<input
											type="number"
											min="0"
											step="0.01"
											value={invoiceSelections[invoice.id]?.amount || 0}
											on:input={(e) => {
												invoiceSelections[invoice.id] = {
													...invoiceSelections[invoice.id],
													amount: parseFloat(e.target.value) || 0
												};
												invoiceSelections = invoiceSelections;
											}}
											disabled={!invoiceSelections[invoice.id]?.selected}
											class="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</div>

		<!-- Total -->
		<div class="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
			<span class="font-semibold dark:text-white">Total a Pagar:</span>
			<span class="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(selectedTotal)}</span>
		</div>

		<div class="flex justify-end gap-3 pt-4">
			<Button color="light" on:click={() => (showNewPaymentModal = false)}>Cancelar</Button>
			<Button type="submit" color="primary" disabled={isSubmitting || selectedTotal === 0}>
				{isSubmitting ? 'Guardando...' : 'Guardar Pago'}
			</Button>
		</div>
	</form>
</Modal>
