import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = 'https://tndpqvnazpgqvwjtcdzn.supabase.co';
const SUPABASE_ANON_KEY =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZHBxdm5henBncXZ3anRjZHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NTc2OTcsImV4cCI6MjA1OTAzMzY5N30.fDCbCWxTsx8tiCxSNNqOJ2aRShBPnBB8YkXHWs9X08w';

// Browser client (for client-side usage)
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create browser client for SSR
export function createSupabaseBrowserClient() {
	return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Create server client for SSR (used in hooks and load functions)
export function createSupabaseServerClient(
	cookies: {
		get: (key: string) => string | undefined;
		set: (key: string, value: string, options: object) => void;
		delete: (key: string, options: object) => void;
	}
) {
	return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
		cookies: {
			get(key) {
				return cookies.get(key);
			},
			set(key, value, options) {
				cookies.set(key, value, { ...options, path: '/' });
			},
			remove(key, options) {
				cookies.delete(key, { ...options, path: '/' });
			}
		}
	});
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };
