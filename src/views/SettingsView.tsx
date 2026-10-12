import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AdminOfficer, FeeItem, SchoolConfig, UserRole } from '../types';
import { formatRM, rmToCents, centsToRM } from '../utils/currency';
import { ALL_STANDARD_CLASSES, parseClassInfo, SCHOOL_LEVELS } from '../utils/classes';
import {
  generateSampleSchoolLogo,
  generateSampleSchoolStamp,
  generateSampleSignature,
} from '../utils/sampleLogo';
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
  FileText,
  FileSpreadsheet,
  File,
  Check,
  Search,
  Sparkles,
  Download,
  Users,
  Camera,
  RefreshCw,
  HelpCircle,
  UserCog,
  ShieldCheck,
  CheckCircle2,
  Building,
  UserCheck,
  Phone,
  Mail,
  Award,
  Crown,
  Eye,
  FileSignature,
  Stamp,
  PenTool,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    feeItems,
    updateFeeItems,
    config,
    updateConfig,
    updateClassTeachers,
    parseClassTeachersFile,
    currentUser,
    setCurrentUser,
    students,
  } = useApp();

  // Active Tab: 'logo' (Muat Naik Logo), 'admins' (Nama Pentadbir Manual), 'teachers' (Guru Kelas & Dokumen), 'signatory' (Tandatangan & Cop Resit), 'rates' (Kadar & Konfigurasi)
  const [activeTab, setActiveTab] = useState<'logo' | 'admins' | 'teachers' | 'signatory' | 'rates'>('logo');

  // Local state for fee items & school config
  const [items, setItems] = useState<FeeItem[]>(feeItems);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(config);
  const [logoPreview, setLogoPreview] = useState<string>(config.logoBase64 || '');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  // Local state for manual admin settings
  const [adminName, setAdminName] = useState<string>(config.adminName || 'LIM AI GIOK');
  const [adminTitle, setAdminTitle] = useState<string>(config.adminTitle || 'Guru Besar');
  const [headmasterName, setHeadmasterName] = useState<string>(config.headmasterName || 'LIM AI GIOK');
  const [adminPhone, setAdminPhone] = useState<string>(config.adminList?.[0]?.phone || '019-8834111');
  const [adminList, setAdminList] = useState<AdminOfficer[]>(config.adminList || []);
  const [isSavingAdmins, setIsSavingAdmins] = useState<boolean>(false);

  // New admin officer input state
  const [newOfficerName, setNewOfficerName] = useState<string>('');
  const [newOfficerDesignation, setNewOfficerDesignation] = useState<string>('Guru Besar');
  const [newOfficerRole, setNewOfficerRole] = useState<UserRole>('Pentadbir');
  const [newOfficerPhone, setNewOfficerPhone] = useState<string>('');

  // Local state for class teachers
  const [teachersMap, setTeachersMap] = useState<Record<string, string>>(config.classTeachers || {});
  const [teacherSearch, setTeacherSearch] = useState<string>('');
  const [teacherLevelFilter, setTeacherLevelFilter] = useState<string>('Semua');
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);
  const [docUploadError, setDocUploadError] = useState<string>('');
  const [extractedPreview, setExtractedPreview] = useState<{
    fileName: string;
    totalFound: number;
    items: { className: string; teacherName: string }[];
  } | null>(null);

  // Signatory & Stamp States
  const [signatoryMode, setSignatoryMode] = useState<'custom' | 'class_teacher' | 'recorder'>(
    config.receiptSignatoryMode || 'custom'
  );
  const [signatoryName, setSignatoryName] = useState<string>(
    config.receiptSignatoryName || config.adminName || 'LIM AI GIOK'
  );
  const [signatoryTitle, setSignatoryTitle] = useState<string>(
    config.receiptSignatoryTitle || 'Guru Besar'
  );
  const [stampText, setStampText] = useState<string>(
    config.receiptStampText || 'COP RASMI SK TUDAN YBA4111 MIRI'
  );
  const [signaturePreview, setSignaturePreview] = useState<string>(
    config.receiptSignatureBase64 || ''
  );
  const [stampPreview, setStampPreview] = useState<string>(
    config.receiptStampBase64 || ''
  );
  const [showSignatureStamp, setShowSignatureStamp] = useState<boolean>(
    config.showSignatureStampOnReceipt !== false
  );
  const [showTeacherSig, setShowTeacherSig] = useState<boolean>(
    config.showTeacherSignature !== false
  );
  const [isSavingSignatory, setIsSavingSignatory] = useState<boolean>(false);

  // Sync if context updates
  React.useEffect(() => {
    setItems(feeItems);
  }, [feeItems]);

  React.useEffect(() => {
    setSchoolConfig(config);
    setLogoPreview(config.logoBase64 || '');
    if (config.classTeachers) {
      setTeachersMap(config.classTeachers);
    }
    if (config.adminName) setAdminName(config.adminName);
    if (config.adminTitle) setAdminTitle(config.adminTitle);
    if (config.headmasterName) setHeadmasterName(config.headmasterName);
    if (config.adminList && config.adminList.length > 0) {
      setAdminList(config.adminList);
    }
    if (config.receiptSignatoryMode) setSignatoryMode(config.receiptSignatoryMode);
    if (config.receiptSignatoryName) setSignatoryName(config.receiptSignatoryName);
    if (config.receiptSignatoryTitle) setSignatoryTitle(config.receiptSignatoryTitle);
    if (config.receiptStampText) setStampText(config.receiptStampText);
    if (config.receiptSignatureBase64) setSignaturePreview(config.receiptSignatureBase64);
    if (config.receiptStampBase64) setStampPreview(config.receiptStampBase64);
    if (config.showSignatureStampOnReceipt !== undefined) setShowSignatureStamp(config.showSignatureStampOnReceipt);
    if (config.showTeacherSignature !== undefined) setShowTeacherSig(config.showTeacherSignature);
  }, [config]);

  // Combine standard classes + any dynamic classes from existing students
  const allClasses = useMemo(() => {
    const set = new Set<string>(ALL_STANDARD_CLASSES);
    for (const s of students) {
      if (s.className) set.add(s.className.trim().toUpperCase());
    }
    return Array.from(set).sort((a, b) => {
      const idxA = ALL_STANDARD_CLASSES.indexOf(a);
      const idxB = ALL_STANDARD_CLASSES.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [students]);

  // Filtered classes in the teachers table
  const filteredClasses = useMemo(() => {
    const q = teacherSearch.toLowerCase().trim();
    return allClasses.filter((cls) => {
      const teacher = (teachersMap[cls] || '').toLowerCase();
      const matchSearch = !q || cls.toLowerCase().includes(q) || teacher.includes(q);
      const { level } = parseClassInfo(cls);
      const matchLevel = teacherLevelFilter === 'Semua' || level === teacherLevelFilter;
      return matchSearch && matchLevel;
    });
  }, [allClasses, teachersMap, teacherSearch, teacherLevelFilter]);

  // Handle single teacher name change
  const handleTeacherChange = (className: string, name: string) => {
    setTeachersMap((prev) => ({
      ...prev,
      [className]: name,
    }));
  };

  // Handle bulk file upload (PDF, Word, CSV, Excel, Image)
  const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocUploadError('');
    setIsUploadingDoc(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const res = await parseClassTeachersFile(base64, file.name, file.type);
        setIsUploadingDoc(false);

        if (!res.success || !res.extracted || res.extracted.length === 0) {
          setDocUploadError(res.error || 'Gagal mengekstrak maklumat guru kelas daripada fail ini.');
          return;
        }

        setExtractedPreview({
          fileName: file.name,
          totalFound: res.extracted.length,
          items: res.extracted,
        });
      };

      reader.onerror = () => {
        setIsUploadingDoc(false);
        setDocUploadError('Ralat membaca fail.');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingDoc(false);
      setDocUploadError(err.message || 'Ralat semasa memuat naik fail.');
    } finally {
      // Reset input
      e.target.value = '';
    }
  };

  // Apply extracted preview to current teachersMap
  const handleApplyExtracted = async () => {
    if (!extractedPreview) return;

    const updated = { ...teachersMap };
    for (const item of extractedPreview.items) {
      if (item.className && item.teacherName) {
        updated[item.className] = item.teacherName;
      }
    }

    setTeachersMap(updated);
    setIsSaving(true);
    setStatusMsg(null);

    const res = await updateClassTeachers(updated);
    setIsSaving(false);

    if (res.success) {
      setStatusMsg({
        type: 'success',
        text: `Berjaya memadankan dan menyimpan ${extractedPreview.items.length} maklumat guru kelas daripada fail "${extractedPreview.fileName}"! Slip resit kini dikemas kini secara automatik.`,
      });
      setExtractedPreview(null);
    } else {
      setStatusMsg({
        type: 'error',
        text: res.error || 'Gagal menyimpan maklumat guru kelas ke pangkalan data.',
      });
    }
  };

  // Save manual teacher changes
  const handleSaveTeachers = async () => {
    setIsSaving(true);
    setStatusMsg(null);

    const res = await updateClassTeachers(teachersMap);
    setIsSaving(false);

    if (res.success) {
      setStatusMsg({
        type: 'success',
        text: 'Senarai nama guru kelas berjaya disimpan! Semua slip resit pembayaran kini menyertakan nama guru kelas secara automatik mengikut kelas.',
      });
    } else {
      setStatusMsg({
        type: 'error',
        text: res.error || 'Gagal menyimpan maklumat guru kelas.',
      });
    }
  };

  // Export current teachers list to CSV
  const handleExportTeachersCsv = () => {
    const headers = ['Bil', 'Kelas', 'Nama Guru Kelas', 'Status'];
    const rows = allClasses.map((cls, idx) => {
      const teacher = teachersMap[cls] || '';
      return [
        idx + 1,
        `"${cls}"`,
        `"${teacher.replace(/"/g, '""')}"`,
        teacher ? 'Telah Diisi' : 'Belum Diisi',
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Senarai_Guru_Kelas_SK_Tudan_${schoolConfig.currentSchoolYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  // Logo file upload handler with canvas optimization
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMsg({ type: 'error', text: 'Sila muat naik fail gambar yang sah (PNG, JPG, JPEG).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      // Auto optimize and scale image to max 512px for crisp quality and fast cloud sync
      const img = new Image();
      img.onload = () => {
        const maxDim = 512;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const optimized = canvas.toDataURL('image/png');
          setLogoPreview(optimized);
          setSchoolConfig((prev) => ({ ...prev, logoBase64: optimized }));
          return;
        }
        setLogoPreview(rawBase64);
        setSchoolConfig((prev) => ({ ...prev, logoBase64: rawBase64 }));
      };
      img.onerror = () => {
        setLogoPreview(rawBase64);
        setSchoolConfig((prev) => ({ ...prev, logoBase64: rawBase64 }));
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  // Dedicated Save Logo Handler (One-click direct save)
  const handleSaveLogoOnly = async (customBase64?: string) => {
    const toSave = customBase64 !== undefined ? customBase64 : logoPreview;
    setIsSavingLogo(true);
    setStatusMsg(null);
    try {
      if (toSave) {
        try {
          localStorage.setItem('sk_tudan_school_logo', toSave);
        } catch {}
      } else {
        try {
          localStorage.removeItem('sk_tudan_school_logo');
        } catch {}
      }

      const res = await updateConfig({ logoBase64: toSave });
      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: toSave
            ? 'Gambar logo rasmi sekolah berjaya dimuat naik & disimpan ke pangkalan data cloud! Logo kini dipaparkan pada sistem dan kedua-dua salinan resit bayaran (Salinan Ibu Bapa & Salinan Sekolah) untuk semua guru dan peranti.'
            : 'Logo sekolah berjaya dipadam dari sistem.',
        });
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Gagal menyimpan logo sekolah.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Ralat semasa menyimpan logo.' });
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleUseSampleLogo = async () => {
    const sample = generateSampleSchoolLogo();
    setLogoPreview(sample);
    setSchoolConfig((prev) => ({ ...prev, logoBase64: sample }));
    await handleSaveLogoOnly(sample);
  };

  const handleRemoveLogo = async () => {
    setLogoPreview('');
    setSchoolConfig((prev) => ({ ...prev, logoBase64: '' }));
    await handleSaveLogoOnly('');
  };

  // Save manual admin configurations
  const handleSaveAdmins = async () => {
    if (!adminName.trim()) {
      setStatusMsg({ type: 'error', text: 'Sila masukkan nama pentadbir sekolah.' });
      return;
    }
    setIsSavingAdmins(true);
    setStatusMsg(null);
    try {
      // Sync primary officer in list
      const updatedList = adminList.map((a) => {
        if (a.isPrimary) {
          return { ...a, name: adminName.trim(), designation: adminTitle.trim(), phone: adminPhone.trim() };
        }
        return a;
      });

      const res = await updateConfig({
        adminName: adminName.trim(),
        adminTitle: adminTitle.trim(),
        headmasterName: headmasterName.trim(),
        adminList: updatedList,
      });

      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: `Tetapan pentadbir berjaya disimpan! Pentadbir utama: "${adminName}" (${adminTitle}). Profil sistem telah dikemas kini.`,
        });
        // If current user is Admin, auto-sync their active session display name
        if (currentUser.role === 'Pentadbir') {
          setCurrentUser({
            name: adminTitle ? `${adminName.trim()} (${adminTitle.trim()})` : adminName.trim(),
            role: 'Pentadbir',
          });
        }
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Gagal menyimpan maklumat pentadbir.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Ralat menyimpan maklumat pentadbir.' });
    } finally {
      setIsSavingAdmins(false);
    }
  };

  // Add new admin officer manually
  const handleAddOfficer = () => {
    if (!newOfficerName.trim()) {
      setStatusMsg({ type: 'error', text: 'Sila masukkan nama pegawai pentadbir yang ingin ditambah.' });
      return;
    }
    const newOfficer: AdminOfficer = {
      id: `adm_${Date.now()}`,
      name: newOfficerName.trim(),
      designation: newOfficerDesignation.trim() || 'Pegawai Pentadbir',
      role: newOfficerRole,
      phone: newOfficerPhone.trim() || undefined,
      isPrimary: false,
    };
    const updated = [...adminList, newOfficer];
    setAdminList(updated);
    setNewOfficerName('');
    setNewOfficerPhone('');
    setStatusMsg({
      type: 'success',
      text: `Pegawai "${newOfficer.name}" berjaya ditambah ke senarai! Klik "Simpan Tetapan Pentadbir" di atas untuk menyimpan ke pangkalan data.`,
    });
  };

  // Switch active user session directly from settings
  const handleSetActiveUserToOfficer = (officer: AdminOfficer) => {
    const displayName = officer.designation ? `${officer.name} (${officer.designation})` : officer.name;
    setCurrentUser({
      name: displayName,
      role: officer.role,
    });
    setStatusMsg({
      type: 'success',
      text: `Sesi pengguna kini bertukar kepada "${displayName}" (Peranan: ${officer.role}).`,
    });
  };

  // Set officer as primary admin
  const handleSetPrimaryOfficer = (officerId: string) => {
    const target = adminList.find((a) => a.id === officerId);
    if (!target) return;
    setAdminName(target.name);
    if (target.designation) setAdminTitle(target.designation);
    if (target.phone) setAdminPhone(target.phone);
    const updated = adminList.map((a) => ({
      ...a,
      isPrimary: a.id === officerId,
    }));
    setAdminList(updated);
    setStatusMsg({
      type: 'success',
      text: `"${target.name}" dipilih sebagai Pentadbir Utama. Klik "Simpan Tetapan Pentadbir" untuk mengesahkan.`,
    });
  };

  // Remove officer
  const handleRemoveOfficer = (officerId: string) => {
    const officer = adminList.find((a) => a.id === officerId);
    if (officer?.isPrimary) {
      setStatusMsg({ type: 'error', text: 'Tidak boleh memadam pentadbir utama yang sedang aktif.' });
      return;
    }
    const updated = adminList.filter((a) => a.id !== officerId);
    setAdminList(updated);
    setStatusMsg({ type: 'success', text: 'Pegawai pentadbir telah dipadam daripada senarai.' });
  };

  // List of all registered teachers (Headmaster, Admin officers, and all 42 Class Teachers)
  const teacherOptions = useMemo(() => {
    const list: { name: string; title: string; category: string }[] = [];

    // Headmaster / Primary Admin
    if (adminName) {
      list.push({
        name: adminName.trim(),
        title: adminTitle || 'Guru Besar',
        category: 'Pentadbir Utama',
      });
    }

    // Other Admin Officers
    for (const officer of adminList) {
      if (officer.name && officer.name.trim() !== adminName.trim()) {
        list.push({
          name: officer.name.trim(),
          title: officer.designation || 'Pegawai Pentadbir',
          category: 'Pegawai Pentadbir',
        });
      }
    }

    // Class Teachers
    const seenNames = new Set<string>([adminName.trim().toLowerCase()]);
    for (const [cls, tName] of Object.entries(teachersMap)) {
      if (tName && tName.trim() && !seenNames.has(tName.trim().toLowerCase())) {
        seenNames.add(tName.trim().toLowerCase());
        list.push({
          name: tName.trim(),
          title: `Guru Kelas (${cls})`,
          category: 'Guru Kelas',
        });
      }
    }

    return list;
  }, [adminName, adminTitle, adminList, teachersMap]);

  // Select teacher from dropdown
  const handleSelectSignatoryTeacher = (t: { name: string; title: string }) => {
    setSignatoryName(t.name);
    setSignatoryTitle(t.title);
    setStatusMsg({
      type: 'success',
      text: `Nama guru "${t.name}" (${t.title}) dipilih sebagai penandatangan resit. Klik "Simpan Tetapan Tandatangan & Cop Resit" untuk mengesahkan.`,
    });
  };

  // Signature image upload with canvas optimization
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMsg({ type: 'error', text: 'Sila muat naik fail gambar tandatangan yang sah (PNG, JPG).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = 400;
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const optimized = canvas.toDataURL('image/png');
          setSignaturePreview(optimized);
          return;
        }
        setSignaturePreview(rawBase64);
      };
      img.onerror = () => setSignaturePreview(rawBase64);
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  // Stamp image upload with canvas optimization
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMsg({ type: 'error', text: 'Sila muat naik fail gambar cop yang sah (PNG, JPG).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const optimized = canvas.toDataURL('image/png');
          setStampPreview(optimized);
          return;
        }
        setStampPreview(rawBase64);
      };
      img.onerror = () => setStampPreview(rawBase64);
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  const handleUseSampleStamp = () => {
    const sample = generateSampleSchoolStamp(signatoryTitle || 'GURU BESAR');
    setStampPreview(sample);
  };

  const handleUseSampleSignature = () => {
    const sample = generateSampleSignature(signatoryName || 'Lim Ai Giok');
    setSignaturePreview(sample);
  };

  const handleClearSignature = () => {
    setSignaturePreview('');
  };

  const handleClearStamp = () => {
    setStampPreview('');
  };

  const handleSaveSignatory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSignatory(true);
    setStatusMsg(null);
    try {
      const payload: Partial<SchoolConfig> = {
        receiptSignatoryMode: signatoryMode,
        receiptSignatoryName: signatoryName.trim(),
        receiptSignatoryTitle: signatoryTitle.trim(),
        receiptStampText: stampText.trim(),
        receiptSignatureBase64: signaturePreview,
        receiptStampBase64: stampPreview,
        showSignatureStampOnReceipt: showSignatureStamp,
        showTeacherSignature: showTeacherSig,
      };

      const res = await updateConfig(payload);
      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: 'Tetapan tandatangan dan cop rasmi resit berjaya disimpan dan disegerakkan ke cloud! Resit kini sedia dicetak dengan nama guru dan jawatan yang dipilih.',
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: res.error || 'Gagal menyimpan tetapan tandatangan dan cop.',
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Ralat semasa menyimpan tetapan tandatangan dan cop.',
      });
    } finally {
      setIsSavingSignatory(false);
    }
  };

  // Calculate total fee of active items
  const activeTotalCents = items
    .filter((it) => it.active)
    .reduce((s, it) => s + it.amountCents, 0);

  const handleSaveAllConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    try {
      const resConfig = await updateConfig(schoolConfig);
      if (!resConfig.success) {
        throw new Error(resConfig.error || 'Gagal menyimpan tetapan sekolah.');
      }

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

  // Allow all school staff to access settings, with a quick toggle for admin mode if needed
  const isTeacherView = currentUser.role !== 'Pentadbir';

  // Count filled teachers
  const totalClassesCount = allClasses.length;
  const filledTeachersCount = Object.values(teachersMap).filter((t) => t && t.trim()).length;

  return (
    <div className="space-y-6">
      {isTeacherView && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-xs">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Log masuk sebagai <strong>{currentUser.name}</strong> ({currentUser.email || 'Guru/Petugas'}). Maklumat sekolah, logo, dan senarai guru kelas disegerakkan secara langsung untuk semua pengguna.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentUser({ ...currentUser, role: 'Pentadbir' })}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
          >
            Buka Kuasa Ubah Pentadbir
          </button>
        </div>
      )}

      {/* Header with Navigation Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Tetapan & Konfigurasi Rasmi
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-semibold">{schoolConfig.schoolName}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {activeTab === 'logo' && 'Ruang Muat Naik Gambar Logo Rasmi Sekolah'}
            {activeTab === 'admins' && 'Tetapan Nama Pentadbir & Pegawai (Manual)'}
            {activeTab === 'teachers' && 'Pengurusan Guru Kelas & Slip Resit Pembayaran'}
            {activeTab === 'signatory' && 'Tetapan Tandatangan & Cop Rasmi Resit Bayaran'}
            {activeTab === 'rates' && 'Pengurusan Kadar Yuran & Maklumat Sekolah'}
          </h1>
          <p className="text-xs text-slate-500">
            {activeTab === 'logo' && 'Muat naik gambar logo / lencana rasmi sekolah untuk dicetak pada kedua-dua salinan resit bayaran murid (Salinan Ibu Bapa & Salinan Sekolah).'}
            {activeTab === 'admins' && 'Sertakan dan tetapkan nama pentadbir sekolah, jawatan rasmi, guru besar, dan pegawai pengurusan secara manual dalam sistem.'}
            {activeTab === 'teachers' && 'Masukkan nama guru kelas atau muat naik dokumen (PDF, Word, CSV, Excel, Gambar) untuk dipadankan secara auto pada slip resit.'}
            {activeTab === 'signatory' && 'Pilih nama guru dan jawatan rasmi penandatangan yang dicetak pada slip resit murid, muat naik cop rasmi sekolah, dan semak pratonton masa nyata.'}
            {activeTab === 'rates' && 'Tetapkan kadar rasmi untuk sesi persekolahan dan profil maklumat sekolah.'}
          </p>
        </div>

        {/* Tab Switcher Buttons (5 Dedicated Tabs) */}
        <div className="flex items-center flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start xl:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'logo'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Logo Sekolah {logoPreview ? '✓' : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admins')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'admins'
                ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCog className="w-3.5 h-3.5 text-indigo-600" />
            <span>Nama Pentadbir (Manual)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'teachers'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Guru Kelas ({filledTeachersCount}/{totalClassesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('signatory')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'signatory'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSignature className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tandatangan & Cop Resit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rates')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'rates'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            <span>Kadar Yuran</span>
          </button>
        </div>
      </div>

      {/* Status Notification Message */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center space-x-2.5 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-medium'
              : 'bg-red-50 border-red-200 text-red-900 font-medium'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: MUAT NAIK GAMBAR LOGO SEKOLAH (DEDICATED SECTION)        */}
      {/* ============================================================== */}
      {activeTab === 'logo' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl p-5 shadow-sm border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Visual & Penjenamaan Rasmi
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-300">Resit Ibu Bapa & Salinan Sekolah</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Ruang Muat Naik Gambar Logo Sekolah
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Muat naik gambar logo / lencana sekolah anda di sini. Logo yang disimpan akan dipaparkan secara automatik di kepala semua slip resit pembayaran murid (kedua-dua Salinan Ibu Bapa & Salinan Rekod Sekolah) dan pada navigasi atas sistem.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={handleUseSampleLogo}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition flex items-center space-x-1.5 cursor-pointer"
                title="Gunakan contoh lencana rasmi SK Tudan jika belum ada fail logo fizikal"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Gunakan Logo Contoh SK Tudan</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveLogoOnly()}
                disabled={isSavingLogo}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingLogo ? 'Menyimpan...' : 'Simpan Logo Sekolah'}</span>
              </button>
            </div>
          </div>

          {/* Main Grid: Upload Area on Left, Live Mock Preview on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left 7 Cols: Upload Box & Configuration */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <span>Muat Naik Fail Gambar Logo</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pilih gambar dari komputer atau telefon pintar anda (PNG, JPG, JPEG, WEBP, SVG).
                    </p>
                  </div>
                  {logoPreview && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Logo Aktif</span>
                    </span>
                  )}
                </div>

                {/* Drop / Select Zone */}
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 bg-slate-50/70 hover:bg-emerald-50/20 transition text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <Upload className="w-8 h-8 text-emerald-600" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Klik butang di bawah untuk memilih fail gambar logo sekolah
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Disyorkan gambar logo berformat <strong>PNG lutsinar (transparent)</strong> atau <strong>JPG beresolusi tajam</strong> dengan nisbah 1:1 (cth: 200x200px hingga 600x600px).
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <label className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition">
                      <Upload className="w-4 h-4" />
                      <span>Pilih Gambar Logo dari Peranti</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {logoPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Padam Logo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tips & Recommendations */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    <span>Panduan Kualiti Logo Resit:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                    <li>Gunakan logo sekolah dengan latar belakang jernih/lutsinar (PNG) untuk hasil cetakan paling kemas.</li>
                    <li>Sistem secara automatik mengekalkan nisbah aspek logo supaya tidak herot atau pecah pada dokumen PDF.</li>
                    <li>Logo akan dicetak pada sudut kiri atas kedua-dua halaman resit (Salinan Ibu Bapa dan Salinan Rekod Sekolah).</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Live Real-time Slip Preview */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Card 1: Large Preview Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pratonton Gambar Logo Semasa
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {logoPreview ? 'Telah Ditetapkan' : 'Tiada Logo'}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 min-h-[160px]">
                  {logoPreview ? (
                    <div className="space-y-3 text-center">
                      <div className="w-32 h-32 rounded-xl bg-white p-2 border-2 border-emerald-400/60 shadow-md flex items-center justify-center mx-auto">
                        <img
                          src={logoPreview}
                          alt="Logo Sekolah SK Tudan"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <p className="text-xs font-bold text-emerald-800">
                        ✓ Logo Rasmi SK Tudan Aktif
                      </p>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 space-y-2">
                      <div className="w-16 h-16 rounded-2xl bg-slate-200/60 flex items-center justify-center mx-auto text-slate-400">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        Belum ada gambar logo dimuat naik.<br />Lencana lalai teks akan digunakan.
                      </p>
                    </div>
                  )}
                </div>

                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => handleSaveLogoOnly()}
                    disabled={isSavingLogo}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingLogo ? 'Menyimpan...' : 'Simpan Logo Ini Ke Sistem'}</span>
                  </button>
                )}
              </div>

              {/* Card 2: Realistic Mock Slip Header */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Simulasi Rupa Pada Slip Resit Rasmi</span>
                  </h3>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-600">
                    Live Mockup
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Berikut adalah gambaran bagaimana kepala resit pembayaran murid akan kelihatan semasa dicetak atau disimpan sebagai PDF:
                </p>

                {/* Simulated Receipt Header Box */}
                <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-sm font-sans space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 text-[9px] text-slate-500 font-mono">
                    <span>NO RESIT: SKT/2026/0001</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                      [ SALINAN IBU BAPA ]
                    </span>
                  </div>

                  <div className="flex items-start space-x-3">
                    {logoPreview ? (
                      <div className="w-12 h-12 rounded border border-slate-200 bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                        <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded border border-slate-600 bg-slate-50 flex flex-col items-center justify-center text-center p-0.5 shrink-0">
                        <span className="text-[9px] font-black leading-tight text-slate-900">SK TUDAN</span>
                        <span className="text-[7px] text-slate-600">MIRI</span>
                        <span className="text-[6px] font-mono text-slate-500">{schoolConfig.schoolCode || 'YBA4111'}</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-slate-900 uppercase leading-tight truncate">
                        {schoolConfig.schoolName}
                      </div>
                      <div className="text-[9px] text-slate-600 leading-tight">
                        KOD: {schoolConfig.schoolCode} • {schoolConfig.schoolAddress}
                      </div>
                      <div className="text-[9px] font-bold text-slate-800 uppercase tracking-tight mt-0.5">
                        RESIT RASMI PEMBAYARAN KEPERLUAN & GAMBAR
                      </div>
                      <div className="text-[8px] text-slate-500 font-mono">
                        SESI PERSEKOLAHAN: {schoolConfig.currentSchoolYear}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded p-2 text-[9px] border border-slate-200 flex justify-between font-mono text-slate-600">
                    <span>Murid: Muhammad Danial</span>
                    <span>Kelas: 3 ARIF</span>
                    <span className="font-bold text-emerald-800">Jumlah: RM50.00</span>
                  </div>
                </div>

                <p className="text-[10px] text-emerald-800 font-medium text-center">
                  ✓ Logo di atas diselaraskan secara automatik ke fail PDF 1-Halaman & 2-Halaman
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: TETAPAN NAMA PENTADBIR SECARA MANUAL                      */}
      {/* ============================================================== */}
      {activeTab === 'admins' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 text-white rounded-2xl p-5 shadow-sm border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Tetapan Manual Pentadbir
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-300">Pengurusan Profil & Akses Sistem</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Tetapan Pentadbir Sekolah (LIM AI GIOK - Guru Besar)
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sistem rekod yuran dan keperluan persekolahan ini diuruskan secara rasmi di bawah Guru Besar (LIM AI GIOK). Maklumat ini disegerakkan secara langsung ke pemilih pengguna sistem, pengesahan resit, dan jejak audit rasmi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={handleSaveAdmins}
                disabled={isSavingAdmins}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-extrabold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingAdmins ? 'Menyimpan...' : 'Simpan Tetapan Pentadbir'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left 7 Cols: Primary Admin & Headmaster Form */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Primary Admin Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <UserCog className="w-4 h-4 text-indigo-600" />
                      <span>Maklumat Pentadbir Utama (Input Manual)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Nama dan jawatan pentadbir yang bertanggungjawab ke atas sistem rekod yuran ini.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded text-[10px] font-bold">
                    Pentadbir Utama
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Nama Pentadbir Sekolah <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Contoh: LIM AI GIOK"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Nama ini akan dipaparkan dalam profil Pentadbir di bahagian atas bar navigasi.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Jawatan / Gelaran Pentadbir <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={adminTitle}
                        onChange={(e) => setAdminTitle(e.target.value)}
                        placeholder="Contoh: Guru Besar"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        No. Telefon Pentadbir
                      </label>
                      <input
                        type="text"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        placeholder="Contoh: 019-8834111"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Nama Guru Besar / Pengetua Sekolah (Pengesah Tertinggi)
                    </label>
                    <input
                      type="text"
                      value={headmasterName}
                      onChange={(e) => setHeadmasterName(e.target.value)}
                      placeholder="Contoh: LIM AI GIOK"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Nama Guru Besar untuk rekod rasmi pengurusan kewangan sekolah.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveAdmins}
                      disabled={isSavingAdmins}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingAdmins ? 'Menyimpan...' : 'Simpan Maklumat Pentadbir'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const fullName = adminTitle ? `${adminName} (${adminTitle})` : adminName;
                        setCurrentUser({ name: fullName, role: 'Pentadbir' });
                        setStatusMsg({
                          type: 'success',
                          text: `Sesi aktif kini ditukar kepada "${fullName}".`,
                        });
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Gunakan Sebagai Sesi Aktif Sekarang</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Add New Officer Form */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>Tambah Pegawai Pentadbir Baharu (Manual)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daftar pegawai pentadbir lain seperti PK Pentadbiran, PK Kokurikulum, atau Pembantu Tadbir Kewangan.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nama Pegawai</label>
                    <input
                      type="text"
                      value={newOfficerName}
                      onChange={(e) => setNewOfficerName(e.target.value)}
                      placeholder="Nama penuh pegawai"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Jawatan / Gelaran</label>
                    <input
                      type="text"
                      value={newOfficerDesignation}
                      onChange={(e) => setNewOfficerDesignation(e.target.value)}
                      placeholder="Cth: Penolong Kanan 1 / PT Kewangan"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Peranan Akses</label>
                    <select
                      value={newOfficerRole}
                      onChange={(e) => setNewOfficerRole(e.target.value as UserRole)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="Pentadbir">Pentadbir (Akses Penuh)</option>
                      <option value="Guru/Petugas">Guru/Petugas (Kutipan Bayaran Sahaja)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">No. Telefon (Pilihan)</label>
                    <input
                      type="text"
                      value={newOfficerPhone}
                      onChange={(e) => setNewOfficerPhone(e.target.value)}
                      placeholder="Cth: 013-8888888"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddOfficer}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Pegawai ke Senarai</span>
                </button>
              </div>

            </div>

            {/* Right 5 Cols: List of Configured Admin Officers */}
            <div className="lg:col-span-5 space-y-5">
              
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>Senarai Pegawai Pentadbir ({adminList.length})</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pegawai yang berdaftar dalam profil pengguna sistem
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {adminList.map((officer) => {
                    const isCurrentActive = currentUser.name.includes(officer.name);
                    const isPrimary = officer.name === adminName;

                    return (
                      <div
                        key={officer.id}
                        className={`p-3.5 rounded-xl border transition ${
                          isPrimary
                            ? 'bg-indigo-50/50 border-indigo-200 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {officer.name}
                              </span>
                              {isPrimary && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-600 text-white uppercase tracking-wider">
                                  Utama
                                </span>
                              )}
                              {isCurrentActive && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Aktif Semasa
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                              {officer.designation}
                            </p>

                            {officer.phone && (
                              <p className="text-[10px] text-slate-400 font-mono flex items-center space-x-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{officer.phone}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                officer.role === 'Pentadbir'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {officer.role}
                            </span>
                          </div>
                        </div>

                        {/* Officer Actions */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleSetActiveUserToOfficer(officer)}
                            className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer flex items-center space-x-1"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Tukar Sesi Aktif</span>
                          </button>

                          <div className="flex items-center space-x-2">
                            {!isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryOfficer(officer.id)}
                                className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer"
                              >
                                Set Utama
                              </button>
                            )}

                            {!isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOfficer(officer.id)}
                                className="text-red-500 hover:text-red-700 font-semibold hover:underline cursor-pointer"
                              >
                                Padam
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Kawalan Keselamatan:</span>
                  </div>
                  <p>
                    Pengguna bertaraf <strong>Pentadbir</strong> mempunyai kuasa penuh menyelaraskan kadar yuran, membatalkan resit rasmi dengan catatan alasan, melihat data penuh MyKid, dan memuat naik dokumen.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: GURU KELAS & MUAT NAIK DOKUMEN AUTO-BACA                */}
      {/* ============================================================== */}
      {activeTab === 'teachers' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Banner: Auto Inclusion Explanation */}
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Integrasi Auto Slip Resit
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-300">Format PDF & Cetakan Skrin</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Maklumat Guru Kelas Disertakan Secara Automatik Mengikut Kelas
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Setiap kali resit pembayaran dijana atau dicetak untuk mana-mana murid, sistem akan membaca nama guru kelas murid tersebut secara automatik dan memaparkannya pada bahagian metadata serta ruangan tandatangan/cop guru kelas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={handleExportTeachersCsv}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Eksport CSV</span>
              </button>

              <button
                type="button"
                onClick={handleSaveTeachers}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Nama Guru'}</span>
              </button>
            </div>
          </div>

          {/* Section: Multi-Format Document Reader (PDF, Word, CSV, Excel, Gambar) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Muat Naik Dokumen Senarai Guru Kelas (Auto-Baca AI & Sistem)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sokongan penuh untuk fail: <strong>PDF (.pdf)</strong>, <strong>Word (.docx, .doc)</strong>, <strong>CSV (.csv)</strong>, <strong>Excel (.xlsx, .xls)</strong>, dan <strong>Gambar (.png, .jpg, .jpeg)</strong>
                </p>
              </div>

              {/* Supported format badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold">PDF</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">WORD</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold">EXCEL</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-bold">CSV</span>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">GAMBAR</span>
              </div>
            </div>

            {/* Drop / Select Area */}
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 bg-slate-50/60 transition text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                {isUploadingDoc ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800">
                  {isUploadingDoc
                    ? 'Sedang membaca dokumen dan memproses maklumat guru kelas dengan AI...'
                    : 'Pilih fail dokumen senarai guru kelas sekolah anda'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-lg mx-auto">
                  Sistem akan membaca kandungan fail secara automatik, mengekstrak nama guru serta kelas masing-masing, dan memadankannya terus ke dalam sistem.
                </p>
              </div>

              <div className="pt-1">
                <label className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-xs cursor-pointer ${
                  isUploadingDoc ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 active:scale-95'
                }`}>
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingDoc ? 'Sedang Membaca Fail...' : 'Pilih Fail (PDF, Word, Excel, CSV, Gambar)'}</span>
                  <input
                    type="file"
                    disabled={isUploadingDoc}
                    accept=".pdf,.docx,.doc,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp,image/*"
                    onChange={handleDocFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {docUploadError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 text-left max-w-lg mx-auto flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{docUploadError}</span>
                </div>
              )}
            </div>

            {/* Extracted Preview Review Box */}
            {extractedPreview && (
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-emerald-700" />
                      <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                        Hasil Pengekstrakan Fail: {extractedPreview.fileName}
                      </h4>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Berjaya menemui <strong>{extractedPreview.totalFound} kelas</strong>. Sila semak padanan di bawah sebelum menerapkan ke dalam sistem:
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setExtractedPreview(null)}
                      className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-300 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyExtracted}
                      disabled={isSaving}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Menerapkan...' : 'Sahkan & Terapkan Ke Sistem'}</span>
                    </button>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="max-h-60 overflow-y-auto border border-emerald-200 bg-white rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-emerald-100/70 text-emerald-950 font-bold sticky top-0">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">Bil.</th>
                        <th className="py-2 px-3 w-36">Kelas Dikenal Pasti</th>
                        <th className="py-2 px-3">Nama Guru Kelas</th>
                        <th className="py-2 px-3 w-28 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-50">
                      {extractedPreview.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-emerald-50/30">
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{item.className}</td>
                          <td className="py-2 px-3 font-semibold text-emerald-900">{item.teacherName}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Dipadankan
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section: Manual Class Teachers Management Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Senarai Guru Kelas SK Tudan ({filteredClasses.length} Kelas Dipaparkan)
                </h3>
                <p className="text-xs text-slate-500">
                  Anda boleh menaip atau menyunting nama guru kelas secara langsung untuk mana-mana kelas.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSaveTeachers}
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kelas atau nama guru..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Level Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin text-xs">
                {['Semua', ...SCHOOL_LEVELS.map((l) => l.id)].map((lvl) => {
                  const label =
                    lvl === 'Semua'
                      ? 'Semua'
                      : lvl === 'PRASEKOLAH'
                      ? 'Pra'
                      : `Thn ${lvl}`;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setTeacherLevelFilter(lvl)}
                      className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition cursor-pointer ${
                        teacherLevelFilter === lvl
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">Bil.</th>
                    <th className="py-2.5 px-3 w-40">Kelas</th>
                    <th className="py-2.5 px-3">Nama Guru Kelas</th>
                    <th className="py-2.5 px-3 w-28 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClasses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Tiada kelas sepadan ditemui dengan carian ini.
                      </td>
                    </tr>
                  ) : (
                    filteredClasses.map((cls, idx) => {
                      const teacherName = teachersMap[cls] || '';
                      const isFilled = Boolean(teacherName.trim());

                      return (
                        <tr key={cls} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-extrabold text-slate-900">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-xs">
                              {cls}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={teacherName}
                              onChange={(e) => handleTeacherChange(cls, e.target.value)}
                              placeholder={`Masukkan nama guru bagi kelas ${cls}...`}
                              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isFilled ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" />
                                <span>Telah Diisi</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Belum Diisi
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>
                Jumlah Guru Diisi: <strong>{filledTeachersCount}</strong> daripada <strong>{totalClassesCount}</strong> kelas
              </span>

              <button
                type="button"
                onClick={handleSaveTeachers}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Senarai Guru'}</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: TANDATANGAN & COP RESIT (PILIHAN NAMA & JAWATAN GURU)     */}
      {/* ============================================================== */}
      {activeTab === 'signatory' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Banner Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
                <FileSignature className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Tetapan Tandatangan & Cop Rasmi Slip Resit Bayaran
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih nama guru dan jawatan rasmi yang dicetak pada slip resit bayaran murid (Salinan Ibu Bapa & Salinan Sekolah).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveSignatory}
              disabled={isSavingSignatory}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-2 shrink-0 self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingSignatory ? 'Menyimpan & Menyegerak...' : 'Simpan Tetapan Tandatangan & Cop'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* LEFT / MAIN COLUMN: SETTINGS FORM (7 Cols on XL) */}
            <div className="xl:col-span-7 space-y-6">
              
              {/* Section 1: Signatory Mode & Teacher Selection */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      1. Pemilihan Nama Guru & Jawatan Penandatangan
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tentukan siapa pegawai atau guru yang namanya dan jawatannya akan tertera di bawah resit bayaran.
                  </p>
                </div>

                {/* Signatory Mode */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-2">
                    Mod Penandatangan Resit:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <label
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                        signatoryMode === 'custom'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <input
                          type="radio"
                          name="sigMode"
                          checked={signatoryMode === 'custom'}
                          onChange={() => setSignatoryMode('custom')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-bold text-xs">Pilihan Tetapan</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-normal leading-tight">
                        Gunakan nama guru & jawatan yang dipilih di bawah (Paling Disyorkan).
                      </p>
                    </label>

                    <label
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                        signatoryMode === 'class_teacher'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <input
                          type="radio"
                          name="sigMode"
                          checked={signatoryMode === 'class_teacher'}
                          onChange={() => setSignatoryMode('class_teacher')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-bold text-xs">Guru Kelas Auto</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-normal leading-tight">
                        Mengikut guru kelas bagi kelas setiap murid secara automatik.
                      </p>
                    </label>

                    <label
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                        signatoryMode === 'recorder'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <input
                          type="radio"
                          name="sigMode"
                          checked={signatoryMode === 'recorder'}
                          onChange={() => setSignatoryMode('recorder')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-bold text-xs">Guru Perekod</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-normal leading-tight">
                        Nama guru / petugas yang log masuk ketika merekodkan bayaran.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Quick Picker Dropdown */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Pilih Cepat Nama Guru & Jawatan Daripada Sistem:</span>
                    <span className="text-[11px] font-normal text-emerald-700">
                      ({teacherOptions.length} rekod guru sedia ada)
                    </span>
                  </label>
                  
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const opt = teacherOptions.find((t) => t.name === val);
                      if (opt) handleSelectSignatoryTeacher(opt);
                    }}
                    defaultValue=""
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="" disabled>-- Klik di sini untuk memilih nama guru & jawatan --</option>
                    
                    <optgroup label="Pentadbir Utama & Pegawai Pengurusan">
                      {teacherOptions
                        .filter((t) => t.category !== 'Guru Kelas')
                        .map((t, idx) => (
                          <option key={`adm_${idx}`} value={t.name}>
                            {t.name} — ({t.title})
                          </option>
                        ))}
                    </optgroup>

                    <optgroup label="Senarai Guru Kelas (42 Kelas SK Tudan)">
                      {teacherOptions
                        .filter((t) => t.category === 'Guru Kelas')
                        .map((t, idx) => (
                          <option key={`cls_${idx}`} value={t.name}>
                            {t.name} — ({t.title})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Memilih dari senarai akan mengisi ruangan Nama Guru dan Jawatan Guru di bawah secara automatik.
                  </p>
                </div>

                {/* Teacher Name Input */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Nama Guru / Pegawai Penandatangan:
                  </label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="Contoh: LIM AI GIOK atau nama guru kelas..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nama ini akan dicetak dalam kurungan contohnya: <strong>( {signatoryName || 'NAMA GURU'} )</strong>
                  </p>
                </div>

                {/* Teacher Designation / Jawatan Input & Quick Presets */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Jawatan Guru / Pegawai Penandatangan:
                  </label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    placeholder="Contoh: Guru Besar, Penolong Kanan Pentadbiran, Guru Kelas..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />

                  {/* Preset Designation Buttons */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Pilihan Pantas:</span>
                    {[
                      'Guru Besar',
                      'Penolong Kanan Pentadbiran',
                      'Penolong Kanan HEM',
                      'Penolong Kanan Kokurikulum',
                      'Guru Kelas',
                      'Bendahari PIBG',
                      'Guru Bertugas Mingguan',
                      'Penyelaras Tahun',
                      'Petugas Kaunter Yuran',
                    ].map((titlePreset) => (
                      <button
                        key={titlePreset}
                        type="button"
                        onClick={() => setSignatoryTitle(titlePreset)}
                        className={`text-[10.5px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                          signatoryTitle === titlePreset
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {titlePreset}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Section 2: Official Stamp & Signature Upload */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Stamp className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      2. Cop Rasmi Sekolah & Tandatangan Digital
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Muat naik imej cop bulat rasmi dan tandatangan digital untuk dipaparkan secara bertindih pada slip resit rasmi.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Stamp Upload Box */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                        <Stamp className="w-3.5 h-3.5 text-blue-600" />
                        <span>Cop Rasmi Sekolah</span>
                      </span>
                      {stampPreview && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          ✓ Aktif
                        </span>
                      )}
                    </div>

                    {/* Stamp Preview Area */}
                    <div className="h-28 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 relative overflow-hidden">
                      {stampPreview ? (
                        <img
                          src={stampPreview}
                          alt="Cop Rasmi Sekolah"
                          className="max-h-24 max-w-full object-contain mix-blend-multiply rotate-[-6deg]"
                        />
                      ) : (
                        <div className="text-center text-slate-400 text-xs">
                          <Stamp className="w-8 h-8 mx-auto mb-1 opacity-40 text-slate-400" />
                          <span>Tiada imej cop dimuat naik</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2">
                      <label className="block w-full text-center py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer">
                        <span>+ Muat Naik Gambar Cop</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleStampUpload}
                          className="hidden"
                        />
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleUseSampleStamp}
                          className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          Contoh Cop SK Tudan
                        </button>
                        {stampPreview && (
                          <button
                            type="button"
                            onClick={handleClearStamp}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            Padam
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stamp text input */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Teks Pada Cop Rasmi / Pengesahan:
                      </label>
                      <input
                        type="text"
                        value={stampText}
                        onChange={(e) => setStampText(e.target.value)}
                        placeholder="Contoh: COP RASMI SK TUDAN YBA4111 MIRI"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Signature Upload Box */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                        <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tandatangan Digital Guru</span>
                      </span>
                      {signaturePreview && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          ✓ Aktif
                        </span>
                      )}
                    </div>

                    {/* Signature Preview Area */}
                    <div className="h-28 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 relative overflow-hidden">
                      {signaturePreview ? (
                        <img
                          src={signaturePreview}
                          alt="Tandatangan Digital"
                          className="max-h-20 max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-slate-400 text-xs">
                          <PenTool className="w-8 h-8 mx-auto mb-1 opacity-40 text-slate-400" />
                          <span>Tiada imej tandatangan dimuat naik</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2">
                      <label className="block w-full text-center py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer">
                        <span>+ Muat Naik Tandatangan</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSignatureUpload}
                          className="hidden"
                        />
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleUseSampleSignature}
                          className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          Contoh Tandatangan
                        </button>
                        {signaturePreview && (
                          <button
                            type="button"
                            onClick={handleClearSignature}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            Padam
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-tight">
                      Disyorkan format PNG dengan latar belakang lutsinar (transparent) supaya tandatangan dan cop kelihatan natural.
                    </p>
                  </div>

                </div>

              </div>

              {/* Section 3: Receipt Display Controls */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    3. Pilihan Paparan Pada Slip Resit
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kawalan elemen yang dipaparkan pada cetakan resit rasmi kedua-dua salinan (Salinan Ibu Bapa & Salinan Sekolah).
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start space-x-3 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200">
                    <input
                      type="checkbox"
                      checked={showSignatureStamp}
                      onChange={(e) => setShowSignatureStamp(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Paparkan Cop Rasmi & Tandatangan Digital pada Resit
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Jika diaktifkan, imej cop rasmi dan tandatangan akan terus dicetak pada bahagian penandatangan resit.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200">
                    <input
                      type="checkbox"
                      checked={showTeacherSig}
                      onChange={(e) => setShowTeacherSig(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Paparkan Ruangan Tandatangan Guru Kelas Berasingan
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Memaparkan ruangan tanda tangan tambahan khusus untuk Guru Kelas murid berkenaan di bahagian tengah footer resit.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSignatory}
                    disabled={isSavingSignatory}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingSignatory ? 'Menyimpan...' : 'Simpan Semua Tetapan Tandatangan & Cop'}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: LIVE RECEIPT PREVIEW (5 Cols on XL) */}
            <div className="xl:col-span-5 space-y-4">
              
              <div className="sticky top-20 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                      Pratonton Masa Nyata
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                      Bahagian Bawah Slip Resit Cetakan
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    SK Tudan ({schoolConfig.schoolCode})
                  </span>
                </div>

                {/* Simulated Receipt Footer Box */}
                <div className="border-2 border-slate-300 rounded-xl p-4 bg-white shadow-xs text-xs font-sans text-slate-900 space-y-4">
                  
                  {/* Top Bar of Receipt */}
                  <div className="border-b-2 border-slate-900 pb-1 flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-slate-800">
                      {schoolConfig.schoolName} • SISTEM PENGURUSAN YURAN
                    </span>
                    <span className="font-bold bg-slate-100 border border-slate-300 px-1.5 py-0.2 rounded text-[10px]">
                      [ SALINAN IBU BAPA / PENJAGA ]
                    </span>
                  </div>

                  <p className="italic text-slate-400 text-[10.5px]">
                    * Resit cetakan komputer rasmi SK Tudan. Bukti sah pembayaran.
                  </p>

                  {/* Signatures Area */}
                  <div className="pt-2 flex justify-between items-end text-xs text-slate-700 gap-2">
                    
                    {/* Buyer Signature */}
                    <div className="w-28 sm:w-32">
                      <div className="mt-8 pt-1 border-t border-slate-300">
                        <span className="block font-semibold text-[11px]">Tandatangan Pembayar</span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Ibu Bapa / Penjaga
                        </span>
                      </div>
                    </div>

                    {/* Class Teacher Signature (If Enabled) */}
                    {showTeacherSig && signatoryMode !== 'class_teacher' && (
                      <div className="text-center w-32 sm:w-36">
                        <div className="mt-8 pt-1 border-t border-slate-300">
                          <span className="font-bold text-slate-800 block text-[11px]">Guru Kelas</span>
                          <span className="text-[10.5px] text-emerald-800 font-bold block truncate">
                            Surayah Mohd Sah
                          </span>
                          <span className="text-[9px] text-slate-400 block">(Tandatangan & Cop)</span>
                        </div>
                      </div>
                    )}

                    {/* Official Signatory & Stamp Box */}
                    <div className="text-right flex-1 min-w-[130px]">
                      <div className="relative inline-block text-center min-w-[140px]">
                        
                        {/* Overlay Container */}
                        <div className="h-12 relative flex items-center justify-center">
                          {showSignatureStamp && stampPreview && (
                            <img
                              src={stampPreview}
                              alt="Cop Rasmi"
                              className="absolute -top-3 right-0 w-16 h-16 object-contain pointer-events-none opacity-85 mix-blend-multiply rotate-[-6deg]"
                            />
                          )}
                          {showSignatureStamp && signaturePreview ? (
                            <img
                              src={signaturePreview}
                              alt="Tandatangan"
                              className="relative z-10 max-h-11 max-w-[120px] object-contain"
                            />
                          ) : (
                            <div className="h-6"></div>
                          )}
                        </div>

                        <div className="border-t border-slate-400 pt-1">
                          <span className="font-bold text-slate-900 block text-xs">
                            ( {signatoryMode === 'class_teacher' ? 'Surayah Mohd Sah' : signatoryName || 'LIM AI GIOK'} )
                          </span>
                          <span className="text-[10.5px] text-slate-700 font-semibold block">
                            {signatoryMode === 'class_teacher' ? 'Guru Kelas (3 ARIF)' : signatoryTitle || 'Guru Besar'}
                          </span>
                          {stampText && (
                            <span className="text-[8.5px] text-slate-400 block italic leading-tight">
                              {stampText}
                            </span>
                          )}
                        </div>

                      </div>
                    </div>

                  </div>

                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Disegerakkan Secara Langsung</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Setiap kali mana-mana guru atau petugas menjana atau mencetak resit pembayaran murid, sistem akan membaca tetapan ini dan memaparkan nama serta jawatan penandatangan yang telah dipilih di sini.
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: KADAR YURAN & BRANDING SEKOLAH (EXISTING TAB)            */}
      {/* ============================================================== */}
      {activeTab === 'rates' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tetapan Kadar Rasmi & Maklumat Sekolah</h2>
              <p className="text-xs text-slate-500">Kemas kini senarai kadar yuran dan logo sekolah untuk resit rasmi</p>
            </div>
            <button
              onClick={handleSaveAllConfig}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Fee Items Table */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Senarai Perkara & Kadar Rasmi Sekolah
                  </h2>
                  <p className="text-xs text-slate-500">
                    Setiap perkara dipaparkan secara berasingan. Ibu bapa membayar mengikut keperluan yang dipilih.
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
                      <div className="flex items-center space-x-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleSaveLogoOnly()}
                          disabled={isSavingLogo}
                          className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-md font-bold transition cursor-pointer"
                        >
                          {isSavingLogo ? 'Menyimpan...' : 'Simpan Logo'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="text-xs text-red-600 hover:text-red-700 underline font-medium cursor-pointer"
                        >
                          Padam
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('logo')}
                      className="block text-[11px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
                    >
                      → Buka Ruang Khas Logo Sekolah
                    </button>
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
      )}

    </div>
  );
};
