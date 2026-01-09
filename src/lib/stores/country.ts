import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/services/supabase';
import type { Country } from '$lib/types';

// Get initial country from localStorage
function getInitialCountry(): string {
	if (browser) {
		return localStorage.getItem('selectedCountry') || 'all';
	}
	return 'all';
}

// Country stores
export const currentCountry = writable<string>(getInitialCountry());
export const countries = writable<Country[]>([]);
export const dollarRate = writable<number | null>(null);
export const countriesLoading = writable(true);

// Subscribe to currentCountry changes and save to localStorage
if (browser) {
	currentCountry.subscribe((value) => {
		localStorage.setItem('selectedCountry', value);
	});
}

// Fetch countries from database
export async function fetchCountries(): Promise<void> {
	try {
		countriesLoading.set(true);
		const { data, error } = await supabase.from('countries').select('*');

		if (error) throw error;

		if (data && data.length > 0) {
			countries.set(data);
		}
	} catch (error) {
		console.error('Error fetching countries:', error);
	} finally {
		countriesLoading.set(false);
	}
}

// Fetch dollar rate from exchange API
export async function fetchDollarRate(): Promise<void> {
	try {
		const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
		const data = await response.json();

		if (data && data.rates) {
			dollarRate.set(data.rates.USD);
		}
	} catch (error) {
		console.error('Error fetching dollar rate:', error);
	}
}

// Get currency symbol for a country
export function getCurrencySymbol(countryCode: string = get(currentCountry)): string {
	const countryList = get(countries);
	const country = countryList.find((c) => c.id === countryCode);
	return country?.currency_symbol || '$';
}

// Derived store for current country data
export const currentCountryData = derived(
	[currentCountry, countries],
	([$currentCountry, $countries]) => {
		if ($currentCountry === 'all') return null;
		return $countries.find((c) => c.id === $currentCountry) || null;
	}
);
