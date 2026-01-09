import { writable, derived, get } from 'svelte/store';
import { supabase } from '$lib/services/supabase';
import { currentCountry } from './country';
import type { Cliente } from '$lib/types';

// Clientes store
export const clientes = writable<Cliente[]>([]);
export const clientesLoading = writable(false);
export const clientesError = writable<string | null>(null);

// Fetch clientes from database
export async function fetchClientes(): Promise<void> {
	clientesLoading.set(true);
	clientesError.set(null);

	try {
		const country = get(currentCountry);
		let query = supabase.from('clients').select('*, agencies(id, name)').order('name');

		if (country !== 'all') {
			query = query.eq('country', country);
		}

		const { data, error } = await query;

		if (error) throw error;

		clientes.set(data || []);
	} catch (error) {
		console.error('Error fetching clientes:', error);
		clientesError.set('Error al cargar clientes');
	} finally {
		clientesLoading.set(false);
	}
}

// Create cliente
export async function createCliente(
	cliente: Omit<Cliente, 'id' | 'created_at'>,
	emails: string[]
): Promise<{ success: boolean; error?: string }> {
	try {
		// Insert client
		const { data: newClient, error: clientError } = await supabase
			.from('clients')
			.insert(cliente)
			.select()
			.single();

		if (clientError) throw clientError;

		// Insert emails
		for (const email of emails) {
			// First, insert or get email
			const { data: emailData, error: emailError } = await supabase
				.from('emails')
				.upsert({ email }, { onConflict: 'email' })
				.select()
				.single();

			if (emailError) throw emailError;

			// Then link email to client
			await supabase.from('client_emails').insert({
				client_id: newClient.id,
				email_id: emailData.id
			});
		}

		await fetchClientes();
		return { success: true };
	} catch (error: any) {
		console.error('Error creating cliente:', error);
		return { success: false, error: error.message };
	}
}

// Update cliente
export async function updateCliente(
	id: string,
	updates: Partial<Cliente>
): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await supabase.from('clients').update(updates).eq('id', id);

		if (error) throw error;

		await fetchClientes();
		return { success: true };
	} catch (error: any) {
		console.error('Error updating cliente:', error);
		return { success: false, error: error.message };
	}
}

// Delete cliente
export async function deleteCliente(id: string): Promise<{ success: boolean; error?: string }> {
	try {
		// First delete client_emails relations
		await supabase.from('client_emails').delete().eq('client_id', id);

		// Then delete client
		const { error } = await supabase.from('clients').delete().eq('id', id);

		if (error) throw error;

		await fetchClientes();
		return { success: true };
	} catch (error: any) {
		console.error('Error deleting cliente:', error);
		return { success: false, error: error.message };
	}
}

// Get client emails
export async function getClientEmails(clientId: string): Promise<string[]> {
	try {
		const { data, error } = await supabase
			.from('client_emails')
			.select('emails(email)')
			.eq('client_id', clientId);

		if (error) throw error;

		return data?.map((item: any) => item.emails?.email).filter(Boolean) || [];
	} catch (error) {
		console.error('Error fetching client emails:', error);
		return [];
	}
}

// Add email to client
export async function addClientEmail(
	clientId: string,
	email: string
): Promise<{ success: boolean; error?: string }> {
	try {
		// Insert or get email
		const { data: emailData, error: emailError } = await supabase
			.from('emails')
			.upsert({ email }, { onConflict: 'email' })
			.select()
			.single();

		if (emailError) throw emailError;

		// Link email to client
		const { error } = await supabase.from('client_emails').insert({
			client_id: clientId,
			email_id: emailData.id
		});

		if (error) throw error;

		return { success: true };
	} catch (error: any) {
		console.error('Error adding client email:', error);
		return { success: false, error: error.message };
	}
}
