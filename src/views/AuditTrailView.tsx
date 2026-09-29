import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Search, Filter, Clock, User, FileText } from 'lucide-react';

export const AuditTrailView: React.FC = () => {
  const { auditLogs, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('Semua');

  const filteredLogs = auditLogs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      log.details.toLowerCase().includes(q) ||
      log.performedBy.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q);

    const matchAction = actionFilter === 'Semua' || log.action === actionFilter;

    return matchSearch && matchAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'TAMBAH_BAYARAN':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Bayaran Diterima</span>;
      case 'BATAL_BAYARAN':
        return <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Pembatalan Bayaran</span>;
      case 'TAMBAH_MURID':
      case 'IMPORT_MURID':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Daftar Murid</span>;
      case 'KEMASKINI_MURID':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Kemas Kini Murid</span>;
      case 'KEMASKINI_KADAR':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Kemas Kini Kadar</span>;
      case 'KEMASKINI_TETAPAN':
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Tetapan Sekolah</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{action}</span>;
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Jejak Audit Rasmi Pentadbiran
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rekod keselamatan bagi setiap transaksi, pembatalan, dan pengemaskinian murid mengikut Waktu Piawai Malaysia (UTC+8)
          </p>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-xs font-bold text-slate-500 block uppercase">Jumlah Entri Audit:</span>
          <span className="font-mono text-base font-black text-slate-900">{auditLogs.length}</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari butiran jejak audit, nama petugas, atau tindakan..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Tindakan:</span>
          {['Semua', 'TAMBAH_BAYARAN', 'BATAL_BAYARAN', 'TAMBAH_MURID', 'KEMASKINI_MURID', 'KEMASKINI_KADAR'].map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                actionFilter === act
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {act === 'Semua' ? 'Semua' : act.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Tiada log audit yang sepadan dengan carian anda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {getActionBadge(log.action)}
                    <span className="font-semibold text-slate-900">{log.details}</span>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                    <span className="flex items-center space-x-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <strong className="text-slate-700">{log.performedBy}</strong> ({log.role})
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 text-[11px] text-slate-500 font-mono shrink-0 sm:text-right">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{log.timestampMalaysia || log.timestamp}</span>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
