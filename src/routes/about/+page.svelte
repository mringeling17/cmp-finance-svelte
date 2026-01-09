<script lang="ts">
	import { Card } from 'flowbite-svelte';
</script>

<svelte:head>
	<title>Acerca de - CMP Finance Manager</title>
</svelte:head>

<div class="w-full py-8 px-6">
	<h1 class="text-3xl font-bold mb-6 dark:text-white">Acerca de</h1>

	<div class="max-w-2xl mx-auto">
		<Card>
			<div class="text-center">
				<h2 class="text-2xl font-bold mb-4 dark:text-white">CMP Finance Manager</h2>
				<p class="text-gray-500 dark:text-gray-400 mb-6">
					Sistema de gestión financiera para CrossMediaPlay
				</p>

				<div class="space-y-4 text-left">
					<div>
						<h3 class="font-semibold dark:text-white">Versión</h3>
						<p class="text-gray-500 dark:text-gray-400">2.0.0 (SvelteKit)</p>
					</div>

					<div>
						<h3 class="font-semibold dark:text-white">Tecnologías</h3>
						<ul class="list-disc list-inside text-gray-500 dark:text-gray-400">
							<li>SvelteKit</li>
							<li>TypeScript</li>
							<li>Tailwind CSS</li>
							<li>Flowbite Svelte</li>
							<li>Apache ECharts</li>
							<li>AG-Grid</li>
							<li>Supabase</li>
						</ul>
					</div>

					<div>
						<h3 class="font-semibold dark:text-white">Desarrollado por</h3>
						<p class="text-gray-500 dark:text-gray-400">CrossMediaPlay SPA</p>
					</div>
				</div>
			</div>
		</Card>
	</div>
</div>
