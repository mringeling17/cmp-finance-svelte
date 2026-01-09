<script lang="ts">
	import { Button, Input, Label, Helper, Card, Spinner } from 'flowbite-svelte';
	import { EnvelopeSolid, LockSolid } from 'flowbite-svelte-icons';
	import { signIn } from '$lib/stores/auth';
	import { z } from 'zod';

	// Form state
	let username = '';
	let password = '';
	let isLoading = false;
	let errors: { username?: string; password?: string } = {};

	// Validation schema
	const loginSchema = z.object({
		username: z.string().min(1, 'El nombre de usuario es requerido'),
		password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
	});

	async function handleSubmit() {
		// Clear previous errors
		errors = {};

		// Validate form
		const result = loginSchema.safeParse({ username, password });
		if (!result.success) {
			const fieldErrors = result.error.flatten().fieldErrors;
			errors = {
				username: fieldErrors.username?.[0],
				password: fieldErrors.password?.[0]
			};
			return;
		}

		isLoading = true;
		try {
			const email = `${username}@crossmediaplay.com`;
			const { error } = await signIn(email, password);
			if (error) {
				errors = { password: 'Credenciales inválidas' };
			}
		} catch (error) {
			console.error('Authentication error:', error);
			errors = { password: 'Error al iniciar sesión' };
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - CMP Finance Manager</title>
</svelte:head>

<div
	class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4"
>
	<div class="w-full max-w-md">
		<div class="flex flex-col items-center space-y-2 text-center mb-6">
			<h1 class="text-3xl font-bold dark:text-white">CMP Finance Manager</h1>
			<p class="text-gray-500 dark:text-gray-400">
				Inicia sesión para acceder al sistema
			</p>
		</div>

		<Card class="max-w-md">
			<form on:submit|preventDefault={handleSubmit} class="space-y-4">
				<div>
					<Label for="username" class="mb-2">Usuario</Label>
					<div class="flex">
						<span
							class="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600"
						>
							<EnvelopeSolid class="w-4 h-4 text-gray-500 dark:text-gray-400" />
						</span>
						<Input
							id="username"
							bind:value={username}
							placeholder="usuario"
							class="rounded-l-none rounded-r-none flex-1"
							color={errors.username ? 'red' : 'base'}
						/>
						<span
							class="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"
						>
							@crossmediaplay.com
						</span>
					</div>
					{#if errors.username}
						<Helper class="mt-1" color="red">{errors.username}</Helper>
					{/if}
				</div>

				<div>
					<Label for="password" class="mb-2">Contraseña</Label>
					<div class="flex">
						<span
							class="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600"
						>
							<LockSolid class="w-4 h-4 text-gray-500 dark:text-gray-400" />
						</span>
						<Input
							id="password"
							type="password"
							bind:value={password}
							placeholder="••••••••"
							class="rounded-l-none"
							color={errors.password ? 'red' : 'base'}
						/>
					</div>
					{#if errors.password}
						<Helper class="mt-1" color="red">{errors.password}</Helper>
					{/if}
				</div>

				<Button type="submit" class="w-full mt-6" color="primary" disabled={isLoading}>
					{#if isLoading}
						<Spinner class="mr-2" size="4" color="white" />
						Cargando...
					{:else}
						Iniciar Sesión
					{/if}
				</Button>
			</form>
		</Card>
	</div>
</div>
