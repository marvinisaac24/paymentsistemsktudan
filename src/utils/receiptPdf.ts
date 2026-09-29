import { jsPDF } from 'jspdf';
import { Transaction, SchoolConfig } from '../types';
import { formatRM } from './currency';

export interface ReceiptPdfOptions {
  transaction: Transaction;
  config: SchoolConfig;
  isReprint?: boolean;
  cumulativePaidCents: number;
  overallBalanceCents: number;
}

/**
 * Generates an official, strictly two-page A4 Portrait PDF receipt for SK Tudan.
 * Page 1: SALINAN IBU BAPA / PENJAGA
 * Page 2: SALINAN REKOD SEKOLAH
 */
export function generateReceiptPdf({
  transaction,
  config,
  isReprint = false,
  cumulativePaidCents,
  overallBalanceCents,
}: ReceiptPdfOptions): jsPDF {
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
      doc.addImage(config.logoBase64, 'PNG', marginX, curY, logoBoxWidth, logoBoxHeight);
    } catch {
      drawSchoolEmblemPlaceholder(doc, marginX, curY, logoBoxWidth, logoBoxHeight);
    }
  } else {
    drawSchoolEmblemPlaceholder(doc, marginX, curY, logoBoxWidth, logoBoxHeight);
  }

  const textStartX = marginX + logoBoxWidth + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(config.schoolName, textStartX, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`KOD SEKOLAH: ${config.schoolCode}  |  ${config.schoolAddress}`, textStartX, curY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('RESIT RASMI PEMBAYARAN KEPERLUAN TAHUN 3', textStartX, curY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Sesi Persekolahan: ${transaction.schoolYear || config.currentSchoolYear}`, textStartX, curY + 23);

  curY += 27;

  // Double divider
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(marginX, curY, rightX, curY);
  doc.setLineWidth(0.2);
  doc.line(marginX, curY + 1.2, rightX, curY + 1.2);

  curY += 5;

  // --- Transaction & Student Meta Box ---
  const metaBoxY = curY;
  const metaBoxHeight = 26;
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, metaBoxY, contentWidth, metaBoxHeight, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(marginX, metaBoxY, contentWidth, metaBoxHeight, 'S');

  // Left column in Meta Box
  const col1X = marginX + 3;
  const col1ValX = col1X + 26;
  doc.setFontSize(8.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('No. Resit', col1X, metaBoxY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.receiptNumber}`, col1ValX, metaBoxY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Nama Murid', col1X, metaBoxY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  // Truncate long names cleanly
  const truncatedStudent = transaction.studentName.length > 32 
    ? transaction.studentName.substring(0, 30) + '...' 
    : transaction.studentName;
  doc.text(`: ${truncatedStudent}`, col1ValX, metaBoxY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Kelas & Sesi', col1X, metaBoxY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.studentClass} (${transaction.schoolYear})`, col1ValX, metaBoxY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Pembayar', col1X, metaBoxY + 23);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.payerName || '-'}`, col1ValX, metaBoxY + 23);

  // Right column in Meta Box
  const col2X = marginX + 98;
  const col2ValX = col2X + 26;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Tarikh & Masa', col2X, metaBoxY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.timestampMalaysia || transaction.timestamp}`, col2ValX, metaBoxY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Kaedah Bayar', col2X, metaBoxY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const refText = transaction.referenceNumber ? ` (${transaction.referenceNumber})` : '';
  doc.text(`: ${transaction.paymentMethod}${refText}`, col2ValX, metaBoxY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Status Bayaran', col2X, metaBoxY + 18);
  if (transaction.status === 'Dibatalkan') {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(': DIBATALKAN', col2ValX, metaBoxY + 18);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // green
    doc.text(': SAH DITERIMA', col2ValX, metaBoxY + 18);
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Diterima Oleh', col2X, metaBoxY + 23);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${transaction.recordedBy}`, col2ValX, metaBoxY + 23);

  curY += metaBoxHeight + 4;

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

  // 2. Jumlah Terkumpul Telah Dibayar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Jumlah Terkumpul Telah Dibayar :', sumColLabelX, curY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatRM(cumulativePaidCents), sumColValX, curY + 14, { align: 'right' });

  // 3. Baki Keseluruhan Selepas Bayaran
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Baki Keseluruhan Selepas Bayaran :', sumColLabelX, curY + 19.5);
  doc.setFont('helvetica', 'bold');
  if (overallBalanceCents === 0) {
    doc.setTextColor(16, 185, 129);
    doc.text('RM 0.00 (SELESAI)', sumColValX, curY + 19.5, { align: 'right' });
  } else {
    doc.setTextColor(180, 83, 9);
    doc.text(formatRM(overallBalanceCents), sumColValX, curY + 19.5, { align: 'right' });
  }

  curY += summaryBoxHeight + 4;

  // --- Official Notice ---
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, curY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `* ${config.receiptNote || 'Resit ini merupakan bukti rasmi bagi penerimaan amaun bayaran keperluan persekolahan Tahun 3.'}`,
    marginX + 3,
    curY + 4.8
  );

  curY += 10;

  // --- Signature Block & Footer ---
  const sigBoxWidth = 75;
  const leftSigX = marginX + 4;
  const rightSigX = rightX - sigBoxWidth - 4;

  // Left Sign: Pembayar / Penjaga
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Tandatangan Pembayar / Penjaga:', leftSigX, curY + 4);

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(leftSigX, curY + 22, leftSigX + sigBoxWidth, curY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Nama: ${transaction.payerName || 'Ibu Bapa / Penjaga'}`, leftSigX, curY + 26);
  doc.text('Tarikh: ........................................', leftSigX, curY + 30);

  // Right Sign: Guru / Petugas Penerima
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Tandatangan & Cop Guru / Petugas:', rightSigX, curY + 4);

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(rightSigX, curY + 22, rightSigX + sigBoxWidth, curY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Nama: ${transaction.recordedBy}`, rightSigX, curY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Jawatan: ${transaction.userRole || 'Guru / Petugas Yuran'}`, rightSigX, curY + 30);

  // --- Page Number & Verification Stamp at bottom ---
  const bottomY = 286;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, bottomY - 3, rightX, bottomY - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Sistem Rekod Yuran SK Tudan • Dijana pada: ${new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`, marginX, bottomY);
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
  doc.text('YBA4103', x + w / 2, y + 19, { align: 'center' });
}
