<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user, loading } from '$lib/stores/auth';

	onMount(() => {
		// Redirect based on auth status
		const unsubscribe = loading.subscribe((isLoading) => {
			if (!isLoading) {
				if ($user) {
					goto('/dashboard');
				} else {
					goto('/login');
				}
			}
		});

		return unsubscribe;
	});
</script>

<svelte:head>
	<title>CMP Finance Manager</title>
</svelte:head>

<div class="flex items-center justify-center min-h-screen">
	<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
</div>
