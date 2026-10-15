import React, { useState } from 'react';
import { CompanyAccount, CompanySummary } from '../types';
import { formatCurrencyTRY } from '../services/storageService';
import { ArrowUpDown, ArrowRight, TrendingUp, TrendingDown, MinusCircle } from 'lucide-react';

interface CompanyListViewProps {
  summaries: CompanySummary[];
  onSelectCompany: (company: CompanyAccount) => void;
  searchQuery: string;
  currency?: string;
}

export const CompanyListView: React.FC<CompanyListViewProps> = ({
  summaries,
  onSelectCompany,
  searchQuery,
  currency = '₺'
}) => {
  const [sortField, setSortField] = useState<'name' | 'balance' | 'invoices' | 'payments'>('balance');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter
  const filtered = summaries.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.company.name.toLowerCase().includes(q) ||
      s.company.taxNumber?.includes(q) ||
      s.company.phone?.includes(q)
    );
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let comp = 0;
    if (sortField === 'name') {
      comp = a.company.name.localeCompare(b.company.name, 'tr');
    } else if (sortField === 'balance') {
      comp = a.balance - b.balance;
    } else if (sortField === 'invoices') {
      comp = a.totalInvoices - b.totalInvoices;
    } else if (sortField === 'payments') {
      comp = a.totalPayments - b.totalPayments;
    }
    return sortAsc ? comp : -comp;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pb-8">
      <div className="bg-[#181e26] border border-slate-700/80 rounded-lg shadow-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-[#12161c] border-b border-slate-700 flex items-center justify-between">
          <span className="font-bold text-sm text-slate-200">
            Kayıtlı Şirketler Listesi ({sorted.length} Şirket)
          </span>
          <span className="text-xs text-slate-400">
            Detaylar ve fatura/ödeme girişleri için satıra tıklayınız
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141920] text-slate-400 border-b border-slate-700 select-none">
              <tr>
                <th
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Şirket Adı</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-center w-24">Konum</th>
                <th
                  onClick={() => toggleSort('invoices')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Toplam Gelen Fatura</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('payments')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Toplam Yapılan Ödeme</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('balance')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Güncel Bakiye</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-center w-36">Durum</th>
                <th className="py-3 px-4 text-center w-16">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sorted.map((s) => (
                <tr
                  key={s.company.id}
                  onClick={() => onSelectCompany(s.company)}
                  className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="uppercase">{s.company.name}</span>
                      {(s.company.customColumns?.length || 0) > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/90 text-sky-300 border border-sky-800 font-normal">
                          {s.company.customColumns?.length} Özel Sütun
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                    S{s.company.gridRow} : C{s.company.gridCol}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-300 font-medium tabular-nums">
                    {formatCurrencyTRY(s.totalInvoices)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-300 font-medium tabular-nums">
                    {formatCurrencyTRY(s.totalPayments)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-sm tabular-nums">
                    <span
                      className={
                        s.balance > 0
                          ? 'text-rose-400'
                          : s.balance < 0
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }
                    >
                      {formatCurrencyTRY(s.balance)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {s.balance > 0 ? (
                      <span className="inline-flex items-center gap-1 bg-rose-950 text-rose-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-rose-800">
                        <TrendingUp className="w-3 h-3" />
                        <span>Borçlu (+Toplamda)</span>
                      </span>
                    ) : s.balance < 0 ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-800">
                        <TrendingDown className="w-3 h-3" />
                        <span>Alacaklı (Eksi)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-700">
                        <MinusCircle className="w-3 h-3" />
                        <span>0,00 ₺ Kapalı</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="p-1 rounded bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-sky-600 transition-colors inline-block">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
