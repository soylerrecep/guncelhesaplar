import React, { useState } from 'react';
import { CompanyAccount, CustomColumn, CustomColumnType } from '../types';
import {
  Columns,
  Plus,
  Trash2,
  X,
  FileText,
  CreditCard,
  Sparkles,
  Check,
  HelpCircle,
  Hash,
  Calendar,
  Type,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface CustomColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyAccount;
  onSaveColumns: (updatedColumns: CustomColumn[]) => void;
}

export const CustomColumnsModal: React.FC<CustomColumnsModalProps> = ({
  isOpen,
  onClose,
  company,
  onSaveColumns
}) => {
  const [columns, setColumns] = useState<CustomColumn[]>(() => company.customColumns || []);
  const [activeTab, setActiveTab] = useState<'invoice' | 'payment'>('invoice');

  // New column form state
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<CustomColumnType>('text');
  const [newColTarget, setNewColTarget] = useState<'invoice' | 'payment'>('invoice');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTabColumns = columns.filter((c) => c.target === activeTab);

  const handleAddColumn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const trimmed = newColName.trim();
    if (!trimmed) {
      setErrorMsg('Lütfen sütun adı giriniz (örn: İrsaliye No, Vade Tarihi, Miktar, Plaka).');
      return;
    }

    // Check duplicate name within same target
    const duplicate = columns.find(
      (c) => c.target === newColTarget && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg(`"${trimmed}" başlıklı bir sütun bu bölümde zaten mevcut.`);
      return;
    }

    const newCol: CustomColumn = {
      id: `col_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: trimmed,
      type: newColType,
      target: newColTarget,
      placeholder: newColType === 'date' ? 'YYYY-AA-GG (09-10)' : undefined
    };

    setColumns([...columns, newCol]);
    setNewColName('');
  };

  const handleDeleteColumn = (id: string) => {
    setColumns(columns.filter((c) => c.id !== id));
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    // Filter columns for this target, reorder, then rebuild full list
    const filtered = columns.filter((c) => c.target === activeTab);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= filtered.length) return;

    const item = filtered[index];
    filtered.splice(index, 1);
    filtered.splice(targetIdx, 0, item);

    const otherTargetColumns = columns.filter((c) => c.target !== activeTab);
    setColumns([...filtered, ...otherTargetColumns]);
  };

  // Preset Template loader
  const handleApplyPreset = (presetName: string) => {
    let presetCols: CustomColumn[] = [];
    const timestamp = Date.now();

    if (presetName === 'insaat') {
      presetCols = [
        { id: `col_${timestamp}_1`, name: 'İrsaliye No', type: 'text', target: 'invoice' },
        { id: `col_${timestamp}_2`, name: 'Malzeme Cinsi', type: 'text', target: 'invoice' },
        { id: `col_${timestamp}_3`, name: 'Miktar (Ton/Adet)', type: 'number', target: 'invoice' },
        { id: `col_${timestamp}_4`, name: 'Birim Fiyat', type: 'number', target: 'invoice' },
        { id: `col_${timestamp}_5`, name: 'Şantiye / Proje', type: 'text', target: 'invoice' }
      ];
    } else if (presetName === 'nakliye') {
      presetCols = [
        { id: `col_${timestamp}_1`, name: 'Plaka No', type: 'text', target: 'invoice' },
        { id: `col_${timestamp}_2`, name: 'İrsaliye No', type: 'text', target: 'invoice' },
        { id: `col_${timestamp}_3`, name: 'Tonaj / Litre', type: 'number', target: 'invoice' },
        { id: `col_${timestamp}_4`, name: 'Güzergah / Sefer', type: 'text', target: 'invoice' }
      ];
    } else if (presetName === 'vade') {
      presetCols = [
        { id: `col_${timestamp}_1`, name: 'İrsaliye No', type: 'text', target: 'invoice' },
        { id: `col_${timestamp}_2`, name: 'Vade Tarihi', type: 'date', target: 'invoice' },
        { id: `col_${timestamp}_3`, name: 'Sipariş No', type: 'text', target: 'invoice' },
        { id: `col_${timestamp}_4`, name: 'Vade Tarihi', type: 'date', target: 'payment' }
      ];
    } else if (presetName === 'cek') {
      presetCols = [
        { id: `col_${timestamp}_1`, name: 'Çek / Senet No', type: 'text', target: 'payment' },
        { id: `col_${timestamp}_2`, name: 'Vade Tarihi', type: 'date', target: 'payment' },
        { id: `col_${timestamp}_3`, name: 'Banka / Şube', type: 'text', target: 'payment' },
        { id: `col_${timestamp}_4`, name: 'Keşideci', type: 'text', target: 'payment' }
      ];
    }

    // Merge without duplicating existing names
    const merged = [...columns];
    for (const p of presetCols) {
      if (!merged.some((existing) => existing.target === p.target && existing.name.toLowerCase() === p.name.toLowerCase())) {
        merged.push(p);
      }
    }
    setColumns(merged);
  };

  const handleSaveAndClose = () => {
    onSaveColumns(columns);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#1a2029] border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#13171e] px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-950/70 text-sky-400 border border-sky-800">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>Özel Sütun Yönetimi</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700 font-mono">
                  {company.name}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Bu şirkete ait fatura veya ödeme tablolarına özel ek sütunlar tanımlayın.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Quick Preset Packs */}
          <div className="bg-[#202733] border border-slate-700/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Hızlı Sektörel Şablonlar (Tek Tıkla Ekle)</span>
              </span>
              <span className="text-[11px] text-slate-400">İsteğinize göre düzenleyebilirsiniz</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('insaat')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-sky-500 text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-white text-xs group-hover:text-sky-300">🏗️ İnşaat & Malzeme</div>
                <div className="text-[10px] text-slate-400 mt-0.5">İrsaliye, Malzeme, Miktar, Fiyat, Şantiye</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('nakliye')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-sky-500 text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-white text-xs group-hover:text-sky-300">🚚 Nakliye & Akaryakıt</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Plaka, İrsaliye, Tonaj/Litre, Sefer</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('vade')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-sky-500 text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-white text-xs group-hover:text-sky-300">⏱️ Vadeli Ticaret</div>
                <div className="text-[10px] text-slate-400 mt-0.5">İrsaliye No, Vade Tarihi, Sipariş No</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('cek')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500 text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-white text-xs group-hover:text-emerald-300">💳 Çek & Senet</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Çek No, Vade, Banka, Keşideci</div>
              </button>
            </div>
          </div>

          {/* New Custom Column Form */}
          <div className="bg-[#202733] border border-slate-700/80 rounded-xl p-4">
            <h4 className="font-bold text-slate-200 text-xs mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-sky-400" />
              <span>Yeni Özel Sütun Tanımla</span>
            </h4>

            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-[11px] flex items-center justify-between">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="font-bold cursor-pointer">✕</button>
              </div>
            )}

            <form onSubmit={handleAddColumn} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Column Name */}
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Sütun Başlığı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: İrsaliye No, Plaka..."
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Column Type */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Veri Türü *
                  </label>
                  <select
                    value={newColType}
                    onChange={(e) => setNewColType(e.target.value as CustomColumnType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="text">📝 Metin (Yazı / Kod / Plaka)</option>
                    <option value="number">🔢 Sayısal (Miktar / Fiyat)</option>
                    <option value="date">📅 Tarih (Vade / Sevk)</option>
                  </select>
                </div>

                {/* Target Section */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Eklenecek Bölüm *
                  </label>
                  <select
                    value={newColTarget}
                    onChange={(e) => setNewColTarget(e.target.value as 'invoice' | 'payment')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="invoice">🔴 Gelen Faturalar (Borç)</option>
                    <option value="payment">🟢 Yapılan Ödemeler (Alacak)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Sütunu Ekle</span>
                </button>
              </div>
            </form>
          </div>

          {/* Tab Switcher for Active Columns */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('invoice')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'invoice'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Gelen Faturalar Sütunları ({columns.filter((c) => c.target === 'invoice').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('payment')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'payment'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Yapılan Ödemeler Sütunları ({columns.filter((c) => c.target === 'payment').length})</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Toplam {columns.length} özel sütun aktif
              </span>
            </div>

            {/* Column List for Current Tab */}
            <div className="mt-3 space-y-2">
              {currentTabColumns.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-[#202733]/50 rounded-xl border border-dashed border-slate-700">
                  <Columns className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                  <p className="font-semibold">Bu bölüm için henüz özel sütun tanımlanmadı.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Yukarıdaki formdan veya hazır şablon butonlarından hemen ekleyebilirsiniz.
                  </p>
                </div>
              ) : (
                currentTabColumns.map((col, idx) => (
                  <div
                    key={col.id}
                    className="p-3 rounded-xl bg-[#202733] border border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500 text-[11px] w-5 text-center">
                        {idx + 1}.
                      </span>
                      <div>
                        <span className="font-bold text-white text-xs block">
                          {col.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                            col.type === 'number'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                              : col.type === 'date'
                              ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {col.type === 'number' ? '🔢 Sayısal' : col.type === 'date' ? '📅 Tarih' : '📝 Metin'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {col.target === 'invoice' ? 'Fatura tablosunda görünecek' : 'Ödeme tablosunda görünecek'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveColumn(idx, 'up')}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                        title="Yukarı Taşı"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === currentTabColumns.length - 1}
                        onClick={() => handleMoveColumn(idx, 'down')}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                        title="Aşağı Taşı"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-4 bg-slate-700 mx-1" />
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(col.id)}
                        className="p-1.5 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 transition-colors cursor-pointer"
                        title="Sütunu Kaldır"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#13171e] px-6 py-3.5 border-t border-slate-700/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Özel sütunlar doğrudan veritabanında saklanır ve ekstreye işlenir.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Sütunları Kaydet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
