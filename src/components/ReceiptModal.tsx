import React, { useState } from 'react';
import { Transaction, SchoolConfig } from '../types';
import { formatRM } from '../utils/currency';
import { generateSinglePageCombinedPdf, generateReceiptPdf } from '../utils/receiptPdf';
import { Download, Printer, X, AlertTriangle, FileText, Receipt, Scissors, Edit3, Trash2, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onOpenCancelModal?: (transaction: Transaction) => void;
  onOpenPibgReceipt?: (transaction: Transaction) => void;
}

interface SingleReceiptProps {
  copyTitle: string;
  transaction: Transaction;
  config: SchoolConfig;
  isReprint: boolean;
  cumulativePaidCents: number;
  overallBalanceCents: number;
}

const SingleReceiptBlock: React.FC<SingleReceiptProps> = ({
  copyTitle,
  transaction,
  config,
  isReprint,
  cumulativePaidCents,
  overallBalanceCents,
}) => {
  const classTeacherName = transaction.classTeacherName || config.classTeachers?.[transaction.studentClass] || 'Guru Kelas SK Tudan';

  const logoSrc = config.logoBase64 || (typeof window !== 'undefined' ? localStorage.getItem('sk_tudan_school_logo') : null);

  // Signatory name and designation based on configuration in Tetapan
  let signatoryName = config.receiptSignatoryName || config.adminName || 'LIM AI GIOK';
  let signatoryTitle = config.receiptSignatoryTitle || 'Guru Besar';

  if (config.receiptSignatoryMode === 'class_teacher') {
    signatoryName = classTeacherName;
    signatoryTitle = `Guru Kelas (${transaction.studentClass})`;
  } else if (config.receiptSignatoryMode === 'recorder') {
    signatoryName = transaction.recordedBy;
    signatoryTitle = transaction.userRole || 'Petugas Yuran';
  }

  return (
    <div className="receipt-single-block border border-slate-300 rounded-lg p-4 sm:p-5 bg-white text-slate-900 font-sans text-xs relative">
      {/* Top Header & Copy Badge */}
      <div className="border-b-2 border-slate-900 pb-1 mb-2.5 flex items-center justify-between">
        <span className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-700 uppercase">
          {config.schoolName} • SISTEM PENGURUSAN YURAN & GAMBAR
        </span>
        <div className="flex items-center space-x-2">
          {isReprint && (
            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-1.5 py-0.2 rounded">
              * CETAK SEMULA *
            </span>
          )}
          <span className="text-[10px] sm:text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 tracking-wide">
            [ {copyTitle} ]
          </span>
        </div>
      </div>

      {/* School Emblem & Title */}
      <div className="flex items-start space-x-3 mb-3">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt="Logo Sekolah"
            className="w-11 h-11 object-contain rounded border border-slate-200 p-0.5 shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded border border-slate-700 bg-slate-50 flex flex-col items-center justify-center text-center p-0.5 shrink-0">
            <span className="text-[9px] font-black leading-tight text-slate-900">SK TUDAN</span>
            <span className="text-[7px] text-slate-600">MIRI</span>
            <span className="text-[6px] font-mono text-slate-500">{config.schoolCode || 'YBA4111'}</span>
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
            {config.schoolName}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Kod Sekolah: {config.schoolCode} &nbsp;|&nbsp; {config.schoolAddress}
          </p>
          <p className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider mt-1">
            RESIT RASMI PEMBAYARAN KEPERLUAN & GAMBAR KELAS
          </p>
        </div>
      </div>

      {/* Metadata Box */}
      <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:text-sm">
        <div className="flex">
          <span className="w-24 text-slate-500 font-semibold">No. Resit</span>
          <span className="font-bold text-slate-950 font-mono">: {transaction.receiptNumber}</span>
        </div>
        <div className="flex">
          <span className="w-28 text-slate-500 font-semibold">Tarikh & Masa</span>
          <span className="text-slate-900 font-medium">: {transaction.timestampMalaysia || transaction.timestamp}</span>
        </div>
        <div className="flex">
          <span className="w-24 text-slate-500 font-semibold">Nama Murid</span>
          <span className="font-bold text-slate-950">: {transaction.studentName}</span>
        </div>
        <div className="flex">
          <span className="w-28 text-slate-500 font-semibold">Kaedah Bayar</span>
          <span className="text-slate-900 font-medium">: {transaction.paymentMethod} {transaction.referenceNumber ? `(${transaction.referenceNumber})` : ''}</span>
        </div>
        <div className="flex">
          <span className="w-24 text-slate-500 font-semibold">Kelas / Sesi</span>
          <span className="text-slate-900 font-bold">: {transaction.studentClass} ({transaction.schoolYear})</span>
        </div>
        <div className="flex">
          <span className="w-28 text-slate-500 font-semibold">Pembayar</span>
          <span className="text-slate-900 font-medium">: {transaction.payerName || '-'}</span>
        </div>
        <div className="flex sm:col-span-2 pt-1.5 border-t border-slate-200">
          <span className="w-24 text-emerald-800 font-bold">Guru Kelas</span>
          <span className="text-emerald-950 font-black">: {classTeacherName}</span>
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden mb-3">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-bold">
              <th className="py-1.5 px-2.5 text-center w-10">Bil.</th>
              <th className="py-1.5 px-2.5">Perkara / Butiran Bayaran</th>
              <th className="py-1.5 px-2.5 text-right w-24">Kadar (RM)</th>
              <th className="py-1.5 px-2.5 text-right w-28 bg-emerald-700">Dibayar (RM)</th>
              <th className="py-1.5 px-2.5 text-right w-24">Baki (RM)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {transaction.items.map((it, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                <td className="py-1.5 px-2.5 text-center text-slate-500 font-mono font-medium">{idx + 1}</td>
                <td className="py-1.5 px-2.5 font-bold text-slate-900">{it.feeItemName}</td>
                <td className="py-1.5 px-2.5 text-right font-mono text-slate-700">{formatRM(it.feeRateCents).replace('RM', '')}</td>
                <td className="py-1.5 px-2.5 text-right font-mono font-black text-emerald-900 bg-emerald-50/50">
                  {formatRM(it.currentPaymentCents).replace('RM', '')}
                </td>
                <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-slate-800">
                  {it.remainingCentsAfter === 0 ? (
                    <span className="text-emerald-700 font-bold">0.00 (Lunas)</span>
                  ) : (
                    formatRM(it.remainingCentsAfter).replace('RM', '')
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-xs sm:text-sm">
              <td colSpan={2} className="py-2 px-2.5 text-slate-900">
                JUMLAH BAYARAN RESIT INI
              </td>
              <td></td>
              <td className="py-2 px-2.5 text-right font-mono font-black text-emerald-900 bg-emerald-100/80 text-sm sm:text-base">
                {formatRM(transaction.totalAmountCents)}
              </td>
              <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-800 text-xs">
                Terkumpul: {formatRM(cumulativePaidCents)}
              </td>
            </tr>
            {transaction.amountTenderedCents !== undefined && transaction.amountTenderedCents > transaction.totalAmountCents && (
              <tr className="bg-emerald-50/90 border-t border-emerald-200 text-xs sm:text-sm">
                <td colSpan={2} className="py-1.5 px-2.5 text-slate-800 font-medium">
                  Wang Diterima: <strong className="font-mono text-slate-900">{formatRM(transaction.amountTenderedCents)}</strong>
                </td>
                <td colSpan={2} className="py-1.5 px-2.5 text-right font-black text-emerald-950">
                  BAKI DIKEMBALIKAN KEPADA MURID:
                </td>
                <td className="py-1.5 px-2.5 text-right font-mono font-black text-emerald-900 bg-emerald-200/80 text-sm">
                  {formatRM(transaction.changeReturnedCents || (transaction.amountTenderedCents - transaction.totalAmountCents))}
                  {transaction.changeReturnedStatus === 'Belum Dipulangkan' ? (
                    <span className="block text-[10px] text-amber-700 font-extrabold">* Baki Tertunggak</span>
                  ) : (
                    <span className="block text-[10px] text-emerald-700 font-extrabold">* Telah Dipulangkan</span>
                  )}
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Footer & Signatures */}
      <div className="pt-2 flex justify-between items-end text-xs text-slate-700">
        <div>
          <p className="italic text-slate-500 text-[11px]">
            * Resit cetakan komputer rasmi SK Tudan. Bukti sah pembayaran.
          </p>
          <div className="mt-5 pt-1 border-t border-slate-300 w-36 sm:w-40">
            <span className="block font-semibold">Tandatangan Pembayar</span>
            <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
              {transaction.payerName || 'Ibu Bapa / Penjaga'}
            </span>
          </div>
        </div>

        {/* Guru Kelas Signature Block (optional based on setting) */}
        {config.showTeacherSignature !== false && config.receiptSignatoryMode !== 'class_teacher' && (
          <div className="text-center">
            <div className="mt-5 pt-1 border-t border-slate-300 w-44 sm:w-48">
              <span className="font-bold text-slate-800 block text-xs">Guru Kelas</span>
              <span className="text-xs text-emerald-800 font-bold block truncate">{classTeacherName}</span>
              <span className="text-[10px] text-slate-400 block">(Tandatangan & Cop)</span>
            </div>
          </div>
        )}

        {/* Configured Signatory & Official Stamp Block */}
        <div className="text-right">
          <div className="relative inline-block text-center min-w-[160px] sm:min-w-[180px]">
            {/* Signature & Stamp Overlay Container */}
            <div className="h-12 relative flex items-center justify-center">
              {config.showSignatureStampOnReceipt !== false && config.receiptStampBase64 && (
                <img
                  src={config.receiptStampBase64}
                  alt="Cop Rasmi"
                  className="absolute -top-3 right-0 w-16 h-16 object-contain pointer-events-none opacity-85 mix-blend-multiply rotate-[-6deg]"
                />
              )}
              {config.showSignatureStampOnReceipt !== false && config.receiptSignatureBase64 ? (
                <img
                  src={config.receiptSignatureBase64}
                  alt="Tandatangan"
                  className="relative z-10 max-h-11 max-w-[130px] object-contain"
                />
              ) : (
                <div className="h-6"></div>
              )}
            </div>

            <div className="border-t border-slate-400 pt-1">
              <span className="font-bold text-slate-900 block text-xs">
                ( {signatoryName} )
              </span>
              <span className="text-[10.5px] text-slate-700 font-semibold block">
                {signatoryTitle}
              </span>
              {config.receiptStampText && (
                <span className="text-[9px] text-slate-400 block italic leading-tight">
                  {config.receiptStampText}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Official School Admin & Verification Footnote */}
      <div className="mt-2 pt-1 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-[8.5px] text-slate-400">
        <span>Pentadbir Sistem: {config.adminName || 'LIM AI GIOK'} ({config.adminTitle || 'Guru Besar'})</span>
        <span>Guru Besar: {config.headmasterName || 'LIM AI GIOK'}</span>
      </div>
    </div>
  );
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  onClose,
  onEditTransaction,
  onOpenCancelModal,
  onOpenPibgReceipt,
}) => {
  const { config, markReceiptPrinted, getStudentSummary } = useApp();
  const [activePageTab, setActivePageTab] = useState<'combined' | 'ibu_bapa' | 'sekolah'>('combined');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!transaction) return null;

  const summary = getStudentSummary(transaction.studentId);
  const cumulativePaidCents = summary?.paidCents ?? transaction.totalAmountCents;
  const overallBalanceCents = summary?.balanceCents ?? 0;
  const isReprint = (transaction.printCount || 0) > 1;

  // Download PDF (1 Halaman - 2 dalam 1)
  const handleDownloadCombinedPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = generateSinglePageCombinedPdf({
        transaction,
        config,
        isReprint,
        cumulativePaidCents,
        overallBalanceCents,
      });

      const safeStudent = transaction.studentName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeReceipt = transaction.receiptNumber.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Resit_1Halaman_${safeReceipt}_${safeStudent}.pdf`;

      doc.save(filename);
      await markReceiptPrinted(transaction.id);
    } catch (err) {
      console.error('Ralat menjana PDF 1 Halaman:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Download PDF (2 Halaman Asing)
  const handleDownloadTwoPagePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = generateReceiptPdf({
        transaction,
        config,
        isReprint,
        cumulativePaidCents,
        overallBalanceCents,
        layout: 'two_pages',
      });

      const safeStudent = transaction.studentName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeReceipt = transaction.receiptNumber.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Resit_2Halaman_${safeReceipt}_${safeStudent}.pdf`;

      doc.save(filename);
      await markReceiptPrinted(transaction.id);
    } catch (err) {
      console.error('Ralat menjana PDF 2 Halaman:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
    markReceiptPrinted(transaction.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
                <span>Resit Rasmi: {transaction.receiptNumber}</span>
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
              onClick={handleDownloadCombinedPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Muat turun format satu halaman A4 yang mengandungi Salinan Guru dan Salinan Ibu Bapa"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Menjana...' : 'Muat Turun PDF (1 Halaman - Salinan Guru & Ibu Bapa)'}</span>
            </button>
            {onOpenPibgReceipt && (transaction.isPibgFamilyPayment || transaction.items.some((it) => it.feeItemName.toLowerCase().includes('pibg'))) && (
              <button
                type="button"
                onClick={() => {
                  const tx = transaction;
                  onClose();
                  onOpenPibgReceipt(tx);
                }}
                className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
                title="Cetak atau muat turun Resit Khas Sumbangan PIBG (Keluarga) dengan senarai adik-beradik"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Resit Khas PIBG</span>
              </button>
            )}
            {onEditTransaction && transaction.status !== 'Dibatalkan' && (
              <button
                type="button"
                onClick={() => {
                  const tx = transaction;
                  onClose();
                  onEditTransaction(tx);
                }}
                className="inline-flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
                title="Edit maklumat jika tersalah isi pilihan gambar atau butiran bayaran"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Bayaran</span>
              </button>
            )}

            {onOpenCancelModal && transaction.status !== 'Dibatalkan' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCancelModal(transaction);
                }}
                className="inline-flex items-center space-x-1.5 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
                title="Padam atau batalkan rekod pembayaran ini jika tersalah daftar"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Padam / Batal</span>
              </button>
            )}
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

        {/* View Tabs Selector */}
        <div className="bg-slate-100 px-4 sm:px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-600">Pilihan Paparan & Cetakan:</span>
            <div className="inline-flex rounded-lg bg-slate-200 p-0.5">
              <button
                onClick={() => setActivePageTab('combined')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  activePageTab === 'combined'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1 Halaman: Salinan Guru & Ibu Bapa (2-dalam-1)
              </button>
              <button
                onClick={() => setActivePageTab('ibu_bapa')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  activePageTab === 'ibu_bapa'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Salinan Ibu Bapa Sahaja
              </button>
              <button
                onClick={() => setActivePageTab('sekolah')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  activePageTab === 'sekolah'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Salinan Guru Sahaja
              </button>
            </div>
          </div>

          <button
            onClick={handleDownloadTwoPagePdf}
            disabled={isGeneratingPdf}
            className="text-[11px] text-slate-600 hover:text-slate-900 underline font-medium cursor-pointer"
            title="Muat turun format 2 halaman berasingan"
          >
            Pilihan: Muat Turun PDF 2 Halaman Asing
          </button>
        </div>

        {/* Paper Container Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 flex justify-center print:p-0 print:bg-white">
          <div className="receipt-print-area w-full max-w-[760px] space-y-4">
            
            {/* If Combined 1-page mode */}
            {activePageTab === 'combined' && (
              <>
                <SingleReceiptBlock
                  copyTitle="SALINAN GURU / REKOD SEKOLAH"
                  transaction={transaction}
                  config={config}
                  isReprint={isReprint}
                  cumulativePaidCents={cumulativePaidCents}
                  overallBalanceCents={overallBalanceCents}
                />

                {/* Perforation Cutting Line */}
                <div className="py-1 border-t-2 border-dashed border-slate-400 relative flex items-center justify-center select-none">
                  <span className="bg-slate-200/90 text-slate-600 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-xs">
                    <Scissors className="w-3 h-3 text-slate-500" />
                    <span>KERATAN SALINAN GURU (ATAS) & SALINAN IBU BAPA (BAWAH)</span>
                    <Scissors className="w-3 h-3 text-slate-500 transform rotate-180" />
                  </span>
                </div>

                <SingleReceiptBlock
                  copyTitle="SALINAN IBU BAPA / PENJAGA"
                  transaction={transaction}
                  config={config}
                  isReprint={isReprint}
                  cumulativePaidCents={cumulativePaidCents}
                  overallBalanceCents={overallBalanceCents}
                />
              </>
            )}

            {/* If Single Salinan Ibu Bapa */}
            {activePageTab === 'ibu_bapa' && (
              <SingleReceiptBlock
                copyTitle="SALINAN IBU BAPA / PENJAGA"
                transaction={transaction}
                config={config}
                isReprint={isReprint}
                cumulativePaidCents={cumulativePaidCents}
                overallBalanceCents={overallBalanceCents}
              />
            )}

            {/* If Single Salinan Guru */}
            {activePageTab === 'sekolah' && (
              <SingleReceiptBlock
                copyTitle="SALINAN GURU / REKOD SEKOLAH"
                transaction={transaction}
                config={config}
                isReprint={isReprint}
                cumulativePaidCents={cumulativePaidCents}
                overallBalanceCents={overallBalanceCents}
              />
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
