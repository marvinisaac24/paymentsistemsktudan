import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { db, auth, testConnection } from '../firebase';
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
import {
  findSuggestedSiblings,
  buildFamilyLookupIndex,
  findSuggestedSiblingsFast,
  FamilyLookupIndex,
} from '../utils/family';

interface AppContextType {
  config: SchoolConfig;
  feeItems: FeeItem[];
  students: Student[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
  authUser: FirebaseUser | null;
  isAuthChecking: boolean;
  logout: () => Promise<void>;
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
  setStudentSiblings: (studentId: string, siblingIds: string[]) => Promise<{ success: boolean; error?: string }>;
  
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
    isPibgFamilyPayment?: boolean;
    pibgRepresentativeStudentId?: string;
    pibgFamilySiblingIds?: string[];
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
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    name: 'LIM AI GIOK (Guru Besar)',
    role: 'Pentadbir',
  });

  const [config, setConfig] = useState<SchoolConfig>(() => {
    if (typeof window !== 'undefined') {
      const cachedLogo = localStorage.getItem('sk_tudan_school_logo');
      if (cachedLogo) {
        return { ...INITIAL_CONFIG, logoBase64: cachedLogo };
      }
    }
    return INITIAL_CONFIG;
  });
  const [feeItems, setFeeItems] = useState<FeeItem[]>(INITIAL_FEE_ITEMS);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);

  // Monitor Firebase Authentication State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setIsAuthChecking(false);

      // Re-load latest database records whenever user auth status changes or switches accounts
      loadState();

      if (user && user.email) {
        const emailLower = user.email.toLowerCase();
        const displayName = user.displayName || user.email.split('@')[0];

        // Determine role:
        // Guru Besar / Pentadbir: if email contains admin / lim / gurubesar or matches admin config
        const isAdmin =
          emailLower.includes('admin') ||
          emailLower.includes('gurubesar') ||
          emailLower.includes('limaigiok') ||
          emailLower.includes('yba4111') ||
          emailLower.includes('marvinisaac24'); // User developer / administrator email

        // Check if teacher name corresponds to any class teacher
        let teacherClass = '';
        if (config.classTeachers) {
          for (const [cls, teacherName] of Object.entries(config.classTeachers)) {
            if (
              displayName.toLowerCase().includes(teacherName.toLowerCase()) ||
              teacherName.toLowerCase().includes(displayName.toLowerCase())
            ) {
              teacherClass = cls;
              break;
            }
          }
        }

        const formattedName = user.displayName || displayName.toUpperCase();

        setCurrentUser({
          name: isAdmin ? (config.adminName ? `${config.adminName} (${config.adminTitle || 'Guru Besar'})` : formattedName) : formattedName,
          role: isAdmin ? 'Pentadbir' : 'Guru/Petugas',
          email: user.email,
          uid: user.uid,
          photoURL: user.photoURL || undefined,
          assignedClass: teacherClass || undefined,
        });
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, [config.adminName, config.adminTitle, config.classTeachers]);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setAuthUser(null);
    } catch (err) {
      console.error('Gagal log keluar:', err);
    }
  };

  // Sync config specifically to Firestore config/school_config
  const syncConfigToFirestoreDoc = async (cfg: SchoolConfig) => {
    try {
      const cfgRef = doc(db, 'config', 'school_config');
      await setDoc(cfgRef, { ...cfg, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Direct Firestore config sync skipped/deferred:', err);
    }
  };

  // Sync state data to Firestore to guarantee persistent real-time propagation across teachers
  const syncToFirestore = async (stateData?: {
    config?: SchoolConfig;
    feeItems?: FeeItem[];
    students?: Student[];
    transactions?: Transaction[];
    auditLogs?: AuditLog[];
  }) => {
    // Circuit breaker: skip writing to Firestore if quota has been exceeded today
    if (typeof window !== 'undefined' && (window as any).__firestore_quota_exhausted__) {
      return;
    }

    try {
      const currentConfig = stateData?.config || config;
      // Strip huge logoBase64 from sk_tudan_state document to avoid exceeding 1MB limit
      const configSummary = { ...currentConfig };
      delete configSummary.logoBase64;

      const stateDocRef = doc(db, 'system', 'sk_tudan_state');
      const payload = {
        config: configSummary,
        feeItems: stateData?.feeItems || feeItems,
        students: stateData?.students || students,
        transactions: stateData?.transactions || transactions,
        auditLogs: stateData?.auditLogs || auditLogs,
        lastUpdated: new Date().toISOString(),
      };
      await setDoc(stateDocRef, payload, { merge: true });
      setIsRealtimeConnected(true);

      if (currentConfig.logoBase64) {
        await syncConfigToFirestoreDoc(currentConfig);
      }
    } catch (err: any) {
      if (
        err?.code === 'resource-exhausted' ||
        err?.message?.includes('Quota limit exceeded') ||
        err?.message?.includes('quota')
      ) {
        if (typeof window !== 'undefined') {
          (window as any).__firestore_quota_exhausted__ = true;
        }
        console.warn('Firestore write quota exceeded; switching to backend real-time synchronization.');
      }
    }
  };

  // Load from API with fallback to localStorage
  const loadState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          const cachedLogo = typeof window !== 'undefined' ? localStorage.getItem('sk_tudan_school_logo') : null;
          const finalConfig = {
            ...data.config,
            logoBase64: data.config.logoBase64 || cachedLogo || '',
          };
          setConfig(finalConfig);
          if (finalConfig.logoBase64) {
            try {
              localStorage.setItem('sk_tudan_school_logo', finalConfig.logoBase64);
            } catch {}
          }
        }
        if (Array.isArray(data.feeItems)) setFeeItems(data.feeItems);
        if (Array.isArray(data.students)) setStudents(data.students);
        if (Array.isArray(data.transactions)) setTransactions(data.transactions);
        if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        setIsLoading(false);
        return;
      }
    } catch {
      // Offline or direct client mode: read from localStorage
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.config) {
            const cachedLogo = localStorage.getItem('sk_tudan_school_logo');
            setConfig({
              ...parsed.config,
              logoBase64: parsed.config.logoBase64 || cachedLogo || '',
            });
          }
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

    // Verify Firestore connection silently
    testConnection()
      .then((connected) => {
        if (connected) setIsRealtimeConnected(true);
      })
      .catch(() => {});

    // 1. Real-Time Listener for School Configuration (config/school_config):
    // Syncs logo and school parameters across all teachers and emails immediately
    let unsubscribeConfig: (() => void) | null = null;
    try {
      const configDocRef = doc(db, 'config', 'school_config');
      unsubscribeConfig = onSnapshot(
        configDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const remoteConfig = snapshot.data() as SchoolConfig;
            if (remoteConfig) {
              setConfig((prev) => {
                const merged = {
                  ...prev,
                  ...remoteConfig,
                  logoBase64: remoteConfig.logoBase64 || prev.logoBase64 || '',
                };
                if (merged.logoBase64) {
                  try {
                    localStorage.setItem('sk_tudan_school_logo', merged.logoBase64);
                  } catch {}
                }
                return merged;
              });
            }
          }
        },
        (err) => {
          console.warn('Firestore config onSnapshot listener notification:', err.message);
        }
      );
    } catch (err) {
      console.warn('Could not initialize Firestore config onSnapshot listener:', err);
    }

    // 2. Firestore Real-Time Listener (system/sk_tudan_state):
    // Updates transactions, students, fee items, and audit logs instantly
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
              setTransactions((prevTx) => {
                if (Array.isArray(data.transactions) && data.transactions.length >= prevTx.length) {
                  return data.transactions as Transaction[];
                }
                return prevTx;
              });
              setStudents((prevStd) => {
                if (Array.isArray(data.students) && data.students.length >= prevStd.length) {
                  return data.students as Student[];
                }
                return prevStd;
              });
              if (data.config) {
                setConfig((prev) => ({
                  ...prev,
                  ...data.config,
                  // Never wipe out existing logo with empty value from state doc
                  logoBase64: data.config.logoBase64 || prev.logoBase64 || '',
                }));
              }
              if (Array.isArray(data.feeItems)) setFeeItems(data.feeItems as FeeItem[]);
              if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs as AuditLog[]);
            }
          }
        },
        (err) => {
          if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota')) {
            if (typeof window !== 'undefined') {
              (window as any).__firestore_quota_exhausted__ = true;
            }
          }
          console.warn('Firestore real-time sync notification:', err.message);
        }
      );
    } catch (err) {
      console.warn('Could not initialize Firestore onSnapshot listener:', err);
    }

    // Polling and window focus sync fallback (30 seconds to avoid wasting mobile CPU)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadState();
      }
    }, 30000);

    const handleFocus = () => {
      loadState();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      if (unsubscribeConfig) unsubscribeConfig();
      if (unsubscribeFirestore) unsubscribeFirestore();
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const refreshData = async () => {
    await loadState();
  };

  // Pre-indexed family lookup to guarantee sub-millisecond execution
  const familyIndex = useMemo(() => {
    return buildFamilyLookupIndex(students);
  }, [students]);

  // Pre-grouped transactions by studentId
  const validTransactionsByStudent = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (tx.status === 'Sah') {
        let arr = map.get(tx.studentId);
        if (!arr) {
          arr = [];
          map.set(tx.studentId, arr);
        }
        arr.push(tx);
      }
    }
    return map;
  }, [transactions]);

  // Pre-filtered valid PIBG transactions to avoid scanning entire transaction list per student
  const validPibgTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.status === 'Sah' &&
        t.items?.some((it) => it.feeItemName.toLowerCase().includes('pibg') && it.currentPaymentCents > 0)
    );
  }, [transactions]);

  // Active fee items cache
  const activeFeeItems = useMemo(() => {
    return feeItems.filter((f) => f.active);
  }, [feeItems]);

  // Helper to calculate student payment summary (Optimized for instant execution)
  const getStudentSummary = (studentId: string): StudentPaymentSummary | null => {
    const student = familyIndex.studentMap.get(studentId) || students.find((s) => s.id === studentId);
    if (!student) return null;

    const validTxs = validTransactionsByStudent.get(studentId) || [];

    // Build paid amounts map per item
    const paidPerItem = new Map<string, number>();
    let totalPaid = 0;

    for (let i = 0; i < validTxs.length; i++) {
      const tx = validTxs[i];
      totalPaid += tx.totalAmountCents;
      for (let j = 0; j < tx.items.length; j++) {
        const it = tx.items[j];
        const cur = paidPerItem.get(it.feeItemId) || 0;
        paidPerItem.set(it.feeItemId, cur + it.currentPaymentCents);
      }
    }

    // Check if this student is covered by a family PIBG payment via sibling representative
    let familyPibgTx: Transaction | null = null;
    let isCoveredByFamilyRep = false;

    // Check if the student themselves paid PIBG directly
    let directPibgPaid = false;
    for (const [itemId, amt] of paidPerItem.entries()) {
      const f = feeItems.find((x) => x.id === itemId);
      if ((f?.name.toLowerCase().includes('pibg') || f?.code === 'PBG') && amt > 0) {
        directPibgPaid = true;
        break;
      }
    }

    if (!directPibgPaid) {
      // Auto-detect all family members / siblings for this student using fast O(1) index
      const detectedFam = findSuggestedSiblingsFast(student, familyIndex);
      const allFamilyMemberIds = new Set<string>([
        studentId,
        ...(student.siblingIds || []),
        ...detectedFam.allFamilyMembers.map((s) => s.id),
      ]);

      // Scan only PIBG transactions (typically a small list)
      for (let i = 0; i < validPibgTransactions.length; i++) {
        const tx = validPibgTransactions[i];

        // 1. Explicitly recorded in pibgFamilySiblingIds
        if (tx.pibgFamilySiblingIds && tx.pibgFamilySiblingIds.includes(studentId)) {
          familyPibgTx = tx;
          isCoveredByFamilyRep = true;
          break;
        }

        // 2. Transaction student is one of the detected family members / siblings
        if (
          allFamilyMemberIds.has(tx.studentId) ||
          (tx.pibgRepresentativeStudentId && allFamilyMemberIds.has(tx.pibgRepresentativeStudentId))
        ) {
          familyPibgTx = tx;
          isCoveredByFamilyRep = true;
          break;
        }

        // 3. Or transaction covers any of this student's family members
        if (tx.pibgFamilySiblingIds && tx.pibgFamilySiblingIds.some((sId) => allFamilyMemberIds.has(sId))) {
          familyPibgTx = tx;
          isCoveredByFamilyRep = true;
          break;
        }
      }
    } else {
      // Student is direct payer. Find if this student has a transaction with PIBG
      const repTx = validTxs.find((t) =>
        t.items.some((it) => it.feeItemName.toLowerCase().includes('pibg') && it.currentPaymentCents > 0)
      );
      if (repTx) {
        familyPibgTx = repTx;
      }
    }

    const optOutSet = new Set(student.optOutItemIds || []);

    let totalFeeCents = 0;
    let optedOutCount = 0;

    const itemBalances = activeFeeItems.map((item) => {
      const isPibg = item.name.toLowerCase().includes('pibg') || item.code === 'PBG';
      const paid = paidPerItem.get(item.id) || 0;
      const isOptedOut = optOutSet.has(item.id);
      if (isOptedOut) optedOutCount++;

      let remaining = 0;
      let isItemPaid = false;
      let isPaidViaFamilyRepresentative = false;
      let familyPibgPaymentInfo = undefined;

      if (isPibg && isCoveredByFamilyRep && familyPibgTx) {
        // Covered by family representative
        isPaidViaFamilyRepresentative = true;
        isItemPaid = true;
        remaining = 0;
        familyPibgPaymentInfo = {
          representativeStudentId: familyPibgTx.pibgRepresentativeStudentId || familyPibgTx.studentId,
          representativeStudentName: familyPibgTx.pibgRepresentativeStudentName || familyPibgTx.studentName,
          representativeClassName: familyPibgTx.pibgRepresentativeClassName || familyPibgTx.studentClass,
          receiptNumber: familyPibgTx.receiptNumber,
          transactionId: familyPibgTx.id,
          paidDate: familyPibgTx.timestampMalaysia || familyPibgTx.timestamp,
          amountCents:
            familyPibgTx.items.find((i) => i.feeItemName.toLowerCase().includes('pibg'))?.currentPaymentCents ||
            item.amountCents,
          notes: familyPibgTx.notes,
        };
      } else {
        if (!isOptedOut) {
          totalFeeCents += item.amountCents;
          remaining = Math.max(0, item.amountCents - paid);
        } else {
          if (paid > 0) {
            totalFeeCents += paid;
            remaining = 0;
          }
        }
        isItemPaid = paid >= item.amountCents || (isOptedOut && remaining === 0);
      }

      return {
        feeItemId: item.id,
        feeItemName: item.name,
        rateCents: item.amountCents,
        paidCents: paid,
        remainingCents: remaining,
        isPaid: isItemPaid,
        isOptedOut,
        isPaidViaFamilyRepresentative,
        familyPibgPaymentInfo,
      };
    });

    const balanceCents = Math.max(0, totalFeeCents - totalPaid);

    let status: 'Belum Bayar' | 'Bayar Sebahagian' | 'Selesai' = 'Belum Bayar';
    if (balanceCents === 0 && (totalPaid > 0 || isCoveredByFamilyRep || optedOutCount === activeFeeItems.length)) {
      status = 'Selesai';
    } else if (totalPaid > 0 && balanceCents > 0) {
      status = 'Bayar Sebahagian';
    } else {
      status = 'Belum Bayar';
    }

    // Fast linked siblings mapping
    const detectedFamSiblings = findSuggestedSiblingsFast(student, familyIndex);
    const combinedSiblingMap = new Map<string, Student>();
    for (let i = 0; i < detectedFamSiblings.allFamilyMembers.length; i++) {
      const sib = detectedFamSiblings.allFamilyMembers[i];
      if (sib.id !== student.id) combinedSiblingMap.set(sib.id, sib);
    }
    for (const sId of student.siblingIds || []) {
      const s = familyIndex.studentMap.get(sId);
      if (s && s.id !== student.id) combinedSiblingMap.set(s.id, s);
    }
    const linkedSiblings = Array.from(combinedSiblingMap.values()).map((s) => ({
      id: s.id,
      name: s.name,
      className: s.className,
      schoolYear: s.schoolYear,
    }));

    let pibgFamilyPayment = undefined;
    if (familyPibgTx) {
      const isRep = (familyPibgTx.pibgRepresentativeStudentId || familyPibgTx.studentId) === studentId;
      pibgFamilyPayment = {
        isPaid: true,
        isRepresentative: isRep,
        representativeName: familyPibgTx.pibgRepresentativeStudentName || familyPibgTx.studentName,
        representativeClass: familyPibgTx.pibgRepresentativeClassName || familyPibgTx.studentClass,
        receiptNumber: familyPibgTx.receiptNumber,
        transactionId: familyPibgTx.id,
        paidDate: familyPibgTx.timestampMalaysia || familyPibgTx.timestamp,
        amountCents:
          familyPibgTx.items.find((i) => i.feeItemName.toLowerCase().includes('pibg'))?.currentPaymentCents || 2000,
        notes: familyPibgTx.notes,
        siblings: familyPibgTx.pibgFamilySiblingNamesWithClasses || [],
      };
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
      linkedSiblings,
      pibgFamilyPayment,
    };
  };

  // Ultra-fast Memoized summaries for all students
  const allStudentSummaries = useMemo(() => {
    const list: StudentPaymentSummary[] = [];
    for (let i = 0; i < students.length; i++) {
      const summary = getStudentSummary(students[i].id);
      if (summary) list.push(summary);
    }
    return list;
  }, [students, validTransactionsByStudent, validPibgTransactions, activeFeeItems, familyIndex]);

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

  // 3b. Update Student Sibling Links
  const setStudentSiblings = async (studentId: string, siblingIds: string[]) => {
    try {
      const res = await fetch(`/api/students/${studentId}/siblings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siblingIds, user: currentUser }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal mengemas kini pautan adik-beradik.' };
      }
      await refreshData();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Ralat komunikasi dengan server.' };
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
    isPibgFamilyPayment?: boolean;
    pibgRepresentativeStudentId?: string;
    pibgFamilySiblingIds?: string[];
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
    // 1. Immediately cache logo in localStorage if updated or removed
    if (newConfig.logoBase64 !== undefined) {
      try {
        if (newConfig.logoBase64) {
          localStorage.setItem('sk_tudan_school_logo', newConfig.logoBase64);
        } else {
          localStorage.removeItem('sk_tudan_school_logo');
        }
      } catch {}
    }

    // 2. Optimistic local state update
    setConfig((prev) => ({ ...prev, ...newConfig }));

    // 3. Direct Firestore document update for instant real-time sync across all devices & emails
    try {
      const cfgRef = doc(db, 'config', 'school_config');
      await setDoc(cfgRef, { ...newConfig, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (fsErr) {
      console.warn('Direct Firestore config sync deferred to backend:', fsErr);
    }

    // 4. Server API update
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
      setConfig((prev) => ({
        ...prev,
        ...data,
        logoBase64: data.logoBase64 || newConfig.logoBase64 || prev.logoBase64 || '',
      }));
      await refreshData();
      return { success: true };
    } catch (e: any) {
      return { success: true };
    }
  };

  // 9. Update Class Teachers
  const updateClassTeachers = async (classTeachers: Record<string, string>) => {
    setConfig((prev) => ({ ...prev, classTeachers }));
    try {
      const cfgRef = doc(db, 'config', 'school_config');
      await setDoc(cfgRef, { classTeachers, updatedAt: new Date().toISOString() }, { merge: true });
    } catch {}

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
      return { success: true };
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
        authUser,
        isAuthChecking,
        logout,
        isLoading,
        isRealtimeConnected,
        refreshData,
        addStudent,
        updateStudent,
        deleteStudent,
        deleteStudentsBulk,
        updateStudentOptOutItems,
        importStudents,
        setStudentSiblings,
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
