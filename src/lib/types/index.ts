export interface Cliente {
	id: string;
	name: string;
	agency_id?: string | null;
	created_at?: string;
	country?: string;
}

export interface Email {
	id: string;
	email: string;
	created_at?: string;
}

export interface ClienteEmail {
	id: string;
	client_id: string;
	email_id: string;
	created_at?: string;
}

export interface Agency {
	id: string;
	name: string;
	receives_credit_note: boolean;
	created_at?: string;
	country?: string;
}

export interface Country {
	id: string;
	name: string;
	code: string;
	currency: string;
	currency_symbol: string;
}

export interface Invoice {
	id: string;
	invoice_number: string;
	internal_number?: string | null;
	client_id?: string | null;
	agency?: string | null;
	channel?: string | null;
	country?: string | null;
	invoice_date?: string | null;
	gross_value?: number | null;
	net_value?: number | null;
	order_reference?: string | null;
	created_at?: string | null;
}

export interface Payment {
	id: string;
	reference: string;
	amount: number;
	payment_date: string;
	country: string;
	notes?: string | null;
	created_at: string;
}

export interface PaymentDetail {
	id: string;
	payment_id: string;
	invoice_id: string;
	amount: number;
	created_at: string;
}

export interface FileRecord {
	id: string;
	filename: string;
	file_type: string;
	storage_path: string;
	status: string;
	client_id?: string | null;
	invoice_number?: string | null;
	email_sent?: boolean | null;
	email_sent_at?: string | null;
	uploaded_at?: string | null;
}

// Re-export database types
export * from './database';
