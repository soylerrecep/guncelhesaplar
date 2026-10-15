import { DatabaseState, CompanyAccount, Invoice, Payment, BackupSnapshot, AppSettings } from '../types';
import { generateInitialDataset, defaultSettings } from '../data/initialData';
import { syncSqlDatabase } from './sqlService';

const DB_KEY = 'cari_hesaplar_db_v2';
const SNAPSHOTS_KEY = 'cari_hesaplar_snapshots_v2';
const MAX_SNAPSHOTS = 10;

export function loadDatabaseState(): DatabaseState {
  try {
    const raw = localStorage.getItem(DB_KEY);
    const rawSnapshots = localStorage.getItem(SNAPSHOTS_KEY);
    const snapshots: BackupSnapshot[] = rawSnapshots ? JSON.parse(rawSnapshots) : [];

    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.accounts && Array.isArray(parsed.accounts)) {
        return {
          accounts: parsed.accounts,
          invoices: parsed.invoices || [],
          payments: parsed.payments || [],
          settings: parsed.settings || defaultSettings,
          snapshots,
          lastBackupDate: parsed.lastBackupDate
        };
      }
    }
  } catch (err) {
    console.error('Failed to load state from localStorage:', err);
  }

  // Generate clean initial data with 0 records
  const initial = generateInitialDataset();
  const initialState: DatabaseState = {
    accounts: initial.accounts,
    invoices: initial.invoices,
    payments: initial.payments,
    settings: initial.settings,
    snapshots: [],
    lastBackupDate: new Date().toISOString()
  };

  saveDatabaseState(initialState, 'Sistem Başlatıldı (Boş Veritabanı)');
  return initialState;
}

export function saveDatabaseState(state: DatabaseState, snapshotLabel?: string): void {
  try {
    const toSave = {
      accounts: state.accounts,
      invoices: state.invoices,
      payments: state.payments,
      settings: state.settings,
      lastBackupDate: new Date().toISOString()
    };
    localStorage.setItem(DB_KEY, JSON.stringify(toSave));

    if (snapshotLabel) {
      createAutoSnapshot(state, snapshotLabel);
    }

    // Background sync to SQLite database
    syncSqlDatabase({
      accounts: state.accounts,
      invoices: state.invoices,
      payments: state.payments
    }).catch((e) => console.warn('SQLite sync warning:', e));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function createAutoSnapshot(state: DatabaseState, label: string): BackupSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    const existing: BackupSnapshot[] = raw ? JSON.parse(raw) : [];

    // Calculate total positive debt
    let totalPositiveDebt = 0;
    for (const acc of state.accounts) {
      const invs = state.invoices.filter((i) => i.companyId === acc.id);
      const pays = state.payments.filter((p) => p.companyId === acc.id);
      const bal = invs.reduce((s, i) => s + i.amount, 0) - pays.reduce((s, p) => s + p.amount, 0);
      if (bal > 0) totalPositiveDebt += bal;
    }

    const newSnapshot: BackupSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      label,
      accountCount: state.accounts.length,
      invoiceCount: state.invoices.length,
      paymentCount: state.payments.length,
      totalDebt: totalPositiveDebt,
      data: {
        accounts: state.accounts,
        invoices: state.invoices,
        payments: state.payments,
        settings: state.settings
      }
    };

    const updated = [newSnapshot, ...existing].slice(0, MAX_SNAPSHOTS);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to create snapshot:', err);
    return state.snapshots || [];
  }
}

export function getSnapshots(): BackupSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Format a number as Turkish Lira / Currency string (e.g., "2.276.070,14 ₺")
 */
export function formatCurrencyTRY(value: number, currency: string = '₺'): string {
  const isNegative = value < -0.001;
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return isNegative ? `-${formatted} ${currency}` : `${formatted} ${currency}`;
}

/**
 * Turkish date format (DD.MM.YYYY)
 */
export function formatDateTR(dateString: string): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    const d = new Date(dateString);
    return d.toLocaleDateString('tr-TR');
  } catch {
    return dateString;
  }
}
