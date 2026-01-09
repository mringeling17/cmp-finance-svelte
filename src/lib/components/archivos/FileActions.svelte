<script lang="ts">
	import { Button, Select, Spinner } from 'flowbite-svelte';
	import { DownloadSolid, UploadSolid, EnvelopeSolid } from 'flowbite-svelte-icons';
	import { toasts } from '$lib/stores/toast';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let selectedMonth = '';
	let creditNoteFileInput: HTMLInputElement;
	let isGeneratingBilling = false;
	let isGeneratingCreditNotes = false;
	let isSending = false;

	const monthOptions = [
		{ value: '', name: 'Seleccione un mes' },
		{ value: '01', name: 'Enero' },
		{ value: '02', name: 'Febrero' },
		{ value: '03', name: 'Marzo' },
		{ value: '04', name: 'Abril' },
		{ value: '05', name: 'Mayo' },
		{ value: '06', name: 'Junio' },
		{ value: '07', name: 'Julio' },
		{ value: '08', name: 'Agosto' },
		{ value: '09', name: 'Septiembre' },
		{ value: '10', name: 'Octubre' },
		{ value: '11', name: 'Noviembre' },
		{ value: '12', name: 'Diciembre' }
	];

	async function handleGenerateBilling() {
		if (!selectedMonth) {
			toasts.error('Por favor, seleccione un mes');
			return;
		}

		isGeneratingBilling = true;
		try {
			toasts.info('Generando archivo de facturación...');

			const response = await fetch('/api/generate-billing', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ month: selectedMonth })
			});

			const data = await response.json();

			if (response.ok && data.success) {
				toasts.success(data.message || 'Archivo generado correctamente');
				dispatch('actionComplete');
			} else {
				throw new Error(data.error || 'Error al generar el archivo');
			}
		} catch (error) {
			console.error('Error:', error);
			toasts.error(error instanceof Error ? error.message : 'Error al generar el archivo');
		} finally {
			isGeneratingBilling = false;
		}
	}

	async function handleSendCertifications() {
		if (!confirm('¿Está seguro que desea enviar las certificaciones pendientes?')) {
			return;
		}

		isSending = true;
		try {
			toasts.info('Enviando certificaciones...');

			const response = await fetch('/api/send-certifications', {
				method: 'POST'
			});

			const data = await response.json();

			if (response.ok) {
				if (data.success) {
					toasts.success(data.message || 'Certificaciones enviadas correctamente');
				} else {
					toasts.info(data.message || 'No hay certificaciones pendientes');
				}
				dispatch('actionComplete');
			} else {
				throw new Error(data.error || 'Error al enviar las certificaciones');
			}
		} catch (error) {
			console.error('Error:', error);
			toasts.error(error instanceof Error ? error.message : 'Error al enviar las certificaciones');
		} finally {
			isSending = false;
		}
	}

	function handleCreditNoteUploadClick() {
		if (!selectedMonth) {
			toasts.error('Por favor, seleccione un mes');
			return;
		}
		creditNoteFileInput.click();
	}

	async function handleCreditNoteFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		isGeneratingCreditNotes = true;
		try {
			toasts.info('Generando notas de crédito...');

			const formData = new FormData();
			formData.append('file', file);
			formData.append('month', selectedMonth);

			const response = await fetch('/api/generate-credit-notes', {
				method: 'POST',
				body: formData
			});

			const data = await response.json();

			if (response.ok && data.success) {
				toasts.success(
					`${data.message}. ${data.creditNotesGenerated} notas generadas, ${data.invoicesUpdated} facturas actualizadas.`
				);
				dispatch('actionComplete');
			} else {
				throw new Error(data.error || 'Error al generar notas de crédito');
			}
		} catch (error) {
			console.error('Error generating credit notes:', error);
			toasts.error(error instanceof Error ? error.message : 'Error al generar notas de crédito');
		} finally {
			isGeneratingCreditNotes = false;
			if (creditNoteFileInput) {
				creditNoteFileInput.value = '';
			}
		}
	}
</script>

<div class="flex flex-wrap gap-3 items-center">
	<div class="w-48">
		<Select bind:value={selectedMonth} items={monthOptions} placeholder="Seleccione un mes" />
	</div>

	<Button color="yellow" on:click={handleGenerateBilling} disabled={isGeneratingBilling}>
		{#if isGeneratingBilling}
			<Spinner size="4" class="mr-2" />
		{:else}
			<DownloadSolid class="w-4 h-4 mr-2" />
		{/if}
		Generar Facturación
	</Button>

	<Button color="green" on:click={handleCreditNoteUploadClick} disabled={isGeneratingCreditNotes}>
		{#if isGeneratingCreditNotes}
			<Spinner size="4" class="mr-2" />
		{:else}
			<UploadSolid class="w-4 h-4 mr-2" />
		{/if}
		Generar Notas de Crédito
	</Button>

	<Button color="blue" on:click={handleSendCertifications} disabled={isSending}>
		{#if isSending}
			<Spinner size="4" class="mr-2" />
		{:else}
			<EnvelopeSolid class="w-4 h-4 mr-2" />
		{/if}
		Enviar Certificaciones
	</Button>

	<input
		bind:this={creditNoteFileInput}
		type="file"
		on:change={handleCreditNoteFileUpload}
		accept=".xlsx,.xls"
		class="hidden"
	/>
</div>
