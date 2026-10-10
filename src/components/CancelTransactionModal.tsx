import React, { useState } from 'react';
import { Transaction } from '../types';
import { useApp } from '../context/AppContext';
import { formatRM } from '../utils/currency';
import { AlertTriangle, X, ShieldAlert, Trash2, Ban, CheckCircle2 } from 'lucide-react';

interface CancelTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CancelTransactionModal: React.FC<CancelTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { cancelTransaction, deleteTransaction, currentUser } = useApp();
  const [actionMode, setActionMode] = useState<'delete' | 'cancel'>('delete');
  const [selectedPresetReason, setSelectedPresetReason] = useState<string>('Tersalah pilih nama murid semasa pendaftaran');
  const [customReason, setCustomReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !transaction) return null;

  const finalReason = selectedPresetReason === 'Lain-lain' 
    ? customReason.trim() 
    : (customReason.trim() ? `${selectedPresetReason} - ${customReason.trim()}` : selectedPresetReason);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalReason || finalReason.length < 3) {
      setErrorMsg('Sila nyatakan sebab pemadaman atau pembatalan.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (actionMode === 'delete') {
        const res = await deleteTransaction(transaction.id, finalReason);
        if (!res.success) {
          setErrorMsg(res.error || 'Gagal memadam rekod bayaran.');
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await cancelTransaction(transaction.id, finalReason);
        if (!res.success) {
          setErrorMsg(res.error || 'Gagal membatalkan transaksi.');
          setIsSubmitting(false);
          return;
        }
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Ralat berlaku semasa pemprosesan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b text-white ${
          actionMode === 'delete' ? 'bg-red-800 border-red-900' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
              actionMode === 'delete' ? 'bg-red-600' : 'bg-slate-700'
            }`}>
              {actionMode === 'delete' ? <Trash2 className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">
                {actionMode === 'delete' ? 'Padam Rekod Pembayaran' : 'Batalkan Transaksi Bayaran'}
              </h3>
              <p className="text-xs text-slate-300">
                {transaction.receiptNumber} • {transaction.studentName}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-slate-100 p-2 flex border-b border-slate-200 gap-1.5">
          <button
            type="button"
            onClick={() => setActionMode('delete')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              actionMode === 'delete'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Padam Pembayaran (Tersalah Daftar)</span>
          </button>

          <button
            type="button"
            onClick={() => setActionMode('cancel')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              actionMode === 'cancel'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Batal Transaksi (Kekal Audit)</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Explanation Alert */}
          {actionMode === 'delete' ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-900 space-y-1.5">
              <p className="font-black flex items-center space-x-1.5 text-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>PADAM TERUS (KESILAPAN PENDAFTARAN):</span>
              </p>
              <p className="leading-relaxed">
                Gunakan pilihan ini jika anda <strong>tersalah mendaftar bayaran</strong> bagi murid yang salah, transaksi ujian, atau bayaran berganda. Rekod pembayaran ini akan <strong>dihapuskan sepenuhnya daripada sistem</strong> dan baki tunggakan murid akan dipulihkan secara automatik.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 space-y-1.5">
              <p className="font-black flex items-center space-x-1.5 text-slate-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>PEMBATALAN TRANSAKSI (JEJAK AUDIT):</span>
              </p>
              <p className="leading-relaxed">
                Transaksi tidak dipadam tetapi ditandakan sebagai <strong>DIBATALKAN</strong> dalam senarai resit untuk rujukan audit sekolah. Baki murid turut diselaraskan semula.
              </p>
            </div>
          )}

          {/* Transaction Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs space-y-2 text-slate-700">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">No. Resit:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {transaction.receiptNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Nama Murid:</span>
              <span className="font-bold text-slate-900">{transaction.studentName} ({transaction.studentClass})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Amaun Bayaran:</span>
              <span className="font-mono font-black text-emerald-700 text-sm">{formatRM(transaction.totalAmountCents)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Kaedah & Rujukan:</span>
              <span className="text-slate-800">{transaction.paymentMethod} {transaction.referenceNumber ? `(${transaction.referenceNumber})` : ''}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-slate-500 font-medium">Item Terlibat:</span>
              <span className="text-slate-800 text-right font-medium">
                {transaction.items.map((it) => it.feeItemName).join(', ')}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-900 text-xs rounded-xl font-bold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 block uppercase tracking-wider">
              Sebab {actionMode === 'delete' ? 'Pemadaman' : 'Pembatalan'} <span className="text-red-600">*</span>:
            </label>
            <select
              value={selectedPresetReason}
              onChange={(e) => setSelectedPresetReason(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-hidden font-medium"
            >
              <option value="Tersalah pilih nama murid semasa pendaftaran">Tersalah pilih nama murid semasa pendaftaran</option>
              <option value="Tersalah daftar pilihan jenis gambar kelas (5R/8R/Panorama)">Tersalah daftar pilihan jenis gambar kelas (5R/8R/Panorama)</option>
              <option value="Tersalah amaun / bayaran berlebihan">Tersalah amaun / bayaran berlebihan</option>
              <option value="Bayaran berganda (Duplicate entry)">Bayaran berganda (Duplicate entry)</option>
              <option value="Transaksi ujian / simulasi pendaftaran">Transaksi ujian / simulasi pendaftaran</option>
              <option value="Ibu bapa membatalkan tempahan / pemulangan bayaran">Ibu bapa membatalkan tempahan / pemulangan bayaran</option>
              <option value="Lain-lain">Lain-lain (Nyatakan di bawah)</option>
            </select>

            <textarea
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Catatan tambahan (pilihan)... Contoh: Pendaftaran tersalah murid bagi kelas 3 Arif."
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
            <p className="text-[10px] text-slate-500">
              Tindakan ini dilakukan oleh: <strong>{currentUser.name}</strong> ({currentUser.role}).
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Batal & Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-white rounded-xl text-xs font-black shadow-md transition active:scale-95 disabled:opacity-40 cursor-pointer flex items-center space-x-1.5 ${
                actionMode === 'delete'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : actionMode === 'delete' ? (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Padam Pembayaran Ini</span>
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5" />
                  <span>Sahkan Pembatalan</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
