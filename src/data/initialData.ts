import { CompanyAccount, Invoice, Payment, AppSettings } from '../types';

export const defaultSettings: AppSettings = {
  mainCompanyName: 'ŞİRKETİM TİC. LTD. ŞTİ.',
  mainCompanyTaxNo: '',
  fiscalYear: 2026,
  currency: '₺',
  companyDetailTheme: 'fresh'
};

// Returns completely clean empty dataset as requested by the user
export function generateInitialDataset(): {
  accounts: CompanyAccount[];
  invoices: Invoice[];
  payments: Payment[];
  settings: AppSettings;
} {
  return {
    accounts: [],
    invoices: [],
    payments: [],
    settings: defaultSettings
  };
}

// Optional demo dataset if user ever wants to inspect sample entries
export function getDemoDataset(): {
  accounts: CompanyAccount[];
  invoices: Invoice[];
  payments: Payment[];
} {
  const seedItems = [
    { name: 'ALFA TEKNİK', row: 1, col: 1, inv: 15240, pay: 15240.32 },
    { name: 'TİPOR', row: 1, col: 3, inv: 42000, pay: 42000 },
    { name: 'ERDEM', row: 1, col: 4, inv: 215496.32, pay: 50000 },
    { name: 'TEMEL', row: 1, col: 5, inv: 152549.14, pay: 500000 },
    { name: 'PERMOLİT', row: 1, col: 6, inv: 37400.20, pay: 30000 },
    { name: 'NASİP TİCARET', row: 1, col: 8, inv: 60000, pay: 60000 },
    { name: 'İKİER', row: 1, col: 9, inv: 143770.07, pay: 50000 },
    { name: 'ÜSTÜN', row: 1, col: 10, inv: 242640.40, pay: 1000000 },
    { name: 'ÖZKİREMİT', row: 1, col: 11, inv: 277340, pay: 100000 },
    { name: 'ES-ER BİMS', row: 2, col: 1, inv: 176945.60, pay: 50000 },
    { name: 'GÖNDER KUM', row: 2, col: 2, inv: 242464.88, pay: 100000 },
    { name: 'PENTA BARTIN', row: 2, col: 11, inv: 718655.04, pay: 200000 },
    { name: 'ÖZEN', row: 3, col: 1, inv: 363878.39, pay: 100000 },
    { name: 'ALTUĞ', row: 3, col: 2, inv: 87872, pay: 100000 },
    { name: 'ENGİN GRUP', row: 3, col: 4, inv: 154571.54, pay: 100000 },
    { name: 'BTC', row: 4, col: 5, inv: 392121.97, pay: 100000 }
  ];

  const accounts: CompanyAccount[] = [];
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const now = new Date().toISOString();

  seedItems.forEach((item, idx) => {
    const id = `demo-${idx + 1}`;
    accounts.push({
      id,
      name: item.name,
      gridRow: item.row,
      gridCol: item.col,
      createdAt: now,
      updatedAt: now
    });
    invoices.push({
      id: `inv-${id}`,
      companyId: id,
      date: '2026-09-15',
      invoiceNo: `FTR-2026-${100 + idx}`,
      amount: item.inv,
      description: 'Demo Fatura Girişi',
      createdAt: now
    });
    payments.push({
      id: `pay-${id}`,
      companyId: id,
      date: '2026-09-25',
      amount: item.pay,
      description: 'Demo Banka Ödemesi',
      paymentMethod: 'Banka Havalesi/EFT',
      createdAt: now
    });
  });

  return { accounts, invoices, payments };
}
