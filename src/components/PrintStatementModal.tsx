import React, { useState } from 'react';
import { CompanyAccount, Invoice, Payment, AppSettings, CustomColumn } from '../types';
import { formatCurrencyTRY, formatDateTR } from '../services/storageService';
import * as XLSX from 'xlsx';
import {
  Printer,
  FileSpreadsheet,
  Copy,
  Check,
  X,
  CheckCircle2
} from 'lucide-react';

interface PrintStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyAccount;
  invoices: Invoice[];
  payments: Payment[];
  settings: AppSettings;
}

export const PrintStatementModal: React.FC<PrintStatementModalProps> = ({
  isOpen,
  onClose,
  company,
  invoices,
  payments,
  settings
}) => {
  const [copied, setCopied] = useState(false);
  const currency = settings.currency || '₺';
  const todayStr = new Date().toLocaleDateString('tr-TR');
  const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  if (!isOpen) return null;

  const customCols: CustomColumn[] = company.customColumns || [];

  // Build combined chronological ledger entries
  interface LedgerItem {
    id: string;
    date: string;
    type: 'invoice' | 'payment';
    docNo: string;
    description: string;
    debit: number; // Borç (Fatura)
    credit: number; // Alacak (Ödeme)
    customFields?: Record<string, any>;
    isReconciled?: boolean;
  }

  const items: LedgerItem[] = [
    ...invoices.map((inv) => ({
      id: inv.id,
      date: inv.date,
      type: 'invoice' as const,
      docNo: inv.invoiceNo,
      description: inv.description || 'Gelen Fatura',
      debit: inv.amount,
      credit: 0,
      customFields: inv.customFields,
      isReconciled: inv.isReconciled
    })),
    ...payments.map((pay) => ({
      id: pay.id,
      date: pay.date,
      type: 'payment' as const,
      docNo: pay.paymentMethod,
      description: pay.description || 'Ödeme',
      debit: 0,
      credit: pay.amount,
      customFields: pay.customFields,
      isReconciled: pay.isReconciled
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balances
  let runningBal = 0;
  const ledgerWithBalance = items.map((item) => {
    runningBal += item.debit - item.credit;
    return {
      ...item,
      runningBalance: runningBal
    };
  });

  const totalDebit = invoices.reduce((s, i) => s + i.amount, 0);
  const totalCredit = payments.reduce((s, p) => s + p.amount, 0);
  const finalBalance = totalDebit - totalCredit;

  const reconciledCount = items.filter((i) => i.isReconciled).length;
  const reconciledDebit = invoices.filter((i) => i.isReconciled).reduce((s, i) => s + i.amount, 0);
  const reconciledCredit = payments.filter((p) => p.isReconciled).reduce((s, p) => s + p.amount, 0);

  // Helper to format custom field value
  const formatCustomColValue = (item: LedgerItem, col: CustomColumn) => {
    const raw = item.customFields?.[col.id];
    if (raw === undefined || raw === null || raw === '') return '-';
    if (col.type === 'date') return formatDateTR(String(raw));
    if (col.type === 'number') return Number(raw).toLocaleString('tr-TR');
    return String(raw);
  };

  // 1. Direct Print using dedicated hidden iframe (immune to sandbox iframe blocking)
  const handlePrint = () => {
    try {
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);

      const printableDoc = printIframe.contentWindow?.document;
      if (printableDoc) {
        printableDoc.open();
        printableDoc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Cari Hesap Ekstresi - ${company.name}</title>
            <style>
              @page { size: A4 landscape; margin: 12mm; }
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                color: #111;
                background: #fff;
                margin: 0;
                padding: 10px;
                font-size: 10pt;
                line-height: 1.35;
              }
              .header {
                border-bottom: 2px solid #222;
                padding-bottom: 10px;
                margin-bottom: 12px;
                display: flex;
                justify-content: space-between;
              }
              .company-title {
                font-size: 15pt;
                font-weight: bold;
                text-transform: uppercase;
                margin: 0 0 3px 0;
              }
              .meta-text {
                font-size: 8.5pt;
                color: #444;
              }
              .doc-title {
                text-align: right;
              }
              .doc-title h2 {
                margin: 0;
                font-size: 13pt;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .info-grid {
                display: flex;
                justify-content: space-between;
                background: #f8fafc;
                border: 1px solid #cbd5e1;
                padding: 8px 12px;
                border-radius: 5px;
                margin-bottom: 12px;
                font-size: 9.5pt;
              }
              .info-block strong {
                display: block;
                font-size: 10.5pt;
                margin-bottom: 2px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 12px;
                font-size: 9pt;
              }
              th, td {
                border: 1px solid #cbd5e1;
                padding: 6px 8px;
                text-align: left;
              }
              th {
                background: #e2e8f0;
                font-weight: bold;
                text-transform: uppercase;
                font-size: 8.5pt;
              }
              .num {
                text-align: right;
                font-family: 'Courier New', monospace;
                font-weight: 600;
              }
              .custom-col-th {
                background: #f1f5f9;
                color: #0369a1;
              }
              .custom-col-td {
                background: #fafafa;
                color: #334155;
              }
              .totals-row td {
                background: #f1f5f9;
                font-weight: bold;
                font-size: 9.5pt;
              }
              .balance-summary {
                margin-top: 10px;
                padding: 10px;
                background: #f8fafc;
                border: 1.5px solid #334155;
                display: flex;
                justify-content: space-between;
                font-size: 10pt;
                font-weight: bold;
              }
              .signatures {
                margin-top: 30px;
                display: flex;
                justify-content: space-between;
                text-align: center;
                font-size: 9.5pt;
              }
              .sig-box {
                width: 180px;
                border-top: 1px solid #333;
                padding-top: 5px;
              }
              .reconciled-badge {
                color: #059669;
                font-weight: bold;
              }
              .unreconciled-badge {
                color: #94a3b8;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div style="display: flex; align-items: center; gap: 12px;">
                <img src="/app-logo.png" style="height: 42px; width: 42px; border-radius: 8px; object-fit: cover; border: 1px solid #cbd5e1;" onerror="this.style.display='none'" />
                <div>
                  <h1 class="company-title">${settings.mainCompanyName || 'CARİ HESAP YÖNETİMİ'}</h1>
                  <div class="meta-text">
                    ${settings.mainCompanyTaxNo ? `Vergi No / TC: ${settings.mainCompanyTaxNo} · ` : ''}
                    Mali Yıl: ${settings.fiscalYear === 0 ? 'Tüm Yıllar' : settings.fiscalYear}
                  </div>
                </div>
              </div>
              <div class="doc-title">
                <h2>CARİ HESAP EKSTRESİ</h2>
                <div class="meta-text">Tarih: ${todayStr} ${nowTime}</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-block">
                <span style="color:#64748b; font-size:8pt; text-transform:uppercase;">Cari Hesap / Müşteri / Tedarikçi</span>
                <strong>${company.name}</strong>
                ${company.taxNumber ? `<div>Vergi / TC No: ${company.taxNumber}</div>` : ''}
                ${company.phone ? `<div>Telefon: ${company.phone}</div>` : ''}
              </div>
              <div style="text-align:right;">
                <div>Toplam Gelen Fatura: <strong>${formatCurrencyTRY(totalDebit, currency)}</strong></div>
                <div>Toplam Yapılan Ödeme: <strong>${formatCurrencyTRY(totalCredit, currency)}</strong></div>
                <div style="margin-top:2px; font-size:10.5pt;">Kalan Net Bakiye: <strong style="color:${finalBalance > 0 ? '#b91c1c' : '#15803d'}">${formatCurrencyTRY(finalBalance, currency)}</strong></div>
                ${reconciledCount > 0 ? `<div style="font-size:8.5pt; color:#059669; margin-top:2px;">✓ Mutabık Satırlar: ${reconciledCount} / ${items.length}</div>` : ''}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:75px;">Tarih</th>
                  <th style="width:95px;">Evrak No</th>
                  <th>Açıklama</th>
                  ${customCols.map((c) => `<th class="custom-col-th">${c.name}</th>`).join('')}
                  <th style="width:95px;" class="num">Borç (Fatura)</th>
                  <th style="width:95px;" class="num">Alacak (Ödeme)</th>
                  <th style="width:100px;" class="num">Bakiye</th>
                  <th style="width:70px; text-align:center;">Mutabakat</th>
                </tr>
              </thead>
              <tbody>
                ${ledgerWithBalance.length === 0 ? `
                  <tr><td colspan="${7 + customCols.length}" style="text-align:center; padding:15px; color:#64748b;">Kayıtlı işlem bulunmamaktadır.</td></tr>
                ` : ledgerWithBalance.map((item) => {
                  return `
                  <tr>
                    <td>${formatDateTR(item.date)}</td>
                    <td style="font-family:monospace; font-weight:bold;">${item.docNo}</td>
                    <td>${item.description}</td>
                    ${customCols.map((col) => {
                      const val = formatCustomColValue(item, col);
                      return `<td class="custom-col-td ${col.type === 'number' ? 'num' : ''}">${val}</td>`;
                    }).join('')}
                    <td class="num">${item.type === 'invoice' ? formatCurrencyTRY(item.debit, currency) : '-'}</td>
                    <td class="num">${item.type === 'payment' ? formatCurrencyTRY(item.credit, currency) : '-'}</td>
                    <td class="num">${formatCurrencyTRY(item.runningBalance, currency)}</td>
                    <td style="text-align:center;">
                      ${item.isReconciled ? '<span class="reconciled-badge">✓ Mutabık</span>' : '<span class="unreconciled-badge">-</span>'}
                    </td>
                  </tr>
                `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr class="totals-row">
                  <td colspan="${3 + customCols.length}" style="text-align:right;">TOPLAM:</td>
                  <td class="num">${formatCurrencyTRY(totalDebit, currency)}</td>
                  <td class="num">${formatCurrencyTRY(totalCredit, currency)}</td>
                  <td class="num">${formatCurrencyTRY(finalBalance, currency)}</td>
                  <td style="text-align:center; font-size:8pt; color:#059669;">
                    ${reconciledCount > 0 ? `${reconciledCount}/${items.length}` : '-'}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div class="balance-summary">
              <span>HESAP DURUMU: ${finalBalance > 0 ? 'FİRMAYA BORCUMUZ BULUNMAKTADIR' : finalBalance < 0 ? 'FİRMADAN ALACAK BAKİYEMİZ VARDIR' : 'HESAP BAKİYESİ SIFIRDIR (KAPALI)'}</span>
              <span>NET BAKİYE: ${formatCurrencyTRY(finalBalance, currency)}</span>
            </div>

            <div class="signatures">
              <div class="sig-box">
                Düzenleyen / Kaşe / İmza<br><br><br>
                ${settings.mainCompanyName}
              </div>
              <div class="sig-box">
                Teslim Alan / Onaylayan<br><br><br>
                ${company.name}
              </div>
            </div>
          </body>
          </html>
        `);
        printableDoc.close();

        // Allow DOM to load styles then trigger print dialog
        setTimeout(() => {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(printIframe);
          }, 1500);
        }, 300);
      }
    } catch (err) {
      console.warn('Iframe print fallback, triggering direct print:', err);
      window.print();
    }
  };

  // 2. Export Statement as Excel Sheet (.xlsx) with dedicated custom columns
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const headerRow: Record<string, any> = {
      'Tarih': 'Tarih',
      'Evrak No': 'Evrak No',
      'Açıklama': 'Açıklama'
    };
    customCols.forEach((col) => {
      headerRow[col.name] = col.name;
    });
    headerRow[`Borç (${currency})`] = `Borç (${currency})`;
    headerRow[`Alacak (${currency})`] = `Alacak (${currency})`;
    headerRow[`Bakiye (${currency})`] = `Bakiye (${currency})`;
    headerRow['Mutabakat Durumu'] = 'Mutabakat Durumu';

    const dataRows = ledgerWithBalance.map((item) => {
      const row: Record<string, any> = {
        'Tarih': formatDateTR(item.date),
        'Evrak No': item.docNo,
        'Açıklama': item.description
      };

      customCols.forEach((col) => {
        row[col.name] = formatCustomColValue(item, col);
      });

      row[`Borç (${currency})`] = item.debit;
      row[`Alacak (${currency})`] = item.credit;
      row[`Bakiye (${currency})`] = item.runningBalance;
      row['Mutabakat Durumu'] = item.isReconciled ? 'Mutabık ✓' : 'Bekliyor';

      return row;
    });

    const totalRow: Record<string, any> = {
      'Tarih': 'TOPLAM',
      'Evrak No': '',
      'Açıklama': ''
    };
    customCols.forEach((col) => {
      totalRow[col.name] = '';
    });
    totalRow[`Borç (${currency})`] = totalDebit;
    totalRow[`Alacak (${currency})`] = totalCredit;
    totalRow[`Bakiye (${currency})`] = finalBalance;
    totalRow['Mutabakat Durumu'] = `${reconciledCount} / ${items.length} Mutabık`;

    const fullSheetRows = [
      { 'Tarih': settings.mainCompanyName, 'Evrak No': '', 'Açıklama': '' },
      { 'Tarih': `CARİ HESAP EKSTRESİ: ${company.name}`, 'Evrak No': '', 'Açıklama': '' },
      { 'Tarih': `Tarih: ${todayStr}`, 'Evrak No': '', 'Açıklama': '' },
      {},
      headerRow,
      ...dataRows,
      {},
      totalRow
    ];

    const ws = XLSX.utils.json_to_sheet(fullSheetRows, { skipHeader: true });
    XLSX.utils.book_append_sheet(wb, ws, 'Ekstre');
    const safeName = company.name.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `${safeName}_Cari_Ekstre_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 3. Quick Copy Text Summary for WhatsApp / Email
  const handleCopySummary = () => {
    const statusText = finalBalance > 0
      ? 'Borcumuz bulunmaktadır'
      : finalBalance < 0
      ? 'Alacak bakiyeniz bulunmaktadır'
      : 'Hesap kapalıdır (0,00)';

    const text = `*CARİ HESAP EKSTRE ÖZETİ*
Firma: ${company.name}
Tarih: ${todayStr}

- Toplam Gelen Fatura: ${formatCurrencyTRY(totalDebit, currency)} (${invoices.length} adet)
- Toplam Yapılan Ödeme: ${formatCurrencyTRY(totalCredit, currency)} (${payments.length} adet)
- Güncel Bakiye: ${formatCurrencyTRY(finalBalance, currency)} (${statusText})
- Mutabakat Durumu: ${reconciledCount} / ${items.length} satır mutabık onaylı
${customCols.length > 0 ? `- Özel Sütun Sayısı: ${customCols.length} (${customCols.map((c) => c.name).join(', ')})` : ''}

Bilgilerinize sunar, iyi çalışmalar dileriz.
${settings.mainCompanyName}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#1e232b] border border-slate-700 rounded-xl max-w-5xl w-full shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden text-slate-100">
        {/* Modal Toolbar Header */}
        <div className="bg-[#161a22] px-5 py-3.5 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-800 text-sky-400 border border-slate-700">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Cari Hesap Ekstresi</span>
                <span className="text-xs font-normal text-slate-400">· {company.name}</span>
                {customCols.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    {customCols.length} Özel Sütun Dahil
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                Resmi ekstre önizlemesi, yazıcı çıktısı veya Excel indirme
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Yazıcıya gönder veya PDF olarak kaydet"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF</span>
            </button>

            {/* Excel Download Button */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Ekstreyi özel sütunlar dahil Excel tablosu olarak indir"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Excel İndir</span>
            </button>

            {/* Quick Copy Summary */}
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="WhatsApp veya E-posta için ekstre metnini kopyala"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'Kopyalandı!' : 'Özeti Kopyala'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Statement Preview Canvas */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#13171e]">
          <div className="max-w-[900px] mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-lg shadow-xl border border-slate-300 font-sans text-xs">
            {/* Printable Document Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-start gap-4">
              <div>
                <h1 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-tight">
                  {settings.mainCompanyName || 'CARİ HESAP YÖNETİMİ'}
                </h1>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {settings.mainCompanyTaxNo && `VK / TC No: ${settings.mainCompanyTaxNo} · `}
                  Mali Yıl: {settings.fiscalYear === 0 ? 'Tüm Yıllar' : `${settings.fiscalYear} Yılı`}
                </p>
              </div>

              <div className="text-right">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  CARİ HESAP EKSTRESİ
                </h2>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Tarih: {todayStr} · {nowTime}
                </p>
              </div>
            </div>

            {/* Recipient & Balance Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Cari Firma Bilgileri
                </span>
                <span className="text-sm font-black text-slate-900 block mt-0.5 uppercase">
                  {company.name}
                </span>
                {company.taxNumber && (
                  <span className="text-slate-600 font-mono text-[11px] block mt-0.5">
                    Vergi / TC No: {company.taxNumber}
                  </span>
                )}
                {company.phone && (
                  <span className="text-slate-600 text-[11px] block">
                    Telefon: {company.phone}
                  </span>
                )}
              </div>

              <div className="sm:text-right flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                <div className="text-slate-600 text-[11px]">
                  Toplam Fatura: <strong className="font-mono text-slate-900">{formatCurrencyTRY(totalDebit, currency)}</strong>
                </div>
                <div className="text-slate-600 text-[11px]">
                  Toplam Ödeme: <strong className="font-mono text-slate-900">{formatCurrencyTRY(totalCredit, currency)}</strong>
                </div>
                <div className="mt-1 pt-1 border-t border-slate-200 text-xs font-bold">
                  Net Bakiye:{' '}
                  <span className={`font-mono text-sm font-black ${
                    finalBalance > 0.005
                      ? 'text-rose-700'
                      : finalBalance < -0.005
                      ? 'text-emerald-700'
                      : 'text-slate-700'
                  }`}>
                    {formatCurrencyTRY(finalBalance, currency)}
                  </span>
                </div>
                {reconciledCount > 0 && (
                  <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center sm:justify-end gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mutabık: {reconciledCount} / {items.length} Satır</span>
                  </div>
                )}
              </div>
            </div>

            {/* Chronological Ledger Table with Dynamic Custom Columns and Mutabakat */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">Tarih</th>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">Evrak No / Tür</th>
                    <th className="py-2 px-2.5 font-bold">Açıklama</th>
                    {customCols.map((col) => (
                      <th
                        key={col.id}
                        className="py-2 px-2.5 font-bold whitespace-nowrap bg-sky-50 text-sky-800 border-l border-slate-200"
                      >
                        {col.name}
                      </th>
                    ))}
                    <th className="py-2 px-2.5 font-bold text-right whitespace-nowrap">Borç (Fatura)</th>
                    <th className="py-2 px-2.5 font-bold text-right whitespace-nowrap">Alacak (Ödeme)</th>
                    <th className="py-2 px-2.5 font-bold text-right whitespace-nowrap">Kalan Bakiye</th>
                    <th className="py-2 px-2 font-bold text-center w-14 whitespace-nowrap">Mutabakat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {ledgerWithBalance.length === 0 ? (
                    <tr>
                      <td colSpan={7 + customCols.length} className="py-6 text-center text-slate-500">
                        Bu cariye ait henüz fatura veya ödeme kaydı bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    ledgerWithBalance.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          item.isReconciled ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <td className="py-2 px-2.5 font-mono text-slate-600 whitespace-nowrap">
                          {formatDateTR(item.date)}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {item.docNo}
                        </td>
                        <td className="py-2 px-2.5 text-slate-700 max-w-[200px]">
                          {item.description}
                        </td>
                        {customCols.map((col) => {
                          const val = formatCustomColValue(item, col);
                          return (
                            <td
                              key={col.id}
                              className={`py-2 px-2.5 whitespace-nowrap bg-sky-50/30 border-l border-slate-200 text-slate-700 ${
                                col.type === 'number' ? 'text-right font-mono' : ''
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-rose-700 whitespace-nowrap tabular-nums">
                          {item.type === 'invoice' ? formatCurrencyTRY(item.debit, currency) : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                          {item.type === 'payment' ? formatCurrencyTRY(item.credit, currency) : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900 whitespace-nowrap tabular-nums">
                          {formatCurrencyTRY(item.runningBalance, currency)}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {item.isReconciled ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ✓ Mutabık
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
                  <tr>
                    <td
                      colSpan={3 + customCols.length}
                      className="py-2 px-2.5 text-right uppercase text-[10px]"
                    >
                      Genel Toplam:
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-black text-rose-700 tabular-nums">
                      {formatCurrencyTRY(totalDebit, currency)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-black text-emerald-700 tabular-nums">
                      {formatCurrencyTRY(totalCredit, currency)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900 tabular-nums">
                      {formatCurrencyTRY(finalBalance, currency)}
                    </td>
                    <td className="py-2 px-2 text-center text-[10px] text-emerald-700 font-bold">
                      {reconciledCount > 0 ? `${reconciledCount}/${items.length}` : '-'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom Account Status Banner */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs font-bold mb-8">
              <span>
                HESAP DURUMU:{' '}
                {finalBalance > 0.005
                  ? 'FİRMAYA BORCUMUZ BULUNMAKTADIR'
                  : finalBalance < -0.005
                  ? 'FİRMADAN ALACAK BAKİYEMİZ VARDIR'
                  : 'HESAP BAKİYESİ SIFIRDIR (KAPALI)'}
              </span>
              <span className="font-mono text-sm font-black">
                NET: {formatCurrencyTRY(finalBalance, currency)}
              </span>
            </div>

            {/* Official Signature Area */}
            <div className="flex justify-between items-center text-center text-xs text-slate-700 pt-8 border-t border-slate-200">
              <div className="w-48">
                <div className="border-b border-slate-400 pb-12 mb-1.5 font-bold text-slate-800">
                  {settings.mainCompanyName}
                </div>
                <span className="text-[11px] text-slate-500">Düzenleyen Yetkili / Kaşe</span>
              </div>

              <div className="w-48">
                <div className="border-b border-slate-400 pb-12 mb-1.5 font-bold text-slate-800">
                  {company.name}
                </div>
                <span className="text-[11px] text-slate-500">Teslim Alan / Mutabakat Onayı</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
