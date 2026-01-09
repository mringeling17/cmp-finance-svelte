<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Card, Button, Spinner } from 'flowbite-svelte';
	import { UploadSolid, CloseCircleSolid } from 'flowbite-svelte-icons';
	import { supabase } from '$lib/services/supabase';
	import { toasts } from '$lib/stores/toast';
	import { format, subMonths } from 'date-fns';

	const dispatch = createEventDispatcher();

	type FileType = 'certificaciones_pdf' | 'invoice_summary' | 'facturacion';

	const spanishMonths = [
		'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
		'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
	];

	let selectedFiles: File[] = [];
	let isUploading = false;
	let dragActive = false;
	let fileInput: HTMLInputElement;

	function determineFileType(file: File): FileType {
		const extension = file.name.split('.').pop()?.toLowerCase();
		const fileName = file.name.toLowerCase();

		if (extension === 'pdf') {
			return 'certificaciones_pdf';
		} else if (extension === 'xlsx' || extension === 'xls') {
			if (fileName.includes('invoicesummary_')) {
				return 'invoice_summary';
			} else if (fileName.includes('archivodefacturacion_')) {
				return 'facturacion';
			}
		}
		return 'certificaciones_pdf';
	}

	function validateFile(file: File): boolean {
		const extension = file.name.split('.').pop()?.toLowerCase();
		const fileName = file.name.toLowerCase();

		if (!(extension === 'pdf' || extension === 'xlsx' || extension === 'xls')) {
			toasts.error(`Archivo no válido: ${file.name}. Solo se permiten archivos PDF o Excel (.xlsx)`);
			return false;
		}

		if (extension === 'xlsx' || extension === 'xls') {
			const isInvoiceSummary = fileName.startsWith('invoicesummary_');
			const isArchivoFacturacion = fileName.startsWith('archivodefacturacion_');

			if (!isInvoiceSummary && !isArchivoFacturacion) {
				toasts.error('Los archivos Excel deben comenzar con "InvoiceSummary_" o "ArchivodeFacturacion_"');
				return false;
			}

			const fileNameParts = fileName.split('_');
			if (fileNameParts.length < 2) {
				toasts.error('El nombre del archivo debe incluir el mes (ej: InvoiceSummary_enero)');
				return false;
			}

			const month = fileNameParts[1].split('.')[0].toLowerCase();
			if (!spanishMonths.includes(month)) {
				toasts.error(`Mes inválido: ${month}. Debe ser un mes en español y en minúsculas`);
				return false;
			}
		}

		return true;
	}

	function handleFiles(files: FileList | null) {
		if (!files) return;

		const validFiles: File[] = [];
		for (let i = 0; i < files.length; i++) {
			if (validateFile(files[i])) {
				validFiles.push(files[i]);
			}
		}

		if (validFiles.length > 0) {
			selectedFiles = [...selectedFiles, ...validFiles];
		}
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		handleFiles(target.files);
	}

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragActive = true;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragActive = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragActive = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragActive = false;
		handleFiles(e.dataTransfer?.files || null);
	}

	function removeFile(index: number) {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	}

	function getFileTypeLabel(type: FileType): string {
		switch (type) {
			case 'certificaciones_pdf':
				return 'Certificación';
			case 'invoice_summary':
				return 'Invoice Summary';
			case 'facturacion':
				return 'Archivo Facturación';
			default:
				return 'Otro';
		}
	}

	function getFileTypeColor(file: File): string {
		if (file.name.endsWith('.pdf')) return 'bg-blue-500';
		if (file.name.toLowerCase().includes('invoicesummary')) return 'bg-green-500';
		return 'bg-yellow-500';
	}

	async function handleUpload() {
		if (selectedFiles.length === 0) {
			toasts.error('Por favor seleccione al menos un archivo');
			return;
		}

		isUploading = true;
		let successCount = 0;
		let errorCount = 0;

		try {
			for (const file of selectedFiles) {
				const fileType = determineFileType(file);
				const date = subMonths(new Date(), 1);
				const yearMonth = format(date, 'yyyy-MM');

				let folder: string;
				switch (fileType) {
					case 'certificaciones_pdf':
						folder = 'pdf_certificaciones';
						break;
					case 'invoice_summary':
						folder = 'invoice_summary';
						break;
					case 'facturacion':
						folder = 'facturacion';
						break;
				}

				const path = `${folder}/${yearMonth}/${file.name}`;

				const { error: uploadError } = await supabase.storage
					.from('uploads')
					.upload(path, file, { upsert: true });

				if (uploadError && !uploadError.message.includes('duplicate')) {
					errorCount++;
					continue;
				}

				const { error: dbError } = await supabase.rpc('handle_file_upload', {
					p_filename: file.name,
					p_file_type: fileType,
					p_storage_path: path
				});

				if (dbError) {
					errorCount++;
					await supabase.storage.from('uploads').remove([path]);
				} else {
					successCount++;
				}
			}

			if (successCount > 0) {
				toasts.success(`${successCount} archivo${successCount > 1 ? 's' : ''} subido${successCount > 1 ? 's' : ''} correctamente`);
				selectedFiles = [];
				dispatch('uploadSuccess');
			}

			if (errorCount > 0) {
				toasts.error(`${errorCount} archivo${errorCount > 1 ? 's' : ''} no ${errorCount > 1 ? 'pudieron' : 'pudo'} ser subido${errorCount > 1 ? 's' : ''}`);
			}
		} catch (error: any) {
			console.error('Error al subir archivos:', error);
			toasts.error(error.message || 'Error al subir los archivos');
		} finally {
			isUploading = false;
		}
	}
</script>

<Card size="none">
	<h5 class="text-lg font-semibold mb-4 dark:text-white">Subir Archivos</h5>

	<!-- Drag & Drop Zone -->
	<div
		class="border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors cursor-pointer
			{dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}"
		on:dragenter={handleDragEnter}
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
		on:drop={handleDrop}
		on:click={() => fileInput.click()}
		role="button"
		tabindex="0"
		on:keypress={(e) => e.key === 'Enter' && fileInput.click()}
	>
		<UploadSolid class="h-12 w-12 mx-auto mb-2 text-gray-400" />
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
			Arrastra y suelta archivos aquí o haz clic para seleccionar
		</p>
		<p class="text-xs text-gray-400 dark:text-gray-500">Formatos aceptados:</p>
		<ul class="text-xs text-gray-400 dark:text-gray-500 list-disc list-inside">
			<li>Certificaciones PDF</li>
			<li>InvoiceSummary_[mes] (Excel, ej: InvoiceSummary_enero)</li>
			<li>ArchivodeFacturacion_[mes] (Excel, ej: ArchivodeFacturacion_febrero)</li>
		</ul>

		<input
			bind:this={fileInput}
			type="file"
			on:change={handleFileChange}
			accept=".pdf,.xlsx,.xls"
			multiple
			class="hidden"
		/>
	</div>

	<!-- Selected Files List -->
	{#if selectedFiles.length > 0}
		<div class="mb-4">
			<h6 class="text-sm font-medium mb-2 dark:text-white">
				Archivos seleccionados ({selectedFiles.length})
			</h6>
			<ul class="border rounded-md divide-y dark:border-gray-600 dark:divide-gray-600">
				{#each selectedFiles as file, index}
					<li class="flex items-center justify-between p-2 text-sm">
						<div class="flex items-center">
							<span class="inline-block w-2 h-2 rounded-full mr-2 {getFileTypeColor(file)}"></span>
							<span class="truncate max-w-xs dark:text-white">{file.name}</span>
							<span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
								({getFileTypeLabel(determineFileType(file))})
							</span>
						</div>
						<button
							on:click|stopPropagation={() => removeFile(index)}
							class="text-red-500 hover:text-red-700"
						>
							<CloseCircleSolid class="w-4 h-4" />
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Upload Button -->
	<Button
		on:click={handleUpload}
		disabled={selectedFiles.length === 0 || isUploading}
		class="w-full"
	>
		{#if isUploading}
			<Spinner size="4" class="mr-2" />
			Subiendo {selectedFiles.length} archivo{selectedFiles.length > 1 ? 's' : ''}...
		{:else}
			<UploadSolid class="w-4 h-4 mr-2" />
			Subir {selectedFiles.length} archivo{selectedFiles.length > 1 ? 's' : ''}
		{/if}
	</Button>
</Card>
