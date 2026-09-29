import React, { useState } from 'react';
import { Transaction, SchoolConfig } from '../types';
import { formatRM } from '../utils/currency';
import { generateReceiptPdf } from '../utils/receiptPdf';
import { Download, Printer, X, CheckCircle, AlertTriangle, FileText, Receipt } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  const { config, markReceiptPrinted, getStudentSummary } = useApp();
  const [activePageTab, setActivePageTab] = useState<'ibu_bapa' | 'sekolah'>('ibu_bapa');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!transaction) return null;

  // Calculate cumulative paid and overall balance for the student
  const summary = getStudentSummary(transaction.studentId);
  const cumulativePaidCents = summary?.paidCents ?? transaction.totalAmountCents;
  const overallBalanceCents = summary?.balanceCents ?? 0;
  const isReprint = (transaction.printCount || 0) > 1;

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = generateReceiptPdf({
        transaction,
        config,
        isReprint,
        cumulativePaidCents,
        overallBalanceCents,
      });

      const safeStudent = transaction.studentName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeReceipt = transaction.receiptNumber.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Resit_${safeReceipt}_${safeStudent}.pdf`;

      doc.save(filename);
      await markReceiptPrinted(transaction.id);
    } catch (err) {
      console.error('Ralat menjana PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
    markReceiptPrinted(transaction.id);
  };

  const copyLabel =
    activePageTab === 'ibu_bapa' ? 'SALINAN IBU BAPA / PENJAGA' : 'SALINAN REKOD SEKOLAH';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
                <span>Resit Pembayaran Rasmi: {transaction.receiptNumber}</span>
                {transaction.status === 'Dibatalkan' ? (
                  <span className="text-[10px] uppercase font-extrabold bg-red-600 text-white px-2 py-0.5 rounded-full">
                    Dibatalkan
                  </span>
                ) : isReprint ? (
                  <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    Salinan Cetak Semula
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    Resit Sah
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {transaction.studentName} • {transaction.studentClass} • {transaction.schoolYear}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Menjana PDF...' : 'Muat Turun PDF (2 Halaman)'}</span>
            </button>
            <button
              onClick={handleBrowserPrint}
              className="hidden sm:inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Two-page Preview Tabs & Notice */}
        <div className="bg-slate-100 px-4 sm:px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-600">Papar Halaman Resit:</span>
            <div className="inline-flex rounded-lg bg-slate-200 p-0.5">
              <button
                onClick={() => setActivePageTab('ibu_bapa')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  activePageTab === 'ibu_bapa'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Halaman 1: Salinan Ibu Bapa
              </button>
              <button
                onClick={() => setActivePageTab('sekolah')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  activePageTab === 'sekolah'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Halaman 2: Salinan Sekolah
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center space-x-1">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              PDF yang dimuat turun mengandungi <strong>tepat dua halaman A4 potret</strong> (Salinan Penjaga + Salinan Sekolah).
            </span>
          </div>
        </div>

        {/* Paper Container (Visual A4 preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/70 flex justify-center">
          <div className="bg-white text-slate-900 w-full max-w-[760px] p-6 sm:p-10 shadow-lg rounded-sm border border-slate-300 font-sans relative">
            
            {/* Watermark / Badge if cancelled */}
            {transaction.status === 'Dibatalkan' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="transform -rotate-12 border-4 border-red-600/30 text-red-600/30 font-black text-6xl sm:text-7xl px-8 py-4 rounded-xl select-none tracking-widest">
                  DIBATALKAN
                </div>
              </div>
            )}

            {/* Top Sheet Header */}
            <div className="border-b-2 border-slate-900 pb-1 mb-4 flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                {config.schoolName} • SISTEM PENGURUSAN YURAN
              </span>
              <div className="flex items-center space-x-3">
                {isReprint && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                    * SALINAN CETAK SEMULA *
                  </span>
                )}
                <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 tracking-wide">
                  [ {copyLabel} ]
                </span>
              </div>
            </div>

            {/* School Crest & Details */}
            <div className="flex items-start space-x-4 mb-5">
              {config.logoBase64 ? (
                <img
                  src={config.logoBase64}
                  alt="Logo Sekolah"
                  className="w-16 h-16 object-contain rounded border border-slate-200 p-1 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded border-2 border-slate-800 bg-slate-50 flex flex-col items-center justify-center text-center p-1 shrink-0">
                  <span className="text-[11px] font-black leading-tight text-slate-900">SK TUDAN</span>
                  <span className="text-[9px] text-slate-600">MIRI</span>
                  <span className="text-[8px] font-mono text-slate-500 mt-0.5">YBA4103</span>
                </div>
              )}

              <div className="flex-1">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none mb-1">
                  {config.schoolName}
                </h1>
                <p className="text-xs text-slate-600">
                  Kod Sekolah: {config.schoolCode} &nbsp;|&nbsp; {config.schoolAddress}
                </p>
                <p className="text-xs font-extrabold text-slate-800 mt-1 uppercase tracking-wider">
                  RESIT RASMI PEMBAYARAN KEPERLUAN TAHUN 3
                </p>
                <p className="text-[11px] text-slate-500">
                  Sesi Persekolahan: {transaction.schoolYear || config.currentSchoolYear}
                </p>
              </div>
            </div>

            {/* Cancellation Alert Box if cancelled */}
            {transaction.status === 'Dibatalkan' && (
              <div className="mb-4 bg-red-50 border border-red-300 rounded-lg p-3 text-red-900 text-xs">
                <div className="flex items-center space-x-1.5 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>TRANSAKSI RESIT INI TELAH DIBATALKAN</span>
                </div>
                <p>
                  <strong>Sebab:</strong> {transaction.cancellationReason || 'Tiada sebab dinyatakan.'}
                </p>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Dibatalkan oleh: {transaction.cancelledBy || 'Pentadbir'} pada{' '}
                  {transaction.cancelledAt ? new Date(transaction.cancelledAt).toLocaleString('ms-MY') : '-'}
                </p>
              </div>
            )}

            {/* Student & Receipt Meta Grid */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 mb-5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">No. Resit</span>
                  <span className="font-extrabold text-slate-900 font-mono">: {transaction.receiptNumber}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">Nama Murid</span>
                  <span className="font-bold text-slate-900">: {transaction.studentName}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">Kelas / Sesi</span>
                  <span className="text-slate-800">: {transaction.studentClass} ({transaction.schoolYear})</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">Pembayar</span>
                  <span className="text-slate-800">: {transaction.payerName || '-'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex">
                  <span className="w-28 text-slate-500 font-medium">Tarikh & Masa</span>
                  <span className="text-slate-800">: {transaction.timestampMalaysia || transaction.timestamp}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-medium">Kaedah Bayaran</span>
                  <span className="text-slate-800 font-medium">
                    : {transaction.paymentMethod}
                    {transaction.referenceNumber ? ` (${transaction.referenceNumber})` : ''}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-medium">Status Bayaran</span>
                  <span className="font-bold">
                    :{' '}
                    {transaction.status === 'Dibatalkan' ? (
                      <span className="text-red-600">DIBATALKAN</span>
                    ) : (
                      <span className="text-emerald-700">SAH DITERIMA</span>
                    )}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-medium">Diterima Oleh</span>
                  <span className="text-slate-800">: {transaction.recordedBy}</span>
                </div>
              </div>
            </div>

            {/* Table of Items Paid in This Transaction */}
            <div className="overflow-x-auto mb-4 border border-slate-300 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="py-2 px-2.5 text-center w-10">Bil.</th>
                    <th className="py-2 px-3">Perkara / Butiran Keperluan</th>
                    <th className="py-2 px-3 text-right">Kadar (RM)</th>
                    <th className="py-2 px-3 text-right">Telah Bayar (RM)</th>
                    <th className="py-2 px-3 text-right font-black text-slate-900 bg-emerald-50/70">
                      Bayaran Ini (RM)
                    </th>
                    <th className="py-2 px-3 text-right">Baki Selepas (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transaction.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                      <td className="py-2 px-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{item.feeItemName}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatRM(item.feeRateCents).replace('RM', '')}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {formatRM(item.previouslyPaidCents).replace('RM', '')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-emerald-50/50">
                        {formatRM(item.currentPaymentCents).replace('RM', '')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {item.remainingCentsAfter === 0 ? (
                          <span className="text-emerald-700">0.00 (L)</span>
                        ) : (
                          <span className="text-amber-700">
                            {formatRM(item.remainingCentsAfter).replace('RM', '')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Box */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 mb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="text-xs space-y-1 max-w-sm">
                <span className="font-bold text-slate-700 block">Catatan Transaksi:</span>
                <p className="text-slate-600 text-xs italic">
                  {transaction.notes ? transaction.notes : 'Tiada catatan tambahan.'}
                </p>
              </div>

              <div className="w-full sm:w-72 space-y-2 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-4 pt-2 sm:pt-0 text-xs">
                <div className="flex justify-between items-center py-0.5 font-bold text-sm text-slate-900 bg-emerald-100/60 px-2 py-1 rounded">
                  <span>JUMLAH DITERIMA RESIT INI:</span>
                  <span className="font-mono text-emerald-900">{formatRM(transaction.totalAmountCents)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 text-slate-600">
                  <span>Jumlah Terkumpul Telah Dibayar:</span>
                  <span className="font-mono font-bold text-slate-900">{formatRM(cumulativePaidCents)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 font-bold border-t border-slate-200 pt-1">
                  <span>Baki Keseluruhan Selepas Ini:</span>
                  <span className={`font-mono ${overallBalanceCents === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {overallBalanceCents === 0 ? 'RM0.00 (SELESAI)' : formatRM(overallBalanceCents)}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Legal Remark */}
            <div className="bg-slate-100 border border-slate-200 rounded p-2 text-[11px] text-slate-600 italic mb-6">
              * {config.receiptNote}
            </div>

            {/* Signature Block */}
            <div className="grid grid-cols-2 gap-8 text-xs pt-2">
              <div className="space-y-12">
                <div>
                  <span className="font-bold text-slate-700 block">Tandatangan Pembayar / Penjaga:</span>
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <p className="font-medium text-slate-800">Nama: {transaction.payerName || 'Ibu Bapa / Penjaga'}</p>
                  <p className="text-slate-500 text-[10px]">Tarikh: ........................................</p>
                </div>
              </div>

              <div className="space-y-12 text-right sm:text-left">
                <div>
                  <span className="font-bold text-slate-700 block">Tandatangan & Cop Guru / Petugas:</span>
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <p className="font-bold text-slate-900">{transaction.recordedBy}</p>
                  <p className="text-slate-500 text-[10px]">{transaction.userRole || 'Guru / Petugas Yuran'}</p>
                </div>
              </div>
            </div>

            {/* Sheet Footer */}
            <div className="border-t border-slate-200 mt-6 pt-2 flex items-center justify-between text-[10px] text-slate-400">
              <span>Sistem Rekod Yuran SK Tudan • Resit Berkomputer</span>
              <span className="font-bold text-slate-600">
                Halaman {activePageTab === 'ibu_bapa' ? '1' : '2'} daripada 2 [{copyLabel}]
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 hidden sm:block">
            Status Cetakan: Resit telah dicetak / dimuat turun <strong>{transaction.printCount || 1} kali</strong>.
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Muat Turun PDF (2 Halaman)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
