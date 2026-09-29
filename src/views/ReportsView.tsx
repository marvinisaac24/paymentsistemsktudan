import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatRM } from '../utils/currency';
import { compareClassNames } from '../utils/classes';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowDownToLine,
  TrendingUp,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { stats, feeItems, students, transactions, allStudentSummaries, config } = useApp();
  const [activeReportTab, setActiveReportTab] = useState<'perkara' | 'kelas' | 'kaedah'>('perkara');

  const totalItemRateCents = feeItems
    .filter((f) => f.active)
    .reduce((s, it) => s + it.amountCents, 0);

  // Group by Payment Method
  const methodStats = React.useMemo(() => {
    const valid = transactions.filter((t) => t.status === 'Sah');
    const map = new Map<string, { count: number; totalCents: number }>();
    for (const t of valid) {
      const cur = map.get(t.paymentMethod) || { count: 0, totalCents: 0 };
      cur.count += 1;
      cur.totalCents += t.totalAmountCents;
      map.set(t.paymentMethod, cur);
    }
    return Array.from(map.entries());
  }, [transactions]);

  // Group by Class
  const classStats = React.useMemo(() => {
    const map = new Map<string, { studentsCount: number; paidCents: number; completedCount: number }>();
    for (const s of allStudentSummaries) {
      const cls = s.student.className;
      const cur = map.get(cls) || { studentsCount: 0, paidCents: 0, completedCount: 0 };
      cur.studentsCount += 1;
      cur.paidCents += s.paidCents;
      if (s.status === 'Selesai') cur.completedCount += 1;
      map.set(cls, cur);
    }
    return Array.from(map.entries()).sort((a, b) => compareClassNames(a[0], b[0]));
  }, [allStudentSummaries]);

  // Group by Item
  const itemReport = React.useMemo(() => {
    return feeItems
      .filter((f) => f.active)
      .map((item) => {
        let totalCollected = 0;
        let fullyPaidCount = 0;
        let partialPaidCount = 0;

        for (const sum of allStudentSummaries) {
          const it = sum.itemBalances.find((b) => b.feeItemId === item.id);
          if (it) {
            totalCollected += it.paidCents;
            if (it.isPaid) fullyPaidCount++;
            else if (it.paidCents > 0) partialPaidCount++;
          }
        }

        const target = item.amountCents * students.length;
        const percent = target > 0 ? Math.round((totalCollected / target) * 100) : 0;

        return {
          ...item,
          totalCollected,
          fullyPaidCount,
          partialPaidCount,
          target,
          percent,
        };
      });
  }, [feeItems, allStudentSummaries, students.length]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
          Laporan Analitik & Eksport Data
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Eksport rekod ke format CSV/Excel untuk arkib sekolah atau audit Pejabat Pendidikan Daerah (PPD)
        </p>
      </div>

      {/* CSV Export Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Export 1: Murid & Baki */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition">
          <div>
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Rekod Murid & Baki Bayaran
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Mengandungi senarai nama murid, kelas, MyKid, status bayaran, jumlah dibayar dan baki tertunggak.
            </p>
          </div>
          <a
            href="/api/export/students"
            download
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs text-center transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Muat Turun CSV Murid</span>
          </a>
        </div>

        {/* Export 2: Transaksi */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition">
          <div>
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Semua Transaksi Bayaran
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Rekod terperinci setiap resit pembayaran, tarikh, nombor rujukan, kaedah bayaran, petugas dan status sah/batal.
            </p>
          </div>
          <a
            href="/api/export/transactions"
            download
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs text-center transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Muat Turun CSV Transaksi</span>
          </a>
        </div>

        {/* Export 3: Ringkasan Perkara */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition">
          <div>
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Ringkasan Kutipan Perkara
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pecahan jumlah kutipan dan bilangan murid bagi setiap 11 perkara keperluan Tahun 3.
            </p>
          </div>
          <a
            href="/api/export/fee-summary"
            download
            className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow-xs text-center transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Muat Turun CSV Ringkasan</span>
          </a>
        </div>

      </div>

      {/* Interactive Report View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Report Tab Selector */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-600">Papar Laporan:</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setActiveReportTab('perkara')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  activeReportTab === 'perkara'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                11 Perkara Keperluan
              </button>
              <button
                onClick={() => setActiveReportTab('kelas')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  activeReportTab === 'kelas'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mengikut Kelas
              </button>
              <button
                onClick={() => setActiveReportTab('kaedah')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  activeReportTab === 'kaedah'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kaedah Bayaran
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Kutipan Sah Terkumpul: <strong className="font-mono text-emerald-800">{formatRM(stats.totalCollectionsCents)}</strong>
          </div>
        </div>

        {/* Tab 1: 11 Fee Items Report */}
        {activeReportTab === 'perkara' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-center">Bil.</th>
                  <th className="py-2.5 px-4">Perkara Keperluan</th>
                  <th className="py-2.5 px-4 text-right">Kadar Rasmi</th>
                  <th className="py-2.5 px-4 text-right">Sasaran Penuh</th>
                  <th className="py-2.5 px-4 text-right font-black text-slate-900">Kutipan Diterima</th>
                  <th className="py-2.5 px-4 text-center">Murid Selesai</th>
                  <th className="py-2.5 px-4 text-center">Murid Ansuran</th>
                  <th className="py-2.5 px-4 text-center">Peratus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemReport.map((it, idx) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{it.name}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatRM(it.amountCents)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatRM(it.target)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-700">
                      {formatRM(it.totalCollected)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                        {it.fullyPaidCount} murid
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium">
                        {it.partialPaidCount} murid
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold font-mono">
                      {it.percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Class Report */}
        {activeReportTab === 'kelas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Nama Kelas</th>
                  <th className="py-2.5 px-4 text-center">Bilangan Murid</th>
                  <th className="py-2.5 px-4 text-right">Sasaran Kelas</th>
                  <th className="py-2.5 px-4 text-right font-black text-slate-900">Kutipan Diterima</th>
                  <th className="py-2.5 px-4 text-right">Baki Tertunggak</th>
                  <th className="py-2.5 px-4 text-center">Murid Selesai Penuh</th>
                  <th className="py-2.5 px-4 text-center">Prestasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStats.map(([cls, data]) => {
                  const target = data.studentsCount * totalItemRateCents;
                  const bal = Math.max(0, target - data.paidCents);
                  const percent = target > 0 ? Math.round((data.paidCents / target) * 100) : 0;

                  return (
                    <tr key={cls} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{cls}</td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{data.studentsCount} murid</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">{formatRM(target)}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">{formatRM(data.paidCents)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">{formatRM(bal)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                          {data.completedCount} / {data.studentsCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono">
                        {percent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Payment Method Report */}
        {activeReportTab === 'kaedah' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Kaedah Pembayaran</th>
                  <th className="py-2.5 px-4 text-center">Bilangan Transaksi</th>
                  <th className="py-2.5 px-4 text-right font-black text-slate-900">Jumlah Kutipan (RM)</th>
                  <th className="py-2.5 px-4 text-center">Sumbangan Peratusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {methodStats.map(([method, data]) => {
                  const percent =
                    stats.totalCollectionsCents > 0
                      ? Math.round((data.totalCents / stats.totalCollectionsCents) * 100)
                      : 0;

                  return (
                    <tr key={method} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{method}</td>
                      <td className="py-3 px-4 text-center font-mono">{data.count} transaksi</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">
                        {formatRM(data.totalCents)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono">{percent}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
