import { writable, get } from 'svelte/store';
import { supabase } from '$lib/services/supabase';
import { currentCountry } from './country';
import type { Payment, PaymentDetail } from '$lib/types';

// Extended payment type with invoice details
export interface PaymentWithDetails extends Payment {
	invoices?: {
		invoice_id: string;
		invoice_number: string;
		amount: number;
	}[];
}

// Payments store
export const payments = writable<PaymentWithDetails[]>([]);
export const paymentsLoading = writable(false);
export const paymentsError = writable<string | null>(null);

// Fetch payments from database
export async function fetchPayments(): Promise<void> {
	paymentsLoading.set(true);
	paymentsError.set(null);

	try {
		const country = get(currentCountry);
		let query = supabase
			.from('payments')
			.select(
				`
				*,
				payment_details(
					id,
					invoice_id,
					amount,
					invoices(invoice_number)
				)
			`
			)
			.order('payment_date', { ascending: false });

		if (country !== 'all') {
			query = query.eq('country', country);
		}

		const { data, error } = await query;

		if (error) throw error;

		// Process data to flatten invoice details
		const processedData: PaymentWithDetails[] = (data || []).map((payment: any) => ({
			...payment,
			invoices: payment.payment_details?.map((detail: any) => ({
				invoice_id: detail.invoice_id,
				invoice_number: detail.invoices?.invoice_number || 'N/A',
				amount: detail.amount
			}))
		}));

		payments.set(processedData);
	} catch (error) {
		console.error('Error fetching payments:', error);
		paymentsError.set('Error al cargar pagos');
	} finally {
		paymentsLoading.set(false);
	}
}

// Create payment
export async function createPayment(
	payment: Omit<Payment, 'id' | 'created_at'>,
	invoiceAmounts: { invoiceId: string; amount: number }[]
): Promise<{ success: boolean; error?: string }> {
	try {
		// Insert payment
		const { data: newPayment, error: paymentError } = await supabase
			.from('payments')
			.insert(payment)
			.select()
			.single();

		if (paymentError) throw paymentError;

		// Insert payment details
		for (const detail of invoiceAmounts) {
			await supabase.from('payment_details').insert({
				payment_id: newPayment.id,
				invoice_id: detail.invoiceId,
				amount: detail.amount
			});
		}

		await fetchPayments();
		return { success: true };
	} catch (error: any) {
		console.error('Error creating payment:', error);
		return { success: false, error: error.message };
	}
}

// Delete payment
export async function deletePayment(id: string): Promise<{ success: boolean; error?: string }> {
	try {
		// First delete payment_details
		await supabase.from('payment_details').delete().eq('payment_id', id);

		// Then delete payment
		const { error } = await supabase.from('payments').delete().eq('id', id);

		if (error) throw error;

		await fetchPayments();
		return { success: true };
	} catch (error: any) {
		console.error('Error deleting payment:', error);
		return { success: false, error: error.message };
	}
}
