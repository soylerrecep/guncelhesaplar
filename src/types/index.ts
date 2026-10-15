export type PaymentMethod = 
  | 'Banka Havalesi/EFT'
  | 'Nakit'
  | 'Çek'
  | 'Senet'
  | 'Kredi Kartı'
  | 'Diğer';

export type CustomColumnType = 'text' | 'number' | 'date';

export interface CustomColumn {
  id: string; // e.g. 'col_1712345678'
  name: string; // Display title: e.g. 'İrsaliye No', 'Vade Tarihi', 'Plaka', 'Miktar'
  type: CustomColumnType; // 'text' | 'number' | 'date'
  target: 'invoice' | 'payment'; // Which section it belongs to
  placeholder?: string;
}

export interface CompanyAccount {
  id: string;
  name: string;
  gridRow: number; // 1, 2, 3, ... (limitless downward rows)
  gridCol: number; // 1 to 11
  phone?: string;
  taxNumber?: string;
  taxOffice?: string;
  address?: string;
  notes?: string;
  customColumns?: CustomColumn[]; // Per-company custom columns!
  invoiceColumnOrder?: string[]; // Custom order of invoice columns
  paymentColumnOrder?: string[]; // Custom order of payment columns
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  date: string; // YYYY-MM-DD
  invoiceNo: string;
  amount: number;
  description: string;
  customFields?: Record<string, any>; // custom column id -> value
  isReconciled?: boolean; // Mutabakat onay / karşılaştırma tiki
  createdAt: string;
}

export interface Payment {
  id: string;
  companyId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
  customFields?: Record<string, any>; // custom column id -> value
  isReconciled?: boolean; // Mutabakat onay / karşılaştırma tiki
  createdAt: string;
}

export interface CompanySummary {
  company: CompanyAccount;
  totalInvoices: number;
  totalPayments: number;
  balance: number; // Invoices - Payments
  status: 'debt' | 'credit' | 'zero'; // debt: > 0, credit: < 0, zero: == 0
}

export interface AppSettings {
  mainCompanyName: string;
  mainCompanyTaxNo?: string;
  fiscalYear: number; // e.g. 2026 or 0 for All Years
  currency: string;
  companyDetailTheme: 'fresh' | 'dark';
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  label: string;
  accountCount: number;
  invoiceCount: number;
  paymentCount: number;
  totalDebt: number;
  data: {
    accounts: CompanyAccount[];
    invoices: Invoice[];
    payments: Payment[];
    settings?: AppSettings;
  };
}

export interface DatabaseState {
  accounts: CompanyAccount[];
  invoices: Invoice[];
  payments: Payment[];
  snapshots: BackupSnapshot[];
  settings: AppSettings;
  lastBackupDate?: string;
}
