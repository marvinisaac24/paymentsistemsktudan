import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import {
  INITIAL_CONFIG,
  INITIAL_FEE_ITEMS,
  INITIAL_STUDENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CLASS_TEACHERS,
} from './src/data/initialData';
import { FeeItem, SchoolConfig, Student, Transaction, AuditLog } from './src/types';
import { normalizeClassName } from './src/utils/classes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI() : null;

interface DatabaseSchema {
  config: SchoolConfig;
  feeItems: FeeItem[];
  students: Student[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  receiptCounter: number;
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database with default seed data if not present
function loadDatabase(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed: DatabaseSchema = JSON.parse(content);
      // Ensure classTeachers is populated
      let needsSave = false;
      if (!parsed.config.classTeachers || Object.keys(parsed.config.classTeachers).length === 0) {
        parsed.config.classTeachers = { ...INITIAL_CLASS_TEACHERS };
        needsSave = true;
      }
      if (!parsed.config.schoolCode || parsed.config.schoolCode !== 'YBA4111') {
        parsed.config.schoolCode = 'YBA4111';
        needsSave = true;
      }
      if (
        !parsed.config.adminName ||
        parsed.config.adminName !== 'LIM AI GIOK' ||
        parsed.config.adminTitle !== 'Guru Besar' ||
        parsed.config.headmasterName !== 'LIM AI GIOK'
      ) {
        parsed.config.adminName = 'LIM AI GIOK';
        parsed.config.adminTitle = 'Guru Besar';
        parsed.config.headmasterName = 'LIM AI GIOK';
        parsed.config.adminList = [
          {
            id: 'adm_1',
            name: 'LIM AI GIOK',
            designation: 'Guru Besar',
            role: 'Pentadbir',
            phone: '019-8834111',
            isPrimary: true,
          },
        ];
        needsSave = true;
      }
      if (needsSave) {
        saveDatabase(parsed);
      }
      return parsed;
    } catch (e) {
      console.error('Error reading database, creating new one from defaults', e);
    }
  }

  const initialDb: DatabaseSchema = {
    config: INITIAL_CONFIG,
    feeItems: INITIAL_FEE_ITEMS,
    students: INITIAL_STUDENTS,
    transactions: INITIAL_TRANSACTIONS,
    auditLogs: INITIAL_AUDIT_LOGS,
    receiptCounter: 4, // 4 pre-seeded transactions
  };

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: DatabaseSchema) {
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

let db = loadDatabase();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '15mb' }));

  // Helper for Malaysia formatted time (UTC+8)
  function getMalaysiaTime(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    const parts = formatter.formatToParts(date);
    let day = '', month = '', year = '', hour = '', minute = '', second = '', dayPeriod = '';
    for (const p of parts) {
      if (p.type === 'day') day = p.value;
      if (p.type === 'month') month = p.value;
      if (p.type === 'year') year = p.value;
      if (p.type === 'hour') hour = p.value;
      if (p.type === 'minute') minute = p.value;
      if (p.type === 'second') second = p.value;
      if (p.type === 'dayPeriod') dayPeriod = p.value.toUpperCase();
    }
    return {
      iso: date.toISOString(),
      formatted: `${day}/${month}/${year}, ${hour}:${minute}:${second} ${dayPeriod}`,
      year: year || '2026',
    };
  }

  // --- API Endpoints ---

  // 1. Get full state
  app.get('/api/state', (_req: Request, res: Response) => {
    res.json(db);
  });

  // 2. Update School Config
  app.put('/api/config', (req: Request, res: Response) => {
    const { config, user } = req.body;
    if (!config) {
      return res.status(400).json({ error: 'Data konfigurasi diperlukan.' });
    }
    db.config = { ...db.config, ...config };

    const time = getMalaysiaTime();
    const actionDetail = config.logoBase64 !== undefined
      ? (config.logoBase64 ? 'Mengemas kini / memuat naik logo rasmi sekolah.' : 'Memadam logo rasmi sekolah.')
      : config.adminName || config.adminList
      ? `Mengemas kini maklumat pentadbir sekolah (${config.adminName || 'Senarai Pentadbir'}).`
      : 'Mengemas kini maklumat konfigurasi sekolah / kadar.';

    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      action: 'KEMASKINI_TETAPAN',
      performedBy: user?.name || 'Pentadbir',
      role: user?.role || 'Pentadbir',
      details: actionDetail,
    });

    saveDatabase(db);
    res.json(db.config);
  });

  // 2b. Update Class Teachers
  app.put('/api/class-teachers', (req: Request, res: Response) => {
    const { classTeachers, user } = req.body;
    if (!classTeachers || typeof classTeachers !== 'object') {
      return res.status(400).json({ error: 'Data guru kelas tidak sah.' });
    }

    db.config.classTeachers = {
      ...(db.config.classTeachers || {}),
      ...classTeachers,
    };

    const count = Object.keys(classTeachers).length;
    const time = getMalaysiaTime();
    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      action: 'KEMASKINI_TETAPAN',
      performedBy: user?.name || 'Pentadbir',
      role: user?.role || 'Pentadbir',
      details: `Mengemas kini senarai nama guru kelas (${count} kelas).`,
    });

    saveDatabase(db);
    res.json(db.config.classTeachers);
  });

  // 2c. Parse Class Teachers File (PDF, Word, CSV, Excel, Image)
  app.post('/api/class-teachers/parse-file', async (req: Request, res: Response) => {
    try {
      const { fileBase64, fileName, mimeType, user } = req.body;
      if (!fileBase64 || !fileName) {
        return res.status(400).json({ error: 'Fail dan nama fail diperlukan.' });
      }

      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const ext = path.extname(fileName).toLowerCase();

      let extracted: { className: string; teacherName: string }[] = [];

      // 1. Excel / CSV local extraction first
      if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
        try {
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (rows.length > 0) {
            let classColIdx = -1;
            let teacherColIdx = -1;

            // Search header row
            for (let r = 0; r < Math.min(10, rows.length); r++) {
              const row = rows[r];
              for (let c = 0; c < row.length; c++) {
                const cell = String(row[c] || '').toLowerCase().trim();
                if (classColIdx === -1 && /kelas|tingkatan|darjah|tahun|class/i.test(cell)) {
                  classColIdx = c;
                }
                if (teacherColIdx === -1 && /guru|nama guru|wali|teacher/i.test(cell)) {
                  teacherColIdx = c;
                }
              }
              if (classColIdx !== -1 && teacherColIdx !== -1) break;
            }

            if (classColIdx !== -1 && teacherColIdx !== -1) {
              for (let r = 0; r < rows.length; r++) {
                const row = rows[r];
                const rawClass = String(row[classColIdx] || '').trim();
                const rawTeacher = String(row[teacherColIdx] || '').trim();
                if (rawClass && rawTeacher && !/kelas|tingkatan|darjah|tahun|nama guru/i.test(rawClass)) {
                  extracted.push({
                    className: normalizeClassName(rawClass),
                    teacherName: rawTeacher,
                  });
                }
              }
            }
          }
        } catch (excelErr) {
          console.warn('XLSX parsing warning:', excelErr);
        }
      }

      // 2. Word (.docx / .doc) local text extraction
      let wordText = '';
      if (ext === '.docx' || ext === '.doc') {
        try {
          const mammothResult = await mammoth.extractRawText({ buffer });
          wordText = mammothResult.value;
        } catch (mErr) {
          console.warn('Mammoth extraction warning:', mErr);
        }
      }

      // 3. If extracted is still empty or file is PDF / Image / Word / unstructured, use Gemini API!
      if (extracted.length === 0 && ai) {
        try {
          let contents: any[] = [];
          const systemInstruction = `Anda adalah sistem pintar pembaca dokumen sekolah SK TUDAN (MIRI, SARAWAK).
Tugasan anda: Baca fail/dokumen yang dimuat naik (jadual guru kelas, surat penempatan, memo, borang, gambar, atau teks), ekstrak senarai KELAS dan NAMA GURU KELAS bagi setiap kelas.

Format kelas SK Tudan:
- Prasekolah: PRASEKOLAH ARIF, PRASEKOLAH BESTARI, PRASEKOLAH CEKAL, PRASEKOLAH DINAMIK, PRASEKOLAH EFISIEN, PRASEKOLAH FLEKSIBEL
- Tahun 1 hingga 6: <Tahun> <Aliran> (contoh: 1 ARIF, 1 BESTARI, 2 CEKAL, 3 ARIF, 3 BESTARI, 4 DINAMIK, 5 EFISIEN, 6 FLEKSIBEL)

PENTING:
- Kembalikan jawapan HANYA dalam format JSON tulen (array of objects), tanpa sebarang markdown block atau penjelasan lain:
[
  { "className": "1 ARIF", "teacherName": "Ustazah Nurul Ain binti Zakaria" },
  { "className": "3 BESTARI", "teacherName": "Cikgu Mohd Hafiz bin Salleh" }
]
- Jangan biarkan nama guru atau kelas kosong.`;

          if (ext === '.pdf') {
            contents = [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: cleanBase64,
                },
              },
              { text: systemInstruction },
            ];
          } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
            const imgMime = mimeType || (ext === '.png' ? 'image/png' : 'image/jpeg');
            contents = [
              {
                inlineData: {
                  mimeType: imgMime,
                  data: cleanBase64,
                },
              },
              { text: systemInstruction },
            ];
          } else if (wordText) {
            contents = [
              {
                text: `${systemInstruction}\n\nBerikut teks dokumen Word:\n\n${wordText}`,
              },
            ];
          } else {
            const textContent = buffer.toString('utf-8');
            contents = [
              {
                text: `${systemInstruction}\n\nBerikut kandungan data fail ${fileName}:\n\n${textContent.slice(0, 50000)}`,
              },
            ];
          }

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
          });

          const rawText = response.text || '';
          const cleanedJson = rawText.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedJson);
          if (Array.isArray(parsed)) {
            extracted = parsed
              .filter((item) => item && item.className && item.teacherName)
              .map((item) => ({
                className: normalizeClassName(item.className),
                teacherName: String(item.teacherName).trim(),
              }));
          }
        } catch (geminiErr: any) {
          console.error('Gemini extraction error:', geminiErr);
        }
      }

      // 4. Fallback line-by-line regex if Gemini was unavailable or returned nothing for text files
      if (extracted.length === 0 && (wordText || ext === '.csv' || ext === '.txt')) {
        const lines = (wordText || buffer.toString('utf-8')).split(/\r?\n/);
        for (const line of lines) {
          const m = line.match(/(?:TAHUN\s*)?([1-6]|PRASEKOLAH|PRA)\s*[-_:]?\s*(ARIF|BESTARI|CEKAL|DINAMIK|EFISIEN|FLEKSIBEL)[^\w\d]+(.+)/i);
          if (m) {
            const rawClass = `${m[1]} ${m[2]}`;
            const teacher = m[3].replace(/^[–\-:]\s*/, '').trim();
            if (teacher.length > 2) {
              extracted.push({
                className: normalizeClassName(rawClass),
                teacherName: teacher,
              });
            }
          }
        }
      }

      if (extracted.length === 0) {
        return res.status(422).json({
          error: 'Sistem tidak dapat mengesan maklumat guru kelas daripada dokumen ini. Sila pastikan dokumen mengandungi senarai kelas (cth: 1 Arif, 3 Bestari) dan nama guru kelas.',
        });
      }

      const time = getMalaysiaTime();
      db.auditLogs.unshift({
        id: `log_${Date.now()}`,
        timestamp: time.iso,
        timestampMalaysia: time.formatted,
        action: 'KEMASKINI_TETAPAN',
        performedBy: user?.name || 'Pentadbir',
        role: user?.role || 'Pentadbir',
        details: `Membaca fail ${fileName} (${ext}) dan berjaya mengekstrak ${extracted.length} maklumat guru kelas secara automatik.`,
      });
      saveDatabase(db);

      res.json({
        success: true,
        fileName,
        totalFound: extracted.length,
        extracted,
      });
    } catch (err: any) {
      console.error('Error in parse-file:', err);
      res.status(500).json({ error: err.message || 'Gagal memproses fail yang dimuat naik.' });
    }
  });

  // 3. Update Fee Items (Admin only)
  app.put('/api/fee-items', (req: Request, res: Response) => {
    const { items, user } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Senarai perkara tidak sah.' });
    }

    db.feeItems = items;
    const time = getMalaysiaTime();
    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      action: 'KEMASKINI_KADAR',
      performedBy: user?.name || 'Pentadbir',
      role: user?.role || 'Pentadbir',
      details: `Mengemas kini senarai kadar yuran dan keperluan (${items.length} perkara).`,
    });

    saveDatabase(db);
    res.json(db.feeItems);
  });

  // 4. Student Management: Add Student
  app.post('/api/students', (req: Request, res: Response) => {
    const { student, user } = req.body;
    if (!student || !student.name || !student.className) {
      return res.status(400).json({ error: 'Nama dan kelas murid adalah wajib.' });
    }

    const trimmedName = student.name.trim();
    const trimmedClass = normalizeClassName(student.className);
    const cleanMyKid = student.myKid ? student.myKid.replace(/[^0-9]/g, '') : '';
    const schoolYear = student.schoolYear || db.config.currentSchoolYear;

    // Duplicate check: MyKid match or (Name + Class + Year)
    const duplicate = db.students.find((s) => {
      if (cleanMyKid && s.myKid) {
        const sClean = s.myKid.replace(/[^0-9]/g, '');
        if (sClean && sClean === cleanMyKid) return true;
      }
      return (
        s.name.toLowerCase().trim() === trimmedName.toLowerCase() &&
        s.className.toLowerCase().trim() === trimmedClass.toLowerCase() &&
        s.schoolYear === schoolYear
      );
    });

    if (duplicate) {
      return res.status(409).json({
        error: `Rekod murid sudah wujud! Nama: "${duplicate.name}" (${duplicate.className}, ${duplicate.schoolYear}).`,
      });
    }

    const time = getMalaysiaTime();
    const newStudent: Student = {
      id: `std_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: trimmedName,
      className: trimmedClass,
      myKid: student.myKid?.trim() || '',
      parentName: student.parentName?.trim() || '',
      parentPhone: student.parentPhone?.trim() || '',
      schoolYear: schoolYear,
      createdAt: time.iso,
      updatedAt: time.iso,
    };

    db.students.push(newStudent);

    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      action: 'TAMBAH_MURID',
      performedBy: user?.name || 'Petugas',
      role: user?.role || 'Guru/Petugas',
      details: `Mendaftar murid baharu: ${newStudent.name} (${newStudent.className}, ${newStudent.schoolYear})`,
      targetId: newStudent.id,
    });

    saveDatabase(db);
    res.status(201).json(newStudent);
  });

  // 5. Update Student
  app.put('/api/students/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { student, user } = req.body;
    const index = db.students.findIndex((s) => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Murid tidak ditemui.' });
    }

    const existing = db.students[index];
    const time = getMalaysiaTime();
    const updatedClass = student.className ? normalizeClassName(student.className) : existing.className;

    db.students[index] = {
      ...existing,
      ...student,
      className: updatedClass,
      id: existing.id,
      updatedAt: time.iso,
    };

    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      action: 'KEMASKINI_MURID',
      performedBy: user?.name || 'Petugas',
      role: user?.role || 'Guru/Petugas',
      details: `Mengemas kini maklumat murid: ${db.students[index].name} (${db.students[index].className})`,
      targetId: id,
    });

    saveDatabase(db);
    res.json(db.students[index]);
  });

  // 5b. Delete Single Student
  app.delete('/api/students/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { user, force } = req.body || {};
    const index = db.students.findIndex((s) => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Murid tidak ditemui.' });
    }

    const student = db.students[index];
    const hasTransactions = db.transactions.some(
      (t) => t.studentId === id && t.status === 'Sah'
    );

    // Cancel related transactions if any
    if (hasTransactions) {
      const time = getMalaysiaTime();
      for (const tx of db.transactions) {
        if (tx.studentId === id && tx.status === 'Sah') {
          tx.status = 'Dibatalkan';
          tx.cancellationReason = `Murid ${student.name} dipadam daripada sistem oleh ${user?.name || 'Pengguna'}.`;
          tx.cancelledBy = user?.name || 'Pentadbir';
          tx.cancelledAt = time.iso;
        }
      }
    }

    db.students.splice(index, 1);
    const time = getMalaysiaTime();

    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      action: 'PADAM_MURID',
      performedBy: user?.name || 'Pentadbir',
      role: user?.role || 'Pentadbir',
      details: `Memadam murid: ${student.name} (${student.className}, ${student.schoolYear})`,
      targetId: id,
    });

    saveDatabase(db);
    res.json({ success: true, deletedStudent: student });
  });

  // 5c. Bulk Delete Students (Padam Murid Secara Pukal)
  app.post('/api/students/bulk-delete', (req: Request, res: Response) => {
    const { studentIds, forceDeleteWithTransactions, reason, user } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'Sila pilih sekurang-kurangnya satu murid untuk dipadam.' });
    }

    const targetStudents = db.students.filter((s) => studentIds.includes(s.id));
    if (targetStudents.length === 0) {
      return res.status(404).json({ error: 'Tiada murid ditemui mengikut senarai ID yang diberikan.' });
    }

    // Check which students have transactions
    const studentsWithTransactions: string[] = [];
    const studentsSafe: string[] = [];

    for (const std of targetStudents) {
      const hasTx = db.transactions.some((t) => t.studentId === std.id && t.status === 'Sah');
      if (hasTx) {
        studentsWithTransactions.push(std.name);
      } else {
        studentsSafe.push(std.name);
      }
    }

    const time = getMalaysiaTime();
    const deletedNames = targetStudents.map((s) => `${s.name} (${s.className})`);

    // Cancel any related transactions for deleted students
    if (studentsWithTransactions.length > 0) {
      for (const tx of db.transactions) {
        if (studentIds.includes(tx.studentId) && tx.status === 'Sah') {
          tx.status = 'Dibatalkan';
          tx.cancellationReason = `Murid dipadam secara pukal oleh ${user?.name || 'Pengguna'}. Sebab: ${reason || 'Pembersihan senarai murid'}`;
          tx.cancelledBy = user?.name || 'Pentadbir';
          tx.cancelledAt = time.iso;
        }
      }
    }

    // Remove from students
    const idSet = new Set(studentIds);
    db.students = db.students.filter((s) => !idSet.has(s.id));

    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      action: 'PADAM_MURID_PUKAL',
      performedBy: user?.name || 'Pentadbir',
      role: user?.role || 'Pentadbir',
      details: `MEMADAM ${targetStudents.length} MURID SECARA PUKAL: ${deletedNames.slice(0, 5).join(', ')}${deletedNames.length > 5 ? ` dan ${deletedNames.length - 5} lagi` : ''}. Sebab: ${reason || 'Pembersihan data'}`,
    });

    saveDatabase(db);
    res.json({
      success: true,
      deletedCount: targetStudents.length,
      deletedNames,
    });
  });

  // 6. Bulk Import Students
  app.post('/api/students/import', (req: Request, res: Response) => {
    const { list, user } = req.body;
    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ error: 'Data import tidak sah atau kosong.' });
    }

    const added: Student[] = [];
    const skipped: { name: string; reason: string }[] = [];
    const time = getMalaysiaTime();

    for (const item of list) {
      const name = item.name?.trim();
      const rawClass = item.className?.trim() || '';
      const rawYear = item.schoolYear?.trim() || '';
      // If rawYear contains class info (like "1 ARIF"), prefer that
      const classToNormalize = /^[1-6]\s*[a-zA-Z]+/i.test(rawYear) || /^PRA/i.test(rawYear)
        ? rawYear
        : rawClass;
      const className = normalizeClassName(classToNormalize || rawClass);
      const schoolYear = /^\d{4}$/.test(rawYear) ? rawYear : db.config.currentSchoolYear || '2026';
      const cleanMyKid = item.myKid ? item.myKid.replace(/[^0-9]/g, '') : '';

      if (!name || !className) {
        skipped.push({ name: name || 'Tiada Nama', reason: 'Nama atau kelas kosong' });
        continue;
      }

      // Check duplicates against existing DB and newly added
      const isDup =
        db.students.some((s) => {
          if (cleanMyKid && s.myKid) {
            const sClean = s.myKid.replace(/[^0-9]/g, '');
            if (sClean && sClean === cleanMyKid) return true;
          }
          return (
            s.name.toLowerCase().trim() === name.toLowerCase() &&
            s.className.toLowerCase().trim() === className.toLowerCase() &&
            s.schoolYear === schoolYear
          );
        }) ||
        added.some((s) => {
          if (cleanMyKid && s.myKid) {
            const sClean = s.myKid.replace(/[^0-9]/g, '');
            if (sClean && sClean === cleanMyKid) return true;
          }
          return (
            s.name.toLowerCase().trim() === name.toLowerCase() &&
            s.className.toLowerCase().trim() === className.toLowerCase() &&
            s.schoolYear === schoolYear
          );
        });

      if (isDup) {
        skipped.push({ name, reason: 'Rekod murid telah wujud (MyKid atau Nama+Kelas+Tahun sama)' });
        continue;
      }

      const newStudent: Student = {
        id: `std_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name,
        className,
        myKid: item.myKid?.trim() || '',
        parentName: item.parentName?.trim() || '',
        parentPhone: item.parentPhone?.trim() || '',
        schoolYear,
        createdAt: time.iso,
        updatedAt: time.iso,
      };

      added.push(newStudent);
      db.students.push(newStudent);
    }

    if (added.length > 0) {
      db.auditLogs.unshift({
        id: `log_${Date.now()}`,
        timestamp: time.iso,
        timestampMalaysia: time.formatted,
        action: 'IMPORT_MURID',
        performedBy: user?.name || 'Petugas',
        role: user?.role || 'Guru/Petugas',
        details: `Mengimport ${added.length} murid baharu (${skipped.length} dilepaskan kerana pendua/tidak sah).`,
      });
      saveDatabase(db);
    }

    res.json({ addedCount: added.length, skippedCount: skipped.length, added, skipped });
  });

  // 7. Record Payment Transaction (Strict Validation & Receipts)
  app.post('/api/transactions', (req: Request, res: Response) => {
    const {
      studentId,
      payerName,
      payerPhone,
      items, // array of { feeItemId, currentPaymentCents }
      paymentMethod,
      referenceNumber,
      notes,
      amountTenderedCents,
      changeReturnedCents,
      changeReturnedStatus,
      user,
    } = req.body;

    const student = db.students.find((s) => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Murid tidak ditemui.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Sila pilih sekurang-kurangnya satu perkara untuk dibayar.' });
    }

    // Calculate previously paid cents for each item from valid transactions
    const validStudentTransactions = db.transactions.filter(
      (tx) => tx.studentId === studentId && tx.status === 'Sah'
    );

    const previouslyPaidMap = new Map<string, number>();
    for (const tx of validStudentTransactions) {
      for (const it of tx.items) {
        const cur = previouslyPaidMap.get(it.feeItemId) || 0;
        previouslyPaidMap.set(it.feeItemId, cur + it.currentPaymentCents);
      }
    }

    let calculatedTotalCents = 0;
    const itemAllocations: Transaction['items'] = [];

    for (const entry of items) {
      const feeItem = db.feeItems.find((f) => f.id === entry.feeItemId);
      if (!feeItem) {
        return res.status(400).json({ error: `Perkara ID ${entry.feeItemId} tidak ditemui dalam sistem.` });
      }

      const payCents = parseInt(entry.currentPaymentCents, 10);
      if (isNaN(payCents) || payCents <= 0) {
        return res.status(400).json({
          error: `Amaun bayaran untuk "${feeItem.name}" mestilah lebih daripada RM0.00.`,
        });
      }

      const prevPaid = previouslyPaidMap.get(feeItem.id) || 0;
      const newAccumulated = prevPaid + payCents;

      // Check for overpayment unless approved by admin
      if (newAccumulated > feeItem.amountCents) {
        const excessCents = newAccumulated - feeItem.amountCents;
        return res.status(400).json({
          error: `Amaun bayaran untuk "${feeItem.name}" melebihi kadar rasmi! Kadar: RM${(feeItem.amountCents / 100).toFixed(2)}, Telah Dibayar: RM${(prevPaid / 100).toFixed(2)}, Bayaran Dicadangkan: RM${(payCents / 100).toFixed(2)} (Lebihan: RM${(excessCents / 100).toFixed(2)}).`,
        });
      }

      calculatedTotalCents += payCents;
      itemAllocations.push({
        feeItemId: feeItem.id,
        feeItemName: feeItem.name,
        feeRateCents: feeItem.amountCents,
        previouslyPaidCents: prevPaid,
        currentPaymentCents: payCents,
        remainingCentsAfter: feeItem.amountCents - newAccumulated,
      });
    }

    // Generate Monotonic Unique Receipt Number
    db.receiptCounter = (db.receiptCounter || 0) + 1;
    const yearStr = student.schoolYear || db.config.currentSchoolYear || '2026';
    const seqStr = String(db.receiptCounter).padStart(4, '0');
    const receiptNumber = `SKT/${yearStr}/${seqStr}`;

    const time = getMalaysiaTime();

    const newTransaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      receiptNumber,
      studentId: student.id,
      studentName: student.name,
      studentClass: student.className,
      schoolYear: student.schoolYear,
      payerName: payerName?.trim() || student.parentName || 'Ibu Bapa / Penjaga',
      payerPhone: payerPhone?.trim() || student.parentPhone || '',
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      totalAmountCents: calculatedTotalCents,
      items: itemAllocations,
      paymentMethod: paymentMethod || 'Tunai',
      referenceNumber: referenceNumber?.trim() || '',
      recordedBy: user?.name || 'Petugas',
      userRole: user?.role || 'Guru/Petugas',
      notes: notes?.trim() || '',
      amountTenderedCents: typeof amountTenderedCents === 'number' ? amountTenderedCents : calculatedTotalCents,
      changeReturnedCents: typeof changeReturnedCents === 'number' ? changeReturnedCents : 0,
      changeReturnedStatus: changeReturnedStatus || (typeof changeReturnedCents === 'number' && changeReturnedCents > 0 ? 'Sudah Dipulangkan' : 'Tiada Baki'),
      status: 'Sah',
      printCount: 1,
      classTeacherName: db.config.classTeachers?.[student.className] || '',
    };

    db.transactions.push(newTransaction);

    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      action: 'TAMBAH_BAYARAN',
      performedBy: user?.name || 'Petugas',
      role: user?.role || 'Guru/Petugas',
      details: `Merekodkan bayaran resit ${receiptNumber} sebanyak RM${(calculatedTotalCents / 100).toFixed(2)} bagi murid ${student.name} (${student.className}) melalui kaedah ${newTransaction.paymentMethod}.`,
      targetId: newTransaction.id,
    });

    saveDatabase(db);
    res.status(201).json(newTransaction);
  });

  // 8. Cancel Payment Transaction with Audit Trail
  app.post('/api/transactions/:id/cancel', (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, user } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ error: 'Sila nyatakan sebab pembatalan yang jelas (sekurang-kurangnya 5 aksara).' });
    }

    const txIndex = db.transactions.findIndex((t) => t.id === id);
    if (txIndex === -1) {
      return res.status(404).json({ error: 'Transaksi tidak ditemui.' });
    }

    const tx = db.transactions[txIndex];
    if (tx.status === 'Dibatalkan') {
      return res.status(400).json({ error: 'Transaksi ini telah sedia dibatalkan.' });
    }

    const time = getMalaysiaTime();
    tx.status = 'Dibatalkan';
    tx.cancellationReason = reason.trim();
    tx.cancelledBy = user?.name || 'Pentadbir';
    tx.cancelledAt = time.iso;

    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      action: 'BATAL_BAYARAN',
      performedBy: user?.name || 'Pentadbir',
      role: user?.role || 'Pentadbir',
      details: `MEMBATALKAN resit ${tx.receiptNumber} bernilai RM${(tx.totalAmountCents / 100).toFixed(2)} (${tx.studentName}). Sebab: "${reason.trim()}".`,
      targetId: tx.id,
    });

    saveDatabase(db);
    res.json(tx);
  });

  // 8c. Delete Transaction (Padam Pembayaran Tersalah Daftar)
  app.delete('/api/transactions/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, user } = req.body || {};

    const txIndex = db.transactions.findIndex((t) => t.id === id);
    if (txIndex === -1) {
      return res.status(404).json({ error: 'Transaksi tidak ditemui.' });
    }

    const tx = db.transactions[txIndex];
    const time = getMalaysiaTime();
    const reasonText = typeof reason === 'string' && reason.trim() ? reason.trim() : 'Tersalah daftarkan bayaran ke dalam sistem';

    // Remove from db.transactions
    db.transactions.splice(txIndex, 1);

    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      action: 'PADAM_BAYARAN',
      performedBy: user?.name || 'Pentadbir',
      role: user?.role || 'Pentadbir',
      details: `MEMADAM rekod bayaran resit ${tx.receiptNumber} bernilai RM${(tx.totalAmountCents / 100).toFixed(2)} bagi murid ${tx.studentName} (${tx.studentClass}). Sebab: "${reasonText}".`,
      targetId: id,
    });

    saveDatabase(db);
    res.json({ success: true, deletedTransactionId: id });
  });

  // 8b. Update / Edit Transaction (Kemas Kini Bayaran jika tersalah isi)
  app.put('/api/transactions/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      payerName,
      payerPhone,
      paymentMethod,
      referenceNumber,
      notes,
      amountTenderedCents,
      changeReturnedCents,
      changeReturnedStatus,
      items, // array of { feeItemId, currentPaymentCents }
      user,
    } = req.body;

    const txIndex = db.transactions.findIndex((t) => t.id === id);
    if (txIndex === -1) {
      return res.status(404).json({ error: 'Transaksi tidak ditemui.' });
    }

    const tx = db.transactions[txIndex];
    if (tx.status === 'Dibatalkan') {
      return res.status(400).json({ error: 'Transaksi yang telah dibatalkan tidak boleh dikemas kini.' });
    }

    const oldTotal = tx.totalAmountCents;
    if (payerName !== undefined) tx.payerName = payerName.trim();
    if (payerPhone !== undefined) tx.payerPhone = payerPhone ? payerPhone.trim() : '';
    if (paymentMethod !== undefined) tx.paymentMethod = paymentMethod;
    if (referenceNumber !== undefined) tx.referenceNumber = referenceNumber ? referenceNumber.trim() : '';
    if (notes !== undefined) tx.notes = notes ? notes.trim() : '';
    if (amountTenderedCents !== undefined) tx.amountTenderedCents = Number(amountTenderedCents);
    if (changeReturnedCents !== undefined) tx.changeReturnedCents = Number(changeReturnedCents);
    if (changeReturnedStatus !== undefined) tx.changeReturnedStatus = changeReturnedStatus;

    // If items were provided, recalculate allocations and new total
    if (Array.isArray(items)) {
      if (items.length === 0) {
        return res.status(400).json({ error: 'Sila pilih sekurang-kurangnya satu item bayaran atau batalkan transaksi jika tersalah isi sepenuhnya.' });
      }

      // Recalculate other valid transactions for this student
      const otherValidTxs = db.transactions.filter(
        (t) => t.studentId === tx.studentId && t.status === 'Sah' && t.id !== tx.id
      );

      const previouslyPaidMap = new Map<string, number>();
      for (const otherTx of otherValidTxs) {
        for (const it of otherTx.items) {
          previouslyPaidMap.set(it.feeItemId, (previouslyPaidMap.get(it.feeItemId) || 0) + it.currentPaymentCents);
        }
      }

      let newTotal = 0;
      const newAllocations: any[] = [];

      for (const itemInput of items) {
        const feeItem = db.feeItems.find((f) => f.id === itemInput.feeItemId);
        if (!feeItem) continue;

        const prevPaid = previouslyPaidMap.get(itemInput.feeItemId) || 0;
        const paymentCents = Math.max(0, Math.round(Number(itemInput.currentPaymentCents) || 0));
        if (paymentCents <= 0) continue;

        const remainingAfter = Math.max(0, feeItem.amountCents - (prevPaid + paymentCents));

        newAllocations.push({
          feeItemId: feeItem.id,
          feeItemName: feeItem.name,
          feeRateCents: feeItem.amountCents,
          previouslyPaidCents: prevPaid,
          currentPaymentCents: paymentCents,
          remainingCentsAfter: remainingAfter,
        });

        newTotal += paymentCents;
      }

      if (newAllocations.length === 0) {
        return res.status(400).json({ error: 'Sekurang-kurangnya satu item bayaran mesti mempunyai amaun sah lebih daripada RM0.' });
      }

      tx.items = newAllocations;
      tx.totalAmountCents = newTotal;
    }

    const time = getMalaysiaTime();
    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      action: 'KEMASKINI_BAYARAN',
      performedBy: user?.name || 'Pentadbir',
      role: user?.role || 'Pentadbir',
      details: `Mengemas kini maklumat resit bayaran ${tx.receiptNumber} (${tx.studentName}). Jumlah: RM${(oldTotal / 100).toFixed(2)} -> RM${(tx.totalAmountCents / 100).toFixed(2)}. Kaedah: ${tx.paymentMethod}.`,
      targetId: tx.id,
    });

    saveDatabase(db);
    res.json(tx);
  });

  // 8c. Mark Change as Returned to Student
  app.post('/api/transactions/:id/return-change', (req: Request, res: Response) => {
    const { id } = req.params;
    const { user, status } = req.body;
    const tx = db.transactions.find((t) => t.id === id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaksi tidak ditemui.' });
    }
    tx.changeReturnedStatus = status || 'Sudah Dipulangkan';
    const time = getMalaysiaTime();
    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: time.iso,
      timestampMalaysia: time.formatted,
      action: 'KEMASKINI_BAYARAN',
      performedBy: user?.name || 'Petugas',
      role: user?.role || 'Guru/Petugas',
      details: `Menandakan baki bayaran RM${((tx.changeReturnedCents || 0) / 100).toFixed(2)} bagi resit ${tx.receiptNumber} (${tx.studentName}) telah diserahkan/dipulangkan kepada murid.`,
      targetId: tx.id,
    });
    saveDatabase(db);
    res.json(tx);
  });

  // 9. Increment Print Count (Reprint Tracking)
  app.post('/api/transactions/:id/printed', (req: Request, res: Response) => {
    const { id } = req.params;
    const tx = db.transactions.find((t) => t.id === id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaksi tidak ditemui.' });
    }
    tx.printCount = (tx.printCount || 1) + 1;
    saveDatabase(db);
    res.json({ printCount: tx.printCount });
  });

  // 10. CSV Export Endpoints
  app.get('/api/export/:type', (req: Request, res: Response) => {
    const { type } = req.params;

    if (type === 'students') {
      // Export Students with payment summary based on parent chosen needs
      const headers = ['Bil', 'Nama Murid', 'Kelas', 'Sesi', 'MyKid', 'Nama Penjaga', 'Telefon Penjaga', 'Jumlah Dibayar Mengikut Keperluan (RM)', 'Status Bayaran'];

      const rows = db.students.map((std, i) => {
        const studentTxs = db.transactions.filter((tx) => tx.studentId === std.id && tx.status === 'Sah');
        const paidCents = studentTxs.reduce((s, tx) => s + tx.totalAmountCents, 0);
        const status = paidCents > 0 ? 'Telah Membayar Keperluan' : 'Belum Ada Bayaran';

        return [
          i + 1,
          `"${std.name.replace(/"/g, '""')}"`,
          `"${std.className}"`,
          std.schoolYear,
          std.myKid ? `"${std.myKid}"` : '-',
          `"${(std.parentName || '-').replace(/"/g, '""')}"`,
          `"${std.parentPhone || '-'}"`,
          (paidCents / 100).toFixed(2),
          status,
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="Rekod_Murid_SK_Tudan.csv"');
      return res.send(csvContent);
    }

    if (type === 'transactions') {
      const headers = ['Bil', 'No Resit', 'Tarikh & Masa (MYT)', 'Nama Murid', 'Kelas', 'Tahun', 'Pembayar', 'Kaedah', 'No Rujukan', 'Jumlah (RM)', 'Petugas', 'Status', 'Catatan'];
      const rows = db.transactions.map((tx, i) => [
        i + 1,
        tx.receiptNumber,
        `"${tx.timestampMalaysia || tx.timestamp}"`,
        `"${tx.studentName.replace(/"/g, '""')}"`,
        `"${tx.studentClass}"`,
        tx.schoolYear,
        `"${(tx.payerName || '-').replace(/"/g, '""')}"`,
        tx.paymentMethod,
        `"${tx.referenceNumber || '-'}"`,
        (tx.totalAmountCents / 100).toFixed(2),
        `"${tx.recordedBy}"`,
        tx.status,
        `"${(tx.notes || '').replace(/"/g, '""')}"`,
      ].join(','));

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="Transaksi_Yuran_SK_Tudan.csv"');
      return res.send(csvContent);
    }

    if (type === 'fee-summary') {
      const headers = ['Bil', 'Kod', 'Perkara / Keperluan', 'Kadar Rasmi (RM)', 'Jumlah Kutipan (RM)', 'Bilangan Murid Membayar Penuh', 'Bilangan Murid Bayar Sebahagian'];
      const validTxs = db.transactions.filter((tx) => tx.status === 'Sah');

      const rows = db.feeItems.map((item, i) => {
        let totalCollectedCents = 0;
        let fullyPaidCount = 0;
        let partialPaidCount = 0;

        // Check each student
        for (const std of db.students) {
          let stdItemPaidCents = 0;
          for (const tx of validTxs) {
            if (tx.studentId === std.id) {
              const it = tx.items.find((x) => x.feeItemId === item.id);
              if (it) stdItemPaidCents += it.currentPaymentCents;
            }
          }
          if (stdItemPaidCents >= item.amountCents) {
            fullyPaidCount++;
          } else if (stdItemPaidCents > 0) {
            partialPaidCount++;
          }
          totalCollectedCents += stdItemPaidCents;
        }

        return [
          i + 1,
          item.code,
          `"${item.name.replace(/"/g, '""')}"`,
          (item.amountCents / 100).toFixed(2),
          (totalCollectedCents / 100).toFixed(2),
          fullyPaidCount,
          partialPaidCount,
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="Ringkasan_Kutipan_Perkara_SK_Tudan.csv"');
      return res.send(csvContent);
    }

    res.status(400).json({ error: 'Jenis eksport tidak diketahui.' });
  });

  // --- Vite Dev or Production Static Serving ---
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server SK Tudan berjalan di port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal memulakan server:', err);
});
