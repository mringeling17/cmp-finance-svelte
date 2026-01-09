<script lang="ts">
	import { Toast } from 'flowbite-svelte';
	import {
		CheckCircleSolid,
		CloseCircleSolid,
		ExclamationCircleSolid,
		InfoCircleSolid
	} from 'flowbite-svelte-icons';
	import { toasts, type ToastType } from '$lib/stores/toast';
	import { fly } from 'svelte/transition';

	function getIcon(type: ToastType) {
		switch (type) {
			case 'success':
				return CheckCircleSolid;
			case 'error':
				return CloseCircleSolid;
			case 'warning':
				return ExclamationCircleSolid;
			case 'info':
			default:
				return InfoCircleSolid;
		}
	}

	function getColor(type: ToastType): 'green' | 'red' | 'yellow' | 'blue' {
		switch (type) {
			case 'success':
				return 'green';
			case 'error':
				return 'red';
			case 'warning':
				return 'yellow';
			case 'info':
			default:
				return 'blue';
		}
	}
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
	{#each $toasts as toast (toast.id)}
		<div transition:fly={{ x: 100, duration: 300 }}>
			<Toast color={getColor(toast.type)} dismissable={toast.dismissible} on:close={() => toasts.dismiss(toast.id)}>
				<svelte:component this={getIcon(toast.type)} slot="icon" class="w-5 h-5" />
				{toast.message}
			</Toast>
		</div>
	{/each}
</div>
