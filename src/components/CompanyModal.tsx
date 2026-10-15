import React, { useState, useEffect } from 'react';
import { CompanyAccount } from '../types';
import { Building2, X, Trash2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyData: {
    id?: string;
    name: string;
    gridRow: number;
    gridCol: number;
    phone?: string;
    taxNumber?: string;
    notes?: string;
  }) => void;
  onDelete?: (companyId: string) => void;
  maxRowInUse?: number;
  initialData?: {
    company?: CompanyAccount;
    suggestedRow?: number;
    suggestedCol?: number;
  };
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  maxRowInUse = 4,
  initialData
}) => {
  const [name, setName] = useState('');
  const [gridRow, setGridRow] = useState(1);
  const [gridCol, setGridCol] = useState(1);
  const [phone, setPhone] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // In-app confirm modal for deletion
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (initialData?.company) {
      setName(initialData.company.name);
      setGridRow(initialData.company.gridRow);
      setGridCol(initialData.company.gridCol);
      setPhone(initialData.company.phone || '');
      setTaxNumber(initialData.company.taxNumber || '');
      setNotes(initialData.company.notes || '');
    } else {
      setName('');
      setGridRow(initialData?.suggestedRow || 1);
      setGridCol(initialData?.suggestedCol || 1);
      setPhone('');
      setTaxNumber('');
      setNotes('');
    }
    setErrorMsg(null);
    setIsConfirmDeleteOpen(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Lütfen şirket veya cari kart ünvanını giriniz.');
      return;
    }

    onSave({
      id: initialData?.company?.id,
      name: name.trim().toUpperCase(),
      gridRow,
      gridCol,
      phone: phone.trim() || undefined,
      taxNumber: taxNumber.trim() || undefined,
      notes: notes.trim() || undefined
    });
    onClose();
  };

  // Support dynamic rows from 1 up to max + 5 (limitless downwards)
  const availableRows = Math.max(10, (maxRowInUse || 4) + 4);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-[#181e26] border border-slate-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden text-slate-100">
          <div className="bg-[#12161c] px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              <h3 className="font-bold text-white text-sm">
                {initialData?.company ? 'Şirket Bilgilerini Düzenle' : 'Yeni Şirket / Cari Kart Ekle'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded bg-rose-950/70 border border-rose-800 text-rose-200">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Şirket / Cari Ünvanı *
              </label>
              <input
                type="text"
                required
                placeholder="Örn: ANADOLU İNŞAAT VE YAPI TİC. A.Ş."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-bold uppercase focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">
                  Tablo Satırı (Aşağıya Doğru) *
                </label>
                <select
                  value={gridRow}
                  onChange={(e) => setGridRow(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:border-sky-500 focus:outline-none"
                >
                  {Array.from({ length: availableRows }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}. Satır
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Tablo Sütunu (1 - 11) *
                </label>
                <select
                  value={gridCol}
                  onChange={(e) => setGridCol(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:border-sky-500 focus:outline-none"
                >
                  {Array.from({ length: 11 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}. Sütun
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Telefon</label>
                <input
                  type="text"
                  placeholder="05xx xxx xx xx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Vergi No / TC</label>
                <input
                  type="text"
                  placeholder="Vergi Kimlik No"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Özel Notlar</label>
              <textarea
                rows={2}
                placeholder="Ödeme vadesi, yetkili kişi veya banka hesap detayları..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {initialData?.company && onDelete ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Şirketi Sil</span>
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow transition-colors cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation modal for company deletion */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Şirketi ve Kayıtlarını Sil"
        message={`"${name}" şirketini ve bu şirkete ait tüm fatura ve ödeme kayıtlarını kalıcı olarak silmek istediğinize emin misiniz?`}
        confirmLabel="Evet, Şirketi Sil"
        onConfirm={() => {
          if (initialData?.company && onDelete) {
            onDelete(initialData.company.id);
            setIsConfirmDeleteOpen(false);
            onClose();
          }
        }}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </>
  );
};
