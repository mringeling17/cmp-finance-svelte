export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	public: {
		Tables: {
			agencies: {
				Row: {
					country: string | null;
					created_at: string;
					id: string;
					name: string;
					receives_credit_note: boolean;
				};
				Insert: {
					country?: string | null;
					created_at?: string;
					id?: string;
					name: string;
					receives_credit_note?: boolean;
				};
				Update: {
					country?: string | null;
					created_at?: string;
					id?: string;
					name?: string;
					receives_credit_note?: boolean;
				};
				Relationships: [];
			};
			client_emails: {
				Row: {
					client_id: string | null;
					created_at: string | null;
					email_id: string | null;
					id: string;
				};
				Insert: {
					client_id?: string | null;
					created_at?: string | null;
					email_id?: string | null;
					id?: string;
				};
				Update: {
					client_id?: string | null;
					created_at?: string | null;
					email_id?: string | null;
					id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'client_emails_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'client_emails_email_id_fkey';
						columns: ['email_id'];
						isOneToOne: false;
						referencedRelation: 'emails';
						referencedColumns: ['id'];
					}
				];
			};
			clients: {
				Row: {
					agency_id: string | null;
					country: string | null;
					created_at: string | null;
					id: string;
					name: string;
				};
				Insert: {
					agency_id?: string | null;
					country?: string | null;
					created_at?: string | null;
					id?: string;
					name: string;
				};
				Update: {
					agency_id?: string | null;
					country?: string | null;
					created_at?: string | null;
					id?: string;
					name?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'clients_agency_id_fkey';
						columns: ['agency_id'];
						isOneToOne: false;
						referencedRelation: 'agencies';
						referencedColumns: ['id'];
					}
				];
			};
			countries: {
				Row: {
					code: string;
					currency: string;
					currency_symbol: string;
					id: string;
					name: string;
				};
				Insert: {
					code: string;
					currency: string;
					currency_symbol: string;
					id: string;
					name: string;
				};
				Update: {
					code?: string;
					currency?: string;
					currency_symbol?: string;
					id?: string;
					name?: string;
				};
				Relationships: [];
			};
			emails: {
				Row: {
					created_at: string | null;
					email: string;
					id: string;
				};
				Insert: {
					created_at?: string | null;
					email: string;
					id?: string;
				};
				Update: {
					created_at?: string | null;
					email?: string;
					id?: string;
				};
				Relationships: [];
			};
			files: {
				Row: {
					client_id: string | null;
					email_sent: boolean | null;
					email_sent_at: string | null;
					file_type: string;
					filename: string;
					id: string;
					invoice_number: string | null;
					status: string;
					storage_path: string;
					uploaded_at: string | null;
				};
				Insert: {
					client_id?: string | null;
					email_sent?: boolean | null;
					email_sent_at?: string | null;
					file_type: string;
					filename: string;
					id?: string;
					invoice_number?: string | null;
					status?: string;
					storage_path: string;
					uploaded_at?: string | null;
				};
				Update: {
					client_id?: string | null;
					email_sent?: boolean | null;
					email_sent_at?: string | null;
					file_type?: string;
					filename?: string;
					id?: string;
					invoice_number?: string | null;
					status?: string;
					storage_path?: string;
					uploaded_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'files_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					}
				];
			};
			invoices: {
				Row: {
					agency: string | null;
					channel: string | null;
					client_id: string | null;
					country: string | null;
					created_at: string | null;
					gross_value: number | null;
					id: string;
					internal_number: string | null;
					invoice_date: string | null;
					invoice_number: string;
					net_value: number | null;
					order_reference: string | null;
				};
				Insert: {
					agency?: string | null;
					channel?: string | null;
					client_id?: string | null;
					country?: string | null;
					created_at?: string | null;
					gross_value?: number | null;
					id?: string;
					internal_number?: string | null;
					invoice_date?: string | null;
					invoice_number: string;
					net_value?: number | null;
					order_reference?: string | null;
				};
				Update: {
					agency?: string | null;
					channel?: string | null;
					client_id?: string | null;
					country?: string | null;
					created_at?: string | null;
					gross_value?: number | null;
					id?: string;
					internal_number?: string | null;
					invoice_date?: string | null;
					invoice_number?: string;
					net_value?: number | null;
					order_reference?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'invoices_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					}
				];
			};
			payment_details: {
				Row: {
					amount: number;
					created_at: string;
					id: string;
					invoice_id: string;
					payment_id: string;
				};
				Insert: {
					amount: number;
					created_at?: string;
					id?: string;
					invoice_id: string;
					payment_id: string;
				};
				Update: {
					amount?: number;
					created_at?: string;
					id?: string;
					invoice_id?: string;
					payment_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'payment_details_invoice_id_fkey';
						columns: ['invoice_id'];
						isOneToOne: false;
						referencedRelation: 'invoices';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'payment_details_payment_id_fkey';
						columns: ['payment_id'];
						isOneToOne: false;
						referencedRelation: 'payments';
						referencedColumns: ['id'];
					}
				];
			};
			payments: {
				Row: {
					amount: number;
					country: string;
					created_at: string;
					id: string;
					notes: string | null;
					payment_date: string;
					reference: string;
				};
				Insert: {
					amount: number;
					country?: string;
					created_at?: string;
					id?: string;
					notes?: string | null;
					payment_date: string;
					reference: string;
				};
				Update: {
					amount?: number;
					country?: string;
					created_at?: string;
					id?: string;
					notes?: string | null;
					payment_date?: string;
					reference?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			handle_file_upload: {
				Args: {
					p_filename: string;
					p_file_type: string;
					p_storage_path: string;
					p_client_id?: string;
				};
				Returns: string;
			};
			soft_delete_file: {
				Args: { p_file_id: string };
				Returns: boolean;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] &
				DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;
