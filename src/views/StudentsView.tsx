import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Student, StudentPaymentSummary, Transaction } from '../types';
import { formatRM, maskMyKid } from '../utils/currency';
import {
  SCHOOL_LEVELS,
  SCHOOL_STREAMS,
  compareClassNames,
  parseClassInfo,
} from '../utils/classes';
import {
  Search,
  UserPlus,
  FileUp,
  CreditCard,
  Edit2,
  ChevronDown,
  ChevronUp,
  Receipt,
  Phone,
  User,
  Shield,
  Eye,
  EyeOff,
  Filter,
  Trash2,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react';

interface StudentsViewProps {
  onOpenPaymentForStudent: (studentId: string) => void;
  onOpenAddStudent: () => void;
  onOpenEditStudent: (student: Student) => void;
  onOpenOptOutModal: (student: Student) => void;
  onOpenBulkDelete: (studentIds: string[]) => void;
  onOpenImport: () => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  onOpenPaymentForStudent,
  onOpenAddStudent,
  onOpenEditStudent,
  onOpenOptOutModal,
  onOpenBulkDelete,
  onOpenImport,
  onSelectTransaction,
}) => {
  const { allStudentSummaries, transactions, currentUser, deleteStudent } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('Semua');
  const [selectedStream, setSelectedStream] = useState('Semua');
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [showFullMyKid, setShowFullMyKid] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30); // 30 items per page for performance

  // Available classes in system, sorted logically
  const classesList = useMemo(() => {
    const set = new Set<string>();
    for (const item of allStudentSummaries) {
      if (item.student.className) {
        set.add(item.student.className);
      }
    }
    const arr = Array.from(set).sort(compareClassNames);
    return ['Semua', ...arr];
  }, [allStudentSummaries]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    const result = allStudentSummaries.filter((sum) => {
      const q = searchQuery.toLowerCase().trim();
      const s = sum.student;
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        (s.parentName && s.parentName.toLowerCase().includes(q)) ||
        (s.myKid && s.myKid.includes(q));

      const { level, stream } = parseClassInfo(s.className);
      const matchLevel = selectedLevel === 'Semua' || level === selectedLevel;
      const matchStream = selectedStream === 'Semua' || stream === selectedStream;
      const matchClass = selectedClass === 'Semua' || s.className === selectedClass;
      const matchStatus = selectedStatus === 'Semua' || sum.status === selectedStatus;

      return matchSearch && matchLevel && matchStream && matchClass && matchStatus;
    });

    // Natural sort: Class order -> Student name
    return result.sort((a, b) => {
      const cmpClass = compareClassNames(a.student.className, b.student.className);
      if (cmpClass !== 0) return cmpClass;
      return a.student.name.localeCompare(b.student.name);
    });
  }, [allStudentSummaries, searchQuery, selectedLevel, selectedStream, selectedClass, selectedStatus]);

  // Reset page when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLevel, selectedStream, selectedClass, selectedStatus]);

  const totalPages = Math.ceil(filteredSummaries.length / (pageSize || 1)) || 1;
  const paginatedSummaries = useMemo(() => {
    if (pageSize >= filteredSummaries.length || pageSize <= 0) return filteredSummaries;
    const start = (currentPage - 1) * pageSize;
    return filteredSummaries.slice(start, start + pageSize);
  }, [filteredSummaries, currentPage, pageSize]);

  const handleSingleDelete = async (student: Student) => {
    const confirmDelete = window.confirm(
      `Adakah anda pasti ingin memadam rekod murid "${student.name}" (${student.className})?`
    );
    if (!confirmDelete) return;
    await deleteStudent(student.id, true);
    setSelectedStudentIds((prev) => prev.filter((id) => id !== student.id));
  };

  const toggleExpand = (id: string) => {
    setExpandedStudentId(expandedStudentId === id ? null : id);
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Keperluan Bukan Wajib
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Berasaskan Pilihan Ibu Bapa</span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Pengurusan & Rekod Murid Tahun 3
          </h1>
          <p className="text-xs text-slate-500">
            {allStudentSummaries.length} murid berdaftar • Tetapkan pilihan keperluan ibu bapa, semak baki, dan rekod bayaran
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenImport}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition cursor-pointer flex items-center space-x-1.5"
          >
            <FileUp className="w-4 h-4 text-slate-600" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={onOpenAddStudent}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer flex items-center space-x-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Daftar Murid</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama murid, kelas, nombor MyKid, atau nama penjaga..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Privacy Toggle (for Admin) */}
          {currentUser.role === 'Pentadbir' && (
            <button
              onClick={() => setShowFullMyKid(!showFullMyKid)}
              className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl border border-slate-200 flex items-center space-x-1.5 transition cursor-pointer shrink-0"
              title="Kawalan Paparan Data Peribadi"
            >
              {showFullMyKid ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showFullMyKid ? 'Sembunyi MyKid Penuh' : 'Papar MyKid Penuh'}</span>
            </button>
          )}
        </div>

        {/* Filter Badges & Controls */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
          
          {/* Row 1: Year / Level Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
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

          {/* Row 2: Stream Filter + Specific Class Dropdown + Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-50">
            {/* Stream filter */}
            <div className="flex flex-wrap items-center gap-1.5">
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

            {/* Specific Class Quick Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Pilih Kelas:</span>
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
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {classesList.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls === 'Semua' ? `Semua Kelas (${classesList.length - 1} Kelas)` : cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filters */}
            <div className="flex items-center space-x-1">
              <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Status:</span>
              {['Semua', 'Selesai', 'Bayar Sebahagian', 'Belum Bayar'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedStatus === st
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Bulk Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                if (selectedStudentIds.length === filteredSummaries.length && filteredSummaries.length > 0) {
                  setSelectedStudentIds([]);
                } else {
                  setSelectedStudentIds(filteredSummaries.map((s) => s.student.id));
                }
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 transition cursor-pointer"
            >
              {selectedStudentIds.length === filteredSummaries.length && filteredSummaries.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedStudentIds.length === filteredSummaries.length && filteredSummaries.length > 0
                  ? 'Nyahpilih Semua'
                  : `Pilih Semua Murid (${filteredSummaries.length})`}
              </span>
            </button>

            {selectedStudentIds.length > 0 && (
              <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                {selectedStudentIds.length} murid dipilih
              </span>
            )}
          </div>

          {selectedStudentIds.length > 0 && (
            <div className="flex items-center space-x-2 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => setSelectedStudentIds([])}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition cursor-pointer"
              >
                Batal Pilihan
              </button>
              <button
                type="button"
                onClick={() => onOpenBulkDelete(selectedStudentIds)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md transition active:scale-95 cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Padam {selectedStudentIds.length} Murid (Pukal)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Student List */}
      <div className="space-y-3">
        {filteredSummaries.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <p className="text-sm font-semibold">Tiada rekod murid ditemui.</p>
            <p className="text-xs text-slate-400 mt-1">Cuba tukar kata kunci carian atau tetapan penapis.</p>
          </div>
        ) : (
          paginatedSummaries.map((summary) => {
            const { student, status, paidCents, balanceCents, totalFeeCents, itemBalances } = summary;
            const isExpanded = expandedStudentId === student.id;
            const isSelected = selectedStudentIds.includes(student.id);
            const studentTxs = transactions.filter((t) => t.studentId === student.id);

            const toggleStudentSelect = () => {
              setSelectedStudentIds((prev) =>
                prev.includes(student.id)
                  ? prev.filter((id) => id !== student.id)
                  : [...prev, student.id]
              );
            };

            return (
              <div
                key={student.id}
                className={`bg-white rounded-xl border shadow-xs transition overflow-hidden ${
                  isSelected
                    ? 'border-red-300 ring-2 ring-red-200 bg-red-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Main Row / Card Header */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left: Checkbox & Info */}
                  <div className="flex items-start space-x-3 flex-1">
                    <button
                      type="button"
                      onClick={toggleStudentSelect}
                      className="mt-1 text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0"
                      title={isSelected ? 'Nyahpilih murid' : 'Pilih murid'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-red-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900">
                          {student.name}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                          {student.className}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            status === 'Selesai'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'Bayar Sebahagian'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-0.5">
                        <div>
                          <span className="text-slate-400">MyKid: </span>
                          <span className="font-mono text-slate-700 font-medium">
                            {maskMyKid(student.myKid, showFullMyKid && currentUser.role === 'Pentadbir')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Penjaga: </span>
                          <span className="text-slate-700 font-medium">{student.parentName || '-'}</span>
                        </div>
                        {student.parentPhone && (
                          <div>
                            <span className="text-slate-400">Tel: </span>
                            <span className="font-mono text-slate-700">{student.parentPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Financials */}
                  <div className="flex items-center space-x-4 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Telah Dibayar</span>
                      <span className="text-sm font-black font-mono text-emerald-700">{formatRM(paidCents)}</span>
                    </div>
                    <div className="border-l border-slate-100 pl-4">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Baki Perlu</span>
                      <span className={`text-sm font-black font-mono ${balanceCents === 0 ? 'text-slate-400' : 'text-amber-800'}`}>
                        {formatRM(balanceCents)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-2 pt-2 md:pt-0 justify-end">
                    {balanceCents > 0 && (
                      <button
                        onClick={() => onOpenPaymentForStudent(student.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center space-x-1"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Bayar</span>
                      </button>
                    )}

                    <button
                      onClick={() => onOpenOptOutModal(student)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition cursor-pointer"
                      title="Tetapkan butiran yang dipilih atau sedia ada oleh ibu bapa"
                    >
                      Pilihan Keperluan
                    </button>

                    <button
                      onClick={() => onOpenEditStudent(student)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                      title="Kemas kini maklumat murid"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleSingleDelete(student)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-600 hover:text-white text-slate-400 hover:text-white transition cursor-pointer"
                      title="Padam murid ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => toggleExpand(student.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center space-x-1"
                    >
                      <span>{isExpanded ? 'Tutup' : 'Butiran & Resit'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                </div>

                {/* Expanded Details: 11 Items Status & Transaction History */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
                    
                    {/* Item by item grid */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                        Status Baki Mengikut 11 Perkara Keperluan:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {itemBalances.map((it) => (
                          <div
                            key={it.feeItemId}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                              it.isPaid
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                : it.paidCents > 0
                                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <span className="font-semibold block truncate">{it.feeItemName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Kadar: {formatRM(it.rateCents)}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              {it.isOptedOut ? (
                                <span className="font-medium text-[11px] text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                                  Sedia Ada / Tidak Ambil
                                </span>
                              ) : it.isPaid ? (
                                <span className="font-bold text-[11px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  Selesai
                                </span>
                              ) : (
                                <div>
                                  <span className="text-[11px] font-bold font-mono text-amber-800 block">
                                    Baki: {formatRM(it.remainingCents)}
                                  </span>
                                  {it.paidCents > 0 && (
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      (Telah bayar {formatRM(it.paidCents)})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Transaction History for this student */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                        Sejarah Transaksi & Resit Murid Ini:
                      </h4>
                      {studentTxs.length === 0 ? (
                        <p className="text-xs text-slate-500 italic bg-white p-3 rounded-lg border border-slate-200">
                          Belum ada transaksi direkodkan bagi murid ini.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {studentTxs.map((tx) => (
                            <div
                              key={tx.id}
                              className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center space-x-2">
                                <Receipt className="w-4 h-4 text-emerald-600" />
                                <div>
                                  <span className="font-bold font-mono text-slate-900">{tx.receiptNumber}</span>
                                  <span className="text-[11px] text-slate-500 ml-2">
                                    {tx.timestampMalaysia || tx.timestamp} • {tx.paymentMethod}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-3">
                                <span className="font-mono font-bold text-slate-900">{formatRM(tx.totalAmountCents)}</span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    tx.status === 'Dibatalkan' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {tx.status}
                                </span>
                                <button
                                  onClick={() => onSelectTransaction(tx)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded text-[11px] font-semibold transition cursor-pointer"
                                >
                                  Papar Resit
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {filteredSummaries.length > 0 && (
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-600">
            <span>
              Menunjukkan{' '}
              <strong>
                {pageSize > 0
                  ? `${Math.min((currentPage - 1) * pageSize + 1, filteredSummaries.length)} - ${Math.min(
                      currentPage * pageSize,
                      filteredSummaries.length
                    )}`
                  : `1 - ${filteredSummaries.length}`}
              </strong>{' '}
              daripada <strong>{filteredSummaries.length}</strong> murid
            </span>

            <span className="text-slate-300">|</span>

            <div className="flex items-center space-x-1">
              <span className="text-slate-500">Papar:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 font-semibold focus:outline-hidden"
              >
                <option value={30}>30 murid</option>
                <option value={50}>50 murid</option>
                <option value={100}>100 murid</option>
                <option value={0}>Semua ({filteredSummaries.length})</option>
              </select>
            </div>
          </div>

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-semibold text-slate-700 transition cursor-pointer"
              >
                Sebelumnya
              </button>

              <div className="px-3 py-1 font-mono font-bold text-slate-700">
                Halaman {currentPage} daripada {totalPages}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-semibold text-slate-700 transition cursor-pointer"
              >
                Seterusnya
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
