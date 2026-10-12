import { jsPDF } from 'jspdf';
import { StudentPaymentSummary, SchoolConfig } from '../types';
import { formatRM } from './currency';

export interface DebtReportOptions {
  config: SchoolConfig;
  summaries: StudentPaymentSummary[];
  classNameFilter?: string;
  generatedBy?: string;
}

/**
 * Pure jsPDF table generator - ultra-fast, zero-dependency, works seamlessly on all devices.
 */
export function generateDebtSummaryPdf({
  config,
  summaries,
  classNameFilter = 'Semua',
  generatedBy = 'Guru / Petugas SK Tudan',
}: DebtReportOptions): jsPDF {
  const debtors = summaries.filter((s) => s.balanceCents > 0);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186mm

  // Metrics
  const totalDebtCents = debtors.reduce((sum, d) => sum + d.balanceCents, 0);
  const totalExpectedCents = debtors.reduce((sum, d) => sum + d.totalFeeCents, 0);
  const totalPaidCents = debtors.reduce((sum, d) => sum + d.paidCents, 0);

  const todayStr = new Intl.DateTimeFormat('ms-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const drawHeader = (pageNum: number, totalPagesPlaceholder: boolean) => {
    // Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 26, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(config.schoolName || 'SK TUDAN', marginX, 9);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(52, 211, 153); // emerald-400
    doc.text(
      `SISTEM PERINGATAN TUNGGAKAN YURAN & KEPERLUAN • SESI ${config.currentSchoolYear}`,
      marginX,
      15
    );

    doc.setFontSize(7);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(`Dijana: ${todayStr} • Oleh: ${generatedBy}`, marginX, 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`KELAS: ${classNameFilter.toUpperCase()}`, pageWidth - marginX, 15, { align: 'right' });

    // Key metrics card on first page
    if (pageNum === 1) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginX, 30, contentWidth, 16, 1.5, 1.5, 'FD');

      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('BILANGAN MURID TERTUNGGAK', marginX + 4, 35);
      doc.text('JUMLAH KESELURUHAN (RM)', marginX + 50, 35);
      doc.text('TELAH DIBAYAR (RM)', marginX + 102, 35);
      doc.text('BAKI BELUM SELESAI (RM)', marginX + 145, 35);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${debtors.length} orang`, marginX + 4, 42);
      doc.text(formatRM(totalExpectedCents), marginX + 50, 42);

      doc.setTextColor(16, 185, 129); // emerald-600
      doc.text(formatRM(totalPaidCents), marginX + 102, 42);

      doc.setTextColor(225, 29, 72); // rose-600
      doc.text(formatRM(totalDebtCents), marginX + 145, 42);
    }
  };

  const drawTableHeader = (startY: number) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, startY, contentWidth, 6.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);

    // Columns: Bil (8), Nama (50), Kelas (16), Penjaga (36), Telefon (24), Dibayar (20), Baki (20), Catatan (12)
    doc.text('Bil', marginX + 2, startY + 4.5);
    doc.text('Nama Murid', marginX + 10, startY + 4.5);
    doc.text('Kelas', marginX + 62, startY + 4.5);
    doc.text('Nama Penjaga', marginX + 80, startY + 4.5);
    doc.text('Telefon Penjaga', marginX + 118, startY + 4.5);
    doc.text('Dibayar', marginX + 146, startY + 4.5, { align: 'right' });
    doc.text('Baki (RM)', marginX + 168, startY + 4.5, { align: 'right' });
    doc.text('Status', marginX + 172, startY + 4.5);
  };

  let currentPage = 1;
  drawHeader(currentPage, false);

  let currentY = 50;
  drawTableHeader(currentY);
  currentY += 6.5;

  const rowHeight = 6.2;
  const bottomLimit = pageHeight - 16;

  debtors.forEach((s, index) => {
    if (currentY + rowHeight > bottomLimit) {
      // Draw footer on old page
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Laporan Peringatan Baki Yuran • ${config.schoolName} (${config.schoolCode}) • Halaman ${currentPage}`,
        marginX,
        pageHeight - 8
      );

      doc.addPage();
      currentPage++;
      drawHeader(currentPage, false);
      currentY = 32;
      drawTableHeader(currentY);
      currentY += 6.5;
    }

    // Zebra striping
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, contentWidth, rowHeight, 'F');
    }

    // Border line under row
    doc.setDrawColor(241, 245, 249);
    doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);

    // Bil
    doc.text(String(index + 1), marginX + 2, currentY + 4.2);

    // Nama Murid (truncated if too long)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    let displayName = s.student.name;
    if (doc.getTextWidth(displayName) > 50) {
      while (doc.getTextWidth(displayName + '..') > 50 && displayName.length > 0) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '..';
    }
    doc.text(displayName, marginX + 10, currentY + 4.2);

    // Kelas
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(s.student.className, marginX + 62, currentY + 4.2);

    // Penjaga
    let parent = s.student.parentName || '-';
    if (doc.getTextWidth(parent) > 36) {
      while (doc.getTextWidth(parent + '..') > 36 && parent.length > 0) {
        parent = parent.slice(0, -1);
      }
      parent += '..';
    }
    doc.text(parent, marginX + 80, currentY + 4.2);

    // Telefon
    doc.text(s.student.parentPhone || '-', marginX + 118, currentY + 4.2);

    // Dibayar
    doc.setTextColor(16, 185, 129);
    doc.text(formatRM(s.paidCents), marginX + 146, currentY + 4.2, { align: 'right' });

    // Baki (RM)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72);
    doc.text(formatRM(s.balanceCents), marginX + 168, currentY + 4.2, { align: 'right' });

    // Status
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    if (s.paidCents === 0) {
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text('Belum Bayar', marginX + 172, currentY + 4.2);
    } else {
      doc.setTextColor(2, 132, 199); // sky-600
      doc.text('Sebahagian', marginX + 172, currentY + 4.2);
    }

    currentY += rowHeight;
  });

  // Footer for last page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Laporan Peringatan Baki Yuran • ${config.schoolName} (${config.schoolCode}) • Halaman ${currentPage}`,
    marginX,
    pageHeight - 8
  );

  return doc;
}
