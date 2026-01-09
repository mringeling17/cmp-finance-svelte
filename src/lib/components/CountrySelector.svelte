<script lang="ts">
	import { Select } from 'flowbite-svelte';
	import { currentCountry, countries } from '$lib/stores/country';

	let items = [{ value: 'all', name: 'Todos' }];

	$: {
		items = [
			{ value: 'all', name: 'Todos' },
			...$countries
				.filter((c) => c.id !== 'all')
				.map((c) => ({ value: c.id, name: c.name }))
		];
	}
</script>

<Select
	bind:value={$currentCountry}
	{items}
	size="sm"
	class="w-32"
	placeholder="Seleccionar país"
/>
