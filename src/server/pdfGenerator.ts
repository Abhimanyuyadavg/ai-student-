import PDFDocument from 'pdfkit';
import path from 'node:path';
import fs from 'node:fs';
import type { PdfNoteItem, PdfPaymentOrder, PdfStudyLangSection, PdfTaxConfig } from '../types/index.ts';

const FONT_DIR = path.resolve(process.cwd(), 'src', 'server', 'fonts');

function resolveFont(filename: string, systemFallback: string): string {
  const local = path.join(FONT_DIR, filename);
  if (fs.existsSync(local)) return local;
  return systemFallback;
}

const LATIN_REG = resolveFont('DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
const LATIN_BOLD = resolveFont('DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');
const DEVA_REG = resolveFont(
  'NotoSansDevanagari-Regular.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf'
);
const DEVA_BOLD = resolveFont(
  'NotoSansDevanagari-Bold.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf'
);

function registerFonts(doc: PDFKit.PDFDocument) {
  doc.registerFont('Latin', LATIN_REG);
  doc.registerFont('LatinBold', LATIN_BOLD);
  doc.registerFont('Deva', DEVA_REG);
  doc.registerFont('DevaBold', DEVA_BOLD);
}

// Replace characters not supported by DejaVu/NotoDevanagari (e.g. non-BMP emojis) gracefully
function sanitizeText(raw: string): string {
  return String(raw || '')
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\r\n/g, '\n')
    .replace(/[\u{10000}-\u{10FFFF}]/gu, '');
}

function splitScriptRuns(text: string): { text: string; isDeva: boolean }[] {
  const clean = sanitizeText(text);
  if (!clean) return [{ text: ' ', isDeva: false }];
  const re = /([\u0900-\u097F\u200C\u200D]+(?:\s+[\u0900-\u097F\u200C\u200D]+)*)/g;
  const runs: { text: string; isDeva: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: clean.slice(lastIndex, match.index), isDeva: false });
    }
    runs.push({ text: match[0], isDeva: true });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < clean.length) {
    runs.push({ text: clean.slice(lastIndex), isDeva: false });
  }
  return runs.length ? runs : [{ text: ' ', isDeva: false }];
}

function writeMixedText(
  doc: PDFKit.PDFDocument,
  text: string,
  opts: {
    x?: number;
    y?: number;
    width?: number;
    bold?: boolean;
    fontSize?: number;
    color?: string;
    lineGap?: number;
    align?: 'left' | 'center' | 'right';
  } = {}
) {
  const runs = splitScriptRuns(text);
  const fontSize = opts.fontSize ?? 10.5;
  const bold = opts.bold ?? false;
  const color = opts.color ?? '#0f172a';
  const lineGap = opts.lineGap ?? 3;

  doc.fillColor(color).fontSize(fontSize);

  runs.forEach((run, idx) => {
    const isLast = idx === runs.length - 1;
    const fontName = run.isDeva ? (bold ? 'DevaBold' : 'Deva') : bold ? 'LatinBold' : 'Latin';
    doc.font(fontName);
    const textOpts: PDFKit.Mixins.TextOptions = {
      width: opts.width,
      lineGap,
      align: opts.align || 'left',
      continued: !isLast,
    };
    if (idx === 0 && opts.x !== undefined && opts.y !== undefined) {
      doc.text(run.text, opts.x, opts.y, textOpts);
    } else if (idx === 0 && opts.x !== undefined) {
      doc.text(run.text, opts.x, doc.y, textOpts);
    } else {
      doc.text(run.text, textOpts);
    }
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, minHeight: number) {
  const limit = doc.page.height - doc.page.margins.bottom - 28;
  if (doc.y + minHeight > limit) {
    doc.addPage();
  }
}

function drawSectionHeading(doc: PDFKit.PDFDocument, title: string, accent = '#312e81') {
  ensureSpace(doc, 76);
  doc.moveDown(0.5);
  const y = doc.y;
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.rect(left, y, width, 24).fill('#eef2ff');
  writeMixedText(doc, title, {
    x: left + 10,
    y: y + 5,
    width: width - 20,
    bold: true,
    fontSize: 11.5,
    color: accent,
    lineGap: 1,
  });
  doc.y = y + 32;
}

function renderLanguageSections(
  doc: PDFKit.PDFDocument,
  langLabel: string,
  section: PdfStudyLangSection,
  isHindiLabel: boolean
) {
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Medium Banner
  ensureSpace(doc, 40);
  const bannerY = doc.y;
  doc.roundedRect(left, bannerY, contentWidth, 24, 4).fill('#1e1b4b');
  writeMixedText(doc, langLabel, {
    x: left + 12,
    y: bannerY + 6,
    width: contentWidth - 24,
    bold: true,
    fontSize: 11,
    color: '#ffffff',
  });
  doc.y = bannerY + 32;

  // 1. Overview
  drawSectionHeading(
    doc,
    isHindiLabel ? '1. अध्याय का सरल एवं संक्षिप्त विवरण (Chapter Overview)' : '1. Chapter Overview & Concise Summary'
  );
  writeMixedText(doc, section.overview, {
    x: left,
    width: contentWidth,
    fontSize: 10.5,
    color: '#1e293b',
    lineGap: 4,
  });

  // 2. Definitions
  if (section.definitions.length > 0) {
    drawSectionHeading(
      doc,
      isHindiLabel ? '2. महत्वपूर्ण परिभाषाएँ एवं शब्दावली (Key Definitions)' : '2. Important Definitions & Key Terms'
    );
    section.definitions.forEach((def, idx) => {
      ensureSpace(doc, 40);
      writeMixedText(doc, `${idx + 1}. ${def.term}: `, {
        x: left,
        width: contentWidth,
        bold: true,
        fontSize: 10.5,
        color: '#0f172a',
        lineGap: 2,
      });
      writeMixedText(doc, def.meaning, {
        x: left + 12,
        width: contentWidth - 12,
        fontSize: 10,
        color: '#334155',
        lineGap: 3,
      });
      doc.moveDown(0.35);
    });
  }

  // 3. Formulas
  if (section.formulas.length > 0) {
    drawSectionHeading(
      doc,
      isHindiLabel ? '3. महत्वपूर्ण सूत्र एवं नियम (Formulas & Laws)' : '3. Important Formulas & Core Rules'
    );
    section.formulas.forEach((fm) => {
      ensureSpace(doc, 46);
      const boxY = doc.y;
      doc.roundedRect(left, boxY, contentWidth, 38, 4).fillAndStroke('#f8fafc', '#cbd5e1');
      writeMixedText(doc, `${fm.name}:  ${fm.expression}`, {
        x: left + 10,
        y: boxY + 6,
        width: contentWidth - 20,
        bold: true,
        fontSize: 10.5,
        color: '#1e3a8a',
        lineGap: 1,
      });
      writeMixedText(doc, fm.usage, {
        x: left + 10,
        y: boxY + 21,
        width: contentWidth - 20,
        fontSize: 9.5,
        color: '#475569',
        lineGap: 1,
      });
      doc.y = boxY + 44;
    });
  }

  // 4. Exam-Oriented Revision Notes
  if (section.examNotes.length > 0) {
    drawSectionHeading(
      doc,
      isHindiLabel ? '4. परीक्षा में उपयोगी मुख्य बिंदु (Board Exam Tips)' : '4. Exam-Oriented Revision Notes'
    );
    section.examNotes.forEach((note) => {
      ensureSpace(doc, 26);
      writeMixedText(doc, `• ${note}`, {
        x: left + 4,
        width: contentWidth - 8,
        fontSize: 10,
        color: '#1e293b',
        lineGap: 3,
      });
      doc.moveDown(0.25);
    });
  }

  // 5. Important Questions & Model Answers
  if (section.importantQA.length > 0) {
    drawSectionHeading(
      doc,
      isHindiLabel ? '5. महत्वपूर्ण प्रश्न एवं आदर्श उत्तर (Important Q&A)' : '5. Important Questions & Answers'
    );
    section.importantQA.forEach((qa, idx) => {
      ensureSpace(doc, 54);
      writeMixedText(doc, `Q${idx + 1} [${qa.marks} Marks]: ${qa.question}`, {
        x: left,
        width: contentWidth,
        bold: true,
        fontSize: 10.5,
        color: '#0f172a',
        lineGap: 2,
      });
      writeMixedText(doc, `Ans: ${qa.answer}`, {
        x: left + 10,
        width: contentWidth - 10,
        fontSize: 10,
        color: '#334155',
        lineGap: 3,
      });
      doc.moveDown(0.45);
    });
  }

  // 6. MCQs & Answer Key
  if (section.mcqs.length > 0) {
    drawSectionHeading(
      doc,
      isHindiLabel ? '6. अभ्यास MCQ एवं उत्तर कुंजी (Practice MCQs & Key)' : '6. Multiple Choice Questions (MCQs) & Answer Key'
    );
    const letters = ['A', 'B', 'C', 'D'];
    section.mcqs.forEach((mcq, idx) => {
      ensureSpace(doc, 72);
      writeMixedText(doc, `${idx + 1}. ${mcq.question}`, {
        x: left,
        width: contentWidth,
        bold: true,
        fontSize: 10.5,
        color: '#0f172a',
        lineGap: 2,
      });
      mcq.options.forEach((opt, optIdx) => {
        writeMixedText(doc, `   (${letters[optIdx] || optIdx + 1}) ${opt}`, {
          x: left + 8,
          width: contentWidth - 16,
          fontSize: 9.8,
          color: '#334155',
          lineGap: 2,
        });
      });
      const ansLetter = letters[mcq.answerIndex] || 'A';
      const ansText = mcq.options[mcq.answerIndex] || '';
      writeMixedText(doc, `Answer: (${ansLetter}) ${ansText} — ${mcq.explanation}`, {
        x: left + 8,
        width: contentWidth - 16,
        bold: true,
        fontSize: 9.5,
        color: '#047857',
        lineGap: 2,
      });
      doc.moveDown(0.45);
    });
  }
}

export async function generateStudyNotePdfBuffer(
  item: PdfNoteItem,
  medium: 'en' | 'hi' | 'both' = 'both'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 44, bottom: 48, left: 42, right: 42 },
      bufferPages: true,
      info: {
        Title: `AI STUDENTS - ${item.subjectNameEn} Ch ${item.chapterNumber}: ${item.chapterTitleEn}`,
        Author: 'AI STUDENTS (ABHIMANYU OFFICIAL HACKER)',
        Subject: `${item.classId.replace('_', ' ').toUpperCase()} - ${item.subjectNameEn}`,
        Creator: 'AI STUDENTS PDF Study Library Engine',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    registerFonts(doc);

    const pageWidth = doc.page.width;
    const left = doc.page.margins.left;
    const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;

    // Header Card
    doc.rect(0, 0, pageWidth, 108).fill('#1e3a8a');
    writeMixedText(doc, 'AI STUDENTS — STUDY LIBRARY & PREMIUM BOARD NOTES', {
      x: left,
      y: 20,
      width: contentWidth,
      bold: true,
      fontSize: 10,
      color: '#bfdbfe',
    });
    const classLabel = item.classId.replace('class_', 'Class ');
    const streamLabel =
      item.streamId !== 'na' ? ` · ${item.streamId.toUpperCase()} Stream` : '';
    writeMixedText(
      doc,
      `${classLabel}${streamLabel}  ·  ${item.subjectNameEn} (${item.subjectNameHi})`,
      {
        x: left,
        y: 38,
        width: contentWidth,
        bold: true,
        fontSize: 14.5,
        color: '#ffffff',
      }
    );
    writeMixedText(
      doc,
      `Chapter ${item.chapterNumber}: ${item.chapterTitleEn}  |  ${item.chapterTitleHi}`,
      {
        x: left,
        y: 64,
        width: contentWidth,
        bold: false,
        fontSize: 11,
        color: '#e0e7ff',
      }
    );
    doc.y = 122;

    const fallbackSection: PdfStudyLangSection = {
      overview: `${item.chapterTitleEn} (${item.subjectNameEn}) curated original study notes.`,
      definitions: [],
      formulas: [],
      examNotes: [],
      importantQA: [],
      mcqs: [],
    };

    const enContent = item.content?.en || fallbackSection;
    const hiContent = item.content?.hi || fallbackSection;

    if (medium === 'en') {
      renderLanguageSections(doc, 'ENGLISH MEDIUM STUDY GUIDE', enContent, false);
    } else if (medium === 'hi') {
      renderLanguageSections(doc, 'हिंदी माध्यम अध्ययन नोट्स (HINDI MEDIUM)', hiContent, true);
    } else {
      renderLanguageSections(doc, 'ENGLISH MEDIUM STUDY GUIDE', enContent, false);
      doc.addPage();
      renderLanguageSections(doc, 'हिंदी माध्यम अध्ययन नोट्स (HINDI MEDIUM)', hiContent, true);
    }

    // Add uniform footers and page numbering on all buffered pages
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 32;
      doc
        .moveTo(left, footerY - 6)
        .lineTo(pageWidth - doc.page.margins.right, footerY - 6)
        .lineWidth(0.5)
        .strokeColor('#cbd5e1')
        .stroke();
      writeMixedText(
        doc,
        `Original Study Notes · AI STUDENTS (ABHIMANYU OFFICIAL HACKER) · Copyright-Safe Material    |    Page ${i + 1} of ${range.count}`,
        {
          x: left,
          y: footerY,
          width: contentWidth,
          fontSize: 8.2,
          color: '#64748b',
          align: 'center',
        }
      );
    }

    doc.end();
  });
}

export async function generateTaxInvoicePdfBuffer(
  order: PdfPaymentOrder,
  taxConfig: PdfTaxConfig
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 44, bottom: 44, left: 42, right: 42 },
      info: {
        Title: `Tax Invoice ${order.invoiceNumber || order.orderNumber}`,
        Author: taxConfig.sellerLegalName || 'ABHIMANYU OFFICIAL HACKER',
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    registerFonts(doc);

    const pageWidth = doc.page.width;
    const left = doc.page.margins.left;
    const width = pageWidth - doc.page.margins.left - doc.page.margins.right;

    // Header
    doc.rect(0, 0, pageWidth, 88).fill('#0f172a');
    writeMixedText(doc, 'AI STUDENTS — OFFICIAL TAX INVOICE / PAYMENT RECEIPT', {
      x: left,
      y: 22,
      width,
      bold: true,
      fontSize: 13.5,
      color: '#ffffff',
    });
    writeMixedText(
      doc,
      `Invoice No: ${order.invoiceNumber || order.orderNumber}   ·   Order ID: ${order.orderNumber}   ·   Status: VERIFIED`,
      {
        x: left,
        y: 48,
        width,
        fontSize: 10,
        color: '#93c5fd',
      }
    );

    doc.y = 108;

    // Seller & Buyer Box
    const boxY = doc.y;
    doc.roundedRect(left, boxY, width, 122, 6).fillAndStroke('#f8fafc', '#cbd5e1');
    writeMixedText(doc, 'ISSUED BY (SELLER / PLATFORM OWNER)', {
      x: left + 14,
      y: boxY + 12,
      width: width / 2 - 20,
      bold: true,
      fontSize: 9,
      color: '#475569',
    });
    writeMixedText(
      doc,
      `${taxConfig.sellerLegalName}\nPhone: ${taxConfig.supportPhone} · UPI: ${taxConfig.upiId}\nState: ${taxConfig.sellerState}${taxConfig.sellerGstin ? `\nGSTIN: ${taxConfig.sellerGstin}` : '\nGST Registration: Below Threshold / Applicable Rule'}`,
      {
        x: left + 14,
        y: boxY + 28,
        width: width / 2 - 20,
        fontSize: 9.5,
        color: '#0f172a',
        lineGap: 3,
      }
    );

    const col2X = left + width / 2 + 8;
    writeMixedText(doc, 'BILLED TO (STUDENT)', {
      x: col2X,
      y: boxY + 12,
      width: width / 2 - 20,
      bold: true,
      fontSize: 9,
      color: '#475569',
    });
    writeMixedText(
      doc,
      `${order.studentName}\nContact: ${order.studentContact}\nStudent ID: ${order.studentId}\nVerified On: ${new Date(order.verifiedAt || order.updatedAt).toLocaleString('en-IN')}`,
      {
        x: col2X,
        y: boxY + 28,
        width: width / 2 - 20,
        fontSize: 9.5,
        color: '#0f172a',
        lineGap: 3,
      }
    );

    doc.y = boxY + 140;

    // Itemized Tax Table
    const tableY = doc.y;
    doc.rect(left, tableY, width, 26).fill('#e2e8f0');
    writeMixedText(doc, 'Description & HSN/SAC', { x: left + 10, y: tableY + 7, width: 250, bold: true, fontSize: 9.5 });
    writeMixedText(doc, 'Taxable', { x: left + 270, y: tableY + 7, width: 70, bold: true, fontSize: 9.5 });
    writeMixedText(doc, `GST (${order.taxRatePercent}%)`, { x: left + 350, y: tableY + 7, width: 80, bold: true, fontSize: 9.5 });
    writeMixedText(doc, 'Total', { x: left + 440, y: tableY + 7, width: 65, bold: true, fontSize: 9.5 });

    const rowY = tableY + 32;
    doc.rect(left, rowY - 6, width, 54).stroke('#cbd5e1');
    writeMixedText(
      doc,
      `${order.pdfTitle}\n(${order.classId.replace('_', ' ').toUpperCase()} · ${order.subjectName} · SAC ${taxConfig.sacHsnCode})`,
      { x: left + 10, y: rowY, width: 250, fontSize: 9.5, color: '#0f172a', lineGap: 2 }
    );
    writeMixedText(doc, `INR ${order.baseAmount.toFixed(2)}`, { x: left + 270, y: rowY + 6, width: 70, fontSize: 9.5 });
    writeMixedText(
      doc,
      `INR ${order.taxAmount.toFixed(2)}\n(CGST ${order.cgstAmount.toFixed(2)} + SGST ${order.sgstAmount.toFixed(2)})`,
      { x: left + 350, y: rowY, width: 85, fontSize: 8.5, lineGap: 2 }
    );
    writeMixedText(doc, `INR ${order.totalAmount.toFixed(2)}`, {
      x: left + 440,
      y: rowY + 6,
      width: 65,
      bold: true,
      fontSize: 10,
      color: '#047857',
    });

    doc.y = rowY + 70;

    // Tax & Payment Summary
    const sumY = doc.y;
    doc.roundedRect(left, sumY, width, 118, 6).fillAndStroke('#ecfdf5', '#6ee7b7');
    writeMixedText(doc, 'PAYMENT & STATUTORY TAX BREAKDOWN', {
      x: left + 14,
      y: sumY + 12,
      width: width - 28,
      bold: true,
      fontSize: 10,
      color: '#065f46',
    });
    writeMixedText(
      doc,
      `Base Taxable Price: INR ${order.baseAmount.toFixed(2)}\n` +
        `CGST (${(order.taxRatePercent / 2).toFixed(2)}%): INR ${order.cgstAmount.toFixed(2)}   |   SGST (${(order.taxRatePercent / 2).toFixed(2)}%): INR ${order.sgstAmount.toFixed(2)}\n` +
        `Total Tax (${order.taxRatePercent}% - ${order.taxMode === 'inclusive' ? 'Tax Included' : 'Tax Added'}): INR ${order.taxAmount.toFixed(2)}\n` +
        `Total Amount Paid: INR ${order.totalAmount.toFixed(2)}\n` +
        `Payment Method: ${order.paymentMethod.toUpperCase()} (${order.paymentProvider})   |   Ref / UTR: ${order.utrNumber || order.gatewayPaymentId || order.orderNumber}`,
      {
        x: left + 14,
        y: sumY + 32,
        width: width - 28,
        fontSize: 9.5,
        color: '#064e3b',
        lineGap: 3,
      }
    );

    doc.y = sumY + 142;
    writeMixedText(
      doc,
      'Note: This digital Tax Invoice is computer-generated after server payment verification. Once unlocked, your access to this study PDF remains active in your AI STUDENTS account without duplicate charges.',
      {
        x: left,
        width,
        fontSize: 8.5,
        color: '#64748b',
        lineGap: 3,
      }
    );

    doc.end();
  });
}

export async function generatePdfToolDocumentBuffer(params: {
  title: string;
  subtitle?: string;
  actionLabel: string;
  content: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 44, bottom: 48, left: 42, right: 42 },
      info: {
        Title: sanitizeText(params.title),
        Author: 'AI STUDENTS — ABHIMANYU OFFICIAL HACKER',
        Creator: 'AI STUDENTS PDF Tools Studio',
      },
    });
    registerFonts(doc);

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Header strip
    doc.rect(left, 36, width, 58).fill('#312e81');
    writeMixedText(doc, `AI STUDENTS · ${params.actionLabel.toUpperCase()}`, {
      x: left + 14,
      y: 44,
      width: width - 28,
      bold: true,
      fontSize: 9.5,
      color: '#fde047',
    });
    writeMixedText(doc, params.title, {
      x: left + 14,
      y: 60,
      width: width - 28,
      bold: true,
      fontSize: 13.5,
      color: '#ffffff',
    });

    doc.y = 108;
    if (params.subtitle) {
      writeMixedText(doc, params.subtitle, {
        x: left,
        width,
        fontSize: 9.5,
        color: '#475569',
      });
      doc.moveDown(0.5);
    }

    const lines = sanitizeText(params.content).split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (!line.trim()) {
        doc.moveDown(0.35);
        continue;
      }
      const isHeading = /^#{1,3}\s+/.test(line) || /^\d+\.\s+[A-Z\u0900-\u097F]/.test(line);
      const cleaned = line.replace(/^#{1,3}\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
      ensureSpace(doc, 28);
      if (isHeading) {
        doc.moveDown(0.25);
        writeMixedText(doc, cleaned, {
          x: left,
          width,
          bold: true,
          fontSize: 11,
          color: '#312e81',
          lineGap: 3,
        });
      } else {
        writeMixedText(doc, cleaned, {
          x: left,
          width,
          fontSize: 10,
          color: '#0f172a',
          lineGap: 3.5,
        });
      }
      doc.moveDown(0.15);
    }

    doc.moveDown(1);
    writeMixedText(doc, 'Generated with AI STUDENTS PDF Tools Studio · Study Smart, Score Higher', {
      x: left,
      width,
      fontSize: 8.5,
      color: '#64748b',
    });

    doc.end();
  });
}

