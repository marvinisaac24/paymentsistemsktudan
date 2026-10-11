import React, { useState } from 'react';
import { Transaction, SchoolConfig } from '../types';
import { formatRM } from '../utils/currency';
import { generatePibgReceiptPdf } from '../utils/pibgReceiptPdf';
import { Download, Printer, X, FileText, CheckCircle2, Users, Scissors } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface PibgReceiptModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenStandardReceipt?: (transaction: Transaction) => void;
}

interface SinglePibgBlockProps {
  copyTitle: string;
  transaction: Transaction;
  config: SchoolConfig;
}

const SinglePibgReceiptBlock: React.FC<SinglePibgBlockProps> = ({ copyTitle, transaction, config }) => {
  const repName = transaction.pibgRepresentativeStudentName || transaction.studentName;
  const repClass = transaction.pibgRepresentativeClassName || transaction.studentClass;
  const siblings = transaction.pibgFamilySiblingNamesWithClasses || [];
  const pibgItem = transaction.items?.find((it) => it.feeItemName.toLowerCase().includes('pibg'));
  const pibgAmountCents = pibgItem ? pibgItem.currentPaymentCents : 2000;
  const recordedBy = transaction.recordedBy || 'Guru / Petugas PIBG';

  return (
    <div className="pibg-single-block border border-slate-300 rounded-xl p-4 sm:p-5 bg-white text-slate-900 font-sans text-xs shadow-xs relative">
      {/* Top Header & Copy Badge */}
      <div className="border-b-2 border-slate-900 pb-1.5 mb-3 flex items-center justify-between">
        <span className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-700 uppercase">
          {config.schoolName} • PERSATUAN IBU BAPA DAN GURU (PIBG)
        </span>
        <div className="flex items-center space-x-2">
          {transaction.printCount > 1 && (
            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
              * CETAK SEMULA *
            </span>
          )}
          <span className="text-[10px] sm:text-xs font-black text-slate-900 bg-emerald-50 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded tracking-wide">
            [ {copyTitle} ]
          </span>
        </div>
      </div>

      {/* School Emblem & Title */}
      <div className="flex items-start space-x-3 mb-3">
        {config.logoBase64 ? (
          <img
            src={config.logoBase64}
            alt="Logo Sekolah"
            className="w-12 h-12 object-contain rounded border border-slate-200 p-0.5 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded border border-slate-700 bg-slate-50 flex flex-col items-center justify-center text-center p-0.5 shrink-0">
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
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs sm:text-sm font-black text-emerald-800 uppercase tracking-wide">
              RESIT RASMI SUMBANGAN PIBG (KELUARGA)
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              1 Bayaran = 1 Keluarga
            </span>
          </div>
        </div>
      </div>

      {/* Metadata Card */}
      <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
        <div className="flex">
          <span className="w-28 text-slate-500 font-semibold">No. Resit PIBG</span>
          <span className="font-mono font-bold text-slate-950">: {transaction.receiptNumber}</span>
        </div>
        <div className="flex">
          <span className="w-28 text-slate-500 font-semibold">Tarikh & Masa</span>
          <span className="text-slate-900 font-medium">: {transaction.timestampMalaysia || transaction.timestamp}</span>
        </div>
        <div className="flex">
          <span className="w-28 text-slate-500 font-semibold">Nama Murid Wakil</span>
          <span className="font-bold text-slate-950">: {repName}</span>
        </div>
        <div className="flex">
          <span className="w-28 text-slate-500 font-semibold">Kelas Murid Wakil</span>
          <span className="text-slate-900 font-bold">: {repClass} ({transaction.schoolYear})</span>
        </div>
        <div className="flex">
          <span className="w-28 text-slate-500 font-semibold">Nama Penjaga</span>
          <span className="text-slate-900 font-medium">: {transaction.payerName || '-'}</span>
        </div>
        <div className="flex">
          <span className="w-28 text-slate-500 font-semibold">Kaedah Bayaran</span>
          <span className="text-slate-900 font-medium">
            : {transaction.paymentMethod} {transaction.referenceNumber ? `(${transaction.referenceNumber})` : ''}
          </span>
        </div>
        <div className="flex sm:col-span-2 pt-1 border-t border-slate-200">
          <span className="w-28 text-emerald-800 font-bold">Penerima Bayaran</span>
          <span className="text-emerald-950 font-black">: {recordedBy}</span>
        </div>
      </div>

      {/* Linked Siblings Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden mb-3">
        <div className="bg-slate-800 text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Senarai Murid & Adik-Beradik Diliputi Dalam Keluarga Ini:</span>
          </div>
          <span className="text-[10px] text-slate-300 font-normal">
            {1 + siblings.length} Murid Terpaut
          </span>
        </div>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300">
              <th className="py-1 px-2.5 text-center w-10">Bil.</th>
              <th className="py-1 px-2.5">Nama Murid</th>
              <th className="py-1 px-2.5 w-32">Kelas</th>
              <th className="py-1 px-2.5 text-right w-44">Status Sumbangan PIBG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {/* Representative row */}
            <tr className="bg-emerald-50/40">
              <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-600">1</td>
              <td className="py-1.5 px-2.5 font-bold text-slate-900 flex items-center space-x-1">
                <span>{repName}</span>
                <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold">
                  Wakil Pembayaran
                </span>
              </td>
              <td className="py-1.5 px-2.5 font-semibold text-slate-800">{repClass}</td>
              <td className="py-1.5 px-2.5 text-right font-bold text-emerald-700">
                <span className="inline-flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Telah Bayar (Wakil)</span>
                </span>
              </td>
            </tr>

            {/* Sibling rows */}
            {siblings.map((sib, idx) => (
              <tr key={sib.id || idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                <td className="py-1.5 px-2.5 text-center font-mono text-slate-500">{idx + 2}</td>
                <td className="py-1.5 px-2.5 text-slate-800 font-medium">
                  {sib.name}
                  <span className="text-[9px] text-slate-500 ml-1.5">(Adik-beradik)</span>
                </td>
                <td className="py-1.5 px-2.5 text-slate-700">{sib.className}</td>
                <td className="py-1.5 px-2.5 text-right font-semibold text-emerald-700">
                  <span className="inline-flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Lunas Melalui Wakil</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Details */}
      <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 mb-3 flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-emerald-950 block">SUMBANGAN PIBG (1 KELUARGA):</span>
          <span className="text-[11px] text-emerald-800">
            Sesi Persekolahan {transaction.schoolYear || '2026'}
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono text-base sm:text-lg font-black text-emerald-900 block">
            {formatRM(pibgAmountCents)}
          </span>
          <span className="text-[10px] text-emerald-700 font-bold">LUNAS SEPENUHNYA</span>
        </div>
      </div>

      {/* Automated Note Box */}
      {transaction.notes && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3 text-[11px]">
          <span className="font-bold text-slate-700 block mb-0.5">Catatan Rasmi Rekod Sistem:</span>
          <p className="text-slate-600 italic">{transaction.notes}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 pt-3 border-t border-slate-200 text-center text-xs">
        <div>
          <div className="h-9"></div>
          <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
            ( {recordedBy} )
          </div>
          <span className="text-[10px] text-slate-500">Tandatangan / Cop Penerima PIBG</span>
        </div>
        <div>
          <div className="h-9"></div>
          <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
            ( {transaction.payerName || 'Ibu Bapa / Penjaga'} )
          </div>
          <span className="text-[10px] text-slate-500">Tandatangan Ibu Bapa / Penjaga</span>
        </div>
      </div>
    </div>
  );
};

export const PibgReceiptModal: React.FC<PibgReceiptModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onOpenStandardReceipt,
}) => {
  const { config, markReceiptPrinted } = useApp();
  const [copyChoice, setCopyChoice] = useState<'both' | 'parent' | 'teacher'>('both');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !transaction) return null;

  const handlePrint = async () => {
    await markReceiptPrinted(transaction.id);
    window.print();
  };

  const handleDownloadPdf = async (choice?: 'both' | 'parent' | 'teacher') => {
    setIsDownloading(true);
    try {
      const selected = choice || copyChoice;
      const doc = generatePibgReceiptPdf({
        transaction,
        config,
        copyChoice: selected,
        isReprint: transaction.printCount > 1,
      });
      await markReceiptPrinted(transaction.id);
      const repName = (transaction.pibgRepresentativeStudentName || transaction.studentName).replace(/\s+/g, '_');
      const safeReceipt = transaction.receiptNumber.replace(/[\/\\:]/g, '-');
      doc.save(`Resit_PIBG_${safeReceipt}_${repName}_${selected}.pdf`);
    } catch (err) {
      console.error('Error generating PIBG receipt PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-none print:max-h-none print:h-auto">
        
        {/* Top Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                Resit Rasmi Sumbangan PIBG (Keluarga)
              </h2>
              <p className="text-[11px] text-slate-400">
                No. Resit: <span className="font-mono text-emerald-400 font-bold">{transaction.receiptNumber}</span> • Pautan Satu Keluarga
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenStandardReceipt && (
              <button
                onClick={() => onOpenStandardReceipt(transaction)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
                title="Papar resit penuh butiran yuran lain"
              >
                Lihat Resit Standard
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar / Copy Selector */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 print:hidden shrink-0">
          {/* Copy Selector Tabs */}
          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-300 text-xs">
            <button
              type="button"
              onClick={() => setCopyChoice('both')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                copyChoice === 'both'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kedua-dua Salinan (A4 Berkembar)</span>
            </button>
            <button
              type="button"
              onClick={() => setCopyChoice('parent')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                copyChoice === 'parent'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Salinan Ibu Bapa
            </button>
            <button
              type="button"
              onClick={() => setCopyChoice('teacher')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                copyChoice === 'teacher'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Salinan Guru
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Resit PIBG</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadPdf()}
              disabled={isDownloading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Menjana PDF...' : 'Muat Turun PDF'}</span>
            </button>
          </div>
        </div>

        {/* Printable & Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/50 print:bg-white print:p-0 print:overflow-visible">
          <div className="max-w-3xl mx-auto space-y-4 print:space-y-0 print:max-w-none">
            {copyChoice === 'both' ? (
              <>
                {/* Salinan Guru (Upper) */}
                <SinglePibgReceiptBlock
                  copyTitle="SALINAN SIMPANAN GURU"
                  transaction={transaction}
                  config={config}
                />

                {/* Cutting Line Divider */}
                <div className="flex items-center justify-center space-x-2 py-2 print:py-4 text-slate-400">
                  <div className="flex-1 border-t-2 border-dashed border-slate-400"></div>
                  <div className="flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-300">
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Keratan Salinan Guru & Salinan Ibu Bapa</span>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-slate-400"></div>
                </div>

                {/* Salinan Ibu Bapa (Lower) */}
                <SinglePibgReceiptBlock
                  copyTitle="SALINAN IBU BAPA / PENJAGA"
                  transaction={transaction}
                  config={config}
                />
              </>
            ) : copyChoice === 'parent' ? (
              <SinglePibgReceiptBlock
                copyTitle="SALINAN IBU BAPA / PENJAGA"
                transaction={transaction}
                config={config}
              />
            ) : (
              <SinglePibgReceiptBlock
                copyTitle="SALINAN SIMPANAN GURU"
                transaction={transaction}
                config={config}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
