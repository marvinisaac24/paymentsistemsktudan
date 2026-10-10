import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { useApp } from '../context/AppContext';
import { formatRM } from '../utils/currency';
import {
  generateBulkReceiptsPdf,
  generateBulkReceiptsZip,
  downloadBlob,
  BulkReceiptItem,
} from '../utils/receiptPdf';
import {
  Download,
  Printer,
  X,
  FileText,
  Archive,
  CheckSquare,
  Square,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  Layers,
} from 'lucide-react';

interface BulkReceiptDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClass?: string;
}

export const BulkReceiptDownloadModal: React.FC<BulkReceiptDownloadModalProps> = ({
  isOpen,
  onClose,
  initialClass,
}) => {
  const { transactions, config, getStudentSummary, feeItems } = useApp();

  const [selectedClass, setSelectedClass] = useState<string>(initialClass || 'Semua');
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | 'Gambar' | 'Keperluan'>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<'pdf' | 'zip' | 'print' | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState('');

  // Extract all photo item IDs
  const photoItemIds = useMemo(() => {
    return feeItems
      .filter(
        (f) =>
          f.name.toLowerCase().includes('gambar') ||
          f.name.toLowerCase().includes('5r') ||
          f.name.toLowerCase().includes('8r') ||
          f.name.toLowerCase().includes('panorama')
      )
      .map((f) => f.id);
  }, [feeItems]);

  // Available classes list
  const classesList = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.studentClass) set.add(t.studentClass);
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Filter valid transactions (exclude cancelled by default)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.status === 'Dibatalkan') return false;

      if (selectedClass !== 'Semua' && tx.studentClass !== selectedClass) {
        return false;
      }

      if (selectedCategory === 'Gambar') {
        const hasPhoto = tx.items.some((it) => photoItemIds.includes(it.feeItemId));
        if (!hasPhoto) return false;
      } else if (selectedCategory === 'Keperluan') {
        const hasNonPhoto = tx.items.some((it) => !photoItemIds.includes(it.feeItemId));
        if (!hasNonPhoto) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = tx.studentName.toLowerCase().includes(q);
        const matchReceipt = tx.receiptNumber.toLowerCase().includes(q);
        const matchPayer = (tx.payerName || '').toLowerCase().includes(q);
        if (!matchName && !matchReceipt && !matchPayer) return false;
      }

      return true;
    });
  }, [transactions, selectedClass, selectedCategory, searchQuery, photoItemIds]);

  // Initial selection: select all filtered by default on load or filter change
  React.useEffect(() => {
    if (isOpen) {
      const allIds = new Set(filteredTransactions.map((t) => t.id));
      setSelectedTxIds(allIds);
      setErrorMessage('');
    }
  }, [isOpen, filteredTransactions.length, selectedClass, selectedCategory]);

  if (!isOpen) return null;

  const isAllSelected = filteredTransactions.length > 0 && selectedTxIds.size === filteredTransactions.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  const handleToggleTx = (id: string) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedItemsToProcess: BulkReceiptItem[] = filteredTransactions
    .filter((tx) => selectedTxIds.has(tx.id))
    .map((tx) => {
      const summary = getStudentSummary(tx.studentId);
      return {
        transaction: tx,
        config,
        cumulativePaidCents: summary?.paidCents ?? tx.totalAmountCents,
        overallBalanceCents: summary?.balanceCents ?? 0,
      };
    });

  const totalSelectedAmountCents = selectedItemsToProcess.reduce(
    (acc, it) => acc + it.transaction.totalAmountCents,
    0
  );

  // Download Bulk Multi-page PDF
  const handleDownloadCombinedPdf = async () => {
    if (selectedItemsToProcess.length === 0) {
      setErrorMessage('Sila pilih sekurang-kurangnya satu resit untuk dimuat turun.');
      return;
    }

    setIsGenerating(true);
    setGenerationType('pdf');
    setProgress({ current: 0, total: selectedItemsToProcess.length });
    setErrorMessage('');

    try {
      // Yield to let UI update
      await new Promise((resolve) => setTimeout(resolve, 50));

      const doc = generateBulkReceiptsPdf(selectedItemsToProcess, (curr, tot) => {
        setProgress({ current: curr, total: tot });
      });

      const classLabel = selectedClass === 'Semua' ? 'Semua_Kelas' : selectedClass.replace(/\s+/g, '_');
      const filename = `Resit_Pukal_SK_Tudan_${classLabel}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ralat berlaku semasa menjana PDF pukal.');
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  // Download Bulk ZIP
  const handleDownloadZip = async () => {
    if (selectedItemsToProcess.length === 0) {
      setErrorMessage('Sila pilih sekurang-kurangnya satu resit untuk dimuat turun.');
      return;
    }

    setIsGenerating(true);
    setGenerationType('zip');
    setProgress({ current: 0, total: selectedItemsToProcess.length });
    setErrorMessage('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const zipBlob = await generateBulkReceiptsZip(selectedItemsToProcess, (curr, tot) => {
        setProgress({ current: curr, total: tot });
      });

      const classLabel = selectedClass === 'Semua' ? 'Semua_Kelas' : selectedClass.replace(/\s+/g, '_');
      const filename = `Pakej_Resit_SK_Tudan_${classLabel}_${new Date().toISOString().split('T')[0]}.zip`;
      downloadBlob(zipBlob, filename);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ralat berlaku semasa menjana arkib ZIP.');
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  // Print all in browser
  const handlePrintAll = async () => {
    if (selectedItemsToProcess.length === 0) {
      setErrorMessage('Sila pilih sekurang-kurangnya satu resit.');
      return;
    }

    setIsGenerating(true);
    setGenerationType('print');
    setProgress({ current: 0, total: selectedItemsToProcess.length });
    setErrorMessage('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const doc = generateBulkReceiptsPdf(selectedItemsToProcess, (curr, tot) => {
        setProgress({ current: curr, total: tot });
      });

      const blobUrl = doc.output('bloburl');
      const printWindow = window.open(blobUrl as unknown as string, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ralat semasa memulakan cetakan.');
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Muat Turun Resit Secara Pukal
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  SK Tudan Miri
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pilih dan muat turun resit rasmi (1 Halaman / 2 Salinan) dalam Satu Fail PDF Gabungan atau Folder ZIP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 text-xs">
          {/* Class Filter */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tapis Mengikut Kelas:</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="Semua">Semua Kelas ({transactions.length} Resit)</option>
              {classesList.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas: {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Jenis Resit / Bayaran:</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="Semua">Semua Bayaran (Keperluan & Gambar)</option>
              <option value="Gambar">📸 Resit Gambar Sahaja (5R, 8R, Panorama)</option>
              <option value="Keperluan">📚 Resit Yuran & Keperluan Sekolah</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center space-x-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Cari Murid / No. Resit:</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Contoh: Danial, SKT/2026/0001..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Progress & Error Banner */}
        {isGenerating && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-4 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-2">
              <span className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>
                  {generationType === 'zip'
                    ? 'Sedang mengekstrak resit ke dalam arkib ZIP...'
                    : 'Sedang menjana fail PDF pukal berhalaman penuh...'}
                </span>
              </span>
              <span className="font-mono">
                {progress.current} / {progress.total} (
                {Math.round((progress.current / Math.max(1, progress.total)) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 transition-all duration-150"
                style={{
                  width: `${(progress.current / Math.max(1, progress.total)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-100 border-b border-red-200 text-red-900 text-xs font-bold flex items-center space-x-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Selection Summary Bar */}
        <div className="bg-slate-100 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="inline-flex items-center space-x-1.5 font-bold text-slate-800 hover:text-emerald-700 cursor-pointer select-none"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Pilih Semua ({filteredTransactions.length} Resit)</span>
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">
              Dipilih: <strong className="text-emerald-700">{selectedItemsToProcess.length}</strong> resit
            </span>
          </div>

          <div className="text-right">
            <span className="text-slate-500">Jumlah Amaun Terlibat: </span>
            <strong className="font-mono text-emerald-800 text-sm font-black">
              {formatRM(totalSelectedAmountCents)}
            </strong>
          </div>
        </div>

        {/* Receipt List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Tiada transaksi bayaran yang sepadan dengan tapisan ini.</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isSelected = selectedTxIds.has(tx.id);
              const isPhoto = tx.items.some((it) => photoItemIds.includes(it.feeItemId));

              return (
                <div
                  key={tx.id}
                  onClick={() => handleToggleTx(tx.id)}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer select-none text-xs ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-400 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="text-emerald-600 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 truncate">{tx.studentName}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                          {tx.studentClass}
                        </span>
                        {isPhoto && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
                            📸 Gambar
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-2 pt-0.5 truncate">
                        <span className="font-mono font-bold text-slate-700">{tx.receiptNumber}</span>
                        <span>•</span>
                        <span>{tx.timestampMalaysia || tx.timestamp}</span>
                        <span>•</span>
                        <span className="truncate">{tx.items.map((i) => i.feeItemName).join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right pl-3 shrink-0">
                    <span className="font-mono font-black text-slate-900 text-sm block">
                      {formatRM(tx.totalAmountCents)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {tx.paymentMethod}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Resit dijana dalam format <strong>1 Halaman A4 Rasmi</strong> (Salinan Guru & Ibu Bapa Bersekali).
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40"
            >
              Tutup
            </button>

            {/* Print All Button */}
            <button
              type="button"
              onClick={handlePrintAll}
              disabled={isGenerating || selectedItemsToProcess.length === 0}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40 shadow-xs"
              title="Cetak semua resit dipilih sekaligus"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Pukal</span>
            </button>

            {/* ZIP Download Button */}
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isGenerating || selectedItemsToProcess.length === 0}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40 shadow-xs active:scale-95"
              title="Muat turun arkib ZIP dengan fail PDF berasingan setiap murid"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Muat Turun Fail ZIP ({selectedItemsToProcess.length})</span>
            </button>

            {/* Combined PDF Button (Primary) */}
            <button
              type="button"
              onClick={handleDownloadCombinedPdf}
              disabled={isGenerating || selectedItemsToProcess.length === 0}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition cursor-pointer disabled:opacity-40 shadow-md active:scale-95"
              title="Muat turun satu fail PDF yang mengandungi semua resit"
            >
              <Download className="w-4 h-4" />
              <span>Muat Turun 1 PDF Pukal ({selectedItemsToProcess.length} Resit)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
