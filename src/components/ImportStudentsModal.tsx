import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileUp, X, AlertCircle, CheckCircle, Copy, HelpCircle } from 'lucide-react';
import { Student } from '../types';
import { normalizeClassName } from '../utils/classes';

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({ isOpen, onClose }) => {
  const { importStudents, config } = useApp();
  const [csvText, setCsvText] = useState('');
  const [previewRows, setPreviewRows] = useState<Partial<Student>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMsg, setResultMsg] = useState<{
    added: number;
    skipped: number;
    details?: { name: string; reason: string }[];
  } | null>(null);

  if (!isOpen) return null;

  const sampleCsv = `Nama Murid,Kelas,MyKid,Nama Penjaga,Telefon Penjaga,Tahun
Mohamad Danial Haikal,1 ARIF,190311-13-1122,Haikal bin Ramli,019-8712345,2026
Nurul Iman binti Haris,1 BESTARI,190420-13-2233,Haris bin Abdullah,012-3344556,2026
Lucas Anak John,1 CEKAL,190605-13-9988,John Anak Empaling,011-8877665,2026
Siti Nurhaliza,1 DINAMIK,190812-13-4455,Zulkifli bin Kassim,013-4455667,2026
Ahmad Zikri,1 EFISIEN,191001-13-7788,Ramlan bin Yusof,014-5566778,2026
Daphnie Mujan,1 FLEKSIBEL,191219-13-9900,Mujan Anak Peter,016-9900112,2026`;

  const handleCopySample = () => {
    navigator.clipboard.writeText(sampleCsv);
  };

  const handleParse = (text: string) => {
    setCsvText(text);
    setResultMsg(null);
    if (!text.trim()) {
      setPreviewRows([]);
      return;
    }

    const lines = text.trim().split(/\r?\n/);
    const parsed: Partial<Student>[] = [];

    // Check if first line is header
    const startIndex = lines[0].toLowerCase().includes('nama') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV or tab-separated
      let cols = line.includes('\t') ? line.split('\t') : line.split(',');
      cols = cols.map((c) => c.replace(/^["']|["']$/g, '').trim());

      if (cols.length >= 2) {
        parsed.push({
          name: cols[0],
          className: normalizeClassName(cols[1]),
          myKid: cols[2] || '',
          parentName: cols[3] || 'Ibu Bapa / Penjaga',
          parentPhone: cols[4] || '',
          schoolYear: cols[5] || config.currentSchoolYear || '2026',
        });
      }
    }

    setPreviewRows(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleParse(text);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (previewRows.length === 0) return;

    setIsProcessing(true);
    setResultMsg(null);

    try {
      const res = await importStudents(previewRows);
      setResultMsg({
        added: res.addedCount,
        skipped: res.skippedCount,
        details: res.skipped,
      });

      if (res.addedCount > 0 && res.skippedCount === 0) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <FileUp className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Import Senarai Murid Tahun 3</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Result Banner */}
          {resultMsg && (
            <div
              className={`p-4 rounded-xl border text-xs ${
                resultMsg.added > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>
                  Selesai! {resultMsg.added} murid berjaya didaftarkan.
                  {resultMsg.skipped > 0 && ` (${resultMsg.skipped} rekod dilepaskan kerana pendua / tidak lengkap)`}
                </span>
              </div>
              {resultMsg.details && resultMsg.details.length > 0 && (
                <div className="mt-2 text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
                  {resultMsg.details.map((d, i) => (
                    <p key={i}>
                      • {d.name}: {d.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick instructions & template */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Format Lajur CSV / Excel:</span>
              <button
                type="button"
                onClick={handleCopySample}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center space-x-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-emerald-200"
              >
                <Copy className="w-3 h-3" />
                <span>Salin Contoh CSV</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-600">
              <code>Nama Murid, Kelas, No. MyKid, Nama Penjaga, Telefon Penjaga, Tahun</code>
            </p>
            <p className="text-[10px] text-slate-500">
              * Sistem akan mengelakkan rekod pendua secara automatik berdasarkan nombor MyKid atau gabungan Nama + Kelas + Tahun.
            </p>
          </div>

          {/* Upload or Paste */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Tampal Teks CSV / Senarai Di Sini:</label>
              <label className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline">
                <span>Atau Pilih Fail CSV (.csv)</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => handleParse(e.target.value)}
              placeholder="Tampal teks CSV di sini..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800">
                  Pratonton Data ({previewRows.length} Murid Dikesan):
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                    <tr>
                      <th className="py-1.5 px-2">Nama Murid</th>
                      <th className="py-1.5 px-2">Kelas</th>
                      <th className="py-1.5 px-2">MyKid</th>
                      <th className="py-1.5 px-2">Penjaga</th>
                      <th className="py-1.5 px-2">Telefon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-1 px-2 font-medium">{r.name}</td>
                        <td className="py-1 px-2 text-slate-600">{r.className}</td>
                        <td className="py-1 px-2 font-mono text-slate-500">{r.myKid || '-'}</td>
                        <td className="py-1 px-2 text-slate-600">{r.parentName || '-'}</td>
                        <td className="py-1 px-2 font-mono text-slate-500">{r.parentPhone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={isProcessing || previewRows.length === 0}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? 'Mengimport...' : `Sahkan & Import (${previewRows.length} Murid)`}
          </button>
        </div>

      </div>
    </div>
  );
};
