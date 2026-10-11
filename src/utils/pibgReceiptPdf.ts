import { jsPDF } from 'jspdf';
import { Transaction, SchoolConfig } from '../types';
import { formatRM } from './currency';

export interface PibgReceiptPdfOptions {
  transaction: Transaction;
  config: SchoolConfig;
  copyChoice?: 'both' | 'parent' | 'teacher';
  isReprint?: boolean;
}

interface RenderHalfOptions {
  copyTitle: string;
  startY: number;
  transaction: Transaction;
  config: SchoolConfig;
  isReprint: boolean;
  marginX: number;
  contentWidth: number;
}

function renderPibgReceiptHalf(doc: jsPDF, opts: RenderHalfOptions): void {
  const { copyTitle, startY, transaction, config, isReprint, marginX, contentWidth } = opts;
  let curY = startY;

  // 1. Top Header Bar & Copy Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `${config.schoolName || 'SK TUDAN MIRI'} • PERSATUAN IBU BAPA DAN GURU (PIBG)`,
    marginX,
    curY
  );

  // Copy Badge Box
  const badgeText = `[ ${copyTitle} ]`;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  const badgeWidth = doc.getTextWidth(badgeText) + 6;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(marginX + contentWidth - badgeWidth, curY - 3.8, badgeWidth, 5, 1, 1, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.text(badgeText, marginX + contentWidth - badgeWidth + 3, curY - 0.3);

  if (isReprint) {
    doc.setFontSize(6.5);
    doc.setTextColor(180, 83, 9);
    doc.text('* CETAK SEMULA *', marginX + contentWidth - badgeWidth - 25, curY - 0.3);
  }

  curY += 2;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(marginX, curY, marginX + contentWidth, curY);

  curY += 4;

  // 2. School Title & Official Heading
  const hasLogo = Boolean(config.logoBase64 && config.logoBase64.startsWith('data:image'));
  let textStartX = marginX;
  if (hasLogo) {
    try {
      doc.addImage(config.logoBase64!, 'PNG', marginX, curY - 1, 13, 13);
      textStartX = marginX + 16;
    } catch {
      textStartX = marginX;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(config.schoolName || 'SEKOLAH KEBANGSAAN TUDAN', textStartX, curY + 2.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Kod Sekolah: ${config.schoolCode || 'YBA4111'} | ${config.schoolAddress || 'Miri, Sarawak'}`,
    textStartX,
    curY + 6
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text('RESIT RASMI SUMBANGAN PIBG (KELUARGA)', textStartX, curY + 10);

  curY += 13;

  // 3. Metadata Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  const metaHeight = 22;
  doc.roundedRect(marginX, curY, contentWidth, metaHeight, 1.5, 1.5, 'FD');

  const col1X = marginX + 3;
  const col2X = marginX + (contentWidth / 2) + 2;
  const valCol1 = col1X + 28;
  const valCol2 = col2X + 32;

  const repName = transaction.pibgRepresentativeStudentName || transaction.studentName;
  const repClass = transaction.pibgRepresentativeClassName || transaction.studentClass;
  const payerName = transaction.payerName || 'Ibu Bapa / Penjaga';
  const recordedBy = transaction.recordedBy || 'Guru / Petugas PIBG';

  // Row 1
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('No. Resit', col1X, curY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.receiptNumber}`, valCol1 - 5, curY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Tarikh & Masa', col2X, curY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.timestampMalaysia || transaction.timestamp}`, valCol2 - 5, curY + 4.5);

  // Row 2
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Murid Wakil', col1X, curY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${repName} (${repClass})`, valCol1 - 5, curY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Kaedah Bayar', col2X, curY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const refStr = transaction.referenceNumber ? ` (${transaction.referenceNumber})` : '';
  doc.text(`: ${transaction.paymentMethod}${refStr}`, valCol2 - 5, curY + 9);

  // Row 3
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Nama Penjaga', col1X, curY + 13.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${payerName}`, valCol1 - 5, curY + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Penerima Bayaran', col2X, curY + 13.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text(`: ${recordedBy}`, valCol2 - 5, curY + 13.5);

  // Row 4 (Note on family coverage)
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `* Bayaran ini melunaskan Sumbangan PIBG bagi satu keluarga murid wakil dan semua adik-beradik yang bersekolah bersama.`,
    col1X,
    curY + 18.5
  );

  curY += metaHeight + 3;

  // 4. Linked Siblings Table (Senarai Adik-Beradik Yang Terpaut)
  const siblings = transaction.pibgFamilySiblingNamesWithClasses || [];
  
  // Table Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(marginX, curY, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Bil.', marginX + 2, curY + 3.5);
  doc.text('Senarai Adik-Beradik Yang Diliputi Dalam Keluarga Ini', marginX + 12, curY + 3.5);
  doc.text('Kelas', marginX + contentWidth - 45, curY + 3.5);
  doc.text('Status PIBG', marginX + contentWidth - 22, curY + 3.5);

  curY += 5;

  // Representative row
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, curY, contentWidth, 4.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, curY + 4.5, marginX + contentWidth, curY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1.', marginX + 2, curY + 3.2);
  doc.text(`${repName} (Murid Wakil)`, marginX + 12, curY + 3.2);
  doc.text(repClass, marginX + contentWidth - 45, curY + 3.2);
  doc.setTextColor(4, 120, 87);
  doc.text('Lunas (Wakil)', marginX + contentWidth - 22, curY + 3.2);

  curY += 4.5;

  // Sibling rows (limit to 3 max in compact half layout so everything fits beautifully)
  const displaySiblings = siblings.slice(0, 3);
  displaySiblings.forEach((sib, idx) => {
    const isEven = idx % 2 === 1;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, curY, contentWidth, 4.5, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, curY + 4.5, marginX + contentWidth, curY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 2}.`, marginX + 2, curY + 3.2);
    doc.text(sib.name, marginX + 12, curY + 3.2);
    doc.text(sib.className, marginX + contentWidth - 45, curY + 3.2);
    doc.setTextColor(3, 105, 161); // sky-700
    doc.text('Diliputi Keluarga', marginX + contentWidth - 22, curY + 3.2);

    curY += 4.5;
  });

  if (siblings.length > 3) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`...dan ${siblings.length - 3} adik-beradik lain yang terpaut.`, marginX + 12, curY + 3);
    curY += 4;
  }

  curY += 2;

  // 5. Financial Summary Row
  const pibgItem = transaction.items?.find((it) => it.feeItemName.toLowerCase().includes('pibg'));
  const pibgAmountCents = pibgItem ? pibgItem.currentPaymentCents : 2000;

  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, curY, contentWidth, 9, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(6, 78, 59);
  doc.text('JUMLAH SUMBANGAN PIBG SATU KELUARGA:', marginX + 3, curY + 5.8);

  doc.setFontSize(10);
  doc.setTextColor(4, 120, 87);
  doc.text(formatRM(pibgAmountCents), marginX + contentWidth - 28, curY + 6);

  curY += 12;

  // 6. Signature & Verification footer
  const signY = curY;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  // Left side: Signature of Receiver
  doc.line(marginX + 5, signY + 10, marginX + 55, signY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`( ${recordedBy} )`, marginX + 5, signY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Tandatangan & Cop Penerima PIBG', marginX + 5, signY + 16);

  // Right side: Guardian acknowledgment
  doc.line(marginX + contentWidth - 55, signY + 10, marginX + contentWidth - 5, signY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`( ${payerName} )`, marginX + contentWidth - 55, signY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Tandatangan Ibu Bapa / Penjaga', marginX + contentWidth - 55, signY + 16);
}

/**
 * Generates official dedicated PIBG Receipt PDF.
 * Supports:
 * - 'both': 1 A4 portrait page with Teacher Copy (Upper) + Scissors cut line + Parent Copy (Lower)
 * - 'parent': 1 clean page for Salinan Ibu Bapa/Penjaga
 * - 'teacher': 1 clean page for Salinan Simpanan Guru
 */
export function generatePibgReceiptPdf(options: PibgReceiptPdfOptions): jsPDF {
  const { transaction, config, copyChoice = 'both', isReprint = false } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  if (copyChoice === 'both') {
    // Top Half: Salinan Simpanan Guru
    renderPibgReceiptHalf(doc, {
      copyTitle: 'SALINAN SIMPANAN GURU',
      startY: 8,
      transaction,
      config,
      isReprint,
      marginX,
      contentWidth,
    });

    // Divider Line (Keratan Gunting) at Y = 145mm
    const dividerY = 145;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.35);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(marginX, dividerY, marginX + contentWidth, dividerY);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      '✂  - - - - - - - - -  KERATAN SALINAN SIMPANAN GURU (ATAS) & SALINAN IBU BAPA (BAWAH)  - - - - - - - - -  ✂',
      pageWidth / 2,
      dividerY - 1,
      { align: 'center' }
    );

    // Bottom Half: Salinan Ibu Bapa / Penjaga
    renderPibgReceiptHalf(doc, {
      copyTitle: 'SALINAN IBU BAPA / PENJAGA',
      startY: 151,
      transaction,
      config,
      isReprint,
      marginX,
      contentWidth,
    });
  } else if (copyChoice === 'parent') {
    renderPibgReceiptHalf(doc, {
      copyTitle: 'SALINAN IBU BAPA / PENJAGA',
      startY: 18,
      transaction,
      config,
      isReprint,
      marginX,
      contentWidth,
    });
  } else {
    renderPibgReceiptHalf(doc, {
      copyTitle: 'SALINAN SIMPANAN GURU',
      startY: 18,
      transaction,
      config,
      isReprint,
      marginX,
      contentWidth,
    });
  }

  return doc;
}
