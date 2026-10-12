import { jsPDF } from 'jspdf';
import { SchoolConfig } from '../types';
import { formatRM } from './currency';

export interface PhotoReportRow {
  studentName: string;
  className: string;
  myKid?: string;
  paid5R: number; // in cents
  rate5R: number; // in cents
  paid8R: number; // in cents
  rate8R: number; // in cents
  paidPano: number; // in cents
  ratePano: number; // in cents
  totalPaid: number; // in cents
  receiptNumber?: string;
  paymentMethod?: string;
}

export interface PhotoReportOptions {
  config: SchoolConfig;
  classNameFilter: string;
  streamFilter?: string;
  rows: PhotoReportRow[];
  classTeacherName?: string;
}

/**
 * Generates an official, high-resolution PDF document for:
 * "SENARAI PEMBAYARAN GAMBAR KELAS MENGIKUT NAMA MURID, JENIS GAMBAR & JUMLAH BAYARAN"
 */
export function generatePhotoPaymentsPdf({
  config,
  classNameFilter,
  rows,
  classTeacherName,
}: PhotoReportOptions): jsPDF {
  // Use A4 Landscape (297mm x 210mm) for spacious, readable presentation
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 269mm
  const rightX = marginX + contentWidth;

  const rowHeight = 7.2;
  const itemsPerPageFirst = 15;
  const itemsPerPageSubsequent = 20;

  // Compute overall stats
  let totalPaid5RCents = 0;
  let count5R = 0;
  let totalPaid8RCents = 0;
  let count8R = 0;
  let totalPaidPanoCents = 0;
  let countPano = 0;
  let grandTotalPaidCents = 0;
  let studentsPaidCount = 0;

  rows.forEach((r) => {
    if (r.paid5R > 0) {
      count5R++;
      totalPaid5RCents += r.paid5R;
    }
    if (r.paid8R > 0) {
      count8R++;
      totalPaid8RCents += r.paid8R;
    }
    if (r.paidPano > 0) {
      countPano++;
      totalPaidPanoCents += r.paidPano;
    }
    if (r.totalPaid > 0) {
      studentsPaidCount++;
      grandTotalPaidCents += r.totalPaid;
    }
  });

  // Calculate total pages
  let remainingRows = rows.length;
  let totalPages = 1;
  if (remainingRows > itemsPerPageFirst) {
    remainingRows -= itemsPerPageFirst;
    totalPages += Math.ceil(remainingRows / itemsPerPageSubsequent);
  }

  let currentRowIdx = 0;

  for (let page = 1; page <= totalPages; page++) {
    if (page > 1) {
      doc.addPage('a4', 'landscape');
    }

    let curY = 10;

    // --- Page Header ---
    if (page === 1) {
      // Top Official School Header
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.8);
      doc.line(marginX, curY, rightX, curY);

      curY += 4.5;

      // School Logo Slot
      const logoW = 16;
      const logoH = 16;
      const activeLogo = config.logoBase64 || (typeof window !== 'undefined' ? localStorage.getItem('sk_tudan_school_logo') : null);
      if (activeLogo && activeLogo.startsWith('data:image')) {
        try {
          const imgFmt = activeLogo.includes('image/png') ? 'PNG' : 'JPEG';
          doc.addImage(activeLogo, imgFmt, marginX, curY, logoW, logoH);
        } catch {
          drawEmblemBox(doc, marginX, curY, logoW, logoH);
        }
      } else {
        drawEmblemBox(doc, marginX, curY, logoW, logoH);
      }

      const headerTextX = marginX + logoW + 4;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(config.schoolName, headerTextX, curY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `KOD SEKOLAH: ${config.schoolCode}  |  ${config.schoolAddress}`,
        headerTextX,
        curY + 9
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(5, 150, 105); // emerald
      doc.text(
        'SENARAI REKOD PEMBAYARAN GAMBAR KELAS (5R, 8R & PANORAMA)',
        headerTextX,
        curY + 14.5
      );

      // Meta info on the right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      const classLabel = classNameFilter === 'Semua' ? 'SEMUA KELAS' : `KELAS: ${classNameFilter}`;
      doc.text(classLabel, rightX, curY + 4.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Tahun / Sesi: ${config.currentSchoolYear || '2026'}`, rightX, curY + 9, { align: 'right' });
      doc.text(
        `Tarikh Cetakan: ${new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`,
        rightX,
        curY + 14,
        { align: 'right' }
      );

      curY += 19;

      // Double divider
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.5);
      doc.line(marginX, curY, rightX, curY);
      doc.setLineWidth(0.2);
      doc.line(marginX, curY + 1, rightX, curY + 1);

      curY += 4;
    } else {
      // Subsequent Pages Compact Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `${config.schoolName} — SENARAI PEMBAYARAN GAMBAR KELAS (${classNameFilter})`,
        marginX,
        curY + 4
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Halaman ${page} daripada ${totalPages}`, rightX, curY + 4, { align: 'right' });

      curY += 7;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(marginX, curY, rightX, curY);
      curY += 3;
    }

    // --- Table Headers ---
    // Total width = 269mm
    // Bil: 12, Nama: 82, MyKid: 30, Kelas: 23, 5R: 25, 8R: 25, Panorama: 25, Jumlah: 27, Resit/Status: 20
    const colW = {
      bil: 12,
      name: 82,
      myKid: 28,
      className: 24,
      g5r: 25,
      g8r: 25,
      pano: 25,
      total: 28,
      status: 20,
    };

    const thH = 7.5;
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(marginX, curY, contentWidth, thH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);

    let colX = marginX;
    doc.text('Bil.', colX + colW.bil / 2, curY + 5, { align: 'center' });
    colX += colW.bil;

    doc.text('Nama Murid', colX + 3, curY + 5);
    colX += colW.name;

    doc.text('No. MyKid', colX + 3, curY + 5);
    colX += colW.myKid;

    doc.text('Kelas', colX + colW.className / 2, curY + 5, { align: 'center' });
    colX += colW.className;

    doc.text('Gambar 5R', colX + colW.g5r - 3, curY + 5, { align: 'right' });
    colX += colW.g5r;

    doc.text('Gambar 8R', colX + colW.g8r - 3, curY + 5, { align: 'right' });
    colX += colW.g8r;

    doc.text('Panorama', colX + colW.pano - 3, curY + 5, { align: 'right' });
    colX += colW.pano;

    doc.text('Jumlah (RM)', colX + colW.total - 3, curY + 5, { align: 'right' });
    colX += colW.total;

    doc.text('Status / Resit', colX + colW.status / 2, curY + 5, { align: 'center' });

    curY += thH;

    // --- Table Rows on this page ---
    const pageCapacity = page === 1 ? itemsPerPageFirst : itemsPerPageSubsequent;
    const pageEndIdx = Math.min(currentRowIdx + pageCapacity, rows.length);

    for (let i = currentRowIdx; i < pageEndIdx; i++) {
      const r = rows[i];
      const isEven = i % 2 === 1;

      if (isEven) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, curY, contentWidth, rowHeight, 'F');
      }

      // Bottom row divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(marginX, curY + rowHeight, rightX, curY + rowHeight);

      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);

      let rowX = marginX;

      // 1. Bil
      doc.setFont('helvetica', 'normal');
      doc.text(String(i + 1), rowX + colW.bil / 2, curY + 5, { align: 'center' });
      rowX += colW.bil;

      // 2. Nama Murid
      doc.setFont('helvetica', 'bold');
      const cleanName = r.studentName.length > 40 ? r.studentName.substring(0, 38) + '..' : r.studentName;
      doc.text(cleanName, rowX + 3, curY + 5);
      rowX += colW.name;

      // 3. MyKid
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(r.myKid || '-', rowX + 3, curY + 5);
      doc.setFontSize(8.5);
      rowX += colW.myKid;

      // 4. Kelas
      doc.setFont('helvetica', 'normal');
      doc.text(r.className, rowX + colW.className / 2, curY + 5, { align: 'center' });
      rowX += colW.className;

      // 5. Gambar 5R
      if (r.paid5R > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text(formatRM(r.paid5R).replace('RM', ''), rowX + colW.g5r - 3, curY + 5, { align: 'right' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('-', rowX + colW.g5r / 2, curY + 5, { align: 'center' });
      }
      rowX += colW.g5r;

      // 6. Gambar 8R
      if (r.paid8R > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text(formatRM(r.paid8R).replace('RM', ''), rowX + colW.g8r - 3, curY + 5, { align: 'right' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('-', rowX + colW.g8r / 2, curY + 5, { align: 'center' });
      }
      rowX += colW.g8r;

      // 7. Gambar Panorama
      if (r.paidPano > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(217, 119, 6);
        doc.text(formatRM(r.paidPano).replace('RM', ''), rowX + colW.pano - 3, curY + 5, { align: 'right' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('-', rowX + colW.pano / 2, curY + 5, { align: 'center' });
      }
      rowX += colW.pano;

      // 8. Jumlah Bayaran
      doc.setFont('helvetica', 'bold');
      if (r.totalPaid > 0) {
        doc.setTextColor(15, 23, 42);
        doc.text(formatRM(r.totalPaid).replace('RM', ''), rowX + colW.total - 3, curY + 5, { align: 'right' });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('0.00', rowX + colW.total - 3, curY + 5, { align: 'right' });
      }
      rowX += colW.total;

      // 9. Status / No. Resit
      doc.setFontSize(7.5);
      if (r.totalPaid > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        const statusDisplay = r.receiptNumber ? r.receiptNumber.split('/').pop() || 'Lunas' : 'Lunas';
        doc.text(statusDisplay, rowX + colW.status / 2, curY + 5, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(220, 38, 38);
        doc.text('Belum', rowX + colW.status / 2, curY + 5, { align: 'center' });
      }

      curY += rowHeight;
    }

    currentRowIdx = pageEndIdx;

    // Outer table border
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    const tableH = thH + (pageEndIdx - (currentRowIdx - (pageEndIdx - (currentRowIdx - pageCapacity)))) * rowHeight;
    doc.rect(marginX, curY - (pageEndIdx - (page === 1 ? 0 : itemsPerPageFirst + (page - 2) * itemsPerPageSubsequent)) * rowHeight, contentWidth, (pageEndIdx - (page === 1 ? 0 : itemsPerPageFirst + (page - 2) * itemsPerPageSubsequent)) * rowHeight, 'S');

    // On the final page, render Grand Summary & Official Signatures
    if (page === totalPages) {
      curY += 4;

      // Grand Totals Summary Row
      const sumBoxH = 14;
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, curY, contentWidth, sumBoxH, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, curY, contentWidth, sumBoxH, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('RINGKASAN KUTIPAN GAMBAR KELAS :', marginX + 4, curY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Murid Membayar: ${studentsPaidCount} / ${rows.length} orang  |  5R: ${count5R} unit (${formatRM(totalPaid5RCents)})  |  8R: ${count8R} unit (${formatRM(totalPaid8RCents)})  |  Panorama: ${countPano} unit (${formatRM(totalPaidPanoCents)})`,
        marginX + 4,
        curY + 10.5
      );

      // Grand total highlight
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(5, 150, 105);
      doc.text(`JUMLAH KUTIPAN: ${formatRM(grandTotalPaidCents)}`, rightX - 4, curY + 8.5, { align: 'right' });

      curY += sumBoxH + 5;

      // Official Verification & Signatures Block
      const sigColW = 75;
      const sig1X = marginX + 8;
      const sig2X = marginX + contentWidth / 2 - sigColW / 2;
      const sig3X = rightX - sigColW - 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      // Signature 1: Guru Kelas
      doc.text('Disediakan Oleh (Guru Kelas):', sig1X, curY);
      doc.setDrawColor(148, 163, 184);
      doc.line(sig1X, curY + 15, sig1X + sigColW, curY + 15);
      doc.setFont('helvetica', 'bold');
      doc.text(classTeacherName || 'Guru Kelas SK Tudan', sig1X, curY + 19);

      // Signature 2: Penyelaras Gambar / Petugas
      doc.setFont('helvetica', 'normal');
      doc.text('Disemak Oleh (Penyelaras Gambar):', sig2X, curY);
      doc.line(sig2X, curY + 15, sig2X + sigColW, curY + 15);
      doc.setFont('helvetica', 'bold');
      doc.text('Penyelaras Jurugambar Sekolah', sig2X, curY + 19);

      // Signature 3: Pentadbir Sekolah (LIM AI GIOK)
      doc.setFont('helvetica', 'normal');
      doc.text('Disahkan Oleh (Pentadbir Sekolah):', sig3X, curY);
      doc.line(sig3X, curY + 15, sig3X + sigColW, curY + 15);
      doc.setFont('helvetica', 'bold');
      doc.text(config.adminName || 'LIM AI GIOK', sig3X, curY + 19);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(config.adminTitle || 'Guru Besar', sig3X, curY + 22.5);
    }

    // Page footer on every page
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Sistem Pengurusan Yuran & Gambar SK Tudan • Dijana pada ${new Date().toLocaleDateString('ms-MY')}`,
      marginX,
      pageHeight - 6
    );
    doc.setFont('helvetica', 'bold');
    doc.text(`Halaman ${page} daripada ${totalPages}`, rightX, pageHeight - 6, { align: 'right' });
  }

  return doc;
}

function drawEmblemBox(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('SK TUDAN', x + w / 2, y + 6, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('MIRI', x + w / 2, y + 10.5, { align: 'center' });

  doc.setFontSize(5);
  doc.text('YBA4111', x + w / 2, y + 14.5, { align: 'center' });
}
