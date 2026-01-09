<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button, Navbar, NavBrand, NavLi, NavUl, NavHamburger } from 'flowbite-svelte';
	import {
		HomeSolid,
		UsersSolid,
		FileLinesSolid,
		FolderOpenSolid,
		ChartPieSolid,
		ArrowRightToBracketOutline
	} from 'flowbite-svelte-icons';
	import CountrySelector from '$lib/components/CountrySelector.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { initAuth, user, signOut, loading } from '$lib/stores/auth';
	import { fetchCountries, currentCountry, fetchDollarRate } from '$lib/stores/country';

	// Public routes that don't require authentication
	const publicRoutes = ['/login', '/about'];

	onMount(async () => {
		await initAuth();
		await fetchCountries();
	});

	// Route protection - redirect to login if not authenticated
	$: {
		const isPublicRoute = publicRoutes.some(
			(route) => $page.url.pathname === route || $page.url.pathname.startsWith(route + '/')
		);

		if (!$loading && !$user && !isPublicRoute) {
			goto('/login');
		}
	}

	// Fetch dollar rate when country is 'all'
	$: if ($currentCountry === 'all') {
		fetchDollarRate();
	}

	function isActive(path: string): boolean {
		return $page.url.pathname === path;
	}

	const navItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: HomeSolid },
		{ href: '/clientes', label: 'Clientes', icon: UsersSolid },
		{ href: '/facturacion', label: 'Facturas', icon: FileLinesSolid },
		{ href: '/pagos', label: 'Pagos', icon: FileLinesSolid },
		{ href: '/cobranzas', label: 'Cobranzas', icon: ChartPieSolid },
		{ href: '/archivos', label: 'Archivos', icon: FolderOpenSolid }
	];
</script>

<div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
	{#if $page.url.pathname !== '/login'}
		<Navbar class="border-b bg-white dark:bg-gray-800 sticky top-0 z-50">
			<NavBrand href="/dashboard">
				<ChartPieSolid class="mr-2 h-6 w-6 text-orange-500" />
				<span class="text-xl font-bold dark:text-white">CMP Finance Manager</span>
			</NavBrand>

			<div class="flex items-center gap-3 md:order-2">
				<CountrySelector />
				<ThemeToggle />
				{#if $user}
					<Button
						size="sm"
						color="light"
						on:click={signOut}
						class="flex items-center gap-1"
					>
						<ArrowRightToBracketOutline class="h-4 w-4" />
						<span class="hidden md:inline">Salir</span>
					</Button>
				{/if}
			</div>

			<NavHamburger />

			<NavUl>
				{#each navItems as item}
					<NavLi
						href={item.href}
						active={isActive(item.href)}
						class="flex items-center gap-1"
						activeClass="text-orange-500 dark:text-orange-400"
						nonActiveClass="hover:text-orange-500 dark:hover:text-orange-400"
					>
						<svelte:component this={item.icon} class="h-4 w-4" />
						{item.label}
					</NavLi>
				{/each}
			</NavUl>
		</Navbar>
	{/if}

	<main class="flex-1">
		{#if $loading}
			<div class="flex items-center justify-center h-64">
				<div
					class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"
				></div>
			</div>
		{:else}
			<slot />
		{/if}
	</main>

	{#if $page.url.pathname !== '/login'}
		<footer class="border-t p-4 bg-white dark:bg-gray-800">
			<div class="container mx-auto text-center text-gray-500 dark:text-gray-400">
				<p>&copy; 2025 CrossMediaPlay SPA</p>
			</div>
		</footer>
	{/if}

	<ToastContainer />
</div>
