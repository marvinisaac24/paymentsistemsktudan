export interface FeeItem {
  id: string;
  code: string;
  name: string;
  amountCents: number; // in Sen (e.g., 800 = RM8.00)
  order: number;
  active: boolean;
  isOptional?: boolean; // All items are optional based on parent's consent
}

export interface Student {
  id: string;
  name: string;
  className: string;
  myKid?: string; // Optional, masked for unauthorized users
  parentName: string;
  parentPhone?: string;
  schoolYear: string;
  optOutItemIds?: string[]; // IDs of items parents decided not to buy (e.g. Sedia ada / Tidak diperlukan)
  createdAt: string;
  updatedAt: string;
}

export interface PaymentItemAllocation {
  feeItemId: string;
  feeItemName: string;
  feeRateCents: number;
  previouslyPaidCents: number;
  currentPaymentCents: number;
  remainingCentsAfter: number;
}

export type PaymentMethod = 'Tunai' | 'Pindahan Bank' | 'Lain-lain';

export interface Transaction {
  id: string;
  receiptNumber: string; // e.g., SKT/T3/2026/0001
  studentId: string;
  studentName: string;
  studentClass: string;
  schoolYear: string;
  payerName: string;
  payerPhone?: string;
  timestamp: string; // ISO
  timestampMalaysia: string; // formatted Asia/Kuala_Lumpur
  totalAmountCents: number;
  items: PaymentItemAllocation[];
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  recordedBy: string;
  userRole: 'Pentadbir' | 'Guru/Petugas';
  notes?: string;
  amountTenderedCents?: number; // Jumlah wang tunai diterima/dihulur oleh murid/ibu bapa
  changeReturnedCents?: number; // Baki wang yang perlu dikembalikan kepada murid
  changeReturnedStatus?: 'Sudah Dipulangkan' | 'Belum Dipulangkan' | 'Tiada Baki'; // Status pemulangan baki kepada murid
  status: 'Sah' | 'Dibatalkan';
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  printCount: number;
  classTeacherName?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  timestampMalaysia: string;
  action: 'TAMBAH_BAYARAN' | 'BATAL_BAYARAN' | 'PADAM_BAYARAN' | 'KEMASKINI_BAYARAN' | 'TAMBAH_MURID' | 'KEMASKINI_MURID' | 'IMPORT_MURID' | 'KEMASKINI_KADAR' | 'LOG_MASUK' | 'KEMASKINI_TETAPAN' | 'KEMASKINI_PILIHAN_ITEM' | 'PADAM_MURID' | 'PADAM_MURID_PUKAL';
  performedBy: string;
  role: string;
  details: string;
  targetId?: string;
}

export interface AdminOfficer {
  id: string;
  name: string;
  designation: string; // e.g. 'Guru Besar'
  role: UserRole;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface SchoolConfig {
  schoolName: string;
  schoolCode: string;
  schoolAddress: string;
  title: string;
  currentSchoolYear: string;
  logoBase64?: string;
  receiptNote: string;
  classTeachers?: Record<string, string>; // e.g. { "3 ARIF": "Puan Siti Mariam binti Ahmad" }
  adminName?: string; // Nama Pentadbir Utama dimasukkan secara manual (cth: LIM AI GIOK)
  adminTitle?: string; // Jawatan Pentadbir (cth: Guru Besar)
  headmasterName?: string; // Nama Guru Besar / Pengetua (cth: LIM AI GIOK)
  adminList?: AdminOfficer[]; // Senarai nama pentadbir sekolah yang dimasukkan secara manual
}

export type UserRole = 'Pentadbir' | 'Guru/Petugas';

export interface CurrentUser {
  name: string;
  role: UserRole;
  email?: string;
}

export interface StudentPaymentSummary {
  student: Student;
  totalFeeCents: number; // Expected total based on items chosen by parent
  paidCents: number;
  balanceCents: number;
  status: 'Belum Bayar' | 'Bayar Sebahagian' | 'Selesai';
  itemBalances: {
    feeItemId: string;
    feeItemName: string;
    rateCents: number;
    paidCents: number;
    remainingCents: number;
    isPaid: boolean;
    isOptedOut: boolean; // Marked as "Sedia Ada / Tidak Diperlukan"
  }[];
  transactionCount: number;
  optedOutCount: number;
}

export interface DashboardStats {
  totalStudents: number;
  totalCollectionsCents: number;
  totalPendingCents: number;
  completedStudentsCount: number;
  partialStudentsCount: number;
  unpaidStudentsCount: number;
  totalTransactionsCount: number;
  cancelledTransactionsCount: number;
}
