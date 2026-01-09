<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from 'flowbite-svelte';
	import { HomeSolid } from 'flowbite-svelte-icons';
</script>

<svelte:head>
	<title>Error {$page.status} - CMP Finance Manager</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
	<div class="text-center">
		<h1 class="text-9xl font-bold text-orange-500">{$page.status}</h1>
		<h2 class="text-2xl font-semibold text-gray-900 dark:text-white mt-4">
			{#if $page.status === 404}
				Página no encontrada
			{:else}
				Algo salió mal
			{/if}
		</h2>
		<p class="text-gray-500 dark:text-gray-400 mt-2">
			{$page.error?.message || 'La página que buscas no existe o ha sido movida.'}
		</p>
		<Button href="/dashboard" class="mt-6" color="primary">
			<HomeSolid class="mr-2 h-4 w-4" />
			Volver al inicio
		</Button>
	</div>
</div>
