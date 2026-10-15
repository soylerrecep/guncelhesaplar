import React, { useRef, useEffect, useState } from 'react';
import {
  Database,
  Plus,
  Search,
  HardDrive,
  Settings,
  Calendar,
  Building,
  CheckCircle2,
  X,
  Share2,
  Smartphone,
  Monitor,
  Download
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppSettings } from '../types';

interface HeaderBarProps {
  settings: AppSettings;
  onOpenSettingsModal: () => void;
  onOpenBackupModal: () => void;
  onOpenAddCompanyModal: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'list';
  onToggleViewMode: (mode: 'grid' | 'list') => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  settings,
  onOpenSettingsModal,
  onOpenBackupModal,
  onOpenAddCompanyModal,
  searchQuery,
  onSearchChange,
  viewMode,
  onToggleViewMode
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showPwaGuide, setShowPwaGuide] = useState(false);

  // Global keyboard shortcuts (Ctrl+F for search, Ctrl+S for backup, Ctrl+, for settings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onOpenBackupModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        onOpenSettingsModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenBackupModal, onOpenSettingsModal]);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setShowPwaGuide(true);
      }
    } else {
      setShowPwaGuide(true);
    }
  };

  return (
    <>
      <header className="bg-[#181d24] border-b border-slate-700/80 px-3 sm:px-6 py-2.5 shadow-md sticky top-0 z-20">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand / Title & Main Company Info with Premium Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0f172a] border border-cyan-500/40 flex items-center justify-center shadow-lg overflow-hidden shrink-0 ring-1 ring-cyan-500/30">
              <img
                src="/app-logo.png"
                alt="Cari Hesap Logo"
                className="w-full h-full object-cover transition-transform hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icon.svg';
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide uppercase truncate max-w-[240px] sm:max-w-none">
                  {settings.mainCompanyName || 'GÜNCEL CARİ HESAPLAR'}
                </span>
                <button
                  onClick={onOpenSettingsModal}
                  className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-300 px-2 py-0.5 rounded border border-slate-600 font-mono transition-colors cursor-pointer"
                  title="Mali yılı değiştirmek için tıklayın"
                >
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span>{settings.fiscalYear === 0 ? 'Tüm Yıllar' : `${settings.fiscalYear} Yılı`}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Windows Masaüstü & Chrome PWA Cari Bakiye ve Fatura/Ödeme Takibi
              </p>
            </div>
          </div>

          {/* Center: Search & View Switcher */}
          <div className="flex items-center gap-2 flex-1 max-w-md mx-auto">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Şirket Ara... (Ctrl+F)"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700 focus:border-sky-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 shrink-0 text-xs">
              <button
                onClick={() => onToggleViewMode('grid')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-slate-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Klasik Görsel Tablo Görünümü (Matris)"
              >
                Tablo
              </button>
              <button
                onClick={() => onToggleViewMode('list')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-slate-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Ayrıntılı Liste ve Sıralama Görünümü"
              >
                Liste
              </button>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Add Company Button */}
            <button
              onClick={onOpenAddCompanyModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Yeni Şirket Ekle</span>
              <span className="sm:hidden">+ Şirket</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettingsModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium rounded-lg border border-slate-600 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
              title="Yıl seçimi, ana şirket ve tema ayarları"
            >
              <Settings className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Ayarlar</span>
            </button>

            {/* Backup & SQL Button */}
            <button
              onClick={onOpenBackupModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium rounded-lg border border-slate-600 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
              title="SQL veritabanı yedeği indir, geri yükle veya snapshot incele (Ctrl+S)"
            >
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline">Yedekleme & SQL</span>
            </button>

            {/* PWA Install Button or Installed Badge */}
            {isInstalled ? (
              <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[11px] font-semibold rounded-lg">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Masaüstü Modu</span>
              </span>
            ) : (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 active:from-emerald-800 active:to-teal-800 text-white text-xs font-semibold rounded-lg border border-emerald-500 shadow-sm transition-colors whitespace-nowrap cursor-pointer animate-pulse hover:animate-none"
                title="Programı Chrome / Windows Masaüstü Uygulaması (PWA) olarak yükleyin"
              >
                <HardDrive className="w-3.5 h-3.5 text-emerald-200" />
                <span>Masaüstüne Yükle</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* PWA Installation Helper Modal */}
      {showPwaGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#181e26] border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-cyan-500/50">
                  <img src="/app-logo.png" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Masaüstüne / Telefona Yükle (PWA)</h3>
                  <p className="text-[11px] text-slate-400">Tek tıkla bağımsız masaüstü penceresi</p>
                </div>
              </div>
              <button
                onClick={() => setShowPwaGuide(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isInstallable ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Tarayıcınız uygulamayı tek tıkla masaüstünüze yüklemeye hazır!
                </p>
                <button
                  onClick={async () => {
                    await install();
                    setShowPwaGuide(false);
                  }}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Şimdi Yükle (Masaüstü Kısayolu Ekle)</span>
                </button>
              </div>
            ) : isIOS ? (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <Share2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">iPhone / iPad için:</strong>
                    Safari alt çubuğundaki <strong>Paylaş</strong> simgesine dokunun, ardından <strong>"Ana Ekrana Ekle"</strong> seçeneğini seçin.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <Monitor className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">Windows / Mac (Chrome & Edge):</strong>
                    Adres çubuğunun en sağındaki <strong>"Uygulamayı Yükle" (⊕ veya bilgisayar simgesi)</strong> butonuna tıklayarak bağımsız masaüstü programı olarak açabilirsiniz.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <Smartphone className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">Android (Chrome):</strong>
                    Tarayıcının sağ üstündeki <strong>⋮ (üç nokta)</strong> menüsüne dokunun ve <strong>"Uygulamayı Yükle"</strong> seçeneğine tıklayın.
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowPwaGuide(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
};
