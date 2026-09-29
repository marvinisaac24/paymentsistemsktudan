import React, { useState } from 'react';
import { Transaction } from '../types';
import { useApp } from '../context/AppContext';
import { formatRM } from '../utils/currency';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface CancelTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CancelTransactionModal: React.FC<CancelTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const { cancelTransaction, currentUser } = useApp();
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMsg('Sila nyatakan sebab pembatalan yang terperinci (sekurang-kurangnya 5 aksara).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await cancelTransaction(transaction.id, reason.trim());
      if (!res.success) {
        setErrorMsg(res.error || 'Gagal membatalkan transaksi.');
        setIsSubmitting(false);
        return;
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Ralat berlaku semasa pembatalan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-red-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-red-900 text-white px-5 py-4 flex items-center justify-between border-b border-red-800">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-red-300" />
            <h3 className="text-base font-bold text-white">Pembatalan Transaksi Bayaran</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-red-800 text-red-200 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-900 space-y-1">
            <p className="font-bold flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>AMARAN KESELAMATAN & JEJAK AUDIT:</span>
            </p>
            <p>
              Transaksi tidak akan dipadam secara senyap. Rekod ini akan ditandakan sebagai{' '}
              <strong>DIBATALKAN</strong>, baki murid akan diselaraskan semula, dan sebab pembatalan akan direkodkan di dalam Jejak Audit rasmi pentadbiran.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">No. Resit:</span>
              <span className="font-mono font-bold text-slate-900">{transaction.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Nama Murid:</span>
              <span className="font-semibold text-slate-900">{transaction.studentName} ({transaction.studentClass})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Amaun Diterima:</span>
              <span className="font-mono font-bold text-slate-900">{formatRM(transaction.totalAmountCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Direkod Oleh:</span>
              <span>{transaction.recordedBy}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-100 border border-red-300 text-red-900 text-xs rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Sebab Pembatalan / Pelarasan <span className="text-red-600">*</span>:
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Kesilapan kemasukan amaun oleh petugas / Pindahan bank dibatalkan oleh bank pembayar"
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Tindakan ini dilakukan oleh: <strong>{currentUser.name}</strong> ({currentUser.role}).
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 5}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              {isSubmitting ? 'Membatalkan...' : 'Sahkan Pembatalan Transaksi'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
