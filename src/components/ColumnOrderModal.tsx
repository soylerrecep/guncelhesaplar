import React, { useState, useEffect } from 'react';
import { CompanyAccount, CustomColumn } from '../types';
import {
  ArrowLeftRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  X,
  GripVertical,
  FileText,
  CreditCard,
  Columns,
  Sparkles
} from 'lucide-react';

interface ColumnItem {
  id: string;
  name: string;
  isCore: boolean;
  type?: string;
}

interface ColumnOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyAccount;
  initialTab?: 'invoice' | 'payment';
  onSaveOrder: (invoiceOrder: string[], paymentOrder: string[]) => void;
}

export const DEFAULT_INVOICE_ORDER = ['date', 'amount', 'invoiceNo', 'description'];
export const DEFAULT_PAYMENT_ORDER = ['date', 'amount', 'paymentMethod', 'description'];

export const ColumnOrderModal: React.FC<ColumnOrderModalProps> = ({
  isOpen,
  onClose,
  company,
  initialTab = 'invoice',
  onSaveOrder
}) => {
  const [activeTab, setActiveTab] = useState<'invoice' | 'payment'>(initialTab);

  const invoiceColumns: CustomColumn[] = (company.customColumns || []).filter(
    (c) => c.target === 'invoice'
  );
  const paymentColumns: CustomColumn[] = (company.customColumns || []).filter(
    (c) => c.target === 'payment'
  );

  // Helper to build canonical list of column items for invoices
  const buildInvoiceColumnsList = (order?: string[]): ColumnItem[] => {
    const allItems: Record<string, ColumnItem> = {
      date: { id: 'date', name: 'Tarih', isCore: true, type: 'date' },
      amount: { id: 'amount', name: 'Tutar', isCore: true, type: 'number' },
      invoiceNo: { id: 'invoiceNo', name: 'Fatura No', isCore: true, type: 'text' },
      description: { id: 'description', name: 'Açıklama', isCore: true, type: 'text' }
    };
    invoiceColumns.forEach((c) => {
      allItems[c.id] = { id: c.id, name: c.name, isCore: false, type: c.type };
    });

    const activeOrder = order && order.length > 0 ? order : DEFAULT_INVOICE_ORDER;
    const result: ColumnItem[] = [];

    // Add ordered ones
    activeOrder.forEach((id) => {
      if (allItems[id]) {
        result.push(allItems[id]);
        delete allItems[id];
      }
    });

    // Add any remaining (e.g. newly added custom columns)
    Object.values(allItems).forEach((item) => {
      result.push(item);
    });

    return result;
  };

  // Helper to build canonical list of column items for payments
  const buildPaymentColumnsList = (order?: string[]): ColumnItem[] => {
    const allItems: Record<string, ColumnItem> = {
      date: { id: 'date', name: 'Tarih', isCore: true, type: 'date' },
      amount: { id: 'amount', name: 'Miktar', isCore: true, type: 'number' },
      paymentMethod: { id: 'paymentMethod', name: 'Ödeme Türü', isCore: true, type: 'text' },
      description: { id: 'description', name: 'Açıklama', isCore: true, type: 'text' }
    };
    paymentColumns.forEach((c) => {
      allItems[c.id] = { id: c.id, name: c.name, isCore: false, type: c.type };
    });

    const activeOrder = order && order.length > 0 ? order : DEFAULT_PAYMENT_ORDER;
    const result: ColumnItem[] = [];

    // Add ordered ones
    activeOrder.forEach((id) => {
      if (allItems[id]) {
        result.push(allItems[id]);
        delete allItems[id];
      }
    });

    // Add any remaining
    Object.values(allItems).forEach((item) => {
      result.push(item);
    });

    return result;
  };

  const [invoiceCols, setInvoiceCols] = useState<ColumnItem[]>(() =>
    buildInvoiceColumnsList(company.invoiceColumnOrder)
  );
  const [paymentCols, setPaymentCols] = useState<ColumnItem[]>(() =>
    buildPaymentColumnsList(company.paymentColumnOrder)
  );

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInvoiceCols(buildInvoiceColumnsList(company.invoiceColumnOrder));
      setPaymentCols(buildPaymentColumnsList(company.paymentColumnOrder));
      setActiveTab(initialTab);
    }
  }, [isOpen, company, initialTab]);

  if (!isOpen) return null;

  const currentList = activeTab === 'invoice' ? invoiceCols : paymentCols;
  const setCurrentList = (updater: (prev: ColumnItem[]) => ColumnItem[]) => {
    if (activeTab === 'invoice') {
      setInvoiceCols(updater);
    } else {
      setPaymentCols(updater);
    }
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    setCurrentList((prev) => {
      const next = [...prev];
      const item = next[index];
      next.splice(index, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
  };

  const resetToDefault = () => {
    if (activeTab === 'invoice') {
      setInvoiceCols(buildInvoiceColumnsList(DEFAULT_INVOICE_ORDER));
    } else {
      setPaymentCols(buildPaymentColumnsList(DEFAULT_PAYMENT_ORDER));
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) return;

    setCurrentList((prev) => {
      const next = [...prev];
      const [item] = next.splice(draggedIdx, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
    setDraggedIdx(null);
  };

  const handleSave = () => {
    const invOrder = invoiceCols.map((c) => c.id);
    const payOrder = paymentCols.map((c) => c.id);
    onSaveOrder(invOrder, payOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#1e232c] border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-sky-400">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Sütun Sıralaması ve Düzeni</h2>
              <p className="text-xs text-slate-400">
                Sütunların yerlerini yukarı-aşağı taşıyarak veya sürükleyerek değiştirebilirsiniz.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 mt-4">
          <button
            type="button"
            onClick={() => setActiveTab('invoice')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'invoice'
                ? 'border-rose-500 text-rose-300 bg-rose-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>Gelen Faturalar Tablosu ({invoiceCols.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'payment'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Yapılan Ödemeler Tablosu ({paymentCols.length})</span>
          </button>
        </div>

        {/* Info banner & Reset Button */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Asıl standart sıra: <strong>Tarih → Tutar → {activeTab === 'invoice' ? 'Fatura No' : 'Ödeme Türü'} → Açıklama</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={resetToDefault}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
            title="Asıl standart sıraya döndür"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Asıl Sıraya Dön</span>
          </button>
        </div>

        {/* Columns List (Reorderable) */}
        <div className="flex-1 overflow-y-auto my-4 space-y-2 pr-1 max-h-[360px]">
          {currentList.map((col, index) => (
            <div
              key={col.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all select-none ${
                draggedIdx === index
                  ? 'opacity-40 border-dashed border-sky-400 bg-slate-800'
                  : 'bg-[#181d26] border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-0.5">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-mono font-bold text-slate-300">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">{col.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        col.isCore
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-sky-950 text-sky-300 border border-sky-800'
                      }`}
                    >
                      {col.isCore ? 'Asıl Sütun' : 'Özel Sütun'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {col.id === 'date'
                      ? 'Tarih formatı'
                      : col.id === 'amount'
                      ? 'Sayısal Tutar'
                      : col.id === 'invoiceNo'
                      ? 'Belge Seri/Sıra No'
                      : col.id === 'paymentMethod'
                      ? 'Banka, Çek, vb.'
                      : col.type === 'number'
                      ? 'Sayısal Özel Alan'
                      : col.type === 'date'
                      ? 'Tarih Özel Alan'
                      : 'Metin Alanı'}
                  </span>
                </div>
              </div>

              {/* Up & Down Arrows */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveColumn(index, 'up')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  title="Yukarı Taşı"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === currentList.length - 1}
                  onClick={() => moveColumn(index, 'down')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  title="Aşağı Taşı"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Sıralamayı Kaydet ve Uygula</span>
          </button>
        </div>
      </div>
    </div>
  );
};
