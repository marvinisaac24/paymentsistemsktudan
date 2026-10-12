import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StudentPaymentSummary } from '../types';
import { formatRM } from '../utils/currency';
import { compareClassNames } from '../utils/classes';
import { fuzzyMatch } from '../utils/fuzzySearch';
import { generateDebtSummaryPdf } from '../utils/debtReportPdf';
import {
  AlertTriangle,
  Download,
  Printer,
  Search,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Send,
  MessageCircle,
  Copy,
  ChevronRight,
  User,
  Phone,
  CreditCard,
  Users,
  X,
  FileText,
  Loader2,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

interface PaymentDueViewProps {
  onOpenPaymentForStudent: (studentId: string) => void;
}

export const PaymentDueView: React.FC<PaymentDueViewProps> = ({
  onOpenPaymentForStudent,
}) => {
  const { config, allStudentSummaries, currentUser } = useApp();

  // Filters & Search
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [selectedDebtBracket, setSelectedDebtBracket] = useState<'Semua' | 'unpaid' | 'partial'>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeReminderStudent, setActiveReminderStudent] = useState<StudentPaymentSummary | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Distinct classes list sorted in natural order
  const distinctClasses = useMemo(() => {
    const set = new Set<string>();
    for (const s of allStudentSummaries) {
      if (s.student.className) set.add(s.student.className);
    }
    return ['Semua', ...Array.from(set).sort(compareClassNames)];
  }, [allStudentSummaries]);

  // Filter debtors (students with balanceCents > 0)
  const debtorsList = useMemo(() => {
    return allStudentSummaries.filter((s) => s.balanceCents > 0);
  }, [allStudentSummaries]);

  // Filtered debtors list based on user controls
  const filteredDebtors = useMemo(() => {
    const q = searchQuery.trim();

    const scored = debtorsList.map((sum) => {
      const s = sum.student;
      const matchClass = selectedClass === 'Semua' || s.className === selectedClass;

      let matchBracket = true;
      if (selectedDebtBracket === 'unpaid') {
        matchBracket = sum.paidCents === 0;
      } else if (selectedDebtBracket === 'partial') {
        matchBracket = sum.paidCents > 0;
      }

      if (!matchClass || !matchBracket) {
        return { sum, score: 0, matched: false };
      }

      if (!q) {
        return { sum, score: 1, matched: true };
      }

      const resName = fuzzyMatch(s.name, q);
      const resClass = fuzzyMatch(s.className, q);
      const resParent = fuzzyMatch(s.parentName || '', q);
      const resPhone = s.parentPhone && s.parentPhone.includes(q) ? { match: true, score: 1 } : { match: false, score: 0 };

      const bestScore = Math.max(
        resName.match ? resName.score : 0,
        resClass.match ? resClass.score * 0.9 : 0,
        resParent.match ? resParent.score * 0.8 : 0,
        resPhone.match ? resPhone.score : 0
      );

      return {
        sum,
        score: bestScore,
        matched: resName.match || resClass.match || resParent.match || resPhone.match,
      };
    });

    const filtered = scored.filter((i) => i.matched);

    if (q) {
      return filtered
        .sort((a, b) => {
          if (Math.abs(b.score - a.score) > 0.15) return b.score - a.score;
          const cmp = compareClassNames(a.sum.student.className, b.sum.student.className);
          if (cmp !== 0) return cmp;
          return a.sum.student.name.localeCompare(b.sum.student.name);
        })
        .map((i) => i.sum);
    }

    return filtered
      .sort((a, b) => {
        const cmp = compareClassNames(a.sum.student.className, b.sum.student.className);
        if (cmp !== 0) return cmp;
        return a.sum.student.name.localeCompare(b.sum.student.name);
      })
      .map((i) => i.sum);
  }, [debtorsList, selectedClass, selectedDebtBracket, searchQuery]);

  // Reset current page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClass, selectedDebtBracket]);

  const totalPages = Math.ceil(filteredDebtors.length / (pageSize || 1)) || 1;
  const paginatedDebtors = useMemo(() => {
    if (pageSize >= filteredDebtors.length || pageSize <= 0) return filteredDebtors;
    const start = (currentPage - 1) * pageSize;
    return filteredDebtors.slice(start, start + pageSize);
  }, [filteredDebtors, currentPage, pageSize]);

  // Overall Statistics for Debtors
  const stats = useMemo(() => {
    let totalOutstandingCents = 0;
    let totalPaidByDebtorsCents = 0;
    let totalTargetCents = 0;
    let unPaidCount = 0;
    let partialCount = 0;

    for (const d of filteredDebtors) {
      totalOutstandingCents += d.balanceCents;
      totalPaidByDebtorsCents += d.paidCents;
      totalTargetCents += d.totalFeeCents;
      if (d.paidCents === 0) unPaidCount++;
      else partialCount++;
    }

    return {
      totalOutstandingCents,
      totalPaidByDebtorsCents,
      totalTargetCents,
      unPaidCount,
      partialCount,
      totalCount: filteredDebtors.length,
    };
  }, [filteredDebtors]);

  // Handle PDF Export
  const handleExportPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = generateDebtSummaryPdf({
        config,
        summaries: filteredDebtors,
        classNameFilter: selectedClass,
        generatedBy: currentUser.name,
      });

      const safeClass = selectedClass.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Laporan_Peringatan_Tunggakan_${safeClass}_${config.currentSchoolYear}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Ralat menjana PDF laporan tunggakan:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Generate WhatsApp / SMS reminder message text for parents
  const generateParentReminderMessage = (s: StudentPaymentSummary): string => {
    const student = s.student;
    const parentName = student.parentName || 'Tuan / Puan';
    const pendingItems = s.itemBalances
      .filter((it) => it.remainingCents > 0 && !it.isOptedOut && !it.isPaidViaFamilyRepresentative)
      .map((it) => `• ${it.feeItemName}: Baki RM${(it.remainingCents / 100).toFixed(2)}`)
      .join('\n');

    return (
      `*PERINGATAN PEMBAYARAN KEPERLUAN PERSEKOLAHAN*\n` +
      `*${config.schoolName} (${config.schoolCode})*\n\n` +
      `Kepada: ${parentName}\n` +
      `Murid: *${student.name}*\n` +
      `Kelas: *${student.className}*\n` +
      `Sesi: ${config.currentSchoolYear}\n\n` +
      `Sukacita dimaklumkan bahawa rekod bayaran anak/tanggungan anda adalah seperti berikut:\n` +
      `• Jumlah Keperluan Dipersetujui: ${formatRM(s.totalFeeCents)}\n` +
      `• Jumlah Telah Dibayar: ${formatRM(s.paidCents)}\n` +
      `• *Baki Belum Selesai: ${formatRM(s.balanceCents)}*\n\n` +
      `Perincian butiran belum selesai:\n${pendingItems || 'Sila semak keperluan bersama pihak sekolah.'}\n\n` +
      `Pihak sekolah mengalu-alukan bayaran mengikut kemampuan dan keselesaan tuan/puan (tiada paksaan bayaran sekaligus). Bayaran boleh dibuat secara tunai atau pindahan bank kepada pihak sekolah.\n\n` +
      `Sekian, terima kasih.\n` +
      `_${config.schoolName}_`
    );
  };

  const handleCopyNotice = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const handleOpenWhatsApp = (s: StudentPaymentSummary) => {
    const rawPhone = s.student.parentPhone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '60' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('1')) {
      formattedPhone = '60' + formattedPhone;
    }
    const message = encodeURIComponent(generateParentReminderMessage(s));
    const url = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-2xl p-5 sm:p-7 shadow-xl border border-rose-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Sistem Peringatan Baki Yuran</span>
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline">•</span>
            <span className="text-slate-300 text-xs font-medium">Sesi Persekolahan {config.currentSchoolYear}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Senarai Peringatan Murid Tertunggak & Laporan Hutang
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Mengenal pasti murid yang masih mempunyai baki yuran belum selesai, menjana laporan PDF/CSV rasmi, dan memudahkan guru menghantar peringatan mesra kepada penjaga.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isGeneratingPdf || filteredDebtors.length === 0}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg transition active:scale-95 cursor-pointer flex items-center space-x-2 disabled:opacity-50"
            title="Muat turun ringkasan PDF rasmi"
          >
            {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>Cetak PDF Laporan ({filteredDebtors.length})</span>
          </button>

          <a
            href="/api/export/payment-due"
            download
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center space-x-1.5"
            title="Eksport ke CSV / Microsoft Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Muat Turun CSV</span>
          </a>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Debt Amount */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jumlah Baki Tertunggak</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
              {formatRM(stats.totalOutstandingCents)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Daripada {formatRM(stats.totalTargetCents)} sasaran keperluan
            </p>
          </div>
        </div>

        {/* Total Debtors Count */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Murid Ada Baki</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {stats.totalCount} <span className="text-xs font-normal text-slate-500">/ {allStudentSummaries.length} murid</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {allStudentSummaries.length > 0 ? `${Math.round((stats.totalCount / allStudentSummaries.length) * 100)}% daripada keseluruhan` : '0%'}
            </p>
          </div>
        </div>

        {/* Belum Bayar Sama Sekali */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Belum Ada Bayaran</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-800 font-mono">
              {stats.unPaidCount} <span className="text-xs font-normal text-slate-500">orang</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-1 font-medium">
              Belum mula rekod bayaran
            </p>
          </div>
        </div>

        {/* Bayar Sebahagian */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bayar Sebahagian</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-blue-800 font-mono">
              {stats.partialCount} <span className="text-xs font-normal text-slate-500">orang</span>
            </div>
            <p className="text-[11px] text-blue-700 mt-1 font-medium">
              Telah bayar {formatRM(stats.totalPaidByDebtorsCents)}
            </p>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search box with fuzzy search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari murid, kelas, nama penjaga atau telefon..."
              className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Class filter */}
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-slate-500 font-medium">Kelas:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              >
                {distinctClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Debt bracket filter */}
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={selectedDebtBracket}
                onChange={(e) => setSelectedDebtBracket(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              >
                <option value="Semua">Semua Ada Baki ({debtorsList.length})</option>
                <option value="unpaid">Belum Bayar (RM0)</option>
                <option value="partial">Bayar Sebahagian</option>
              </select>
            </div>
          </div>

        </div>

        {/* Results summary line */}
        <div className="text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
          <span>
            Menunjukkan <strong>{filteredDebtors.length}</strong> murid tertunggak
            {selectedClass !== 'Semua' && ` di kelas ${selectedClass}`}.
          </span>
          <span className="font-mono font-bold text-rose-700">
            Jumlah Baki Paparan: {formatRM(stats.totalOutstandingCents)}
          </span>
        </div>
      </div>

      {/* Debtors List (Responsive Table on Desktop & Compact Cards on Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredDebtors.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Tiada Tunggakan Dijumpai!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Semua murid bagi kriteria tapisan ini telah menyelesaikan bayaran keperluan persekolahan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-3 px-3 sm:px-4 w-12 text-center">Bil.</th>
                  <th className="py-3 px-3 sm:px-4">Maklumat Murid</th>
                  <th className="py-3 px-3 sm:px-4">Kelas</th>
                  <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Maklumat Penjaga</th>
                  <th className="py-3 px-3 sm:px-4 text-right hidden sm:table-cell">Jumlah Yuran</th>
                  <th className="py-3 px-3 sm:px-4 text-right hidden sm:table-cell">Telah Dibayar</th>
                  <th className="py-3 px-3 sm:px-4 text-right text-rose-300 font-extrabold">Baki Tertunggak</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Tindakan Guru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDebtors.map((sum, idx) => {
                  const s = sum.student;
                  const isZeroPaid = sum.paidCents === 0;
                  const displayIndex = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-rose-50/40 transition group"
                    >
                      <td className="py-3 px-3 sm:px-4 text-center text-slate-400 font-mono">
                        {displayIndex}
                      </td>

                      {/* Student Info */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5 md:hidden">
                          <span>{s.parentName || '-'}</span>
                          <span>•</span>
                          <span>{s.parentPhone || '-'}</span>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3 px-3 sm:px-4">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                          {s.className}
                        </span>
                      </td>

                      {/* Guardian Info (Desktop) */}
                      <td className="py-3 px-3 sm:px-4 hidden md:table-cell">
                        <div className="text-slate-800 font-medium truncate max-w-[160px]">
                          {s.parentName || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {s.parentPhone || '-'}
                        </div>
                      </td>

                      {/* Total Expected Fee */}
                      <td className="py-3 px-3 sm:px-4 text-right font-mono text-slate-600 hidden sm:table-cell">
                        {formatRM(sum.totalFeeCents)}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3 px-3 sm:px-4 text-right font-mono text-emerald-700 font-semibold hidden sm:table-cell">
                        {formatRM(sum.paidCents)}
                      </td>

                      {/* Remaining Debt */}
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <div className="font-mono font-black text-rose-700 text-xs sm:text-sm">
                          {formatRM(sum.balanceCents)}
                        </div>
                        <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          isZeroPaid ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isZeroPaid ? 'Belum Bayar' : 'Bayar Sebahagian'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Quick Pay Button */}
                          <button
                            type="button"
                            onClick={() => onOpenPaymentForStudent(s.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer flex items-center space-x-1 shadow-2xs"
                            title="Rekod bayaran sekarang"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Terima</span> Bayaran
                          </button>

                          {/* Reminder Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => setActiveReminderStudent(sum)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition cursor-pointer"
                            title="Hantar peringatan mesra kepada penjaga"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredDebtors.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-500">
              <span>Papar setiap halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-rose-500 cursor-pointer"
              >
                <option value={25}>25 murid</option>
                <option value={50}>50 murid</option>
                <option value={100}>100 murid</option>
                <option value={500}>500 murid</option>
                <option value={9999}>Semua ({filteredDebtors.length})</option>
              </select>
              <span>
                (Murid {(currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, filteredDebtors.length)} daripada{' '}
                {filteredDebtors.length})
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold cursor-pointer"
                >
                  « Awal
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold cursor-pointer"
                >
                  ‹ Sebelum
                </button>
                <span className="px-3 py-1 font-bold text-slate-700 bg-white border border-slate-300 rounded">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold cursor-pointer"
                >
                  Seterusnya ›
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold cursor-pointer"
                >
                  Akhir »
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reminder Preview & Dispatch Modal */}
      {activeReminderStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">
                  Mesej Peringatan Baki Yuran Murid
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveReminderStudent(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* Student Summary Info */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{activeReminderStudent.student.name}</div>
                  <div className="text-slate-500 text-xs">
                    Kelas: <strong>{activeReminderStudent.student.className}</strong> • Penjaga: {activeReminderStudent.student.parentName || '-'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Baki Tertunggak</span>
                  <span className="font-mono font-black text-rose-700 text-base">{formatRM(activeReminderStudent.balanceCents)}</span>
                </div>
              </div>

              {/* Message Preview Box */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
                  <span>Pratonton Mesej Peringatan Rasmi:</span>
                  <button
                    type="button"
                    onClick={() => handleCopyNotice(generateParentReminderMessage(activeReminderStudent))}
                    className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedNotice ? 'Disalin!' : 'Salin Mesej'}</span>
                  </button>
                </label>
                <textarea
                  readOnly
                  rows={9}
                  value={generateParentReminderMessage(activeReminderStudent)}
                  className="w-full bg-slate-50 font-mono text-slate-800 text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveReminderStudent(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Tutup
                </button>

                {activeReminderStudent.student.parentPhone && (
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(activeReminderStudent)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-md cursor-pointer transition active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Hantar WhatsApp Penjaga</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
