import React, { useState, useRef, useEffect } from 'react';
import { CompanyAccount, Invoice, Payment, PaymentMethod, AppSettings, CustomColumn } from '../types';
import { formatCurrencyTRY, formatDateTR } from '../services/storageService';
import { ConfirmModal } from './ConfirmModal';
import { SmartDateInput } from './SmartDateInput';
import { PrintStatementModal } from './PrintStatementModal';
import { CustomColumnsModal } from './CustomColumnsModal';
import {
  ColumnOrderModal,
  DEFAULT_INVOICE_ORDER,
  DEFAULT_PAYMENT_ORDER
} from './ColumnOrderModal';
import {
  ArrowLeft,
  FileText,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Printer,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Check,
  Columns,
  Sparkles,
  Settings2,
  Copy,
  CornerDownLeft,
  Keyboard,
  ArrowDownCircle,
  ArrowUpCircle,
  SlidersHorizontal,
  ArrowLeftRight,
  GripVertical
} from 'lucide-react';

interface CompanyDetailProps {
  company: CompanyAccount;
  invoices: Invoice[];
  payments: Payment[];
  settings: AppSettings;
  onBack: () => void;
  onAddInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onUpdateInvoice: (invoice: Invoice) => void;
  onAddPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => void;
  onDeletePayment: (paymentId: string) => void;
  onUpdatePayment: (payment: Payment) => void;
  onEditCompany: (company: CompanyAccount) => void;
  onUpdateCompany?: (company: CompanyAccount) => void;
}

export const CompanyDetail: React.FC<CompanyDetailProps> = ({
  company,
  invoices,
  payments,
  settings,
  onBack,
  onAddInvoice,
  onDeleteInvoice,
  onUpdateInvoice,
  onAddPayment,
  onDeletePayment,
  onUpdatePayment,
  onEditCompany,
  onUpdateCompany
}) => {
  const currency = settings.currency || '₺';
  const fiscalYear = settings.fiscalYear || new Date().getFullYear();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Custom columns configured for this specific company
  const invoiceColumns: CustomColumn[] = (company.customColumns || []).filter(
    (c) => c.target === 'invoice'
  );
  const paymentColumns: CustomColumn[] = (company.customColumns || []).filter(
    (c) => c.target === 'payment'
  );

  // Helper to compute resolved column order for invoices
  // Asıl / Default: TARİH → TUTAR → FATURA NO → AÇIKLAMA → [Özel Sütunlar...]
  const getResolvedInvoiceColOrder = (): string[] => {
    const customIds = invoiceColumns.map((c) => c.id);
    const baseOrder =
      company.invoiceColumnOrder && company.invoiceColumnOrder.length > 0
        ? company.invoiceColumnOrder
        : DEFAULT_INVOICE_ORDER;
    const allAvailable = ['date', 'amount', 'invoiceNo', 'description', ...customIds];
    const ordered: string[] = [];

    baseOrder.forEach((id) => {
      if (allAvailable.includes(id) && !ordered.includes(id)) {
        ordered.push(id);
      }
    });
    allAvailable.forEach((id) => {
      if (!ordered.includes(id)) {
        ordered.push(id);
      }
    });
    return ordered;
  };

  // Helper to compute resolved column order for payments
  // Asıl / Default: TARİH → MİKTAR (TUTAR) → ÖDEME TÜRÜ → AÇIKLAMA → [Özel Sütunlar...]
  const getResolvedPaymentColOrder = (): string[] => {
    const customIds = paymentColumns.map((c) => c.id);
    const baseOrder =
      company.paymentColumnOrder && company.paymentColumnOrder.length > 0
        ? company.paymentColumnOrder
        : DEFAULT_PAYMENT_ORDER;
    const allAvailable = ['date', 'amount', 'paymentMethod', 'description', ...customIds];
    const ordered: string[] = [];

    baseOrder.forEach((id) => {
      if (allAvailable.includes(id) && !ordered.includes(id)) {
        ordered.push(id);
      }
    });
    allAvailable.forEach((id) => {
      if (!ordered.includes(id)) {
        ordered.push(id);
      }
    });
    return ordered;
  };

  // State of ordered columns
  const [invoiceColOrder, setInvoiceColOrder] = useState<string[]>(getResolvedInvoiceColOrder);
  const [paymentColOrder, setPaymentColOrder] = useState<string[]>(getResolvedPaymentColOrder);

  // Sync state whenever company columns or orders change
  useEffect(() => {
    setInvoiceColOrder(getResolvedInvoiceColOrder());
  }, [company.invoiceColumnOrder, company.customColumns]);

  useEffect(() => {
    setPaymentColOrder(getResolvedPaymentColOrder());
  }, [company.paymentColumnOrder, company.customColumns]);

  // Drag and drop state for headers
  const [draggedInvoiceCol, setDraggedInvoiceCol] = useState<string | null>(null);
  const [dragOverInvoiceCol, setDragOverInvoiceCol] = useState<string | null>(null);

  const [draggedPaymentCol, setDraggedPaymentCol] = useState<string | null>(null);
  const [dragOverPaymentCol, setDragOverPaymentCol] = useState<string | null>(null);

  // Modal for fine-grained column ordering
  const [isColumnOrderModalOpen, setIsColumnOrderModalOpen] = useState(false);
  const [orderModalTab, setOrderModalTab] = useState<'invoice' | 'payment'>('invoice');

  // Excel Input Row Position state (bottom = standard Excel append; top = pinned right below header)
  const [invRowPos, setInvRowPos] = useState<'bottom' | 'top'>('bottom');
  const [payRowPos, setPayRowPos] = useState<'bottom' | 'top'>('bottom');

  // Optional expanded form view toggles
  const [showExpandedInvForm, setShowExpandedInvForm] = useState(false);
  const [showExpandedPayForm, setShowExpandedPayForm] = useState(false);

  // Feedback banner for Ctrl+D, Excel operations, and column moves
  const [excelFeedback, setExcelFeedback] = useState<{
    text: string;
    type: 'success' | 'info' | 'warn';
  } | null>(null);

  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showFeedback = (text: string, type: 'success' | 'info' | 'warn' = 'success') => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setExcelFeedback({ text, type });
    feedbackTimerRef.current = setTimeout(() => {
      setExcelFeedback(null);
    }, 2400);
  };

  // Form states (Excel Row & Modal inputs)
  const [invDate, setInvDate] = useState(todayStr);
  const [invNo, setInvNo] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invDesc, setInvDesc] = useState('');
  const [invCustomFields, setInvCustomFields] = useState<Record<string, any>>({});

  const [payDate, setPayDate] = useState(todayStr);
  const [payAmount, setPayAmount] = useState('');
  const [payDesc, setPayDesc] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Banka Havalesi/EFT');
  const [payCustomFields, setPayCustomFields] = useState<Record<string, any>>({});

  // Input refs for keyboard navigation and rapid entry
  const invNoInputRef = useRef<HTMLInputElement>(null);
  const invAmountInputRef = useRef<HTMLInputElement>(null);
  const payAmountInputRef = useRef<HTMLInputElement>(null);
  const invoiceTableBottomRef = useRef<HTMLTableRowElement>(null);
  const paymentTableBottomRef = useRef<HTMLTableRowElement>(null);

  // Edit states
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  // Modals state
  const [isCustomColModalOpen, setIsCustomColModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {}
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Totals & Balance
  const totalInvoices = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPayments = payments.reduce((sum, pay) => sum + pay.amount, 0);
  const balance = totalInvoices - totalPayments;

  // Mutabakat (Reconciliation) calculations
  const reconciledInvoicesCount = invoices.filter((i) => i.isReconciled).length;
  const reconciledInvoicesAmount = invoices.filter((i) => i.isReconciled).reduce((s, i) => s + i.amount, 0);

  const reconciledPaymentsCount = payments.filter((p) => p.isReconciled).length;
  const reconciledPaymentsAmount = payments.filter((p) => p.isReconciled).reduce((s, p) => s + p.amount, 0);

  // Identify "Above Row" (Üst Satır) in invoices
  const getAboveInvoice = (): Invoice | null => {
    if (invoices.length === 0) return null;
    return invRowPos === 'bottom' ? invoices[invoices.length - 1] : invoices[0];
  };

  // Identify "Above Row" (Üst Satır) in payments
  const getAbovePayment = (): Payment | null => {
    if (payments.length === 0) return null;
    return payRowPos === 'bottom' ? payments[payments.length - 1] : payments[0];
  };

  // Reordering handlers for Invoices
  const handleReorderInvoiceCols = (newOrder: string[]) => {
    setInvoiceColOrder(newOrder);
    if (onUpdateCompany) {
      onUpdateCompany({
        ...company,
        invoiceColumnOrder: newOrder,
        updatedAt: new Date().toISOString()
      });
    }
    showFeedback('✓ Fatura sütun sıralaması güncellendi');
  };

  const handleInvoiceHeaderDrop = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const curr = [...invoiceColOrder];
    const srcIdx = curr.indexOf(sourceId);
    const tgtIdx = curr.indexOf(targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    curr.splice(srcIdx, 1);
    curr.splice(tgtIdx, 0, sourceId);
    handleReorderInvoiceCols(curr);
  };

  // Reordering handlers for Payments
  const handleReorderPaymentCols = (newOrder: string[]) => {
    setPaymentColOrder(newOrder);
    if (onUpdateCompany) {
      onUpdateCompany({
        ...company,
        paymentColumnOrder: newOrder,
        updatedAt: new Date().toISOString()
      });
    }
    showFeedback('✓ Ödeme sütun sıralaması güncellendi');
  };

  const handlePaymentHeaderDrop = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const curr = [...paymentColOrder];
    const srcIdx = curr.indexOf(sourceId);
    const tgtIdx = curr.indexOf(targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    curr.splice(srcIdx, 1);
    curr.splice(tgtIdx, 0, sourceId);
    handleReorderPaymentCols(curr);
  };

  // Reset to default orders (Tarih → Tutar → Fatura No / Tür → Açıklama)
  const handleResetToDefaultOrder = (type: 'invoice' | 'payment') => {
    if (type === 'invoice') {
      const customIds = invoiceColumns.map((c) => c.id);
      const newOrder = [...DEFAULT_INVOICE_ORDER, ...customIds];
      handleReorderInvoiceCols(newOrder);
      showFeedback('✓ Asıl sıralamaya döndürüldü (Tarih - Tutar - Fatura No - Açıklama)');
    } else {
      const customIds = paymentColumns.map((c) => c.id);
      const newOrder = [...DEFAULT_PAYMENT_ORDER, ...customIds];
      handleReorderPaymentCols(newOrder);
      showFeedback('✓ Asıl sıralamaya döndürüldü (Tarih - Miktar - Tür - Açıklama)');
    }
  };

  // Save from ColumnOrderModal
  const handleSaveModalOrders = (invOrder: string[], payOrder: string[]) => {
    setInvoiceColOrder(invOrder);
    setPaymentColOrder(payOrder);
    if (onUpdateCompany) {
      onUpdateCompany({
        ...company,
        invoiceColumnOrder: invOrder,
        paymentColumnOrder: payOrder,
        updatedAt: new Date().toISOString()
      });
    }
    showFeedback('✓ Sütun düzeni kaydedildi');
  };

  // =========================================================================
  // MUTABAKAT (RECONCILIATION) TOGGLE HANDLERS
  // =========================================================================
  const handleToggleInvoiceReconciled = (inv: Invoice) => {
    const updated: Invoice = {
      ...inv,
      isReconciled: !inv.isReconciled
    };
    onUpdateInvoice(updated);
    showFeedback(
      updated.isReconciled
        ? `✓ Fatura (${inv.invoiceNo}) mutabık olarak işaretlendi`
        : `Fatura (${inv.invoiceNo}) mutabakat işareti kaldırıldı`,
      updated.isReconciled ? 'success' : 'info'
    );
  };

  const handleTogglePaymentReconciled = (pay: Payment) => {
    const updated: Payment = {
      ...pay,
      isReconciled: !pay.isReconciled
    };
    onUpdatePayment(updated);
    showFeedback(
      updated.isReconciled
        ? `✓ Ödeme kaydı mutabık olarak işaretlendi`
        : `Ödeme kaydı mutabakat işareti kaldırıldı`,
      updated.isReconciled ? 'success' : 'info'
    );
  };

  const handleToggleAllInvoicesReconciled = () => {
    if (invoices.length === 0) return;
    const allAlreadyReconciled = invoices.every((i) => i.isReconciled);
    const targetState = !allAlreadyReconciled;
    invoices.forEach((inv) => {
      if (inv.isReconciled !== targetState) {
        onUpdateInvoice({ ...inv, isReconciled: targetState });
      }
    });
    showFeedback(
      targetState
        ? '✓ Tüm faturalar mutabık olarak işaretlendi'
        : 'Tüm faturaların mutabakat işareti kaldırıldı'
    );
  };

  const handleToggleAllPaymentsReconciled = () => {
    if (payments.length === 0) return;
    const allAlreadyReconciled = payments.every((p) => p.isReconciled);
    const targetState = !allAlreadyReconciled;
    payments.forEach((pay) => {
      if (pay.isReconciled !== targetState) {
        onUpdatePayment({ ...pay, isReconciled: targetState });
      }
    });
    showFeedback(
      targetState
        ? '✓ Tüm ödemeler mutabık olarak işaretlendi'
        : 'Tüm ödemelerin mutabakat işareti kaldırıldı'
    );
  };

  // =========================================================================
  // CTRL + D (FILL DOWN) FOR INVOICE CELLS
  // =========================================================================
  const copyInvoiceFieldFromAbove = (fieldName: string) => {
    const above = getAboveInvoice();
    if (!above) {
      showFeedback('Üstte kopyalanacak fatura satırı bulunmuyor', 'warn');
      return;
    }

    if (fieldName === 'date') {
      setInvDate(above.date);
      showFeedback(`Tarih kopyalandı: ${formatDateTR(above.date)}`);
    } else if (fieldName === 'invoiceNo') {
      setInvNo(above.invoiceNo);
      showFeedback(`Fatura No kopyalandı: ${above.invoiceNo}`);
    } else if (fieldName === 'description') {
      setInvDesc(above.description || '');
      showFeedback(
        above.description
          ? `Açıklama kopyalandı: "${above.description}"`
          : 'Üst satırın açıklaması boş'
      );
    } else if (fieldName === 'amount') {
      setInvAmount(above.amount.toString());
      showFeedback(`Tutar kopyalandı: ${formatCurrencyTRY(above.amount, currency)}`);
    } else {
      // Dynamic custom column
      const col = invoiceColumns.find((c) => c.id === fieldName);
      const val = above.customFields?.[fieldName];
      if (val !== undefined && val !== '') {
        setInvCustomFields((prev) => ({ ...prev, [fieldName]: val }));
        showFeedback(`${col?.name || 'Özel sütun'} kopyalandı: ${val}`);
      } else {
        setInvCustomFields((prev) => ({ ...prev, [fieldName]: '' }));
        showFeedback(`${col?.name || 'Özel sütun'} üst satırda boş`, 'info');
      }
    }
  };

  // Copy entire invoice row from above (Ctrl+D on row level)
  const copyAllInvoiceFromAbove = () => {
    const above = getAboveInvoice();
    if (!above) {
      showFeedback('Üstte kopyalanacak fatura satırı bulunmuyor', 'warn');
      return;
    }
    setInvDate(above.date);
    setInvNo(above.invoiceNo);
    setInvDesc(above.description || '');
    setInvAmount(above.amount.toString());
    if (above.customFields) {
      setInvCustomFields({ ...above.customFields });
    } else {
      setInvCustomFields({});
    }
    showFeedback('✓ Üst satırdaki tüm veriler kopyalandı (Ctrl+D)');
  };

  // =========================================================================
  // CTRL + D (FILL DOWN) FOR PAYMENT CELLS
  // =========================================================================
  const copyPaymentFieldFromAbove = (fieldName: string) => {
    const above = getAbovePayment();
    if (!above) {
      showFeedback('Üstte kopyalanacak ödeme satırı bulunmuyor', 'warn');
      return;
    }

    if (fieldName === 'date') {
      setPayDate(above.date);
      showFeedback(`Tarih kopyalandı: ${formatDateTR(above.date)}`);
    } else if (fieldName === 'paymentMethod') {
      setPayMethod(above.paymentMethod);
      showFeedback(`Ödeme Türü kopyalandı: ${above.paymentMethod}`);
    } else if (fieldName === 'description') {
      setPayDesc(above.description || '');
      showFeedback(
        above.description
          ? `Açıklama kopyalandı: "${above.description}"`
          : 'Üst satırın açıklaması boş'
      );
    } else if (fieldName === 'amount') {
      setPayAmount(above.amount.toString());
      showFeedback(`Miktar kopyalandı: ${formatCurrencyTRY(above.amount, currency)}`);
    } else {
      // Dynamic custom column
      const col = paymentColumns.find((c) => c.id === fieldName);
      const val = above.customFields?.[fieldName];
      if (val !== undefined && val !== '') {
        setPayCustomFields((prev) => ({ ...prev, [fieldName]: val }));
        showFeedback(`${col?.name || 'Özel sütun'} kopyalandı: ${val}`);
      } else {
        setPayCustomFields((prev) => ({ ...prev, [fieldName]: '' }));
        showFeedback(`${col?.name || 'Özel sütun'} üst satırda boş`, 'info');
      }
    }
  };

  // Copy entire payment row from above (Ctrl+D on row level)
  const copyAllPaymentFromAbove = () => {
    const above = getAbovePayment();
    if (!above) {
      showFeedback('Üstte kopyalanacak ödeme satırı bulunmuyor', 'warn');
      return;
    }
    setPayDate(above.date);
    setPayMethod(above.paymentMethod);
    setPayDesc(above.description || '');
    setPayAmount(above.amount.toString());
    if (above.customFields) {
      setPayCustomFields({ ...above.customFields });
    } else {
      setPayCustomFields({});
    }
    showFeedback('✓ Üst satırdaki tüm veriler kopyalandı (Ctrl+D)');
  };

  // =========================================================================
  // SUBMIT HANDLERS (0 TUTAR GEÇERLİDİR)
  // =========================================================================
  const submitInvoice = () => {
    setFormError(null);
    const amountVal = parseFloat(invAmount.replace(',', '.'));
    // 0 tutar girilebilir (amountVal >= 0), negatif tutar engellenir
    if (!invNo.trim() || isNaN(amountVal) || amountVal < 0) {
      setFormError('Lütfen geçerli bir Fatura Numarası ve Tutar (0 veya üzeri) giriniz.');
      if (isNaN(amountVal) || amountVal < 0) {
        invAmountInputRef.current?.focus();
      } else {
        invNoInputRef.current?.focus();
      }
      return false;
    }

    onAddInvoice({
      companyId: company.id,
      date: invDate,
      invoiceNo: invNo.trim().toUpperCase(),
      amount: amountVal,
      description: invDesc.trim(),
      customFields: Object.keys(invCustomFields).length > 0 ? invCustomFields : undefined
    });

    setInvNo('');
    setInvAmount('');
    setInvDesc('');
    setInvCustomFields({});
    showFeedback('✓ Fatura başarıyla eklendi (Enter)');

    setTimeout(() => {
      // Focus on amount or invNo depending on which comes first in active order
      const firstInputCol = invoiceColOrder.find((c) => c !== 'date') || 'amount';
      if (firstInputCol === 'amount') {
        invAmountInputRef.current?.focus();
      } else {
        invNoInputRef.current?.focus();
      }
      if (invRowPos === 'bottom') {
        invoiceTableBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);

    return true;
  };

  const submitPayment = () => {
    setFormError(null);
    const amountVal = parseFloat(payAmount.replace(',', '.'));
    // 0 tutar girilebilir (amountVal >= 0), negatif tutar engellenir
    if (isNaN(amountVal) || amountVal < 0) {
      setFormError('Lütfen geçerli bir Ödeme Tutarı (0 veya üzeri) giriniz.');
      payAmountInputRef.current?.focus();
      return false;
    }

    onAddPayment({
      companyId: company.id,
      date: payDate,
      amount: amountVal,
      description: payDesc.trim(),
      paymentMethod: payMethod,
      customFields: Object.keys(payCustomFields).length > 0 ? payCustomFields : undefined
    });

    setPayAmount('');
    setPayDesc('');
    setPayCustomFields({});
    showFeedback('✓ Ödeme kaydı başarıyla eklendi (Enter)');

    setTimeout(() => {
      payAmountInputRef.current?.focus();
      if (payRowPos === 'bottom') {
        paymentTableBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);

    return true;
  };

  // Keyboard navigation handler for Invoice Excel Row
  const handleInvoiceCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    fieldName: string
  ) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) {
        copyAllInvoiceFromAbove();
      } else {
        copyInvoiceFieldFromAbove(fieldName);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      submitInvoice();
    }
  };

  // Keyboard navigation handler for Payment Excel Row
  const handlePaymentCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    fieldName: string
  ) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) {
        copyAllPaymentFromAbove();
      } else {
        copyPaymentFieldFromAbove(fieldName);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      submitPayment();
    }
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleSaveCustomColumns = (updatedColumns: CustomColumn[]) => {
    if (onUpdateCompany) {
      onUpdateCompany({
        ...company,
        customColumns: updatedColumns,
        updatedAt: new Date().toISOString()
      });
      showFeedback('✓ Özel sütunlar güncellendi');
    }
  };

  // =========================================================================
  // METADATA HELPERS FOR DYNAMIC HEADERS
  // =========================================================================
  const getInvoiceColMeta = (colId: string) => {
    if (colId === 'date') {
      return { id: 'date', name: 'Tarih', type: 'date', minWidth: 'min-w-[125px]', isCore: true, align: 'left' };
    }
    if (colId === 'amount') {
      return { id: 'amount', name: `Tutar (${currency})`, type: 'number', minWidth: 'min-w-[125px]', isCore: true, align: 'right' };
    }
    if (colId === 'invoiceNo') {
      return { id: 'invoiceNo', name: 'Fatura No', type: 'text', minWidth: 'min-w-[130px]', isCore: true, align: 'left' };
    }
    if (colId === 'description') {
      return { id: 'description', name: 'Açıklama', type: 'text', minWidth: 'min-w-[150px]', isCore: true, align: 'left' };
    }
    const custom = invoiceColumns.find((c) => c.id === colId);
    return {
      id: colId,
      name: custom?.name || colId,
      type: custom?.type || 'text',
      minWidth: 'min-w-[120px]',
      isCore: false,
      align: custom?.type === 'number' ? 'right' : 'left',
      custom
    };
  };

  const getPaymentColMeta = (colId: string) => {
    if (colId === 'date') {
      return { id: 'date', name: 'Tarih', type: 'date', minWidth: 'min-w-[125px]', isCore: true, align: 'left' };
    }
    if (colId === 'amount') {
      return { id: 'amount', name: `Miktar (${currency})`, type: 'number', minWidth: 'min-w-[125px]', isCore: true, align: 'right' };
    }
    if (colId === 'paymentMethod') {
      return { id: 'paymentMethod', name: 'Tür', type: 'text', minWidth: 'min-w-[130px]', isCore: true, align: 'left' };
    }
    if (colId === 'description') {
      return { id: 'description', name: 'Açıklama', type: 'text', minWidth: 'min-w-[150px]', isCore: true, align: 'left' };
    }
    const custom = paymentColumns.find((c) => c.id === colId);
    return {
      id: colId,
      name: custom?.name || colId,
      type: custom?.type || 'text',
      minWidth: 'min-w-[120px]',
      isCore: false,
      align: custom?.type === 'number' ? 'right' : 'left',
      custom
    };
  };

  // =========================================================================
  // EXCEL INVOICE ROW COMPONENT (DYNAMICALLY ORDERED)
  // =========================================================================
  const renderExcelInvoiceRow = () => {
    return (
      <tr
        ref={invoiceTableBottomRef}
        className="bg-[#17202d] border-y-2 border-rose-500/70 shadow-inner group transition-colors"
      >
        {/* Mutabakat Column Placeholder for Entry Row */}
        <td className="py-2 px-2 text-center align-middle bg-slate-900/60">
          <span
            className="text-[10px] font-bold text-rose-400 bg-rose-950/70 border border-rose-800 px-1.5 py-0.5 rounded shadow-xs"
            title="Yeni Fatura Giriş Satırı"
          >
            YENİ
          </span>
        </td>

        {invoiceColOrder.map((colId) => {
          if (colId === 'date') {
            return (
              <td key="date" className="py-2 px-2.5 whitespace-nowrap min-w-[125px] align-middle">
                <SmartDateInput
                  value={invDate}
                  onChange={setInvDate}
                  fiscalYear={fiscalYear}
                  onCtrlD={() => copyInvoiceFieldFromAbove('date')}
                  onKeyDown={(e) => handleInvoiceCellKeyDown(e, 'date')}
                  className="bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                  placeholder="09-10"
                />
              </td>
            );
          }

          if (colId === 'amount') {
            return (
              <td key="amount" className="py-2 px-2.5 whitespace-nowrap min-w-[125px] align-middle text-right">
                <input
                  ref={invAmountInputRef}
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="0,00"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  onKeyDown={(e) => handleInvoiceCellKeyDown(e, 'amount')}
                  className="w-full bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-xs font-mono font-black text-rose-300 placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-right"
                  title="Tutar (0 girilebilir. Ctrl+D ile üst satırdan al, Enter ile faturayı ekle)"
                />
              </td>
            );
          }

          if (colId === 'invoiceNo') {
            return (
              <td key="invoiceNo" className="py-2 px-2.5 whitespace-nowrap min-w-[130px] align-middle">
                <input
                  ref={invNoInputRef}
                  type="text"
                  required
                  placeholder="FTR2026... *"
                  value={invNo}
                  onChange={(e) => setInvNo(e.target.value)}
                  onKeyDown={(e) => handleInvoiceCellKeyDown(e, 'invoiceNo')}
                  className="w-full bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-xs font-mono font-bold uppercase text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  title="Fatura Numarası (Ctrl+D ile üst satırdan kopyala)"
                />
              </td>
            );
          }

          if (colId === 'description') {
            return (
              <td key="description" className="py-2 px-2.5 align-middle min-w-[150px]">
                <input
                  type="text"
                  placeholder="Açıklama (Ctrl+D üstten al)"
                  value={invDesc}
                  onChange={(e) => setInvDesc(e.target.value)}
                  onKeyDown={(e) => handleInvoiceCellKeyDown(e, 'description')}
                  className="w-full bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </td>
            );
          }

          // Dynamic custom column
          const col = invoiceColumns.find((c) => c.id === colId);
          if (!col) return null;
          return (
            <td
              key={col.id}
              className="py-2 px-2.5 whitespace-nowrap min-w-[120px] bg-sky-950/20 border-l border-slate-800 align-middle"
            >
              {col.type === 'date' ? (
                <SmartDateInput
                  value={invCustomFields[col.id] || ''}
                  onChange={(d) => setInvCustomFields((prev) => ({ ...prev, [col.id]: d }))}
                  fiscalYear={fiscalYear}
                  onCtrlD={() => copyInvoiceFieldFromAbove(col.id)}
                  onKeyDown={(e) => handleInvoiceCellKeyDown(e, col.id)}
                  className="bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-sky-500 font-mono"
                  placeholder={col.name}
                />
              ) : col.type === 'number' ? (
                <input
                  type="number"
                  step="any"
                  placeholder={col.name}
                  value={invCustomFields[col.id] ?? ''}
                  onChange={(e) =>
                    setInvCustomFields((prev) => ({ ...prev, [col.id]: e.target.value }))
                  }
                  onKeyDown={(e) => handleInvoiceCellKeyDown(e, col.id)}
                  className="w-full bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-xs font-mono text-amber-300 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-right"
                  title={`${col.name} (Sayısal)`}
                />
              ) : (
                <input
                  type="text"
                  placeholder={col.name}
                  value={invCustomFields[col.id] ?? ''}
                  onChange={(e) =>
                    setInvCustomFields((prev) => ({ ...prev, [col.id]: e.target.value }))
                  }
                  onKeyDown={(e) => handleInvoiceCellKeyDown(e, col.id)}
                  className="w-full bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  title={col.name}
                />
              )}
            </td>
          );
        })}

        {/* İşlem */}
        <td className="py-2 px-2 whitespace-nowrap text-center align-middle">
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={submitInvoice}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
              title="Faturayı Ekle (Enter tuşu)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ekle</span>
            </button>
            <button
              type="button"
              onClick={copyAllInvoiceFromAbove}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-300 rounded border border-slate-700 text-xs cursor-pointer transition-colors"
              title="Üst satırdaki tüm veriyi kopyala (Ctrl+D)"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // =========================================================================
  // EXCEL PAYMENT ROW COMPONENT (DYNAMICALLY ORDERED)
  // =========================================================================
  const renderExcelPaymentRow = () => {
    return (
      <tr
        ref={paymentTableBottomRef}
        className="bg-[#172421] border-y-2 border-emerald-500/70 shadow-inner group transition-colors"
      >
        {/* Mutabakat Column Placeholder for Entry Row */}
        <td className="py-2 px-2 text-center align-middle bg-slate-900/60">
          <span
            className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-1.5 py-0.5 rounded shadow-xs"
            title="Yeni Ödeme Giriş Satırı"
          >
            YENİ
          </span>
        </td>

        {paymentColOrder.map((colId) => {
          if (colId === 'date') {
            return (
              <td key="date" className="py-2 px-2.5 whitespace-nowrap min-w-[125px] align-middle">
                <SmartDateInput
                  value={payDate}
                  onChange={setPayDate}
                  fiscalYear={fiscalYear}
                  onCtrlD={() => copyPaymentFieldFromAbove('date')}
                  onKeyDown={(e) => handlePaymentCellKeyDown(e, 'date')}
                  className="bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                  placeholder="09-10"
                />
              </td>
            );
          }

          if (colId === 'amount') {
            return (
              <td key="amount" className="py-2 px-2.5 whitespace-nowrap min-w-[125px] align-middle text-right">
                <input
                  ref={payAmountInputRef}
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="0,00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  onKeyDown={(e) => handlePaymentCellKeyDown(e, 'amount')}
                  className="w-full bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-xs font-mono font-black text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-right"
                  title="Ödeme Miktarı (0 girilebilir. Ctrl+D ile üstten al, Enter ile kaydet)"
                />
              </td>
            );
          }

          if (colId === 'paymentMethod') {
            return (
              <td key="paymentMethod" className="py-2 px-2.5 whitespace-nowrap min-w-[130px] align-middle">
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  onKeyDown={(e) => handlePaymentCellKeyDown(e, 'paymentMethod')}
                  className="w-full bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium"
                  title="Ödeme Türü (Ctrl+D ile üstten al)"
                >
                  <option value="Banka Havalesi/EFT">Banka Havalesi/EFT</option>
                  <option value="Nakit">Nakit</option>
                  <option value="Çek">Çek</option>
                  <option value="Senet">Senet</option>
                  <option value="Kredi Kartı">Kredi Kartı</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </td>
            );
          }

          if (colId === 'description') {
            return (
              <td key="description" className="py-2 px-2.5 align-middle min-w-[150px]">
                <input
                  type="text"
                  placeholder="Açıklama (Dekont, banka vb.)"
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  onKeyDown={(e) => handlePaymentCellKeyDown(e, 'description')}
                  className="w-full bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </td>
            );
          }

          // Dynamic custom column
          const col = paymentColumns.find((c) => c.id === colId);
          if (!col) return null;
          return (
            <td
              key={col.id}
              className="py-2 px-2.5 whitespace-nowrap min-w-[120px] bg-emerald-950/20 border-l border-slate-800 align-middle"
            >
              {col.type === 'date' ? (
                <SmartDateInput
                  value={payCustomFields[col.id] || ''}
                  onChange={(d) => setPayCustomFields((prev) => ({ ...prev, [col.id]: d }))}
                  fiscalYear={fiscalYear}
                  onCtrlD={() => copyPaymentFieldFromAbove(col.id)}
                  onKeyDown={(e) => handlePaymentCellKeyDown(e, col.id)}
                  className="bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder={col.name}
                />
              ) : col.type === 'number' ? (
                <input
                  type="number"
                  step="any"
                  placeholder={col.name}
                  value={payCustomFields[col.id] ?? ''}
                  onChange={(e) =>
                    setPayCustomFields((prev) => ({ ...prev, [col.id]: e.target.value }))
                  }
                  onKeyDown={(e) => handlePaymentCellKeyDown(e, col.id)}
                  className="w-full bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-xs font-mono text-amber-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-right"
                  title={`${col.name} (Sayısal)`}
                />
              ) : (
                <input
                  type="text"
                  placeholder={col.name}
                  value={payCustomFields[col.id] ?? ''}
                  onChange={(e) =>
                    setPayCustomFields((prev) => ({ ...prev, [col.id]: e.target.value }))
                  }
                  onKeyDown={(e) => handlePaymentCellKeyDown(e, col.id)}
                  className="w-full bg-slate-900 border border-slate-700/90 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  title={col.name}
                />
              )}
            </td>
          );
        })}

        {/* İşlem */}
        <td className="py-2 px-2 whitespace-nowrap text-center align-middle">
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={submitPayment}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
              title="Ödemeyi Kaydet (Enter tuşu)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ekle</span>
            </button>
            <button
              type="button"
              onClick={copyAllPaymentFromAbove}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 rounded border border-slate-700 text-xs cursor-pointer transition-colors"
              title="Üst satırdaki tüm veriyi kopyala (Ctrl+D)"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-[#141820] text-slate-100 flex flex-col font-sans select-text pb-12">
      {/* Toast Feedback for Rapid Keyboard Actions */}
      {excelFeedback && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce duration-300 pointer-events-none">
          <div
            className={`px-4 py-2 rounded-lg text-xs font-semibold shadow-2xl flex items-center gap-2 border backdrop-blur-md ${
              excelFeedback.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-200 border-emerald-600/80'
                : excelFeedback.type === 'warn'
                ? 'bg-amber-950/95 text-amber-200 border-amber-600/80'
                : 'bg-sky-950/95 text-sky-200 border-sky-600/80'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{excelFeedback.text}</span>
          </div>
        </div>
      )}

      {/* Top Header Bar (Modern Neutral Gray) */}
      <header className="bg-[#1b2028] border-b border-slate-700/80 px-4 sm:px-8 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Şirketler Listesi</span>
            </button>
            <div className="h-6 w-px bg-slate-700 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-white leading-tight">
                  {company.name}
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  Konum: R{company.gridRow}-C{company.gridCol}
                </span>
                {company.taxOffice && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    {company.taxOffice}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                {company.taxNumber && <span>VKN/TC: {company.taxNumber}</span>}
                {company.phone && <span>Tel: {company.phone}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Column Order Button */}
            <button
              onClick={() => {
                setOrderModalTab('invoice');
                setIsColumnOrderModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Sütunların yerlerini değiştir (Tarih, Tutar, Fatura No, Açıklama vb.)"
            >
              <ArrowLeftRight className="w-4 h-4 text-sky-400" />
              <span>Sütun Sıralaması</span>
            </button>

            {/* Custom Columns Button */}
            <button
              onClick={() => setIsCustomColModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-800/80 bg-sky-950/40 hover:bg-sky-900/60 text-sky-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Bu şirkete özel tablo sütunları ekle veya düzenle"
            >
              <Columns className="w-4 h-4 text-sky-400" />
              <span>Özel Sütunlar ({(company.customColumns || []).length})</span>
            </button>

            {/* Print Official Statement Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="A4 Cari Hesap Ekstresi Yazdır & Excel"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Ekstre Yazdır</span>
            </button>

            <button
              onClick={() => onEditCompany(company)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <Edit2 className="w-4 h-4" />
              <span>Şirketi Düzenle</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Shortcut & Column Help Banner */}
      <div className="bg-[#191e27] border-b border-slate-800 px-4 sm:px-8 py-1.5 text-xs text-slate-400">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Asıl Sıralama:</span>
              <strong className="text-white">Tarih → Tutar → Fatura No → Açıklama</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              Sütun başlıklarını sürükleyip bırakarak yerlerini değiştirebilirsiniz
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-emerald-400 font-bold">
                ✓ Tik
              </kbd>
              <span>Mutabakat Onayı</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-sky-300 font-bold">
                Ctrl + D
              </kbd>
              <span>Üst satırdan kopyalar</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-emerald-300 font-bold">
                Enter
              </kbd>
              <span>Satırı ekler</span>
            </span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Bar */}
      <section className="px-4 sm:px-8 py-4 max-w-[1700px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Total Invoices Card */}
          <div className="bg-[#1e232b] border border-slate-700/80 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-medium">Toplam Gelen Fatura</span>
              <div className="p-1.5 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/40">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-rose-300 tabular-nums">
                {formatCurrencyTRY(totalInvoices, currency)}
              </span>
              <span className="text-[11px] text-slate-400">{invoices.length} fatura</span>
            </div>
          </div>

          {/* Total Payments Card */}
          <div className="bg-[#1e232b] border border-slate-700/80 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-medium">Toplam Yapılan Ödeme</span>
              <div className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-emerald-300 tabular-nums">
                {formatCurrencyTRY(totalPayments, currency)}
              </span>
              <span className="text-[11px] text-slate-400">{payments.length} ödeme</span>
            </div>
          </div>

          {/* Net Balance Card */}
          <div
            className={`border rounded-xl p-3.5 shadow-sm ${
              balance > 0.005
                ? 'bg-rose-950/20 border-rose-800/60'
                : balance < -0.005
                ? 'bg-emerald-950/20 border-emerald-800/60'
                : 'bg-slate-800/40 border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-medium">Net Güncel Bakiye</span>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  balance > 0.005
                    ? 'bg-rose-900/60 text-rose-300 border border-rose-700'
                    : balance < -0.005
                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {balance > 0.005 ? 'Borçlu' : balance < -0.005 ? 'Alacaklı' : 'Sıfır'}
              </span>
            </div>
            <div className="mt-1">
              <span
                className={`text-xl font-black font-mono tracking-tight tabular-nums ${
                  balance > 0.005
                    ? 'text-rose-400'
                    : balance < -0.005
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {formatCurrencyTRY(balance, currency)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Dual Grid: Gelen Faturalar & Yapılan Ödemeler */}
      <main className="px-4 sm:px-8 max-w-[1700px] mx-auto w-full grid grid-cols-1 xl:grid-cols-2 gap-5 flex-1">
        {/* ========================================================= */}
        {/* SOL TARAF: GELEN FATURALAR                                 */}
        {/* ========================================================= */}
        <section className="bg-[#242a34] border border-slate-700 rounded-xl shadow-lg overflow-hidden flex flex-col">
          {/* Section Header */}
          <div className="bg-[#1c212a] px-4 py-3 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Gelen Faturalar (Borç Kayıtları)
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mutabık Sayısı Rozeti */}
              {reconciledInvoicesCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Mutabık: {reconciledInvoicesCount}/{invoices.length}</span>
                </span>
              )}

              {/* Sütun Sıralaması Butonu */}
              <button
                type="button"
                onClick={() => {
                  setOrderModalTab('invoice');
                  setIsColumnOrderModalOpen(true);
                }}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 hover:border-sky-500 transition-colors cursor-pointer"
                title="Fatura sütunlarının yerlerini düzenle veya asıl sıraya döndür"
              >
                <ArrowLeftRight className="w-3 h-3 text-sky-400" />
                <span>Sütun Sırası</span>
              </button>

              {/* Position toggle (Altta / Üstte) */}
              <button
                type="button"
                onClick={() => setInvRowPos((prev) => (prev === 'bottom' ? 'top' : 'bottom'))}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                title="Giriş satırını tablonun en altında (Excel gibi) veya en üstünde göster"
              >
                {invRowPos === 'bottom' ? (
                  <>
                    <ArrowDownCircle className="w-3 h-3 text-rose-400" />
                    <span>Giriş: Altta (Excel)</span>
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-3 h-3 text-rose-400" />
                    <span>Giriş: Üstte</span>
                  </>
                )}
              </button>

              {/* Custom Columns Trigger */}
              <button
                type="button"
                onClick={() => setIsCustomColModalOpen(true)}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 hover:border-sky-500 transition-colors cursor-pointer"
                title="Faturalara özel sütun ekle"
              >
                <Plus className="w-3 h-3 text-sky-400" />
                <span>Özel Sütun ({invoiceColumns.length})</span>
              </button>

              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-rose-300 border border-slate-700 tabular-nums">
                {formatCurrencyTRY(totalInvoices, currency)}
              </span>
            </div>
          </div>

          {/* Quick Helper Subheader Bar */}
          <div className="bg-[#19202a] px-3.5 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-semibold text-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                <span>Excel Giriş Satırı:</span>
              </span>
              <span>Sıra: Tarih → Tutar → Fatura No → Açıklama (başlıktan sürükleyip değiştirebilirsiniz)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleResetToDefaultOrder('invoice')}
                className="text-[10px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
                title="Tarih - Tutar - Fatura No - Açıklama sırasına dön"
              >
                Asıl Sıraya Dön
              </button>
              <button
                type="button"
                onClick={() => setShowExpandedInvForm(!showExpandedInvForm)}
                className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer ml-1"
              >
                {showExpandedInvForm ? 'Geniş Formu Gizle' : 'Geniş Form'}
              </button>
            </div>
          </div>

          {/* Optional Expanded Form */}
          {showExpandedInvForm && (
            <form onSubmit={(e) => { e.preventDefault(); submitInvoice(); }} className="p-4 bg-[#1e232c] border-b border-slate-700/80">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Fatura Tarihi *
                  </label>
                  <SmartDateInput
                    value={invDate}
                    onChange={setInvDate}
                    fiscalYear={fiscalYear}
                    onCtrlD={() => copyInvoiceFieldFromAbove('date')}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Tutar ({currency}) * (0 girilebilir)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="0,00"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    onKeyDown={(e) => handleInvoiceCellKeyDown(e, 'amount')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-rose-300 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Fatura No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="GİB2026..."
                    value={invNo}
                    onChange={(e) => setInvNo(e.target.value)}
                    onKeyDown={(e) => handleInvoiceCellKeyDown(e, 'invoiceNo')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold uppercase text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
              <div className="mt-2.5">
                <input
                  type="text"
                  placeholder="Açıklama (İşlem notu, malzeme / hizmet detayı)"
                  value={invDesc}
                  onChange={(e) => setInvDesc(e.target.value)}
                  onKeyDown={(e) => handleInvoiceCellKeyDown(e, 'description')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={copyAllInvoiceFromAbove}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Üst Satırı Kopyala (Ctrl+D)</span>
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Fatura Ekle</span>
                </button>
              </div>
            </form>
          )}

          {/* Invoices Table with Direct Excel-Style Grid Entry & Mutabakat Tick */}
          <div className="overflow-x-auto flex-1 max-h-[600px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1b2028] text-slate-400 border-b border-slate-700 sticky top-0 z-10">
                <tr>
                  {/* Mutabakat Tiki Kolonu (En Sol) */}
                  <th className="py-2.5 px-2 font-semibold text-center w-14 whitespace-nowrap bg-[#171d26]">
                    <button
                      type="button"
                      onClick={handleToggleAllInvoicesReconciled}
                      className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      title="Tüm faturaların mutabakatını işaretle / kaldır"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tik</span>
                    </button>
                  </th>

                  {invoiceColOrder.map((colId) => {
                    const meta = getInvoiceColMeta(colId);
                    const isOver = dragOverInvoiceCol === colId;
                    return (
                      <th
                        key={colId}
                        draggable
                        onDragStart={(e) => {
                          setDraggedInvoiceCol(colId);
                          e.dataTransfer.setData('text/plain', colId);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverInvoiceCol(colId);
                        }}
                        onDragLeave={() => {
                          if (dragOverInvoiceCol === colId) setDragOverInvoiceCol(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const src = draggedInvoiceCol || e.dataTransfer.getData('text/plain');
                          if (src) handleInvoiceHeaderDrop(src, colId);
                          setDraggedInvoiceCol(null);
                          setDragOverInvoiceCol(null);
                        }}
                        className={`py-2.5 px-3 font-semibold whitespace-nowrap ${meta.minWidth} select-none cursor-grab active:cursor-grabbing transition-all ${
                          meta.align === 'right' ? 'text-right' : 'text-left'
                        } ${
                          !meta.isCore
                            ? 'text-sky-300 bg-sky-950/30 border-l border-slate-800'
                            : ''
                        } ${
                          isOver ? 'bg-sky-900/60 ring-2 ring-sky-400 text-white' : ''
                        }`}
                        title="Bu sütun başlığını sürükleyip bırakarak yerini değiştirebilirsiniz"
                      >
                        <div
                          className={`flex items-center gap-1.5 ${
                            meta.align === 'right' ? 'justify-end' : ''
                          }`}
                        >
                          <GripVertical className="w-3 h-3 text-slate-500 opacity-60 hover:opacity-100 shrink-0" />
                          <span>{meta.name}</span>
                          {!meta.isCore && (
                            <span className="text-[9px] px-1 rounded bg-sky-900/80 text-sky-200">
                              {meta.type === 'number'
                                ? 'Sayı'
                                : meta.type === 'date'
                                ? 'Tarih'
                                : 'Metin'}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-2.5 px-2 font-semibold text-center w-20 whitespace-nowrap">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {/* If entry row position is 'top', render it right below header */}
                {invRowPos === 'top' && renderExcelInvoiceRow()}

                {/* Existing invoice rows */}
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`hover:bg-slate-800/60 transition-colors group ${
                      inv.isReconciled
                        ? 'bg-emerald-950/20 border-l-2 border-l-emerald-500'
                        : ''
                    }`}
                  >
                    {/* Mutabakat Tiki Hücresi */}
                    <td className="py-2 px-2 text-center whitespace-nowrap align-middle">
                      <button
                        type="button"
                        onClick={() => handleToggleInvoiceReconciled(inv)}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-all cursor-pointer ${
                          inv.isReconciled
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-sm ring-2 ring-emerald-400/50 hover:bg-emerald-400'
                            : 'bg-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/70 border border-slate-700'
                        }`}
                        title={
                          inv.isReconciled
                            ? 'Mutabık (Karşı tarafla tutuyor) - Tıklayarak kaldırın'
                            : 'Mutabakat tiki - Karşı tarafla tutuyorsa tıklayarak işaretleyin'
                        }
                      >
                        <Check
                          className={`w-4 h-4 ${
                            inv.isReconciled ? 'stroke-[3]' : 'opacity-40 hover:opacity-100'
                          }`}
                        />
                      </button>
                    </td>

                    {invoiceColOrder.map((colId) => {
                      if (colId === 'date') {
                        return (
                          <td
                            key="date"
                            className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap"
                          >
                            {formatDateTR(inv.date)}
                          </td>
                        );
                      }
                      if (colId === 'amount') {
                        return (
                          <td
                            key="amount"
                            className="py-2.5 px-3 text-right font-mono font-bold text-rose-300 whitespace-nowrap tabular-nums"
                          >
                            {formatCurrencyTRY(inv.amount, currency)}
                          </td>
                        );
                      }
                      if (colId === 'invoiceNo') {
                        return (
                          <td
                            key="invoiceNo"
                            className="py-2.5 px-3 font-mono font-bold text-slate-100 whitespace-nowrap"
                          >
                            {inv.invoiceNo}
                          </td>
                        );
                      }
                      if (colId === 'description') {
                        return (
                          <td
                            key="description"
                            className="py-2.5 px-3 text-slate-300 max-w-[200px] truncate"
                            title={inv.description}
                          >
                            {inv.description || '-'}
                          </td>
                        );
                      }

                      // Dynamic Custom Column Values
                      const col = invoiceColumns.find((c) => c.id === colId);
                      if (!col) return null;
                      const rawVal = inv.customFields?.[col.id];
                      return (
                        <td
                          key={col.id}
                          className="py-2.5 px-3 whitespace-nowrap bg-sky-950/15 border-l border-slate-800/80 text-slate-200"
                        >
                          {rawVal !== undefined && rawVal !== '' ? (
                            col.type === 'date' ? (
                              <span className="font-mono text-purple-300">
                                {formatDateTR(String(rawVal))}
                              </span>
                            ) : col.type === 'number' ? (
                              <span className="font-mono font-bold text-amber-300">
                                {Number(rawVal).toLocaleString('tr-TR')}
                              </span>
                            ) : (
                              <span>{String(rawVal)}</span>
                            )
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Actions */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setEditingInvoice(inv)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Faturayı Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmModalState({
                              isOpen: true,
                              title: 'Faturayı Sil',
                              message: `${inv.invoiceNo} numaralı ${formatCurrencyTRY(inv.amount, currency)} tutarındaki faturayı silmek istediğinize emin misiniz?`,
                              action: () => onDeleteInvoice(inv.id)
                            });
                          }}
                          className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 transition-colors cursor-pointer"
                          title="Faturayı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* If entry row position is 'bottom', render it right below the last invoice (classic Excel append) */}
                {invRowPos === 'bottom' && renderExcelInvoiceRow()}
              </tbody>
              <tfoot className="bg-[#1b2028] border-t-2 border-slate-700 font-bold sticky bottom-0 text-slate-200 z-10">
                <tr>
                  {/* Mutabık Özet Hücresi */}
                  <td className="py-2.5 px-2 text-center text-[10px] font-bold text-emerald-400 whitespace-nowrap">
                    {reconciledInvoicesCount > 0 ? `${reconciledInvoicesCount}/${invoices.length} ✓` : ''}
                  </td>

                  {invoiceColOrder.map((colId, idx) => {
                    if (colId === 'amount') {
                      return (
                        <td
                          key={colId}
                          className="py-2.5 px-3 text-right font-mono font-black text-rose-300 text-sm tabular-nums whitespace-nowrap"
                        >
                          {formatCurrencyTRY(totalInvoices, currency)}
                        </td>
                      );
                    }
                    // Place "TOPLAM:" immediately before amount column or in first cell
                    const isNextAmount =
                      idx < invoiceColOrder.length - 1 && invoiceColOrder[idx + 1] === 'amount';
                    if (isNextAmount || (idx === 0 && invoiceColOrder[0] === 'amount')) {
                      return (
                        <td
                          key={colId}
                          className="py-2.5 px-3 text-right text-[11px] uppercase font-bold text-slate-300 whitespace-nowrap"
                        >
                          Toplam:
                        </td>
                      );
                    }
                    return <td key={colId}></td>;
                  })}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SAĞ TARAF: YAPILAN ÖDEMELER                                */}
        {/* ========================================================= */}
        <section className="bg-[#242a34] border border-slate-700 rounded-xl shadow-lg overflow-hidden flex flex-col">
          {/* Section Header */}
          <div className="bg-[#1c212a] px-4 py-3 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Yapılan Ödemeler (Tahsilat / Mahsup)
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mutabık Sayısı Rozeti */}
              {reconciledPaymentsCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Mutabık: {reconciledPaymentsCount}/{payments.length}</span>
                </span>
              )}

              {/* Sütun Sıralaması Butonu */}
              <button
                type="button"
                onClick={() => {
                  setOrderModalTab('payment');
                  setIsColumnOrderModalOpen(true);
                }}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 hover:border-emerald-500 transition-colors cursor-pointer"
                title="Ödeme sütunlarının yerlerini düzenle veya asıl sıraya döndür"
              >
                <ArrowLeftRight className="w-3 h-3 text-emerald-400" />
                <span>Sütun Sırası</span>
              </button>

              {/* Position toggle (Altta / Üstte) */}
              <button
                type="button"
                onClick={() => setPayRowPos((prev) => (prev === 'bottom' ? 'top' : 'bottom'))}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                title="Giriş satırını tablonun en altında (Excel gibi) veya en üstünde göster"
              >
                {payRowPos === 'bottom' ? (
                  <>
                    <ArrowDownCircle className="w-3 h-3 text-emerald-400" />
                    <span>Giriş: Altta (Excel)</span>
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-3 h-3 text-emerald-400" />
                    <span>Giriş: Üstte</span>
                  </>
                )}
              </button>

              {/* Custom Columns Trigger */}
              <button
                type="button"
                onClick={() => setIsCustomColModalOpen(true)}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 hover:border-emerald-500 transition-colors cursor-pointer"
                title="Ödemelere özel sütun ekle"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>Özel Sütun ({paymentColumns.length})</span>
              </button>

              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700 tabular-nums">
                {formatCurrencyTRY(totalPayments, currency)}
              </span>
            </div>
          </div>

          {/* Quick Helper Subheader Bar */}
          <div className="bg-[#19202a] px-3.5 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Excel Giriş Satırı:</span>
              </span>
              <span>Sıra: Tarih → Miktar → Tür → Açıklama (başlıktan sürükleyip değiştirebilirsiniz)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleResetToDefaultOrder('payment')}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                title="Tarih - Miktar - Tür - Açıklama sırasına dön"
              >
                Asıl Sıraya Dön
              </button>
              <button
                type="button"
                onClick={() => setShowExpandedPayForm(!showExpandedPayForm)}
                className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer ml-1"
              >
                {showExpandedPayForm ? 'Geniş Formu Gizle' : 'Geniş Form'}
              </button>
            </div>
          </div>

          {/* Optional Expanded Form */}
          {showExpandedPayForm && (
            <form onSubmit={(e) => { e.preventDefault(); submitPayment(); }} className="p-4 bg-[#1e232c] border-b border-slate-700/80">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Ödeme Tarihi *
                  </label>
                  <SmartDateInput
                    value={payDate}
                    onChange={setPayDate}
                    fiscalYear={fiscalYear}
                    onCtrlD={() => copyPaymentFieldFromAbove('date')}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Miktar ({currency}) * (0 girilebilir)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="0,00"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    onKeyDown={(e) => handlePaymentCellKeyDown(e, 'amount')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Ödeme Türü *
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Banka Havalesi/EFT">Banka Havalesi/EFT</option>
                    <option value="Nakit">Nakit</option>
                    <option value="Çek">Çek</option>
                    <option value="Senet">Senet</option>
                    <option value="Kredi Kartı">Kredi Kartı</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              </div>
              <div className="mt-2.5">
                <input
                  type="text"
                  placeholder="Ödeme Açıklaması (Banka, dekont no, teslim alan vb.)"
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  onKeyDown={(e) => handlePaymentCellKeyDown(e, 'description')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={copyAllPaymentFromAbove}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Üst Satırı Kopyala (Ctrl+D)</span>
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ödeme Kaydet</span>
                </button>
              </div>
            </form>
          )}

          {/* Payments Table with Direct Excel-Style Grid Entry & Mutabakat Tick */}
          <div className="overflow-x-auto flex-1 max-h-[600px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1b2028] text-slate-400 border-b border-slate-700 sticky top-0 z-10">
                <tr>
                  {/* Mutabakat Tiki Kolonu (En Sol) */}
                  <th className="py-2.5 px-2 font-semibold text-center w-14 whitespace-nowrap bg-[#171d26]">
                    <button
                      type="button"
                      onClick={handleToggleAllPaymentsReconciled}
                      className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      title="Tüm ödemelerin mutabakatını işaretle / kaldır"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tik</span>
                    </button>
                  </th>

                  {paymentColOrder.map((colId) => {
                    const meta = getPaymentColMeta(colId);
                    const isOver = dragOverPaymentCol === colId;
                    return (
                      <th
                        key={colId}
                        draggable
                        onDragStart={(e) => {
                          setDraggedPaymentCol(colId);
                          e.dataTransfer.setData('text/plain', colId);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverPaymentCol(colId);
                        }}
                        onDragLeave={() => {
                          if (dragOverPaymentCol === colId) setDragOverPaymentCol(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const src = draggedPaymentCol || e.dataTransfer.getData('text/plain');
                          if (src) handlePaymentHeaderDrop(src, colId);
                          setDraggedPaymentCol(null);
                          setDragOverPaymentCol(null);
                        }}
                        className={`py-2.5 px-3 font-semibold whitespace-nowrap ${meta.minWidth} select-none cursor-grab active:cursor-grabbing transition-all ${
                          meta.align === 'right' ? 'text-right' : 'text-left'
                        } ${
                          !meta.isCore
                            ? 'text-emerald-300 bg-emerald-950/30 border-l border-slate-800'
                            : ''
                        } ${
                          isOver ? 'bg-emerald-900/60 ring-2 ring-emerald-400 text-white' : ''
                        }`}
                        title="Bu sütun başlığını sürükleyip bırakarak yerini değiştirebilirsiniz"
                      >
                        <div
                          className={`flex items-center gap-1.5 ${
                            meta.align === 'right' ? 'justify-end' : ''
                          }`}
                        >
                          <GripVertical className="w-3 h-3 text-slate-500 opacity-60 hover:opacity-100 shrink-0" />
                          <span>{meta.name}</span>
                          {!meta.isCore && (
                            <span className="text-[9px] px-1 rounded bg-emerald-900/80 text-emerald-200">
                              {meta.type === 'number'
                                ? 'Sayı'
                                : meta.type === 'date'
                                ? 'Tarih'
                                : 'Metin'}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-2.5 px-2 font-semibold text-center w-20 whitespace-nowrap">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {/* If entry row position is 'top', render it right below header */}
                {payRowPos === 'top' && renderExcelPaymentRow()}

                {/* Existing payment rows */}
                {payments.map((pay) => (
                  <tr
                    key={pay.id}
                    className={`hover:bg-slate-800/60 transition-colors group ${
                      pay.isReconciled
                        ? 'bg-emerald-950/20 border-l-2 border-l-emerald-500'
                        : ''
                    }`}
                  >
                    {/* Mutabakat Tiki Hücresi */}
                    <td className="py-2 px-2 text-center whitespace-nowrap align-middle">
                      <button
                        type="button"
                        onClick={() => handleTogglePaymentReconciled(pay)}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-all cursor-pointer ${
                          pay.isReconciled
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-sm ring-2 ring-emerald-400/50 hover:bg-emerald-400'
                            : 'bg-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/70 border border-slate-700'
                        }`}
                        title={
                          pay.isReconciled
                            ? 'Mutabık (Karşı tarafla tutuyor) - Tıklayarak kaldırın'
                            : 'Mutabakat tiki - Karşı tarafla tutuyorsa tıklayarak işaretleyin'
                        }
                      >
                        <Check
                          className={`w-4 h-4 ${
                            pay.isReconciled ? 'stroke-[3]' : 'opacity-40 hover:opacity-100'
                          }`}
                        />
                      </button>
                    </td>

                    {paymentColOrder.map((colId) => {
                      if (colId === 'date') {
                        return (
                          <td
                            key="date"
                            className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap"
                          >
                            {formatDateTR(pay.date)}
                          </td>
                        );
                      }
                      if (colId === 'amount') {
                        return (
                          <td
                            key="amount"
                            className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300 whitespace-nowrap tabular-nums"
                          >
                            {formatCurrencyTRY(pay.amount, currency)}
                          </td>
                        );
                      }
                      if (colId === 'paymentMethod') {
                        return (
                          <td key="paymentMethod" className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {pay.paymentMethod}
                            </span>
                          </td>
                        );
                      }
                      if (colId === 'description') {
                        return (
                          <td
                            key="description"
                            className="py-2.5 px-3 text-slate-300 max-w-[200px] truncate"
                            title={pay.description}
                          >
                            {pay.description || '-'}
                          </td>
                        );
                      }

                      // Dynamic Custom Column Values
                      const col = paymentColumns.find((c) => c.id === colId);
                      if (!col) return null;
                      const rawVal = pay.customFields?.[col.id];
                      return (
                        <td
                          key={col.id}
                          className="py-2.5 px-3 whitespace-nowrap bg-emerald-950/15 border-l border-slate-800/80 text-slate-200"
                        >
                          {rawVal !== undefined && rawVal !== '' ? (
                            col.type === 'date' ? (
                              <span className="font-mono text-purple-300">
                                {formatDateTR(String(rawVal))}
                              </span>
                            ) : col.type === 'number' ? (
                              <span className="font-mono font-bold text-amber-300">
                                {Number(rawVal).toLocaleString('tr-TR')}
                              </span>
                            ) : (
                              <span>{String(rawVal)}</span>
                            )
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Actions */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setEditingPayment(pay)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Ödemeyi Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmModalState({
                              isOpen: true,
                              title: 'Ödeme Kaydını Sil',
                              message: `${pay.paymentMethod} türündeki ${formatCurrencyTRY(pay.amount, currency)} tutarlı ödeme kaydını silmek istediğinize emin misiniz?`,
                              action: () => onDeletePayment(pay.id)
                            });
                          }}
                          className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 transition-colors cursor-pointer"
                          title="Ödemeyi Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* If entry row position is 'bottom', render it right below the last payment (classic Excel append) */}
                {payRowPos === 'bottom' && renderExcelPaymentRow()}
              </tbody>
              <tfoot className="bg-[#1b2028] border-t-2 border-slate-700 font-bold sticky bottom-0 text-slate-200 z-10">
                <tr>
                  {/* Mutabık Özet Hücresi */}
                  <td className="py-2.5 px-2 text-center text-[10px] font-bold text-emerald-400 whitespace-nowrap">
                    {reconciledPaymentsCount > 0 ? `${reconciledPaymentsCount}/${payments.length} ✓` : ''}
                  </td>

                  {paymentColOrder.map((colId, idx) => {
                    if (colId === 'amount') {
                      return (
                        <td
                          key={colId}
                          className="py-2.5 px-3 text-right font-mono font-black text-emerald-300 text-sm tabular-nums whitespace-nowrap"
                        >
                          {formatCurrencyTRY(totalPayments, currency)}
                        </td>
                      );
                    }
                    const isNextAmount =
                      idx < paymentColOrder.length - 1 && paymentColOrder[idx + 1] === 'amount';
                    if (isNextAmount || (idx === 0 && paymentColOrder[0] === 'amount')) {
                      return (
                        <td
                          key={colId}
                          className="py-2.5 px-3 text-right text-[11px] uppercase font-bold text-slate-300 whitespace-nowrap"
                        >
                          Toplam:
                        </td>
                      );
                    }
                    return <td key={colId}></td>;
                  })}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </main>

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#1e232c] border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-rose-400" />
              <span>Faturayı Düzenle</span>
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateInvoice(editingInvoice);
                setEditingInvoice(null);
                showFeedback('✓ Fatura güncellendi');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-400 mb-1">Tarih</label>
                <SmartDateInput
                  value={editingInvoice.date}
                  onChange={(d) => setEditingInvoice({ ...editingInvoice, date: d })}
                  fiscalYear={fiscalYear}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tutar ({currency}) (0 girilebilir)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={editingInvoice.amount}
                  onChange={(e) =>
                    setEditingInvoice({
                      ...editingInvoice,
                      amount: isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value)
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Fatura Numarası</label>
                <input
                  type="text"
                  required
                  value={editingInvoice.invoiceNo}
                  onChange={(e) =>
                    setEditingInvoice({
                      ...editingInvoice,
                      invoiceNo: e.target.value.toUpperCase()
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Açıklama</label>
                <input
                  type="text"
                  value={editingInvoice.description}
                  onChange={(e) =>
                    setEditingInvoice({ ...editingInvoice, description: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              {/* Mutabakat Toggle in Edit Modal */}
              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={!!editingInvoice.isReconciled}
                    onChange={(e) =>
                      setEditingInvoice({ ...editingInvoice, isReconciled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <span className="font-semibold text-emerald-400 text-xs">
                    Karşı Şirket ile Mutabık (Onaylı)
                  </span>
                </label>
              </div>

              {/* Custom fields in edit invoice */}
              {invoiceColumns.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="font-semibold text-sky-300 block text-[11px]">
                    Özel Sütun Değerleri:
                  </span>
                  {invoiceColumns.map((col) => (
                    <div key={col.id}>
                      <label className="block text-slate-400 mb-0.5 text-[11px]">
                        {col.name}
                      </label>
                      {col.type === 'date' ? (
                        <SmartDateInput
                          value={editingInvoice.customFields?.[col.id] || ''}
                          onChange={(d) =>
                            setEditingInvoice({
                              ...editingInvoice,
                              customFields: { ...editingInvoice.customFields, [col.id]: d }
                            })
                          }
                          fiscalYear={fiscalYear}
                          className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      ) : col.type === 'number' ? (
                        <input
                          type="number"
                          step="any"
                          value={editingInvoice.customFields?.[col.id] ?? ''}
                          onChange={(e) =>
                            setEditingInvoice({
                              ...editingInvoice,
                              customFields: { ...editingInvoice.customFields, [col.id]: e.target.value }
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      ) : (
                        <input
                          type="text"
                          value={editingInvoice.customFields?.[col.id] ?? ''}
                          onChange={(e) =>
                            setEditingInvoice({
                              ...editingInvoice,
                              customFields: { ...editingInvoice.customFields, [col.id]: e.target.value }
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#1e232c] border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-emerald-400" />
              <span>Ödemeyi Düzenle</span>
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdatePayment(editingPayment);
                setEditingPayment(null);
                showFeedback('✓ Ödeme güncellendi');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-400 mb-1">Tarih</label>
                <SmartDateInput
                  value={editingPayment.date}
                  onChange={(d) => setEditingPayment({ ...editingPayment, date: d })}
                  fiscalYear={fiscalYear}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Miktar ({currency}) (0 girilebilir)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={editingPayment.amount}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      amount: isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value)
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Ödeme Türü</label>
                <select
                  value={editingPayment.paymentMethod}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      paymentMethod: e.target.value as PaymentMethod
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Banka Havalesi/EFT">Banka Havalesi/EFT</option>
                  <option value="Nakit">Nakit</option>
                  <option value="Çek">Çek</option>
                  <option value="Senet">Senet</option>
                  <option value="Kredi Kartı">Kredi Kartı</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Açıklama</label>
                <input
                  type="text"
                  value={editingPayment.description}
                  onChange={(e) =>
                    setEditingPayment({ ...editingPayment, description: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              {/* Mutabakat Toggle in Edit Modal */}
              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={!!editingPayment.isReconciled}
                    onChange={(e) =>
                      setEditingPayment({ ...editingPayment, isReconciled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <span className="font-semibold text-emerald-400 text-xs">
                    Karşı Şirket ile Mutabık (Onaylı)
                  </span>
                </label>
              </div>

              {/* Custom fields in edit payment */}
              {paymentColumns.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="font-semibold text-emerald-300 block text-[11px]">
                    Özel Sütun Değerleri:
                  </span>
                  {paymentColumns.map((col) => (
                    <div key={col.id}>
                      <label className="block text-slate-400 mb-0.5 text-[11px]">
                        {col.name}
                      </label>
                      {col.type === 'date' ? (
                        <SmartDateInput
                          value={editingPayment.customFields?.[col.id] || ''}
                          onChange={(d) =>
                            setEditingPayment({
                              ...editingPayment,
                              customFields: { ...editingPayment.customFields, [col.id]: d }
                            })
                          }
                          fiscalYear={fiscalYear}
                          className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      ) : col.type === 'number' ? (
                        <input
                          type="number"
                          step="any"
                          value={editingPayment.customFields?.[col.id] ?? ''}
                          onChange={(e) =>
                            setEditingPayment({
                              ...editingPayment,
                              customFields: { ...editingPayment.customFields, [col.id]: e.target.value }
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      ) : (
                        <input
                          type="text"
                          value={editingPayment.customFields?.[col.id] ?? ''}
                          onChange={(e) =>
                            setEditingPayment({
                              ...editingPayment,
                              customFields: { ...editingPayment.customFields, [col.id]: e.target.value }
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Column Order Management Modal */}
      <ColumnOrderModal
        isOpen={isColumnOrderModalOpen}
        onClose={() => setIsColumnOrderModalOpen(false)}
        company={company}
        initialTab={orderModalTab}
        onSaveOrder={handleSaveModalOrders}
      />

      {/* Custom Columns Management Modal */}
      <CustomColumnsModal
        isOpen={isCustomColModalOpen}
        onClose={() => setIsCustomColModalOpen(false)}
        company={company}
        onSaveColumns={handleSaveCustomColumns}
      />

      {/* In-App Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        onConfirm={confirmModalState.action}
        onCancel={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Official A4 Print Statement Preview & Export Modal */}
      <PrintStatementModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        company={company}
        invoices={invoices}
        payments={payments}
        settings={settings}
      />
    </div>
  );
};
