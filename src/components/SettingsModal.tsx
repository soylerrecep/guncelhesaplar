import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Settings, Building, Calendar, DollarSign, Palette, RefreshCw, X, Check, Lock } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onResetAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetAllData
}) => {
  const [mainCompanyName, setMainCompanyName] = useState(settings.mainCompanyName);
  const [mainCompanyTaxNo, setMainCompanyTaxNo] = useState(settings.mainCompanyTaxNo || '');
  const [fiscalYear, setFiscalYear] = useState(settings.fiscalYear);
  const [currency, setCurrency] = useState(settings.currency);

  useEffect(() => {
    if (isOpen) {
      setMainCompanyName(settings.mainCompanyName);
      setMainCompanyTaxNo(settings.mainCompanyTaxNo || '');
      setFiscalYear(settings.fiscalYear);
      setCurrency(settings.currency);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      mainCompanyName: mainCompanyName.trim() || 'ANA ŞİRKETİMİZ',
      mainCompanyTaxNo: mainCompanyTaxNo.trim() || undefined,
      fiscalYear,
      currency,
      companyDetailTheme: 'dark'
    });
    onClose();
  };

  const years = [2027, 2026, 2025, 2024, 2023, 0]; // 0 means 'Tüm Yıllar'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#181e26] border border-slate-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#12161c] px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-950 text-sky-400 border border-sky-800">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Program Ayarları</h2>
              <p className="text-xs text-slate-400">
                Ana şirket ünvanı, çalışma yılı ve görünüm tercihleri
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Main Company Name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Building className="w-4 h-4 text-sky-400" />
              <span>Ana Şirket Ünvanı (Bizim Şirketimiz)</span>
            </label>
            <input
              type="text"
              required
              placeholder="Örn: YILMAZ İNŞAAT VE YAPI TİC. LTD. ŞTİ."
              value={mainCompanyName}
              onChange={(e) => setMainCompanyName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-bold uppercase focus:border-sky-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500">
              Bu ünvan program başlığında ve yazdırılan şirket ekstrelerinde yer alır.
            </p>
          </div>

          {/* Tax Number */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-300">
              Ana Şirket Vergi Kimlik No / TC (İsteğe bağlı)
            </label>
            <input
              type="text"
              placeholder="Örn: 9876543210"
              value={mainCompanyTaxNo}
              onChange={(e) => setMainCompanyTaxNo(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Fiscal Year & Currency */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 font-semibold text-slate-300">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Çalışma / Mali Yılı</span>
              </label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-bold focus:border-emerald-500 focus:outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y === 0 ? 'Tüm Yıllar (Filtresiz)' : `${y} Yılı`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 font-semibold text-slate-300">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Para Birimi</span>
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-bold focus:border-amber-500 focus:outline-none"
              >
                <option value="₺">₺ (Türk Lirası)</option>
                <option value="$">$ (Amerikan Doları)</option>
                <option value="€">€ (Euro)</option>
              </select>
            </div>
          </div>



          {/* Additional Utilities */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Veri Temizleme & Sıfırlama</span>
              <span className="text-[10px] text-rose-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Şifreli
              </span>
            </div>

            <button
              type="button"
              onClick={onResetAllData}
              className="w-full py-2.5 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/60 text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Tüm Şirket Kayıtlarını Sıfırla</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center">
              Yetkili onay şifresi gerektirir. İşlem öncesi otomatik güvenlik kurtarma noktası oluşturulur.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold rounded-lg text-xs shadow transition-colors"
            >
              Ayarları Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
