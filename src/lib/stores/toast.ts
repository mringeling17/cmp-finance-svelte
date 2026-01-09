import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: number;
	type: ToastType;
	message: string;
	dismissible?: boolean;
	timeout?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);
	let nextId = 0;

	function addToast(toast: Omit<Toast, 'id'>) {
		const id = nextId++;
		const newToast: Toast = {
			id,
			dismissible: true,
			timeout: 5000,
			...toast
		};

		update((toasts) => [...toasts, newToast]);

		if (newToast.timeout && newToast.timeout > 0) {
			setTimeout(() => {
				dismiss(id);
			}, newToast.timeout);
		}

		return id;
	}

	function dismiss(id: number) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	function clear() {
		update(() => []);
	}

	return {
		subscribe,
		success: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
			addToast({ type: 'success', message, ...options }),
		error: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
			addToast({ type: 'error', message, ...options }),
		warning: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
			addToast({ type: 'warning', message, ...options }),
		info: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
			addToast({ type: 'info', message, ...options }),
		dismiss,
		clear
	};
}

export const toasts = createToastStore();
