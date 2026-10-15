/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CompanyAccount,
  Invoice,
  Payment,
  CompanySummary,
  DatabaseState,
  AppSettings
} from './types';
import {
  loadDatabaseState,
  saveDatabaseState,
  createAutoSnapshot
} from './services/storageService';
import { generateInitialDataset, getDemoDataset } from './data/initialData';
import { HeaderBar } from './components/HeaderBar';
import { TotalDebtDisplay } from './components/TotalDebtDisplay';
import { CompanyGrid } from './components/CompanyGrid';
import { CompanyListView } from './components/CompanyListView';
import { CompanyDetail } from './components/CompanyDetail';
import { BackupModal } from './components/BackupModal';
import { CompanyModal } from './components/CompanyModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmModal } from './components/ConfirmModal';

export default function App() {
  const [dbState, setDbState] = useState<DatabaseState>(() => loadDatabaseState());
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState<'all' | 'debt' | 'credit' | 'zero'>('all');

  // Modals
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [companyModalData, setCompanyModalData] = useState<{
    isOpen: boolean;
    company?: CompanyAccount;
    suggestedRow?: number;
    suggestedCol?: number;
  }>({ isOpen: false });

  // Confirmation Modal
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

  // Global hotkeys (Escape key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmModalState.isOpen) {
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        } else if (isSettingsModalOpen) {
          setIsSettingsModalOpen(false);
        } else if (isBackupModalOpen) {
          setIsBackupModalOpen(false);
        } else if (companyModalData.isOpen) {
          setCompanyModalData({ isOpen: false });
        } else if (selectedCompanyId) {
          setSelectedCompanyId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModalState.isOpen, isSettingsModalOpen, isBackupModalOpen, companyModalData.isOpen, selectedCompanyId]);

  // Max row currently in use
  const maxRowInUse = useMemo(() => {
    return dbState.accounts.reduce((max, a) => Math.max(max, a.gridRow), 4);
  }, [dbState.accounts]);

  // Filter invoices and payments by Fiscal Year if specified (0 means All Years)
  const activeYear = dbState.settings?.fiscalYear || 0;

  const relevantInvoices = useMemo(() => {
    if (!activeYear || activeYear === 0) return dbState.invoices;
    const yearPrefix = `${activeYear}-`;
    return dbState.invoices.filter((i) => i.date.startsWith(yearPrefix));
  }, [dbState.invoices, activeYear]);

  const relevantPayments = useMemo(() => {
    if (!activeYear || activeYear === 0) return dbState.payments;
    const yearPrefix = `${activeYear}-`;
    return dbState.payments.filter((p) => p.date.startsWith(yearPrefix));
  }, [dbState.payments, activeYear]);

  // Calculate Company Summaries & Balances
  const summaries: CompanySummary[] = useMemo(() => {
    return dbState.accounts.map((company) => {
      const companyInvoices = relevantInvoices.filter((i) => i.companyId === company.id);
      const companyPayments = relevantPayments.filter((p) => p.companyId === company.id);

      const totalInvoices = companyInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      const totalPayments = companyPayments.reduce((sum, pay) => sum + pay.amount, 0);
      const balance = Number((totalInvoices - totalPayments).toFixed(2));

      let status: 'debt' | 'credit' | 'zero' = 'zero';
      if (balance > 0.005) status = 'debt';
      else if (balance < -0.005) status = 'credit';

      return {
        company,
        totalInvoices,
        totalPayments,
        balance,
        status
      };
    });
  }, [dbState.accounts, relevantInvoices, relevantPayments]);

  // Total Positive Debt Calculation: Only companies with balance > 0
  const { totalPositiveDebt, totalNegativeCredit, debtCount, creditCount, zeroCount } = useMemo(() => {
    let positiveDebt = 0;
    let negativeCredit = 0;
    let debt = 0;
    let credit = 0;
    let zero = 0;

    for (const s of summaries) {
      if (s.balance > 0.005) {
        positiveDebt += s.balance;
        debt++;
      } else if (s.balance < -0.005) {
        negativeCredit += s.balance;
        credit++;
      } else {
        zero++;
      }
    }

    return {
      totalPositiveDebt: Number(positiveDebt.toFixed(2)),
      totalNegativeCredit: Number(negativeCredit.toFixed(2)),
      debtCount: debt,
      creditCount: credit,
      zeroCount: zero
    };
  }, [summaries]);

  // Currently selected company for detail view
  const selectedCompany = useMemo(() => {
    if (!selectedCompanyId) return null;
    return dbState.accounts.find((a) => a.id === selectedCompanyId) || null;
  }, [selectedCompanyId, dbState.accounts]);

  const selectedInvoices = useMemo(() => {
    if (!selectedCompanyId) return [];
    return dbState.invoices
      .filter((i) => i.companyId === selectedCompanyId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCompanyId, dbState.invoices]);

  const selectedPayments = useMemo(() => {
    if (!selectedCompanyId) return [];
    return dbState.payments
      .filter((p) => p.companyId === selectedCompanyId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCompanyId, dbState.payments]);

  // Invoice Handlers
  const handleAddInvoice = (newInvData: Omit<Invoice, 'id' | 'createdAt'>) => {
    const newInvoice: Invoice = {
      ...newInvData,
      id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    const updatedInvoices = [newInvoice, ...dbState.invoices];
    const newState: DatabaseState = {
      ...dbState,
      invoices: updatedInvoices
    };
    setDbState(newState);
    saveDatabaseState(newState, `Yeni Fatura Eklendi (${newInvoice.invoiceNo})`);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const invToDelete = dbState.invoices.find((i) => i.id === invoiceId);
    const updatedInvoices = dbState.invoices.filter((i) => i.id !== invoiceId);
    const newState: DatabaseState = {
      ...dbState,
      invoices: updatedInvoices
    };
    setDbState(newState);
    saveDatabaseState(newState, `Fatura Silindi (${invToDelete?.invoiceNo || invoiceId})`);
  };

  const handleUpdateInvoice = (updatedInvoice: Invoice) => {
    const updatedInvoices = dbState.invoices.map((inv) =>
      inv.id === updatedInvoice.id ? updatedInvoice : inv
    );
    const newState: DatabaseState = {
      ...dbState,
      invoices: updatedInvoices
    };
    setDbState(newState);
    saveDatabaseState(newState, `Fatura Güncellendi (${updatedInvoice.invoiceNo})`);
  };

  // Payment Handlers
  const handleAddPayment = (newPayData: Omit<Payment, 'id' | 'createdAt'>) => {
    const newPayment: Payment = {
      ...newPayData,
      id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    const updatedPayments = [newPayment, ...dbState.payments];
    const newState: DatabaseState = {
      ...dbState,
      payments: updatedPayments
    };
    setDbState(newState);
    saveDatabaseState(newState, `Yeni Ödeme Kaydedildi (${newPayment.amount} ${dbState.settings?.currency || '₺'})`);
  };

  const handleDeletePayment = (paymentId: string) => {
    const updatedPayments = dbState.payments.filter((p) => p.id !== paymentId);
    const newState: DatabaseState = {
      ...dbState,
      payments: updatedPayments
    };
    setDbState(newState);
    saveDatabaseState(newState, 'Ödeme Kaydı Silindi');
  };

  const handleUpdatePayment = (updatedPayment: Payment) => {
    const updatedPayments = dbState.payments.map((p) =>
      p.id === updatedPayment.id ? updatedPayment : p
    );
    const newState: DatabaseState = {
      ...dbState,
      payments: updatedPayments
    };
    setDbState(newState);
    saveDatabaseState(newState, `Ödeme Kaydı Güncellendi (${updatedPayment.amount})`);
  };

  // Company Handlers
  const handleSaveCompany = (companyData: {
    id?: string;
    name: string;
    gridRow: number;
    gridCol: number;
    phone?: string;
    taxNumber?: string;
    notes?: string;
  }) => {
    const now = new Date().toISOString();
    let updatedAccounts: CompanyAccount[];

    if (companyData.id) {
      updatedAccounts = dbState.accounts.map((a) =>
        a.id === companyData.id
          ? {
              ...a,
              ...companyData,
              updatedAt: now
            }
          : a
      );
    } else {
      const newAccount: CompanyAccount = {
        id: `comp-${Date.now()}`,
        name: companyData.name,
        gridRow: companyData.gridRow,
        gridCol: companyData.gridCol,
        phone: companyData.phone,
        taxNumber: companyData.taxNumber,
        notes: companyData.notes,
        createdAt: now,
        updatedAt: now
      };
      updatedAccounts = [...dbState.accounts, newAccount];
    }

    const newState: DatabaseState = {
      ...dbState,
      accounts: updatedAccounts
    };
    setDbState(newState);
    saveDatabaseState(newState, `Şirket Kaydedildi (${companyData.name})`);
  };

  const handleUpdateCompany = (updatedCompany: CompanyAccount) => {
    const updatedAccounts = dbState.accounts.map((a) =>
      a.id === updatedCompany.id ? updatedCompany : a
    );
    const newState: DatabaseState = {
      ...dbState,
      accounts: updatedAccounts
    };
    setDbState(newState);
    saveDatabaseState(newState, `Şirket Güncellendi (${updatedCompany.name})`);
  };

  const handleDeleteCompany = (companyId: string) => {
    const comp = dbState.accounts.find((a) => a.id === companyId);
    const updatedAccounts = dbState.accounts.filter((a) => a.id !== companyId);
    const updatedInvoices = dbState.invoices.filter((i) => i.companyId !== companyId);
    const updatedPayments = dbState.payments.filter((p) => p.companyId !== companyId);

    const newState: DatabaseState = {
      ...dbState,
      accounts: updatedAccounts,
      invoices: updatedInvoices,
      payments: updatedPayments
    };
    setDbState(newState);
    if (selectedCompanyId === companyId) {
      setSelectedCompanyId(null);
    }
    saveDatabaseState(newState, `Şirket Silindi (${comp?.name || companyId})`);
  };

  // Settings Handlers
  const handleSaveSettings = (newSettings: AppSettings) => {
    const newState: DatabaseState = {
      ...dbState,
      settings: newSettings
    };
    setDbState(newState);
    saveDatabaseState(newState, 'Ayarlar Güncellendi');
  };


  // Reset all data completely (0 companies, 0 balance) - Protected with password 363696
  const handleResetAllData = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Tüm Şirket Kayıtlarını Sıfırla',
      message: 'Programdaki tüm kayıtlı şirketler, faturalar, ödemeler ve bakiyeler tamamen silinecektir. Sıfırlamadan hemen önce otomatik bir güvenlik yedeği alınacaktır. Bu işlemi onaylamak için lütfen sıfırlama şifresini giriniz:',
      requiredPassword: '363696',
      passwordPlaceholder: 'Sıfırlama şifresini giriniz...',
      confirmLabel: 'Şifreyi Doğrula ve Sıfırla',
      isDanger: true,
      action: () => {
        createAutoSnapshot(dbState, 'Sıfırlama Öncesi Güvenlik Yedeği');
        const emptyState: DatabaseState = {
          accounts: [],
          invoices: [],
          payments: [],
          settings: dbState.settings,
          snapshots: dbState.snapshots,
          lastBackupDate: new Date().toISOString()
        };
        setDbState(emptyState);
        saveDatabaseState(emptyState, 'Tüm Veriler Sıfırlandı');
        setSelectedCompanyId(null);
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        setIsSettingsModalOpen(false);
      }
    });
  };

  // Optional Demo Data Loader
  const handleLoadDemoData = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Örnek Verileri Yükle',
      message: 'Görseldeki 33 adet örnek şirket ve fatura/ödeme kayıtları yüklenecektir. Mevcut verileriniz öncesinde otomatik yedeklenecektir. Devam edilsin mi?',
      action: () => {
        createAutoSnapshot(dbState, 'Demo Yükleme Öncesi Yedek');
        const demo = getDemoDataset();
        const demoState: DatabaseState = {
          accounts: demo.accounts,
          invoices: demo.invoices,
          payments: demo.payments,
          settings: dbState.settings,
          snapshots: dbState.snapshots,
          lastBackupDate: new Date().toISOString()
        };
        setDbState(demoState);
        saveDatabaseState(demoState, 'Örnek Veriler Yüklendi');
        setSelectedCompanyId(null);
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        setIsSettingsModalOpen(false);
      }
    });
  };

  // Restore State from SQL/JSON Backup
  const handleRestoreState = (
    restored: { accounts: any[]; invoices: any[]; payments: any[]; settings?: AppSettings },
    label: string
  ) => {
    // Safety Snapshot before applying restore
    createAutoSnapshot(dbState, 'Geri Yükleme Öncesi Güvenlik Yedeği');

    const newState: DatabaseState = {
      ...dbState,
      accounts: restored.accounts,
      invoices: restored.invoices,
      payments: restored.payments,
      settings: restored.settings || dbState.settings,
      lastBackupDate: new Date().toISOString()
    };
    setDbState(newState);
    saveDatabaseState(newState, label);
    if (selectedCompanyId) {
      setSelectedCompanyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#242b35] text-slate-100 flex flex-col font-sans select-text">
      {/* If a company is selected, show detail view */}
      {selectedCompany ? (
        <CompanyDetail
          company={selectedCompany}
          invoices={selectedInvoices}
          payments={selectedPayments}
          settings={dbState.settings}
          onBack={() => setSelectedCompanyId(null)}
          onAddInvoice={handleAddInvoice}
          onDeleteInvoice={handleDeleteInvoice}
          onUpdateInvoice={handleUpdateInvoice}
          onAddPayment={handleAddPayment}
          onDeletePayment={handleDeletePayment}
          onUpdatePayment={handleUpdatePayment}
          onEditCompany={(comp) =>
            setCompanyModalData({ isOpen: true, company: comp })
          }
          onUpdateCompany={handleUpdateCompany}
        />
      ) : (
        /* Homepage View */
        <>
          <HeaderBar
            settings={dbState.settings}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onOpenAddCompanyModal={() =>
              setCompanyModalData({
                isOpen: true,
                suggestedRow: maxRowInUse ? (summaries.length % 11 === 0 ? maxRowInUse + 1 : maxRowInUse) : 1,
                suggestedCol: (summaries.length % 11) + 1
              })
            }
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onToggleViewMode={setViewMode}
          />

          <main className="flex-1 flex flex-col">
            {/* Top Center Total Debt Display */}
            <TotalDebtDisplay
              totalPositiveDebt={totalPositiveDebt}
              totalNegativeCredit={totalNegativeCredit}
              debtCompanyCount={debtCount}
              creditCompanyCount={creditCount}
              zeroCompanyCount={zeroCount}
              currency={dbState.settings?.currency || '₺'}
              fiscalYear={dbState.settings?.fiscalYear || 2026}
              onFilterClick={(filter) => setActiveFilter(filter)}
              activeFilter={activeFilter}
            />

            {/* Grid or List View */}
            {viewMode === 'grid' ? (
              <CompanyGrid
                summaries={summaries}
                onSelectCompany={(comp) => setSelectedCompanyId(comp.id)}
                onAddCompanyAtSlot={(row, col) =>
                  setCompanyModalData({ isOpen: true, suggestedRow: row, suggestedCol: col })
                }
                searchQuery={searchQuery}
                activeFilter={activeFilter}
                currency={dbState.settings?.currency || '₺'}
              />
            ) : (
              <CompanyListView
                summaries={summaries}
                onSelectCompany={(comp) => setSelectedCompanyId(comp.id)}
                searchQuery={searchQuery}
                currency={dbState.settings?.currency || '₺'}
              />
            )}
          </main>

          {/* Clean Footer Bar */}
          <footer className="bg-[#181d24] border-t border-slate-700/80 px-6 py-2.5 text-center text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-300">
                {dbState.settings.mainCompanyName}
              </span>
              <span>·</span>
              <span className="text-slate-400 font-mono">
                {dbState.accounts.length} Şirket Kayıtlı
              </span>
              <span>·</span>
              <span className="text-slate-400 font-mono">
                {dbState.invoices.length} Fatura / {dbState.payments.length} Ödeme
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-emerald-400">● SQLite & IndexedDB Aktif</span>
              <span>·</span>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="hover:text-white underline cursor-pointer"
              >
                Ayarlar (Ctrl+,)
              </button>
              <span>·</span>
              <button
                onClick={() => setIsBackupModalOpen(true)}
                className="hover:text-white underline cursor-pointer"
              >
                Yedek Al (Ctrl+S)
              </button>
            </div>
          </footer>
        </>
      )}

      {/* Settings Modal (Yıl Seçimi, Ana Şirket vb.) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={dbState.settings}
        onSaveSettings={handleSaveSettings}
        onResetAllData={handleResetAllData}
      />

      {/* Backup and SQL Management Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        state={dbState}
        onRestoreState={handleRestoreState}
        onResetToDefault={handleResetAllData}
      />

      {/* Company Add / Edit Modal */}
      <CompanyModal
        isOpen={companyModalData.isOpen}
        onClose={() => setCompanyModalData({ isOpen: false })}
        onSave={handleSaveCompany}
        onDelete={handleDeleteCompany}
        maxRowInUse={maxRowInUse}
        initialData={{
          company: companyModalData.company,
          suggestedRow: companyModalData.suggestedRow,
          suggestedCol: companyModalData.suggestedCol
        }}
      />

      {/* Global In-App Confirmation Modal */}
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
    </div>
  );
}
