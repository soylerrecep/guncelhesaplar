import React, { useState, useRef } from 'react';
import { DatabaseState, BackupSnapshot, AppSettings, CompanyAccount, Invoice, Payment } from '../types';
import {
  generateSqlDumpScript,
  triggerFileDownload,
  exportToExcel,
  parseSqlDump
} from '../services/sqlService';
import { formatCurrencyTRY, formatDateTR, createAutoSnapshot } from '../services/storageService';
import { ConfirmModal } from './ConfirmModal';
import {
  Database,
  Download,
  Upload,
  History,
  FileSpreadsheet,
  FileCode,
  FileJson,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle,
  Plus,
  Check,
  Calendar,
  Building,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  onRestoreState: (
    restored: {
      accounts: CompanyAccount[];
      invoices: Invoice[];
      payments: Payment[];
      settings?: AppSettings;
    },
    label: string
  ) => void;
  onResetToDefault: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  state,
  onRestoreState,
  onResetToDefault
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'history' | 'danger'>('export');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [restoreSettings, setRestoreSettings] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewData, setPreviewData] = useState<{
    accounts: CompanyAccount[];
    invoices: Invoice[];
    payments: Payment[];
    settings?: AppSettings;
    fileName: string;
    fileSizeKB: string;
  } | null>(null);

  // In-app confirm modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
    requiredPassword?: string;
    passwordPlaceholder?: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {}
  });

  if (!isOpen) return null;

  const totalBalance = state.invoices.reduce((s, i) => s + i.amount, 0) - state.payments.reduce((s, p) => s + p.amount, 0);

  // Handle SQL Download
  const handleDownloadSql = () => {
    const sql = generateSqlDumpScript({
      accounts: state.accounts,
      invoices: state.invoices,
      payments: state.payments,
      settings: state.settings
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Cari_Hesaplar_SQL_Yedek_${dateStr}.sql`;
    triggerFileDownload(sql, filename, 'application/sql');
    setUploadSuccess(`SQL veritabanı yedeği başarıyla indirildi: ${filename}`);
  };

  // Handle JSON Download
  const handleDownloadJson = () => {
    const backupObj = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      accountCount: state.accounts.length,
      invoiceCount: state.invoices.length,
      paymentCount: state.payments.length,
      accounts: state.accounts,
      invoices: state.invoices,
      payments: state.payments,
      settings: state.settings
    };
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '-');
    const filename = `Cari_Hesaplar_Tam_Yedek_${dateStr}_${timeStr}.json`;
    triggerFileDownload(JSON.stringify(backupObj, null, 2), filename, 'application/json');
    setUploadSuccess(`JSON tam sistem yedeği başarıyla indirildi: ${filename}`);
  };

  // Handle Excel Download
  const handleDownloadExcel = () => {
    exportToExcel(state);
    setUploadSuccess('Excel çalışma kitabı oluşturuldu ve başarıyla indirildi.');
  };

  // Process a chosen or dropped file
  const processFile = (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);
    setPreviewData(null);

    const fileSizeKB = (file.size / 1024).toFixed(1) + ' KB';

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || text.trim().length === 0) {
          throw new Error('Dosya boş veya içeriği okunamadı.');
        }

        if (file.name.endsWith('.sql')) {
          const parsed = parseSqlDump(text);
          if (!parsed.accounts || parsed.accounts.length === 0) {
            throw new Error('Yüklenen .sql dosyasında geçerli şirket/hesap verisi bulunamadı.');
          }
          setPreviewData({
            accounts: parsed.accounts,
            invoices: parsed.invoices || [],
            payments: parsed.payments || [],
            settings: parsed.settings,
            fileName: file.name,
            fileSizeKB
          });
        } else if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          const accounts = parsed.accounts || parsed.data?.accounts;
          if (!accounts || !Array.isArray(accounts)) {
            throw new Error('Yüklenen .json dosyasında geçerli "accounts" listesi bulunamadı.');
          }
          const invoices = parsed.invoices || parsed.data?.invoices || [];
          const payments = parsed.payments || parsed.data?.payments || [];
          const settings = parsed.settings || parsed.data?.settings;

          setPreviewData({
            accounts,
            invoices,
            payments,
            settings,
            fileName: file.name,
            fileSizeKB
          });
        } else {
          throw new Error('Geçersiz dosya formatı. Lütfen sadece .json veya .sql uzantılı yedek dosyası yükleyiniz.');
        }
      } catch (err: any) {
        setUploadError(err.message || 'Yedek dosyası ayrıştırılamadı.');
      }
    };
    reader.onerror = () => {
      setUploadError('Dosya okunurken bir hata meydana geldi.');
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // File Upload input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Confirm and apply restore
  const handleApplyRestore = () => {
    if (!previewData) return;

    setConfirmModalState({
      isOpen: true,
      title: 'Yedeği Geri Yükle',
      message: `"${previewData.fileName}" dosyasındaki ${previewData.accounts.length} şirket, ${previewData.invoices.length} fatura ve ${previewData.payments.length} ödeme geri yüklenecektir. Mevcut verileriniz öncesinde otomatik olarak bir güvenlik noktasına kaydedilecektir. Devam edilsin mi?`,
      action: () => {
        onRestoreState(
          {
            accounts: previewData.accounts,
            invoices: previewData.invoices,
            payments: previewData.payments,
            settings: restoreSettings ? previewData.settings : undefined
          },
          `Yedekten Geri Yüklendi (${previewData.fileName})`
        );
        const fileName = previewData.fileName;
        setPreviewData(null);
        setUploadSuccess(`"${fileName}" yedeği başarıyla geri yüklendi!`);
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Manual snapshot creation
  const handleCreateManualSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newSnapshotLabel.trim() || `Manuel Güvenlik Noktası (${new Date().toLocaleTimeString('tr-TR')})`;
    createAutoSnapshot(state, label);
    setNewSnapshotLabel('');
    setIsCreatingSnapshot(false);
    setUploadSuccess(`"${label}" güvenlik noktası oluşturuldu.`);
  };

  // Download snapshot as JSON
  const handleDownloadSnapshot = (snap: BackupSnapshot) => {
    const backupObj = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      snapshotId: snap.id,
      snapshotLabel: snap.label,
      accounts: snap.data.accounts,
      invoices: snap.data.invoices,
      payments: snap.data.payments,
      settings: snap.data.settings
    };
    const filename = `Cari_Hesaplar_Nokta_${snap.label.replace(/\s+/g, '_')}.json`;
    triggerFileDownload(JSON.stringify(backupObj, null, 2), filename, 'application/json');
    setUploadSuccess(`"${snap.label}" güvenlik noktası JSON olarak indirildi.`);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-[#181e26] border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="bg-[#12161c] px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-950 text-sky-400 border border-sky-800 shadow-inner">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>SQL Veritabanı & Güvenli Yedekleme Merkezi</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Sıfır Kayıp
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  SQL, JSON ve Excel formatlarında tam yedek alın, güvenle geri yükleyin
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-700/80 bg-[#141920] px-6 text-xs">
            <button
              onClick={() => setActiveTab('export')}
              className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'export'
                  ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Yedek İndir (SQL / JSON / Excel)</span>
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'import'
                  ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Yedekten Geri Yükle</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Kurtarma Noktaları ({state.snapshots?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('danger')}
              className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 ml-auto transition-colors cursor-pointer ${
                activeTab === 'danger'
                  ? 'border-rose-500 text-rose-400 bg-rose-950/20'
                  : 'border-transparent text-slate-400 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Sıfırla</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto flex-1 text-xs">
            {uploadSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{uploadSuccess}</span>
                </div>
                <button
                  onClick={() => setUploadSuccess(null)}
                  className="text-emerald-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {uploadError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
                <button
                  onClick={() => setUploadError(null)}
                  className="text-rose-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* TAB 1: EXPORT */}
            {activeTab === 'export' && (
              <div className="space-y-4">
                {/* Status KPI Card */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 to-[#192231] border border-slate-700/80 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-950/80 border border-sky-800 flex items-center justify-center text-sky-400 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Aktif Sistem Durumu</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        <strong className="text-white">{state.accounts.length}</strong> Şirket ·{' '}
                        <strong className="text-rose-300">{state.invoices.length}</strong> Fatura ·{' '}
                        <strong className="text-emerald-300">{state.payments.length}</strong> Ödeme
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Net Bakiye</span>
                    <span className="font-mono text-sm font-bold text-slate-200 tabular-nums">
                      {formatCurrencyTRY(totalBalance, state.settings?.currency || '₺')}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-800/40 text-slate-300 text-[11px] leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    İndirilen tüm yedekler; özel sütunları, sütun sıralamalarını, fatura/ödeme mutabakat durumlarını ve çalışma yılı ayarlarınızı %100 eksiksiz korur.
                  </span>
                </div>

                {/* 3 Main Export Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* JSON Backup Button (Recommended) */}
                  <button
                    onClick={handleDownloadJson}
                    className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-amber-600/60 hover:border-amber-400 transition-all group cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40">
                      Önerilen
                    </div>
                    <FileJson className="w-8 h-8 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-white text-xs">JSON Tam Yedek (.json)</span>
                    <span className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      Tüm şirketler, faturalar, ayarlar ve özel sütunlar tek dosyada
                    </span>
                    <span className="mt-3 px-3 py-1 rounded-lg bg-amber-600 group-hover:bg-amber-500 text-white font-semibold text-[11px] shadow">
                      JSON İndir
                    </span>
                  </button>

                  {/* SQL Backup Button */}
                  <button
                    onClick={handleDownloadSql}
                    className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-sky-500 transition-all group cursor-pointer shadow-sm"
                  >
                    <FileCode className="w-8 h-8 text-sky-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-white text-xs">SQL Betiği (.sql)</span>
                    <span className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      CREATE TABLE, INSERT komutları ve tam veritabanı şeması
                    </span>
                    <span className="mt-3 px-3 py-1 rounded-lg bg-sky-600 group-hover:bg-sky-500 text-white font-semibold text-[11px] shadow">
                      SQL İndir
                    </span>
                  </button>

                  {/* Excel Export Button */}
                  <button
                    onClick={handleDownloadExcel}
                    className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-emerald-500 transition-all group cursor-pointer shadow-sm"
                  >
                    <FileSpreadsheet className="w-8 h-8 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-white text-xs">Excel Raporu (.xlsx)</span>
                    <span className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      Şirket bakiyeleri, faturalar ve ödemeler çok sayfalı tablo
                    </span>
                    <span className="mt-3 px-3 py-1 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 text-white font-semibold text-[11px] shadow">
                      Excel İndir
                    </span>
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Mevcut Durum: {state.accounts.length} Şirket · {state.invoices.length} Fatura · {state.payments.length} Ödeme</span>
                  <span className="font-mono text-slate-500">
                    Son Kayıt: {state.lastBackupDate ? formatDateTR(state.lastBackupDate) : 'Şimdi'}
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: IMPORT / RESTORE */}
            {activeTab === 'import' && (
              <div className="space-y-4">
                {/* Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-sky-400 bg-sky-950/40 scale-[1.01]'
                      : 'border-slate-700 hover:border-sky-500 bg-[#141920] hover:bg-slate-900/60'
                  }`}
                >
                  <Upload className="w-10 h-10 text-sky-400 mx-auto mb-2.5 animate-bounce" />
                  <p className="font-bold text-slate-100 text-sm">
                    Yedek Dosyasını Buraya Sürükleyip Bırakın
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    veya bilgisayarınızdan <strong className="text-white">.json</strong> ya da <strong className="text-white">.sql</strong> dosyası seçmek için tıklayın
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".sql,.json"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <span className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-semibold">
                    <Database className="w-3.5 h-3.5 text-sky-400" />
                    <span>Dosya Seç (.json / .sql)</span>
                  </span>
                </div>

                {/* File Verification & Preview Card */}
                {previewData && (
                  <div className="bg-slate-900 border border-sky-500/80 rounded-xl p-4 space-y-3.5 shadow-lg animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold text-white text-xs block">
                            {previewData.fileName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Boyut: {previewData.fileSizeKB} · Doğrulandı ve Geri Yüklemeye Hazır
                          </span>
                        </div>
                      </div>
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono">
                        Geçerli Yedek ✓
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center py-2 bg-slate-800/80 rounded-lg border border-slate-700">
                      <div>
                        <div className="text-[10px] text-slate-400">Geri Gelecek Şirket</div>
                        <div className="font-bold text-base text-white font-mono">{previewData.accounts.length}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Geri Gelecek Fatura</div>
                        <div className="font-bold text-base text-rose-300 font-mono">{previewData.invoices.length}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Geri Gelecek Ödeme</div>
                        <div className="font-bold text-base text-emerald-300 font-mono">{previewData.payments.length}</div>
                      </div>
                    </div>

                    {/* Settings checkbox if settings detected in backup */}
                    {previewData.settings && (
                      <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={restoreSettings}
                          onChange={(e) => setRestoreSettings(e.target.checked)}
                          className="w-4 h-4 text-sky-600 rounded bg-slate-900 border-slate-700"
                        />
                        <div className="text-[11px] text-slate-300">
                          <span>Yedekteki program ayarlarını da uygula:</span>{' '}
                          <strong className="text-white">{previewData.settings.mainCompanyName}</strong> ({previewData.settings.fiscalYear === 0 ? 'Tüm Yıllar' : `${previewData.settings.fiscalYear} Yılı`}, {previewData.settings.currency})
                        </div>
                      </label>
                    )}

                    {/* Mini Company Preview */}
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        İçerikteki İlk Şirketler:
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {previewData.accounts.slice(0, 8).map((acc) => (
                          <span
                            key={acc.id}
                            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[11px]"
                          >
                            {acc.name}
                          </span>
                        ))}
                        {previewData.accounts.length > 8 && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px]">
                            +{previewData.accounts.length - 8} şirket daha...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Safety guarantee */}
                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5 bg-slate-950/60 p-2 rounded border border-slate-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        Geri yükleme yapılmadan önce sistem mevcut durumunuzu otomatik güvenlik noktası olarak saklar.
                      </span>
                    </p>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => setPreviewData(null)}
                        className="px-3.5 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        Vazgeç
                      </button>
                      <button
                        onClick={handleApplyRestore}
                        className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Bu Yedeği Geri Yükle</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: HISTORY / SNAPSHOTS */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[11px] text-slate-400">
                    Sistem her ekleme ve silme işleminde otomatik güvenlik noktası oluşturur:
                  </p>

                  <button
                    onClick={() => setIsCreatingSnapshot(!isCreatingSnapshot)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 hover:bg-sky-900/60 font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-400" />
                    <span>Şimdi Manuel Nokta Oluştur</span>
                  </button>
                </div>

                {isCreatingSnapshot && (
                  <form
                    onSubmit={handleCreateManualSnapshot}
                    className="p-3 bg-slate-900 border border-sky-700/80 rounded-xl space-y-2 animate-in fade-in"
                  >
                    <div className="font-semibold text-white text-xs">Yeni Güvenlik Noktası Kaydet</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Örn: Fatura Girişi Öncesi Güvenlik Yedeği"
                        value={newSnapshotLabel}
                        onChange={(e) => setNewSnapshotLabel(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Kaydet
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingSnapshot(false)}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 cursor-pointer"
                      >
                        İptal
                      </button>
                    </div>
                  </form>
                )}

                {(!state.snapshots || state.snapshots.length === 0) ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Henüz kayıtlı geri yükleme noktası bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {state.snapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="p-3 bg-slate-900/80 border border-slate-800 hover:border-slate-600 rounded-xl flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-200 flex items-center gap-2 truncate">
                            <span className="truncate">{snap.label}</span>
                            <span className="text-[10px] font-mono text-slate-500 shrink-0">
                              {new Date(snap.timestamp).toLocaleTimeString('tr-TR')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {formatDateTR(snap.timestamp)} · <strong className="text-white">{snap.accountCount}</strong> Şirket ·{' '}
                            <strong className="text-rose-300">{snap.invoiceCount}</strong> Fatura ·{' '}
                            <strong className="text-emerald-300">{snap.paymentCount}</strong> Ödeme
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleDownloadSnapshot(snap)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500 transition-colors cursor-pointer"
                            title="Bu noktayı JSON dosyası olarak indir"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setConfirmModalState({
                                isOpen: true,
                                title: 'Geri Yükleme Noktasına Dön',
                                message: `"${snap.label}" noktasına geri dönmek istediğinize emin misiniz? Mevcut durumunuz öncesinde otomatik yedeklenecektir.`,
                                action: () => {
                                  onRestoreState(snap.data, `Noktaya Geri Dönüldü: ${snap.label}`);
                                  setUploadSuccess(`Sistem "${snap.label}" noktasına başarıyla geri döndürüldü.`);
                                  setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
                                }
                              });
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold rounded-lg border border-slate-700 hover:border-sky-500 transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer text-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Geri Yükle</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: DANGER / RESET */}
            {activeTab === 'danger' && (
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/60 space-y-4">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Tüm Şirket ve Bakiyeleri Sıfırla (0 Veri)</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Bu işlem sistemdeki tüm şirket kayıtlarını, faturaları ve ödemeleri tamamen silerek programı boş (0 kayıt) durumuna getirir.
                </p>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-semibold">Güvenlik Notu:</span> Sıfırlama işlemine başlamadan hemen önce mevcut tüm verileriniz otomatik bir kurtarma noktası olarak arşivlenir.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModalState({
                      isOpen: true,
                      title: 'Tüm Şirket Kayıtlarını Sıfırla',
                      message: 'Tüm şirketler, faturalar ve ödemeler tamamen temizlenecektir. Sıfırlamadan hemen önce otomatik bir güvenlik yedeği alınacaktır. Bu işlemi onaylamak için lütfen sıfırlama şifresini giriniz:',
                      requiredPassword: '363696',
                      passwordPlaceholder: 'Sıfırlama şifresini giriniz...',
                      confirmLabel: 'Şifreyi Doğrula ve Sıfırla',
                      isDanger: true,
                      action: () => {
                        onResetToDefault();
                        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
                        onClose();
                      }
                    });
                  }}
                  className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Evet, Tüm Verileri Sıfırla (Şifre Korumalı)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmLabel={confirmModalState.confirmLabel}
        cancelLabel={confirmModalState.cancelLabel}
        isDanger={confirmModalState.isDanger}
        requiredPassword={confirmModalState.requiredPassword}
        passwordPlaceholder={confirmModalState.passwordPlaceholder}
        onConfirm={confirmModalState.action}
        onCancel={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};
