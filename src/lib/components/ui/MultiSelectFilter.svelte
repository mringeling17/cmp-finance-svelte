<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Dropdown, DropdownItem, Button, Checkbox, Badge } from 'flowbite-svelte';
	import { ChevronDownOutline } from 'flowbite-svelte-icons';

	export let options: { value: string; label: string }[] = [];
	export let selected: string[] = [];
	export let placeholder = 'Seleccionar...';
	export let searchable = false;
	export let maxDisplay = 2;

	const dispatch = createEventDispatcher<{
		change: string[];
	}>();

	let searchTerm = '';
	let open = false;

	$: filteredOptions = searchable && searchTerm
		? options.filter((opt) =>
				opt.label.toLowerCase().includes(searchTerm.toLowerCase())
		  )
		: options;

	$: displayText =
		selected.length === 0
			? placeholder
			: selected.length <= maxDisplay
			  ? selected
						.map((v) => options.find((o) => o.value === v)?.label || v)
						.join(', ')
			  : `${selected.length} seleccionados`;

	function toggleOption(value: string) {
		if (selected.includes(value)) {
			selected = selected.filter((v) => v !== value);
		} else {
			selected = [...selected, value];
		}
		dispatch('change', selected);
	}

	function selectAll() {
		selected = options.map((o) => o.value);
		dispatch('change', selected);
	}

	function clearAll() {
		selected = [];
		dispatch('change', selected);
	}

	function isSelected(value: string): boolean {
		return selected.includes(value);
	}
</script>

<div class="relative">
	<Button color="light" class="flex items-center justify-between min-w-[200px]">
		<span class="truncate">{displayText}</span>
		<ChevronDownOutline class="ml-2 h-4 w-4 flex-shrink-0" />
	</Button>

	<Dropdown bind:open class="w-full min-w-[200px] p-2">
		{#if searchable}
			<div class="px-2 pb-2">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Buscar..."
					class="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
				/>
			</div>
		{/if}

		<div class="flex gap-2 px-2 pb-2 border-b dark:border-gray-600">
			<button
				type="button"
				on:click={selectAll}
				class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
			>
				Seleccionar todo
			</button>
			<span class="text-gray-300">|</span>
			<button
				type="button"
				on:click={clearAll}
				class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
			>
				Limpiar
			</button>
		</div>

		<div class="max-h-48 overflow-y-auto">
			{#each filteredOptions as option (option.value)}
				<DropdownItem
					class="flex items-center gap-2 cursor-pointer"
					on:click={() => toggleOption(option.value)}
				>
					<Checkbox checked={isSelected(option.value)} class="pointer-events-none" />
					<span class="truncate">{option.label}</span>
				</DropdownItem>
			{/each}

			{#if filteredOptions.length === 0}
				<div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
					No se encontraron opciones
				</div>
			{/if}
		</div>

		{#if selected.length > 0}
			<div class="pt-2 px-2 border-t dark:border-gray-600">
				<div class="flex flex-wrap gap-1">
					{#each selected.slice(0, 3) as value (value)}
						<Badge color="blue" class="text-xs">
							{options.find((o) => o.value === value)?.label || value}
						</Badge>
					{/each}
					{#if selected.length > 3}
						<Badge color="dark" class="text-xs">+{selected.length - 3}</Badge>
					{/if}
				</div>
			</div>
		{/if}
	</Dropdown>
</div>
