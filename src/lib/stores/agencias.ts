import { writable, get } from 'svelte/store';
import { supabase } from '$lib/services/supabase';
import { currentCountry } from './country';
import type { Agency } from '$lib/types';

// Agencias store
export const agencias = writable<Agency[]>([]);
export const agenciasLoading = writable(false);
export const agenciasError = writable<string | null>(null);

// Fetch agencias from database
export async function fetchAgencias(): Promise<void> {
	agenciasLoading.set(true);
	agenciasError.set(null);

	try {
		const country = get(currentCountry);
		let query = supabase.from('agencies').select('*').order('name');

		if (country !== 'all') {
			query = query.eq('country', country);
		}

		const { data, error } = await query;

		if (error) throw error;

		agencias.set(data || []);
	} catch (error) {
		console.error('Error fetching agencias:', error);
		agenciasError.set('Error al cargar agencias');
	} finally {
		agenciasLoading.set(false);
	}
}

// Create agencia
export async function createAgencia(
	agencia: Omit<Agency, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await supabase.from('agencies').insert(agencia);

		if (error) throw error;

		await fetchAgencias();
		return { success: true };
	} catch (error: any) {
		console.error('Error creating agencia:', error);
		return { success: false, error: error.message };
	}
}

// Update agencia
export async function updateAgencia(
	id: string,
	updates: Partial<Agency>
): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await supabase.from('agencies').update(updates).eq('id', id);

		if (error) throw error;

		await fetchAgencias();
		return { success: true };
	} catch (error: any) {
		console.error('Error updating agencia:', error);
		return { success: false, error: error.message };
	}
}

// Delete agencia
export async function deleteAgencia(id: string): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await supabase.from('agencies').delete().eq('id', id);

		if (error) throw error;

		await fetchAgencias();
		return { success: true };
	} catch (error: any) {
		console.error('Error deleting agencia:', error);
		return { success: false, error: error.message };
	}
}
