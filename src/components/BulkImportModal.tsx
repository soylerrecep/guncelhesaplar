import React, { useState, useMemo } from 'react';
import { CompanyAccount, Invoice, Payment, AppSettings, CustomColumn, PaymentMethod } from '../types';
import { formatCurrencyTRY, formatDateTR } from '../services/storageService';
import {
  FileSpreadsheet,
  X,
  Check,
  AlertTriangle,
  ClipboardPaste,
  Trash2,
  TrendingUp,
  TrendingDown,
  Info,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyAccount;
  settings: AppSettings;
  initialType?: 'invoice' | 'payment';
  onAddInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  onAddInvoices?: (invoices: Array<Omit<Invoice, 'id' | 'createdAt'>>) => void;
  onAddPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => void;
  onAddPayments?: (payments: Array<Omit<Payment, 'id' | 'createdAt'>>) => void;
  onSuccess: (message: string) => void;
}

interface ParsedRow {
  id: string;
  originalText: string;
  date: string;
  amount: number;
  docNoOrMethod: string;
  description: string;
  customFields?: Record<string, any>;
  isReconciled: boolean;
  isValid: boolean;
  error?: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  company,
  settings,
  initialType = 'invoice',
  onAddInvoice,
  onAddInvoices,
  onAddPayment,
  onAddPayments,
  onSuccess
}) => {
  const currency = settings.currency || '₺';
  const fiscalYear = settings.fiscalYear || new Date().getFullYear();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [importType, setImportType] = useState<'invoice' | 'payment'>(initialType);
  const [rawText, setRawText] = useState<string>('');
  const [allReconciled, setAllReconciled] = useState<boolean>(true);
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]);

  // Column Mapping indices (0-based)
  // Default matches Asıl Sıra: 0: Tarih, 1: Tutar, 2: Fatura No / Tür, 3: Açıklama
  const [colMapping, setColMapping] = useState<{
    dateCol: number;
    amountCol: number;
    docCol: number;
    descCol: number;
  }>({
    dateCol: 0,
    amountCol: 1,
    docCol: 2,
    descCol: 3
  });

  // Helper to parse Turkish numbers: "15.450,50" -> 15450.5, "-1500,00" -> -1500, "(1500)" -> -1500
  const parseTurkishNumber = (val: string | undefined): number | null => {
    if (val === undefined || val === null) return null;
    let clean = val
      .toString()
      .replace(/[₺$€TLtl\s"']/g, '')
      .trim();

    if (!clean) return null;

    let isNegative = false;
    if (clean.startsWith('-') || (clean.startsWith('(') && clean.endsWith(')'))) {
      isNegative = true;
      clean = clean.replace(/[()\-]/g, '');
    }

    // Both dots and commas present
    if (clean.includes('.') && clean.includes(',')) {
      if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
        // Turkish: 15.000,50 -> 15000.50
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
        // English: 15,000.50 -> 15000.50
        clean = clean.replace(/,/g, '');
      }
    } else if (clean.includes(',')) {
      // 15000,50 -> 15000.50
      clean = clean.replace(',', '.');
    }

    const num = parseFloat(clean);
    if (isNaN(num)) return null;
    return isNegative ? -num : num;
  };

  // Helper to parse Turkish dates: "15.03.2025", "15/03/2025", "2025-03-15", "1503"
  const parseTurkishDate = (val: string | undefined): string => {
    if (!val) return todayStr;
    const clean = val.toString().replace(/["']/g, '').trim();

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }

    // DD.MM.YYYY or DD/MM/YYYY
    const parts = clean.split(/[./-]/);
    if (parts.length === 3) {
      let d = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);

      // If YYYY.MM.DD
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        d = parseInt(parts[2], 10);
      } else if (parts[2].length === 2) {
        y = 2000 + y;
      }

      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1990 && y <= 2099) {
        const dd = d.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        return `${y}-${mm}-${dd}`;
      }
    }

    // 4 digits: e.g. "1503" -> DD=15, MM=03, YYYY=fiscalYear
    if (/^\d{4}$/.test(clean)) {
      const d = clean.slice(0, 2);
      const m = clean.slice(2, 4);
      return `${fiscalYear}-${m}-${d}`;
    }

    return todayStr;
  };

  // Parse raw text into structured rows
  const parsedRows: ParsedRow[] = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const results: ParsedRow[] = [];

    lines.forEach((line, index) => {
      // Determine delimiter: tab, semicolon, comma, pipe
      let cols: string[] = [];
      if (line.includes('\t')) {
        cols = line.split('\t');
      } else if (line.includes(';')) {
        cols = line.split(';');
      } else if (line.includes('|')) {
        cols = line.split('|').filter(Boolean);
      } else {
        // Space separated (2 or more spaces)
        cols = line.split(/\s{2,}/);
        if (cols.length === 1 && line.includes(',')) {
          cols = line.split(',');
        }
      }

      // Clean surrounding quotes and spaces from cells
      cols = cols.map((c) => c.replace(/^["']|["']$/g, '').trim());

      // Check if this looks like a header row (e.g. Tarih, Tutar, Fatura No)
      const lineLower = line.toLowerCase();
      const isHeader =
        (lineLower.includes('tarih') || lineLower.includes('date')) &&
        (lineLower.includes('tutar') || lineLower.includes('miktar') || lineLower.includes('amount'));

      if (isHeader) {
        return; // Skip table header
      }

      const dateRaw = cols[colMapping.dateCol];
      const amountRaw = cols[colMapping.amountCol];
      const docRaw = cols[colMapping.docCol] || '';
      const descRaw = cols[colMapping.descCol] || '';

      const parsedDate = parseTurkishDate(dateRaw);
      const parsedAmount = parseTurkishNumber(amountRaw);

      let isValid = true;
      let error = '';

      if (parsedAmount === null) {
        isValid = false;
        error = 'Geçersiz tutar';
      }

      const defaultDocNo =
        importType === 'invoice'
          ? docRaw || `FTR-${index + 1}`
          : docRaw || 'Banka Havalesi/EFT';

      const rowId = `row-${index}`;
      if (deletedRowIds.includes(rowId)) {
        return; // User deleted this row from preview
      }

      results.push({
        id: rowId,
        originalText: line,
        date: parsedDate,
        amount: parsedAmount !== null ? parsedAmount : 0,
        docNoOrMethod: defaultDocNo,
        description: descRaw,
        isReconciled: allReconciled,
        isValid,
        error
      });
    });

    // Sort chronologically: eskiden yeniye doğru (oldest to newest)
    results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return results;
  }, [rawText, colMapping, importType, allReconciled, fiscalYear, todayStr, deletedRowIds]);

  const validRows = useMemo(() => parsedRows.filter((r) => r.isValid), [parsedRows]);
  const totalImportAmount = useMemo(
    () => validRows.reduce((sum, r) => sum + r.amount, 0),
    [validRows]
  );

  if (!isOpen) return null;

  // Handle direct paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText((prev) => (prev ? prev + '\n' + text : text));
        setDeletedRowIds([]);
      }
    } catch {
      // Fallback
    }
  };

  // Sample data loader for demonstration
  const handleLoadSample = () => {
    if (importType === 'invoice') {
      const sample = `15.01.${fiscalYear}\t12500,00\tFTR-2025-001\tOcak ayı hammadde alımı\n22.01.${fiscalYear}\t8450,50\tFTR-2025-002\tKoli ve ambalaj malzemesi\n05.02.${fiscalYear}\t19300,00\tFTR-2025-003\tŞubat sevkiyatı faturası\n18.02.${fiscalYear}\t6200,00\tFTR-2025-004\tEkstra parça temini`;
      setRawText(sample);
    } else {
      const sample = `18.01.${fiscalYear}\t10000,00\tBanka Havalesi/EFT\tGaranti Bankası cari ödeme\n25.01.${fiscalYear}\t5000,00\tNakit\tElden yapılan ara ödeme\n10.02.${fiscalYear}\t15000,00\tBanka Havalesi/EFT\tİş Bankası EFT ile ödeme`;
      setRawText(sample);
    }
    setDeletedRowIds([]);
  };

  // Save all valid parsed rows in one batch operation!
  const handleExecuteImport = () => {
    if (validRows.length === 0) return;

    if (importType === 'invoice') {
      const invoicesToAdd: Array<Omit<Invoice, 'id' | 'createdAt'>> = validRows.map((row) => ({
        companyId: company.id,
        date: row.date,
        invoiceNo: (row.docNoOrMethod || 'FATURA').trim().toUpperCase(),
        amount: row.amount,
        description: row.description.trim(),
        isReconciled: row.isReconciled
      }));

      if (onAddInvoices) {
        onAddInvoices(invoicesToAdd);
      } else {
        // Fallback
        invoicesToAdd.forEach((inv) => onAddInvoice(inv));
      }

      onSuccess(
        `✓ ${company.name} firmasına ${validRows.length} adet geçmiş fatura (${formatCurrencyTRY(totalImportAmount, currency)}) başarıyla aktarıldı.`
      );
    } else {
      const paymentsToAdd: Array<Omit<Payment, 'id' | 'createdAt'>> = validRows.map((row) => {
        // Map to standard PaymentMethod
        let method: PaymentMethod = 'Banka Havalesi/EFT';
        const docLower = row.docNoOrMethod.toLowerCase();
        if (docLower.includes('nakit')) method = 'Nakit';
        else if (docLower.includes('çek')) method = 'Çek';
        else if (docLower.includes('senet')) method = 'Senet';
        else if (docLower.includes('kart')) method = 'Kredi Kartı';
        else if (docLower.includes('havale') || docLower.includes('eft')) method = 'Banka Havalesi/EFT';
        else method = 'Diğer';

        return {
          companyId: company.id,
          date: row.date,
          amount: row.amount,
          paymentMethod: method,
          description: row.description.trim() || row.docNoOrMethod,
          isReconciled: row.isReconciled
        };
      });

      if (onAddPayments) {
        onAddPayments(paymentsToAdd);
      } else {
        // Fallback
        paymentsToAdd.forEach((p) => onAddPayment(p));
      }

      onSuccess(
        `✓ ${company.name} firmasına ${validRows.length} adet geçmiş ödeme (${formatCurrencyTRY(totalImportAmount, currency)}) başarıyla aktarıldı.`
      );
    }

    onClose();
  };

  const handleDeleteRow = (id: string) => {
    setDeletedRowIds((prev) => [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#1b2028] border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Excel'den Toplu Hareket Yükle</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  Toplu Aktarım
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                <strong className="text-slate-200">{company.name}</strong> için geçmişe dönük tüm satırları tek seferde sisteme aktarın.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {/* Target Type Selector */}
          <div className="flex items-center justify-between gap-3 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 flex-1">
              <button
                type="button"
                onClick={() => setImportType('invoice')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  importType === 'invoice'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Gelen Faturalar Olarak Aktar (Borç)</span>
              </button>

              <button
                type="button"
                onClick={() => setImportType('payment')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  importType === 'payment'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Yapılan Ödemeler Olarak Aktar (Alacak)</span>
              </button>
            </div>
          </div>

          {/* Quick Help & Presets */}
          <div className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Excel tablonuzdaki satırları kopyalayın (<kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono font-bold text-sky-300">Ctrl+C</kbd>) ve alana yapıştırın (<kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono font-bold text-sky-300">Ctrl+V</kbd>).
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-[11px] flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              >
                <ClipboardPaste className="w-3 h-3" />
                <span>Panodan Yapıştır</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-[11px] border border-slate-700 transition-colors cursor-pointer"
              >
                Örnek Yükle
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <label>Kopyalanan Veri Alanı (Excel / Tablo Metni):</label>
              {rawText && (
                <button
                  type="button"
                  onClick={() => {
                    setRawText('');
                    setDeletedRowIds([]);
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Temizle</span>
                </button>
              )}
            </div>
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setDeletedRowIds([]);
              }}
              placeholder={`Örnek satırlar:\n15.01.${fiscalYear}\t12500,00\tFTR-001\tOcak ayı sevkiyatı\n20.01.${fiscalYear}\t8400,50\tFTR-002\tEkstra malzeme alımı`}
              rows={5}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono placeholder-slate-500 focus:border-sky-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Column Mapping Selector (Asıl sıra default: Tarih - Tutar - Fatura No / Tür - Açıklama) */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Sütun Sıralaması Eşleme (Excel'deki sütun sıranız):</span>
              <span className="text-[10px] text-sky-400 font-normal">
                Asıl Düzen: 1.Tarih → 2.Tutar → 3.Evrak/Tür → 4.Açıklama
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Tarih Sütunu</label>
                <select
                  value={colMapping.dateCol}
                  onChange={(e) =>
                    setColMapping((prev) => ({ ...prev, dateCol: parseInt(e.target.value, 10) }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                >
                  <option value={0}>1. Sütun</option>
                  <option value={1}>2. Sütun</option>
                  <option value={2}>3. Sütun</option>
                  <option value={3}>4. Sütun</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Tutar Sütunu</label>
                <select
                  value={colMapping.amountCol}
                  onChange={(e) =>
                    setColMapping((prev) => ({ ...prev, amountCol: parseInt(e.target.value, 10) }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                >
                  <option value={0}>1. Sütun</option>
                  <option value={1}>2. Sütun</option>
                  <option value={2}>3. Sütun</option>
                  <option value={3}>4. Sütun</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  {importType === 'invoice' ? 'Fatura No' : 'Ödeme Türü'}
                </label>
                <select
                  value={colMapping.docCol}
                  onChange={(e) =>
                    setColMapping((prev) => ({ ...prev, docCol: parseInt(e.target.value, 10) }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                >
                  <option value={0}>1. Sütun</option>
                  <option value={1}>2. Sütun</option>
                  <option value={2}>3. Sütun</option>
                  <option value={3}>4. Sütun</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Açıklama Sütunu</label>
                <select
                  value={colMapping.descCol}
                  onChange={(e) =>
                    setColMapping((prev) => ({ ...prev, descCol: parseInt(e.target.value, 10) }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                >
                  <option value={0}>1. Sütun</option>
                  <option value={1}>2. Sütun</option>
                  <option value={2}>3. Sütun</option>
                  <option value={3}>4. Sütun</option>
                </select>
              </div>
            </div>
          </div>

          {/* Global Mutabakat Option */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allReconciled}
                onChange={(e) => setAllReconciled(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-slate-950 border-slate-700 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Yüklenen tüm hareketleri karşı tarafla mutabık olarak işaretle (✓)</span>
              </span>
            </label>
          </div>

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Algılanan Satırlar Önizlemesi:</span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 font-semibold text-[11px]">
                    {validRows.length} Geçerli Satır
                  </span>
                  {parsedRows.length > validRows.length && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-semibold text-[11px]">
                      {parsedRows.length - validRows.length} Hatalı
                    </span>
                  )}
                </div>
                <div className="font-mono font-bold text-sm text-sky-400">
                  Toplam: {formatCurrencyTRY(totalImportAmount, currency)}
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-8">#</th>
                      <th className="py-2 px-3">Tarih</th>
                      <th className="py-2 px-3">Tutar ({currency})</th>
                      <th className="py-2 px-3">
                        {importType === 'invoice' ? 'Fatura No' : 'Ödeme Türü'}
                      </th>
                      <th className="py-2 px-3">Açıklama</th>
                      <th className="py-2 px-3 w-16 text-center">Durum</th>
                      <th className="py-2 px-2 w-8 text-center">Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={
                          row.isValid
                            ? 'hover:bg-slate-800/40 transition-colors'
                            : 'bg-rose-950/20 text-rose-300'
                        }
                      >
                        <td className="py-1.5 px-3 font-mono text-[11px] text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-slate-300">
                          {formatDateTR(row.date)}
                        </td>
                        <td className="py-1.5 px-3 font-mono font-bold text-white">
                          {formatCurrencyTRY(row.amount, currency)}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-sky-300">
                          {row.docNoOrMethod}
                        </td>
                        <td className="py-1.5 px-3 text-slate-300 truncate max-w-[200px]">
                          {row.description || '-'}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center text-emerald-400 text-[11px]" title="Geçerli">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center text-rose-400 text-[11px]"
                              title={row.error}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                            title="Bu satırı aktarımdan çıkar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-400">
            {validRows.length > 0 ? (
              <span>
                Aktarılacak: <strong className="text-white">{validRows.length} adet işlem</strong> ({formatCurrencyTRY(totalImportAmount, currency)})
              </span>
            ) : (
              <span>Lütfen Excel'den satır kopyalayıp yapıştırın.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={validRows.length === 0}
              className={`px-5 py-2 rounded-lg text-xs font-bold text-white shadow-md transition-colors flex items-center gap-1.5 ${
                validRows.length > 0
                  ? importType === 'invoice'
                    ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 cursor-pointer'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {validRows.length > 0
                  ? `${validRows.length} Adet Hareketi Şirkete Aktar`
                  : 'Hareketleri Aktar'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
