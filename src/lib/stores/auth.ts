import { writable, derived } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '$lib/services/supabase';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

// Auth state stores
export const user = writable<User | null>(null);
export const session = writable<Session | null>(null);
export const loading = writable(true);

// Derived store for authentication status
export const isAuthenticated = derived(
	[user, loading],
	([$user, $loading]) => !$loading && $user !== null
);

// Initialize auth state
export async function initAuth() {
	if (!browser) return;

	// Set up auth state listener
	const {
		data: { subscription }
	} = supabase.auth.onAuthStateChange((event, currentSession) => {
		session.set(currentSession);
		user.set(currentSession?.user ?? null);
		loading.set(false);
	});

	// Check for existing session
	const {
		data: { session: currentSession }
	} = await supabase.auth.getSession();
	session.set(currentSession);
	user.set(currentSession?.user ?? null);
	loading.set(false);

	return () => subscription.unsubscribe();
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<{ error: Error | null }> {
	try {
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) throw error;

		await goto('/dashboard');
		return { error: null };
	} catch (error) {
		return { error: error as Error };
	}
}

// Sign up with email and password
export async function signUp(email: string, password: string): Promise<{ error: Error | null }> {
	try {
		const { error } = await supabase.auth.signUp({
			email,
			password
		});

		if (error) throw error;

		return { error: null };
	} catch (error) {
		return { error: error as Error };
	}
}

// Sign out
export async function signOut(): Promise<void> {
	await supabase.auth.signOut();
	await goto('/login');
}
