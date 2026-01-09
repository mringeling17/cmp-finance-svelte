<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import * as echarts from 'echarts';
	import type { EChartsOption } from 'echarts';

	export let options: EChartsOption;
	export let height: string = '400px';
	export let theme: 'light' | 'dark' | null = null;

	let outerContainer: HTMLDivElement;
	let chartContainer: HTMLDivElement;
	let chart: echarts.ECharts | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let mutationObserver: MutationObserver | null = null;
	let currentWidth = 0;

	function isDarkMode(): boolean {
		if (typeof window === 'undefined') return false;
		return document.documentElement.classList.contains('dark');
	}

	function getTheme(): string | null {
		if (theme) return theme;
		return isDarkMode() ? 'dark' : null;
	}

	function initChart(width: number) {
		if (!chartContainer || width <= 0) return;

		const heightPx = parseInt(height) || 400;

		if (chart) {
			chart.dispose();
			chart = null;
		}

		chart = echarts.init(chartContainer, getTheme(), {
			renderer: 'canvas',
			width: Math.floor(width),
			height: heightPx
		});

		chart.setOption(options);
		currentWidth = width;
	}

	function handleResize(width: number) {
		if (!chart || width <= 0) return;

		const heightPx = parseInt(height) || 400;

		// Solo redimensionar si el cambio es significativo
		if (Math.abs(width - currentWidth) > 5) {
			chart.resize({
				width: Math.floor(width),
				height: heightPx
			});
			currentWidth = width;
		}
	}

	onMount(async () => {
		await tick();

		const heightPx = parseInt(height) || 400;

		// ResizeObserver es la forma más confiable de obtener dimensiones
		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				// Usar contentBoxSize si está disponible, sino contentRect
				let width: number;
				if (entry.contentBoxSize) {
					const boxSize = Array.isArray(entry.contentBoxSize)
						? entry.contentBoxSize[0]
						: entry.contentBoxSize;
					width = boxSize.inlineSize;
				} else {
					width = entry.contentRect.width;
				}

				if (width > 50) {
					if (!chart) {
						initChart(width);
					} else {
						handleResize(width);
					}
				}
			}
		});

		resizeObserver.observe(outerContainer);

		// Dark mode observer
		mutationObserver = new MutationObserver(() => {
			if (chart && currentWidth > 0) {
				// Re-inicializar con nuevo tema
				setTimeout(() => initChart(currentWidth), 50);
			}
		});
		mutationObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});
	});

	$: if (chart && options) {
		chart.setOption(options, { notMerge: true });
	}

	onDestroy(() => {
		resizeObserver?.disconnect();
		mutationObserver?.disconnect();
		chart?.dispose();
	});
</script>

<div
	bind:this={outerContainer}
	class="chart-outer-container"
	style="--chart-height: {height};"
>
	<div
		bind:this={chartContainer}
		class="chart-inner-container"
	></div>
</div>

<style>
	.chart-outer-container {
		width: 100%;
		height: var(--chart-height, 400px);
		position: relative;
		min-width: 0;
	}

	.chart-inner-container {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
	}
</style>
