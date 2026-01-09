<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createGrid, type GridApi, type GridOptions, type ColDef } from 'ag-grid-community';
	import 'ag-grid-community/styles/ag-grid.css';
	import 'ag-grid-community/styles/ag-theme-alpine.css';

	// Props
	export let rowData: any[] = [];
	export let columnDefs: ColDef[] = [];
	export let defaultColDef: ColDef = {
		sortable: true,
		filter: true,
		resizable: true,
		minWidth: 100
	};
	export let pagination: boolean = true;
	export let paginationPageSize: number = 20;
	export let paginationPageSizeSelector: number[] = [10, 20, 50, 100];
	export let rowSelection: 'single' | 'multiple' | undefined = undefined;
	export let onRowSelected: ((event: any) => void) | undefined = undefined;
	export let onRowClicked: ((event: any) => void) | undefined = undefined;
	export let height: string = '500px';
	export let domLayout: 'normal' | 'autoHeight' | 'print' = 'normal';
	export let getRowId: ((params: any) => string) | undefined = undefined;

	let gridContainer: HTMLDivElement;
	let gridApi: GridApi | null = null;

	// Detect dark mode
	function isDarkMode(): boolean {
		if (typeof window === 'undefined') return false;
		return document.documentElement.classList.contains('dark');
	}

	// Get theme class
	function getThemeClass(): string {
		return isDarkMode() ? 'ag-theme-alpine-dark' : 'ag-theme-alpine';
	}

	let themeClass = 'ag-theme-alpine';

	onMount(() => {
		themeClass = getThemeClass();

		const gridOptions: GridOptions = {
			columnDefs,
			rowData,
			defaultColDef,
			pagination,
			paginationPageSize,
			paginationPageSizeSelector,
			rowSelection,
			domLayout,
			getRowId,
			onRowSelected,
			onRowClicked,
			animateRows: true,
			suppressCellFocus: true,
			onGridReady: () => {
				// Auto-size columns when grid is ready
				setTimeout(() => {
					if (gridApi) {
						gridApi.sizeColumnsToFit();
					}
				}, 100);
			},
			onFirstDataRendered: () => {
				// Also size after first data render
				if (gridApi) {
					gridApi.sizeColumnsToFit();
				}
			}
		};

		gridApi = createGrid(gridContainer, gridOptions);

		// Handle window resize
		const handleResize = () => {
			if (gridApi) {
				gridApi.sizeColumnsToFit();
			}
		};
		window.addEventListener('resize', handleResize);

		// Watch for dark mode changes
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.attributeName === 'class') {
					themeClass = getThemeClass();
				}
			});
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', handleResize);
		};
	});

	// Update row data when it changes
	$: if (gridApi && rowData) {
		gridApi.setGridOption('rowData', rowData);
		// Resize columns after data update
		setTimeout(() => {
			if (gridApi) {
				gridApi.sizeColumnsToFit();
			}
		}, 50);
	}

	// Update column defs when they change
	$: if (gridApi && columnDefs) {
		gridApi.setGridOption('columnDefs', columnDefs);
	}

	onDestroy(() => {
		if (gridApi) {
			gridApi.destroy();
			gridApi = null;
		}
	});

	// Export grid API for parent components
	export function getApi(): GridApi | null {
		return gridApi;
	}

	// Export helper methods
	export function exportToCsv(fileName: string = 'export.csv') {
		if (gridApi) {
			gridApi.exportDataAsCsv({ fileName });
		}
	}

	export function sizeColumnsToFit() {
		if (gridApi) {
			gridApi.sizeColumnsToFit();
		}
	}

	export function autoSizeAllColumns() {
		if (gridApi) {
			gridApi.autoSizeAllColumns();
		}
	}
</script>

<div
	bind:this={gridContainer}
	class={themeClass}
	style="height: {domLayout === 'autoHeight' ? 'auto' : height}; width: 100%;"
>
</div>

<style>
	:global(.ag-theme-alpine),
	:global(.ag-theme-alpine-dark) {
		--ag-font-family: inherit;
		--ag-font-size: 14px;
	}

	:global(.ag-theme-alpine-dark) {
		--ag-background-color: rgb(31 41 55);
		--ag-header-background-color: rgb(55 65 81);
		--ag-odd-row-background-color: rgb(31 41 55);
		--ag-row-hover-color: rgb(55 65 81);
		--ag-selected-row-background-color: rgb(55 65 81);
	}
</style>
