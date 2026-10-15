import React from 'react';
import { formatCurrencyTRY } from '../services/storageService';
import { TrendingUp, TrendingDown, MinusCircle, Calendar } from 'lucide-react';

interface TotalDebtDisplayProps {
  totalPositiveDebt: number;
  totalNegativeCredit: number;
  debtCompanyCount: number;
  creditCompanyCount: number;
  zeroCompanyCount: number;
  currency?: string;
  fiscalYear?: number;
  onFilterClick?: (filter: 'all' | 'debt' | 'credit' | 'zero') => void;
  activeFilter?: string;
}

export const TotalDebtDisplay: React.FC<TotalDebtDisplayProps> = ({
  totalPositiveDebt,
  totalNegativeCredit,
  debtCompanyCount,
  creditCompanyCount,
  zeroCompanyCount,
  currency = '₺',
  fiscalYear = 2026,
  onFilterClick,
  activeFilter = 'all'
}) => {
  return (
    <div className="flex flex-col items-center justify-center pt-2 pb-5 px-4">
      {/* Prominent Center Total Box matching the screenshot */}
      <div className="relative group">
        <div className="bg-[#f87171] border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] px-8 sm:px-12 py-2 sm:py-3 transition-transform hover:scale-[1.01] rounded-xs">
          <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-black text-black tracking-tight tabular-nums select-all">
            {formatCurrencyTRY(totalPositiveDebt, currency)}
          </span>
        </div>
      </div>

      {/* Subtitle & Smart Calculation Rule explanation */}
      <div className="mt-2 text-center">
        <p className="text-xs uppercase tracking-wider font-semibold text-slate-300 flex items-center justify-center gap-1.5">
          <span>TOPLAM BORÇ</span>
          <span className="text-[11px] text-slate-400 font-normal">
            (Yalnızca bakiyesi pozitif olan şirketler toplanır · {fiscalYear === 0 ? 'Tüm Yıllar' : `${fiscalYear} Mali Yılı`})
          </span>
        </p>
      </div>

      {/* Quick Status Filter Pills */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs">
        <button
          onClick={() => onFilterClick && onFilterClick('all')}
          className={`px-3 py-1 rounded-md border transition-colors cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-slate-700 text-white border-slate-500 font-semibold'
              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          Tüm Tablo ({debtCompanyCount + creditCompanyCount + zeroCompanyCount} Şirket)
        </button>

        <button
          onClick={() => onFilterClick && onFilterClick('debt')}
          className={`flex items-center gap-1 px-3 py-1 rounded-md border transition-colors cursor-pointer ${
            activeFilter === 'debt'
              ? 'bg-rose-950/80 text-rose-200 border-rose-500 font-semibold'
              : 'bg-rose-950/40 text-rose-300 border-rose-900/60 hover:bg-rose-950/70'
          }`}
          title="Bakiyesi artı olan ve toplam hesaba dahil edilen şirketler"
        >
          <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
          <span>Borçlu Şirketler ({debtCompanyCount})</span>
        </button>

        <button
          onClick={() => onFilterClick && onFilterClick('credit')}
          className={`flex items-center gap-1 px-3 py-1 rounded-md border transition-colors cursor-pointer ${
            activeFilter === 'credit'
              ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500 font-semibold'
              : 'bg-emerald-950/40 text-emerald-300 border-emerald-900/60 hover:bg-emerald-950/70'
          }`}
          title="Bakiyesi eksiye düşmüş şirketler (üstteki toplama dahil edilmez)"
        >
          <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
          <span>Alacaklı / Eksi ({creditCompanyCount}): {formatCurrencyTRY(totalNegativeCredit, currency)}</span>
        </button>

        <button
          onClick={() => onFilterClick && onFilterClick('zero')}
          className={`flex items-center gap-1 px-3 py-1 rounded-md border transition-colors cursor-pointer ${
            activeFilter === 'zero'
              ? 'bg-slate-700 text-slate-200 border-slate-500 font-semibold'
              : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:bg-slate-800'
          }`}
        >
          <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Kapalı (0,00 {currency}): {zeroCompanyCount}</span>
        </button>
      </div>
    </div>
  );
};
