import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FeeItem, SchoolConfig } from '../types';
import { formatRM, rmToCents, centsToRM } from '../utils/currency';
import {
  Settings,
  Upload,
  Save,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Image as ImageIcon,
  School,
  Lock,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { feeItems, updateFeeItems, config, updateConfig, currentUser } = useApp();

  // Local state for fee items
  const [items, setItems] = useState<FeeItem[]>(feeItems);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(config);
  const [logoPreview, setLogoPreview] = useState<string>(config.logoBase64 || '');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync if context updates
  React.useEffect(() => {
    setItems(feeItems);
  }, [feeItems]);

  React.useEffect(() => {
    setSchoolConfig(config);
    setLogoPreview(config.logoBase64 || '');
  }, [config]);

  // Handle item rate change
  const handleRateChange = (index: number, newRateRM: string) => {
    const updated = [...items];
    const cents = rmToCents(newRateRM);
    updated[index] = { ...updated[index], amountCents: cents };
    setItems(updated);
  };

  const handleItemNameChange = (index: number, newName: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], name: newName };
    setItems(updated);
  };

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMsg({ type: 'error', text: 'Sila muat naik fail gambar yang sah (PNG, JPG, JPEG).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);
      setSchoolConfig((prev) => ({ ...prev, logoBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setSchoolConfig((prev) => ({ ...prev, logoBase64: '' }));
  };

  // Calculate total fee of active items
  const activeTotalCents = items
    .filter((it) => it.active)
    .reduce((s, it) => s + it.amountCents, 0);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    try {
      // 1. Update config
      const resConfig = await updateConfig(schoolConfig);
      if (!resConfig.success) {
        throw new Error(resConfig.error || 'Gagal menyimpan tetapan sekolah.');
      }

      // 2. Update fee items
      const resItems = await updateFeeItems(items);
      if (!resItems.success) {
        throw new Error(resItems.error || 'Gagal menyimpan senarai kadar yuran.');
      }

      setStatusMsg({ type: 'success', text: 'Kadar yuran dan maklumat sekolah berjaya disimpan serta disegerakkan!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Ralat berlaku semasa menyimpan tetapan.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (currentUser.role !== 'Pentadbir') {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-600 max-w-lg mx-auto mt-8">
        <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">Akses Terhad</h2>
        <p className="text-xs text-slate-500 mt-1">
          Hanya pengguna bertaraf <strong>Pentadbir</strong> dibenarkan mengemas kini kadar yuran dan konfigurasi sekolah. Sila tukar peranan pengguna di bahagian atas untuk mengakses halaman ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Pengurusan Kadar & Konfigurasi Sekolah
          </h1>
          <p className="text-xs text-slate-500">
            Pentadbir boleh menetapkan kadar rasmi untuk sesi baharu dan memuat naik logo sekolah rasmi
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center space-x-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span className="font-semibold">{statusMsg.text}</span>
        </div>
      )}

      {/* Grid: Fee Items Management & School Branding */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Fee Items Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Senarai Perkara & Kadar Rasmi Tahun 3
              </h2>
              <p className="text-xs text-slate-500">
                Setiap perkara dipaparkan secara berasingan. Modul Transisi Tahun 1 RM6.50 tidak berkaitan dan tidak dimasukkan.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-500 block uppercase font-bold">Jumlah Keseluruhan:</span>
              <span className="font-mono text-base font-black text-emerald-700">
                {formatRM(activeTotalCents)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">Bil.</th>
                  <th className="py-2.5 px-3">Nama Perkara / Keperluan</th>
                  <th className="py-2.5 px-3 w-32 text-right">Kadar (RM)</th>
                  <th className="py-2.5 px-3 w-20 text-center">Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemNameChange(idx, e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 px-1 py-0.5 text-xs font-semibold text-slate-800 focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="relative inline-block w-28">
                        <span className="absolute left-2 top-1 text-slate-400 font-mono text-xs">RM</span>
                        <input
                          type="text"
                          value={centsToRM(item.amountCents).toFixed(2)}
                          onChange={(e) => handleRateChange(idx, e.target.value)}
                          className="w-full pl-8 pr-2 py-0.5 text-right font-mono font-bold text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx] = { ...updated[idx], active: e.target.checked };
                          setItems(updated);
                        }}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
            <span className="font-bold">Perhatian Pentadbir: </span>
            Pengemaskinian kadar akan disimpan bersama jejak audit. Transaksi yang telah dikeluarkan sebelum ini kekal mematuhi kadar ketika transaksi tersebut direkodkan.
          </div>
        </div>

        {/* Right Col: School Identity & Logo Upload */}
        <div className="space-y-6">
          
          {/* Logo Uploader */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Logo Rasmi Sekolah
            </h2>
            <p className="text-xs text-slate-500">
              Muat naik logo sekolah anda untuk dicetak pada kedua-dua halaman resit rasmi.
            </p>

            <div className="flex items-center space-x-4 pt-1">
              {logoPreview ? (
                <div className="relative w-20 h-20 rounded-lg border-2 border-emerald-500/40 p-1 bg-white flex items-center justify-center shrink-0">
                  <img src={logoPreview} alt="Logo Sekolah" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px]">Tiada Logo</span>
                </div>
              )}

              <div className="space-y-1.5 flex-1">
                <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih Fail Gambar</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="block text-xs text-red-600 hover:text-red-700 underline font-medium cursor-pointer"
                  >
                    Padam Logo
                  </button>
                )}
                <p className="text-[10px] text-slate-400">Format: PNG, JPG (Disyorkan 200x200px)</p>
              </div>
            </div>
          </div>

          {/* School Config Fields */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Maklumat Persekolahan
            </h2>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nama Sekolah</label>
              <input
                type="text"
                value={schoolConfig.schoolName}
                onChange={(e) => setSchoolConfig({ ...schoolConfig, schoolName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Kod Sekolah</label>
              <input
                type="text"
                value={schoolConfig.schoolCode}
                onChange={(e) => setSchoolConfig({ ...schoolConfig, schoolCode: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Alamat Sekolah</label>
              <textarea
                rows={2}
                value={schoolConfig.schoolAddress}
                onChange={(e) => setSchoolConfig({ ...schoolConfig, schoolAddress: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Sesi Persekolahan Semasa</label>
              <input
                type="text"
                value={schoolConfig.currentSchoolYear}
                onChange={(e) => setSchoolConfig({ ...schoolConfig, currentSchoolYear: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Rasmi Pada Resit</label>
              <textarea
                rows={2}
                value={schoolConfig.receiptNote}
                onChange={(e) => setSchoolConfig({ ...schoolConfig, receiptNote: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
