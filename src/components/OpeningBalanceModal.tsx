import React, { useState, useMemo } from 'react';
import { CompanyAccount, Invoice, Payment, AppSettings } from '../types';
import { formatCurrencyTRY } from '../services/storageService';
import { SmartDateInput } from './SmartDateInput';
import {
  History,
  X,
  Check,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface OpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyAccount;
  currentBalance: number;
  settings: AppSettings;
  onAddInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  onAddPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => void;
  onSuccess: (message: string) => void;
}

export const OpeningBalanceModal: React.FC<OpeningBalanceModalProps> = ({
  isOpen,
  onClose,
  company,
  currentBalance,
  settings,
  onAddInvoice,
  onAddPayment,
  onSuccess
}) => {
  const currency = settings.currency || '₺';
  const fiscalYear = settings.fiscalYear || new Date().getFullYear();

  // Default devir date: 1st of January of current fiscal year
  const defaultDate = `${fiscalYear}-01-01`;

  const [direction, setDirection] = useState<'debt' | 'credit'>('debt');
  // 'debt': Şirket Bize Borçlu (Alacaklıyız - Fatura kaydı)
  // 'credit': Biz Şirkete Borçluyuz (Borçluyuz - Ödeme/Alacak kaydı)
  const [date, setDate] = useState<string>(defaultDate);
  const [amountStr, setAmountStr] = useState<string>('');
  const [docNo, setDocNo] = useState<string>(`DEVİR-${fiscalYear}`);
  const [description, setDescription] = useState<string>(
    `${fiscalYear - 1} Yılından Devreden Cari Bakiye`
  );
  const [isReconciled, setIsReconciled] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Parse amount value safely
  const amountVal = useMemo(() => {
    if (!amountStr.trim()) return 0;
    const clean = amountStr.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [amountStr]);

  // Projected new balance
  const projectedBalance = useMemo(() => {
    if (direction === 'debt') {
      return Number((currentBalance + amountVal).toFixed(2));
    } else {
      return Number((currentBalance - amountVal).toFixed(2));
    }
  }, [currentBalance, amountVal, direction]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amountStr.trim() === '') {
      setError('Lütfen geçerli bir devir tutarı giriniz (0 veya üzeri).');
      return;
    }

    const clean = amountStr.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    if (isNaN(parsed) || parsed < 0) {
      setError('Tutar sıfır veya pozitif bir sayı olmalıdır.');
      return;
    }

    if (direction === 'debt') {
      // Şirket Bize Borçlu -> Gelen Fatura / Alacak kaydı
      onAddInvoice({
        companyId: company.id,
        date: date || defaultDate,
        invoiceNo: docNo.trim().toUpperCase() || `DEVİR-${fiscalYear}`,
        amount: parsed,
        description: description.trim() || 'Önceki Dönemden Devreden Cari Bakiye',
        isReconciled
      });
      onSuccess(
        `✓ ${company.name} için ${formatCurrencyTRY(parsed, currency)} tutarında Devir Bakiyesi (Borç) kaydedildi.`
      );
    } else {
      // Biz Şirkete Borçluyuz -> Ödeme / Alacak kaydı
      onAddPayment({
        companyId: company.id,
        date: date || defaultDate,
        amount: parsed,
        paymentMethod: 'Diğer',
        description: description.trim() || 'Önceki Dönemden Devreden Cari Bakiye',
        isReconciled
      });
      onSuccess(
        `✓ ${company.name} için ${formatCurrencyTRY(parsed, currency)} tutarında Devir Bakiyesi (Alacak) kaydedildi.`
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#1b2028] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Devir / Açılış Bakiyesi Girişi</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                <strong className="text-slate-200">{company.name}</strong> firmasının geçmiş dönem bakiyesini tek kalemde sabitleyin.
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Direction Choice */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Bakiye Yönü (Kimin Alacağı Var?)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDirection('debt')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  direction === 'debt'
                    ? 'bg-rose-950/60 border-rose-600 text-rose-200 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                    <span>Şirket Bize Borçlu</span>
                  </span>
                  {direction === 'debt' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </div>
                <span className="text-[11px] opacity-80">
                  Biz alacaklıyız (Geçmiş fatura bakiyesi)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDirection('credit')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  direction === 'credit'
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Biz Şirkete Borçluyuz</span>
                  </span>
                  {direction === 'credit' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <span className="text-[11px] opacity-80">
                  Şirket alacaklı (Fazla ödeme veya avans)
                </span>
              </button>
            </div>
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Devir Tutarı ({currency})
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="0,00"
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 font-bold">
                  {currency}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Devir / Açılış Tarihi
              </label>
              <SmartDateInput
                value={date}
                onChange={setDate}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Document No & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Evrak / Fiş No
              </label>
              <input
                type="text"
                value={docNo}
                onChange={(e) => setDocNo(e.target.value)}
                placeholder={`DEVİR-${fiscalYear}`}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono uppercase focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Açıklama
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Önceki Yıldan Devreden Cari Bakiye"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Mutabakat Checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={isReconciled}
              onChange={(e) => setIsReconciled(e.target.checked)}
              className="w-4 h-4 text-emerald-600 bg-slate-950 border-slate-700 rounded focus:ring-emerald-500 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bu devir bakiyesi karşı tarafla mutabakatlıdır (✓)</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cari hesap ekstresinde ve satır yanında mutabık tik işaretiyle görünür.
              </p>
            </div>
          </label>

          {/* Projected Balance Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Bakiye Etkisi Önizlemesi
            </div>
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Şu Anki Net Bakiye:</span>
                <span
                  className={`font-mono font-bold ${
                    currentBalance > 0
                      ? 'text-rose-400'
                      : currentBalance < 0
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }`}
                >
                  {formatCurrencyTRY(currentBalance, currency)}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Devir Sonrası Yeni Bakiye:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    projectedBalance > 0
                      ? 'text-rose-400'
                      : projectedBalance < 0
                      ? 'text-emerald-400'
                      : 'text-slate-200'
                  }`}
                >
                  {formatCurrencyTRY(projectedBalance, currency)}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 active:bg-amber-700 shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              <span>Devir Bakiyesini Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
