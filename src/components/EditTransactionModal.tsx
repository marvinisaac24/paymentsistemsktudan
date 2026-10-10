import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, PaymentMethod } from '../types';
import { useApp } from '../context/AppContext';
import { formatRM } from '../utils/currency';
import {
  Edit3,
  X,
  Save,
  AlertCircle,
  CheckSquare,
  Square,
  CreditCard,
  User,
  Phone,
  FileText,
  Trash2,
  Camera,
  CheckCircle2,
  Coins,
} from 'lucide-react';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSuccess?: (updatedTransaction: Transaction) => void;
  onOpenCancelModal?: (transaction: Transaction) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSuccess,
  onOpenCancelModal,
}) => {
  const { feeItems, updateTransaction, transactions } = useApp();

  const [payerName, setPayerName] = useState(() => transaction?.payerName || '');
  const [payerPhone, setPayerPhone] = useState(() => transaction?.payerPhone || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => transaction?.paymentMethod || 'Tunai');
  const [referenceNumber, setReferenceNumber] = useState(() => transaction?.referenceNumber || '');
  const [notes, setNotes] = useState(() => transaction?.notes || '');
  const [amountTenderedInput, setAmountTenderedInput] = useState(() => {
    if (!transaction) return '0.00';
    if (transaction.amountTenderedCents !== undefined) {
      return (transaction.amountTenderedCents / 100).toFixed(2);
    }
    if (transaction.totalAmountCents !== undefined) {
      return (transaction.totalAmountCents / 100).toFixed(2);
    }
    return '0.00';
  });
  const [isChangeReturned, setIsChangeReturned] = useState(() => transaction?.changeReturnedStatus !== 'Belum Dipulangkan');
  
  // Selected items with custom payment amounts in cents
  const [selectedItemAmounts, setSelectedItemAmounts] = useState<Record<string, number>>(() => {
    const initialMap: Record<string, number> = {};
    for (const it of transaction?.items || []) {
      if (it?.feeItemId) {
        initialMap[it.feeItemId] = it.currentPaymentCents || 0;
      }
      const matchingFeeItem = feeItems.find(
        (f) =>
          f.id === it?.feeItemId ||
          (it?.feeItemName && f.name.toLowerCase() === it.feeItemName.toLowerCase()) ||
          (it?.feeItemName && f.name.toLowerCase().includes('5r') && it.feeItemName.toLowerCase().includes('5r')) ||
          (it?.feeItemName && f.name.toLowerCase().includes('8r') && it.feeItemName.toLowerCase().includes('8r')) ||
          (it?.feeItemName && f.name.toLowerCase().includes('panorama') && it.feeItemName.toLowerCase().includes('panorama'))
      );
      if (matchingFeeItem) {
        initialMap[matchingFeeItem.id] = it.currentPaymentCents || matchingFeeItem.amountCents;
      }
    }
    return initialMap;
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // When modal opens or transaction changes, populate initial data
  useEffect(() => {
    if (transaction) {
      setPayerName(transaction.payerName || '');
      setPayerPhone(transaction.payerPhone || '');
      setPaymentMethod(transaction.paymentMethod || 'Tunai');
      setReferenceNumber(transaction.referenceNumber || '');
      setNotes(transaction.notes || '');

      if (transaction.amountTenderedCents !== undefined) {
        setAmountTenderedInput((transaction.amountTenderedCents / 100).toFixed(2));
      } else if (transaction.totalAmountCents !== undefined) {
        setAmountTenderedInput((transaction.totalAmountCents / 100).toFixed(2));
      } else {
        setAmountTenderedInput('0.00');
      }
      setIsChangeReturned(transaction.changeReturnedStatus !== 'Belum Dipulangkan');

      const initialMap: Record<string, number> = {};
      for (const it of transaction.items || []) {
        if (it?.feeItemId) {
          initialMap[it.feeItemId] = it.currentPaymentCents || 0;
        }
        const matchingFeeItem = feeItems.find(
          (f) =>
            f.id === it?.feeItemId ||
            (it?.feeItemName && f.name.toLowerCase() === it.feeItemName.toLowerCase()) ||
            (it?.feeItemName && f.name.toLowerCase().includes('5r') && it.feeItemName.toLowerCase().includes('5r')) ||
            (it?.feeItemName && f.name.toLowerCase().includes('8r') && it.feeItemName.toLowerCase().includes('8r')) ||
            (it?.feeItemName && f.name.toLowerCase().includes('panorama') && it.feeItemName.toLowerCase().includes('panorama'))
        );
        if (matchingFeeItem) {
          initialMap[matchingFeeItem.id] = it.currentPaymentCents || matchingFeeItem.amountCents;
        }
      }
      setSelectedItemAmounts(initialMap);
      setErrorMessage('');
    }
  }, [transaction, feeItems]);

  // Compute other payments for this student excluding this transaction
  const otherPaidMap = useMemo(() => {
    if (!transaction) return new Map<string, number>();
    const otherValidTxs = (transactions || []).filter(
      (t) => t.studentId === transaction.studentId && t.status === 'Sah' && t.id !== transaction.id
    );
    const map = new Map<string, number>();
    for (const tx of otherValidTxs) {
      for (const it of tx.items || []) {
        if (it?.feeItemId) {
          map.set(it.feeItemId, (map.get(it.feeItemId) || 0) + (it.currentPaymentCents || 0));
        }
      }
    }
    return map;
  }, [transaction, transactions]);

  // Total amount calculated dynamically
  const totalAmountCents = Object.values(selectedItemAmounts).reduce((acc, v) => acc + (v || 0), 0);

  // Ruang Pengiraan Wang Tunai & Baki Bayaran Perlu Dikembalikan Kepada Murid
  const effectiveTenderedCents = (() => {
    if (paymentMethod !== 'Tunai') return totalAmountCents;
    if (!amountTenderedInput || amountTenderedInput.trim() === '') {
      return totalAmountCents;
    }
    const parsed = parseFloat(amountTenderedInput);
    return isNaN(parsed) ? totalAmountCents : Math.round(parsed * 100);
  })();

  const changeReturnedCents =
    paymentMethod !== 'Tunai'
      ? 0
      : Math.max(0, effectiveTenderedCents - totalAmountCents);

  const isUnderpaid =
    paymentMethod === 'Tunai' &&
    amountTenderedInput.trim() !== '' &&
    effectiveTenderedCents < totalAmountCents;

  // Group fee items: Photo items vs standard items (Safely handle names and codes)
  const isPhotoItemDef = (f: { name?: string; code?: string }) => {
    const n = (f.name || '').toLowerCase();
    const c = (f.code || '').toUpperCase();
    return (
      n.includes('gambar') ||
      n.includes('5r') ||
      n.includes('8r') ||
      n.includes('panorama') ||
      c === 'G5R' ||
      c === 'G8R' ||
      c === 'GPN'
    );
  };

  const photoItems = feeItems.filter((f) => f.active && isPhotoItemDef(f));
  const otherFeeItems = feeItems.filter((f) => f.active && !isPhotoItemDef(f));

  const isPhotoTx = !!(transaction?.items || []).some((it) => isPhotoItemDef({ name: it.feeItemName }));

  const hasOtherItems = !!(transaction?.items || []).some((it) => !isPhotoItemDef({ name: it.feeItemName }));

  const handleToggleItem = (itemId: string, defaultAmountCents: number) => {
    setSelectedItemAmounts((prev) => {
      const next = { ...prev };
      if (next[itemId] !== undefined && next[itemId] > 0) {
        delete next[itemId];
      } else {
        // Calculate maximum remaining for this item
        const otherPaid = otherPaidMap.get(itemId) || 0;
        const maxRemain = Math.max(0, defaultAmountCents - otherPaid);
        next[itemId] = maxRemain > 0 ? maxRemain : defaultAmountCents;
      }
      return next;
    });
  };

  const handleAmountChange = (itemId: string, valueStr: string, maxCents: number) => {
    const parsed = parseFloat(valueStr);
    const cents = isNaN(parsed) ? 0 : Math.round(parsed * 100);
    setSelectedItemAmounts((prev) => ({
      ...prev,
      [itemId]: Math.max(0, cents),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    if (!payerName.trim()) {
      setErrorMessage('Sila masukkan nama pembayar (ibu bapa / penjaga).');
      return;
    }

    if (paymentMethod === 'Pindahan Bank' && !referenceNumber.trim()) {
      setErrorMessage('Sila masukkan nombor rujukan bagi pembayaran Pindahan Bank.');
      return;
    }

    const itemsToSubmit = Object.entries(selectedItemAmounts)
      .filter(([_, cents]) => cents > 0)
      .map(([feeItemId, currentPaymentCents]) => ({
        feeItemId,
        currentPaymentCents,
      }));

    if (itemsToSubmit.length === 0) {
      setErrorMessage('Sila pilih sekurang-kurangnya satu item bayaran yang mempunyai amaun melebihi RM0.');
      return;
    }

    if (paymentMethod === 'Tunai' && isUnderpaid) {
      setErrorMessage(
        `Wang tunai diterima (RM${(effectiveTenderedCents / 100).toFixed(2)}) kurang sebanyak RM${(
          (totalAmountCents - effectiveTenderedCents) /
          100
        ).toFixed(2)} daripada jumlah bayaran resit ini.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await updateTransaction(transaction.id, {
        payerName: payerName.trim(),
        payerPhone: payerPhone.trim(),
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
        amountTenderedCents: effectiveTenderedCents,
        changeReturnedCents: changeReturnedCents,
        changeReturnedStatus:
          changeReturnedCents > 0
            ? isChangeReturned
              ? 'Sudah Dipulangkan'
              : 'Belum Dipulangkan'
            : 'Tiada Baki',
        items: itemsToSubmit,
      });

      if (!res.success || !res.transaction) {
        setErrorMessage(res.error || 'Gagal mengemas kini bayaran.');
        setIsSubmitting(false);
        return;
      }

      onSuccess?.(res.transaction);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Ralat berlaku semasa menghubungi server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {isPhotoTx ? 'Kemas Kini / Edit Maklumat Gambar & Bayaran' : 'Kemas Kini / Edit Resit Bayaran'}
                </h3>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold font-mono">
                  {transaction.receiptNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isPhotoTx
                  ? 'Betulkan maklumat jika tersalah isi pilihan gambar (5R, 8R, Panorama), nama pembayar, atau kaedah bayaran.'
                  : 'Betulkan butiran item yuran/keperluan persekolahan, nama pembayar, atau kaedah bayaran.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Student Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Murid Terlibat</span>
              <h4 className="text-base font-black text-slate-900">{transaction.studentName}</h4>
              <div className="flex items-center space-x-2 text-xs text-slate-500 pt-0.5">
                <span>Kelas: <strong className="text-slate-800">{transaction.studentClass}</strong></span>
                <span>• Sesi: <strong className="text-slate-800">{transaction.schoolYear}</strong></span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Tarikh Resit Asal</span>
              <span className="text-xs font-semibold text-slate-700 font-mono">{transaction.timestampMalaysia}</span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 1: PILIHAN GAMBAR & ITEM BAYARAN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>{isPhotoTx ? 'Pilihan Jenis Gambar (Tandakan / Edit Jika Tersalah):' : 'Item Gambar (Pilihan):'}</span>
              </label>
              <span className="text-[11px] text-slate-400">Klik untuk pilih atau tukar</span>
            </div>

            {/* Photo Items Selector */}
            <div className="grid grid-cols-1 gap-2.5">
              {photoItems.map((item) => {
                const isSelected = selectedItemAmounts[item.id] !== undefined && selectedItemAmounts[item.id] > 0;
                const currentAmt = selectedItemAmounts[item.id] || 0;
                const otherPaid = otherPaidMap.get(item.id) || 0;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border-2 transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      onClick={() => handleToggleItem(item.id, item.amountCents)}
                      className="flex items-center space-x-3 cursor-pointer flex-1 select-none"
                    >
                      <div className="text-emerald-600">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-black text-slate-900 block">{item.name}</span>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                          <span>Kadar: <strong>{formatRM(item.amountCents)}</strong></span>
                          {otherPaid > 0 && (
                            <span className="text-emerald-700 font-semibold">• Dibayar resit lain: {formatRM(otherPaid)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pl-3 shrink-0">
                      <span className="text-xs font-bold text-slate-400">RM</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={item.amountCents / 100}
                        value={(currentAmt / 100).toFixed(2)}
                        disabled={!isSelected}
                        onChange={(e) => handleAmountChange(item.id, e.target.value, item.amountCents)}
                        className={`w-24 text-right font-mono font-bold text-sm px-2.5 py-1.5 rounded-xl border transition ${
                          isSelected
                            ? 'bg-white border-emerald-400 text-slate-900 focus:ring-2 focus:ring-emerald-400 focus:outline-hidden'
                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Other items accordion / toggle if applicable */}
            {otherFeeItems.length > 0 && (
              <details
                open={hasOtherItems || !isPhotoTx}
                className="mt-3 group border border-slate-200 rounded-2xl p-3 bg-slate-50"
              >
                <summary className="text-xs font-bold text-slate-700 cursor-pointer list-none flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Item Yuran & Keperluan Persekolahan ({otherFeeItems.length} perkara):</span>
                  </span>
                  <span className="text-[10px] text-indigo-600 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 space-y-2 pt-2 border-t border-slate-200">
                  {otherFeeItems.map((item) => {
                    const isSelected = selectedItemAmounts[item.id] !== undefined && selectedItemAmounts[item.id] > 0;
                    const currentAmt = selectedItemAmounts[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          isSelected ? 'bg-white border-indigo-400' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div
                          onClick={() => handleToggleItem(item.id, item.amountCents)}
                          className="flex items-center space-x-2 cursor-pointer flex-1"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="font-semibold text-slate-800">{item.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] text-slate-400">RM</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={(currentAmt / 100).toFixed(2)}
                            disabled={!isSelected}
                            onChange={(e) => handleAmountChange(item.id, e.target.value, item.amountCents)}
                            className="w-20 text-right font-mono text-xs px-2 py-1 rounded-lg border border-slate-300 disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          {/* Real-time Total Bar */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Jumlah Baharu Resit Ini:
              </span>
              <span className="text-[10px] text-slate-300">
                {Object.values(selectedItemAmounts).filter((v) => v > 0).length} item dipilih
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                {formatRM(totalAmountCents)}
              </span>
              {totalAmountCents !== transaction.totalAmountCents && (
                <span className="text-[10px] text-amber-300 block">
                  (Asal: {formatRM(transaction.totalAmountCents)})
                </span>
              )}
            </div>
          </div>

          {/* SECTION 2: MAKLUMAT PEMBAYAR & KAEDAH BAYARAN */}
          <div className="space-y-4 pt-1 border-t border-slate-100">
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Maklumat Pembayar & Cara Pembayaran:</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nama Pembayar (Ibu Bapa / Penjaga) <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Contoh: Radzi bin Othman"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>No Telefon Pembayar (Pilihan)</span>
                </label>
                <input
                  type="text"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  placeholder="Contoh: 012-3456789"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kaedah Pembayaran <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Tunai', 'Pindahan Bank', 'Cek', 'QR DuitNow'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nombor Rujukan {paymentMethod === 'Pindahan Bank' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={paymentMethod === 'Tunai' ? 'Tidak wajib (cth: -)' : 'No Transaksi / Resit Bank'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Catatan / Alasan Pembetulan (Pilihan)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Pembetulan jenis gambar daripada 5R kepada 8R atas permintaan penjaga"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* DEDICATED SECTION: RUANG BAKI BAYARAN PERLU DIKEMBALIKAN KEPADA MURID */}
            {paymentMethod === 'Tunai' && (
              <div className="bg-gradient-to-r from-amber-50/90 via-emerald-50/90 to-teal-50/90 border-2 border-emerald-300 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                      <Coins className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-900">
                        Ruang Baki Bayaran Perlu Dikembalikan Kepada Murid
                      </h5>
                      <p className="text-[10px] text-slate-600">
                        Kemas kini amaun wang tunai diterima dan semak baki wang yang perlu dipulangkan kepada murid.
                      </p>
                    </div>
                  </div>
                  {changeReturnedCents > 0 && (
                    <span className="text-[11px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg">
                      Baki: RM {(changeReturnedCents / 100).toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                      <span>Wang Tunai Diterima / Dihulur (RM):</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Perlu: <strong>{formatRM(totalAmountCents)}</strong>
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono text-xs">RM</span>
                      <input
                        type="text"
                        value={amountTenderedInput}
                        onChange={(e) => {
                          setAmountTenderedInput(e.target.value.replace(/[^0-9.]/g, ''));
                          setErrorMessage('');
                        }}
                        placeholder={(totalAmountCents / 100).toFixed(2)}
                        className="w-full pl-9 pr-2 py-1.5 text-sm font-mono font-black rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Quick Buttons */}
                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setAmountTenderedInput((totalAmountCents / 100).toFixed(2))}
                        className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded font-bold border border-emerald-300 cursor-pointer"
                      >
                        Genap
                      </button>
                      {[10, 20, 50, 100].map((note) => (
                        <button
                          key={note}
                          type="button"
                          onClick={() => setAmountTenderedInput(note.toFixed(2))}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold border border-slate-300 cursor-pointer"
                        >
                          RM{note}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200 flex flex-col justify-between">
                    <div>
                      {changeReturnedCents > 0 ? (
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg p-2.5 text-center shadow-xs">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-100 block">
                            💰 Baki Perlu Dikembalikan Kepada Murid:
                          </span>
                          <span className="text-xl font-black font-mono">
                            RM {(changeReturnedCents / 100).toFixed(2)}
                          </span>
                        </div>
                      ) : isUnderpaid ? (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-2 text-xs">
                          ⚠️ Kurang RM {((totalAmountCents - effectiveTenderedCents) / 100).toFixed(2)}
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-lg p-2 text-center text-xs">
                          ✓ Bayaran Genap (Tiada baki perlu dipulangkan)
                        </div>
                      )}
                    </div>

                    {changeReturnedCents > 0 && (
                      <div className="pt-2 mt-2 border-t border-slate-100 text-[10px]">
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChangeReturned}
                            onChange={(e) => setIsChangeReturned(e.target.checked)}
                            className="rounded text-emerald-600 w-3.5 h-3.5"
                          />
                          <span className="font-semibold text-slate-700">
                            {isChangeReturned ? '✓ Baki telah diserahkan serta-merta' : '⏳ Baki belum serah (Baki tertunggak)'}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            {onOpenCancelModal ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCancelModal(transaction);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-600 hover:text-white text-xs text-red-700 font-bold border border-red-200 transition cursor-pointer"
                title="Padam rekod atau batalkan bayaran jika tersalah daftar sepenuhnya"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Padam / Batal Bayaran Ini</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Pembetulan'}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
