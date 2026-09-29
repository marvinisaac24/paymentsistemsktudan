import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { useApp } from '../context/AppContext';
import { formatRM } from '../utils/currency';
import { CheckSquare, Square, X, AlertCircle, Sparkles, Check, CheckCircle2 } from 'lucide-react';

interface StudentOptOutModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentOptOutModal: React.FC<StudentOptOutModalProps> = ({
  student,
  isOpen,
  onClose,
}) => {
  const { feeItems, updateStudentOptOutItems } = useApp();
  const [optOutIds, setOptOutIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setOptOutIds(student.optOutItemIds || []);
    } else {
      setOptOutIds([]);
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const activeItems = feeItems.filter((f) => f.active);

  const toggleItem = (itemId: string) => {
    setOptOutIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setOptOutIds([]); // All opted-in (no opt outs)
  };

  const handleOptOutAllUnpaid = () => {
    // Mark all as opted out
    setOptOutIds(activeItems.map((i) => i.id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateStudentOptOutItems(student.id, optOutIds);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const chosenItems = activeItems.filter((it) => !optOutIds.includes(it.id));
  const chosenTotalCents = chosenItems.reduce((acc, it) => acc + it.amountCents, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Pilihan Keperluan Ibu Bapa / Penjaga</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-normal">
                Bukan Wajib
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {student.name} • {student.className}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center space-x-1.5 text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Peringatan Rasmi:</span>
            </p>
            <p>
              Semua butiran keperluan adalah <strong>pilihan (bukan wajib)</strong> bergantung kepada persetujuan ibu bapa. Jika murid sudah memiliki barangan (cth. Tali leher/baju dari tahun lepas atau abang/kakak) atau memilih tidak membeli, nyahtandakan pilihan tersebut supaya baki tertunggak murid diselaraskan dengan adil.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Jumlah Perlu Dibayar Berdasarkan Pilihan: <strong className="font-mono text-emerald-800 text-sm">{formatRM(chosenTotalCents)}</strong> ({chosenItems.length} daripada {activeItems.length} perkara)
            </div>
            <div className="space-x-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-semibold cursor-pointer"
              >
                Pilih Semua
              </button>
            </div>
          </div>

          {/* Items selection list */}
          <div className="space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
            {activeItems.map((item, idx) => {
              const isOptedOut = optOutIds.includes(item.id);
              const isSelected = !isOptedOut;

              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-white border-emerald-300 shadow-xs text-slate-900'
                      : 'bg-slate-100/70 border-slate-200 text-slate-400 opacity-80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                      isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className={`font-semibold block ${isSelected ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                        {idx + 1}. {item.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Kadar Rasmi: {formatRM(item.amountCents)}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isSelected ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Dipersetujui / Beli
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                        Sedia Ada / Tidak Ambil
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Pilihan Ibu Bapa'}
          </button>
        </div>

      </div>
    </div>
  );
};
