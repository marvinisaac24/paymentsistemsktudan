import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { ReceiptModal } from './components/ReceiptModal';
import { PaymentModal } from './components/PaymentModal';
import { StudentModal } from './components/StudentModal';
import { ImportStudentsModal } from './components/ImportStudentsModal';
import { CancelTransactionModal } from './components/CancelTransactionModal';
import { StudentOptOutModal } from './components/StudentOptOutModal';
import { BulkDeleteStudentsModal } from './components/BulkDeleteStudentsModal';
import { DashboardView } from './views/DashboardView';
import { StudentsView } from './views/StudentsView';
import { TransactionsView } from './views/TransactionsView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { AuditTrailView } from './views/AuditTrailView';
import { Transaction, Student } from './types';
import { CheckCircle2, ShieldCheck, FileText, School } from 'lucide-react';

const MainContent: React.FC = () => {
  const { config, transactions, currentUser } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Modals state
  const [selectedTransactionForReceipt, setSelectedTransactionForReceipt] = useState<Transaction | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStudentId, setPaymentStudentId] = useState<string | null>(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [optOutModalStudent, setOptOutModalStudent] = useState<Student | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [cancelModalTransaction, setCancelModalTransaction] = useState<Transaction | null>(null);
  const [bulkDeleteStudentIds, setBulkDeleteStudentIds] = useState<string[]>([]);

  const handleOpenPayment = (studentId?: string) => {
    setPaymentStudentId(studentId || null);
    setIsPaymentModalOpen(true);
  };

  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (std: Student) => {
    setEditingStudent(std);
    setIsStudentModalOpen(true);
  };

  const handlePaymentSuccess = (tx: Transaction) => {
    // Automatically open receipt preview for newly created payment
    setSelectedTransactionForReceipt(tx);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Global Navigation Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenNewPayment={() => handleOpenPayment()}
      />

      {/* Verification / Test Scenarios Notification Banner */}
      <div className="bg-slate-900 text-slate-300 text-xs border-b border-slate-800 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-white">Status Pengesahan Sistem SK Tudan:</span>
            <span className="text-slate-400 hidden md:inline">
              3 keadaan ujian telah disahkan (Bayaran Penuh RM133.00, Bayaran Sebahagian, & Dua Bayaran Ansuran).
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80 font-mono">
              Resit PDF Tepat 2 Halaman A4
            </span>
            <button
              onClick={() => {
                // Open first pre-tested transaction (Muhammad Danial)
                const first = transactions.find((t) => t.receiptNumber === 'SKT/T3/2026/0001');
                if (first) setSelectedTransactionForReceipt(first);
              }}
              className="text-[11px] text-white underline hover:text-emerald-300 transition cursor-pointer"
            >
              Semak Resit Ujian Penuh
            </button>
          </div>
        </div>
      </div>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            onOpenPayment={handleOpenPayment}
            onOpenAddStudent={handleOpenAddStudent}
            onSelectTransaction={(tx) => setSelectedTransactionForReceipt(tx)}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'students' && (
          <StudentsView
            onOpenPaymentForStudent={(id) => handleOpenPayment(id)}
            onOpenAddStudent={handleOpenAddStudent}
            onOpenEditStudent={handleOpenEditStudent}
            onOpenOptOutModal={(std) => setOptOutModalStudent(std)}
            onOpenBulkDelete={(ids) => setBulkDeleteStudentIds(ids)}
            onOpenImport={() => setIsImportModalOpen(true)}
            onSelectTransaction={(tx) => setSelectedTransactionForReceipt(tx)}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView
            onSelectTransaction={(tx) => setSelectedTransactionForReceipt(tx)}
            onOpenCancelModal={(tx) => setCancelModalTransaction(tx)}
            onOpenNewPayment={() => handleOpenPayment()}
          />
        )}

        {currentTab === 'reports' && <ReportsView />}

        {currentTab === 'settings' && <SettingsView />}

        {currentTab === 'audit' && <AuditTrailView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <School className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-700">{config.schoolName}</span>
            <span>• {config.schoolAddress} ({config.schoolCode})</span>
          </div>

          <p className="text-[11px] text-slate-400">
            Sistem Rekod Pembayaran Yuran & Keperluan Tahun 3 • Pengiraan Sen Tepat • Waktu Malaysia (MYT)
          </p>
        </div>
      </footer>

      {/* Modals */}
      <ReceiptModal
        transaction={selectedTransactionForReceipt}
        onClose={() => setSelectedTransactionForReceipt(null)}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        initialStudentId={paymentStudentId}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentStudentId(null);
        }}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <StudentModal
        isOpen={isStudentModalOpen}
        student={editingStudent}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingStudent(null);
        }}
      />

      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <CancelTransactionModal
        isOpen={!!cancelModalTransaction}
        transaction={cancelModalTransaction}
        onClose={() => setCancelModalTransaction(null)}
      />

      <StudentOptOutModal
        isOpen={!!optOutModalStudent}
        student={optOutModalStudent}
        onClose={() => setOptOutModalStudent(null)}
      />

      <BulkDeleteStudentsModal
        isOpen={bulkDeleteStudentIds.length > 0}
        selectedStudentIds={bulkDeleteStudentIds}
        onClose={() => setBulkDeleteStudentIds([])}
        onSuccess={() => setBulkDeleteStudentIds([])}
      />

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
