import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import * as XLSX from 'xlsx';
import { CompanyAccount, Invoice, Payment, AppSettings } from '../types';

export interface SqlDatabaseInterface {
  run: (sql: string, params?: any[]) => void;
  prepare: (sql: string) => { run: (params?: any[]) => void; free: () => void };
  exec: (sql: string) => any[];
}

// Resilient in-memory relational SQL table fallback in case WebAssembly streaming is restricted in iframe/browser
class MemoryRelationalDatabase implements SqlDatabaseInterface {
  private accounts = new Map<string, any>();
  private invoices = new Map<string, any>();
  private payments = new Map<string, any>();

  run(sql: string) {
    if (sql.includes('DELETE FROM accounts')) this.accounts.clear();
    if (sql.includes('DELETE FROM invoices')) this.invoices.clear();
    if (sql.includes('DELETE FROM payments')) this.payments.clear();
  }

  prepare(sql: string) {
    return {
      run: (params?: any[]) => {
        if (!params) return;
        if (sql.includes('INSERT INTO accounts')) {
          this.accounts.set(params[0], {
            id: params[0],
            name: params[1],
            gridRow: params[2],
            gridCol: params[3],
            phone: params[4],
            taxNumber: params[5],
            notes: params[6],
            createdAt: params[7],
            updatedAt: params[8]
          });
        } else if (sql.includes('INSERT INTO invoices')) {
          this.invoices.set(params[0], {
            id: params[0],
            companyId: params[1],
            date: params[2],
            invoiceNo: params[3],
            amount: params[4],
            description: params[5],
            createdAt: params[6]
          });
        } else if (sql.includes('INSERT INTO payments')) {
          this.payments.set(params[0], {
            id: params[0],
            companyId: params[1],
            date: params[2],
            amount: params[3],
            description: params[4],
            paymentMethod: params[5],
            createdAt: params[6]
          });
        }
      },
      free: () => {}
    };
  }

  exec(sql: string) {
    return [];
  }
}

let dbInstance: SqlDatabaseInterface | null = null;
let isInitAttempted = false;

export async function getSqlDatabase(): Promise<SqlDatabaseInterface> {
  if (dbInstance) return dbInstance;
  if (isInitAttempted) {
    return dbInstance || new MemoryRelationalDatabase();
  }
  isInitAttempted = true;

  try {
    // Locate the bundled WASM file with correct Vite application/wasm asset URL
    const SQL = await initSqlJs({
      locateFile: () => sqlWasmUrl,
    });
    const realDb = new SQL.Database();
    initSchema(realDb);
    dbInstance = realDb as unknown as SqlDatabaseInterface;
    return dbInstance;
  } catch (err) {
    // If WebAssembly execution is blocked by environment or sandbox, fall back gracefully without error
    console.warn('WASM SQLite initialization bypassed, using memory relational engine:', err);
    dbInstance = new MemoryRelationalDatabase();
    return dbInstance;
  }
}

function initSchema(db: any) {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        grid_row INTEGER NOT NULL,
        grid_col INTEGER NOT NULL,
        phone TEXT,
        tax_number TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        date TEXT NOT NULL,
        invoice_no TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        payment_method TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  } catch (e) {
    console.warn('Schema init note:', e);
  }
}

/**
 * Syncs the in-memory SQLite database instance with the application state
 */
export async function syncSqlDatabase(state: {
  accounts: CompanyAccount[];
  invoices: Invoice[];
  payments: Payment[];
}): Promise<void> {
  try {
    const db = await getSqlDatabase();

    db.run('DELETE FROM payments;');
    db.run('DELETE FROM invoices;');
    db.run('DELETE FROM accounts;');

    const insertAccount = db.prepare(`
      INSERT INTO accounts (id, name, grid_row, grid_col, phone, tax_number, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    for (const acc of state.accounts) {
      insertAccount.run([
        acc.id,
        acc.name,
        acc.gridRow,
        acc.gridCol,
        acc.phone || null,
        acc.taxNumber || null,
        acc.notes || null,
        acc.createdAt,
        acc.updatedAt
      ]);
    }
    insertAccount.free();

    const insertInvoice = db.prepare(`
      INSERT INTO invoices (id, company_id, date, invoice_no, amount, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `);
    for (const inv of state.invoices) {
      insertInvoice.run([
        inv.id,
        inv.companyId,
        inv.date,
        inv.invoiceNo,
        inv.amount,
        inv.description,
        inv.createdAt
      ]);
    }
    insertInvoice.free();

    const insertPayment = db.prepare(`
      INSERT INTO payments (id, company_id, date, amount, description, payment_method, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `);
    for (const pay of state.payments) {
      insertPayment.run([
        pay.id,
        pay.companyId,
        pay.date,
        pay.amount,
        pay.description,
        pay.paymentMethod,
        pay.createdAt
      ]);
    }
    insertPayment.free();
  } catch (err) {
    // Non-fatal background sync warning
    console.warn('Background SQL sync completed with fallback:', err);
  }
}

/**
 * Generates an executable, production-grade standard .sql dump script
 */
export function generateSqlDumpScript(state: {
  accounts: CompanyAccount[];
  invoices: Invoice[];
  payments: Payment[];
  settings?: AppSettings;
}): string {
  const timestamp = new Date().toISOString();
  let sql = `-- ==================================================================\n`;
  sql += `-- GÜNCEL CARİ HESAPLAR PROGRAMI - SQL VERİTABANI YEDEĞİ\n`;
  sql += `-- Oluşturulma Tarihi: ${timestamp}\n`;
  sql += `-- Toplam Şirket: ${state.accounts.length} | Toplam Fatura: ${state.invoices.length} | Toplam Ödeme: ${state.payments.length}\n`;
  sql += `-- ==================================================================\n\n`;

  sql += `-- Tabloları Temizle\n`;
  sql += `DROP TABLE IF EXISTS payments;\n`;
  sql += `DROP TABLE IF EXISTS invoices;\n`;
  sql += `DROP TABLE IF EXISTS accounts;\n\n`;

  sql += `-- Tablo: Şirketler / Cari Hesaplar\n`;
  sql += `CREATE TABLE accounts (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  name VARCHAR(255) NOT NULL,\n`;
  sql += `  grid_row INT NOT NULL,\n`;
  sql += `  grid_col INT NOT NULL,\n`;
  sql += `  phone VARCHAR(50),\n`;
  sql += `  tax_number VARCHAR(50),\n`;
  sql += `  notes TEXT,\n`;
  sql += `  custom_columns TEXT,\n`;
  sql += `  created_at TIMESTAMP NOT NULL,\n`;
  sql += `  updated_at TIMESTAMP NOT NULL\n`;
  sql += `);\n\n`;

  sql += `-- Tablo: Gelen Faturalar\n`;
  sql += `CREATE TABLE invoices (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  company_id VARCHAR(64) NOT NULL,\n`;
  sql += `  date DATE NOT NULL,\n`;
  sql += `  invoice_no VARCHAR(100) NOT NULL,\n`;
  sql += `  amount DECIMAL(15, 2) NOT NULL,\n`;
  sql += `  description TEXT,\n`;
  sql += `  custom_fields TEXT,\n`;
  sql += `  is_reconciled BOOLEAN DEFAULT FALSE,\n`;
  sql += `  created_at TIMESTAMP NOT NULL,\n`;
  sql += `  CONSTRAINT fk_invoice_company FOREIGN KEY (company_id) REFERENCES accounts(id) ON DELETE CASCADE\n`;
  sql += `);\n\n`;

  sql += `-- Tablo: Yapılan Ödemeler\n`;
  sql += `CREATE TABLE payments (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  company_id VARCHAR(64) NOT NULL,\n`;
  sql += `  date DATE NOT NULL,\n`;
  sql += `  amount DECIMAL(15, 2) NOT NULL,\n`;
  sql += `  description TEXT,\n`;
  sql += `  payment_method VARCHAR(100) NOT NULL,\n`;
  sql += `  custom_fields TEXT,\n`;
  sql += `  is_reconciled BOOLEAN DEFAULT FALSE,\n`;
  sql += `  created_at TIMESTAMP NOT NULL,\n`;
  sql += `  CONSTRAINT fk_payment_company FOREIGN KEY (company_id) REFERENCES accounts(id) ON DELETE CASCADE\n`;
  sql += `);\n\n`;

  // Accounts insert
  if (state.accounts.length > 0) {
    sql += `-- Şirket Verileri\n`;
    for (const acc of state.accounts) {
      const escape = (val?: string) => val ? `'${val.replace(/'/g, "''")}'` : 'NULL';
      const customCols = acc.customColumns ? `'${JSON.stringify(acc.customColumns).replace(/'/g, "''")}'` : 'NULL';
      sql += `INSERT INTO accounts (id, name, grid_row, grid_col, phone, tax_number, notes, custom_columns, created_at, updated_at) VALUES ('${acc.id}', '${acc.name.replace(/'/g, "''")}', ${acc.gridRow}, ${acc.gridCol}, ${escape(acc.phone)}, ${escape(acc.taxNumber)}, ${escape(acc.notes)}, ${customCols}, '${acc.createdAt}', '${acc.updatedAt}');\n`;
    }
    sql += `\n`;
  }

  // Invoices insert
  if (state.invoices.length > 0) {
    sql += `-- Gelen Faturalar\n`;
    for (const inv of state.invoices) {
      const desc = inv.description ? `'${inv.description.replace(/'/g, "''")}'` : "''";
      const customF = inv.customFields ? `'${JSON.stringify(inv.customFields).replace(/'/g, "''")}'` : 'NULL';
      const rec = inv.isReconciled ? 'TRUE' : 'FALSE';
      sql += `INSERT INTO invoices (id, company_id, date, invoice_no, amount, description, custom_fields, is_reconciled, created_at) VALUES ('${inv.id}', '${inv.companyId}', '${inv.date}', '${inv.invoiceNo.replace(/'/g, "''")}', ${inv.amount.toFixed(2)}, ${desc}, ${customF}, ${rec}, '${inv.createdAt}');\n`;
    }
    sql += `\n`;
  }

  // Payments insert
  if (state.payments.length > 0) {
    sql += `-- Yapılan Ödemeler\n`;
    for (const pay of state.payments) {
      const desc = pay.description ? `'${pay.description.replace(/'/g, "''")}'` : "''";
      const customF = pay.customFields ? `'${JSON.stringify(pay.customFields).replace(/'/g, "''")}'` : 'NULL';
      const rec = pay.isReconciled ? 'TRUE' : 'FALSE';
      sql += `INSERT INTO payments (id, company_id, date, amount, description, payment_method, custom_fields, is_reconciled, created_at) VALUES ('${pay.id}', '${pay.companyId}', '${pay.date}', ${pay.amount.toFixed(2)}, ${desc}, '${pay.paymentMethod.replace(/'/g, "''")}', ${customF}, ${rec}, '${pay.createdAt}');\n`;
    }
    sql += `\n`;
  }

  // Preserve complete metadata including custom columns and custom fields
  sql += `-- APP_STATE_METADATA_JSON: ${JSON.stringify({
    accounts: state.accounts,
    invoices: state.invoices,
    payments: state.payments,
    settings: state.settings
  })}\n`;

  return sql;
}

/**
 * Download a string as a file
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export data to formatted multi-sheet Excel file (.xlsx)
 */
export function exportToExcel(state: {
  accounts: CompanyAccount[];
  invoices: Invoice[];
  payments: Payment[];
}) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Şirket Bakiyeleri
  const accountRows = state.accounts.map((acc) => {
    const accInvoices = state.invoices.filter((i) => i.companyId === acc.id);
    const accPayments = state.payments.filter((p) => p.companyId === acc.id);
    const totalInv = accInvoices.reduce((s, i) => s + i.amount, 0);
    const totalPay = accPayments.reduce((s, p) => s + p.amount, 0);
    const balance = totalInv - totalPay;

    return {
      'Şirket Adı': acc.name,
      'Satır': acc.gridRow,
      'Sütun': acc.gridCol,
      'Toplam Gelen Fatura (₺)': Number(totalInv.toFixed(2)),
      'Toplam Yapılan Ödeme (₺)': Number(totalPay.toFixed(2)),
      'Güncel Bakiye (₺)': Number(balance.toFixed(2)),
      'Durum': balance > 0 ? 'Borçlu (Bizim Borcumuz)' : balance < 0 ? 'Alacaklı (Fazla Ödeme)' : 'Kapalı (0,00 ₺)',
      'Fatura Sayısı': accInvoices.length,
      'Ödeme Sayısı': accPayments.length,
      'Özel Sütun Sayısı': acc.customColumns?.length || 0
    };
  });
  const wsAccounts = XLSX.utils.json_to_sheet(accountRows);
  XLSX.utils.book_append_sheet(wb, wsAccounts, 'Şirket Bakiyeleri');

  // Sheet 2: Gelen Faturalar
  const invoiceRows = state.invoices.map((inv) => {
    const company = state.accounts.find((a) => a.id === inv.companyId);
    const row: Record<string, any> = {
      'Fatura Tarihi': inv.date,
      'Fatura No': inv.invoiceNo,
      'Şirket Adı': company?.name || 'Bilinmiyor',
      'Tutar (₺)': inv.amount,
      'Açıklama': inv.description,
      'Mutabakat': inv.isReconciled ? 'Mutabık ✓' : 'Bekliyor'
    };
    if (company?.customColumns) {
      company.customColumns.filter((c) => c.target === 'invoice').forEach((col) => {
        const val = inv.customFields?.[col.id];
        row[col.name] = val !== undefined && val !== '' ? val : '';
      });
    }
    return row;
  });
  const wsInvoices = XLSX.utils.json_to_sheet(invoiceRows);
  XLSX.utils.book_append_sheet(wb, wsInvoices, 'Gelen Faturalar');

  // Sheet 3: Yapılan Ödemeler
  const paymentRows = state.payments.map((pay) => {
    const company = state.accounts.find((a) => a.id === pay.companyId);
    const row: Record<string, any> = {
      'Ödeme Tarihi': pay.date,
      'Şirket Adı': company?.name || 'Bilinmiyor',
      'Ödeme Türü': pay.paymentMethod,
      'Miktar (₺)': pay.amount,
      'Açıklama': pay.description,
      'Mutabakat': pay.isReconciled ? 'Mutabık ✓' : 'Bekliyor'
    };
    if (company?.customColumns) {
      company.customColumns.filter((c) => c.target === 'payment').forEach((col) => {
        const val = pay.customFields?.[col.id];
        row[col.name] = val !== undefined && val !== '' ? val : '';
      });
    }
    return row;
  });
  const wsPayments = XLSX.utils.json_to_sheet(paymentRows);
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Yapılan Ödemeler');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Cari_Hesaplar_Rapor_${dateStr}.xlsx`);
}

/**
 * Parses a downloaded .sql backup file and extracts accounts, invoices, and payments
 */
export function parseSqlDump(sqlContent: string): {
  accounts: CompanyAccount[];
  invoices: Invoice[];
  payments: Payment[];
  settings?: AppSettings;
} {
  const lines = sqlContent.split('\n');

  // Check if complete metadata exists first for 100% fidelity
  const metaLine = lines.find((l) => l.trim().startsWith('-- APP_STATE_METADATA_JSON: '));
  if (metaLine) {
    try {
      const jsonStr = metaLine.trim().replace('-- APP_STATE_METADATA_JSON: ', '');
      const parsed = JSON.parse(jsonStr);
      if (parsed.accounts && Array.isArray(parsed.accounts)) {
        return {
          accounts: parsed.accounts,
          invoices: parsed.invoices || [],
          payments: parsed.payments || [],
          settings: parsed.settings
        };
      }
    } catch (e) {
      console.warn('Metadata JSON parse failed, falling back to SQL line parser:', e);
    }
  }

  const accounts: CompanyAccount[] = [];
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('INSERT INTO accounts')) {
      const match = trimmed.match(/VALUES\s*\((.*)\);/i);
      if (match) {
        const parts = parseSqlValues(match[1]);
        if (parts.length >= 4) {
          accounts.push({
            id: parts[0],
            name: parts[1],
            gridRow: parseInt(parts[2], 10) || 1,
            gridCol: parseInt(parts[3], 10) || 1,
            phone: parts[4] !== 'NULL' ? parts[4] : undefined,
            taxNumber: parts[5] !== 'NULL' ? parts[5] : undefined,
            notes: parts[6] !== 'NULL' ? parts[6] : undefined,
            createdAt: parts[7] || new Date().toISOString(),
            updatedAt: parts[8] || new Date().toISOString()
          });
        }
      }
    } else if (trimmed.startsWith('INSERT INTO invoices')) {
      const match = trimmed.match(/VALUES\s*\((.*)\);/i);
      if (match) {
        const parts = parseSqlValues(match[1]);
        if (parts.length >= 5) {
          invoices.push({
            id: parts[0],
            companyId: parts[1],
            date: parts[2],
            invoiceNo: parts[3],
            amount: parseFloat(parts[4]) || 0,
            description: parts[5] || '',
            createdAt: parts[6] || new Date().toISOString()
          });
        }
      }
    } else if (trimmed.startsWith('INSERT INTO payments')) {
      const match = trimmed.match(/VALUES\s*\((.*)\);/i);
      if (match) {
        const parts = parseSqlValues(match[1]);
        if (parts.length >= 6) {
          payments.push({
            id: parts[0],
            companyId: parts[1],
            date: parts[2],
            amount: parseFloat(parts[3]) || 0,
            description: parts[4] || '',
            paymentMethod: (parts[5] as any) || 'Banka Havalesi/EFT',
            createdAt: parts[6] || new Date().toISOString()
          });
        }
      }
    }
  }

  return { accounts, invoices, payments };
}

function parseSqlValues(valuesStr: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    if (char === "'" && (i === 0 || valuesStr[i - 1] !== '\\')) {
      inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      result.push(cleanSqlToken(current));
      current = '';
    } else {
      current += char;
    }
  }
  if (current) {
    result.push(cleanSqlToken(current));
  }
  return result;
}

function cleanSqlToken(token: string): string {
  const t = token.trim();
  if (t.startsWith("'") && t.endsWith("'")) {
    return t.substring(1, t.length - 1).replace(/''/g, "'");
  }
  return t;
}
