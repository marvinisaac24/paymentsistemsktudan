import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Student, PaymentMethod, Transaction } from '../types';
import { formatRM, rmToCents, centsToRM, maskMyKid } from '../utils/currency';
import {
  CreditCard,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  FileText,
  Search,
} from 'lucide-react';

interface PaymentModalProps {
  initialStudentId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (transaction: Transaction) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  initialStudentId,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const { students, feeItems, getStudentSummary, recordPayment, updateStudentOptOutItems, currentUser } = useApp();

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('');
  const [payerPhone, setPayerPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Map of feeItemId -> currentPaymentInput (string for smooth typing)
  const [itemInputs, setItemInputs] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize selected student
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    } else if (students.length > 0 && !selectedStudentId) {
      // Pick first student with pending balance
      const pending = students.find((s) => {
        const sum = getStudentSummary(s.id);
        return sum && sum.balanceCents > 0;
      });
      setSelectedStudentId(pending ? pending.id : students[0].id);
    }
  }, [initialStudentId, students, isOpen]);

  // When selected student changes, populate payer and reset inputs
  const currentSummary = useMemo(() => {
    if (!selectedStudentId) return null;
    return getStudentSummary(selectedStudentId);
  }, [selectedStudentId, getStudentSummary]);

  useEffect(() => {
    if (currentSummary) {
      setPayerName(currentSummary.student.parentName || '');
      setPayerPhone(currentSummary.student.parentPhone || '');
      setItemInputs({});
      setErrorMsg('');
    }
  }, [selectedStudentId]);

  if (!isOpen) return null;

  // Filter students for search dropdown
  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q) ||
      (s.myKid && s.myKid.includes(q))
    );
  });

  const handleInputChange = (feeItemId: string, val: string) => {
    // Allow numbers and decimal point only
    const sanitized = val.replace(/[^0-9.]/g, '');
    setItemInputs((prev) => ({ ...prev, [feeItemId]: sanitized }));
    setErrorMsg('');
  };

  // Quick Action: Bayar Penuh Semua Baki
  const handlePayAllBalance = () => {
    if (!currentSummary) return;
    const newInputs: Record<string, string> = {};
    for (const item of currentSummary.itemBalances) {
      if (item.remainingCents > 0) {
        newInputs[item.feeItemId] = (item.remainingCents / 100).toFixed(2);
      }
    }
    setItemInputs(newInputs);
    setErrorMsg('');
  };

  // Quick Action: Kosongkan Semua
  const handleClearInputs = () => {
    setItemInputs({});
    setErrorMsg('');
  };

  // Quick Action: Bayar Satu Item Penuh
  const handlePayItemFull = (feeItemId: string, remainingCents: number) => {
    setItemInputs((prev) => ({
      ...prev,
      [feeItemId]: (remainingCents / 100).toFixed(2),
    }));
    setErrorMsg('');
  };

  // Calculate live totals
  let totalCurrentPaymentCents = 0;
  const validationErrors: string[] = [];

  if (currentSummary) {
    for (const item of currentSummary.itemBalances) {
      const inputVal = itemInputs[item.feeItemId];
      if (inputVal && inputVal.trim() !== '') {
        const payCents = rmToCents(inputVal);
        if (payCents > 0) {
          totalCurrentPaymentCents += payCents;
          if (payCents > item.remainingCents) {
            validationErrors.push(
              `"${item.feeItemName}" melebihi baki! (Bayaran: RM${(payCents / 100).toFixed(2)}, Baki: RM${(item.remainingCents / 100).toFixed(2)})`
            );
          }
        }
      }
    }
  }

  const remainingAfterPaymentCents = currentSummary
    ? Math.max(0, currentSummary.balanceCents - totalCurrentPaymentCents)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSummary) return;

    if (totalCurrentPaymentCents <= 0) {
      setErrorMsg('Sila masukkan amaun bayaran untuk sekurang-kurangnya satu perkara.');
      return;
    }

    if (validationErrors.length > 0) {
      setErrorMsg(validationErrors[0]);
      return;
    }

    if (paymentMethod === 'Pindahan Bank' && !referenceNumber.trim()) {
      setErrorMsg('Sila masukkan nombor rujukan bagi bayaran Pindahan Bank.');
      return;
    }

    // Prepare allocations
    const itemsPayload = currentSummary.itemBalances
      .filter((item) => {
        const inputVal = itemInputs[item.feeItemId];
        return inputVal && rmToCents(inputVal) > 0;
      })
      .map((item) => ({
        feeItemId: item.feeItemId,
        currentPaymentCents: rmToCents(itemInputs[item.feeItemId]),
      }));

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const result = await recordPayment({
        studentId: currentSummary.student.id,
        payerName: payerName.trim() || currentSummary.student.parentName || 'Ibu Bapa / Penjaga',
        payerPhone: payerPhone.trim() || currentSummary.student.parentPhone,
        items: itemsPayload,
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
      });

      if (!result.success || !result.transaction) {
        setErrorMsg(result.error || 'Gagal merekod bayaran.');
        setIsSubmitting(false);
        return;
      }

      onClose();
      onPaymentSuccess(result.transaction);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ralat berlaku semasa memproses bayaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Rekod Penerimaan Bayaran Yuran & Keperluan
              </h2>
              <p className="text-xs text-slate-400">
                Pilih murid, peruntukkan amaun mengikut perkara, dan jana resit rasmi dua halaman
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Error Banner */}
          {(errorMsg || validationErrors.length > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Sila semak maklumat bayaran:</p>
                <p>{errorMsg || validationErrors[0]}</p>
              </div>
            </div>
          )}

          {/* Student Selector Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Pilih Murid Tahun 3:
                </label>
                <div className="relative w-full sm:w-80">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.className})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentSummary && (
                <div className="flex items-center space-x-3 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-500 block">Status Semasa:</span>
                    <span
                      className={`inline-block font-bold px-2 py-0.5 rounded text-[11px] ${
                        currentSummary.status === 'Selesai'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentSummary.status === 'Bayar Sebahagian'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {currentSummary.status}
                    </span>
                  </div>
                  <div className="border-l border-slate-200 pl-3">
                    <span className="text-slate-500 block">Telah Dibayar:</span>
                    <span className="font-mono font-bold text-slate-900">{formatRM(currentSummary.paidCents)}</span>
                  </div>
                  <div className="border-l border-slate-200 pl-3">
                    <span className="text-slate-500 block">Baki Perlu:</span>
                    <span className="font-mono font-bold text-amber-700">{formatRM(currentSummary.balanceCents)}</span>
                  </div>
                </div>
              )}
            </div>

            {currentSummary && (
              <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400">No. MyKid: </span>
                  <span className="font-mono font-medium">
                    {maskMyKid(currentSummary.student.myKid, currentUser.role === 'Pentadbir')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Penjaga: </span>
                  <span className="font-medium">{currentSummary.student.parentName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Telefon: </span>
                  <span className="font-medium">{currentSummary.student.parentPhone || '-'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Fee Items Allocation Table */}
          <div>
            {/* Optional Items Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-start space-x-2 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Keperluan Bukan Wajib: </span>
                Semua butiran keperluan Tahun 3 adalah pilihan bergantung kepada persetujuan ibu bapa / penjaga. Rekodkan bayaran bagi butiran yang dipersetujui sahaja. Butiran yang sudah dimiliki boleh ditandakan sebagai <em>Sedia Ada</em>.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-800">
                  Peruntukan Bayaran Mengikut Perkara (11 Perkara Pilihan):
                </h3>
                <span className="text-xs text-slate-500">
                  (Jumlah Keseluruhan Jika Ambil Semua: <strong>RM133.00</strong>)
                </span>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePayAllBalance}
                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-md border border-emerald-200 transition cursor-pointer flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bayar Penuh Baki Dipilih</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!currentSummary) return;
                    // Mark all currently unpaid items as opt-out (Sedia Ada / Tidak Perlu)
                    const unpaidIds = currentSummary.itemBalances
                      .filter((b) => b.remainingCents > 0)
                      .map((b) => b.feeItemId);
                    const currentOptOuts = currentSummary.student.optOutItemIds || [];
                    const merged = Array.from(new Set([...currentOptOuts, ...unpaidIds]));
                    await updateStudentOptOutItems(currentSummary.student.id, merged);
                  }}
                  className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium px-2 py-1 rounded-md border border-amber-200 transition cursor-pointer"
                  title="Tandakan semua butiran yang belum dibayar sebagai sedia ada / tidak diperlukan oleh ibu bapa"
                >
                  Tanda Baki Sedia Ada
                </button>
                <button
                  type="button"
                  onClick={handleClearInputs}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2 py-1 rounded-md border border-slate-300 transition cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Bil.</th>
                      <th className="py-2.5 px-3">Perkara / Butiran</th>
                      <th className="py-2.5 px-3 text-right">Kadar (RM)</th>
                      <th className="py-2.5 px-3 text-right">Telah Bayar</th>
                      <th className="py-2.5 px-3 text-right">Baki Item</th>
                      <th className="py-2.5 px-3 text-right w-44 bg-emerald-50 font-black text-slate-900">
                        Bayaran Semasa (RM)
                      </th>
                      <th className="py-2.5 px-2 text-center w-16">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentSummary?.itemBalances.map((item, idx) => {
                      const inputVal = itemInputs[item.feeItemId] || '';
                      const payCents = rmToCents(inputVal);
                      const isOver = payCents > item.remainingCents;
                      const isFull = item.remainingCents === 0;

                      return (
                        <tr
                          key={item.feeItemId}
                          className={`${
                            isFull
                              ? 'bg-slate-50/60 opacity-75'
                              : payCents > 0
                              ? 'bg-emerald-50/40'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {item.feeItemName}
                            {item.isOptedOut && (
                              <span className="ml-2 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium border border-slate-300">
                                Sedia Ada / Tidak Ambil
                              </span>
                            )}
                            {item.paidCents >= item.rateCents && (
                              <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                Selesai
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {formatRM(item.rateCents).replace('RM', '')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {formatRM(item.paidCents).replace('RM', '')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {item.remainingCents === 0 ? (
                              <span className="text-emerald-700">0.00</span>
                            ) : (
                              <span className="text-amber-800">{formatRM(item.remainingCents).replace('RM', '')}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 bg-emerald-50/30 text-right">
                            <div className="relative inline-block w-full max-w-[140px]">
                              <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono text-xs">RM</span>
                              <input
                                type="text"
                                disabled={isFull}
                                value={inputVal}
                                onChange={(e) => handleInputChange(item.feeItemId, e.target.value)}
                                placeholder="0.00"
                                className={`w-full pl-8 pr-2.5 py-1 text-right font-mono font-bold text-xs rounded border transition focus:outline-hidden ${
                                  isOver
                                    ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-400'
                                    : payCents > 0
                                    ? 'border-emerald-500 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-400 font-black'
                                    : 'border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-emerald-400'
                                } disabled:bg-slate-100 disabled:text-slate-400`}
                              />
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {!isFull && (
                              <button
                                type="button"
                                onClick={() => handlePayItemFull(item.feeItemId, item.remainingCents)}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-200 hover:bg-emerald-600 hover:text-white text-slate-700 font-bold transition cursor-pointer"
                              >
                                Penuh
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payment Details & Payer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Maklumat Pembayar:</span>
              </h4>

              <div>
                <label className="text-xs text-slate-600 block mb-1">Nama Pembayar / Penjaga:</label>
                <input
                  type="text"
                  required
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Contoh: Encik Radzi bin Ismail"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 block mb-1">No. Telefon Penjaga (Pilihan):</label>
                <input
                  type="text"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  placeholder="Contoh: 013-8821943"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kaedah Pembayaran:</span>
              </h4>

              <div>
                <label className="text-xs text-slate-600 block mb-1">Pilih Kaedah:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Tunai', 'Pindahan Bank', 'Lain-lain'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'Pindahan Bank' && (
                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-semibold text-emerald-800">
                    No. Rujukan Pindahan Bank (Wajib):
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Contoh: MBB2026092812345"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-600 block mb-1">Catatan Tambahan (Pilihan):</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Bayaran ansuran pertama baju gerko"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Live Summary Bar */}
          <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider">
                  Jumlah Bayaran Resit Ini:
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {formatRM(totalCurrentPaymentCents)}
                </span>
              </div>
              <div className="border-l border-slate-700 pl-4">
                <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider">
                  Baki Selepas Bayaran Ini:
                </span>
                <span className={`text-base font-bold font-mono ${remainingAfterPaymentCents === 0 ? 'text-emerald-300' : 'text-amber-400'}`}>
                  {remainingAfterPaymentCents === 0 ? 'RM 0.00 (SELESAI)' : formatRM(remainingAfterPaymentCents)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || totalCurrentPaymentCents <= 0 || validationErrors.length > 0}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center space-x-2"
              >
                <span>{isSubmitting ? 'Memproses...' : 'Sahkan & Jana Resit Rasmi'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
