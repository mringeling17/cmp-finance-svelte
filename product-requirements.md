# Product Requirements Document (PRD)
## CMP Finance Manager - Svelte Version

---

## 1. Product Overview

### Purpose
CMP Finance Manager is a comprehensive financial management dashboard for handling invoices, payments, collections (cobranzas), client management, and agency relationships. The application supports multi-country operations with automatic currency handling (CLP, ARS, USD).

### Target Users
- Financial administrators
- Account managers
- Collection specialists
- Business analysts

### Business Context
The system manages the complete billing cycle from invoice creation to payment collection, with support for multiple sales channels and agency relationships.

---

## 2. Core Features

### 2.1 Authentication System

**Purpose:** Secure access control via Supabase Auth.

**Features:**
- **Login Page** (`/login`)
  - Email/password authentication
  - Form validation with error messages
  - Toast notifications for success/error states
  - Redirect to dashboard on success

- **Session Management**
  - JWT-based authentication via Supabase
  - Persistent session with auto-refresh
  - Protected routes requiring authentication
  - Logout functionality in header

**User Flow:**
1. User navigates to `/login`
2. Enters email and password
3. Supabase validates credentials
4. On success: redirect to `/dashboard`
5. On failure: show error toast
6. Session persists across browser refresh

**Acceptance Criteria:**
- [ ] User can login with valid Supabase credentials
- [ ] Invalid credentials display error message
- [ ] Session persists after page refresh
- [ ] Logout clears session and redirects to login
- [ ] Protected routes redirect unauthenticated users to login

---

### 2.2 Dashboard General (`/dashboard`)

**Purpose:** Overview of financial metrics and visual analytics.

**Components:**

- **KPI Metric Cards**
  - Total Bruto (gross total)
  - Total Neto (net total)
  - Cantidad de Facturas (invoice count)
  - Clientes Activos (active clients)

- **Charts (Recharts/Chart.js equivalent)**
  - Bar Chart: Ingresos por Cliente (revenue by client)
  - Pie Chart: Distribución por Canal (channel distribution)
  - Bar Chart: Ingresos por Agencia (revenue by agency)
  - Line Chart: Crecimiento Mensual (monthly growth)
  - Bar Chart: Ventas Trimestrales (quarterly sales)

- **Global Filters**
  - Client multi-selector
  - Channel selector
  - Agency multi-selector
  - Date range picker (start/end dates)

**Data Flow:**
1. Component mounts, fetches invoices from Supabase
2. Filters applied via URL params or state
3. Data aggregated for each chart type
4. Charts render with responsive sizing
5. Real-time updates on filter change

**Acceptance Criteria:**
- [ ] KPI cards show accurate totals based on filtered data
- [ ] All charts render correctly with data
- [ ] Filters update all visualizations simultaneously
- [ ] Date range filter works correctly
- [ ] Charts are responsive on mobile/tablet
- [ ] Loading states shown while fetching data

---

### 2.3 Invoice Management (`/facturas`)

**Purpose:** Complete invoice listing with advanced filtering and payment tracking.

**Table Columns:**
- Número de factura (invoice number)
- Fecha (date)
- Cliente (client name)
- Canal (sales channel)
- Monto Neto (net amount)
- Monto Bruto (gross amount)
- Estado de Pago (payment status badge)
- Número Interno (editable internal number)
- Acciones (actions)

**Features:**

- **Advanced Filtering**
  - Multi-select for clients (checkbox list)
  - Multi-select for agencies
  - Single select for channel
  - Date range picker
  - Payment status filter (Pagado/Parcial/Impago)

- **Pagination**
  - 25 records per page
  - Page navigation controls
  - Total count display

- **Payment Status Badges**
  - Green badge: "Pagado" (fully paid)
  - Yellow badge: "Parcial" (partially paid)
  - Red badge: "Impago" (unpaid)

- **Inline Editing**
  - Internal number editable directly in table
  - Auto-save on blur/enter

- **Payment Modal**
  - Register payment against invoice
  - Amount input with validation
  - Reference number field
  - Date picker
  - Updates invoice status automatically

**User Flow (Register Payment):**
1. User clicks payment action on invoice row
2. Modal opens with invoice details
3. User enters payment amount, reference, date
4. Clicks "Registrar Pago"
5. Payment saved to Supabase
6. Invoice status updates
7. Success toast notification
8. Table refreshes

**Acceptance Criteria:**
- [ ] Table displays all invoices with correct data
- [ ] Multi-select filters work correctly
- [ ] Date range filter returns correct results
- [ ] Payment status filter shows correct invoices
- [ ] Pagination navigates correctly
- [ ] Internal number can be edited inline
- [ ] Payment modal validates required fields
- [ ] Payment updates invoice status correctly
- [ ] Currency displays correctly based on country

---

### 2.4 Payment History (`/pagos`)

**Purpose:** View and search all registered payments.

**Table Columns:**
- Referencia (payment reference)
- Monto (amount)
- Fecha (payment date)
- Detalles (linked invoices)

**Features:**
- Search by reference or ID
- Date range filtering
- View payment details modal
- List of associated invoices per payment

**Acceptance Criteria:**
- [ ] All payments display in chronological order
- [ ] Search filters results correctly
- [ ] Date range returns correct payments
- [ ] Payment details show linked invoices
- [ ] Currency formatted correctly

---

### 2.5 Collections View (`/cobranzas`)

**Purpose:** Specialized view for accounts receivable and collection metrics.

**KPI Cards:**
- Total Pagado (total collected)
- Cantidad de Pagos (payment count)
- Promedio de Pago (average payment)

**Charts:**
- Line Chart: Pagos por Mes (payments by month)
- Pie Chart: Distribución por Cliente (distribution by client)
- Bar Chart: Comparativo de Canales (channel comparison)

**Filters:**
- Client selector
- Agency selector
- Date range picker

**Data Source:**
- `payment_details` table joined with `invoices` and `clients`

**Acceptance Criteria:**
- [ ] KPI cards show accurate collection metrics
- [ ] Charts render payment trends correctly
- [ ] Filters update all components
- [ ] Data aggregates correctly by time period
- [ ] Detailed payment breakdown available

---

### 2.6 Client Management (`/clientes`)

**Purpose:** CRUD operations for client entities with email management.

**Table Columns:**
- Nombre (client name)
- Agencia (assigned agency)
- País (country)
- Emails (associated email addresses)
- Acciones (edit, delete, manage emails)

**CRUD Operations:**

- **Create Client (NuevoClienteDialog)**
  - Name input (required)
  - Agency selector (dropdown)
  - Country selector
  - Optional email addresses
  - Validation before save

- **Edit Client (EditarClienteDialog)**
  - Pre-populated form
  - Same fields as create
  - Update agency assignment

- **Delete Client (EliminarClienteDialog)**
  - Confirmation dialog
  - Warning about related data
  - Soft delete or cascade handling

- **Email Management (AgregarCorreosDialog)**
  - Add multiple emails to client
  - Remove existing emails
  - Send files to client emails

**Database Schema:**
```sql
clients (
  id: uuid PRIMARY KEY,
  name: text NOT NULL,
  agency_id: uuid REFERENCES agencies(id),
  country: text,
  created_at: timestamp
)

client_emails (
  id: uuid PRIMARY KEY,
  client_id: uuid REFERENCES clients(id),
  email: text NOT NULL
)
```

**Acceptance Criteria:**
- [ ] Client list displays all clients with correct data
- [ ] Create dialog validates required fields
- [ ] New client appears in table after creation
- [ ] Edit updates client information correctly
- [ ] Delete removes client (with confirmation)
- [ ] Emails can be added/removed per client
- [ ] Agency dropdown shows available agencies
- [ ] Country filter works correctly

---

### 2.7 Agency Management

**Purpose:** Manage agency entities that group clients.

**Features:**
- **AgenciasList**: Table of all agencies
- **NuevaAgenciaDialog**: Create new agency
- **EditarAgenciaDialog**: Edit agency details
- **EliminarAgenciaDialog**: Delete agency
- **AgenciasSelector**: Dropdown component for forms

**Agency Fields:**
- Name (required)
- Country
- Receives Credit Note (boolean flag)

**Database Schema:**
```sql
agencies (
  id: uuid PRIMARY KEY,
  name: text NOT NULL,
  country: text,
  receives_credit_note: boolean DEFAULT false,
  created_at: timestamp
)
```

**Acceptance Criteria:**
- [ ] Agency CRUD operations work correctly
- [ ] Agency appears in client form dropdown
- [ ] "Receives credit note" flag toggles correctly
- [ ] Deleting agency handles client relationships

---

### 2.8 File Management (`/archivos`)

**Purpose:** Upload, organize, and distribute files and certifications.

**Features:**

- **File Upload (FileUploadForm)**
  - Drag and drop support
  - File type selection (Certificación, Documento, etc.)
  - Month/year assignment
  - Upload progress indicator

- **File List (FilesList)**
  - Paginated table (15 per page)
  - Columns: name, type, date, size, actions
  - Sortable by date or name
  - Search by filename

- **Filters**
  - File type selector
  - Date range picker
  - Month selector
  - Sort direction (asc/desc)

- **Actions**
  - Download file
  - Delete file (with confirmation)
  - Send to client emails

- **Certifications (CertificacionesList)**
  - Specialized view for certification documents
  - Grouped by month/year

**Acceptance Criteria:**
- [ ] Files upload successfully to Supabase Storage
- [ ] File list displays with correct metadata
- [ ] Search filters by filename
- [ ] Type filter shows correct files
- [ ] Date range filter works
- [ ] Pagination navigates correctly
- [ ] Download retrieves correct file
- [ ] Delete removes file from storage
- [ ] Send to email functionality works

---

### 2.9 Country/Currency Context

**Purpose:** Global multi-country support with currency handling.

**Features:**
- **CountrySelector**: Dropdown in header
- **Supported Countries**: Chile (CLP), Argentina (ARS), USD
- **Currency Formatting**: Locale-aware number formatting
- **Exchange Rate**: USD rate fetching for conversions
- **Persistence**: Selected country saved to localStorage

**Context Data:**
```typescript
{
  selectedCountry: string,
  setSelectedCountry: (country: string) => void,
  currency: { code: string, symbol: string },
  exchangeRate: number
}
```

**Acceptance Criteria:**
- [ ] Country selector changes global context
- [ ] All data filters by selected country
- [ ] Currency displays with correct symbol
- [ ] Exchange rate fetches successfully
- [ ] Selection persists across sessions

---

## 3. Technical Specifications

### Tech Stack (Svelte Version)
- **Framework:** SvelteKit 2.x
- **Styling:** TailwindCSS 3.x
- **UI Components:** Skeleton UI / shadcn-svelte
- **State Management:** Svelte stores + context
- **Forms:** Superforms + Zod validation
- **Charts:** Chart.js or LayerChart
- **Tables:** TanStack Table (Svelte)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Icons:** Lucide Svelte

### Routes Structure
```
src/routes/
├── +layout.svelte          # Main layout with header/nav
├── +page.svelte            # Home page
├── login/
│   └── +page.svelte        # Login page
├── (protected)/            # Group with auth guard
│   ├── +layout.svelte      # Protected layout
│   ├── dashboard/
│   │   └── +page.svelte
│   ├── facturas/
│   │   └── +page.svelte
│   ├── pagos/
│   │   └── +page.svelte
│   ├── cobranzas/
│   │   └── +page.svelte
│   ├── clientes/
│   │   └── +page.svelte
│   └── archivos/
│       └── +page.svelte
```

### Component Architecture
```
src/lib/
├── components/
│   ├── ui/                 # Base UI components
│   │   ├── Button.svelte
│   │   ├── Card.svelte
│   │   ├── Dialog.svelte
│   │   ├── Table.svelte
│   │   └── ...
│   ├── charts/
│   │   ├── BarChart.svelte
│   │   ├── LineChart.svelte
│   │   └── PieChart.svelte
│   ├── clientes/
│   │   ├── ClientesList.svelte
│   │   ├── NuevoClienteDialog.svelte
│   │   └── ...
│   ├── invoices/
│   │   ├── InvoiceTable.svelte
│   │   ├── PaymentModal.svelte
│   │   └── MultiSelectFilter.svelte
│   └── archivos/
│       ├── FileManager.svelte
│       └── FileUploadForm.svelte
├── stores/
│   ├── auth.ts             # Auth store
│   ├── country.ts          # Country context store
│   └── filters.ts          # Global filter state
├── utils/
│   ├── formatters.ts       # Currency/date formatters
│   └── supabase.ts         # Supabase client
└── types/
    └── index.ts            # TypeScript interfaces
```

### Database Schema

```sql
-- Countries
CREATE TABLE countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  currency_symbol TEXT NOT NULL
);

-- Agencies
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT REFERENCES countries(code),
  receives_credit_note BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clients
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  agency_id UUID REFERENCES agencies(id),
  country TEXT REFERENCES countries(code),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client Emails
CREATE TABLE client_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  internal_number TEXT,
  date DATE NOT NULL,
  client_id UUID REFERENCES clients(id),
  agency_id UUID REFERENCES agencies(id),
  channel TEXT,
  net_amount DECIMAL(12,2) NOT NULL,
  gross_amount DECIMAL(12,2) NOT NULL,
  country TEXT REFERENCES countries(code),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  country TEXT REFERENCES countries(code),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Details (junction table)
CREATE TABLE payment_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id),
  amount DECIMAL(12,2) NOT NULL
);

-- Files
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  path TEXT NOT NULL,
  size INTEGER,
  month INTEGER,
  year INTEGER,
  country TEXT REFERENCES countries(code),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. User Interface

### Layout Structure
- **Header**: Logo, navigation, country selector, theme toggle, user menu
- **Sidebar**: Navigation links (collapsible on mobile)
- **Main Content**: Page-specific content area
- **Footer**: Version info (optional)

### Navigation Menu
- Dashboard
- Facturas
- Pagos
- Cobranzas
- Clientes
- Archivos

### Responsive Breakpoints
- Mobile: < 640px (sidebar as drawer)
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Theme
- Light/Dark mode toggle
- System preference detection
- CSS custom properties for theming

---

## 5. Security Requirements

- HTTPS only in production
- Supabase Row Level Security (RLS) policies
- JWT token validation on protected routes
- Input sanitization (XSS prevention)
- Parameterized queries (SQL injection prevention)
- File upload validation (type, size limits)

---

## 6. Performance Requirements

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse score: > 90
- Table renders: < 100ms for 1000 rows
- Chart animations: 60fps

---

## 7. Testing Requirements

### Unit Tests
- Store mutations and derived values
- Utility functions (formatters)
- Component rendering
- Form validations

### Integration Tests
- Supabase queries
- Authentication flow
- CRUD operations
- Filter combinations

### E2E Tests (Playwright)
- Login/logout flow
- Dashboard filter interactions
- Invoice payment registration
- Client CRUD operations
- File upload/download
- Multi-country switching

---

## 8. API Endpoints (Supabase)

All data access through Supabase client:

```typescript
// Clients
supabase.from('clients').select('*, agencies(*)')
supabase.from('clients').insert({ name, agency_id, country })
supabase.from('clients').update({ name }).eq('id', id)
supabase.from('clients').delete().eq('id', id)

// Invoices
supabase.from('invoices').select('*, clients(*), agencies(*)')
  .eq('country', selectedCountry)
  .gte('date', startDate)
  .lte('date', endDate)

// Payments
supabase.from('payments').select('*, payment_details(*, invoices(*))')
supabase.from('payments').insert({ reference, amount, date, country })

// Files
supabase.storage.from('files').upload(path, file)
supabase.storage.from('files').download(path)
```

---

## 9. Deployment

- **Hosting:** Vercel / Netlify / Cloudflare Pages
- **Database:** Supabase Cloud
- **Storage:** Supabase Storage
- **Environment Variables:**
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`

---

## 10. Success Metrics

- User can complete invoice-to-payment flow in < 30 seconds
- Dashboard loads with all charts in < 2 seconds
- Zero data loss during CRUD operations
- 99.9% uptime availability
