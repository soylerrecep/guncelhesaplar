import React, { useState } from 'react';
import { CompanyAccount, CompanySummary } from '../types';
import { formatCurrencyTRY } from '../services/storageService';
import { Plus, ArrowUpRight, Rows, PlusCircle, Building2 } from 'lucide-react';

interface CompanyGridProps {
  summaries: CompanySummary[];
  onSelectCompany: (company: CompanyAccount) => void;
  onAddCompanyAtSlot?: (row: number, col: number) => void;
  searchQuery?: string;
  activeFilter?: 'all' | 'debt' | 'credit' | 'zero';
  currency?: string;
}

const TOTAL_COLS = 11;

export const CompanyGrid: React.FC<CompanyGridProps> = ({
  summaries,
  onSelectCompany,
  onAddCompanyAtSlot,
  searchQuery = '',
  activeFilter = 'all',
  currency = '₺'
}) => {
  // Determine maximum row from current companies, with a minimum of 4 rows
  const maxExistingRow = summaries.reduce((max, s) => Math.max(max, s.company.gridRow), 4);
  const [extraRows, setExtraRows] = useState(0);
  const totalRows = Math.max(4, maxExistingRow + extraRows);

  // Build 2D lookup map [row][col]
  const slotMap = new Map<string, CompanySummary>();
  for (const s of summaries) {
    slotMap.set(`${s.company.gridRow}-${s.company.gridCol}`, s);
  }

  // Filter helper
  const matchesFilter = (s: CompanySummary) => {
    if (activeFilter === 'debt' && s.balance <= 0) return false;
    if (activeFilter === 'credit' && s.balance >= 0) return false;
    if (activeFilter === 'zero' && Math.abs(s.balance) > 0.001) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return s.company.name.toLowerCase().includes(q);
    }
    return true;
  };

  // Helper for balance cell background color matching the screenshot
  const getBalanceStyle = (balance: number) => {
    if (Math.abs(balance) < 0.001) {
      // 0,00 ₺ -> White/light neutral
      return {
        bg: 'bg-white',
        text: 'text-slate-900',
        label: 'Kapalı'
      };
    } else if (balance > 0) {
      // Positive balance (Borcumuz var) -> Pink / Reddish highlight
      if (balance > 200000) {
        return {
          bg: 'bg-[#fca5a5]', // Stronger coral pink for high debt
          text: 'text-black font-extrabold',
          label: 'Borçlu'
        };
      }
      return {
        bg: 'bg-[#fee2e2]', // Soft pink
        text: 'text-black font-bold',
        label: 'Borçlu'
      };
    } else {
      // Negative balance (Alacak / Fazla ödeme) -> Light Greenish highlight
      return {
        bg: 'bg-[#bbf7d0]', // Mint green
        text: 'text-black font-bold',
        label: 'Alacaklı'
      };
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-8 px-2 sm:px-4">
      <div className="min-w-[1240px] max-w-[1650px] mx-auto bg-[#8b93a0] p-4 sm:p-5 rounded-xl border border-slate-700 shadow-2xl">
        {/* Empty state reminder if no companies exist yet */}
        {summaries.length === 0 && (
          <div className="mb-4 p-4 rounded-lg bg-slate-900/90 border border-slate-700 text-center text-slate-300 flex flex-col items-center justify-center gap-2">
            <Building2 className="w-8 h-8 text-sky-400 opacity-80" />
            <h3 className="font-bold text-white text-sm">Veritabanınız Başlatıldı (Kayıtlı Şirket Yok)</h3>
            <p className="text-xs text-slate-400 max-w-lg">
              Tablodaki boş kutulara tıklayarak veya aşağıdaki "+ Yeni Şirket Ekle" butonunu kullanarak ilk cari kartınızı eklemeye başlayabilirsiniz.
            </p>
            <button
              onClick={() => onAddCompanyAtSlot && onAddCompanyAtSlot(1, 1)}
              className="mt-1 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>İlk Şirketi Ekle (Satır 1, Sütun 1)</span>
            </button>
          </div>
        )}

        {/* Matrix Grid */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          {Array.from({ length: totalRows }, (_, rIdx) => {
            const rowNumber = rIdx + 1;
            return (
              <div
                key={`row-${rowNumber}`}
                className="grid grid-cols-11 gap-1.5 sm:gap-2"
              >
                {Array.from({ length: TOTAL_COLS }, (_, cIdx) => {
                  const colNumber = cIdx + 1;
                  const key = `${rowNumber}-${colNumber}`;
                  const summary = slotMap.get(key);

                  if (!summary) {
                    // Empty grid slot
                    return (
                      <div
                        key={key}
                        onClick={() => onAddCompanyAtSlot && onAddCompanyAtSlot(rowNumber, colNumber)}
                        className="group flex flex-col h-[74px] border border-slate-600/70 bg-[#9ca3af]/40 hover:bg-[#cbd5e1] hover:border-slate-800 transition-all cursor-pointer justify-center items-center text-slate-600 hover:text-slate-900 rounded-xs"
                        title={`Boş Slot (Satır: ${rowNumber}, Sütun: ${colNumber}) - Tıklayarak Şirket Ekleyin`}
                      >
                        <Plus className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                        <span className="text-[10px] font-mono opacity-0 group-hover:opacity-90 font-bold transition-opacity">
                          + Ekle
                        </span>
                      </div>
                    );
                  }

                  const isHighlighted = matchesFilter(summary);
                  const balStyle = getBalanceStyle(summary.balance);

                  return (
                    <div
                      key={key}
                      onClick={() => onSelectCompany(summary.company)}
                      className={`flex flex-col border-[1.5px] border-black transition-all cursor-pointer shadow-sm rounded-xs overflow-hidden ${
                        isHighlighted
                          ? 'opacity-100 hover:scale-[1.03] hover:shadow-lg'
                          : 'opacity-30 grayscale hover:opacity-100'
                      }`}
                      title={`${summary.company.name} - Güncel Bakiye: ${formatCurrencyTRY(summary.balance, currency)} (Detaylar için tıklayın)`}
                    >
                      {/* Company Name Button (Upper Cell) */}
                      <button
                        type="button"
                        className="w-full h-[36px] px-1 bg-[#dbeafe] hover:bg-[#bfdbfe] active:bg-[#93c5fd] border-b border-black text-center flex items-center justify-center transition-colors group cursor-pointer"
                      >
                        <span className="text-[11px] sm:text-[12px] font-bold text-[#1e3a8a] truncate leading-tight uppercase tracking-tight select-none">
                          {summary.company.name}
                        </span>
                        {(summary.company.customColumns?.length || 0) > 0 && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-1 shrink-0"
                            title={`${summary.company.customColumns?.length} adet özel sütun tanımlı`}
                          />
                        )}
                        <ArrowUpRight className="w-3 h-3 text-[#1e3a8a] opacity-0 group-hover:opacity-100 ml-0.5 shrink-0 transition-opacity" />
                      </button>

                      {/* Company Balance (Lower Cell) */}
                      <div
                        className={`w-full h-[36px] px-1 flex items-center justify-center text-center tabular-nums select-none ${balStyle.bg}`}
                      >
                        <span className={`text-[12px] sm:text-[13px] font-mono ${balStyle.text} truncate`}>
                          {formatCurrencyTRY(summary.balance, currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Dynamic Downward Row Expansion Bar */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-200 font-semibold flex items-center gap-2">
            <Rows className="w-4 h-4 text-sky-300" />
            <span>Aktif Tablo Satır Sayısı: {totalRows} Satır ({totalRows * TOTAL_COLS} Slot)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExtraRows((prev) => prev + 1)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-900 text-sky-300 hover:text-white border border-slate-700 hover:border-sky-500 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Tablonun altına yeni boş bir satır (11 yeni şirket slotu) ekler"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Aşağıya Yeni Satır Ekle (+11 Slot)</span>
            </button>

            {extraRows > 0 && (
              <button
                onClick={() => setExtraRows((prev) => Math.max(0, prev - 1))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs border border-slate-700 hover:border-slate-500 transition-colors"
                title="Eklenen boş satırı kaldır"
              >
                Satırı Daralt
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
