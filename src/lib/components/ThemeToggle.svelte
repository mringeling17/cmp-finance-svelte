<script lang="ts">
	import { Toggle } from 'flowbite-svelte';
	import { MoonSolid, SunSolid } from 'flowbite-svelte-icons';
	import { browser } from '$app/environment';

	let isDark = false;

	// Initialize theme from localStorage or system preference
	if (browser) {
		const savedTheme = localStorage.getItem('theme');
		isDark =
			savedTheme === 'dark' ||
			(!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
		updateTheme(isDark);
	}

	function updateTheme(dark: boolean) {
		if (!browser) return;

		const root = document.documentElement;
		if (dark) {
			root.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			root.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}

	function toggleTheme() {
		isDark = !isDark;
		updateTheme(isDark);
	}
</script>

<div class="flex items-center gap-2">
	{#if isDark}
		<MoonSolid class="h-4 w-4 text-orange-400" />
	{:else}
		<SunSolid class="h-4 w-4 text-orange-500" />
	{/if}
	<Toggle checked={isDark} on:change={toggleTheme} color="orange" size="small" />
</div>
