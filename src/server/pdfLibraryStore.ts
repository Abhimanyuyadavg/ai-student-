import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { buildSeedPdfLibrary } from '../data/seedPdfLibrary.ts';
import type {
  PaymentGatewayPublicConfig,
  PdfClassId,
  PdfEntitlement,
  PdfNoteItem,
  PdfPaymentMethod,
  PdfPaymentOrder,
  PdfPromoUnlockRecord,
  PdfStreamId,
  PdfTaxConfig,
} from '../types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const PDF_FILES_DIR = path.join(DATA_DIR, 'pdfs');
const PDF_STORE_PATH = path.join(DATA_DIR, 'ais-pdf-store.json');
const PDF_STORE_BACKUP = path.join(DATA_DIR, 'ais-pdf-store.bak.json');

export const MAX_UPLOAD_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

const DEFAULT_TAX_CONFIG: PdfTaxConfig = {
  taxEnabled: true,
  gstRatePercent: 5,
  taxMode: 'inclusive',
  sellerLegalName: 'ABHIMANYU OFFICIAL HACKER (AI STUDENTS)',
  sellerGstin: '',
  sellerState: 'Bihar (10)',
  sacHsnCode: 'HSN 4901 / SAC 998431',
  upiId: '7492996601@naviaxis',
  supportPhone: '7492996601',
  upiQrImageUrl: '/assets/aistudio/Screenshot_20261107_145547_2_a29f4013.jpg',
  updatedAt: '2026-11-17T00:00:00.000Z',
};

interface PdfDiskStoreShape {
  catalog: PdfNoteItem[];
  orders: PdfPaymentOrder[];
  entitlements: PdfEntitlement[];
  promoUnlocks: PdfPromoUnlockRecord[];
  taxConfig: PdfTaxConfig;
  invoiceSeq: number;
}

let catalogStore: PdfNoteItem[] = buildSeedPdfLibrary();
let ordersStore: PdfPaymentOrder[] = [];
let entitlementsStore: PdfEntitlement[] = [];
let promoUnlocksStore: PdfPromoUnlockRecord[] = [];
let taxConfigStore: PdfTaxConfig = { ...DEFAULT_TAX_CONFIG };
let invoiceCounter = 1000;

// Anti brute-force sliding window for promo code attempts (max 5 failed tries per 15 mins)
const PROMO_WINDOW_MS = 15 * 60 * 1000;
const PROMO_MAX_FAILS = 5;
const promoFailedAttempts = new Map<string, number[]>();

function loadPdfStore() {
  try {
    const candidate = fs.existsSync(PDF_STORE_PATH)
      ? PDF_STORE_PATH
      : fs.existsSync(PDF_STORE_BACKUP)
      ? PDF_STORE_BACKUP
      : null;
    if (!candidate) return;
    const raw = fs.readFileSync(candidate, 'utf8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw) as Partial<PdfDiskStoreShape>;
    if (Array.isArray(parsed.catalog) && parsed.catalog.length > 0) {
      // Merge persisted admin edits/uploads with seeded catalog (updating unedited system items cleanly)
      const persistedMap = new Map<string, PdfNoteItem>();
      for (const item of parsed.catalog) {
        if (item && item.id) persistedMap.set(item.id, item);
      }
      const seeded = buildSeedPdfLibrary();
      for (const s of seeded) {
        const existing = persistedMap.get(s.id);
        if (!existing) {
          persistedMap.set(s.id, s);
        } else if (existing.createdBy === 'system' && existing.updatedAt === s.updatedAt && existing.isFree !== s.isFree) {
          persistedMap.set(s.id, { ...existing, isFree: s.isFree, priceInr: s.priceInr });
        }
      }
      catalogStore = Array.from(persistedMap.values());
    }
    if (Array.isArray(parsed.orders)) {
      ordersStore = parsed.orders;
    }
    if (Array.isArray(parsed.entitlements)) {
      entitlementsStore = parsed.entitlements;
    }
    if (Array.isArray(parsed.promoUnlocks)) {
      promoUnlocksStore = parsed.promoUnlocks;
    }
    if (parsed.taxConfig && typeof parsed.taxConfig === 'object') {
      taxConfigStore = { ...DEFAULT_TAX_CONFIG, ...parsed.taxConfig };
    }
    if (typeof parsed.invoiceSeq === 'number' && parsed.invoiceSeq >= 1000) {
      invoiceCounter = parsed.invoiceSeq;
    }
  } catch (err) {
    console.warn('Could not load PDF store snapshot:', err);
  }
}

function flushPdfStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(PDF_FILES_DIR)) fs.mkdirSync(PDF_FILES_DIR, { recursive: true });
    if (fs.existsSync(PDF_STORE_PATH)) {
      try {
        fs.copyFileSync(PDF_STORE_PATH, PDF_STORE_BACKUP);
      } catch {
        // Non-fatal backup error
      }
    }
    const payload: PdfDiskStoreShape = {
      catalog: catalogStore,
      orders: ordersStore,
      entitlements: entitlementsStore,
      promoUnlocks: promoUnlocksStore,
      taxConfig: taxConfigStore,
      invoiceSeq: invoiceCounter,
    };
    const tmp = `${PDF_STORE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, PDF_STORE_PATH);
  } catch (err) {
    console.warn('Could not persist PDF store snapshot:', err);
  }
}

loadPdfStore();

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calculateTaxBreakdown(listedPriceInr: number, cfg: PdfTaxConfig = taxConfigStore) {
  const safePrice = Math.max(0, round2(Number(listedPriceInr) || 0));
  if (!cfg.taxEnabled || cfg.gstRatePercent <= 0 || safePrice === 0) {
    return {
      baseAmount: safePrice,
      taxRatePercent: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      taxAmount: 0,
      totalAmount: safePrice,
      taxMode: cfg.taxMode,
    };
  }
  const rate = Math.min(28, Math.max(0, round2(Number(cfg.gstRatePercent) || 0)));
  if (cfg.taxMode === 'inclusive') {
    const baseAmount = round2(safePrice / (1 + rate / 100));
    const taxAmount = round2(safePrice - baseAmount);
    const cgstAmount = round2(taxAmount / 2);
    const sgstAmount = round2(taxAmount - cgstAmount);
    return {
      baseAmount,
      taxRatePercent: rate,
      cgstAmount,
      sgstAmount,
      taxAmount,
      totalAmount: safePrice,
      taxMode: 'inclusive' as const,
    };
  }
  const taxAmount = round2((safePrice * rate) / 100);
  const cgstAmount = round2(taxAmount / 2);
  const sgstAmount = round2(taxAmount - cgstAmount);
  return {
    baseAmount: safePrice,
    taxRatePercent: rate,
    cgstAmount,
    sgstAmount,
    taxAmount,
    totalAmount: round2(safePrice + taxAmount),
    taxMode: 'exclusive' as const,
  };
}

export function getPublicGatewayConfig(): PaymentGatewayPublicConfig {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const razorpayConfigured = Boolean(keyId && keySecret);
  const promoCodeEnabled = Boolean((process.env.PDF_FREE_ACCESS_CODE || '').trim());
  return {
    guardianMerchantName: taxConfigStore.sellerLegalName || 'ABHIMANYU OFFICIAL HACKER',
    upiId: taxConfigStore.upiId || '7492996601@naviaxis',
    supportPhone: taxConfigStore.supportPhone || '7492996601',
    upiQrImageUrl: taxConfigStore.upiQrImageUrl || '/assets/aistudio/Screenshot_20261107_145547_2_a29f4013.jpg',
    razorpayConfigured,
    ...(razorpayConfigured ? { razorpayKeyId: keyId } : {}),
    promoCodeEnabled,
    taxConfig: { ...taxConfigStore },
  };
}

export function updateTaxConfig(patch: Partial<PdfTaxConfig>, updatedBy: string): PdfTaxConfig {
  const allowedRates = [0, 5, 12, 18, 28];
  const nextRate = allowedRates.includes(Number(patch.gstRatePercent))
    ? Number(patch.gstRatePercent)
    : taxConfigStore.gstRatePercent;
  taxConfigStore = {
    ...taxConfigStore,
    taxEnabled: patch.taxEnabled !== undefined ? Boolean(patch.taxEnabled) : taxConfigStore.taxEnabled,
    gstRatePercent: nextRate,
    taxMode: patch.taxMode === 'exclusive' ? 'exclusive' : patch.taxMode === 'inclusive' ? 'inclusive' : taxConfigStore.taxMode,
    sellerLegalName:
      typeof patch.sellerLegalName === 'string' && patch.sellerLegalName.trim()
        ? patch.sellerLegalName.trim().slice(0, 140)
        : taxConfigStore.sellerLegalName,
    sellerGstin:
      typeof patch.sellerGstin === 'string'
        ? patch.sellerGstin.trim().toUpperCase().slice(0, 20)
        : taxConfigStore.sellerGstin,
    sellerState:
      typeof patch.sellerState === 'string' && patch.sellerState.trim()
        ? patch.sellerState.trim().slice(0, 60)
        : taxConfigStore.sellerState,
    sacHsnCode:
      typeof patch.sacHsnCode === 'string' && patch.sacHsnCode.trim()
        ? patch.sacHsnCode.trim().slice(0, 60)
        : taxConfigStore.sacHsnCode,
    upiId:
      typeof patch.upiId === 'string' && patch.upiId.trim()
        ? patch.upiId.trim().slice(0, 120)
        : taxConfigStore.upiId,
    supportPhone:
      typeof patch.supportPhone === 'string' && patch.supportPhone.trim()
        ? patch.supportPhone.replace(/[^\d+]/g, '').slice(0, 20)
        : taxConfigStore.supportPhone,
    updatedBy,
    updatedAt: new Date().toISOString(),
  };
  flushPdfStore();
  return { ...taxConfigStore };
}

export function listPdfCatalog(includeUnpublished = false): Omit<PdfNoteItem, 'content'>[] {
  return catalogStore
    .filter((item) => includeUnpublished || item.published)
    .sort((a, b) => {
      if (a.classId !== b.classId) return a.classId.localeCompare(b.classId);
      if (a.subjectNameEn !== b.subjectNameEn) return a.subjectNameEn.localeCompare(b.subjectNameEn);
      return a.chapterNumber - b.chapterNumber;
    })
    .map(({ content: _content, storageFile: _sf, ...safeItem }) => safeItem);
}

export function getPdfItemById(id: string): PdfNoteItem | null {
  return catalogStore.find((item) => item.id === id) || null;
}

export function upsertPdfItem(
  input: Partial<PdfNoteItem> & {
    classId: PdfClassId;
    streamId: PdfStreamId;
    subjectKey: string;
    subjectNameEn: string;
    subjectNameHi: string;
    chapterNumber: number;
    chapterTitleEn: string;
    chapterTitleHi: string;
  },
  actor: string
): PdfNoteItem {
  const now = new Date().toISOString();
  const existingIdx = input.id ? catalogStore.findIndex((i) => i.id === input.id) : -1;
  const existing = existingIdx >= 0 ? catalogStore[existingIdx] : undefined;
  const id =
    (input.id && /^[a-zA-Z0-9_-]{3,128}$/.test(input.id) ? input.id : undefined) ||
    `pdf_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const isFree = input.isFree !== undefined ? Boolean(input.isFree) : existing?.isFree ?? false;
  const rawPrice = Number(input.priceInr);
  const priceInr = isFree ? 0 : Number.isFinite(rawPrice) && rawPrice >= 1 ? round2(rawPrice) : existing?.priceInr || 19;

  const saved: PdfNoteItem = {
    id,
    classId: input.classId,
    streamId: input.streamId,
    boardId: (input.boardId || existing?.boardId || 'all').slice(0, 64),
    subjectKey: input.subjectKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 64),
    subjectNameEn: input.subjectNameEn.trim().slice(0, 140),
    subjectNameHi: input.subjectNameHi.trim().slice(0, 140) || input.subjectNameEn.trim().slice(0, 140),
    chapterNumber: Math.max(1, Math.min(99, Math.round(Number(input.chapterNumber) || 1))),
    chapterTitleEn: input.chapterTitleEn.trim().slice(0, 200),
    chapterTitleHi: input.chapterTitleHi.trim().slice(0, 200) || input.chapterTitleEn.trim().slice(0, 200),
    availability: input.availability || existing?.availability || 'available',
    isFree,
    priceInr,
    allowDownload: input.allowDownload !== undefined ? Boolean(input.allowDownload) : existing?.allowDownload ?? true,
    allowPrint: input.allowPrint !== undefined ? Boolean(input.allowPrint) : existing?.allowPrint ?? true,
    mediumSupport: input.mediumSupport || existing?.mediumSupport || 'bilingual',
    sourceType: input.sourceType || existing?.sourceType || 'generated',
    ...(input.storageFile || existing?.storageFile ? { storageFile: input.storageFile || existing?.storageFile } : {}),
    ...(input.fileSizeBytes || existing?.fileSizeBytes
      ? { fileSizeBytes: input.fileSizeBytes || existing?.fileSizeBytes }
      : {}),
    published: input.published !== undefined ? Boolean(input.published) : existing?.published ?? true,
    ...(input.content ? { content: input.content } : existing?.content ? { content: existing.content } : {}),
    createdBy: existing?.createdBy || actor,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    catalogStore[existingIdx] = saved;
  } else {
    catalogStore = [saved, ...catalogStore];
  }
  flushPdfStore();
  return saved;
}

export function saveUploadedPdfBinary(pdfId: string, base64OrDataUrl: string, actor: string): PdfNoteItem {
  const item = getPdfItemById(pdfId);
  if (!item) {
    throw new Error('Study note chapter entry not found.');
  }
  const cleanB64 = base64OrDataUrl
    .trim()
    .replace(/^data:application\/pdf;base64,/i, '')
    .replace(/\s+/g, '');
  const buffer = Buffer.from(cleanB64, 'base64');
  if (buffer.length < 32 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Invalid PDF file. Only genuine PDF documents starting with %PDF- signature are permitted.');
  }
  if (buffer.length > MAX_UPLOAD_PDF_BYTES) {
    throw new Error('PDF file exceeds the 15 MB upload limit.');
  }
  if (!fs.existsSync(PDF_FILES_DIR)) {
    fs.mkdirSync(PDF_FILES_DIR, { recursive: true });
  }
  const fileName = `${pdfId}_${Date.now()}.pdf`;
  const fullPath = path.join(PDF_FILES_DIR, fileName);
  fs.writeFileSync(fullPath, buffer, { mode: 0o600 });

  // Remove prior uploaded file if replaced
  if (item.storageFile) {
    const prevPath = path.join(PDF_FILES_DIR, path.basename(item.storageFile));
    if (prevPath.startsWith(PDF_FILES_DIR) && fs.existsSync(prevPath)) {
      try {
        fs.unlinkSync(prevPath);
      } catch {
        // Non-fatal
      }
    }
  }

  return upsertPdfItem(
    {
      ...item,
      sourceType: 'uploaded',
      storageFile: fileName,
      fileSizeBytes: buffer.length,
      availability: 'available',
    },
    actor
  );
}

export function readUploadedPdfBinary(item: PdfNoteItem): Buffer | null {
  if (!item.storageFile) return null;
  const fullPath = path.join(PDF_FILES_DIR, path.basename(item.storageFile));
  if (!fullPath.startsWith(PDF_FILES_DIR) || !fs.existsSync(fullPath)) {
    return null;
  }
  return fs.readFileSync(fullPath);
}

export function deletePdfItemById(id: string): boolean {
  const existing = getPdfItemById(id);
  if (!existing) return false;
  if (existing.storageFile) {
    const fullPath = path.join(PDF_FILES_DIR, path.basename(existing.storageFile));
    if (fullPath.startsWith(PDF_FILES_DIR) && fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {
        // Non-fatal
      }
    }
  }
  catalogStore = catalogStore.filter((i) => i.id !== id);
  flushPdfStore();
  return true;
}

export function hasStudentPdfAccess(uid: string, pdfId: string): boolean {
  return entitlementsStore.some((e) => e.studentId === uid && e.pdfId === pdfId);
}

export function getStudentEntitlements(uid: string): PdfEntitlement[] {
  return entitlementsStore
    .filter((e) => e.studentId === uid)
    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime());
}

export function getAllEntitlements(): PdfEntitlement[] {
  return [...entitlementsStore].sort(
    (a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
  );
}

export function getStudentPromoUnlocks(uid: string): PdfPromoUnlockRecord[] {
  return promoUnlocksStore
    .filter((p) => p.studentId === uid)
    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime());
}

export function getAllPromoUnlocks(): PdfPromoUnlockRecord[] {
  return [...promoUnlocksStore].sort(
    (a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
  );
}

export function getStudentOrders(uid: string): PdfPaymentOrder[] {
  return ordersStore
    .filter((o) => o.studentId === uid)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAllOrders(): PdfPaymentOrder[] {
  return [...ordersStore].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getOrderById(orderId: string): PdfPaymentOrder | null {
  return ordersStore.find((o) => o.id === orderId) || null;
}

export function createOrReusePdfOrder(params: {
  studentId: string;
  studentName: string;
  studentContact: string;
  pdf: PdfNoteItem;
  paymentMethod: PdfPaymentMethod;
  paymentProvider: string;
}): { alreadyUnlocked?: boolean; order?: PdfPaymentOrder } {
  if (hasStudentPdfAccess(params.studentId, params.pdf.id)) {
    return { alreadyUnlocked: true };
  }

  // Reuse recent pending order (within 15 minutes) to avoid duplicate order spam
  const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
  const recentPending = ordersStore.find(
    (o) =>
      o.studentId === params.studentId &&
      o.pdfId === params.pdf.id &&
      o.paymentStatus === 'pending' &&
      o.paymentMethod === params.paymentMethod &&
      new Date(o.createdAt).getTime() > fifteenMinsAgo
  );
  if (recentPending) {
    return { order: recentPending };
  }

  const tax = calculateTaxBreakdown(params.pdf.priceInr, taxConfigStore);
  const now = new Date();
  const id = `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const orderNumber = `AIS-ORD-${now.getFullYear()}-${crypto.randomInt(10000, 99999)}`;

  const order: PdfPaymentOrder = {
    id,
    orderNumber,
    studentId: params.studentId,
    studentName: params.studentName.slice(0, 120),
    studentContact: params.studentContact.slice(0, 180),
    pdfId: params.pdf.id,
    pdfTitle: `Ch ${params.pdf.chapterNumber}: ${params.pdf.chapterTitleEn}`,
    classId: params.pdf.classId,
    subjectName: `${params.pdf.subjectNameEn} (${params.pdf.subjectNameHi})`,
    baseAmount: tax.baseAmount,
    taxRatePercent: tax.taxRatePercent,
    cgstAmount: tax.cgstAmount,
    sgstAmount: tax.sgstAmount,
    taxAmount: tax.taxAmount,
    totalAmount: tax.totalAmount,
    taxMode: tax.taxMode,
    currency: 'INR',
    paymentMethod: params.paymentMethod,
    paymentProvider: params.paymentProvider,
    paymentStatus: 'pending',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  ordersStore = [order, ...ordersStore];
  flushPdfStore();
  return { order };
}

export function attachGatewayOrderId(orderId: string, gatewayOrderId: string): PdfPaymentOrder | null {
  const idx = ordersStore.findIndex((o) => o.id === orderId);
  if (idx < 0) return null;
  ordersStore[idx] = {
    ...ordersStore[idx],
    gatewayOrderId,
    updatedAt: new Date().toISOString(),
  };
  flushPdfStore();
  return ordersStore[idx];
}

export function submitUpiPaymentProof(params: {
  orderId: string;
  studentId: string;
  utrNumber: string;
  payerName?: string;
  guardianConfirmed?: boolean;
}): { ok: true; order: PdfPaymentOrder } | { ok: false; status: number; error: string } {
  const idx = ordersStore.findIndex((o) => o.id === params.orderId);
  if (idx < 0) {
    return { ok: false, status: 404, error: 'Payment order not found.' };
  }
  const order = ordersStore[idx];
  if (order.studentId !== params.studentId) {
    return { ok: false, status: 403, error: 'Forbidden: Order belongs to another student account.' };
  }
  if (order.paymentStatus === 'verified') {
    return { ok: false, status: 409, error: 'This order is already verified and unlocked.' };
  }

  const normalizedUtr = params.utrNumber.trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9]{8,24}$/.test(normalizedUtr) || /^(0+|1+|123456|TEST)/i.test(normalizedUtr)) {
    return {
      ok: false,
      status: 400,
      error: 'Please enter a valid 12-digit UPI Transaction / UTR Reference Number from your UPI app.',
    };
  }

  // Prevent replay / duplicate UTR usage across orders
  const duplicateUtr = ordersStore.find(
    (o) =>
      o.id !== order.id &&
      o.utrNumber &&
      o.utrNumber.toUpperCase() === normalizedUtr &&
      (o.paymentStatus === 'verified' || o.paymentStatus === 'awaiting_verification')
  );
  if (duplicateUtr) {
    return {
      ok: false,
      status: 409,
      error: 'Duplicate Payment Guard: This UTR / Transaction ID is already submitted for another order.',
    };
  }

  const updated: PdfPaymentOrder = {
    ...order,
    utrNumber: normalizedUtr,
    payerName: params.payerName?.trim().slice(0, 100) || order.studentName,
    guardianConfirmed: Boolean(params.guardianConfirmed),
    paymentStatus: 'awaiting_verification',
    failureReason: undefined,
    updatedAt: new Date().toISOString(),
  };

  ordersStore[idx] = updated;
  flushPdfStore();
  return { ok: true, order: updated };
}

function finalizeVerifiedUnlock(orderIndex: number, actor: string, gatewayPaymentId?: string): {
  order: PdfPaymentOrder;
  entitlement: PdfEntitlement;
} {
  const order = ordersStore[orderIndex];
  const now = new Date().toISOString();

  // Duplicate entitlement check (idempotent)
  const existingEnt = entitlementsStore.find(
    (e) => e.studentId === order.studentId && e.pdfId === order.pdfId
  );
  const invoiceNumber =
    order.invoiceNumber ||
    existingEnt?.invoiceNumber ||
    `INV-AIS-${new Date().getFullYear()}-${++invoiceCounter}`;

  const updatedOrder: PdfPaymentOrder = {
    ...order,
    invoiceNumber,
    ...(gatewayPaymentId ? { gatewayPaymentId } : {}),
    paymentStatus: 'verified',
    failureReason: undefined,
    verifiedBy: actor,
    verifiedAt: order.verifiedAt || now,
    updatedAt: now,
  };
  ordersStore[orderIndex] = updatedOrder;

  if (existingEnt) {
    flushPdfStore();
    return { order: updatedOrder, entitlement: existingEnt };
  }

  const entitlement: PdfEntitlement = {
    id: `ent_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    studentId: order.studentId,
    studentName: order.studentName,
    studentContact: order.studentContact,
    pdfId: order.pdfId,
    pdfTitle: order.pdfTitle,
    classId: order.classId,
    subjectName: order.subjectName,
    unlockSource: 'payment',
    orderId: order.id,
    invoiceNumber,
    amountPaid: order.totalAmount,
    unlockedAt: now,
  };
  entitlementsStore = [entitlement, ...entitlementsStore];
  flushPdfStore();
  return { order: updatedOrder, entitlement };
}

export function verifyGatewaySignatureAndUnlock(params: {
  orderId: string;
  studentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): { ok: true; order: PdfPaymentOrder; entitlement: PdfEntitlement } | { ok: false; status: number; error: string } {
  const secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error: 'Automated payment gateway verification key is not configured on the server.',
    };
  }
  const idx = ordersStore.findIndex((o) => o.id === params.orderId);
  if (idx < 0) return { ok: false, status: 404, error: 'Order not found.' };
  const order = ordersStore[idx];
  if (order.studentId !== params.studentId) {
    return { ok: false, status: 403, error: 'Forbidden: Order belongs to another student.' };
  }
  if (order.gatewayOrderId && order.gatewayOrderId !== params.razorpayOrderId) {
    return { ok: false, status: 400, error: 'Mismatched gateway order reference.' };
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  const sigValid =
    expectedSig.length === params.razorpaySignature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(params.razorpaySignature));

  if (!sigValid) {
    ordersStore[idx] = {
      ...order,
      paymentStatus: 'failed',
      failureReason: 'Payment gateway HMAC signature verification failed.',
      updatedAt: new Date().toISOString(),
    };
    flushPdfStore();
    return { ok: false, status: 400, error: 'Payment signature verification failed. PDF remains locked.' };
  }

  const result = finalizeVerifiedUnlock(idx, 'Razorpay Gateway HMAC Verified', params.razorpayPaymentId);
  return { ok: true, ...result };
}

export function adminDecidePdfOrder(params: {
  orderId: string;
  decision: 'verify' | 'fail';
  actor: string;
  reason?: string;
}): { ok: true; order: PdfPaymentOrder; entitlement?: PdfEntitlement } | { ok: false; status: number; error: string } {
  const idx = ordersStore.findIndex((o) => o.id === params.orderId);
  if (idx < 0) return { ok: false, status: 404, error: 'Payment order not found.' };

  if (params.decision === 'fail') {
    const order = ordersStore[idx];
    const updated: PdfPaymentOrder = {
      ...order,
      paymentStatus: 'failed',
      failureReason: params.reason?.trim() || 'Payment could not be verified by Guardian/Admin.',
      verifiedBy: params.actor,
      updatedAt: new Date().toISOString(),
    };
    ordersStore[idx] = updated;
    // Also revoke any entitlement bound strictly to this failed order
    entitlementsStore = entitlementsStore.filter((e) => e.orderId !== order.id);
    flushPdfStore();
    return { ok: true, order: updated };
  }

  const { order, entitlement } = finalizeVerifiedUnlock(idx, params.actor);
  return { ok: true, order, entitlement };
}

export function adminGrantPdfAccessManual(params: {
  studentId: string;
  studentName: string;
  studentContact: string;
  pdf: PdfNoteItem;
  actor: string;
}): PdfEntitlement {
  const existing = entitlementsStore.find(
    (e) => e.studentId === params.studentId && e.pdfId === params.pdf.id
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const invoiceNumber = `INV-AIS-${new Date().getFullYear()}-${++invoiceCounter}`;
  const ent: PdfEntitlement = {
    id: `ent_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    studentId: params.studentId,
    studentName: params.studentName,
    studentContact: params.studentContact,
    pdfId: params.pdf.id,
    pdfTitle: `Ch ${params.pdf.chapterNumber}: ${params.pdf.chapterTitleEn}`,
    classId: params.pdf.classId,
    subjectName: `${params.pdf.subjectNameEn} (${params.pdf.subjectNameHi})`,
    unlockSource: 'admin_grant',
    orderId: `adm_grant_${Date.now()}`,
    invoiceNumber,
    amountPaid: 0,
    unlockedAt: now,
  };
  entitlementsStore = [ent, ...entitlementsStore];
  flushPdfStore();
  return ent;
}

export function adminRevokePdfAccess(entitlementId: string): boolean {
  const target = entitlementsStore.find((e) => e.id === entitlementId);
  const before = entitlementsStore.length;
  entitlementsStore = entitlementsStore.filter((e) => e.id !== entitlementId);
  if (target) {
    promoUnlocksStore = promoUnlocksStore.filter(
      (p) => !(p.studentId === target.studentId && p.pdfId === target.pdfId && p.id === target.orderId)
    );
  }
  if (entitlementsStore.length !== before) {
    flushPdfStore();
    return true;
  }
  return false;
}

export function redeemPdfPromoCode(params: {
  studentId: string;
  studentName: string;
  studentContact: string;
  clientIp: string;
  pdf: PdfNoteItem;
  code: string;
}):
  | {
      ok: true;
      alreadyUnlocked?: boolean;
      entitlement: PdfEntitlement;
      promoRecord?: PdfPromoUnlockRecord;
    }
  | {
      ok: false;
      status: number;
      error: string;
      remainingAttempts?: number;
      retryAfterSeconds?: number;
    } {
  // 1. Check if student already holds lifetime access (free or previously unlocked)
  const existingEnt = entitlementsStore.find(
    (e) => e.studentId === params.studentId && e.pdfId === params.pdf.id
  );
  if (existingEnt) {
    return { ok: true, alreadyUnlocked: true, entitlement: existingEnt };
  }

  // 2. Check sliding-window rate limit for failed attempts per studentId + IP
  const nowMs = Date.now();
  const userKey = `u:${params.studentId}`;
  const ipKey = `ip:${params.clientIp || 'unknown'}`;

  const getRecentFails = (key: string) => {
    const arr = (promoFailedAttempts.get(key) || []).filter((ts) => nowMs - ts < PROMO_WINDOW_MS);
    promoFailedAttempts.set(key, arr);
    return arr;
  };

  const userFails = getRecentFails(userKey);
  const ipFails = getRecentFails(ipKey);
  if (userFails.length >= PROMO_MAX_FAILS || ipFails.length >= PROMO_MAX_FAILS * 2) {
    const oldest = userFails[0] || ipFails[0] || nowMs;
    const retryAfterSeconds = Math.max(30, Math.ceil((PROMO_WINDOW_MS - (nowMs - oldest)) / 1000));
    const mins = Math.ceil(retryAfterSeconds / 60);
    return {
      ok: false,
      status: 429,
      retryAfterSeconds,
      remainingAttempts: 0,
      error: `Too many invalid promo code attempts. Please wait ~${mins} minute(s) before trying again or pay ₹${params.pdf.priceInr} to unlock.`,
    };
  }

  // 3. Read backend environment variable (never hardcoded in client or repo source!)
  const expectedSecret = (process.env.PDF_FREE_ACCESS_CODE || '').trim();
  if (!expectedSecret) {
    return {
      ok: false,
      status: 503,
      error: 'Free Access Code verification is not configured in the backend environment.',
    };
  }

  const submittedNorm = String(params.code || '').trim().toUpperCase();
  const expectedNorm = expectedSecret.toUpperCase();

  if (!submittedNorm || submittedNorm.length > 64) {
    return {
      ok: false,
      status: 400,
      remainingAttempts: Math.max(0, PROMO_MAX_FAILS - userFails.length),
      error: 'Please enter a valid Free Access Code.',
    };
  }

  const submittedDigest = crypto.createHash('sha256').update(submittedNorm).digest();
  const expectedDigest = crypto.createHash('sha256').update(expectedNorm).digest();
  const isValid = crypto.timingSafeEqual(submittedDigest, expectedDigest);

  if (!isValid) {
    const nextUserFails = [...userFails, nowMs];
    const nextIpFails = [...ipFails, nowMs];
    promoFailedAttempts.set(userKey, nextUserFails);
    promoFailedAttempts.set(ipKey, nextIpFails);
    const remaining = Math.max(0, PROMO_MAX_FAILS - nextUserFails.length);
    return {
      ok: false,
      status: 400,
      remainingAttempts: remaining,
      error:
        remaining > 0
          ? `Invalid Promo Code. PDF remains locked (${remaining} attempt${remaining === 1 ? '' : 's'} remaining).`
          : 'Invalid Promo Code. Attempt limit reached — PDF remains locked. Please wait 15 minutes or pay ₹' +
            params.pdf.priceInr +
            ' to unlock.',
    };
  }

  // 4. Success: Clear failed counter & grant separated Promo Unlock record + Entitlement
  promoFailedAttempts.delete(userKey);
  const nowIso = new Date().toISOString();
  const promoId = `promo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const codeMask = 'VERIFIED_ENV_CODE';

  const promoRecord: PdfPromoUnlockRecord = {
    id: promoId,
    studentId: params.studentId,
    studentName: params.studentName.slice(0, 120),
    studentContact: params.studentContact.slice(0, 180),
    pdfId: params.pdf.id,
    pdfTitle: `Ch ${params.pdf.chapterNumber}: ${params.pdf.chapterTitleEn}`,
    classId: params.pdf.classId,
    subjectName: `${params.pdf.subjectNameEn} (${params.pdf.subjectNameHi})`,
    unlockType: 'free_access_code',
    codeMask,
    unlockedAt: nowIso,
  };

  const entitlement: PdfEntitlement = {
    id: `ent_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    studentId: params.studentId,
    studentName: params.studentName.slice(0, 120),
    studentContact: params.studentContact.slice(0, 180),
    pdfId: params.pdf.id,
    pdfTitle: promoRecord.pdfTitle,
    classId: params.pdf.classId,
    subjectName: promoRecord.subjectName,
    unlockSource: 'promo_code',
    orderId: promoId,
    invoiceNumber: `PROMO-FREE-${new Date().getFullYear()}-${++invoiceCounter}`,
    amountPaid: 0,
    unlockedAt: nowIso,
  };

  promoUnlocksStore = [promoRecord, ...promoUnlocksStore];
  entitlementsStore = [entitlement, ...entitlementsStore];
  flushPdfStore();

  return { ok: true, entitlement, promoRecord };
}

