<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Modal, Label, Input, Checkbox, Spinner, Badge, ButtonGroup } from 'flowbite-svelte';
	import { PlusOutline, TrashBinSolid, EditSolid, EnvelopeSolid, UsersSolid, BuildingSolid } from 'flowbite-svelte-icons';
	import DataGrid from '$lib/components/ui/DataGrid.svelte';
	import {
		clientes,
		clientesLoading,
		fetchClientes,
		createCliente,
		updateCliente,
		deleteCliente,
		getClientEmails,
		addClientEmail
	} from '$lib/stores/clientes';
	import {
		agencias,
		agenciasLoading,
		fetchAgencias,
		createAgencia,
		updateAgencia,
		deleteAgencia
	} from '$lib/stores/agencias';
	import { currentCountry, countries } from '$lib/stores/country';
	import type { Cliente, Agency } from '$lib/types';
	import type { ColDef } from 'ag-grid-community';

	// View state
	let view: 'clients' | 'agencies' = 'clients';

	// Selected items
	let selectedCliente: Cliente | null = null;
	let selectedAgencia: Agency | null = null;
	let clientEmails: string[] = [];

	// Modal states
	let showNewClientModal = false;
	let showEditClientModal = false;
	let showDeleteClientModal = false;
	let showNewAgencyModal = false;
	let showEditAgencyModal = false;
	let showDeleteAgencyModal = false;
	let showAddEmailModal = false;

	// Form states
	let newClientName = '';
	let newClientAgencyId = '';
	let newClientCountry = '';
	let newClientEmails: string[] = [''];
	let editClientName = '';
	let editClientAgencyId = '';
	let newAgencyName = '';
	let newAgencyReceivesCreditNote = false;
	let newAgencyCountry = '';
	let editAgencyName = '';
	let editAgencyReceivesCreditNote = false;
	let newEmail = '';
	let isSubmitting = false;

	// Load data on mount
	onMount(async () => {
		await Promise.all([fetchClientes(), fetchAgencias()]);
	});

	// Reload when country changes
	$: if ($currentCountry) {
		fetchClientes();
		fetchAgencias();
	}

	// Client column definitions for AG-Grid
	const clientColumnDefs: ColDef[] = [
		{ field: 'name', headerName: 'Nombre', flex: 2, sortable: true, filter: true },
		{
			field: 'agencies.name',
			headerName: 'Agencia',
			flex: 1,
			valueGetter: (params) => params.data?.agencies?.name || 'Sin agencia'
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
			headerName: 'Acciones',
			width: 120,
			cellRenderer: (params: any) => {
				const container = document.createElement('div');
				container.className = 'flex gap-2';

				const editBtn = document.createElement('button');
				editBtn.className = 'text-blue-600 hover:text-blue-800';
				editBtn.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>';
				editBtn.onclick = () => openEditClientModal(params.data);

				const deleteBtn = document.createElement('button');
				deleteBtn.className = 'text-red-600 hover:text-red-800';
				deleteBtn.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
				deleteBtn.onclick = () => openDeleteClientModal(params.data);

				container.appendChild(editBtn);
				container.appendChild(deleteBtn);
				return container;
			}
		}
	];

	// Agency column definitions for AG-Grid
	const agencyColumnDefs: ColDef[] = [
		{ field: 'name', headerName: 'Nombre', flex: 2, sortable: true, filter: true },
		{
			field: 'receives_credit_note',
			headerName: 'Nota Crédito',
			width: 120,
			cellRenderer: (params: any) => {
				const badge = document.createElement('span');
				badge.className = params.value
					? 'bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300'
					: 'bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300';
				badge.textContent = params.value ? 'Sí' : 'No';
				return badge;
			}
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
			headerName: 'Acciones',
			width: 120,
			cellRenderer: (params: any) => {
				const container = document.createElement('div');
				container.className = 'flex gap-2';

				const editBtn = document.createElement('button');
				editBtn.className = 'text-blue-600 hover:text-blue-800';
				editBtn.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>';
				editBtn.onclick = () => openEditAgencyModal(params.data);

				const deleteBtn = document.createElement('button');
				deleteBtn.className = 'text-red-600 hover:text-red-800';
				deleteBtn.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
				deleteBtn.onclick = () => openDeleteAgencyModal(params.data);

				container.appendChild(editBtn);
				container.appendChild(deleteBtn);
				return container;
			}
		}
	];

	// Client row selection handler
	async function onClientRowSelected(event: any) {
		if (event.node.isSelected()) {
			selectedCliente = event.data;
			clientEmails = await getClientEmails(selectedCliente!.id);
		}
	}

	// Agency row selection handler
	function onAgencyRowSelected(event: any) {
		if (event.node.isSelected()) {
			selectedAgencia = event.data;
		}
	}

	// Modal handlers - Client
	function openNewClientModal() {
		newClientName = '';
		newClientAgencyId = '';
		newClientCountry = $currentCountry === 'all' ? '' : $currentCountry;
		newClientEmails = [''];
		showNewClientModal = true;
	}

	function openEditClientModal(cliente: Cliente) {
		selectedCliente = cliente;
		editClientName = cliente.name;
		editClientAgencyId = cliente.agency_id || '';
		showEditClientModal = true;
	}

	function openDeleteClientModal(cliente: Cliente) {
		selectedCliente = cliente;
		showDeleteClientModal = true;
	}

	// Modal handlers - Agency
	function openNewAgencyModal() {
		newAgencyName = '';
		newAgencyReceivesCreditNote = false;
		newAgencyCountry = $currentCountry === 'all' ? '' : $currentCountry;
		showNewAgencyModal = true;
	}

	function openEditAgencyModal(agencia: Agency) {
		selectedAgencia = agencia;
		editAgencyName = agencia.name;
		editAgencyReceivesCreditNote = agencia.receives_credit_note;
		showEditAgencyModal = true;
	}

	function openDeleteAgencyModal(agencia: Agency) {
		selectedAgencia = agencia;
		showDeleteAgencyModal = true;
	}

	// Email handlers
	function addEmailField() {
		newClientEmails = [...newClientEmails, ''];
	}

	function removeEmailField(index: number) {
		newClientEmails = newClientEmails.filter((_, i) => i !== index);
	}

	// Submit handlers
	async function handleCreateClient() {
		isSubmitting = true;
		const emails = newClientEmails.filter((e) => e.trim() !== '');
		const result = await createCliente(
			{
				name: newClientName,
				agency_id: newClientAgencyId || null,
				country: newClientCountry || null
			},
			emails
		);
		isSubmitting = false;

		if (result.success) {
			showNewClientModal = false;
		}
	}

	async function handleUpdateClient() {
		if (!selectedCliente) return;
		isSubmitting = true;
		const result = await updateCliente(selectedCliente.id, {
			name: editClientName,
			agency_id: editClientAgencyId || null
		});
		isSubmitting = false;

		if (result.success) {
			showEditClientModal = false;
		}
	}

	async function handleDeleteClient() {
		if (!selectedCliente) return;
		isSubmitting = true;
		const result = await deleteCliente(selectedCliente.id);
		isSubmitting = false;

		if (result.success) {
			showDeleteClientModal = false;
			selectedCliente = null;
			clientEmails = [];
		}
	}

	async function handleCreateAgency() {
		isSubmitting = true;
		const result = await createAgencia({
			name: newAgencyName,
			receives_credit_note: newAgencyReceivesCreditNote,
			country: newAgencyCountry || null
		});
		isSubmitting = false;

		if (result.success) {
			showNewAgencyModal = false;
		}
	}

	async function handleUpdateAgency() {
		if (!selectedAgencia) return;
		isSubmitting = true;
		const result = await updateAgencia(selectedAgencia.id, {
			name: editAgencyName,
			receives_credit_note: editAgencyReceivesCreditNote
		});
		isSubmitting = false;

		if (result.success) {
			showEditAgencyModal = false;
		}
	}

	async function handleDeleteAgency() {
		if (!selectedAgencia) return;
		isSubmitting = true;
		const result = await deleteAgencia(selectedAgencia.id);
		isSubmitting = false;

		if (result.success) {
			showDeleteAgencyModal = false;
			selectedAgencia = null;
		}
	}

	async function handleAddEmail() {
		if (!selectedCliente || !newEmail.trim()) return;
		isSubmitting = true;
		const result = await addClientEmail(selectedCliente.id, newEmail.trim());
		isSubmitting = false;

		if (result.success) {
			clientEmails = await getClientEmails(selectedCliente.id);
			showAddEmailModal = false;
			newEmail = '';
		}
	}
</script>

<svelte:head>
	<title>Clientes - CMP Finance Manager</title>
</svelte:head>

<div class="w-full py-8 px-6">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-3xl font-bold dark:text-white">Gestión de Clientes</h1>
		<div class="flex gap-3">
			{#if view === 'clients'}
				<Button color="primary" on:click={openNewClientModal}>
					<PlusOutline class="mr-2 h-4 w-4" />
					Nuevo Cliente
				</Button>
			{:else}
				<Button color="primary" on:click={openNewAgencyModal}>
					<PlusOutline class="mr-2 h-4 w-4" />
					Nueva Agencia
				</Button>
			{/if}
		</div>
	</div>

	<!-- View Toggle -->
	<div class="mb-6">
		<ButtonGroup>
			<Button color={view === 'clients' ? 'primary' : 'light'} on:click={() => { view = 'clients'; selectedAgencia = null; }}>
				<UsersSolid class="mr-2 h-4 w-4" />
				Clientes
			</Button>
			<Button color={view === 'agencies' ? 'primary' : 'light'} on:click={() => { view = 'agencies'; selectedCliente = null; }}>
				<BuildingSolid class="mr-2 h-4 w-4" />
				Agencias
			</Button>
		</ButtonGroup>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- Left Panel - List -->
		<div>
			<h2 class="text-xl font-semibold mb-4 dark:text-white">
				{view === 'clients' ? 'Clientes' : 'Agencias'}
			</h2>
			{#if $clientesLoading || $agenciasLoading}
				<div class="flex items-center justify-center h-64">
					<Spinner size="12" />
				</div>
			{:else if view === 'clients'}
				<DataGrid
					rowData={$clientes}
					columnDefs={clientColumnDefs}
					rowSelection="single"
					onRowSelected={onClientRowSelected}
					height="500px"
					pagination={true}
					paginationPageSize={15}
				/>
			{:else}
				<DataGrid
					rowData={$agencias}
					columnDefs={agencyColumnDefs}
					rowSelection="single"
					onRowSelected={onAgencyRowSelected}
					height="500px"
					pagination={true}
					paginationPageSize={15}
				/>
			{/if}
		</div>

		<!-- Right Panel - Details -->
		<div>
			{#if view === 'clients'}
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-xl font-semibold dark:text-white">Correos Asociados</h2>
					{#if selectedCliente}
						<Button size="sm" color="light" on:click={() => { newEmail = ''; showAddEmailModal = true; }}>
							<PlusOutline class="mr-2 h-4 w-4" />
							Agregar
						</Button>
					{/if}
				</div>
				{#if selectedCliente}
					<Card size="none">
						<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
							Cliente: <span class="font-medium">{selectedCliente.name}</span>
						</p>
						{#if clientEmails.length === 0}
							<p class="text-gray-500 dark:text-gray-400">No hay correos asociados.</p>
						{:else}
							<ul class="space-y-2">
								{#each clientEmails as email}
									<li class="flex items-center gap-2">
										<EnvelopeSolid class="h-4 w-4 text-gray-400" />
										<span class="dark:text-white">{email}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</Card>
				{:else}
					<Card size="none">
						<p class="text-center text-gray-500 dark:text-gray-400 py-8">
							Seleccione un cliente para ver los correos asociados.
						</p>
					</Card>
				{/if}
			{:else}
				<h2 class="text-xl font-semibold mb-4 dark:text-white">Detalles de Agencia</h2>
				{#if selectedAgencia}
					<Card size="none">
						<div class="space-y-4">
							<div>
								<p class="text-sm text-gray-500 dark:text-gray-400">Nombre</p>
								<p class="text-lg font-medium dark:text-white">{selectedAgencia.name}</p>
							</div>
							<div>
								<p class="text-sm text-gray-500 dark:text-gray-400">Recibe Nota de Crédito</p>
								<Badge color={selectedAgencia.receives_credit_note ? 'green' : 'gray'}>
									{selectedAgencia.receives_credit_note ? 'Sí' : 'No'}
								</Badge>
							</div>
						</div>
					</Card>
				{:else}
					<Card size="none">
						<p class="text-center text-gray-500 dark:text-gray-400 py-8">
							Seleccione una agencia para ver los detalles.
						</p>
					</Card>
				{/if}
			{/if}
		</div>
	</div>
</div>

<!-- New Client Modal -->
<Modal bind:open={showNewClientModal} size="md" title="Nuevo Cliente">
	<form on:submit|preventDefault={handleCreateClient} class="space-y-4">
		<div>
			<Label for="clientName">Nombre</Label>
			<Input id="clientName" bind:value={newClientName} required />
		</div>
		<div>
			<Label for="clientAgency">Agencia</Label>
			<select
				id="clientAgency"
				bind:value={newClientAgencyId}
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
			>
				<option value="">Sin agencia</option>
				{#each $agencias as agencia}
					<option value={agencia.id}>{agencia.name}</option>
				{/each}
			</select>
		</div>
		<div>
			<Label for="clientCountry">País</Label>
			<select
				id="clientCountry"
				bind:value={newClientCountry}
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
			>
				<option value="">Seleccionar país</option>
				{#each $countries as country}
					<option value={country.id}>{country.name}</option>
				{/each}
			</select>
		</div>
		<div>
			<Label>Correos electrónicos</Label>
			{#each newClientEmails as email, index}
				<div class="flex gap-2 mb-2">
					<Input type="email" bind:value={newClientEmails[index]} placeholder="correo@ejemplo.com" />
					{#if newClientEmails.length > 1}
						<Button color="red" size="sm" on:click={() => removeEmailField(index)}>
							<TrashBinSolid class="h-4 w-4" />
						</Button>
					{/if}
				</div>
			{/each}
			<Button color="light" size="sm" on:click={addEmailField}>
				<PlusOutline class="mr-2 h-4 w-4" />
				Agregar correo
			</Button>
		</div>
		<div class="flex justify-end gap-3 pt-4">
			<Button color="light" on:click={() => (showNewClientModal = false)}>Cancelar</Button>
			<Button type="submit" color="primary" disabled={isSubmitting}>
				{isSubmitting ? 'Guardando...' : 'Guardar'}
			</Button>
		</div>
	</form>
</Modal>

<!-- Edit Client Modal -->
<Modal bind:open={showEditClientModal} size="md" title="Editar Cliente">
	<form on:submit|preventDefault={handleUpdateClient} class="space-y-4">
		<div>
			<Label for="editClientName">Nombre</Label>
			<Input id="editClientName" bind:value={editClientName} required />
		</div>
		<div>
			<Label for="editClientAgency">Agencia</Label>
			<select
				id="editClientAgency"
				bind:value={editClientAgencyId}
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
			>
				<option value="">Sin agencia</option>
				{#each $agencias as agencia}
					<option value={agencia.id}>{agencia.name}</option>
				{/each}
			</select>
		</div>
		<div class="flex justify-end gap-3 pt-4">
			<Button color="light" on:click={() => (showEditClientModal = false)}>Cancelar</Button>
			<Button type="submit" color="primary" disabled={isSubmitting}>
				{isSubmitting ? 'Guardando...' : 'Guardar'}
			</Button>
		</div>
	</form>
</Modal>

<!-- Delete Client Modal -->
<Modal bind:open={showDeleteClientModal} size="sm" title="Eliminar Cliente">
	<p class="text-gray-500 dark:text-gray-400">
		¿Está seguro que desea eliminar el cliente <strong>{selectedCliente?.name}</strong>?
	</p>
	<div class="flex justify-end gap-3 pt-4">
		<Button color="light" on:click={() => (showDeleteClientModal = false)}>Cancelar</Button>
		<Button color="red" on:click={handleDeleteClient} disabled={isSubmitting}>
			{isSubmitting ? 'Eliminando...' : 'Eliminar'}
		</Button>
	</div>
</Modal>

<!-- New Agency Modal -->
<Modal bind:open={showNewAgencyModal} size="md" title="Nueva Agencia">
	<form on:submit|preventDefault={handleCreateAgency} class="space-y-4">
		<div>
			<Label for="agencyName">Nombre</Label>
			<Input id="agencyName" bind:value={newAgencyName} required />
		</div>
		<div>
			<Label for="agencyCountry">País</Label>
			<select
				id="agencyCountry"
				bind:value={newAgencyCountry}
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
			>
				<option value="">Seleccionar país</option>
				{#each $countries as country}
					<option value={country.id}>{country.name}</option>
				{/each}
			</select>
		</div>
		<div class="flex items-center gap-2">
			<Checkbox id="receivesCreditNote" bind:checked={newAgencyReceivesCreditNote} />
			<Label for="receivesCreditNote">Recibe Nota de Crédito</Label>
		</div>
		<div class="flex justify-end gap-3 pt-4">
			<Button color="light" on:click={() => (showNewAgencyModal = false)}>Cancelar</Button>
			<Button type="submit" color="primary" disabled={isSubmitting}>
				{isSubmitting ? 'Guardando...' : 'Guardar'}
			</Button>
		</div>
	</form>
</Modal>

<!-- Edit Agency Modal -->
<Modal bind:open={showEditAgencyModal} size="md" title="Editar Agencia">
	<form on:submit|preventDefault={handleUpdateAgency} class="space-y-4">
		<div>
			<Label for="editAgencyName">Nombre</Label>
			<Input id="editAgencyName" bind:value={editAgencyName} required />
		</div>
		<div class="flex items-center gap-2">
			<Checkbox id="editReceivesCreditNote" bind:checked={editAgencyReceivesCreditNote} />
			<Label for="editReceivesCreditNote">Recibe Nota de Crédito</Label>
		</div>
		<div class="flex justify-end gap-3 pt-4">
			<Button color="light" on:click={() => (showEditAgencyModal = false)}>Cancelar</Button>
			<Button type="submit" color="primary" disabled={isSubmitting}>
				{isSubmitting ? 'Guardando...' : 'Guardar'}
			</Button>
		</div>
	</form>
</Modal>

<!-- Delete Agency Modal -->
<Modal bind:open={showDeleteAgencyModal} size="sm" title="Eliminar Agencia">
	<p class="text-gray-500 dark:text-gray-400">
		¿Está seguro que desea eliminar la agencia <strong>{selectedAgencia?.name}</strong>?
	</p>
	<div class="flex justify-end gap-3 pt-4">
		<Button color="light" on:click={() => (showDeleteAgencyModal = false)}>Cancelar</Button>
		<Button color="red" on:click={handleDeleteAgency} disabled={isSubmitting}>
			{isSubmitting ? 'Eliminando...' : 'Eliminar'}
		</Button>
	</div>
</Modal>

<!-- Add Email Modal -->
<Modal bind:open={showAddEmailModal} size="sm" title="Agregar Correo">
	<form on:submit|preventDefault={handleAddEmail} class="space-y-4">
		<div>
			<Label for="newEmail">Correo electrónico</Label>
			<Input id="newEmail" type="email" bind:value={newEmail} required placeholder="correo@ejemplo.com" />
		</div>
		<div class="flex justify-end gap-3 pt-4">
			<Button color="light" on:click={() => (showAddEmailModal = false)}>Cancelar</Button>
			<Button type="submit" color="primary" disabled={isSubmitting}>
				{isSubmitting ? 'Agregando...' : 'Agregar'}
			</Button>
		</div>
	</form>
</Modal>
