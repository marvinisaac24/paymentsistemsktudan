import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, testConnection } from '../firebase';
import {
  FeeItem,
  SchoolConfig,
  Student,
  Transaction,
  AuditLog,
  CurrentUser,
  StudentPaymentSummary,
  DashboardStats,
  PaymentMethod,
} from '../types';
import {
  INITIAL_CONFIG,
  INITIAL_FEE_ITEMS,
  INITIAL_STUDENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
} from '../data/initialData';
import { getMalaysiaDateTime } from '../utils/currency';

interface AppContextType {
  config: SchoolConfig;
  feeItems: FeeItem[];
  students: Student[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
  isLoading: boolean;
  isRealtimeConnected: boolean;
  refreshData: () => Promise<void>;
  
  // Student Actions
  addStudent: (student: Partial<Student>) => Promise<{ success: boolean; error?: string; student?: Student }>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<{ success: boolean; error?: string }>;
  deleteStudent: (id: string, force?: boolean) => Promise<{ success: boolean; error?: string }>;
  deleteStudentsBulk: (studentIds: string[], forceDeleteWithTransactions?: boolean, reason?: string) => Promise<{
    success: boolean;
    deletedCount?: number;
    requiresForce?: boolean;
    studentsWithTransactions?: string[];
    error?: string;
  }>;
  updateStudentOptOutItems: (studentId: string, optOutItemIds: string[]) => Promise<{ success: boolean; error?: string }>;
  importStudents: (list: Partial<Student>[]) => Promise<{ addedCount: number; skippedCount: number; skipped: { name: string; reason: string }[] }>;
  
  // Transaction Actions
  recordPayment: (paymentData: {
    studentId: string;
    payerName: string;
    payerPhone?: string;
    items: { feeItemId: string; currentPaymentCents: number }[];
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    notes?: string;
    amountTenderedCents?: number;
    changeReturnedCents?: number;
    changeReturnedStatus?: 'Sudah Dipulangkan' | 'Belum Dipulangkan' | 'Tiada Baki';
  }) => Promise<{ success: boolean; transaction?: Transaction; error?: string }>;
  
  cancelTransaction: (id: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  deleteTransaction: (id: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  updateTransaction: (
    id: string,
    updateData: {
      payerName?: string;
      payerPhone?: string;
      paymentMethod?: PaymentMethod;
      referenceNumber?: string;
      notes?: string;
      amountTenderedCents?: number;
      changeReturnedCents?: number;
      changeReturnedStatus?: 'Sudah Dipulangkan' | 'Belum Dipulangkan' | 'Tiada Baki';
      items?: { feeItemId: string; currentPaymentCents: number }[];
    }
  ) => Promise<{ success: boolean; transaction?: Transaction; error?: string }>;
  markChangeReturned: (id: string, status?: 'Sudah Dipulangkan' | 'Belum Dipulangkan') => Promise<{ success: boolean; error?: string }>;
  markReceiptPrinted: (id: string) => Promise<void>;
  
  // Settings Actions
  updateFeeItems: (items: FeeItem[]) => Promise<{ success: boolean; error?: string }>;
  updateConfig: (newConfig: Partial<SchoolConfig>) => Promise<{ success: boolean; error?: string }>;
  updateClassTeachers: (classTeachers: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  parseClassTeachersFile: (
    fileBase64: string,
    fileName: string,
    mimeType: string
  ) => Promise<{
    success: boolean;
    extracted?: { className: string; teacherName: string }[];
    totalFound?: number;
    fileName?: string;
    error?: string;
  }>;
  
  // Helpers
  getStudentSummary: (studentId: string) => StudentPaymentSummary | null;
  allStudentSummaries: StudentPaymentSummary[];
  stats: DashboardStats;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'sk_tudan_yuran_data_v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    name: 'LIM AI GIOK (Guru Besar)',
    role: 'Pentadbir',
  });

  const [config, setConfig] = useState<SchoolConfig>(INITIAL_CONFIG);
  const [feeItems, setFeeItems] = useState<FeeItem[]>(INITIAL_FEE_ITEMS);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  // Sync state data to Firestore to guarantee persistent real-time propagation across teachers
  const syncToFirestore = async (stateData?: {
    config?: SchoolConfig;
    feeItems?: FeeItem[];
    students?: Student[];
    transactions?: Transaction[];
    auditLogs?: AuditLog[];
  }) => {
    try {
      const stateDocRef = doc(db, 'system', 'sk_tudan_state');
      const payload = stateData || {
        config,
        feeItems,
        students,
        transactions,
        auditLogs,
        lastUpdated: new Date().toISOString(),
      };
      await setDoc(stateDocRef, payload, { merge: true });
      setIsRealtimeConnected(true);
    } catch {
      // Offline or network fallback
    }
  };

  // Load from API with fallback to localStorage
  const loadState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
        if (Array.isArray(data.feeItems)) setFeeItems(data.feeItems);
        if (Array.isArray(data.students)) setStudents(data.students);
        if (Array.isArray(data.transactions)) setTransactions(data.transactions);
        if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        setIsLoading(false);
        // Silently sync to Firestore
        syncToFirestore(data).catch(() => {});
        return;
      }
    } catch {
      // Offline or direct client mode: read from localStorage
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.config) setConfig(parsed.config);
          if (parsed.feeItems) setFeeItems(parsed.feeItems);
          if (parsed.students) setStudents(parsed.students);
          if (parsed.transactions) setTransactions(parsed.transactions);
          if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
        } catch (e) {
          console.error('Failed to parse cached local data', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadState();

    // Verify Firestore connection
    testConnection().then((connected) => {
      if (connected) setIsRealtimeConnected(true);
    });

    // Firestore Real-Time Listener (onSnapshot): Updates instantly whenever any teacher adds or modifies records
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      const stateDocRef = doc(db, 'system', 'sk_tudan_state');
      unsubscribeFirestore = onSnapshot(
        stateDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data) {
              setIsRealtimeConnected(true);
              if (data.config) setConfig(data.config as SchoolConfig);
              if (Array.isArray(data.feeItems)) setFeeItems(data.feeItems as FeeItem[]);
              if (Array.isArray(data.students)) setStudents(data.students as Student[]);
              if (Array.isArray(data.transactions)) setTransactions(data.transactions as Transaction[]);
              if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs as AuditLog[]);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
              } catch {
                // ignore
              }
            }
          }
        },
        (err) => {
          console.warn('Firestore onSnapshot listener notice:', err.message);
        }
      );
    } catch (err) {
      console.warn('Could not initialize Firestore onSnapshot listener:', err);
    }

    // Polling and window focus sync fallback
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadState();
      }
    }, 4000);

    const handleFocus = () => {
      loadState();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const refreshData = async () => {
    await loadState();
  };

  // Helper to calculate student payment summary
  const getStudentSummary = (studentId: string): StudentPaymentSummary | null => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return null;

    const validTxs = transactions.filter((t) => t.studentId === studentId && t.status === 'Sah');

    // Build paid amounts map per item
    const paidPerItem = new Map<string, number>();
    let totalPaid = 0;

    for (const tx of validTxs) {
      totalPaid += tx.totalAmountCents;
      for (const it of tx.items) {
        const cur = paidPerItem.get(it.feeItemId) || 0;
        paidPerItem.set(it.feeItemId, cur + it.currentPaymentCents);
      }
    }

    const optOutSet = new Set(student.optOutItemIds || []);
    const activeItems = feeItems.filter((f) => f.active);

    let totalFeeCents = 0;
    let optedOutCount = 0;

    const itemBalances = activeItems.map((item) => {
      const paid = paidPerItem.get(item.id) || 0;
      const isOptedOut = optOutSet.has(item.id);
      if (isOptedOut) optedOutCount++;

      let remaining = 0;
      if (!isOptedOut) {
        totalFeeCents += item.amountCents;
        remaining = Math.max(0, item.amountCents - paid);
      } else {
        if (paid > 0) {
          totalFeeCents += paid;
          remaining = 0;
        }
      }

      return {
        feeItemId: item.id,
        feeItemName: item.name,
        rateCents: item.amountCents,
        paidCents: paid,
        remainingCents: remaining,
        isPaid: paid >= item.amountCents || (isOptedOut && remaining === 0),
        isOptedOut,
      };
    });

    const balanceCents = Math.max(0, totalFeeCents - totalPaid);

    let status: 'Belum Bayar' | 'Bayar Sebahagian' | 'Selesai' = 'Belum Bayar';
    if (balanceCents === 0 && (totalPaid > 0 || optedOutCount === activeItems.length)) {
      status = 'Selesai';
    } else if (totalPaid > 0 && balanceCents > 0) {
      status = 'Bayar Sebahagian';
    } else {
      status = 'Belum Bayar';
    }

    return {
      student,
      totalFeeCents,
      paidCents: totalPaid,
      balanceCents,
      status,
      itemBalances,
      transactionCount: validTxs.length,
      optedOutCount,
    };
  };

  // Memoized summaries for all students
  const allStudentSummaries = useMemo(() => {
    return students.map((std) => getStudentSummary(std.id)!).filter(Boolean);
  }, [students, transactions, feeItems]);

  // Overall Dashboard Statistics
  const stats: DashboardStats = useMemo(() => {
    let totalCollections = 0;
    let completedCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    for (const summary of allStudentSummaries) {
      totalCollections += summary.paidCents;
      if (summary.status === 'Selesai') completedCount++;
      else if (summary.status === 'Bayar Sebahagian') partialCount++;
      else unpaidCount++;
    }

    const totalStudents = students.length;
    const activeFeeSum = feeItems.filter((f) => f.active).reduce((s, it) => s + it.amountCents, 0);
    const totalExpectedCollections = totalStudents * activeFeeSum;
    const totalPending = Math.max(0, totalExpectedCollections - totalCollections);

    const totalTransactionsCount = transactions.filter((t) => t.status === 'Sah').length;
    const cancelledTransactionsCount = transactions.filter((t) => t.status === 'Dibatalkan').length;

    return {
      totalStudents,
      totalCollectionsCents: totalCollections,
      totalPendingCents: totalPending,
      completedStudentsCount: completedCount,
      partialStudentsCount: partialCount,
      unpaidStudentsCount: unpaidCount,
      totalTransactionsCount,
      cancelledTransactionsCount,
    };
  }, [allStudentSummaries, students, feeItems, transactions]);

  // 1. Add Student
  const addStudent = async (studentData: Partial<Student>) => {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student: studentData, user: currentUser }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal menambah murid.' };
      }
      await refreshData();
      return { success: true, student: data };
    } catch {
      // Local fallback
      const time = getMalaysiaDateTime();
      const newStudent: Student = {
        id: `std_${Date.now()}`,
        name: studentData.name!.trim(),
        className: studentData.className!.trim(),
        myKid: studentData.myKid?.trim() || '',
        parentName: studentData.parentName?.trim() || '',
        parentPhone: studentData.parentPhone?.trim() || '',
        schoolYear: studentData.schoolYear || config.currentSchoolYear,
        createdAt: time.iso,
        updatedAt: time.iso,
      };
      setStudents((prev) => [...prev, newStudent]);
      return { success: true, student: newStudent };
    }
  };

  // 2. Update Student
  const updateStudent = async (id: string, studentData: Partial<Student>) => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student: studentData, user: currentUser }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal mengemas kini murid.' };
      }
      await refreshData();
      return { success: true };
    } catch {
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...studentData, updatedAt: new Date().toISOString() } : s))
      );
      return { success: true };
    }
  };

  // 2b. Delete Single Student
  const deleteStudent = async (id: string, force?: boolean) => {
    // Optimistic immediate UI update
    setStudents((prev) => prev.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        await refreshData();
        return { success: false, error: data.error || 'Gagal memadam murid.' };
      }
      await refreshData();
      return { success: true };
    } catch (e: any) {
      return { success: true };
    }
  };

  // 2c. Bulk Delete Students
  const deleteStudentsBulk = async (
    studentIds: string[],
    forceDeleteWithTransactions?: boolean,
    reason?: string
  ) => {
    // Optimistic immediate UI update
    const idSet = new Set(studentIds);
    setStudents((prev) => prev.filter((s) => !idSet.has(s.id)));

    try {
      const res = await fetch('/api/students/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds,
          forceDeleteWithTransactions: true,
          reason: reason || 'Pemadaman pukal oleh pengguna',
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        await refreshData();
        return {
          success: false,
          error: data.error || 'Gagal memadam murid secara pukal.',
        };
      }
      await refreshData();
      return {
        success: true,
        deletedCount: data.deletedCount || studentIds.length,
      };
    } catch (e: any) {
      return {
        success: true,
        deletedCount: studentIds.length,
      };
    }
  };

  // 2d. Update Student Opt-Out Item Preferences (Optional items chosen by parents)
  const updateStudentOptOutItems = async (studentId: string, optOutItemIds: string[]) => {
    return updateStudent(studentId, { optOutItemIds });
  };

  // 3. Bulk Import
  const importStudents = async (list: Partial<Student>[]) => {
    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list, user: currentUser }),
      });
      const data = await res.json();
      await refreshData();
      return {
        addedCount: data.addedCount || 0,
        skippedCount: data.skippedCount || 0,
        skipped: data.skipped || [],
      };
    } catch (e: any) {
      return {
        addedCount: 0,
        skippedCount: list.length,
        skipped: [{ name: 'Semua', reason: e.message || 'Ralat sambungan import' }],
      };
    }
  };

  // 4. Record Payment
  const recordPayment = async (paymentData: {
    studentId: string;
    payerName: string;
    payerPhone?: string;
    items: { feeItemId: string; currentPaymentCents: number }[];
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    notes?: string;
    amountTenderedCents?: number;
    changeReturnedCents?: number;
    changeReturnedStatus?: 'Sudah Dipulangkan' | 'Belum Dipulangkan' | 'Tiada Baki';
  }) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paymentData, user: currentUser }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal merekodkan bayaran.' };
      }
      await refreshData();
      return { success: true, transaction: data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Ralat komunikasi dengan server.' };
    }
  };

  // 5. Cancel Transaction
  const cancelTransaction = async (id: string, reason: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, user: currentUser }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal membatalkan transaksi.' };
      }
      await refreshData();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Ralat komunikasi dengan server.' };
    }
  };

  // 5b. Delete Transaction (Padam Pembayaran Tersalah Daftar)
  const deleteTransaction = async (id: string, reason?: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, user: currentUser }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal memadam pembayaran.' };
      }
      await refreshData();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Ralat komunikasi dengan server.' };
    }
  };

  // 5c. Update / Edit Transaction (Kemas Kini Bayaran jika tersalah isi)
  const updateTransaction = async (
    id: string,
    updateData: {
      payerName?: string;
      payerPhone?: string;
      paymentMethod?: PaymentMethod;
      referenceNumber?: string;
      notes?: string;
      amountTenderedCents?: number;
      changeReturnedCents?: number;
      changeReturnedStatus?: 'Sudah Dipulangkan' | 'Belum Dipulangkan' | 'Tiada Baki';
      items?: { feeItemId: string; currentPaymentCents: number }[];
    }
  ) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updateData, user: currentUser }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal mengemas kini transaksi.' };
      }
      await refreshData();
      return { success: true, transaction: data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Ralat komunikasi dengan server.' };
    }
  };

  // 5d. Mark Change Returned
  const markChangeReturned = async (id: string, status: 'Sudah Dipulangkan' | 'Belum Dipulangkan' = 'Sudah Dipulangkan') => {
    try {
      const res = await fetch(`/api/transactions/${id}/return-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal mengemas kini status pemulangan baki.' };
      }
      await refreshData();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Ralat komunikasi dengan server.' };
    }
  };

  // 6. Mark Receipt Printed (Reprint Count)
  const markReceiptPrinted = async (id: string) => {
    try {
      await fetch(`/api/transactions/${id}/printed`, { method: 'POST' });
      // Update locally
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, printCount: (t.printCount || 1) + 1 } : t))
      );
    } catch (e) {
      console.error('Error recording print count', e);
    }
  };

  // 7. Update Fee Items
  const updateFeeItems = async (items: FeeItem[]) => {
    try {
      const res = await fetch('/api/fee-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, user: currentUser }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal mengemas kini kadar.' };
      }
      setFeeItems(data);
      await refreshData();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Gagal menyambung ke server.' };
    }
  };

  // 8. Update Config
  const updateConfig = async (newConfig: Partial<SchoolConfig>) => {
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig, user: currentUser }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal mengemas kini tetapan.' };
      }
      setConfig(data);
      await refreshData();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Gagal menyambung ke server.' };
    }
  };

  // 9. Update Class Teachers
  const updateClassTeachers = async (classTeachers: Record<string, string>) => {
    try {
      const res = await fetch('/api/class-teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classTeachers, user: currentUser }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal mengemas kini guru kelas.' };
      }
      setConfig((prev) => ({ ...prev, classTeachers: data }));
      await refreshData();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Gagal menyambung ke server.' };
    }
  };

  // 10. Parse Class Teachers Document File (PDF, Word, CSV, Excel, Image)
  const parseClassTeachersFile = async (
    fileBase64: string,
    fileName: string,
    mimeType: string
  ) => {
    try {
      const res = await fetch('/api/class-teachers/parse-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, fileName, mimeType, user: currentUser }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal memproses fail guru kelas.' };
      }
      return {
        success: true,
        extracted: data.extracted,
        totalFound: data.totalFound,
        fileName: data.fileName,
      };
    } catch (e: any) {
      return { success: false, error: e.message || 'Ralat sambungan ke server.' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        config,
        feeItems,
        students,
        transactions,
        auditLogs,
        currentUser,
        setCurrentUser,
        isLoading,
        isRealtimeConnected,
        refreshData,
        addStudent,
        updateStudent,
        deleteStudent,
        deleteStudentsBulk,
        updateStudentOptOutItems,
        importStudents,
        recordPayment,
        cancelTransaction,
        deleteTransaction,
        updateTransaction,
        markChangeReturned,
        markReceiptPrinted,
        updateFeeItems,
        updateConfig,
        updateClassTeachers,
        parseClassTeachersFile,
        getStudentSummary,
        allStudentSummaries,
        stats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp mesti digunakan di dalam AppProvider');
  }
  return context;
};
