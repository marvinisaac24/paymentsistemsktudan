import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { useApp } from '../context/AppContext';
import { UserPlus, UserCheck, X, AlertCircle } from 'lucide-react';
import { ALL_STANDARD_CLASSES, normalizeClassName } from '../utils/classes';

interface StudentModalProps {
  student: Student | null; // null for new, existing Student for edit
  isOpen: boolean;
  onClose: () => void;
}

export const StudentModal: React.FC<StudentModalProps> = ({ student, isOpen, onClose }) => {
  const { addStudent, updateStudent, config } = useApp();

  const [name, setName] = useState('');
  const [className, setClassName] = useState('3 ARIF');
  const [customClass, setCustomClass] = useState('');
  const [myKid, setMyKid] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [schoolYear, setSchoolYear] = useState('2026');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (student) {
      setName(student.name);
      const norm = normalizeClassName(student.className);
      if (ALL_STANDARD_CLASSES.includes(norm)) {
        setClassName(norm);
        setCustomClass('');
      } else {
        setClassName('Lain-lain');
        setCustomClass(student.className);
      }
      setMyKid(student.myKid || '');
      setParentName(student.parentName || '');
      setParentPhone(student.parentPhone || '');
      setSchoolYear(student.schoolYear || config.currentSchoolYear);
    } else {
      setName('');
      setClassName('3 ARIF');
      setCustomClass('');
      setMyKid('');
      setParentName('');
      setParentPhone('');
      setSchoolYear(config.currentSchoolYear || '2026');
    }
    setErrorMsg('');
  }, [student, isOpen, config.currentSchoolYear]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Nama murid adalah wajib.');
      return;
    }

    const rawClass = className === 'Lain-lain' ? customClass.trim() : className;
    if (!rawClass) {
      setErrorMsg('Sila pilih atau masukkan nama kelas.');
      return;
    }
    const finalClass = normalizeClassName(rawClass);

    if (!parentName.trim()) {
      setErrorMsg('Nama ibu bapa atau penjaga adalah wajib.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (student) {
        // Edit
        const res = await updateStudent(student.id, {
          name: name.trim(),
          className: finalClass,
          myKid: myKid.trim(),
          parentName: parentName.trim(),
          parentPhone: parentPhone.trim(),
          schoolYear: schoolYear.trim(),
        });
        if (!res.success) {
          setErrorMsg(res.error || 'Gagal mengemas kini maklumat murid.');
          setIsSubmitting(false);
          return;
        }
      } else {
        // Add
        const res = await addStudent({
          name: name.trim(),
          className: finalClass,
          myKid: myKid.trim(),
          parentName: parentName.trim(),
          parentPhone: parentPhone.trim(),
          schoolYear: schoolYear.trim(),
        });
        if (!res.success) {
          setErrorMsg(res.error || 'Gagal mendaftar murid.');
          setIsSubmitting(false);
          return;
        }
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Ralat berlaku.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            {student ? <UserCheck className="w-5 h-5 text-emerald-400" /> : <UserPlus className="w-5 h-5 text-emerald-400" />}
            <h3 className="text-base font-bold text-white">
              {student ? 'Kemas Kini Maklumat Murid' : 'Daftar Murid Baharu Tahun 3'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nama Penuh Murid <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Muhammad Danial bin Radzi"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Kelas <span className="text-red-500">*</span>
              </label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <optgroup label="Tahun 3 (Fokus Utama)">
                  <option value="3 ARIF">3 ARIF</option>
                  <option value="3 BESTARI">3 BESTARI</option>
                  <option value="3 CEKAL">3 CEKAL</option>
                  <option value="3 DINAMIK">3 DINAMIK</option>
                  <option value="3 EFISIEN">3 EFISIEN</option>
                  <option value="3 FLEKSIBEL">3 FLEKSIBEL</option>
                </optgroup>

                <optgroup label="Prasekolah">
                  <option value="PRASEKOLAH ARIF">PRASEKOLAH ARIF</option>
                  <option value="PRASEKOLAH BESTARI">PRASEKOLAH BESTARI</option>
                  <option value="PRASEKOLAH CEKAL">PRASEKOLAH CEKAL</option>
                  <option value="PRASEKOLAH DINAMIK">PRASEKOLAH DINAMIK</option>
                  <option value="PRASEKOLAH EFISIEN">PRASEKOLAH EFISIEN</option>
                  <option value="PRASEKOLAH FLEKSIBEL">PRASEKOLAH FLEKSIBEL</option>
                </optgroup>

                <optgroup label="Tahun 1">
                  <option value="1 ARIF">1 ARIF</option>
                  <option value="1 BESTARI">1 BESTARI</option>
                  <option value="1 CEKAL">1 CEKAL</option>
                  <option value="1 DINAMIK">1 DINAMIK</option>
                  <option value="1 EFISIEN">1 EFISIEN</option>
                  <option value="1 FLEKSIBEL">1 FLEKSIBEL</option>
                </optgroup>

                <optgroup label="Tahun 2">
                  <option value="2 ARIF">2 ARIF</option>
                  <option value="2 BESTARI">2 BESTARI</option>
                  <option value="2 CEKAL">2 CEKAL</option>
                  <option value="2 DINAMIK">2 DINAMIK</option>
                  <option value="2 EFISIEN">2 EFISIEN</option>
                  <option value="2 FLEKSIBEL">2 FLEKSIBEL</option>
                </optgroup>

                <optgroup label="Tahun 4">
                  <option value="4 ARIF">4 ARIF</option>
                  <option value="4 BESTARI">4 BESTARI</option>
                  <option value="4 CEKAL">4 CEKAL</option>
                  <option value="4 DINAMIK">4 DINAMIK</option>
                  <option value="4 EFISIEN">4 EFISIEN</option>
                  <option value="4 FLEKSIBEL">4 FLEKSIBEL</option>
                </optgroup>

                <optgroup label="Tahun 5">
                  <option value="5 ARIF">5 ARIF</option>
                  <option value="5 BESTARI">5 BESTARI</option>
                  <option value="5 CEKAL">5 CEKAL</option>
                  <option value="5 DINAMIK">5 DINAMIK</option>
                  <option value="5 EFISIEN">5 EFISIEN</option>
                  <option value="5 FLEKSIBEL">5 FLEKSIBEL</option>
                </optgroup>

                <optgroup label="Tahun 6">
                  <option value="6 ARIF">6 ARIF</option>
                  <option value="6 BESTARI">6 BESTARI</option>
                  <option value="6 CEKAL">6 CEKAL</option>
                  <option value="6 DINAMIK">6 DINAMIK</option>
                  <option value="6 EFISIEN">6 EFISIEN</option>
                  <option value="6 FLEKSIBEL">6 FLEKSIBEL</option>
                </optgroup>

                <optgroup label="Lain-lain">
                  <option value="Lain-lain">Lain-lain (Nyatakan)</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Sesi Persekolahan</label>
              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="2026"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {className === 'Lain-lain' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nama Kelas Khusus</label>
              <input
                type="text"
                value={customClass}
                onChange={(e) => setCustomClass(e.target.value)}
                placeholder="Contoh: 3 Harmoni"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nombor MyKid (Pilihan)
            </label>
            <input
              type="text"
              value={myKid}
              onChange={(e) => setMyKid(e.target.value)}
              placeholder="Contoh: 170512-13-5819"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              * Dilindungi. Hanya pengguna diberi kuasa (Pentadbir) yang boleh melihat nombor MyKid penuh.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Maklumat Ibu Bapa / Penjaga:
            </h4>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-600 block mb-1">
                  Nama Ibu Bapa / Penjaga <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Contoh: Encik Radzi bin Ismail"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 block mb-1">No. Telefon Penjaga (Pilihan)</label>
                <input
                  type="text"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="Contoh: 013-8821943"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Menyimpan...' : student ? 'Simpan Perubahan' : 'Daftar Murid'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
