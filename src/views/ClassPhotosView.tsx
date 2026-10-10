import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { formatRM, rmToCents, centsToRM } from '../utils/currency';
import { compareClassNames, parseClassInfo, SCHOOL_LEVELS, SCHOOL_STREAMS } from '../utils/classes';
import { Transaction, FeeItem, Student, PaymentMethod } from '../types';
import { BulkReceiptDownloadModal } from '../components/BulkReceiptDownloadModal';
import { generatePhotoPaymentsPdf, PhotoReportRow } from '../utils/photoReportPdf';
import { downloadBlob } from '../utils/receiptPdf';
import {
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Printer,
  FileSpreadsheet,
  FileText,
  Edit3,
  Search,
  Users,
  DollarSign,
  Receipt,
  CreditCard,
  X,
  Save,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  Download,
  Trash2,
  Coins,
} from 'lucide-react';

interface ClassPhotosViewProps {
  onOpenPaymentForStudent: (studentId: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onOpenEditTransaction?: (tx: Transaction) => void;
  onOpenCancelModal?: (tx: Transaction) => void;
}

export const ClassPhotosView: React.FC<ClassPhotosViewProps> = ({
  onOpenPaymentForStudent,
  onSelectTransaction,
  onOpenEditTransaction,
  onOpenCancelModal,
}) => {
  const { students, feeItems, updateFeeItems, transactions, allStudentSummaries, currentUser, recordPayment, updateTransaction, updateStudent, config } = useApp();

  const [selectedLevel, setSelectedLevel] = useState<string>('Semua');
  const [selectedStream, setSelectedStream] = useState<string>('Semua');
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Telah Bayar' | 'Belum Bayar'>('Semua');
  const [isBulkReceiptsModalOpen, setIsBulkReceiptsModalOpen] = useState<boolean>(false);
  const [isGeneratingPhotoPdf, setIsGeneratingPhotoPdf] = useState<boolean>(false);
  const [autoGenerateReportPdf, setAutoGenerateReportPdf] = useState<boolean>(true);
  const [paymentSuccessToast, setPaymentSuccessToast] = useState<{
    studentName: string;
    className: string;
    receiptNumber: string;
  } | null>(null);

  // Dedicated Photo Payment Modal State (Tick Pilihan Gambar)
  const [photoPaymentStudent, setPhotoPaymentStudent] = useState<Student | null>(null);
  const [tick5R, setTick5R] = useState<boolean>(true);
  const [tick8R, setTick8R] = useState<boolean>(false);
  const [tickPanorama, setTickPanorama] = useState<boolean>(false);
  const [photoPayerName, setPhotoPayerName] = useState<string>('');
  const [photoPayerPhone, setPhotoPayerPhone] = useState<string>('');
  const [photoPaymentMethod, setPhotoPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [photoReferenceNumber, setPhotoReferenceNumber] = useState<string>('');
  const [photoNotes, setPhotoNotes] = useState<string>('');
  const [photoAmountTenderedInput, setPhotoAmountTenderedInput] = useState<string>('');
  const [photoIsChangeReturned, setPhotoIsChangeReturned] = useState<boolean>(true);
  const [isSubmittingPhotoPayment, setIsSubmittingPhotoPayment] = useState<boolean>(false);
  const [photoModalError, setPhotoModalError] = useState<string>('');

  // Price adjustment modal
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [price5R, setPrice5R] = useState('');
  const [price8R, setPrice8R] = useState('');
  const [pricePanorama, setPricePanorama] = useState('');
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Identify the 3 photo items (safely check name & code)
  const photo5R = useMemo(
    () => feeItems.find((f) => f.code === 'G5R' || (f.name || '').toLowerCase().includes('5r')),
    [feeItems]
  );
  const photo8R = useMemo(
    () => feeItems.find((f) => f.code === 'G8R' || (f.name || '').toLowerCase().includes('8r')),
    [feeItems]
  );
  const photoPanorama = useMemo(
    () => feeItems.find((f) => f.code === 'GPN' || (f.name || '').toLowerCase().includes('panorama')),
    [feeItems]
  );

  // Helper to test if a transaction item is a photo item
  const isPhotoItem = useCallback(
    (item: { feeItemId?: string; feeItemName?: string; name?: string }) => {
      const photoIds = [photo5R?.id, photo8R?.id, photoPanorama?.id, 'item_g5r', 'item_g8r', 'item_gpn'].filter(Boolean);
      if (item.feeItemId && photoIds.includes(item.feeItemId)) return true;
      const n = (item.feeItemName || item.name || '').toLowerCase();
      return n.includes('gambar') || n.includes('5r') || n.includes('8r') || n.includes('panorama');
    },
    [photo5R, photo8R, photoPanorama]
  );

  // Find existing photo transaction for student in modal (allows editing if mistakenly entered)
  const existingPhotoTx = useMemo(() => {
    if (!photoPaymentStudent) return null;
    // Try finding transaction with photo items
    const photoTx = transactions.find(
      (t) =>
        t.studentId === photoPaymentStudent.id &&
        t.status === 'Sah' &&
        (t.items || []).some((it) => isPhotoItem(it))
    );
    if (photoTx) return photoTx;
    return (
      transactions.find(
        (t) => t.studentId === photoPaymentStudent.id && t.status === 'Sah'
      ) || null
    );
  }, [photoPaymentStudent, transactions, isPhotoItem]);

  // Available classes list sorted logically
  const classesList = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (s.className) set.add(s.className);
    }
    return ['Semua', ...Array.from(set).sort(compareClassNames)];
  }, [students]);

  // Classes filtered by currently selected Level / Stream for the class tabs
  const visibleClasses = useMemo(() => {
    return classesList.filter((cls) => {
      if (cls === 'Semua') return false;
      const { level, stream } = parseClassInfo(cls);
      const matchLvl = selectedLevel === 'Semua' || level === selectedLevel;
      const matchStrm = selectedStream === 'Semua' || stream === selectedStream;
      return matchLvl && matchStrm;
    });
  }, [classesList, selectedLevel, selectedStream]);

  // Open price modal with current rates
  const handleOpenPriceModal = () => {
    setPrice5R(photo5R ? (photo5R.amountCents / 100).toFixed(2) : '8.00');
    setPrice8R(photo8R ? (photo8R.amountCents / 100).toFixed(2) : '20.00');
    setPricePanorama(photoPanorama ? (photoPanorama.amountCents / 100).toFixed(2) : '8.00');
    setSaveSuccessMsg(false);
    setIsPriceModalOpen(true);
  };

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrices(true);
    try {
      const updated = feeItems.map((f) => {
        if (f.id === photo5R?.id || f.code === 'G5R') {
          return { ...f, amountCents: rmToCents(price5R) };
        }
        if (f.id === photo8R?.id || f.code === 'G8R') {
          return { ...f, amountCents: rmToCents(price8R) };
        }
        if (f.id === photoPanorama?.id || f.code === 'GPN') {
          return { ...f, amountCents: rmToCents(pricePanorama) };
        }
        return f;
      });

      await updateFeeItems(updated);
      setSaveSuccessMsg(true);
      setTimeout(() => {
        setIsPriceModalOpen(false);
        setSaveSuccessMsg(false);
      }, 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPrices(false);
    }
  };

  // Filter students based on level, stream, class, and search query
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        (s.myKid && s.myKid.includes(q));

      const { level, stream } = parseClassInfo(s.className);
      const matchLevel = selectedLevel === 'Semua' || level === selectedLevel;
      const matchStream = selectedStream === 'Semua' || stream === selectedStream;
      const matchClass = selectedClass === 'Semua' || s.className === selectedClass;

      return matchSearch && matchLevel && matchStream && matchClass;
    }).sort((a, b) => {
      const cmp = compareClassNames(a.className, b.className);
      if (cmp !== 0) return cmp;
      return a.name.localeCompare(b.name);
    });
  }, [students, searchQuery, selectedLevel, selectedStream, selectedClass]);

  // Compute student photo details
  const studentPhotoData = useMemo(() => {
    return filteredStudents.map((std) => {
      const sum = allStudentSummaries.find((s) => s.student.id === std.id);

      const bal5R = sum?.itemBalances.find((b) => b.feeItemId === photo5R?.id);
      const bal8R = sum?.itemBalances.find((b) => b.feeItemId === photo8R?.id);
      const balPano = sum?.itemBalances.find((b) => b.feeItemId === photoPanorama?.id);

      const paid5R = bal5R?.paidCents || 0;
      const paid8R = bal8R?.paidCents || 0;
      const paidPano = balPano?.paidCents || 0;

      const totalPhotoPaid = paid5R + paid8R + paidPano;

      // Find transactions by this student with photo items
      const studentTxs = transactions.filter(
        (t) =>
          t.studentId === std.id &&
          t.status === 'Sah' &&
          (t.items || []).some((it) => isPhotoItem(it))
      );

      // If student has paid photos but no explicit photo transaction matched by IDs, fallback to student transactions
      const resolvedTxs =
        studentTxs.length > 0
          ? studentTxs
          : totalPhotoPaid > 0
          ? transactions.filter((t) => t.studentId === std.id && t.status === 'Sah')
          : [];

      return {
        student: std,
        paid5R,
        paid8R,
        paidPano,
        rate5R: photo5R?.amountCents || 800,
        rate8R: photo8R?.amountCents || 2000,
        ratePano: photoPanorama?.amountCents || 800,
        totalPhotoPaid,
        transactions: resolvedTxs,
      };
    });
  }, [filteredStudents, allStudentSummaries, photo5R, photo8R, photoPanorama, transactions, isPhotoItem]);

  // Aggregated Statistics
  const stats = useMemo(() => {
    let count5R = 0;
    let count8R = 0;
    let countPano = 0;
    let sumTotalCents = 0;

    studentPhotoData.forEach((row) => {
      if (row.paid5R > 0) count5R++;
      if (row.paid8R > 0) count8R++;
      if (row.paidPano > 0) countPano++;
      sumTotalCents += row.totalPhotoPaid;
    });

    return {
      totalStudents: studentPhotoData.length,
      count5R,
      count8R,
      countPano,
      sumTotalCents,
    };
  }, [studentPhotoData]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const headers = ['Bil', 'Nama Murid', 'Kelas', 'MyKid', 'Gambar 5R (RM)', 'Gambar 8R (RM)', 'Gambar Panorama (RM)', 'Jumlah Bayar (RM)', 'Status'];
    const rows = studentPhotoData.map((row, idx) => [
      idx + 1,
      `"${row.student.name}"`,
      `"${row.student.className}"`,
      `"${row.student.myKid || ''}"`,
      row.paid5R > 0 ? (row.paid5R / 100).toFixed(2) : '0.00',
      row.paid8R > 0 ? (row.paid8R / 100).toFixed(2) : '0.00',
      row.paidPano > 0 ? (row.paidPano / 100).toFixed(2) : '0.00',
      (row.totalPhotoPaid / 100).toFixed(2),
      row.totalPhotoPaid > 0 ? 'Telah Bayar' : 'Belum Bayar',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekod_Gambar_Kelas_${selectedClass.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Generate PDF: Senarai Pembayaran Ikut Nama Murid, Jenis Gambar & Jumlah Bayaran
  const handleGeneratePhotoPaymentsPdf = (classFilterOverride?: string) => {
    setIsGeneratingPhotoPdf(true);
    try {
      const targetClass = classFilterOverride || selectedClass;
      const rowsSource = targetClass === 'Semua'
        ? studentPhotoData
        : studentPhotoData.filter((r) => r.student.className === targetClass);

      const reportRows: PhotoReportRow[] = (rowsSource.length > 0 ? rowsSource : studentPhotoData).map((r) => {
        const latestTx = r.transactions[r.transactions.length - 1];
        return {
          studentName: r.student.name,
          className: r.student.className,
          myKid: r.student.myKid,
          paid5R: r.paid5R,
          rate5R: r.rate5R,
          paid8R: r.paid8R,
          rate8R: r.rate8R,
          paidPano: r.paidPano,
          ratePano: r.ratePano,
          totalPaid: r.totalPhotoPaid,
          receiptNumber: latestTx?.receiptNumber,
          paymentMethod: latestTx?.paymentMethod,
        };
      });

      const teacherName = targetClass !== 'Semua' ? (config.classTeachers?.[targetClass] || 'Guru Kelas SK Tudan') : undefined;

      const doc = generatePhotoPaymentsPdf({
        config,
        classNameFilter: targetClass,
        streamFilter: selectedStream !== 'Semua' ? selectedStream : undefined,
        rows: reportRows,
        classTeacherName: teacherName,
      });

      const pdfBlob = doc.output('blob');
      const safeCls = targetClass.replace(/[^a-zA-Z0-9_\-]/g, '_');
      downloadBlob(pdfBlob, `Senarai_Pembayaran_Gambar_SK_Tudan_${safeCls}.pdf`);
    } catch (err) {
      console.error('Ralat menjana PDF senarai pembayaran:', err);
    } finally {
      setIsGeneratingPhotoPdf(false);
    }
  };

  // Filter display by status: Semua / Telah Bayar / Belum Bayar
  const displayPhotoData = useMemo(() => {
    if (statusFilter === 'Telah Bayar') {
      return studentPhotoData.filter((r) => r.totalPhotoPaid > 0);
    }
    if (statusFilter === 'Belum Bayar') {
      return studentPhotoData.filter((r) => r.totalPhotoPaid === 0);
    }
    return studentPhotoData;
  }, [studentPhotoData, statusFilter]);

  // Live calculation of selected photos in the modal
  const currentModalTotalCents = useMemo(() => {
    let sum = 0;
    if (tick5R && photo5R) sum += photo5R.amountCents;
    if (tick8R && photo8R) sum += photo8R.amountCents;
    if (tickPanorama && photoPanorama) sum += photoPanorama.amountCents;
    return sum;
  }, [tick5R, tick8R, tickPanorama, photo5R, photo8R, photoPanorama]);

  // Ruang Pengiraan Wang Tunai & Baki Bayaran Perlu Dikembalikan Kepada Murid
  const photoEffectiveTenderedCents = useMemo(() => {
    if (photoPaymentMethod !== 'Tunai') return currentModalTotalCents;
    if (!photoAmountTenderedInput || photoAmountTenderedInput.trim() === '') {
      return currentModalTotalCents;
    }
    return rmToCents(photoAmountTenderedInput);
  }, [photoPaymentMethod, photoAmountTenderedInput, currentModalTotalCents]);

  const photoChangeReturnedCents = useMemo(() => {
    if (photoPaymentMethod !== 'Tunai') return 0;
    return Math.max(0, photoEffectiveTenderedCents - currentModalTotalCents);
  }, [photoPaymentMethod, photoEffectiveTenderedCents, currentModalTotalCents]);

  const photoIsUnderpaid =
    photoPaymentMethod === 'Tunai' &&
    photoAmountTenderedInput.trim() !== '' &&
    photoEffectiveTenderedCents < currentModalTotalCents;

  // Open dedicated Photo Modal (allows editing for both new and existing photo records)
  const handleOpenPhotoModal = (student: Student, defaultPhoto?: '5R' | '8R' | 'PANO') => {
    const sum = allStudentSummaries.find((s) => s.student.id === student.id);
    const bal5R = sum?.itemBalances.find((b) => b.feeItemId === photo5R?.id);
    const bal8R = sum?.itemBalances.find((b) => b.feeItemId === photo8R?.id);
    const balPano = sum?.itemBalances.find((b) => b.feeItemId === photoPanorama?.id);

    const is5RPaid = (bal5R?.paidCents || 0) >= (photo5R?.amountCents || 800);
    const is8RPaid = (bal8R?.paidCents || 0) >= (photo8R?.amountCents || 2000);
    const isPanoPaid = (balPano?.paidCents || 0) >= (photoPanorama?.amountCents || 800);

    // Find any existing photo transaction for this student
    const existingTx = transactions.find(
      (t) =>
        t.studentId === student.id &&
        t.status === 'Sah' &&
        (t.items || []).some((it) => isPhotoItem(it))
    ) || null;

    if (existingTx) {
      // Check which photos are in the existing transaction or already paid
      const has5R = is5RPaid || (existingTx.items || []).some((it) => it.feeItemId === photo5R?.id || (it.feeItemName || '').toLowerCase().includes('5r'));
      const has8R = is8RPaid || (existingTx.items || []).some((it) => it.feeItemId === photo8R?.id || (it.feeItemName || '').toLowerCase().includes('8r'));
      const hasPano = isPanoPaid || (existingTx.items || []).some((it) => it.feeItemId === photoPanorama?.id || (it.feeItemName || '').toLowerCase().includes('panorama'));

      if (defaultPhoto === '5R') {
        setTick5R(true);
        setTick8R(has8R);
        setTickPanorama(hasPano);
      } else if (defaultPhoto === '8R') {
        setTick5R(has5R);
        setTick8R(true);
        setTickPanorama(hasPano);
      } else if (defaultPhoto === 'PANO') {
        setTick5R(has5R);
        setTick8R(has8R);
        setTickPanorama(true);
      } else {
        setTick5R(has5R || (!has8R && !hasPano));
        setTick8R(has8R);
        setTickPanorama(hasPano);
      }

      setPhotoPayerName(existingTx.payerName || student.parentName || '');
      setPhotoPayerPhone(existingTx.payerPhone || student.parentPhone || '');
      setPhotoPaymentMethod(existingTx.paymentMethod || 'Tunai');
      setPhotoReferenceNumber(existingTx.referenceNumber || '');
      setPhotoNotes(existingTx.notes || '');
      setPhotoAmountTenderedInput(
        existingTx.amountTenderedCents ? (existingTx.amountTenderedCents / 100).toFixed(2) : ''
      );
      setPhotoIsChangeReturned(existingTx.changeReturnedStatus !== 'Belum Dipulangkan');
    } else {
      if (defaultPhoto === '5R') {
        setTick5R(true);
        setTick8R(false);
        setTickPanorama(false);
      } else if (defaultPhoto === '8R') {
        setTick5R(false);
        setTick8R(true);
        setTickPanorama(false);
      } else if (defaultPhoto === 'PANO') {
        setTick5R(false);
        setTick8R(false);
        setTickPanorama(true);
      } else {
        setTick5R(!is5RPaid || (!is8RPaid && !isPanoPaid));
        setTick8R(!is8RPaid && is5RPaid);
        setTickPanorama(!isPanoPaid && is5RPaid && is8RPaid);
      }

      setPhotoPayerName(student.parentName || '');
      setPhotoPayerPhone(student.parentPhone || '');
      setPhotoPaymentMethod('Tunai');
      setPhotoReferenceNumber('');
      setPhotoNotes('');
      setPhotoAmountTenderedInput('');
      setPhotoIsChangeReturned(true);
    }

    setPhotoPaymentStudent(student);
    setPhotoModalError('');
  };

  // Safe handler to transition from Photo Modal to Edit Transaction Modal if needed
  const handleOpenEditFromPhotoModal = () => {
    const tx = existingPhotoTx;
    if (tx && onOpenEditTransaction) {
      setPhotoPaymentStudent(null);
      onOpenEditTransaction(tx);
    }
  };

  // Submit Photo Payment & Open 1-Page Receipt (handles both create and update)
  const handleConfirmPhotoPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPaymentStudent) return;

    const itemsToPay: { feeItemId: string; currentPaymentCents: number }[] = [];
    if (tick5R && photo5R) {
      itemsToPay.push({ feeItemId: photo5R.id, currentPaymentCents: photo5R.amountCents });
    }
    if (tick8R && photo8R) {
      itemsToPay.push({ feeItemId: photo8R.id, currentPaymentCents: photo8R.amountCents });
    }
    if (tickPanorama && photoPanorama) {
      itemsToPay.push({ feeItemId: photoPanorama.id, currentPaymentCents: photoPanorama.amountCents });
    }

    if (itemsToPay.length === 0) {
      setPhotoModalError('Sila tandakan (tick) sekurang-kurangnya satu jenis gambar (5R, 8R, atau Panorama).');
      return;
    }

    if (photoPaymentMethod === 'Pindahan Bank' && !photoReferenceNumber.trim()) {
      setPhotoModalError('Sila masukkan nombor rujukan bagi bayaran Pindahan Bank.');
      return;
    }

    if (photoPaymentMethod === 'Tunai' && photoIsUnderpaid) {
      setPhotoModalError(
        `Wang tunai diterima (RM${(photoEffectiveTenderedCents / 100).toFixed(2)}) kurang sebanyak RM${(
          (currentModalTotalCents - photoEffectiveTenderedCents) /
          100
        ).toFixed(2)} daripada jumlah bayaran gambar.`
      );
      return;
    }

    setIsSubmittingPhotoPayment(true);
    setPhotoModalError('');

    try {
      const photoLabels = [
        tick5R ? 'Gambar 5R' : '',
        tick8R ? 'Gambar 8R' : '',
        tickPanorama ? 'Gambar Panorama' : '',
      ].filter(Boolean).join(', ');

      const studentName = photoPaymentStudent.name;
      const studentClass = photoPaymentStudent.className;

      if (existingPhotoTx) {
        // UPDATE existing photo transaction
        const itemsToSubmit = itemsToPay.map((it) => ({
          feeItemId: it.feeItemId,
          currentPaymentCents: it.currentPaymentCents,
        }));

        const res = await updateTransaction(existingPhotoTx.id, {
          payerName: photoPayerName.trim() || photoPaymentStudent.parentName || 'Ibu Bapa / Penjaga',
          payerPhone: photoPayerPhone.trim() || photoPaymentStudent.parentPhone,
          paymentMethod: photoPaymentMethod,
          referenceNumber: photoReferenceNumber.trim(),
          notes: photoNotes.trim() || `Kemas kini pilihan gambar: ${photoLabels}`,
          amountTenderedCents: photoEffectiveTenderedCents,
          changeReturnedCents: photoChangeReturnedCents,
          changeReturnedStatus:
            photoChangeReturnedCents > 0
              ? photoIsChangeReturned
                ? 'Sudah Dipulangkan'
                : 'Belum Dipulangkan'
              : 'Tiada Baki',
          items: itemsToSubmit,
        });

        if (!res.success || !res.transaction) {
          setPhotoModalError(res.error || 'Gagal mengemas kini maklumat gambar.');
          setIsSubmittingPhotoPayment(false);
          return;
        }

        // Also update student parent info if changed
        if (
          (photoPayerName && photoPayerName !== photoPaymentStudent.parentName) ||
          (photoPayerPhone && photoPayerPhone !== photoPaymentStudent.parentPhone)
        ) {
          await updateStudent(photoPaymentStudent.id, {
            parentName: photoPayerName.trim() || photoPaymentStudent.parentName,
            parentPhone: photoPayerPhone.trim() || photoPaymentStudent.parentPhone,
          });
        }

        setPhotoPaymentStudent(null);
        setPaymentSuccessToast({
          studentName,
          className: studentClass,
          receiptNumber: res.transaction.receiptNumber,
        });

        // Open updated receipt
        onSelectTransaction(res.transaction);
      } else {
        // RECORD new photo payment
        const res = await recordPayment({
          studentId: photoPaymentStudent.id,
          payerName: photoPayerName.trim() || photoPaymentStudent.parentName || 'Ibu Bapa / Penjaga',
          payerPhone: photoPayerPhone.trim() || photoPaymentStudent.parentPhone,
          items: itemsToPay,
          paymentMethod: photoPaymentMethod,
          referenceNumber: photoReferenceNumber.trim(),
          notes: photoNotes.trim() || `Bayaran gambar kelas: ${photoLabels}`,
          amountTenderedCents: photoEffectiveTenderedCents,
          changeReturnedCents: photoChangeReturnedCents,
          changeReturnedStatus:
            photoChangeReturnedCents > 0
              ? photoIsChangeReturned
                ? 'Sudah Dipulangkan'
                : 'Belum Dipulangkan'
              : 'Tiada Baki',
        });

        if (!res.success || !res.transaction) {
          setPhotoModalError(res.error || 'Gagal merekod bayaran gambar.');
          setIsSubmittingPhotoPayment(false);
          return;
        }

        // Also update student parent info if changed
        if (
          (photoPayerName && photoPayerName !== photoPaymentStudent.parentName) ||
          (photoPayerPhone && photoPayerPhone !== photoPaymentStudent.parentPhone)
        ) {
          await updateStudent(photoPaymentStudent.id, {
            parentName: photoPayerName.trim() || photoPaymentStudent.parentName,
            parentPhone: photoPayerPhone.trim() || photoPaymentStudent.parentPhone,
          });
        }

        setPhotoPaymentStudent(null);

        // Secara automatik jana dokumen PDF Senarai Pembayaran jika ditandakan
        if (autoGenerateReportPdf) {
          setTimeout(() => {
            handleGeneratePhotoPaymentsPdf(studentClass);
          }, 350);
        }

        setPaymentSuccessToast({
          studentName,
          className: studentClass,
          receiptNumber: res.transaction.receiptNumber,
        });

        // Immediately open the 1-page combined receipt!
        onSelectTransaction(res.transaction);
      }
    } catch (err: any) {
      setPhotoModalError(err.message || 'Ralat semasa memproses transaksi.');
    } finally {
      setIsSubmittingPhotoPayment(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-700 mb-1">
            <Camera className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Modul Gambar Sekolah</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Rekod Pembayaran Gambar Kelas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pengurusan dan pemantauan bayaran Gambar 5R, Gambar 8R, dan Gambar Panorama mengikut kelas dari Prasekolah hingga Tahun 6.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleGeneratePhotoPaymentsPdf()}
            disabled={isGeneratingPhotoPdf}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Jana dokumen PDF senarai pembayaran gambar mengikut nama murid, jenis gambar (5R, 8R, Panorama), dan jumlah bayaran"
          >
            <FileText className="w-4 h-4 text-emerald-200" />
            <span>{isGeneratingPhotoPdf ? 'Menjana PDF...' : 'Jana PDF Senarai Pembayaran'}</span>
          </button>

          <button
            onClick={() => setIsBulkReceiptsModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            title="Muat turun resit pembayaran gambar kelas secara pukal (PDF / ZIP)"
          >
            <Download className="w-4 h-4" />
            <span>Muat Turun Resit Pukal</span>
          </button>

          <button
            onClick={handleOpenPriceModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            title="Edit atau tetapkan maklumat harga semasa pakej gambar 5R, 8R, dan Panorama"
          >
            <Edit3 className="w-4 h-4 text-emerald-400" />
            <span>Edit / Tetapkan Harga Gambar</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Eksport CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak Senarai</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner for Auto-Generated PDF */}
      {paymentSuccessToast && (
        <div className="bg-emerald-900 text-white p-4 rounded-2xl shadow-md border border-emerald-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-emerald-950 flex items-center justify-center font-bold shrink-0 text-sm">
              ✓
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-emerald-100">
                Bayaran Gambar bagi <span className="text-white underline">{paymentSuccessToast.studentName}</span> ({paymentSuccessToast.className}) berjaya direkod! (Resit: {paymentSuccessToast.receiptNumber})
              </p>
              <p className="text-[11px] text-emerald-300">
                Dokumen PDF Senarai Pembayaran mengikut nama murid, jenis gambar (5R, 8R, Panorama), dan jumlah pembayaran telah dijana secara automatik.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => handleGeneratePhotoPaymentsPdf(paymentSuccessToast.className)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black rounded-lg transition cursor-pointer flex items-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Muat Turun Semula PDF</span>
            </button>
            <button
              onClick={() => setPaymentSuccessToast(null)}
              className="p-1.5 hover:bg-emerald-800 text-emerald-300 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Active Photo Rates Banner (Kadar Semasa) */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-emerald-950">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-emerald-300">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
              Kadar Harga Semasa Gambar Kelas:
            </span>
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm mt-0.5">
              <span>
                📸 Gambar 5R: <strong className="text-white font-mono text-base">{formatRM(photo5R?.amountCents || 800)}</strong>
              </span>
              <span className="text-white/30">•</span>
              <span>
                🖼️ Gambar 8R: <strong className="text-white font-mono text-base">{formatRM(photo8R?.amountCents || 2000)}</strong>
              </span>
              <span className="text-white/30">•</span>
              <span>
                🌄 Gambar Panorama: <strong className="text-white font-mono text-base">{formatRM(photoPanorama?.amountCents || 800)}</strong>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenPriceModal}
          className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer shrink-0"
        >
          Kemas Kini Kadar
        </button>
      </div>

      {/* Filter Bar (Level, Stream, Specific Class, Search) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Row 1: Search and Class Dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari murid mengikut nama atau No. MyKid..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 shrink-0">Pilih Kelas:</span>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                if (e.target.value !== 'Semua') {
                  const { level, stream } = parseClassInfo(e.target.value);
                  setSelectedLevel(level);
                  setSelectedStream(stream);
                }
              }}
              className="w-full sm:w-60 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              {classesList.map((cls) => (
                <option key={cls} value={cls}>
                  {cls === 'Semua' ? `Semua Kelas (${classesList.length - 1} Kelas)` : cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Level / Year Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Tahun / Sesi:</span>
          {[
            { id: 'Semua', label: 'Semua Tahun' },
            { id: 'PRASEKOLAH', label: 'Prasekolah' },
            { id: '1', label: 'Tahun 1' },
            { id: '2', label: 'Tahun 2' },
            { id: '3', label: 'Tahun 3' },
            { id: '4', label: 'Tahun 4' },
            { id: '5', label: 'Tahun 5' },
            { id: '6', label: 'Tahun 6' },
          ].map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => {
                setSelectedLevel(lvl.id);
                setSelectedClass('Semua');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedLevel === lvl.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>

        {/* Row 3: Stream Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Aliran:</span>
          {['Semua', ...SCHOOL_STREAMS].map((strm) => (
            <button
              key={strm}
              type="button"
              onClick={() => {
                setSelectedStream(strm);
                setSelectedClass('Semua');
              }}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedStream === strm
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {strm}
            </button>
          ))}
        </div>

        {/* Dedicated Class Tabs Strip for Quick Switching */}
        <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <span>Tab Kelas ({visibleClasses.length} Kelas):</span>
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleGeneratePhotoPaymentsPdf(selectedClass)}
                disabled={isGeneratingPhotoPdf}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                title={`Jana PDF Senarai Pembayaran bagi ${selectedClass === 'Semua' ? 'Semua Kelas' : selectedClass}`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span>Jana PDF Senarai ({selectedClass === 'Semua' ? 'Semua' : selectedClass})</span>
              </button>
              {selectedClass !== 'Semua' && (
                <button
                  type="button"
                  onClick={() => setSelectedClass('Semua')}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  Papar Semua Kelas
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedClass('Semua')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1.5 ${
                selectedClass === 'Semua'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>Semua Kelas</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedClass === 'Semua' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-600'
              }`}>
                {students.length}
              </span>
            </button>

            {visibleClasses.map((cls) => {
              const classStudents = students.filter((s) => s.className === cls);
              const isSelected = selectedClass === cls;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs ring-2 ring-emerald-500'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>{cls}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-emerald-500 text-white font-extrabold' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {classStudents.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Class KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Bilangan Murid</span>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900">{stats.totalStudents}</span>
            <span className="text-xs text-slate-400">orang</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Kelas: {selectedClass}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Tempahan 5R</span>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-700">{stats.count5R}</span>
            <span className="text-xs text-slate-400">murid</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 mt-1 block">
            {formatRM(stats.count5R * (photo5R?.amountCents || 800))}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Tempahan 8R</span>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-black text-indigo-700">{stats.count8R}</span>
            <span className="text-xs text-slate-400">murid</span>
          </div>
          <span className="text-[10px] font-mono text-indigo-600 mt-1 block">
            {formatRM(stats.count8R * (photo8R?.amountCents || 2000))}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Tempahan Panorama</span>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-black text-amber-700">{stats.countPano}</span>
            <span className="text-xs text-slate-400">murid</span>
          </div>
          <span className="text-[10px] font-mono text-amber-600 mt-1 block">
            {formatRM(stats.countPano * (photoPanorama?.amountCents || 800))}
          </span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-slate-900 text-white p-4 rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-emerald-400 uppercase block">Jumlah Kutipan Gambar</span>
          <div className="mt-1">
            <span className="text-xl sm:text-2xl font-black text-white font-mono">
              {formatRM(stats.sumTotalCents)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Telah Dibayar</span>
        </div>
      </div>

      {/* Main Student Photo Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Senarai Murid & Status Bayaran Gambar ({displayPhotoData.length} Murid)
            </h3>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              • Kelas: <strong className="text-slate-800">{selectedClass}</strong>
            </span>
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Tapis:</span>
            {(['Semua', 'Telah Bayar', 'Belum Bayar'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {displayPhotoData.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Tiada rekod murid ditemui untuk kelas atau penapis status ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3 text-center w-10">Bil.</th>
                  <th className="py-3 px-3 min-w-[180px]">Nama Murid</th>
                  <th className="py-3 px-3 w-28">Kelas</th>
                  <th className="py-3 px-3 text-center min-w-[140px] bg-emerald-50/80 text-emerald-950 border-x border-emerald-100">
                    <div className="font-extrabold flex items-center justify-center space-x-1">
                      <span>📸 Gambar 5R</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-mono font-bold block">
                      {formatRM(photo5R?.amountCents || 800)}
                    </span>
                  </th>
                  <th className="py-3 px-3 text-center min-w-[140px] bg-indigo-50/80 text-indigo-950 border-r border-indigo-100">
                    <div className="font-extrabold flex items-center justify-center space-x-1">
                      <span>🖼️ Gambar 8R</span>
                    </div>
                    <span className="text-[10px] text-indigo-700 font-mono font-bold block">
                      {formatRM(photo8R?.amountCents || 2000)}
                    </span>
                  </th>
                  <th className="py-3 px-3 text-center min-w-[150px] bg-amber-50/80 text-amber-950 border-r border-amber-100">
                    <div className="font-extrabold flex items-center justify-center space-x-1">
                      <span>🌄 Panorama</span>
                    </div>
                    <span className="text-[10px] text-amber-700 font-mono font-bold block">
                      {formatRM(photoPanorama?.amountCents || 800)}
                    </span>
                  </th>
                  <th className="py-3 px-3 text-right font-black text-slate-900 min-w-[110px]">
                    Jumlah Bayar
                  </th>
                  <th className="py-3 px-3 text-center min-w-[110px]">Resit</th>
                  <th className="py-3 px-3 text-right min-w-[130px]">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayPhotoData.map((row, idx) => (
                  <tr key={row.student.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                    
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block truncate">{row.student.name}</span>
                      {row.student.myKid && (
                        <span className="text-[10px] text-slate-400 font-mono block">MyKid: {row.student.myKid}</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {row.student.className}
                    </td>

                    {/* Gambar 5R: Tick / Status */}
                    <td className="py-2.5 px-3 text-center bg-emerald-50/20 border-x border-emerald-50">
                      {row.paid5R >= row.rate5R ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(row.student, '5R')}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold border border-emerald-300 transition cursor-pointer"
                          title="Lunas. Klik untuk Edit / Betulkan pilihan gambar murid ini"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Lunas ({formatRM(row.paid5R)})</span>
                          <Edit3 className="w-3 h-3 text-emerald-700 ml-0.5 opacity-80" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(row.student, '5R')}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-bold border border-slate-300 hover:border-emerald-500 transition cursor-pointer shadow-2xs group"
                          title="Tick untuk pilih bayaran Gambar 5R murid ini"
                        >
                          <Square className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                          <span>Tick 5R</span>
                        </button>
                      )}
                    </td>

                    {/* Gambar 8R: Tick / Status */}
                    <td className="py-2.5 px-3 text-center bg-indigo-50/20 border-r border-indigo-50">
                      {row.paid8R >= row.rate8R ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(row.student, '8R')}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-bold border border-indigo-300 transition cursor-pointer"
                          title="Lunas. Klik untuk Edit / Betulkan pilihan gambar murid ini"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Lunas ({formatRM(row.paid8R)})</span>
                          <Edit3 className="w-3 h-3 text-indigo-700 ml-0.5 opacity-80" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(row.student, '8R')}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 hover:text-emerald-800 text-xs font-bold border border-slate-300 hover:border-indigo-500 transition cursor-pointer shadow-2xs group"
                          title="Tick untuk pilih bayaran Gambar 8R murid ini"
                        >
                          <Square className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                          <span>Tick 8R</span>
                        </button>
                      )}
                    </td>

                    {/* Gambar Panorama: Tick / Status */}
                    <td className="py-2.5 px-3 text-center bg-amber-50/20 border-r border-amber-50">
                      {row.paidPano >= row.ratePano ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(row.student, 'PANO')}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold border border-amber-300 transition cursor-pointer"
                          title="Lunas. Klik untuk Edit / Betulkan pilihan gambar murid ini"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Lunas ({formatRM(row.paidPano)})</span>
                          <Edit3 className="w-3 h-3 text-amber-700 ml-0.5 opacity-80" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(row.student, 'PANO')}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 text-xs font-bold border border-slate-300 hover:border-amber-500 transition cursor-pointer shadow-2xs group"
                          title="Tick untuk pilih bayaran Gambar Panorama murid ini"
                        >
                          <Square className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
                          <span>Tick Pano</span>
                        </button>
                      )}
                    </td>

                    {/* Jumlah Bayar Gambar */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatRM(row.totalPhotoPaid)}
                    </td>

                    {/* Resit */}
                    <td className="py-3 px-3 text-center">
                      {row.transactions.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => onSelectTransaction(row.transactions[0])}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold transition cursor-pointer"
                          title="Papar Resit"
                        >
                          <Receipt className="w-3 h-3 text-emerald-600" />
                          <span>{row.transactions[0].receiptNumber.split('/').pop()}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Tiada resit</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(row.student)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                          title="Kemas kini & edit maklumat pilihan gambar serta bayaran murid ini"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        {row.transactions.length > 0 && onOpenCancelModal && (
                          <button
                            type="button"
                            onClick={() => onOpenCancelModal(row.transactions[0])}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 rounded-xl text-xs font-bold border border-red-200 transition active:scale-95 cursor-pointer shadow-xs"
                            title="Padam rekod jika tersalah daftarkan bayaran gambar murid ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Padam</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(row.student)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                          title="Buka ruang tick pilihan gambar murid ini"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Tick / Bayar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DEDICATED MODAL: RUANG TICK PILIHAN JENIS GAMBAR */}
      {photoPaymentStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
                  existingPhotoTx ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-emerald-600'
                }`}>
                  {existingPhotoTx ? <Edit3 className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center space-x-2">
                    <span>{existingPhotoTx ? 'Kemas Kini / Edit Maklumat Gambar & Bayaran' : 'Ruang Pilihan & Bayaran Gambar'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                      existingPhotoTx
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                        : 'bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {existingPhotoTx ? `Edit #${existingPhotoTx.receiptNumber}` : 'Pilihan Mudah'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {existingPhotoTx
                      ? 'Tukar pilihan jenis gambar murid (5R, 8R, Panorama), kemas kini nama pembayar dan simpan pembetulan.'
                      : 'Tandakan (tick) jenis gambar yang dipesan & dibayar oleh ibu bapa murid.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPhotoPaymentStudent(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmPhotoPayment} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Student Identity Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Maklumat Murid</span>
                  <h4 className="text-base font-black text-slate-900">{photoPaymentStudent.name}</h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-0.5">
                    <span>Kelas: <strong className="text-slate-800">{photoPaymentStudent.className}</strong></span>
                    {photoPaymentStudent.myKid && <span>• MyKid: <strong className="font-mono text-slate-800">{photoPaymentStudent.myKid}</strong></span>}
                    {photoPaymentStudent.parentName && <span>• Penjaga: <strong className="text-slate-700">{photoPaymentStudent.parentName}</strong></span>}
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Sesi Persekolahan</span>
                  <span className="text-xs font-bold text-slate-800">{photoPaymentStudent.schoolYear || '2026'}</span>
                </div>
              </div>

              {/* Alert & Quick Edit Button if student already has photo payment */}
              {existingPhotoTx && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 font-black text-sm text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Murid Ini Telah Mempunyai Bayaran Gambar ({existingPhotoTx.receiptNumber})</span>
                    </div>
                    <p className="text-xs text-amber-800">
                      Anda sedang dalam mod <strong>edit maklumat gambar</strong>. Anda boleh terus tandakan atau buang tanda jenis gambar (5R, 8R, Panorama) di bawah ini, atau buka borang penuh transaksi.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {onOpenEditTransaction && (
                      <button
                        type="button"
                        onClick={handleOpenEditFromPhotoModal}
                        className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Buka Borang Penuh Transaksi</span>
                      </button>
                    )}
                    {onOpenCancelModal && (
                      <button
                        type="button"
                        onClick={() => {
                          const tx = existingPhotoTx;
                          setPhotoPaymentStudent(null);
                          if (tx) {
                            setTimeout(() => {
                              onOpenCancelModal(tx);
                            }, 50);
                          }
                        }}
                        className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                        title="Padam rekod jika tersalah daftarkan bayaran bagi murid ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Padam Bayaran</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: TICK PILIHAN JENIS GAMBAR */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>Tandakan (Tick) Gambar Yang Hendak Dibayar:</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">Klik kotak untuk tanda</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* Card 1: Gambar 5R */}
                  {(() => {
                    const isSelected = tick5R;

                    return (
                      <div
                        onClick={() => setTick5R(!tick5R)}
                        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition flex items-center justify-between cursor-pointer select-none ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-2 ring-emerald-400/20'
                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="text-emerald-600">
                            {isSelected ? (
                              <CheckSquare className="w-6 h-6 text-emerald-600" />
                            ) : (
                              <Square className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-black text-slate-900">📸 Gambar 5R</span>
                              {isSelected && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                  ✓ Dipilih
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Ukuran Standard 5R (13 x 18 cm) — Gambar potret individu murid
                            </p>
                          </div>
                        </div>

                        <div className="text-right pl-3 shrink-0">
                          <span className="text-sm sm:text-base font-black font-mono text-emerald-700 block">
                            {formatRM(photo5R?.amountCents || 800)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            {isSelected ? 'Dipilih' : 'Tidak Dipilih'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card 2: Gambar 8R */}
                  {(() => {
                    const isSelected = tick8R;

                    return (
                      <div
                        onClick={() => setTick8R(!tick8R)}
                        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition flex items-center justify-between cursor-pointer select-none ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-500 shadow-xs ring-2 ring-indigo-400/20'
                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="text-indigo-600">
                            {isSelected ? (
                              <CheckSquare className="w-6 h-6 text-indigo-600" />
                            ) : (
                              <Square className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-black text-slate-900">🖼️ Gambar 8R</span>
                              {isSelected && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                                  ✓ Dipilih
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Ukuran Besar 8R (20 x 25 cm) — Gambar rasmi bersama kelas
                            </p>
                          </div>
                        </div>

                        <div className="text-right pl-3 shrink-0">
                          <span className="text-sm sm:text-base font-black font-mono text-indigo-700 block">
                            {formatRM(photo8R?.amountCents || 2000)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            {isSelected ? 'Dipilih' : 'Tidak Dipilih'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card 3: Gambar Panorama */}
                  {(() => {
                    const isSelected = tickPanorama;

                    return (
                      <div
                        onClick={() => setTickPanorama(!tickPanorama)}
                        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition flex items-center justify-between cursor-pointer select-none ${
                          isSelected
                            ? 'bg-amber-50/70 border-amber-500 shadow-xs ring-2 ring-amber-400/20'
                            : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="text-amber-600">
                            {isSelected ? (
                              <CheckSquare className="w-6 h-6 text-amber-600" />
                            ) : (
                              <Square className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-black text-slate-900">🌄 Gambar Panorama</span>
                              {isSelected && (
                                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                                  ✓ Dipilih
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Ukuran Lebar Panorama — Susunan penuh seluruh barisan murid
                            </p>
                          </div>
                        </div>

                        <div className="text-right pl-3 shrink-0">
                          <span className="text-sm sm:text-base font-black font-mono text-amber-800 block">
                            {formatRM(photoPanorama?.amountCents || 800)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            {isSelected ? 'Dipilih' : 'Tidak Dipilih'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Real-time Total Display Bar */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Jumlah Bayaran Gambar Dipilih:
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold mt-0.5 block">
                    {[tick5R ? '5R' : '', tick8R ? '8R' : '', tickPanorama ? 'Panorama' : ''].filter(Boolean).join(' + ') || 'Tiada pilihan (Sila tick gambar)'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {formatRM(currentModalTotalCents)}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Kaedah Pembayaran:
                  </label>
                  <div className="flex items-center space-x-1.5">
                    {(['Tunai', 'Pindahan Bank', 'Lain-lain'] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPhotoPaymentMethod(m)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          photoPaymentMethod === m
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {photoPaymentMethod === 'Pindahan Bank' && (
                  <div>
                    <label className="text-xs font-bold text-emerald-800 block mb-1">
                      No. Rujukan Pindahan Bank (Wajib):
                    </label>
                    <input
                      type="text"
                      required
                      value={photoReferenceNumber}
                      onChange={(e) => setPhotoReferenceNumber(e.target.value)}
                      placeholder="Contoh: MBB2026092912345"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Nama Pembayar / Penjaga:</label>
                    <input
                      type="text"
                      value={photoPayerName}
                      onChange={(e) => setPhotoPayerName(e.target.value)}
                      placeholder="Contoh: Radzi bin Ismail"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">No. Telefon Penjaga:</label>
                    <input
                      type="text"
                      value={photoPayerPhone}
                      onChange={(e) => setPhotoPayerPhone(e.target.value)}
                      placeholder="Contoh: 013-8821943"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* RUANG BAKI BAYARAN PERLU DIKEMBALIKAN KEPADA MURID (MODAL GAMBAR) */}
              {photoPaymentMethod === 'Tunai' && (
                <div className="bg-gradient-to-r from-amber-50/90 via-emerald-50/90 to-teal-50/90 border-2 border-emerald-300 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                        <Coins className="w-4 h-4 text-amber-300" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-900">
                          Ruang Baki Bayaran Perlu Dikembalikan Kepada Murid
                        </h5>
                        <p className="text-[10px] text-slate-600">
                          Kira dan sediakan baki wang tunai bagi bayaran gambar yang perlu dipulangkan kepada murid.
                        </p>
                      </div>
                    </div>
                    {photoChangeReturnedCents > 0 && (
                      <span className="text-[11px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg">
                        Baki: RM {(photoChangeReturnedCents / 100).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span>Wang Tunai Diterima / Dihulur (RM):</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          Perlu: <strong>{formatRM(currentModalTotalCents)}</strong>
                        </span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono text-xs">RM</span>
                        <input
                          type="text"
                          value={photoAmountTenderedInput}
                          onChange={(e) => {
                            setPhotoAmountTenderedInput(e.target.value.replace(/[^0-9.]/g, ''));
                            setPhotoModalError('');
                          }}
                          placeholder={(currentModalTotalCents / 100).toFixed(2)}
                          className="w-full pl-9 pr-2 py-1.5 text-sm font-mono font-black rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Quick Buttons */}
                      <div className="flex flex-wrap items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setPhotoAmountTenderedInput((currentModalTotalCents / 100).toFixed(2))}
                          className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded font-bold border border-emerald-300"
                        >
                          Genap
                        </button>
                        {[10, 20, 50, 100].map((note) => (
                          <button
                            key={note}
                            type="button"
                            onClick={() => setPhotoAmountTenderedInput(note.toFixed(2))}
                            className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold border border-slate-300"
                          >
                            RM{note}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-emerald-200 flex flex-col justify-between">
                      <div>
                        {photoChangeReturnedCents > 0 ? (
                          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg p-2.5 text-center shadow-xs">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-100 block">
                              💰 Baki Perlu Dikembalikan Kepada Murid:
                            </span>
                            <span className="text-xl font-black font-mono">
                              RM {(photoChangeReturnedCents / 100).toFixed(2)}
                            </span>
                          </div>
                        ) : photoIsUnderpaid ? (
                          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-2 text-xs">
                            ⚠️ Kurang RM {((currentModalTotalCents - photoEffectiveTenderedCents) / 100).toFixed(2)}
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-lg p-2 text-center text-xs">
                            ✓ Bayaran Genap (Tiada baki perlu dipulangkan)
                          </div>
                        )}
                      </div>

                      {photoChangeReturnedCents > 0 && (
                        <div className="pt-2 mt-2 border-t border-slate-100 text-[10px]">
                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={photoIsChangeReturned}
                              onChange={(e) => setPhotoIsChangeReturned(e.target.checked)}
                              className="rounded text-emerald-600 w-3.5 h-3.5"
                            />
                            <span className="font-semibold text-slate-700">
                              {photoIsChangeReturned ? '✓ Baki telah diserahkan serta-merta' : '⏳ Baki belum serah (Baki tertunggak)'}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Pilihan: Jana Senarai Pembayaran PDF secara Auto selepas bayaran diisi */}
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3.5 flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="autoGenerateReportPdfCheckbox"
                  checked={autoGenerateReportPdf}
                  onChange={(e) => setAutoGenerateReportPdf(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="autoGenerateReportPdfCheckbox" className="text-xs text-indigo-950 cursor-pointer select-none">
                  <span className="font-bold flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Jana PDF Senarai Pembayaran Gambar secara automatik selepas simpan</span>
                  </span>
                  <span className="text-[11px] text-indigo-700 block mt-0.5">
                    Dokumen PDF rasmi mengikut nama murid, pilihan jenis gambar (5R, 8R, Panorama) dan jumlah bayaran akan dijana dan dimuat turun serta-merta.
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {photoModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{photoModalError}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setPhotoPaymentStudent(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPhotoPayment || (!tick5R && !tick8R && !tickPanorama)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-2"
                >
                  {existingPhotoTx ? <Save className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
                  <span>
                    {isSubmittingPhotoPayment
                      ? 'Menyimpan...'
                      : existingPhotoTx
                      ? 'Simpan & Kemas Kini Maklumat Gambar'
                      : 'Sahkan Bayaran & Jana Resit 1 Halaman'}
                  </span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Tetapkan Harga Semasa Gambar */}
      {isPriceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base">Tetapkan Harga Semasa Gambar</h3>
              </div>
              <button
                onClick={() => setIsPriceModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrices} className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Kadar harga ini boleh ditetapkan mengikut semasa seperti yang dipersetujui pihak sekolah dan jurugambar.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Harga Semasa Gambar 5R (RM):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">RM</span>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={price5R}
                    onChange={(e) => setPrice5R(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Harga Semasa Gambar 8R (RM):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">RM</span>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={price8R}
                    onChange={(e) => setPrice8R(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Harga Semasa Gambar Panorama (RM):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">RM</span>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={pricePanorama}
                    onChange={(e) => setPricePanorama(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Harga semasa gambar berjaya dikemas kini!</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrices}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingPrices ? 'Menyimpan...' : 'Simpan Harga Semasa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Muat Turun Resit Gambar Pukal */}
      <BulkReceiptDownloadModal
        isOpen={isBulkReceiptsModalOpen}
        onClose={() => setIsBulkReceiptsModalOpen(false)}
        initialClass={selectedClass !== 'Semua' ? selectedClass : undefined}
      />

    </div>
  );
};
