import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Transaction } from '../types';
import { formatRM } from '../utils/currency';
import {
  Receipt,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  XCircle,
  Clock,
  User,
} from 'lucide-react';

interface TransactionsViewProps {
  onSelectTransaction: (tx: Transaction) => void;
  onOpenCancelModal: (tx: Transaction) => void;
  onOpenNewPayment: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onSelectTransaction,
  onOpenCancelModal,
  onOpenNewPayment,
}) => {
  const { transactions, currentUser } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [classFilter, setClassFilter] = useState('Semua');

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        tx.receiptNumber.toLowerCase().includes(q) ||
        tx.studentName.toLowerCase().includes(q) ||
        (tx.payerName && tx.payerName.toLowerCase().includes(q)) ||
        (tx.referenceNumber && tx.referenceNumber.toLowerCase().includes(q));

      const matchMethod = methodFilter === 'Semua' || tx.paymentMethod === methodFilter;
      const matchStatus = statusFilter === 'Semua' || tx.status === statusFilter;
      const matchClass = classFilter === 'Semua' || tx.studentClass === classFilter;

      return matchSearch && matchMethod && matchStatus && matchClass;
    });
  }, [transactions, searchQuery, methodFilter, statusFilter, classFilter]);

  // Compute total of filtered transactions
  const filteredTotalCents = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.status === 'Sah')
      .reduce((s, t) => s + t.totalAmountCents, 0);
  }, [filteredTransactions]);

  const handleExportCsv = () => {
    window.location.href = '/api/export/transactions';
  };

  return (
    <div className="space-y-5">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Sejarah Transaksi & Resit Rasmi
          </h1>
          <p className="text-xs text-slate-500">
            {transactions.length} rekod transaksi • Jana semula resit PDF dua halaman atau batalkan transaksi dengan jejak audit
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition cursor-pointer flex items-center space-x-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Eksport CSV</span>
          </button>
          <button
            onClick={onOpenNewPayment}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
          >
            + Rekod Bayaran
          </button>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nombor resit (cth: SKT/T3/2026/0001), nama murid, pembayar, atau no. rujukan..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          
          {/* Method Filters */}
          <div className="flex items-center space-x-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Kaedah:</span>
            {['Semua', 'Tunai', 'Pindahan Bank', 'Lain-lain'].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  methodFilter === m
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Status Filters */}
          <div className="flex items-center space-x-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Status:</span>
            {['Semua', 'Sah', 'Dibatalkan'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === st
                    ? st === 'Dibatalkan'
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Total for current filter */}
          <div className="text-right text-xs">
            <span className="text-slate-500">Jumlah Kutipan Sah (Dipaparkan): </span>
            <span className="font-mono font-black text-slate-900">{formatRM(filteredTotalCents)}</span>
          </div>

        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <p className="font-semibold text-sm">Tiada transaksi sepadan ditemui.</p>
            <p className="text-slate-400 mt-1">Sila laraskan kriteria carian atau penapis anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">No. Resit</th>
                  <th className="py-3 px-3.5">Tarikh & Masa (MYT)</th>
                  <th className="py-3 px-3.5">Murid & Kelas</th>
                  <th className="py-3 px-3.5">Pembayar</th>
                  <th className="py-3 px-3.5">Kaedah</th>
                  <th className="py-3 px-3.5 text-right font-black">Amaun Diterima</th>
                  <th className="py-3 px-3.5">Petugas</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-slate-50 transition ${
                      tx.status === 'Dibatalkan' ? 'bg-red-50/40 text-slate-500' : ''
                    }`}
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {tx.receiptNumber}
                    </td>

                    <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                      {tx.timestampMalaysia || tx.timestamp}
                    </td>

                    <td className="py-3 px-3.5">
                      <span className="font-bold text-slate-900 block">{tx.studentName}</span>
                      <span className="text-[11px] text-slate-500">{tx.studentClass} ({tx.schoolYear})</span>
                    </td>

                    <td className="py-3 px-3.5 text-slate-700">
                      <span>{tx.payerName || '-'}</span>
                      {tx.payerPhone && <span className="block text-[10px] text-slate-400">{tx.payerPhone}</span>}
                    </td>

                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 inline-block">
                        {tx.paymentMethod}
                      </span>
                      {tx.referenceNumber && (
                        <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                          Ref: {tx.referenceNumber}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                      {formatRM(tx.totalAmountCents)}
                    </td>

                    <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                      <span>{tx.recordedBy}</span>
                    </td>

                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      {tx.status === 'Dibatalkan' ? (
                        <div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                            Dibatalkan
                          </span>
                          {tx.cancellationReason && (
                            <span className="block text-[9px] text-red-600 truncate max-w-[120px]" title={tx.cancellationReason}>
                              {tx.cancellationReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Sah
                          </span>
                          {(tx.printCount || 1) > 1 && (
                            <span className="block text-[9px] text-amber-700 font-medium">
                              Cetak #{tx.printCount}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => onSelectTransaction(tx)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-semibold text-[11px] transition cursor-pointer flex items-center space-x-1"
                          title="Papar dan muat turun resit rasmi dua halaman"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Resit PDF</span>
                        </button>

                        {/* Cancellation button (Pentadbir only) */}
                        {currentUser.role === 'Pentadbir' && tx.status !== 'Dibatalkan' && (
                          <button
                            onClick={() => onOpenCancelModal(tx)}
                            className="p-1 rounded bg-slate-100 hover:bg-red-600 hover:text-white text-slate-500 transition cursor-pointer"
                            title="Batal transaksi dengan rekod jejak audit"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
