import { Request, Response, NextFunction } from 'express';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import firebaseConfig from '../../firebase-applet-config.json';
import { DEFAULT_SUPPORT_CONTACT, SEED_FAQS } from '../data/seedSupport.ts';
import { SEED_HOME_BANNERS } from '../data/seedBannersData.ts';
import type {
  BrandBrandingConfig,
  FaqItem,
  HomeBanner,
  ImageCategory,
  SupportContactInfo,
  SupportTicket,
  UploadedImageRecord,
  UserFeedback,
} from '../types/index.ts';

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth();

export const ADMIN_BOOTSTRAP_EMAIL = 'abhimanyuking2411@gmail.com';

// Server-side HMAC secret for optional email/mobile fallback sessions when IAM signBlob is unavailable
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`${firebaseConfig.projectId}:${firebaseConfig.appId}`).digest('hex');

export interface AuthenticatedPrincipal {
  uid: string;
  email?: string;
  displayName?: string;
  authMode: 'firebase' | 'session';
}

export interface AuthRequest extends Request {
  principal?: AuthenticatedPrincipal;
}

export interface LocalAccountRecord {
  uid: string;
  displayName: string;
  identifier: string; // normalized email or mobile
  email?: string;
  phone?: string;
  photoUrl?: string;
  passwordHash: string;
  salt: string;
  role: 'student' | 'admin' | 'content_manager';
  ageConfirmed: boolean;
  guardianConsent: boolean;
  guardianContact?: string;
  resetCode?: string;
  resetExpiresAt?: number;
  createdAt: string;
}

export interface PersistedWorkspacePayload {
  studentProfile?: any;
  testResults?: any[];
  studyPlans?: any[];
  studyTasks?: any[];
  revisionRecords?: any[];
  notifications?: any[];
  aiChatHistories?: Record<string, any[]>;
  updatedAt?: string;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const STORE_PATH = path.join(DATA_DIR, 'ais-local-store.json');
const BACKUP_STORE_PATH = path.join(DATA_DIR, 'ais-local-store.bak.json');
export const MAX_IMAGE_BYTES = 2_621_440; // 2.5 MB decoded ceiling

interface DiskStoreShape {
  accounts: Record<string, LocalAccountRecord>;
  workspaces: Record<string, PersistedWorkspacePayload>;
  supportContact?: SupportContactInfo;
  faqs?: FaqItem[];
  tickets?: SupportTicket[];
  feedback?: UserFeedback[];
  images?: UploadedImageRecord[];
  homeBanners?: HomeBanner[];
  brandBranding?: BrandBrandingConfig;
}

const DEFAULT_BRAND_BRANDING: BrandBrandingConfig = {
  id: 'brand',
  appName: 'AI STUDENTS',
  ownerName: 'ABHIMANYU OFFICIAL HACKER',
  logoUrl: '/ai-students-logo.jpg',
  updatedAt: '2026-11-17T00:00:00.000Z',
};

const localAccounts = new Map<string, LocalAccountRecord>();
const userWorkspaces = new Map<string, PersistedWorkspacePayload>();
let supportContactStore: SupportContactInfo = { ...DEFAULT_SUPPORT_CONTACT };
let faqStore: FaqItem[] = [...SEED_FAQS];
let ticketStore: SupportTicket[] = [];
let feedbackStore: UserFeedback[] = [];
let imageStore: UploadedImageRecord[] = [];
let bannerStore: HomeBanner[] = [...SEED_HOME_BANNERS];
let brandBrandingStore: BrandBrandingConfig = { ...DEFAULT_BRAND_BRANDING };

function loadDiskStore() {
  try {
    const readCandidate = fs.existsSync(STORE_PATH)
      ? STORE_PATH
      : fs.existsSync(BACKUP_STORE_PATH)
      ? BACKUP_STORE_PATH
      : null;
    if (!readCandidate) return;
    const raw = fs.readFileSync(readCandidate, 'utf8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw) as Partial<DiskStoreShape>;
    if (parsed.accounts && typeof parsed.accounts === 'object') {
      for (const [k, v] of Object.entries(parsed.accounts)) {
        if (v && v.uid) localAccounts.set(k, v);
      }
    }
    if (parsed.workspaces && typeof parsed.workspaces === 'object') {
      for (const [uid, ws] of Object.entries(parsed.workspaces)) {
        if (ws && typeof ws === 'object') userWorkspaces.set(uid, ws);
      }
    }
    if (parsed.supportContact && typeof parsed.supportContact === 'object') {
      supportContactStore = {
        ...DEFAULT_SUPPORT_CONTACT,
        ...parsed.supportContact,
        id: 'contact',
      };
    }
    if (Array.isArray(parsed.faqs) && parsed.faqs.length > 0) {
      faqStore = parsed.faqs;
    }
    if (Array.isArray(parsed.tickets)) {
      ticketStore = parsed.tickets;
    }
    if (Array.isArray(parsed.feedback)) {
      feedbackStore = parsed.feedback;
    }
    if (Array.isArray(parsed.images)) {
      imageStore = parsed.images;
    }
    if (Array.isArray(parsed.homeBanners) && parsed.homeBanners.length > 0) {
      const onlyLegacySeed = parsed.homeBanners.every(
        (b) =>
          (b.updatedAt === '2026-06-01T00:00:00.000Z' || b.updatedAt === '2026-11-16T00:00:00.000Z') &&
          !b.updatedBy
      );
      if (!onlyLegacySeed) {
        bannerStore = parsed.homeBanners;
      }
    }
    if (parsed.brandBranding && typeof parsed.brandBranding === 'object') {
      brandBrandingStore = {
        ...DEFAULT_BRAND_BRANDING,
        ...parsed.brandBranding,
        id: 'brand',
      };
    }
  } catch (err) {
    console.warn('Could not read local store snapshot:', err);
  }
}

export function flushDiskStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    // Create backup snapshot before replacing active store file
    if (fs.existsSync(STORE_PATH)) {
      try {
        fs.copyFileSync(STORE_PATH, BACKUP_STORE_PATH);
      } catch {
        // Non-fatal backup copy failure
      }
    }
    const payload: DiskStoreShape = {
      accounts: Object.fromEntries(localAccounts.entries()),
      workspaces: Object.fromEntries(userWorkspaces.entries()),
      supportContact: supportContactStore,
      faqs: faqStore,
      tickets: ticketStore,
      feedback: feedbackStore,
      images: imageStore,
      homeBanners: bannerStore,
      brandBranding: brandBrandingStore,
    };
    const tmpPath = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmpPath, STORE_PATH);
  } catch (err) {
    console.warn('Could not persist local store snapshot:', err);
  }
}

loadDiskStore();

export function isAdminPrincipal(principal?: AuthenticatedPrincipal): boolean {
  if (!principal) return false;
  if (principal.email && principal.email.trim().toLowerCase() === ADMIN_BOOTSTRAP_EMAIL) {
    return true;
  }
  for (const acc of localAccounts.values()) {
    if (acc.uid === principal.uid && acc.role === 'admin') {
      return true;
    }
  }
  return false;
}

export function isStaffPrincipal(principal?: AuthenticatedPrincipal): boolean {
  if (isAdminPrincipal(principal)) return true;
  if (!principal) return false;
  for (const acc of localAccounts.values()) {
    if (acc.uid === principal.uid && (acc.role === 'admin' || acc.role === 'content_manager')) {
      return true;
    }
  }
  return false;
}

export function updateLocalUserPhoto(uid: string, photoUrl: string) {
  let changed = false;
  for (const [k, acc] of localAccounts.entries()) {
    if (acc.uid === uid) {
      localAccounts.set(k, { ...acc, photoUrl });
      changed = true;
    }
  }
  if (changed) flushDiskStore();
}

export function detectImageMagicMime(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (!buf || buf.length < 16) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  // WEBP: RIFF....WEBP
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function validateAndDecodeImageBase64(dataUrl: string): {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  buffer: Buffer;
} {
  if (typeof dataUrl !== 'string') {
    throw new Error('Image data is missing.');
  }
  const match = dataUrl.trim().match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) {
    throw new Error('Only PNG, JPG, JPEG, and WEBP images are supported.');
  }
  const b64Clean = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(b64Clean, 'base64');
  if (buffer.length < 16) {
    throw new Error('Uploaded image file is empty or corrupted.');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Image exceeds the 2.5 MB limit after compression. Please pick a smaller image.');
  }
  const magicMime = detectImageMagicMime(buffer);
  if (!magicMime) {
    throw new Error('Invalid image file signature. Only genuine PNG, JPG, or WEBP photos are allowed.');
  }
  return { mimeType: magicMime, buffer };
}

export function saveUploadedImage(params: {
  ownerId: string;
  category: ImageCategory;
  visibility: 'private' | 'curriculum';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  buffer: Buffer;
  altText?: string;
  caption?: string;
  targetId?: string;
}): UploadedImageRecord {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const ext = params.mimeType === 'image/png' ? 'png' : params.mimeType === 'image/webp' ? 'webp' : 'jpg';
  const id = `img_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const storageFile = `${id}.${ext}`;
  const fullPath = path.join(UPLOADS_DIR, storageFile);
  fs.writeFileSync(fullPath, params.buffer, { mode: 0o600 });

  const record: UploadedImageRecord = {
    id,
    ownerId: params.ownerId,
    category: params.category,
    visibility: params.visibility,
    mimeType: params.mimeType,
    sizeBytes: params.buffer.length,
    storageFile,
    ...(params.altText ? { altText: params.altText.slice(0, 300) } : {}),
    ...(params.caption ? { caption: params.caption.slice(0, 500) } : {}),
    ...(params.targetId ? { targetId: params.targetId.slice(0, 128) } : {}),
    createdAt: new Date().toISOString(),
  };

  imageStore = [record, ...imageStore];
  flushDiskStore();
  return record;
}

export function getUploadedImageRecord(id: string): UploadedImageRecord | null {
  return imageStore.find((img) => img.id === id) || null;
}

export function readUploadedImageBuffer(record: UploadedImageRecord): Buffer | null {
  const safeBase = path.basename(record.storageFile);
  const fullPath = path.join(UPLOADS_DIR, safeBase);
  if (!fullPath.startsWith(UPLOADS_DIR) || !fs.existsSync(fullPath)) {
    return null;
  }
  return fs.readFileSync(fullPath);
}

export function listUploadedImages(params: {
  ownerId: string;
  category?: string;
  targetId?: string;
  isAdmin: boolean;
}): UploadedImageRecord[] {
  return imageStore.filter((img) => {
    const canSee =
      params.isAdmin || img.ownerId === params.ownerId || img.visibility === 'curriculum';
    if (!canSee) return false;
    if (params.category && img.category !== params.category) return false;
    if (params.targetId && img.targetId !== params.targetId) return false;
    return true;
  });
}

export function deleteUploadedImageRecord(id: string): boolean {
  const existing = imageStore.find((img) => img.id === id);
  if (!existing) return false;
  const safeBase = path.basename(existing.storageFile);
  const fullPath = path.join(UPLOADS_DIR, safeBase);
  try {
    if (fullPath.startsWith(UPLOADS_DIR) && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch {
    // Non-fatal unlink error
  }
  imageStore = imageStore.filter((img) => img.id !== id);
  flushDiskStore();
  return true;
}

export function getSupportContact(): SupportContactInfo {
  return supportContactStore;
}

export function saveSupportContact(next: SupportContactInfo): SupportContactInfo {
  supportContactStore = {
    ...next,
    id: 'contact',
    updatedAt: new Date().toISOString(),
  };
  flushDiskStore();
  return supportContactStore;
}

export function getFaqs(includeUnpublished = false): FaqItem[] {
  const sorted = [...faqStore].sort((a, b) => a.orderIndex - b.orderIndex);
  return includeUnpublished ? sorted : sorted.filter((f) => f.published);
}

export function saveFaq(item: FaqItem): FaqItem {
  const idx = faqStore.findIndex((f) => f.id === item.id);
  const stamped: FaqItem = { ...item, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    faqStore[idx] = stamped;
  } else {
    faqStore = [...faqStore, stamped];
  }
  flushDiskStore();
  return stamped;
}

export function deleteFaqById(id: string): boolean {
  const before = faqStore.length;
  faqStore = faqStore.filter((f) => f.id !== id);
  if (faqStore.length !== before) {
    flushDiskStore();
    return true;
  }
  return false;
}

export function getSupportTickets(uid: string, isAdmin: boolean): SupportTicket[] {
  const sorted = [...ticketStore].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
  return isAdmin ? sorted : sorted.filter((t) => t.studentId === uid);
}

export function createSupportTicket(ticket: SupportTicket): SupportTicket {
  ticketStore = [ticket, ...ticketStore];
  flushDiskStore();
  return ticket;
}

export function updateSupportTicket(
  id: string,
  patch: Partial<Pick<SupportTicket, 'status' | 'adminReply' | 'repliedBy' | 'repliedAt'>>
): SupportTicket | null {
  const idx = ticketStore.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const updated: SupportTicket = {
    ...ticketStore[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  ticketStore[idx] = updated;
  flushDiskStore();
  return updated;
}

export function getFeedbackList(): UserFeedback[] {
  return [...feedbackStore].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function createFeedbackRecord(fb: UserFeedback): UserFeedback {
  feedbackStore = [fb, ...feedbackStore];
  flushDiskStore();
  return fb;
}

export function updateFeedbackRecord(
  id: string,
  patch: Partial<Pick<UserFeedback, 'status' | 'adminNote'>>
): UserFeedback | null {
  const idx = feedbackStore.findIndex((f) => f.id === id);
  if (idx < 0) return null;
  const updated: UserFeedback = {
    ...feedbackStore[idx],
    ...patch,
  };
  feedbackStore[idx] = updated;
  flushDiskStore();
  return updated;
}

export function getHomeBanners(includeDisabled = false): HomeBanner[] {
  const sorted = [...bannerStore].sort((a, b) => a.orderIndex - b.orderIndex);
  return includeDisabled ? sorted : sorted.filter((b) => b.enabled);
}

export function saveHomeBanner(banner: HomeBanner): HomeBanner {
  const stamped: HomeBanner = {
    ...banner,
    updatedAt: new Date().toISOString(),
  };
  const idx = bannerStore.findIndex((b) => b.id === stamped.id);
  if (idx >= 0) {
    bannerStore[idx] = stamped;
  } else {
    bannerStore = [...bannerStore, stamped];
  }
  bannerStore = [...bannerStore].sort((a, b) => a.orderIndex - b.orderIndex);
  flushDiskStore();
  return stamped;
}

export function saveAllHomeBanners(banners: HomeBanner[]): HomeBanner[] {
  const now = new Date().toISOString();
  bannerStore = banners
    .map((b, i) => ({
      ...b,
      orderIndex: Number.isFinite(Number(b.orderIndex)) ? Number(b.orderIndex) : i + 1,
      updatedAt: now,
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex);
  flushDiskStore();
  return bannerStore;
}

export function deleteHomeBannerById(id: string): boolean {
  const before = bannerStore.length;
  bannerStore = bannerStore.filter((b) => b.id !== id);
  if (bannerStore.length !== before) {
    flushDiskStore();
    return true;
  }
  return false;
}

export function resetHomeBannersToSeed(): HomeBanner[] {
  const now = new Date().toISOString();
  bannerStore = SEED_HOME_BANNERS.map((b) => ({ ...b, updatedAt: now }));
  flushDiskStore();
  return bannerStore;
}

export function getBrandBrandingConfig(): BrandBrandingConfig {
  return { ...brandBrandingStore };
}

export function saveBrandBrandingConfig(
  patch: Partial<Pick<BrandBrandingConfig, 'logoUrl' | 'logoImageId' | 'updatedBy'>>
): BrandBrandingConfig {
  brandBrandingStore = {
    ...brandBrandingStore,
    ...patch,
    id: 'brand',
    updatedAt: new Date().toISOString(),
  };
  flushDiskStore();
  return { ...brandBrandingStore };
}

export function resetBrandBrandingConfig(): BrandBrandingConfig {
  brandBrandingStore = {
    ...DEFAULT_BRAND_BRANDING,
    updatedAt: new Date().toISOString(),
  };
  flushDiskStore();
  return { ...brandBrandingStore };
}

export function getUserWorkspace(uid: string): PersistedWorkspacePayload {
  return userWorkspaces.get(uid) || {};
}

export function saveUserWorkspace(uid: string, patch: PersistedWorkspacePayload): PersistedWorkspacePayload {
  const existing = userWorkspaces.get(uid) || {};
  const merged: PersistedWorkspacePayload = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  userWorkspaces.set(uid, merged);
  flushDiskStore();
  return merged;
}

export function deleteUserWorkspace(uid: string) {
  userWorkspaces.delete(uid);
  ticketStore = ticketStore.filter((t) => t.studentId !== uid);
  feedbackStore = feedbackStore.filter((f) => f.studentId !== uid);
  const ownedPrivateIds = imageStore
    .filter((img) => img.ownerId === uid && img.visibility === 'private')
    .map((img) => img.id);
  for (const imgId of ownedPrivateIds) {
    deleteUploadedImageRecord(imgId);
  }
  for (const [key, acc] of localAccounts.entries()) {
    if (acc.uid === uid) {
      localAccounts.delete(key);
    }
  }
  flushDiskStore();
}

export function hashPassword(password: string, existingSalt?: string) {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export function signSessionToken(payload: { uid: string; email?: string; displayName?: string }): string {
  const data = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string): { uid: string; email?: string; displayName?: string } | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return { uid: parsed.uid, email: parsed.email, displayName: parsed.displayName };
  } catch {
    return null;
  }
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing.' });
  }

  try {
    const decoded: DecodedIdToken = await adminAuth.verifyIdToken(token);
    req.principal = {
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name,
      authMode: 'firebase',
    };
    return next();
  } catch {
    const session = verifySessionToken(token);
    if (session) {
      req.principal = {
        uid: session.uid,
        email: session.email,
        displayName: session.displayName,
        authMode: 'session',
      };
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

export function getLocalAccountsMap() {
  return localAccounts;
}

