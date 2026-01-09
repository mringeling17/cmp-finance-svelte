<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Spinner, Badge, Input, Select, Checkbox } from 'flowbite-svelte';
	import { DownloadSolid, TrashBinSolid, SearchOutline, RefreshOutline } from 'flowbite-svelte-icons';
	import { supabase } from '$lib/services/supabase';
	import { formatDate } from '$lib/utils/currency';
	import { toasts } from '$lib/stores/toast';
	import FileUploadForm from '$lib/components/archivos/FileUploadForm.svelte';
	import FileActions from '$lib/components/archivos/FileActions.svelte';

	interface FileRecord {
		id: string;
		filename: string;
		file_type: string;
		storage_path: string;
		uploaded_at: string | null;
		processed?: boolean;
		email_sent?: boolean | null;
		invoice_number?: string | null;
	}

	// State
	let files: FileRecord[] = [];
	let filteredFiles: FileRecord[] = [];
	let isLoading = true;
	let searchQuery = '';
	let filterType = 'all';
	let selectedFiles = new Set<string>();
	let selectAll = false;

	// Pagination
	let currentPage = 1;
	const itemsPerPage = 10;

	// Filter options
	const fileTypeOptions = [
		{ value: 'all', name: 'Todos los tipos' },
		{ value: 'certificaciones_pdf', name: 'Certificaciones PDF' },
		{ value: 'invoice_summary', name: 'Invoice Summary' },
		{ value: 'facturacion', name: 'Archivo Facturación' }
	];

	onMount(async () => {
		await fetchFiles();
	});

	async function fetchFiles() {
		isLoading = true;
		try {
			const { data, error } = await supabase
				.from('files')
				.select('*, clients(name)')
				.eq('status', 'active')
				.order('uploaded_at', { ascending: false });

			if (error) throw error;

			files = (data || []).map((file) => ({
				...file,
				client_name: file.clients?.name || 'Sin cliente'
			}));

			applyFilters();
		} catch (error) {
			console.error('Error fetching files:', error);
			toasts.error('Error al cargar los archivos');
		} finally {
			isLoading = false;
		}
	}

	function applyFilters() {
		let result = [...files];

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(file) =>
					file.filename.toLowerCase().includes(query) ||
					file.invoice_number?.toLowerCase().includes(query)
			);
		}

		// Type filter
		if (filterType !== 'all') {
			result = result.filter((file) => file.file_type === filterType);
		}

		filteredFiles = result;
		currentPage = 1; // Reset to first page when filters change
	}

	$: {
		searchQuery;
		filterType;
		applyFilters();
	}

	// Pagination computed
	$: totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
	$: paginatedFiles = filteredFiles.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);

	// Generate limited page numbers with ellipsis
	function generatePages(current: number, total: number) {
		const pages: { name: string; active: boolean }[] = [];
		const maxVisible = 7;

		if (total <= maxVisible) {
			// Show all pages if total is small
			for (let i = 1; i <= total; i++) {
				pages.push({ name: String(i), active: current === i });
			}
		} else {
			// Always show first page
			pages.push({ name: '1', active: current === 1 });

			if (current > 3) {
				pages.push({ name: '...', active: false });
			}

			// Pages around current
			const start = Math.max(2, current - 1);
			const end = Math.min(total - 1, current + 1);

			for (let i = start; i <= end; i++) {
				pages.push({ name: String(i), active: current === i });
			}

			if (current < total - 2) {
				pages.push({ name: '...', active: false });
			}

			// Always show last page
			pages.push({ name: String(total), active: current === total });
		}

		return pages;
	}

	$: pages = generatePages(currentPage, totalPages);

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	}

	async function downloadFile(storagePath: string, filename: string) {
		try {
			const { data, error } = await supabase.storage
				.from('uploads')
				.createSignedUrl(storagePath, 60);

			if (error) throw error;

			if (data?.signedUrl) {
				const link = document.createElement('a');
				link.href = data.signedUrl;
				link.download = filename;
				link.target = '_blank';
				link.click();
			}
		} catch (error) {
			console.error('Error downloading file:', error);
			toasts.error('Error al descargar el archivo');
		}
	}

	async function deleteFile(id: string) {
		if (!confirm('¿Está seguro que desea eliminar este archivo?')) return;

		try {
			const { error } = await supabase.rpc('soft_delete_file', { p_file_id: id });

			if (error) throw error;

			toasts.success('Archivo eliminado correctamente');
			await fetchFiles();
		} catch (error) {
			console.error('Error deleting file:', error);
			toasts.error('Error al eliminar el archivo');
		}
	}

	async function deleteSelectedFiles() {
		if (selectedFiles.size === 0) {
			toasts.info('No hay archivos seleccionados');
			return;
		}

		if (!confirm(`¿Está seguro que desea eliminar ${selectedFiles.size} archivo(s)?`)) return;

		let successCount = 0;
		let errorCount = 0;

		for (const fileId of selectedFiles) {
			try {
				const { error } = await supabase.rpc('soft_delete_file', { p_file_id: fileId });
				if (error) {
					errorCount++;
				} else {
					successCount++;
				}
			} catch {
				errorCount++;
			}
		}

		if (successCount > 0) {
			toasts.success(`${successCount} archivo(s) eliminado(s) correctamente`);
		}

		if (errorCount > 0) {
			toasts.error(`${errorCount} archivo(s) no pudieron ser eliminados`);
		}

		selectedFiles = new Set();
		selectAll = false;
		await fetchFiles();
	}

	function toggleSelectAll() {
		if (selectAll) {
			selectedFiles = new Set();
		} else {
			selectedFiles = new Set(filteredFiles.map((f) => f.id));
		}
		selectAll = !selectAll;
	}

	function toggleFileSelection(fileId: string) {
		const newSelected = new Set(selectedFiles);
		if (newSelected.has(fileId)) {
			newSelected.delete(fileId);
		} else {
			newSelected.add(fileId);
		}
		selectedFiles = newSelected;
		selectAll = selectedFiles.size === filteredFiles.length;
	}

	function getFileTypeBadge(type: string): { color: string; label: string } {
		switch (type) {
			case 'certificaciones_pdf':
				return { color: 'blue', label: 'PDF' };
			case 'invoice_summary':
				return { color: 'green', label: 'Invoice Summary' };
			case 'facturacion':
				return { color: 'yellow', label: 'Facturación' };
			default:
				return { color: 'gray', label: type || 'Otro' };
		}
	}

	function handleUploadSuccess() {
		fetchFiles();
	}
</script>

<svelte:head>
	<title>Archivos - CMP Finance Manager</title>
</svelte:head>

<div class="w-full py-8 px-6">
	<h1 class="text-3xl font-bold mb-6 dark:text-white">Gestión de Archivos</h1>

	<!-- File Actions -->
	<Card size="none" class="mb-6">
		<FileActions on:actionComplete={fetchFiles} />
	</Card>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- File Upload Form -->
		<div class="lg:col-span-1">
			<FileUploadForm on:uploadSuccess={handleUploadSuccess} />
		</div>

		<!-- Files List -->
		<div class="lg:col-span-2">
			<Card size="none">
				<!-- Header with Search and Filters -->
				<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
					<h5 class="text-lg font-semibold dark:text-white">
						Archivos {#if filteredFiles.length > 0}({(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredFiles.length)} de {filteredFiles.length}){:else}(0){/if}
					</h5>

					<div class="flex flex-wrap items-center gap-3">
						<!-- Search -->
						<div class="relative">
							<SearchOutline class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
							<Input
								bind:value={searchQuery}
								placeholder="Buscar archivos..."
								class="pl-9 w-48"
							/>
						</div>

						<!-- Type Filter -->
						<Select bind:value={filterType} items={fileTypeOptions} class="w-48" />

						<!-- Refresh -->
						<Button color="light" on:click={fetchFiles}>
							<RefreshOutline class="w-4 h-4" />
						</Button>

						<!-- Delete Selected -->
						{#if selectedFiles.size > 0}
							<Button color="red" on:click={deleteSelectedFiles}>
								<TrashBinSolid class="w-4 h-4 mr-2" />
								Eliminar ({selectedFiles.size})
							</Button>
						{/if}
					</div>
				</div>

				<!-- Files Table -->
				{#if isLoading}
					<div class="flex items-center justify-center h-64">
						<Spinner size="12" />
					</div>
				{:else if filteredFiles.length === 0}
					<div class="text-center py-16 text-gray-500 dark:text-gray-400">
						{searchQuery || filterType !== 'all'
							? 'No se encontraron archivos con los filtros aplicados'
							: 'No hay archivos para mostrar'}
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-sm text-left">
							<thead class="text-xs uppercase bg-gray-50 dark:bg-gray-700">
								<tr>
									<th class="p-3 w-10">
										<Checkbox checked={selectAll} on:change={toggleSelectAll} />
									</th>
									<th class="p-3">Nombre</th>
									<th class="p-3">Tipo</th>
									<th class="p-3">Fecha</th>
									<th class="p-3">Estado</th>
									<th class="p-3 text-right">Acciones</th>
								</tr>
							</thead>
							<tbody class="divide-y dark:divide-gray-700">
								{#each paginatedFiles as file}
									{@const badge = getFileTypeBadge(file.file_type)}
									<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
										<td class="p-3">
											<Checkbox
												checked={selectedFiles.has(file.id)}
												on:change={() => toggleFileSelection(file.id)}
											/>
										</td>
										<td class="p-3 dark:text-white">
											<span class="truncate max-w-xs block" title={file.filename}>
												{file.filename}
											</span>
										</td>
										<td class="p-3">
											<Badge color={badge.color}>{badge.label}</Badge>
										</td>
										<td class="p-3 text-gray-600 dark:text-gray-400">
											{formatDate(file.uploaded_at)}
										</td>
										<td class="p-3">
											{#if file.processed}
												<Badge color="green">Procesado</Badge>
											{:else}
												<Badge color="gray">Pendiente</Badge>
											{/if}
										</td>
										<td class="p-3">
											<div class="flex justify-end gap-2">
												<Button
													size="xs"
													color="light"
													on:click={() => downloadFile(file.storage_path, file.filename)}
												>
													<DownloadSolid class="w-4 h-4" />
												</Button>
												<Button
													size="xs"
													color="red"
													on:click={() => deleteFile(file.id)}
												>
													<TrashBinSolid class="w-4 h-4" />
												</Button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<!-- Pagination -->
					{#if totalPages > 1}
						<div class="flex justify-center items-center gap-1 mt-4">
							<button
								on:click={() => goToPage(currentPage - 1)}
								disabled={currentPage === 1}
								class="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
							>
								Anterior
							</button>

							{#each pages as page}
								{#if page.name === '...'}
									<span class="px-3 py-1 text-sm text-gray-500">...</span>
								{:else}
									<button
										on:click={() => goToPage(parseInt(page.name))}
										class="px-3 py-1 text-sm border rounded-lg {page.active
											? 'bg-blue-500 text-white border-blue-500'
											: 'hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white'}"
									>
										{page.name}
									</button>
								{/if}
							{/each}

							<button
								on:click={() => goToPage(currentPage + 1)}
								disabled={currentPage === totalPages}
								class="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
							>
								Siguiente
							</button>
						</div>
					{/if}
				{/if}
			</Card>
		</div>
	</div>
</div>
