import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Student, PaymentMethod, Transaction } from '../types';
import { formatRM, rmToCents, centsToRM, maskMyKid } from '../utils/currency';
import { findSuggestedSiblings, generatePibgFamilyNote } from '../utils/family';
import { fuzzyMatch } from '../utils/fuzzySearch';
import {
  CreditCard,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  FileText,
  Search,
  Camera,
  CheckSquare,
  Coins,
  Wallet,
  Banknote,
  Users,
  UserPlus,
  Link2,
  Trash2,
  Square,
  ShieldCheck,
} from 'lucide-react';

interface PaymentModalProps {
  initialStudentId?: string | null;
  initialAction?: 'photo-5r' | 'photo-8r' | 'photo-pano' | 'photos' | 'all';
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (transaction: Transaction) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  initialStudentId,
  initialAction,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const { students, feeItems, getStudentSummary, recordPayment, updateStudentOptOutItems, setStudentSiblings, currentUser } = useApp();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    return initialStudentId || (students.length > 0 ? students[0].id : '');
  });
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('');
  const [payerPhone, setPayerPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Sumbangan PIBG Mengikut Keluarga & Murid Wakil Pembayaran
  const [pibgRepStudentId, setPibgRepStudentId] = useState<string>('');
  const [repSearchInput, setRepSearchInput] = useState<string>('');
  const [isRepSearchOpen, setIsRepSearchOpen] = useState<boolean>(false);
  const [linkedSiblingIds, setLinkedSiblingIds] = useState<string[]>([]);
  const [siblingSearchInput, setSiblingSearchInput] = useState<string>('');
  const [isSiblingSearchOpen, setIsSiblingSearchOpen] = useState<boolean>(false);
  const [manualExtraSiblings, setManualExtraSiblings] = useState<Student[]>([]);
  const [customTeacherNote, setCustomTeacherNote] = useState<string>('');

  // Ruang Wang Tunai Diterima & Baki Perlu Dikembalikan Kepada Murid
  const [amountTenderedInput, setAmountTenderedInput] = useState<string>('');
  const [isChangeReturned, setIsChangeReturned] = useState<boolean>(true);

  // Map of feeItemId -> currentPaymentInput (string for smooth typing)
  const [itemInputs, setItemInputs] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize selected student whenever initialStudentId or isOpen changes
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    } else if (!selectedStudentId && students.length > 0) {
      // Pick first student with pending balance
      const pending = students.find((s) => {
        const sum = getStudentSummary(s.id);
        return sum && sum.balanceCents > 0;
      });
      setSelectedStudentId(pending ? pending.id : students[0].id);
    }
  }, [initialStudentId, students, isOpen]);

  // When selected student changes, populate payer and reset inputs
  const currentSummary = useMemo(() => {
    if (!selectedStudentId) return null;
    return getStudentSummary(selectedStudentId);
  }, [selectedStudentId, getStudentSummary]);

  const photoBalances = useMemo(() => {
    if (!currentSummary) return [];
    return currentSummary.itemBalances.filter((it) => {
      const name = it.feeItemName.toLowerCase();
      return name.includes('gambar') || name.includes('5r') || name.includes('8r') || name.includes('panorama');
    });
  }, [currentSummary]);

  const otherBalances = useMemo(() => {
    if (!currentSummary) return [];
    return currentSummary.itemBalances.filter((it) => {
      const name = it.feeItemName.toLowerCase();
      return !(name.includes('gambar') || name.includes('5r') || name.includes('8r') || name.includes('panorama'));
    });
  }, [currentSummary]);

  useEffect(() => {
    if (currentSummary) {
      setPayerName(currentSummary.student.parentName || '');
      setPayerPhone(currentSummary.student.parentPhone || '');
      
      const newInputs: Record<string, string> = {};

      if (initialAction === 'all') {
        currentSummary.itemBalances.forEach((it) => {
          if (it.remainingCents > 0) {
            newInputs[it.feeItemId] = (it.remainingCents / 100).toFixed(2);
          }
        });
      } else if (initialAction === 'photos') {
        currentSummary.itemBalances.forEach((it) => {
          const isPhoto =
            it.feeItemName.toLowerCase().includes('gambar') ||
            it.feeItemName.toLowerCase().includes('5r') ||
            it.feeItemName.toLowerCase().includes('8r') ||
            it.feeItemName.toLowerCase().includes('panorama');
          if (isPhoto && it.remainingCents > 0) {
            newInputs[it.feeItemId] = (it.remainingCents / 100).toFixed(2);
          }
        });
      } else if (initialAction === 'photo-5r') {
        const item5R = currentSummary.itemBalances.find((it) => it.feeItemName.toLowerCase().includes('5r'));
        if (item5R && item5R.remainingCents > 0) {
          newInputs[item5R.feeItemId] = (item5R.remainingCents / 100).toFixed(2);
        }
      } else if (initialAction === 'photo-8r') {
        const item8R = currentSummary.itemBalances.find((it) => it.feeItemName.toLowerCase().includes('8r'));
        if (item8R && item8R.remainingCents > 0) {
          newInputs[item8R.feeItemId] = (item8R.remainingCents / 100).toFixed(2);
        }
      } else if (initialAction === 'photo-pano') {
        const itemPano = currentSummary.itemBalances.find((it) => it.feeItemName.toLowerCase().includes('panorama'));
        if (itemPano && itemPano.remainingCents > 0) {
          newInputs[itemPano.feeItemId] = (itemPano.remainingCents / 100).toFixed(2);
        }
      }

      setItemInputs(newInputs);
      setAmountTenderedInput('');
      setIsChangeReturned(true);
      setErrorMsg('');
    }
  }, [selectedStudentId, initialAction]);

  // Filter students for search dropdown with fuzzy search support
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim();
    if (!q) return students;

    const scored = students.map((s) => {
      const resName = fuzzyMatch(s.name, q);
      const resClass = fuzzyMatch(s.className, q);
      const resMyKid = s.myKid && s.myKid.includes(q) ? { match: true, score: 1 } : { match: false, score: 0 };
      const resParent = fuzzyMatch(s.parentName || '', q);

      const maxScore = Math.max(
        resName.match ? resName.score : 0,
        resClass.match ? resClass.score * 0.9 : 0,
        resMyKid.match ? resMyKid.score : 0,
        resParent.match ? resParent.score * 0.8 : 0
      );
      const matched = resName.match || resClass.match || resMyKid.match || resParent.match;
      return { student: s, score: maxScore, matched };
    });

    return scored
      .filter((item) => item.matched)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.student);
  }, [students, studentSearch]);

  // PIBG Fee Item identification
  const pibgFeeItem = useMemo(() => {
    return feeItems.find((f) => f.name.toLowerCase().includes('pibg') || f.code === 'PBG');
  }, [feeItems]);

  const effectiveRepStudentId = pibgRepStudentId || selectedStudentId;
  const repStudent = useMemo(() => {
    return students.find((s) => s.id === effectiveRepStudentId) || currentSummary?.student;
  }, [students, effectiveRepStudentId, currentSummary]);

  // Detected family members for the representative
  const familyInfo = useMemo(() => {
    if (!repStudent) return { alreadyLinked: [], suggestedByGuardian: [], allFamilyMembers: [] };
    const res = findSuggestedSiblings(repStudent, students);
    const all = [...res.allFamilyMembers];
    for (const extra of manualExtraSiblings) {
      if (!all.some((s) => s.id === extra.id) && extra.id !== repStudent.id) {
        all.push(extra);
      }
    }
    return {
      alreadyLinked: res.alreadyLinked,
      suggestedByGuardian: res.suggestedByGuardian,
      allFamilyMembers: all,
    };
  }, [repStudent, students, manualExtraSiblings]);

  // Synchronize default linked siblings whenever familyInfo or repStudent changes
  useEffect(() => {
    if (familyInfo.allFamilyMembers.length > 0) {
      setLinkedSiblingIds(familyInfo.allFamilyMembers.map((s) => s.id));
    } else {
      setLinkedSiblingIds([]);
    }
  }, [familyInfo.allFamilyMembers]);

  // Reset representative and extra siblings when main student changes
  useEffect(() => {
    setPibgRepStudentId(selectedStudentId);
    setManualExtraSiblings([]);
    setRepSearchInput('');
    setSiblingSearchInput('');
  }, [selectedStudentId]);

  // Search suggestions for Representative student with fuzzy search
  const filteredRepSuggestions = useMemo(() => {
    const q = repSearchInput.trim();
    if (!q) return [];
    
    const scored = students.map((s) => {
      const resName = fuzzyMatch(s.name, q);
      const resClass = fuzzyMatch(s.className, q);
      const maxScore = Math.max(
        resName.match ? resName.score : 0,
        resClass.match ? resClass.score * 0.9 : 0
      );
      return { student: s, score: maxScore, matched: resName.match || resClass.match };
    });

    return scored
      .filter((i) => i.matched)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((i) => i.student);
  }, [repSearchInput, students]);

  // Search suggestions for Siblings to link from any class with fuzzy search
  const filteredSiblingSuggestions = useMemo(() => {
    const q = siblingSearchInput.trim();
    if (!q) return [];
    const repId = effectiveRepStudentId;
    const candidates = students.filter((s) => s.id !== repId && !linkedSiblingIds.includes(s.id));

    const scored = candidates.map((s) => {
      const resName = fuzzyMatch(s.name, q);
      const resClass = fuzzyMatch(s.className, q);
      const maxScore = Math.max(
        resName.match ? resName.score : 0,
        resClass.match ? resClass.score * 0.9 : 0
      );
      return { student: s, score: maxScore, matched: resName.match || resClass.match };
    });

    return scored
      .filter((i) => i.matched)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((i) => i.student);
  }, [siblingSearchInput, students, effectiveRepStudentId, linkedSiblingIds]);

  const isPibgBeingPaid = Boolean(
    pibgFeeItem &&
    itemInputs[pibgFeeItem.id] &&
    rmToCents(itemInputs[pibgFeeItem.id]) > 0
  );

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }, []);

  const autoGeneratedNote = useMemo(() => {
    if (!repStudent) return '';
    return generatePibgFamilyNote(repStudent.name, repStudent.className, todayFormatted, '[Dijana Secara Automatik]');
  }, [repStudent, todayFormatted]);

  const handleInputChange = (feeItemId: string, val: string) => {
    // Allow numbers and decimal point only
    const sanitized = val.replace(/[^0-9.]/g, '');
    setItemInputs((prev) => ({ ...prev, [feeItemId]: sanitized }));
    setErrorMsg('');
  };

  // Quick Action: Bayar Penuh Semua Baki
  const handlePayAllBalance = () => {
    if (!currentSummary) return;
    const newInputs: Record<string, string> = {};
    for (const item of currentSummary.itemBalances) {
      if (item.remainingCents > 0) {
        newInputs[item.feeItemId] = (item.remainingCents / 100).toFixed(2);
      }
    }
    setItemInputs(newInputs);
    setErrorMsg('');
  };

  // Quick Action: Kosongkan Semua
  const handleClearInputs = () => {
    setItemInputs({});
    setErrorMsg('');
  };

  // Quick Action: Bayar Satu Item Penuh
  const handlePayItemFull = (feeItemId: string, remainingCents: number) => {
    setItemInputs((prev) => ({
      ...prev,
      [feeItemId]: (remainingCents / 100).toFixed(2),
    }));
    setErrorMsg('');
  };

  // Quick Action: Bayar Gambar Sahaja (5R / 8R / Panorama)
  const handlePayPhotosOnly = () => {
    if (!currentSummary) return;
    const newInputs: Record<string, string> = { ...itemInputs };
    currentSummary.itemBalances.forEach((it) => {
      const isPhoto =
        it.feeItemName.toLowerCase().includes('gambar') ||
        it.feeItemName.toLowerCase().includes('5r') ||
        it.feeItemName.toLowerCase().includes('8r') ||
        it.feeItemName.toLowerCase().includes('panorama');
      if (isPhoto && it.remainingCents > 0) {
        newInputs[it.feeItemId] = (it.remainingCents / 100).toFixed(2);
      }
    });
    setItemInputs(newInputs);
    setErrorMsg('');
  };

  // Calculate live totals
  let totalCurrentPaymentCents = 0;
  const validationErrors: string[] = [];

  if (currentSummary) {
    for (const item of currentSummary.itemBalances) {
      const inputVal = itemInputs[item.feeItemId];
      if (inputVal && inputVal.trim() !== '') {
        const payCents = rmToCents(inputVal);
        if (payCents > 0) {
          totalCurrentPaymentCents += payCents;
          if (payCents > item.remainingCents) {
            validationErrors.push(
              `"${item.feeItemName}" melebihi baki! (Bayaran: RM${(payCents / 100).toFixed(2)}, Baki: RM${(item.remainingCents / 100).toFixed(2)})`
            );
          }
        }
      }
    }
  }

  const remainingAfterPaymentCents = currentSummary
    ? Math.max(0, currentSummary.balanceCents - totalCurrentPaymentCents)
    : 0;

  // Live Cash Tendered and Change Returned Calculations (Ruang Baki Bayaran Perlu Dikembalikan Kepada Murid)
  const effectiveTenderedCents =
    paymentMethod !== 'Tunai'
      ? totalCurrentPaymentCents
      : !amountTenderedInput || amountTenderedInput.trim() === ''
      ? totalCurrentPaymentCents
      : rmToCents(amountTenderedInput);

  const changeReturnedCents =
    paymentMethod !== 'Tunai'
      ? 0
      : Math.max(0, effectiveTenderedCents - totalCurrentPaymentCents);

  const isUnderpaid =
    paymentMethod === 'Tunai' &&
    amountTenderedInput.trim() !== '' &&
    effectiveTenderedCents < totalCurrentPaymentCents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSummary) return;

    if (totalCurrentPaymentCents <= 0) {
      setErrorMsg('Sila masukkan amaun bayaran untuk sekurang-kurangnya satu perkara.');
      return;
    }

    if (validationErrors.length > 0) {
      setErrorMsg(validationErrors[0]);
      return;
    }

    if (paymentMethod === 'Pindahan Bank' && !referenceNumber.trim()) {
      setErrorMsg('Sila masukkan nombor rujukan bagi bayaran Pindahan Bank.');
      return;
    }

    if (paymentMethod === 'Tunai' && isUnderpaid) {
      setErrorMsg(
        `Wang tunai diterima (RM${(effectiveTenderedCents / 100).toFixed(2)}) kurang sebanyak RM${(
          (totalCurrentPaymentCents - effectiveTenderedCents) /
          100
        ).toFixed(2)} daripada jumlah bayaran resit ini.`
      );
      return;
    }

    // Prepare allocations
    const itemsPayload = currentSummary.itemBalances
      .filter((item) => {
        const inputVal = itemInputs[item.feeItemId];
        return inputVal && rmToCents(inputVal) > 0;
      })
      .map((item) => ({
        feeItemId: item.feeItemId,
        currentPaymentCents: rmToCents(itemInputs[item.feeItemId]),
      }));

    // Check if Sumbangan PIBG is included in this payment
    const isPibgInPayload = itemsPayload.some((it) => {
      const f = feeItems.find((x) => x.id === it.feeItemId);
      return f?.name.toLowerCase().includes('pibg') || f?.code === 'PBG';
    });

    const repStudentFinal = repStudent || currentSummary.student;
    const validSiblingsToLink = linkedSiblingIds.filter((id) => id && id !== repStudentFinal.id);

    let finalNotes = notes.trim();
    if (isPibgInPayload) {
      const autoNote = `Sumbangan PIBG keluarga telah dibayar melalui ${repStudentFinal.name}, kelas ${repStudentFinal.className}, pada ${todayFormatted}.`;
      finalNotes = customTeacherNote.trim()
        ? `${autoNote} ${customTeacherNote.trim()}`
        : autoNote;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const result = await recordPayment({
        studentId: currentSummary.student.id,
        payerName: payerName.trim() || currentSummary.student.parentName || 'Ibu Bapa / Penjaga',
        payerPhone: payerPhone.trim() || currentSummary.student.parentPhone,
        items: itemsPayload,
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        notes: finalNotes,
        amountTenderedCents: effectiveTenderedCents,
        changeReturnedCents: changeReturnedCents,
        changeReturnedStatus:
          changeReturnedCents > 0
            ? isChangeReturned
              ? 'Sudah Dipulangkan'
              : 'Belum Dipulangkan'
            : 'Tiada Baki',
        isPibgFamilyPayment: isPibgInPayload,
        pibgRepresentativeStudentId: isPibgInPayload ? repStudentFinal.id : undefined,
        pibgFamilySiblingIds: isPibgInPayload ? validSiblingsToLink : undefined,
      });

      if (!result.success || !result.transaction) {
        setErrorMsg(result.error || 'Gagal merekod bayaran.');
        setIsSubmitting(false);
        return;
      }

      // If family siblings were selected, ensure sibling links are permanently updated
      if (isPibgInPayload && validSiblingsToLink.length > 0) {
        await setStudentSiblings(repStudentFinal.id, validSiblingsToLink);
      }

      onClose();
      onPaymentSuccess(result.transaction);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ralat berlaku semasa memproses bayaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Rekod Penerimaan Bayaran Yuran & Keperluan
              </h2>
              <p className="text-xs text-slate-400">
                Pilih murid, peruntukkan amaun mengikut perkara, dan jana resit rasmi dua halaman
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Error Banner */}
          {(errorMsg || validationErrors.length > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Sila semak maklumat bayaran:</p>
                <p>{errorMsg || validationErrors[0]}</p>
              </div>
            </div>
          )}

          {/* Student Selector Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Pilih Murid ({students.length} berdaftar):
                </label>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cari murid / kelas / MyKid..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="relative flex-1">
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                    >
                      {filteredStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.className})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {currentSummary && (
                <div className="flex items-center space-x-3 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-500 block">Status Semasa:</span>
                    <span
                      className={`inline-block font-bold px-2 py-0.5 rounded text-[11px] ${
                        currentSummary.status === 'Selesai'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentSummary.status === 'Bayar Sebahagian'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {currentSummary.status}
                    </span>
                  </div>
                  <div className="border-l border-slate-200 pl-3">
                    <span className="text-slate-500 block">Telah Dibayar:</span>
                    <span className="font-mono font-bold text-slate-900">{formatRM(currentSummary.paidCents)}</span>
                  </div>
                  <div className="border-l border-slate-200 pl-3">
                    <span className="text-slate-500 block">Baki Perlu:</span>
                    <span className="font-mono font-bold text-amber-700">{formatRM(currentSummary.balanceCents)}</span>
                  </div>
                </div>
              )}
            </div>

            {currentSummary && (
              <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400">No. MyKid: </span>
                  <span className="font-mono font-medium">
                    {maskMyKid(currentSummary.student.myKid, currentUser.role === 'Pentadbir')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Penjaga: </span>
                  <span className="font-medium">{currentSummary.student.parentName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Telefon: </span>
                  <span className="font-medium">{currentSummary.student.parentPhone || '-'}</span>
                </div>
              </div>
            )}
          </div>

          {!currentSummary ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-xs text-amber-800">
              <AlertCircle className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <p className="font-bold text-sm">Tiada Murid Dipilih</p>
              <p className="text-slate-600 mt-1">Sila pilih murid daripada menu pilihan di atas untuk memaparkan butiran dan rekod bayaran.</p>
            </div>
          ) : (
            /* Fee Items Allocation Table */
            <div>
            {/* Optional Items Notice */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 flex items-start space-x-2 text-xs text-emerald-900">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Bayaran Mengikut Keperluan: </span>
                Semua butiran bayaran bergantung kepada keperluan yang hendak dibayar oleh ibu bapa / penjaga. Tiada paksaan bayaran penuh. Rekodkan bayaran bagi butiran yang dipersetujui sahaja.
              </div>
            </div>

            {/* DEDICATED SECTION: RUANG TICK JENIS GAMBAR DIBAYAR OLEH MURID */}
            {photoBalances.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-50/90 via-emerald-50/80 to-purple-50/90 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 mb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-indigo-950 flex items-center space-x-2">
                        <span>Ruang Tick Pilihan Jenis Gambar Murid</span>
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase font-extrabold tracking-wider">
                          📸 Pilihan Gambar
                        </span>
                      </h4>
                      <p className="text-[11px] text-indigo-900 mt-0.5">
                        Tandakan (tick) jenis gambar yang hendak dibayar oleh murid mengikut persetujuan ibu bapa:
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs">
                    <button
                      type="button"
                      onClick={handlePayPhotosOnly}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-2xs"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Tick Semua Gambar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cleared = { ...itemInputs };
                        photoBalances.forEach((p) => {
                          delete cleared[p.feeItemId];
                        });
                        setItemInputs(cleared);
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition cursor-pointer"
                    >
                      Nyah-tick Gambar
                    </button>
                  </div>
                </div>

                {/* 3 Interactive Cards for 5R, 8R, Panorama */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {photoBalances.map((item) => {
                    const inputVal = itemInputs[item.feeItemId] || '';
                    const payCents = rmToCents(inputVal);
                    const isChecked = payCents > 0;
                    const isFullPaid = item.remainingCents === 0;

                    const is5R = item.feeItemName.toLowerCase().includes('5r');
                    const is8R = item.feeItemName.toLowerCase().includes('8r');

                    const badgeColor = is5R
                      ? 'bg-emerald-600'
                      : is8R
                      ? 'bg-indigo-600'
                      : 'bg-amber-600';

                    const cardBorder = isChecked
                      ? is5R
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400'
                        : is8R
                        ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-400'
                        : 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400'
                      : 'border-slate-200 bg-white hover:border-slate-300';

                    return (
                      <div
                        key={item.feeItemId}
                        className={`p-3.5 rounded-xl border transition shadow-xs flex flex-col justify-between ${cardBorder}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start space-x-2.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              disabled={isFullPaid}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handlePayItemFull(item.feeItemId, item.remainingCents);
                                } else {
                                  handleInputChange(item.feeItemId, '');
                                }
                              }}
                              className="mt-0.5 w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                            />
                            <div>
                              <span className="font-extrabold text-xs text-slate-900 block leading-tight">
                                {item.feeItemName}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-slate-500 block mt-0.5">
                                Kadar: {formatRM(item.rateCents)}
                              </span>
                            </div>
                          </label>

                          <div className="text-right shrink-0">
                            {isFullPaid ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Lunas
                              </span>
                            ) : item.paidCents > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                                Baki {formatRM(item.remainingCents)}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                Belum Bayar
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-bold text-slate-700">Amaun Bayar:</span>
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1 text-slate-400 font-mono text-[11px]">RM</span>
                            <input
                              type="text"
                              disabled={isFullPaid}
                              value={inputVal}
                              placeholder="0.00"
                              onChange={(e) => handleInputChange(item.feeItemId, e.target.value)}
                              className="w-full pl-8 pr-2.5 py-1 text-right font-mono font-black text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-800">
                  Semua Perkara & Keperluan Persekolahan:
                </h3>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePayAllBalance}
                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-md border border-emerald-200 transition cursor-pointer flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tick Semua Perkara</span>
                </button>
                <button
                  type="button"
                  onClick={handlePayPhotosOnly}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded-md border border-indigo-200 transition cursor-pointer flex items-center space-x-1"
                  title="Tick dan masukkan amaun bagi Gambar 5R, Gambar 8R, dan Gambar Panorama"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tick Gambar Sahaja (5R, 8R, Panorama)</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearInputs}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2 py-1 rounded-md border border-slate-300 transition cursor-pointer"
                >
                  Nyah-tick Semua
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-2 w-12 text-center bg-emerald-50/80 text-emerald-900">Tick</th>
                      <th className="py-2.5 px-2 w-8 text-center">Bil.</th>
                      <th className="py-2.5 px-3">Perkara / Butiran</th>
                      <th className="py-2.5 px-3 text-right">Kadar (RM)</th>
                      <th className="py-2.5 px-3 text-right">Telah Bayar</th>
                      <th className="py-2.5 px-3 text-right">Baki Item</th>
                      <th className="py-2.5 px-3 text-right w-44 bg-emerald-50 font-black text-slate-900">
                        Bayaran Semasa (RM)
                      </th>
                      <th className="py-2.5 px-2 text-center w-16">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentSummary?.itemBalances.map((item, idx) => {
                      const inputVal = itemInputs[item.feeItemId] || '';
                      const payCents = rmToCents(inputVal);
                      const isOver = payCents > item.remainingCents;
                      const isFull = item.remainingCents === 0;
                      const isChecked = payCents > 0;

                      return (
                        <tr
                          key={item.feeItemId}
                          className={`${
                            isFull
                              ? 'bg-slate-50/60 opacity-75'
                              : isChecked
                              ? 'bg-emerald-50/50'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-2 text-center bg-emerald-50/30">
                            <input
                              type="checkbox"
                              disabled={isFull}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handlePayItemFull(item.feeItemId, item.remainingCents);
                                } else {
                                  handleInputChange(item.feeItemId, '');
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title={isFull ? 'Perkara ini telah lunas' : 'Tick untuk pilih bayaran perkara ini'}
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {item.feeItemName}
                            {item.isOptedOut && (
                              <span className="ml-2 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium border border-slate-300">
                                Sedia Ada / Tidak Ambil
                              </span>
                            )}
                            {item.paidCents >= item.rateCents && (
                              <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                Selesai
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {formatRM(item.rateCents).replace('RM', '')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {formatRM(item.paidCents).replace('RM', '')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {item.remainingCents === 0 ? (
                              <span className="text-emerald-700">0.00</span>
                            ) : (
                              <span className="text-amber-800">{formatRM(item.remainingCents).replace('RM', '')}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 bg-emerald-50/30 text-right">
                            <div className="relative inline-block w-full max-w-[140px]">
                              <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono text-xs">RM</span>
                              <input
                                type="text"
                                disabled={isFull}
                                value={inputVal}
                                onChange={(e) => handleInputChange(item.feeItemId, e.target.value)}
                                placeholder="0.00"
                                className={`w-full pl-8 pr-2.5 py-1 text-right font-mono font-bold text-xs rounded border transition focus:outline-hidden ${
                                  isOver
                                    ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-400'
                                    : payCents > 0
                                    ? 'border-emerald-500 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-400 font-black'
                                    : 'border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-emerald-400'
                                } disabled:bg-slate-100 disabled:text-slate-400`}
                              />
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {!isFull && (
                              <button
                                type="button"
                                onClick={() => handlePayItemFull(item.feeItemId, item.remainingCents)}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-200 hover:bg-emerald-600 hover:text-white text-slate-700 font-bold transition cursor-pointer"
                              >
                                Penuh
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}

          {/* DEDICATED SECTION: SUMBANGAN PIBG MENGIKUT KELUARGA & WAKIL PEMBAYARAN */}
          {pibgFeeItem && (
            <div className={`rounded-2xl border-2 transition p-4 sm:p-5 space-y-4 ${
              isPibgBeingPaid
                ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border-emerald-400 shadow-md ring-2 ring-emerald-200'
                : 'bg-slate-50 border-slate-300'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
                    isPibgBeingPaid ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'
                  }`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-black text-slate-900">
                        Sumbangan PIBG Mengikut Keluarga
                      </h4>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isPibgBeingPaid
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        1 Bayaran = Semua Adik-Beradik
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Direkodkan melalui seorang murid wakil dan dikaitkan dengan semua adik-beradik tanpa bayaran berulang.
                    </p>
                  </div>
                </div>

                {!isPibgBeingPaid ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (pibgFeeItem) {
                        setItemInputs((prev) => ({
                          ...prev,
                          [pibgFeeItem.id]: (pibgFeeItem.amountCents / 100).toFixed(2),
                        }));
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1"
                  >
                    <span>+ Rekod Bayaran PIBG Keluarga (RM 20.00)</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-xl">
                    ✓ Mod Bayaran Keluarga Aktif ({formatRM(rmToCents(itemInputs[pibgFeeItem.id] || '0'))})
                  </span>
                )}
              </div>

              {/* 1. Carian Nama Murid Wakil Pembayaran Secara Automatik */}
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Catatan / Murid Wakil Pembayaran:</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Menaip nama murid untuk cadangan automatik berserta kelas
                  </span>
                </label>

                <div className="relative">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={repSearchInput}
                        onChange={(e) => {
                          setRepSearchInput(e.target.value);
                          setIsRepSearchOpen(true);
                        }}
                        onFocus={() => setIsRepSearchOpen(true)}
                        placeholder="Taip nama murid wakil (sistem memaparkan cadangan automatik)..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    {repStudent && (
                      <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1.5 text-xs flex items-center space-x-2 shrink-0">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-emerald-800 font-bold block text-[10px] uppercase">Wakil Dipilih:</span>
                          <span className="font-black text-emerald-950 text-xs">
                            {repStudent.name} ({repStudent.className})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Autocomplete Suggestions Dropdown */}
                  {isRepSearchOpen && repSearchInput.trim().length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {filteredRepSuggestions.length === 0 ? (
                        <p className="p-3 text-xs text-slate-500 italic">Tiada murid ditemui bagi "{repSearchInput}".</p>
                      ) : (
                        filteredRepSuggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setPibgRepStudentId(s.id);
                              setRepSearchInput('');
                              setIsRepSearchOpen(false);
                              if (s.parentName && !payerName) setPayerName(s.parentName);
                              if (s.parentPhone && !payerPhone) setPayerPhone(s.parentPhone);
                            }}
                            className="w-full p-2.5 text-left text-xs hover:bg-emerald-50 transition flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-slate-900 block">{s.name}</span>
                              <span className="text-[11px] text-slate-500">Penjaga: {s.parentName || '-'}</span>
                            </div>
                            <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px]">
                              {s.className}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Pautan Ahli Keluarga & Adik-Beradik */}
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pautan Ahli Keluarga & Adik-Beradik (Termasuk Kelas Lain):</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {familyInfo.allFamilyMembers.length} adik-beradik dikesan / terpaut
                  </span>
                </div>

                {/* Sibling Checklist */}
                {familyInfo.allFamilyMembers.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 text-center text-xs text-slate-500">
                    Tiada adik-beradik lain dikesan secara automatik berdasarkan nama penjaga. Sila gunakan ruangan carian di bawah untuk memautkan adik-beradik daripada mana-mana kelas:
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {familyInfo.allFamilyMembers.map((sib) => {
                      const isChecked = linkedSiblingIds.includes(sib.id);
                      const sibSummary = getStudentSummary(sib.id);
                      const isAlreadyPaid = sibSummary?.itemBalances.find(i => i.feeItemName.toLowerCase().includes('pibg'))?.isPaid;

                      return (
                        <div
                          key={sib.id}
                          className={`p-2.5 rounded-xl border transition flex items-center justify-between text-xs ${
                            isChecked
                              ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setLinkedSiblingIds((prev) => [...prev, sib.id]);
                                } else {
                                  setLinkedSiblingIds((prev) => prev.filter((id) => id !== sib.id));
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer shrink-0"
                            />
                            <div className="truncate">
                              <span className="font-bold text-slate-900 block truncate">{sib.name}</span>
                              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                                <span className="font-semibold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                  {sib.className}
                                </span>
                                <span>•</span>
                                <span className={isAlreadyPaid ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                                  {isAlreadyPaid ? 'Sedia Lunas' : 'Belum Bayar PIBG'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setLinkedSiblingIds((prev) => prev.filter((id) => id !== sib.id));
                              setManualExtraSiblings((prev) => prev.filter((s) => s.id !== sib.id));
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer shrink-0 ml-1"
                            title="Buang pautan murid ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Search & Add New Sibling Across All Classes */}
                <div className="pt-2 border-t border-slate-100 relative">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={siblingSearchInput}
                      onChange={(e) => {
                        setSiblingSearchInput(e.target.value);
                        setIsSiblingSearchOpen(true);
                      }}
                      onFocus={() => setIsSiblingSearchOpen(true)}
                      placeholder="Cari murid daripada kelas lain untuk dipautkan sebagai adik-beradik..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {isSiblingSearchOpen && siblingSearchInput.trim().length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-xl max-h-44 overflow-y-auto divide-y divide-slate-100">
                      {filteredSiblingSuggestions.length === 0 ? (
                        <p className="p-3 text-xs text-slate-500 italic">Tiada murid ditemui bagi carian ini.</p>
                      ) : (
                        filteredSiblingSuggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              if (!manualExtraSiblings.some((m) => m.id === s.id)) {
                                setManualExtraSiblings((prev) => [...prev, s]);
                              }
                              if (!linkedSiblingIds.includes(s.id)) {
                                setLinkedSiblingIds((prev) => [...prev, s.id]);
                              }
                              setSiblingSearchInput('');
                              setIsSiblingSearchOpen(false);
                            }}
                            className="w-full p-2 text-left text-xs hover:bg-emerald-50 transition flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-slate-900">{s.name}</span>
                              <span className="text-[11px] text-slate-500 block">Penjaga: {s.parentName || '-'}</span>
                            </div>
                            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                              + Pautkan ({s.className})
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Catatan Automatik Bagi Rekod Semua Adik-Beradik */}
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Catatan Automatik Rekod Semua Adik-Beradik (Dijana Sistem):
                </label>
                <div className="p-2.5 bg-emerald-50/90 border border-emerald-300 rounded-lg text-xs text-emerald-950 font-medium">
                  <p className="italic">"{autoGeneratedNote}"</p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Catatan Tambahan Guru (Pilihan):
                  </label>
                  <input
                    type="text"
                    value={customTeacherNote}
                    onChange={(e) => setCustomTeacherNote(e.target.value)}
                    placeholder="Contoh: Disahkan oleh guru kelas / Salinan resit diserahkan"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Details & Payer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Maklumat Pembayar:</span>
              </h4>

              <div>
                <label className="text-xs text-slate-600 block mb-1">Nama Pembayar / Penjaga:</label>
                <input
                  type="text"
                  required
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Contoh: Encik Radzi bin Ismail"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 block mb-1">No. Telefon Penjaga (Pilihan):</label>
                <input
                  type="text"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  placeholder="Contoh: 013-8821943"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kaedah Pembayaran:</span>
              </h4>

              <div>
                <label className="text-xs text-slate-600 block mb-1">Pilih Kaedah:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Tunai', 'Pindahan Bank', 'Lain-lain'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'Pindahan Bank' && (
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-semibold text-emerald-800">
                    No. Rujukan Pindahan Bank (Wajib):
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Contoh: MBB2026092812345"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-600 block mb-1">Catatan Tambahan (Pilihan):</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Bayaran ansuran pertama baju gerko"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* DEDICATED SECTION: RUANG BAKI BAYARAN PERLU DIKEMBALIKAN KEPADA MURID */}
          {paymentMethod === 'Tunai' && (
            <div className="bg-gradient-to-r from-amber-50/80 via-emerald-50/80 to-teal-50/80 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                    <Coins className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                      <span>Ruang Baki Bayaran Perlu Dikembalikan Kepada Murid</span>
                      <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-full uppercase font-extrabold tracking-wider">
                        💵 Tunai & Baki
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Sediakan dan kira baki wang tunai yang perlu diserahkan atau dikembalikan semula kepada murid / ibu bapa.
                    </p>
                  </div>
                </div>

                {changeReturnedCents > 0 && (
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                      Baki: RM {(changeReturnedCents / 100).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Input Wang Tunai Diterima */}
                <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Jumlah Wang Tunai Diterima / Dihulur (RM):</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Perlu dibayar: <strong className="text-emerald-700">{formatRM(totalCurrentPaymentCents)}</strong>
                    </span>
                  </label>

                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-mono font-bold text-sm">RM</span>
                    <input
                      type="text"
                      value={amountTenderedInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setAmountTenderedInput(val);
                        setErrorMsg('');
                      }}
                      placeholder={(totalCurrentPaymentCents / 100).toFixed(2)}
                      className={`w-full pl-11 pr-3 py-2 text-base font-mono font-black rounded-lg border focus:outline-hidden transition ${
                        isUnderpaid
                          ? 'border-red-400 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-400'
                          : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500'
                      }`}
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Pilihan Pantas Wang Dihulur:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAmountTenderedInput((totalCurrentPaymentCents / 100).toFixed(2))}
                        className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-md text-xs font-bold transition cursor-pointer border border-emerald-300"
                        title="Bayar jumlah genap tepat seperti dalam resit"
                      >
                        Genap (RM{(totalCurrentPaymentCents / 100).toFixed(2)})
                      </button>
                      {[10, 20, 50, 100].map((note) => {
                        const noteCents = note * 100;
                        return (
                          <button
                            key={note}
                            type="button"
                            onClick={() => setAmountTenderedInput(note.toFixed(2))}
                            className={`px-2 py-1 rounded-md text-xs font-bold transition cursor-pointer border ${
                              noteCents >= totalCurrentPaymentCents
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-400 border-slate-200'
                            }`}
                          >
                            RM{note}
                          </button>
                        );
                      })}
                      {amountTenderedInput && (
                        <button
                          type="button"
                          onClick={() => setAmountTenderedInput('')}
                          className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & Pengiraan Baki Perlu Dikembalikan */}
                <div className="flex flex-col justify-between space-y-3 bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Amaun Bayaran Resit:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRM(totalCurrentPaymentCents)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                      <span>Wang Tunai Diterima:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRM(effectiveTenderedCents)}</span>
                    </div>

                    {/* Result Card */}
                    {changeReturnedCents > 0 ? (
                      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl p-3 shadow-xs">
                        <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-extrabold block">
                          💰 Baki Wang Perlu Dikembalikan Kepada Murid:
                        </span>
                        <div className="flex items-baseline space-x-2 mt-0.5">
                          <span className="text-2xl font-black font-mono tracking-tight text-white">
                            RM {(changeReturnedCents / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : isUnderpaid ? (
                      <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-3">
                        <span className="text-[11px] font-bold block">
                          ⚠️ Wang Diterima Kurang:
                        </span>
                        <span className="text-xs text-red-700">
                          Wang dihulur kurang sebanyak <strong>RM {((totalCurrentPaymentCents - effectiveTenderedCents) / 100).toFixed(2)}</strong>.
                        </span>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl p-2.5 text-center">
                        <span className="text-xs font-semibold text-slate-600">
                          ✓ Bayaran Genap — Tiada baki wang perlu dikembalikan.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Toggle Status Penyerahan Baki */}
                  {changeReturnedCents > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Status Penyerahan Baki Kepada Murid:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <label
                          className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition select-none ${
                            isChangeReturned
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="changeReturnStatus"
                            checked={isChangeReturned}
                            onChange={() => setIsChangeReturned(true)}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-[11px]">✓ Telah Diserahkan Serta-merta</span>
                        </label>

                        <label
                          className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition select-none ${
                            !isChangeReturned
                              ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="changeReturnStatus"
                            checked={!isChangeReturned}
                            onChange={() => setIsChangeReturned(false)}
                            className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-[11px]">⏳ Belum Serah (Baki Tertunggak)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Live Summary Bar */}
          <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider">
                  Jumlah Bayaran Resit:
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {formatRM(totalCurrentPaymentCents)}
                </span>
              </div>

              {paymentMethod === 'Tunai' && changeReturnedCents > 0 && (
                <div className="border-l border-slate-700 pl-4">
                  <span className="text-[11px] text-amber-300 block uppercase font-bold tracking-wider flex items-center space-x-1">
                    <Coins className="w-3.5 h-3.5" />
                    <span>Baki Perlu Dikembalikan:</span>
                  </span>
                  <span className="text-xl font-black font-mono text-amber-400">
                    RM {(changeReturnedCents / 100).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {isChangeReturned ? '✓ Dipulangkan' : '⏳ Baki Tertunggak'}
                  </span>
                </div>
              )}

              <div className="border-l border-slate-700 pl-4">
                <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider">
                  Jumlah Telah Dibayar (Kumulatif):
                </span>
                <span className="text-base font-bold font-mono text-emerald-300">
                  {formatRM((currentSummary?.paidCents || 0) + totalCurrentPaymentCents)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || totalCurrentPaymentCents <= 0 || validationErrors.length > 0}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center space-x-2"
              >
                <span>{isSubmitting ? 'Memproses...' : 'Sahkan & Jana Resit Rasmi'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
