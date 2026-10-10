import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { Transaction, SchoolConfig } from '../types';
import { formatRM } from './currency';

export interface ReceiptPdfOptions {
  transaction: Transaction;
  config: SchoolConfig;
  isReprint?: boolean;
  cumulativePaidCents: number;
  overallBalanceCents: number;
  layout?: 'single_page' | 'two_pages';
}

/**
 * Renders an official single-page combined receipt directly on the provided jsPDF document.
 */
export function renderSinglePageCombinedOnDoc(
  doc: jsPDF,
  {
    transaction,
    config,
    isReprint = false,
    cumulativePaidCents,
    overallBalanceCents,
  }: ReceiptPdfOptions
): void {
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186mm

  // Top half: Salinan Guru / Sekolah
  renderReceiptHalf(doc, {
    copyTitle: 'SALINAN GURU / REKOD SEKOLAH',
    startY: 6,
    transaction,
    config,
    isReprint: isReprint || transaction.printCount > 1,
    cumulativePaidCents,
    overallBalanceCents,
    marginX,
    contentWidth,
  });

  // Middle cutting divider (at Y = 144mm)
  const dividerY = 144;
  doc.setDrawColor(148, 163, 184); // slate-400
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(marginX, dividerY, marginX + contentWidth, dividerY);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '✂  - - - - - - - - - - - - - -  KERATAN SALINAN GURU (ATAS) & SALINAN IBU BAPA (BAWAH)  - - - - - - - - - - - - - -  ✂',
    pageWidth / 2,
    dividerY - 1,
    { align: 'center' }
  );

  // Bottom half: Salinan Ibu Bapa / Penjaga
  renderReceiptHalf(doc, {
    copyTitle: 'SALINAN IBU BAPA / PENJAGA',
    startY: 149,
    transaction,
    config,
    isReprint: isReprint || transaction.printCount > 1,
    cumulativePaidCents,
    overallBalanceCents,
    marginX,
    contentWidth,
  });
}

/**
 * Generates an official SINGLE-PAGE (1 Halaman A4 Portrait) PDF receipt
 * containing BOTH:
 * - Upper Half: SALINAN GURU / SEKOLAH
 * - Divider: Garisan Keratan Gunting Putus-putus
 * - Lower Half: SALINAN IBU BAPA / PENJAGA
 * This satisfies: "SEDIAKAN RESIT JUGA DALAM SATU HALAMAN MENDAPATI SALINAN GURU DAN SALINAN IBU BAPA"
 */
export function generateSinglePageCombinedPdf(options: ReceiptPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  renderSinglePageCombinedOnDoc(doc, options);
  return doc;
}

export interface BulkReceiptItem {
  transaction: Transaction;
  config: SchoolConfig;
  cumulativePaidCents: number;
  overallBalanceCents: number;
}

/**
 * Generates a single consolidated PDF document containing multiple receipts (1 page per receipt)
 */
export function generateBulkReceiptsPdf(
  items: BulkReceiptItem[],
  onProgress?: (current: number, total: number) => void
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  items.forEach((item, index) => {
    if (index > 0) {
      doc.addPage('a4', 'portrait');
    }
    renderSinglePageCombinedOnDoc(doc, {
      transaction: item.transaction,
      config: item.config,
      cumulativePaidCents: item.cumulativePaidCents,
      overallBalanceCents: item.overallBalanceCents,
    });
    if (onProgress) {
      onProgress(index + 1, items.length);
    }
  });

  return doc;
}

/**
 * Generates a ZIP archive containing individual PDF receipts for each student
 */
export async function generateBulkReceiptsZip(
  items: BulkReceiptItem[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const doc = generateSinglePageCombinedPdf({
      transaction: item.transaction,
      config: item.config,
      cumulativePaidCents: item.cumulativePaidCents,
      overallBalanceCents: item.overallBalanceCents,
    });
    const pdfBlob = doc.output('blob');
    const safeStudentName = item.transaction.studentName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const safeReceiptNum = item.transaction.receiptNumber.replace(/\//g, '_');
    const filename = `${safeReceiptNum}_${safeStudentName}.pdf`;
    zip.file(filename, pdfBlob);

    if (onProgress) {
      onProgress(i + 1, items.length);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Browser download helper for Blobs
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates an official, strictly two-page A4 Portrait PDF receipt for SK Tudan.
 * Page 1: SALINAN IBU BAPA / PENJAGA
 * Page 2: SALINAN REKOD SEKOLAH
 */
export function generateReceiptPdf(options: ReceiptPdfOptions): jsPDF {
  if (options.layout === 'single_page') {
    return generateSinglePageCombinedPdf(options);
  }

  const {
    transaction,
    config,
    isReprint = false,
    cumulativePaidCents,
    overallBalanceCents,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // Render Page 1
  renderReceiptPage(doc, {
    copyTitle: 'SALINAN IBU BAPA / PENJAGA',
    pageNumber: 1,
    transaction,
    config,
    isReprint: isReprint || transaction.printCount > 1,
    cumulativePaidCents,
    overallBalanceCents,
    marginX,
    contentWidth,
  });

  // Add Page 2
  doc.addPage('a4', 'portrait');

  // Render Page 2
  renderReceiptPage(doc, {
    copyTitle: 'SALINAN REKOD SEKOLAH',
    pageNumber: 2,
    transaction,
    config,
    isReprint: isReprint || transaction.printCount > 1,
    cumulativePaidCents,
    overallBalanceCents,
    marginX,
    contentWidth,
  });

  return doc;
}

interface PageRenderContext {
  copyTitle: string;
  pageNumber: number;
  transaction: Transaction;
  config: SchoolConfig;
  isReprint: boolean;
  cumulativePaidCents: number;
  overallBalanceCents: number;
  marginX: number;
  contentWidth: number;
}

function renderReceiptPage(doc: jsPDF, ctx: PageRenderContext) {
  const {
    copyTitle,
    pageNumber,
    transaction,
    config,
    isReprint,
    cumulativePaidCents,
    overallBalanceCents,
    marginX,
    contentWidth,
  } = ctx;

  const rightX = marginX + contentWidth;
  let curY = 12;

  // --- Top Border Line & Copy Label ---
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.8);
  doc.line(marginX, curY, rightX, curY);

  curY += 5;

  // Copy Badge (Header top right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`[ ${copyTitle} ]`, rightX, curY, { align: 'right' });

  // Reprint indicator if applicable
  if (isReprint) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9); // amber/dark orange
    doc.text('* SALINAN CETAK SEMULA *', rightX - 60, curY, { align: 'right' });
  }

  // If Cancelled indicator
  if (transaction.status === 'Dibatalkan') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(220, 38, 38); // red
    doc.text('*** RESIT INI TELAH DIBATALKAN ***', marginX, curY);
  }

  curY += 4;

  // --- School Header with Logo slot ---
  const logoBoxWidth = 24;
  const logoBoxHeight = 24;

  if (config.logoBase64 && config.logoBase64.startsWith('data:image')) {
    try {
      const imgFormat = (config.logoBase64.includes('image/jpeg') || config.logoBase64.includes('image/jpg')) ? 'JPEG' : 'PNG';
      doc.addImage(config.logoBase64, imgFormat, marginX, curY, logoBoxWidth, logoBoxHeight);
    } catch {
      drawSchoolEmblemPlaceholder(doc, marginX, curY, logoBoxWidth, logoBoxHeight);
    }
  } else {
    drawSchoolEmblemPlaceholder(doc, marginX, curY, logoBoxWidth, logoBoxHeight);
  }

  const textStartX = marginX + logoBoxWidth + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(config.schoolName, textStartX, curY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`KOD SEKOLAH: ${config.schoolCode}  |  ${config.schoolAddress}`, textStartX, curY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('RESIT RASMI PEMBAYARAN KEPERLUAN PERSEKOLAHAN', textStartX, curY + 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Sesi Persekolahan: ${transaction.schoolYear || config.currentSchoolYear}`, textStartX, curY + 24.5);

  curY += 28;

  // Double divider
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(marginX, curY, rightX, curY);
  doc.setLineWidth(0.2);
  doc.line(marginX, curY + 1.2, rightX, curY + 1.2);

  curY += 5;

  // --- Transaction & Student Meta Box ---
  const classTeacherName = transaction.classTeacherName || config.classTeachers?.[transaction.studentClass] || 'Guru Kelas SK Tudan';
  const metaBoxY = curY;
  const metaBoxHeight = 31;
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, metaBoxY, contentWidth, metaBoxHeight, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(marginX, metaBoxY, contentWidth, metaBoxHeight, 'S');

  // Left column in Meta Box
  const col1X = marginX + 3.5;
  const col1ValX = col1X + 27;
  doc.setFontSize(9.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('No. Resit', col1X, metaBoxY + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.receiptNumber}`, col1ValX, metaBoxY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Nama Murid', col1X, metaBoxY + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  // Truncate long names cleanly
  const truncatedStudent = transaction.studentName.length > 32 
    ? transaction.studentName.substring(0, 30) + '...' 
    : transaction.studentName;
  doc.text(`: ${truncatedStudent}`, col1ValX, metaBoxY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Kelas & Sesi', col1X, metaBoxY + 19.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.studentClass} (${transaction.schoolYear})`, col1ValX, metaBoxY + 19.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // emerald
  doc.text('Guru Kelas', col1X, metaBoxY + 26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const truncTeacherMeta = classTeacherName.length > 32 ? classTeacherName.substring(0, 30) + '..' : classTeacherName;
  doc.text(`: ${truncTeacherMeta}`, col1ValX, metaBoxY + 26);

  // Right column in Meta Box
  const col2X = marginX + 98;
  const col2ValX = col2X + 28;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Tarikh & Masa', col2X, metaBoxY + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.timestampMalaysia || transaction.timestamp}`, col2ValX, metaBoxY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Kaedah Bayar', col2X, metaBoxY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const refText = transaction.referenceNumber ? ` (${transaction.referenceNumber})` : '';
  doc.text(`: ${transaction.paymentMethod}${refText}`, col2ValX, metaBoxY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Status Bayaran', col2X, metaBoxY + 19.5);
  if (transaction.status === 'Dibatalkan') {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(': DIBATALKAN', col2ValX, metaBoxY + 19.5);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // green
    doc.text(': SAH DITERIMA', col2ValX, metaBoxY + 19.5);
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Pembayar', col2X, metaBoxY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.payerName || '-'}`, col2ValX, metaBoxY + 26);

  curY += metaBoxHeight + 5;

  // Cancellation notice block if cancelled
  if (transaction.status === 'Dibatalkan' && transaction.cancellationReason) {
    doc.setFillColor(254, 242, 242);
    doc.rect(marginX, curY, contentWidth, 9, 'F');
    doc.setDrawColor(248, 113, 113);
    doc.rect(marginX, curY, contentWidth, 9, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text(`SEBAB PEMBATALAN: ${transaction.cancellationReason} (Oleh: ${transaction.cancelledBy || 'Pentadbir'} pada ${transaction.cancelledAt ? new Date(transaction.cancelledAt).toLocaleString('ms-MY') : '-'})`, marginX + 3, curY + 6);
    curY += 12;
  }

  // --- Table Header ---
  // Table Columns width definition: total = 182mm
  // Bil: 10mm, Perkara: 68mm, Kadar: 26mm, Telah Bayar: 26mm, Bayaran Semasa: 26mm, Baki Selepas: 26mm = 182mm
  const colW = {
    no: 10,
    item: 68,
    rate: 26,
    prev: 26,
    curr: 26,
    balance: 26,
  };

  const xPositions = {
    no: marginX,
    item: marginX + colW.no,
    rate: marginX + colW.no + colW.item,
    prev: marginX + colW.no + colW.item + colW.rate,
    curr: marginX + colW.no + colW.item + colW.rate + colW.prev,
    balance: marginX + colW.no + colW.item + colW.rate + colW.prev + colW.curr,
    end: rightX,
  };

  // Header background
  const headerHeight = 7.5;
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, curY, contentWidth, headerHeight, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.rect(marginX, curY, contentWidth, headerHeight, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  doc.text('BIL.', xPositions.no + 5, curY + 5, { align: 'center' });
  doc.text('PERKARA / BUTIRAN KEPERLUAN', xPositions.item + 3, curY + 5);
  doc.text('KADAR (RM)', xPositions.rate + colW.rate - 3, curY + 5, { align: 'right' });
  doc.text('TELAH BAYAR', xPositions.prev + colW.prev - 3, curY + 5, { align: 'right' });
  doc.text('BAYARAN INI', xPositions.curr + colW.curr - 3, curY + 5, { align: 'right' });
  doc.text('BAKI SELEPAS', xPositions.balance + colW.balance - 3, curY + 5, { align: 'right' });

  curY += headerHeight;

  // --- Table Rows ---
  const rowHeight = 6.2;
  const items = transaction.items || [];

  items.forEach((item, idx) => {
    // Alternating background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, curY, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginX, curY + rowHeight, rightX, curY + rowHeight);

    // Vertical column lines
    doc.line(xPositions.item, curY, xPositions.item, curY + rowHeight);
    doc.line(xPositions.rate, curY, xPositions.rate, curY + rowHeight);
    doc.line(xPositions.prev, curY, xPositions.prev, curY + rowHeight);
    doc.line(xPositions.curr, curY, xPositions.curr, curY + rowHeight);
    doc.line(xPositions.balance, curY, xPositions.balance, curY + rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text(String(idx + 1), xPositions.no + 5, curY + 4.3, { align: 'center' });
    
    // Perkara name
    const trimmedName = item.feeItemName.length > 36 
      ? item.feeItemName.substring(0, 34) + '..' 
      : item.feeItemName;
    doc.text(trimmedName, xPositions.item + 3, curY + 4.3);

    // Numbers
    doc.text(formatRM(item.feeRateCents).replace('RM', ''), xPositions.rate + colW.rate - 3, curY + 4.3, { align: 'right' });
    doc.text(formatRM(item.previouslyPaidCents).replace('RM', ''), xPositions.prev + colW.prev - 3, curY + 4.3, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(formatRM(item.currentPaymentCents).replace('RM', ''), xPositions.curr + colW.curr - 3, curY + 4.3, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    if (item.remainingCentsAfter === 0) {
      doc.setTextColor(16, 185, 129);
      doc.text('0.00 (L)', xPositions.balance + colW.balance - 3, curY + 4.3, { align: 'right' });
    } else {
      doc.setTextColor(180, 83, 9);
      doc.text(formatRM(item.remainingCentsAfter).replace('RM', ''), xPositions.balance + colW.balance - 3, curY + 4.3, { align: 'right' });
    }

    curY += rowHeight;
  });

  // Table outer border
  const tableTotalHeight = headerHeight + items.length * rowHeight;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.rect(marginX, curY - items.length * rowHeight, contentWidth, items.length * rowHeight, 'S');

  curY += 3;

  // --- Summary Financial Totals Box ---
  const summaryBoxHeight = 24;
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, curY, contentWidth, summaryBoxHeight, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(marginX, curY, contentWidth, summaryBoxHeight, 'S');

  // Left box: Notes or Catatan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Catatan Transaksi:', marginX + 4, curY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const noteText = transaction.notes ? transaction.notes : 'Tiada catatan tambahan.';
  const splitNotes = doc.splitTextToSize(noteText, 85);
  doc.text(splitNotes, marginX + 4, curY + 11);

  // Right box: 3 Big Totals
  const sumColLabelX = marginX + 96;
  const sumColValX = rightX - 4;

  // 1. Jumlah Diterima Resit Ini
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('JUMLAH DITERIMA (RESIT INI) :', sumColLabelX, curY + 6.5);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(formatRM(transaction.totalAmountCents), sumColValX, curY + 6.5, { align: 'right' });

  // Divider inside summary
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(sumColLabelX, curY + 9, rightX - 2, curY + 9);

  if (transaction.changeReturnedCents && transaction.changeReturnedCents > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Wang Tunai Dihulur / Diterima :', sumColLabelX, curY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatRM(transaction.amountTenderedCents || transaction.totalAmountCents), sumColValX, curY + 14, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(4, 120, 87);
    doc.text('BAKI DIKEMBALIKAN KEPADA MURID :', sumColLabelX, curY + 19.5);
    const statusTxt = transaction.changeReturnedStatus === 'Belum Dipulangkan' ? ' (*Belum Serah)' : ' (*Telah Pulang)';
    doc.text(`${formatRM(transaction.changeReturnedCents)}${statusTxt}`, sumColValX, curY + 19.5, { align: 'right' });
  } else {
    // 2. Jumlah Terkumpul Telah Dibayar
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Jumlah Terkumpul Telah Dibayar :', sumColLabelX, curY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatRM(cumulativePaidCents), sumColValX, curY + 14, { align: 'right' });

    // 3. Status Bayaran Keperluan
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Status Pembayaran Keperluan :', sumColLabelX, curY + 19.5);
    doc.setFont('helvetica', 'bold');
    if (overallBalanceCents === 0) {
      doc.setTextColor(16, 185, 129);
      doc.text('SELESAI (PILIHAN IBU BAPA)', sumColValX, curY + 19.5, { align: 'right' });
    } else {
      doc.setTextColor(16, 185, 129);
      doc.text('TELAH DIREKODKAN', sumColValX, curY + 19.5, { align: 'right' });
    }
  }

  curY += summaryBoxHeight + 4;

  // --- Official Notice ---
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, curY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `* ${config.receiptNote || 'Resit ini merupakan bukti rasmi bagi penerimaan amaun bayaran keperluan persekolahan.'}`,
    marginX + 3,
    curY + 4.8
  );

  curY += 10;

  // --- Signature Block & Footer ---
  const sigBoxWidth = 54;
  const leftSigX = marginX + 2;
  const midSigX = marginX + 64;
  const rightSigX = rightX - sigBoxWidth - 2;

  // 1. Pembayar / Penjaga
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Tandatangan Pembayar:', leftSigX, curY + 4);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(leftSigX, curY + 20, leftSigX + sigBoxWidth, curY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Nama: ${transaction.payerName || 'Ibu Bapa / Penjaga'}`, leftSigX, curY + 24);
  doc.text('Tarikh: ...................................', leftSigX, curY + 28);

  // 2. Guru Kelas (Disahkan)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text('Tandatangan Guru Kelas:', midSigX, curY + 4);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(midSigX, curY + 20, midSigX + sigBoxWidth, curY + 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  const truncTeacher = classTeacherName.length > 25 ? classTeacherName.substring(0, 23) + '..' : classTeacherName;
  doc.text(`Nama: ${truncTeacher}`, midSigX, curY + 24);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Jawatan: Guru Kelas (${transaction.studentClass})`, midSigX, curY + 28);

  // 3. Petugas Penerima
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Tandatangan & Cop Petugas:', rightSigX, curY + 4);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(rightSigX, curY + 20, rightSigX + sigBoxWidth, curY + 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`Nama: ${transaction.recordedBy}`, rightSigX, curY + 24);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Jawatan: ${transaction.userRole || 'Petugas Yuran'}`, rightSigX, curY + 28);

  // --- Page Number & Verification Stamp at bottom ---
  const bottomY = 286;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, bottomY - 3, rightX, bottomY - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const adminFooterPart = config.adminName ? ` • Pentadbir: ${config.adminName}` : '';
  doc.text(`Sistem Rekod Yuran SK Tudan${adminFooterPart} • Dijana pada: ${new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`, marginX, bottomY);
  doc.setFont('helvetica', 'bold');
  doc.text(`Halaman ${pageNumber} daripada 2 [${copyTitle}]`, rightX, bottomY, { align: 'right' });
}

function drawSchoolEmblemPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number) {
  // Draw an elegant official emblem / crest shape
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('SK TUDAN', x + w / 2, y + 8, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('MIRI', x + w / 2, y + 13, { align: 'center' });

  doc.setDrawColor(203, 213, 225);
  doc.line(x + 3, y + 15, x + w - 3, y + 15);

  doc.setFontSize(5);
  doc.text('YBA4111', x + w / 2, y + 19, { align: 'center' });
}

interface ReceiptHalfContext {
  copyTitle: string;
  startY: number;
  transaction: Transaction;
  config: SchoolConfig;
  isReprint: boolean;
  cumulativePaidCents: number;
  overallBalanceCents: number;
  marginX: number;
  contentWidth: number;
}

function renderReceiptHalf(doc: jsPDF, ctx: ReceiptHalfContext) {
  const {
    copyTitle,
    startY,
    transaction,
    config,
    isReprint,
    cumulativePaidCents,
    overallBalanceCents,
    marginX,
    contentWidth,
  } = ctx;

  const rightX = marginX + contentWidth;
  let curY = startY;

  // Header border line
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(marginX, curY, rightX, curY);

  curY += 3.5;

  // Copy Badge (Header top right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`[ ${copyTitle} ]`, rightX, curY, { align: 'right' });

  if (isReprint) {
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text('* CETAK SEMULA *', rightX - 60, curY, { align: 'right' });
  }

  if (transaction.status === 'Dibatalkan') {
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    doc.text('*** RESIT DIBATALKAN ***', marginX, curY);
  }

  curY += 2;

  // School Logo / Emblem
  const logoSize = 13.5;
  if (config.logoBase64 && config.logoBase64.startsWith('data:image')) {
    try {
      const imgFormat = (config.logoBase64.includes('image/jpeg') || config.logoBase64.includes('image/jpg')) ? 'JPEG' : 'PNG';
      doc.addImage(config.logoBase64, imgFormat, marginX, curY, logoSize, logoSize);
    } catch {
      drawSchoolEmblemPlaceholder(doc, marginX, curY, logoSize, logoSize);
    }
  } else {
    drawSchoolEmblemPlaceholder(doc, marginX, curY, logoSize, logoSize);
  }

  const textStartX = marginX + logoSize + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(config.schoolName, textStartX, curY + 3.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`KOD: ${config.schoolCode}  |  ${config.schoolAddress}`, textStartX, curY + 7.6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RESIT RASMI PEMBAYARAN KEPERLUAN & GAMBAR KELAS', textStartX, curY + 11.5);

  curY += logoSize + 1.2;

  // Metadata Box (2 columns)
  const classTeacherName = transaction.classTeacherName || config.classTeachers?.[transaction.studentClass] || 'Guru Kelas SK Tudan';
  const metaBoxHeight = 18.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(marginX, curY, contentWidth, metaBoxHeight, 1.5, 1.5, 'FD');

  const c1X = marginX + 3;
  const c1ValX = c1X + 19;
  const c2X = marginX + 96;
  const c2ValX = c2X + 22;

  doc.setFontSize(7.5);

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('No. Resit', c1X, curY + 3.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.receiptNumber}`, c1ValX, curY + 3.8);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Tarikh/Masa', c2X, curY + 3.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.timestampMalaysia || transaction.timestamp}`, c2ValX, curY + 3.8);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Nama Murid', c1X, curY + 7.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const truncatedStudent =
    transaction.studentName.length > 36
      ? transaction.studentName.substring(0, 34) + '...'
      : transaction.studentName;
  doc.text(`: ${truncatedStudent}`, c1ValX, curY + 7.8);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Kaedah Bayar', c2X, curY + 7.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(
    `: ${transaction.paymentMethod}${transaction.referenceNumber ? ` (${transaction.referenceNumber})` : ''}`,
    c2ValX,
    curY + 7.8
  );

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Kelas & Sesi', c1X, curY + 11.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.studentClass} (${transaction.schoolYear})`, c1ValX, curY + 11.8);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Pembayar', c2X, curY + 11.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.payerName || '-'}`, c2ValX, curY + 11.8);

  // Row 4 (Guru Kelas & Penerima)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text('Guru Kelas', c1X, curY + 15.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const truncTeacherComb = classTeacherName.length > 34 ? classTeacherName.substring(0, 32) + '..' : classTeacherName;
  doc.text(`: ${truncTeacherComb}`, c1ValX, curY + 15.8);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Diterima Oleh', c2X, curY + 15.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.recordedBy}`, c2ValX, curY + 15.8);

  curY += metaBoxHeight + 2;

  // Table Headers
  const colW = { bil: 8, item: 96, kadar: 27, semasa: 28, baki: 27 };
  const thY = curY;
  const thH = 4.8;

  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, thY, contentWidth, thH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);

  doc.text('Bil', marginX + 2, thY + 3.4);
  doc.text('Butiran / Perkara Bayaran', marginX + colW.bil + 2, thY + 3.4);
  doc.text('Kadar (RM)', marginX + colW.bil + colW.item + colW.kadar - 2, thY + 3.4, { align: 'right' });
  doc.text('Dibayar Semasa (RM)', marginX + colW.bil + colW.item + colW.kadar + colW.semasa - 2, thY + 3.4, { align: 'right' });
  doc.text('Baki (RM)', rightX - 2, thY + 3.4, { align: 'right' });

  curY += thH;

  // Table Rows (readable height 4.2mm per row)
  const items = transaction.items || [];
  const maxDisplayItems = 7;
  const displayItems = items.slice(0, maxDisplayItems);
  const remainingCount = items.length - maxDisplayItems;

  displayItems.forEach((it, idx) => {
    const rowH = 4.2;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, curY, contentWidth, rowH, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);

    doc.text(String(idx + 1), marginX + 2, curY + 3.1);
    const itemName = it.feeItemName.length > 50 ? it.feeItemName.substring(0, 48) + '..' : it.feeItemName;
    doc.text(itemName, marginX + colW.bil + 2, curY + 3.1);
    doc.text(formatRM(it.feeRateCents), marginX + colW.bil + colW.item + colW.kadar - 2, curY + 3.1, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatRM(it.currentPaymentCents), marginX + colW.bil + colW.item + colW.kadar + colW.semasa - 2, curY + 3.1, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(formatRM(it.remainingCentsAfter), rightX - 2, curY + 3.1, { align: 'right' });

    curY += rowH;
  });

  if (remainingCount > 0) {
    const rowH = 3.8;
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, curY, contentWidth, rowH, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`... serta ${remainingCount} butiran bayaran lain (rujuk rekod penuh)`, marginX + 10, curY + 2.8);
    curY += rowH;
  }

  // Total Row
  const totalRowH = 5.2;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(marginX, curY, contentWidth, totalRowH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('JUMLAH BAYARAN RESIT INI', marginX + 3, curY + 3.6);

  doc.setTextColor(4, 120, 87); // bold emerald green
  doc.text(formatRM(transaction.totalAmountCents), marginX + colW.bil + colW.item + colW.kadar + colW.semasa - 2, curY + 3.6, { align: 'right' });

  doc.setTextColor(4, 120, 87);
  doc.setFontSize(7.5);
  doc.text(`Terkumpul: ${formatRM(cumulativePaidCents)}`, rightX - 2, curY + 3.6, { align: 'right' });

  curY += totalRowH;

  if (transaction.changeReturnedCents && transaction.changeReturnedCents > 0) {
    const changeRowH = 4.5;
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.setLineWidth(0.35);
    doc.rect(marginX, curY, contentWidth, changeRowH, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    const tenderPart = transaction.amountTenderedCents ? `Wang Diterima: ${formatRM(transaction.amountTenderedCents)}  |  ` : '';
    doc.text(`${tenderPart}BAKI DIKEMBALIKAN KEPADA MURID:`, marginX + 3, curY + 3.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(4, 120, 87);
    const stPart = transaction.changeReturnedStatus === 'Belum Dipulangkan' ? ' (*Belum Serah)' : ' (*Telah Pulang)';
    doc.text(`${formatRM(transaction.changeReturnedCents)}${stPart}`, rightX - 2, curY + 3.2, { align: 'right' });

    curY += changeRowH + 1.5;
  } else {
    curY += 2;
  }

  // Signatures (Compact 3 columns)
  const sigW = 54;
  const s1X = marginX + 2;
  const sMidX = marginX + 64;
  const s2X = rightX - sigW - 2;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('* Resit rasmi cetakan komputer SK Tudan. Sah sebagai bukti penerimaan rasmi.', marginX, curY + 2.5);

  // Left signature (Pembayar)
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);
  doc.line(s1X, curY + 9.5, s1X + sigW, curY + 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(`Tandatangan Pembayar: ${transaction.payerName || 'Ibu Bapa / Penjaga'}`, s1X, curY + 12.5);

  // Center signature (Guru Kelas)
  doc.line(sMidX, curY + 9.5, sMidX + sigW, curY + 9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text(`Guru Kelas: ${truncTeacherComb}`, sMidX, curY + 12.5);

  // Right signature (Penerima)
  doc.line(s2X, curY + 9.5, s2X + sigW, curY + 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Tandatangan & Cop: ${transaction.recordedBy}`, s2X, curY + 12.5);
}
