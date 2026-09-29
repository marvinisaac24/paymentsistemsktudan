import React from 'react';
import { useApp } from '../context/AppContext';
import { formatRM } from '../utils/currency';
import {
  Users,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  PlusCircle,
  FileSpreadsheet,
  Calendar,
  Layers,
} from 'lucide-react';
import { Transaction } from '../types';

interface DashboardViewProps {
  onOpenPayment: (studentId?: string) => void;
  onOpenAddStudent: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenPayment,
  onOpenAddStudent,
  onSelectTransaction,
  onNavigateToTab,
}) => {
  const { stats, feeItems, students, transactions, allStudentSummaries, config } = useApp();

  // Active items sum (RM133.00)
  const totalItemRateCents = feeItems
    .filter((f) => f.active)
    .reduce((s, it) => s + it.amountCents, 0);

  // Group students by class
  const classBreakdown = React.useMemo(() => {
    const map = new Map<string, { total: number; paid: number; completed: number }>();
    for (const item of allStudentSummaries) {
      const cls = item.student.className;
      const cur = map.get(cls) || { total: 0, paid: 0, completed: 0 };
      cur.total += 1;
      cur.paid += item.paidCents;
      if (item.status === 'Selesai') cur.completed += 1;
      map.set(cls, cur);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allStudentSummaries]);

  // Collection per fee item
  const itemCollections = React.useMemo(() => {
    const validTxs = transactions.filter((t) => t.status === 'Sah');
    return feeItems
      .filter((f) => f.active)
      .map((item) => {
        let collected = 0;
        let paidStudents = 0;
        for (const summary of allStudentSummaries) {
          const itemBal = summary.itemBalances.find((b) => b.feeItemId === item.id);
          if (itemBal) {
            collected += itemBal.paidCents;
            if (itemBal.isPaid) paidStudents += 1;
          }
        }
        const totalTarget = item.amountCents * students.length;
        const percent = totalTarget > 0 ? Math.min(100, Math.round((collected / totalTarget) * 100)) : 0;
        return {
          ...item,
          collected,
          paidStudents,
          totalTarget,
          percent,
        };
      });
  }, [feeItems, transactions, allStudentSummaries, students]);

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-5 sm:p-7 shadow-xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Sesi Persekolahan {config.currentSchoolYear}
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline">•</span>
            <span className="text-slate-300 text-xs font-medium">Tahun 3 {config.schoolName}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Papan Pemuka Kutipan Yuran & Keperluan
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Kadar rasmi lengkap: <strong className="text-emerald-400 font-mono">{formatRM(totalItemRateCents)}</strong> seorang murid bagi 11 perkara keperluan Tahun 3.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onOpenPayment()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg transition active:scale-95 cursor-pointer flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Rekod Bayaran</span>
          </button>
          <button
            onClick={onOpenAddStudent}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold border border-slate-700 transition cursor-pointer"
          >
            + Murid Baharu
          </button>
        </div>
      </div>

      {/* Top 5 Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Collections */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jumlah Kutipan</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {formatRM(stats.totalCollectionsCents)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{stats.totalTransactionsCount} resit sah</span>
            </div>
          </div>
        </div>

        {/* Total Outstanding Balance */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jumlah Baki Belum Dikutip</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-800 font-mono">
              {formatRM(stats.totalPendingCents)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Daripada sasaran keseluruhan</p>
          </div>
        </div>

        {/* Selesai Membayar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Murid Selesai</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
              {stats.completedStudentsCount} <span className="text-xs font-normal text-slate-500">/ {stats.totalStudents}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {stats.totalStudents > 0
                ? `${Math.round((stats.completedStudentsCount / stats.totalStudents) * 100)}% selesai penuh`
                : '0%'}
            </p>
          </div>
        </div>

        {/* Bayar Sebahagian */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bayar Sebahagian</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-blue-800 font-mono">
              {stats.partialStudentsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Termasuk bayaran ansuran</p>
          </div>
        </div>

        {/* Belum Bayar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Belum Bayar</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-red-700 font-mono">
              {stats.unpaidStudentsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Belum membuat sebarang bayaran</p>
          </div>
        </div>

      </div>

      {/* Main Grid: Collections by Item & Class Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Collections by 11 Items */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Kutipan Mengikut Perkara (11 Keperluan Rasmi)
              </h2>
              <p className="text-xs text-slate-500">
                Kadar rasmi dan jumlah kutipan terkumpul bagi setiap butiran keperluan
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('reports')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>Eksport Ringkasan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {itemCollections.map((item, idx) => (
              <div key={item.id} className="p-2.5 rounded-lg hover:bg-slate-50 transition border border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[11px] text-slate-400 font-semibold w-4">
                      {idx + 1}.
                    </span>
                    <span className="font-bold text-slate-800">{item.name}</span>
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      Kadar: {formatRM(item.amountCents)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900">{formatRM(item.collected)}</span>
                    <span className="text-[11px] text-slate-500 ml-1.5">
                      ({item.paidStudents}/{students.length} murid)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Class Breakdown & Recent Transactions */}
        <div className="space-y-6">
          
          {/* Class Breakdown Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
              Prestasi Kutipan Mengikut Kelas
            </h2>

            <div className="space-y-3">
              {classBreakdown.map(([className, data]) => {
                const totalTarget = data.total * totalItemRateCents;
                const percent = totalTarget > 0 ? Math.round((data.paid / totalTarget) * 100) : 0;

                return (
                  <div key={className} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-slate-800">{className}</span>
                      <span className="font-mono font-bold text-emerald-800">{formatRM(data.paid)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
                      <span>{data.total} murid berdaftar</span>
                      <span>{data.completed} murid selesai ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="bg-emerald-950 text-emerald-100 rounded-xl p-4 border border-emerald-900 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Resit Rasmi 2 Halaman</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-200/90">
              Setiap kali bayaran disahkan, sistem secara automatik menjana satu fail PDF A4 potret dengan tepat dua halaman:
              <strong> Halaman 1 Salinan Penjaga</strong> dan <strong>Halaman 2 Salinan Rekod Sekolah</strong>.
            </p>
          </div>

        </div>

      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Transaksi Bayaran Terkini</h2>
            <p className="text-xs text-slate-500">5 rekod transaksi pembayaran terbaharu di SK Tudan</p>
          </div>
          <button
            onClick={() => onNavigateToTab('transactions')}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <span>Lihat Semua Resit</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">No. Resit</th>
                <th className="py-2.5 px-4">Tarikh & Masa</th>
                <th className="py-2.5 px-4">Nama Murid</th>
                <th className="py-2.5 px-4">Kelas</th>
                <th className="py-2.5 px-4">Kaedah</th>
                <th className="py-2.5 px-4 text-right">Amaun (RM)</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{tx.receiptNumber}</td>
                  <td className="py-2.5 px-4 text-slate-600">{tx.timestampMalaysia || tx.timestamp}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{tx.studentName}</td>
                  <td className="py-2.5 px-4 text-slate-600">{tx.studentClass}</td>
                  <td className="py-2.5 px-4 text-slate-700">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">{tx.paymentMethod}</span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatRM(tx.totalAmountCents)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'Dibatalkan'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={() => onSelectTransaction(tx)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-semibold text-[11px] transition cursor-pointer flex items-center space-x-1 mx-auto"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Resit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
