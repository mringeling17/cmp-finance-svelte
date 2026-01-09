import { get } from 'svelte/store';
import { countries, currentCountry } from '$lib/stores/country';

/**
 * Format a number as currency
 */
export function formatCurrency(
	amount: number | null | undefined,
	countryCode?: string
): string {
	if (amount === null || amount === undefined) return '-';

	const code = countryCode || get(currentCountry);

	// Usar símbolo genérico cuando está en "Todos"
	if (code === 'all') {
		return `$${amount.toLocaleString('es-CL', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		})}`;
	}

	const countryList = get(countries);
	const country = countryList.find((c) => c.id === code);
	const symbol = country?.currency_symbol || '$';

	return `${symbol}${amount.toLocaleString('es-CL', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	})}`;
}

/**
 * Format a number with thousands separator
 */
export function formatNumber(value: number | null | undefined): string {
	if (value === null || value === undefined) return '-';

	return value.toLocaleString('es-CL', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});
}

/**
 * Format a date string
 */
export function formatDate(dateString: string | null | undefined): string {
	if (!dateString) return '-';

	const date = new Date(dateString);
	return date.toLocaleDateString('es-CL', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
}

/**
 * Format a date with time
 */
export function formatDateTime(dateString: string | null | undefined): string {
	if (!dateString) return '-';

	const date = new Date(dateString);
	return date.toLocaleString('es-CL', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}
