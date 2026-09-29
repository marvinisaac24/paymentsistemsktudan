import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

interface BulkDeleteStudentsModalProps {
  selectedStudentIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkDeleteStudentsModal: React.FC<BulkDeleteStudentsModalProps> = ({
  selectedStudentIds,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { students, transactions, deleteStudentsBulk } = useApp();
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || selectedStudentIds.length === 0) return null;

  // Selected student records
  const targetStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  // Determine if any have transactions
  const studentsWithTxs = targetStudents.filter((s) =>
    transactions.some((t) => t.studentId === s.id && t.status === 'Sah')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const finalReason = reason.trim() || 'Pembersihan senarai rekod murid';
      const res = await deleteStudentsBulk(selectedStudentIds, true, finalReason);

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal memadam murid.');
        setIsDeleting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Ralat berlaku semasa pemadaman.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-red-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-red-800 text-white px-5 py-4 flex items-center justify-between border-b border-red-900">
          <div className="flex items-center space-x-2">
            <Trash2 className="w-5 h-5 text-red-200" />
            <h3 className="text-base font-bold text-white">
              Padam {selectedStudentIds.length} Rekod Murid
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-red-700 text-red-200 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-900 space-y-1">
            <p className="font-bold flex items-center space-x-1.5 text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Pengesahan Pemadaman:</span>
            </p>
            <p>
              Adakah anda pasti ingin memadam <strong>{selectedStudentIds.length} orang murid</strong> ini daripada sistem?
              {studentsWithTxs.length > 0 && (
                <span className="block mt-1 font-semibold text-amber-800">
                  * {studentsWithTxs.length} murid mempunyai rekod transaksi/resit. Resit mereka akan dibatalkan secara selamat dalam jejak audit pentadbiran.
                </span>
              )}
            </p>
          </div>

          {/* List Preview (Capped to 8 rows for performance) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Murid Yang Terlibat:
            </label>
            <div className="border border-slate-200 rounded-lg max-h-36 overflow-y-auto p-2 bg-slate-50 text-xs space-y-1">
              {targetStudents.slice(0, 10).map((s, idx) => (
                <div key={s.id} className="flex justify-between items-center py-0.5 text-slate-800">
                  <span className="truncate pr-2 font-medium">
                    {idx + 1}. {s.name} ({s.className})
                  </span>
                </div>
              ))}
              {targetStudents.length > 10 && (
                <div className="text-center py-1 text-slate-500 font-semibold text-[11px] border-t border-slate-200 mt-1">
                  ... dan {targetStudents.length - 10} orang murid lagi
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-100 border border-red-300 text-red-900 text-xs rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          {/* Optional reason */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Catatan / Sebab Pemadaman (Pilihan):
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Pembersihan data murid / Murid bertukar sekolah"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isDeleting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {isDeleting ? 'Sedang Memadam...' : `Sahkan Padam (${selectedStudentIds.length} Murid)`}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
