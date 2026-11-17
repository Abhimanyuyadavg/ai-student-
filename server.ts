import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import {
  requireAuth,
  AuthRequest,
  adminAuth,
  hashPassword,
  verifyPassword,
  signSessionToken,
  getLocalAccountsMap,
  flushDiskStore,
  getUserWorkspace,
  saveUserWorkspace,
  deleteUserWorkspace,
  isAdminPrincipal,
  isStaffPrincipal,
  updateLocalUserPhoto,
  validateAndDecodeImageBase64,
  saveUploadedImage,
  getUploadedImageRecord,
  readUploadedImageBuffer,
  listUploadedImages,
  deleteUploadedImageRecord,
  getSupportContact,
  saveSupportContact,
  getFaqs,
  saveFaq,
  deleteFaqById,
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  getFeedbackList,
  createFeedbackRecord,
  updateFeedbackRecord,
  getHomeBanners,
  saveHomeBanner,
  saveAllHomeBanners,
  deleteHomeBannerById,
  resetHomeBannersToSeed,
  getBrandBrandingConfig,
  saveBrandBrandingConfig,
  resetBrandBrandingConfig,
} from './src/server/auth.ts';
import { SUPPORT_PROBLEM_CATEGORIES } from './src/data/seedSupport.ts';
import type {
  BannerDestinationPage,
  FaqCategory,
  FaqItem,
  HomeBanner,
  ImageCategory,
  SupportContactInfo,
  SupportProblemCategory,
  SupportTicketStatus,
} from './src/types/index.ts';
import {
  generateAiTeacherResponse,
  evaluateWrittenAnswer,
  generatePracticeQuestions,
  generateSubjectTestSet,
  generateStudyPlanAdvice,
  InlineImagePart,
} from './src/server/ai.ts';

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Sliding-window rate limiter per IP/User
const rateBuckets = new Map<string, number[]>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = `${req.principal?.uid || req.ip}:${req.path}`;
    const now = Date.now();
    const hits = (rateBuckets.get(key) || []).filter((ts) => now - ts < windowMs);
    if (hits.length >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Take a brief study pause and try again in a moment.',
      });
    }
    hits.push(now);
    rateBuckets.set(key, hits);
    next();
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  // Basic security headers (iframe compatible)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/api/health', (_req, res) => {
    const aiConfigured = Boolean(process.env.GEMINI_API_KEY);
    res.json({
      status: 'ok',
      service: 'AI STUDENTS API',
      appName: 'AI STUDENTS',
      ownerName: 'ABHIMANYU OFFICIAL HACKER',
      aiConfigured,
      aiOnline: aiConfigured,
      paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
      timestamp: new Date().toISOString(),
    });
  });

  // Email / Mobile Registration (scrypt hashed + disk persisted + attempts Firebase Custom Token)
  app.post('/api/auth/register', rateLimit(15, 60_000), async (req: Request, res: Response) => {
    try {
      const { displayName, identifier, password, photoUrl, ageConfirmed, guardianConsent, guardianContact } = req.body || {};
      if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
        return res.status(400).json({ error: 'Please enter a valid student name (at least 2 characters).' });
      }
      if (!identifier || typeof identifier !== 'string' || identifier.trim().length < 4) {
        return res.status(400).json({ error: 'Please enter a valid email address or mobile number.' });
      }
      if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }
      if (!ageConfirmed) {
        return res.status(400).json({ error: 'Age confirmation and guardian consent declaration are required.' });
      }

      const normalized = identifier.trim().toLowerCase();
      const accounts = getLocalAccountsMap();
      if (accounts.has(normalized)) {
        return res.status(409).json({ error: 'An account with this email or mobile number already exists.' });
      }

      const isEmail = normalized.includes('@');
      const uid = `stu_${crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 20)}`;
      const { salt, hash } = hashPassword(password);
      const isBootstrapAdmin = normalized === 'abhimanyuking2411@gmail.com';
      const safePhotoUrl =
        typeof photoUrl === 'string' && /^https?:\/\//i.test(photoUrl.trim())
          ? photoUrl.trim().slice(0, 500)
          : '';

      accounts.set(normalized, {
        uid,
        displayName: displayName.trim(),
        identifier: normalized,
        email: isEmail ? normalized : undefined,
        phone: !isEmail ? normalized : undefined,
        ...(safePhotoUrl ? { photoUrl: safePhotoUrl } : {}),
        passwordHash: hash,
        salt,
        role: isBootstrapAdmin ? 'admin' : 'student',
        ageConfirmed: Boolean(ageConfirmed),
        guardianConsent: Boolean(guardianConsent),
        guardianContact: typeof guardianContact === 'string' ? guardianContact.trim() : undefined,
        createdAt: new Date().toISOString(),
      });
      flushDiskStore();

      let customToken: string | null = null;
      try {
        customToken = await adminAuth.createCustomToken(uid, {
          email: isEmail ? normalized : `${uid}@students.local`,
          email_verified: true,
        });
      } catch {
        customToken = null;
      }

      const sessionToken = signSessionToken({
        uid,
        email: isEmail ? normalized : undefined,
        displayName: displayName.trim(),
      });

      return res.status(201).json({
        user: {
          uid,
          displayName: displayName.trim(),
          email: isEmail ? normalized : '',
          phone: !isEmail ? normalized : '',
          photoUrl: safePhotoUrl,
          role: isBootstrapAdmin ? 'admin' : 'student',
          ageConfirmed: Boolean(ageConfirmed),
          guardianConsent: Boolean(guardianConsent),
          guardianContact: guardianContact || '',
        },
        customToken,
        sessionToken,
      });
    } catch (error: any) {
      console.error('Register error:', error);
      return res.status(500).json({ error: 'Unable to complete registration. Please try again.' });
    }
  });

  app.post('/api/auth/login', rateLimit(20, 60_000), async (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body || {};
      if (!identifier || !password) {
        return res.status(400).json({ error: 'Email/mobile and password are required.' });
      }
      const normalized = String(identifier).trim().toLowerCase();
      const accounts = getLocalAccountsMap();
      const record = accounts.get(normalized);
      if (!record || !verifyPassword(String(password), record.salt, record.passwordHash)) {
        return res.status(401).json({ error: 'Invalid credentials. Please check your email/mobile and password.' });
      }

      let customToken: string | null = null;
      try {
        customToken = await adminAuth.createCustomToken(record.uid, {
          email: record.email || `${record.uid}@students.local`,
          email_verified: true,
        });
      } catch {
        customToken = null;
      }

      const sessionToken = signSessionToken({
        uid: record.uid,
        email: record.email,
        displayName: record.displayName,
      });

      return res.json({
        user: {
          uid: record.uid,
          displayName: record.displayName,
          email: record.email || '',
          phone: record.phone || '',
          photoUrl: record.photoUrl || '',
          role: record.role,
          ageConfirmed: record.ageConfirmed,
          guardianConsent: record.guardianConsent,
        },
        customToken,
        sessionToken,
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Sign in failed. Please try again.' });
    }
  });

  app.post('/api/auth/forgot-password', rateLimit(10, 60_000), (req: Request, res: Response) => {
    const { identifier } = req.body || {};
    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({ error: 'Enter your registered email or mobile number.' });
    }
    const normalized = identifier.trim().toLowerCase();
    const accounts = getLocalAccountsMap();
    const record = accounts.get(normalized);
    if (record) {
      const code = String(crypto.randomInt(100000, 999999));
      record.resetCode = code;
      record.resetExpiresAt = Date.now() + 15 * 60 * 1000;
      accounts.set(normalized, record);
      flushDiskStore();
      return res.json({
        ok: true,
        message:
          'If an email/mobile account exists here, recovery instructions have been prepared. Note: Google Sign-In accounts recover directly via Google Account Recovery.',
        deliveryConfigured: Boolean(process.env.SMTP_HOST),
      });
    }
    return res.json({
      ok: true,
      message:
        'If an email/mobile account exists here, recovery instructions have been prepared. For Google Sign-In accounts, use Google Account Recovery.',
      deliveryConfigured: Boolean(process.env.SMTP_HOST),
    });
  });

  app.post('/api/auth/reset-password', rateLimit(10, 60_000), (req: Request, res: Response) => {
    const { identifier, code, newPassword } = req.body || {};
    if (!identifier || !code || !newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'Valid identifier, 6-digit code, and 8+ character password are required.' });
    }
    const normalized = String(identifier).trim().toLowerCase();
    const accounts = getLocalAccountsMap();
    const record = accounts.get(normalized);
    if (!record || !record.resetCode || record.resetCode !== String(code) || !record.resetExpiresAt || Date.now() > record.resetExpiresAt) {
      return res.status(400).json({ error: 'Invalid or expired recovery code.' });
    }
    const { salt, hash } = hashPassword(String(newPassword));
    record.salt = salt;
    record.passwordHash = hash;
    record.resetCode = undefined;
    record.resetExpiresAt = undefined;
    accounts.set(normalized, record);
    flushDiskStore();
    return res.json({ ok: true, message: 'Password updated successfully. You may now sign in.' });
  });

  // Persistent Student Workspace API (persists across logout/login for all accounts)
  app.get('/api/workspace', requireAuth, (req: AuthRequest, res: Response) => {
    const uid = req.principal!.uid;
    return res.json(getUserWorkspace(uid));
  });

  app.put('/api/workspace', requireAuth, (req: AuthRequest, res: Response) => {
    const uid = req.principal!.uid;
    const body = req.body || {};
    const saved = saveUserWorkspace(uid, {
      ...(body.studentProfile !== undefined ? { studentProfile: body.studentProfile } : {}),
      ...(Array.isArray(body.testResults) ? { testResults: body.testResults } : {}),
      ...(Array.isArray(body.studyPlans) ? { studyPlans: body.studyPlans } : {}),
      ...(Array.isArray(body.studyTasks) ? { studyTasks: body.studyTasks } : {}),
      ...(Array.isArray(body.revisionRecords) ? { revisionRecords: body.revisionRecords } : {}),
      ...(Array.isArray(body.notifications) ? { notifications: body.notifications } : {}),
      ...(body.aiChatHistories && typeof body.aiChatHistories === 'object'
        ? { aiChatHistories: body.aiChatHistories }
        : {}),
    });
    return res.json(saved);
  });

  app.delete('/api/workspace', requireAuth, (req: AuthRequest, res: Response) => {
    deleteUserWorkspace(req.principal!.uid);
    return res.json({ ok: true });
  });

  // ---------------------------------------------------------------------------
  // SECURE IMAGE UPLOAD, ACCESS CONTROL, DELETION & PROFILE PHOTO APIs
  // ---------------------------------------------------------------------------
  const ALLOWED_IMAGE_CATEGORIES: ImageCategory[] = [
    'profile',
    'ai_question',
    'support_ticket',
    'curriculum_subject',
    'curriculum_chapter',
    'curriculum_material',
    'banner',
    'brand_logo',
  ];

  app.post('/api/images/upload', requireAuth, rateLimit(30, 60_000), (req: AuthRequest, res: Response) => {
    try {
      const body = req.body || {};
      const category = String(body.category || '') as ImageCategory;
      if (!ALLOWED_IMAGE_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Invalid image category.' });
      }

      const isCurriculumCategory =
        category.startsWith('curriculum_') || category === 'banner' || category === 'brand_logo';
      if (isCurriculumCategory && !isStaffPrincipal(req.principal)) {
        return res.status(403).json({
          error: 'Forbidden: Only authorized admins or content managers can upload curriculum, logo, or banner images.',
        });
      }

      const visibility: 'private' | 'curriculum' =
        isCurriculumCategory || body.visibility === 'curriculum'
          ? isStaffPrincipal(req.principal)
            ? 'curriculum'
            : 'private'
          : 'private';

      const { mimeType, buffer } = validateAndDecodeImageBase64(body.dataUrl);
      const record = saveUploadedImage({
        ownerId: req.principal!.uid,
        category,
        visibility,
        mimeType,
        buffer,
        altText: typeof body.altText === 'string' ? body.altText.trim() : undefined,
        caption: typeof body.caption === 'string' ? body.caption.trim() : undefined,
        targetId: typeof body.targetId === 'string' ? body.targetId.trim() : undefined,
      });

      return res.status(201).json({
        image: record,
        url: `/api/images/${record.id}`,
      });
    } catch (error: any) {
      return res.status(400).json({
        error: error?.message || 'Unable to upload image.',
      });
    }
  });

  app.get('/api/images', requireAuth, (req: AuthRequest, res: Response) => {
    const isAdmin = isAdminPrincipal(req.principal);
    const images = listUploadedImages({
      ownerId: req.principal!.uid,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      targetId: typeof req.query.targetId === 'string' ? req.query.targetId : undefined,
      isAdmin,
    });
    return res.json({ images });
  });

  app.get('/api/images/:id', (req: AuthRequest, res: Response) => {
    const id = String(req.params.id || '').trim();
    if (!/^[a-zA-Z0-9_-]{4,128}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid image ID.' });
    }
    const record = getUploadedImageRecord(id);
    if (!record) {
      return res.status(404).json({ error: 'Image not found.' });
    }
    if ((record.category === 'banner' || record.category === 'brand_logo') && record.visibility === 'curriculum') {
      const buf = readUploadedImageBuffer(record);
      if (!buf) {
        return res.status(404).json({ error: 'Image binary not found.' });
      }
      res.setHeader('Content-Type', record.mimeType);
      res.setHeader('Content-Length', String(buf.length));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Disposition', 'inline');
      return res.send(buf);
    }
    return requireAuth(req, res, () => {
      if (
        record.visibility === 'private' &&
        record.ownerId !== req.principal!.uid &&
        !isAdminPrincipal(req.principal)
      ) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this private image.' });
      }
      const buf = readUploadedImageBuffer(record);
      if (!buf) {
        return res.status(404).json({ error: 'Image binary not found.' });
      }
      res.setHeader('Content-Type', record.mimeType);
      res.setHeader('Content-Length', String(buf.length));
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('Content-Disposition', 'inline');
      return res.send(buf);
    });
  });

  app.delete('/api/images/:id', requireAuth, (req: AuthRequest, res: Response) => {
    const id = String(req.params.id || '').trim();
    const record = getUploadedImageRecord(id);
    if (!record) {
      return res.status(404).json({ error: 'Image not found.' });
    }
    const canDelete =
      record.ownerId === req.principal!.uid ||
      isAdminPrincipal(req.principal) ||
      (record.visibility === 'curriculum' && isStaffPrincipal(req.principal));
    if (!canDelete) {
      return res.status(403).json({ error: 'Forbidden: You cannot delete this image.' });
    }
    deleteUploadedImageRecord(id);
    return res.json({ ok: true });
  });

  app.post('/api/profile/photo', requireAuth, (req: AuthRequest, res: Response) => {
    const photoUrlRaw = req.body?.photoUrl;
    const photoUrl =
      typeof photoUrlRaw === 'string' &&
      (photoUrlRaw === '' ||
        photoUrlRaw.startsWith('/api/images/') ||
        /^https?:\/\//i.test(photoUrlRaw))
        ? photoUrlRaw.trim().slice(0, 500)
        : null;
    if (photoUrl === null) {
      return res.status(400).json({ error: 'Invalid profile photo reference.' });
    }
    updateLocalUserPhoto(req.principal!.uid, photoUrl);
    return res.json({ ok: true, photoUrl });
  });

  // Helper to resolve verified image IDs for multimodal AI chat cleanly
  function resolveInlineImagesForUser(
    ids: unknown,
    uid: string,
    isAdmin: boolean
  ): { ok: true; images: InlineImagePart[] } | { ok: false; status: number; error: string } {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { ok: true, images: [] };
    }
    const out: InlineImagePart[] = [];
    for (const rawId of ids.slice(0, 4)) {
      if (typeof rawId !== 'string' || !rawId.trim()) continue;
      const rec = getUploadedImageRecord(rawId.trim());
      if (!rec) {
        return { ok: false, status: 404, error: 'Attached image could not be found. Please re-upload.' };
      }
      if (rec.visibility === 'private' && rec.ownerId !== uid && !isAdmin) {
        return { ok: false, status: 403, error: 'Forbidden: Cannot access another student’s private image.' };
      }
      const buf = readUploadedImageBuffer(rec);
      if (!buf) {
        return { ok: false, status: 404, error: 'Attached image binary is unavailable. Please re-upload.' };
      }
      out.push({ mimeType: rec.mimeType, data: buf.toString('base64') });
    }
    return { ok: true, images: out };
  }

  // AI Personal Teacher Endpoint (supports text + multimodal uploaded question photos)
  app.post('/api/ai/teach', requireAuth, rateLimit(30, 60_000), async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body || {};
      const uid = req.principal!.uid;
      const isAdmin = isAdminPrincipal(req.principal);
      const attachmentIds = Array.isArray(body.attachmentIds) ? body.attachmentIds : [];
      const inlineResolved = resolveInlineImagesForUser(attachmentIds, uid, isAdmin);
      if (inlineResolved.ok === false) {
        return res.status(inlineResolved.status).json({ error: inlineResolved.error });
      }

      const rawMsg = typeof body.message === 'string' ? body.message.trim() : '';
      if (rawMsg.length === 0 && inlineResolved.images.length === 0) {
        return res.status(400).json({ error: 'Please type a question, select a learning step, or attach an image.' });
      }
      if (rawMsg.length > 4000) {
        return res.status(400).json({ error: 'Message exceeds maximum length (4000 characters).' });
      }

      const safeHistory: { role: 'user' | 'assistant'; content: string; inlineImages?: InlineImagePart[] }[] = [];
      if (Array.isArray(body.history)) {
        for (const h of body.history.slice(-10)) {
          if (!h || typeof h !== 'object') continue;
          const role = h.role === 'assistant' ? 'assistant' : 'user';
          const content = typeof h.content === 'string' ? h.content : '';
          let histImgs: InlineImagePart[] | undefined;
          if (Array.isArray(h.attachmentIds) && h.attachmentIds.length > 0) {
            const r = resolveInlineImagesForUser(h.attachmentIds, uid, isAdmin);
            if (r.ok) histImgs = r.images;
          }
          safeHistory.push({ role, content, ...(histImgs?.length ? { inlineImages: histImgs } : {}) });
        }
      }

      const effectiveMessage =
        rawMsg ||
        'Please carefully read the attached question photo, identify the subject and topic, explain the concept simply, and provide the complete step-by-step solution with formulas/rules and final answer.';

      const reply = await generateAiTeacherResponse({
        studentName: String(body.studentName || req.principal?.displayName || 'Student'),
        boardName: String(body.boardName || 'Selected Board'),
        className: String(body.className || 'Class 10'),
        sessionName: String(body.sessionName || '2026–27'),
        streamName: String(body.streamName || 'General'),
        medium: body.medium === 'Hindi' || body.medium === 'Hindi + English' ? body.medium : 'English',
        subjectName: String(body.subjectName || 'Selected Subject'),
        chapterName: body.chapterName ? String(body.chapterName) : undefined,
        chapterSummary: body.chapterSummary ? String(body.chapterSummary).slice(0, 6000) : undefined,
        preparationLevel: String(body.preparationLevel || 'Intermediate'),
        completedChaptersCount: Number(body.completedChaptersCount) || 0,
        weakSubjects: Array.isArray(body.weakSubjects) ? body.weakSubjects.map(String) : [],
        averageScore: typeof body.averageScore === 'number' ? body.averageScore : null,
        learningMode: String(body.learningMode || 'Chapter Guided Learning'),
        currentStep: body.currentStep ? Number(body.currentStep) : undefined,
        customAdminInstruction: body.customAdminInstruction ? String(body.customAdminInstruction).slice(0, 2000) : undefined,
        history: safeHistory,
        message: effectiveMessage,
        inlineImages: inlineResolved.images,
      });
      return res.json({ reply });
    } catch (error: any) {
      console.error('AI Teach error:', error);
      return res.status(error?.status || 500).json({
        error: error?.message || 'AI Teacher encountered an error. Please try again.',
      });
    }
  });

  // Written Answer AI Evaluation Endpoint
  app.post('/api/ai/evaluate-written', requireAuth, rateLimit(25, 60_000), async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body || {};
      if (!body.studentAnswer || typeof body.studentAnswer !== 'string' || body.studentAnswer.trim().length < 2) {
        return res.status(400).json({ error: 'Please write an answer before submitting for evaluation.' });
      }
      const evaluation = await evaluateWrittenAnswer({
        boardName: String(body.boardName || 'Board'),
        className: String(body.className || 'Class 10'),
        subjectName: String(body.subjectName || 'Subject'),
        medium: String(body.medium || 'English'),
        questionText: String(body.questionText || ''),
        maxMarks: Math.max(1, Math.min(20, Number(body.maxMarks) || 2)),
        modelAnswer: String(body.modelAnswer || ''),
        rubricPoints: Array.isArray(body.rubricPoints) ? body.rubricPoints.map(String) : [],
        studentAnswer: body.studentAnswer.trim().slice(0, 8000),
      });
      return res.json(evaluation);
    } catch (error: any) {
      console.error('Evaluate written error:', error);
      return res.status(500).json({
        error: error?.message || 'Unable to evaluate answer right now.',
      });
    }
  });

  // Practice Question Generator (never fabricates PYQs)
  app.post('/api/ai/generate-practice', requireAuth, rateLimit(12, 60_000), async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body || {};
      const count = Math.min(5, Math.max(1, Number(body.count) || 3));
      const questions = await generatePracticeQuestions({
        boardName: String(body.boardName || 'CBSE'),
        className: String(body.className || 'Class 10'),
        subjectName: String(body.subjectName || 'Subject'),
        chapterName: String(body.chapterName || 'Chapter 1'),
        medium: String(body.medium || 'English'),
        questionType: body.questionType === 'Short Answer' || body.questionType === 'Long Answer' ? body.questionType : 'MCQ',
        count,
      });
      return res.json({
        sourceType: 'Predicted Practice',
        isPyq: false,
        aiGenerated: true,
        questions,
      });
    } catch (error: any) {
      console.error('Generate practice error:', error);
      return res.status(500).json({ error: error?.message || 'Unable to generate practice questions.' });
    }
  });

  // Subject-Locked Multi-Type Test Set Generator (for any selected subject/chapter/category)
  app.post('/api/ai/generate-test-set', requireAuth, rateLimit(15, 60_000), async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body || {};
      if (!body.subjectName || !body.subjectId) {
        return res.status(400).json({ error: 'subjectId and subjectName are required.' });
      }
      const count = Math.min(10, Math.max(2, Number(body.count) || 5));
      const questions = await generateSubjectTestSet({
        boardId: String(body.boardId || 'bseb'),
        boardName: String(body.boardName || 'Selected Board'),
        classId: String(body.classId || 'class_10'),
        className: String(body.className || 'Class 10'),
        subjectId: String(body.subjectId),
        subjectName: String(body.subjectName),
        chapterId: body.chapterId ? String(body.chapterId) : undefined,
        chapterName: body.chapterName ? String(body.chapterName) : undefined,
        topicName: body.topicName ? String(body.topicName) : undefined,
        testCategory: String(body.testCategory || 'Chapter Test'),
        medium: String(body.medium || 'English'),
        count,
        includeWritten: Boolean(body.includeWritten),
      });
      return res.json({
        sourceType: 'Predicted Practice',
        isPyq: false,
        aiGenerated: true,
        questions,
      });
    } catch (error: any) {
      console.error('Generate test set error:', error);
      return res.status(500).json({ error: error?.message || 'Unable to generate subject test questions.' });
    }
  });

  // AI Study Plan Generator
  app.post('/api/ai/study-plan', requireAuth, rateLimit(10, 60_000), async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body || {};
      const dailyHours = Math.min(12, Math.max(1, Number(body.dailyHours) || 3));
      const result = await generateStudyPlanAdvice({
        boardName: String(body.boardName || 'Board'),
        className: String(body.className || 'Class 10'),
        subjects: Array.isArray(body.subjects) ? body.subjects.map(String) : ['Science', 'Social Science'],
        weakSubjects: Array.isArray(body.weakSubjects) ? body.weakSubjects.map(String) : [],
        dailyHours,
        examDate: String(body.examDate || '2027-02-15'),
        planType: String(body.planType || '30-Day'),
        schoolSchedule: String(body.schoolSchedule || ''),
        coachingSchedule: String(body.coachingSchedule || ''),
        targetMarks: String(body.targetMarks || '80%+'),
      });
      return res.json(result);
    } catch (error: any) {
      console.error('Study plan error:', error);
      return res.status(500).json({ error: error?.message || 'Unable to generate study plan.' });
    }
  });

  // ---------------------------------------------------------------------------
  // HELP & SUPPORT, CONTACT DETAILS, FAQS, TICKETS & FEEDBACK APIs
  // ---------------------------------------------------------------------------
  app.get('/api/support/public', (_req: Request, res: Response) => {
    return res.json({
      contactInfo: getSupportContact(),
      faqs: getFaqs(false),
    });
  });

  app.get('/api/support/tickets', requireAuth, (req: AuthRequest, res: Response) => {
    const isAdmin = isAdminPrincipal(req.principal);
    return res.json({
      tickets: getSupportTickets(req.principal!.uid, isAdmin),
    });
  });

  app.post('/api/support/tickets', requireAuth, rateLimit(10, 60_000), (req: AuthRequest, res: Response) => {
    const body = req.body || {};
    const category = String(body.category || '') as SupportProblemCategory;
    if (!SUPPORT_PROBLEM_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Please select a valid problem category.' });
    }
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (subject.length < 3 || subject.length > 200) {
      return res.status(400).json({ error: 'Subject must be between 3 and 200 characters.' });
    }
    if (description.length < 10 || description.length > 4000) {
      return res.status(400).json({ error: 'Description must be between 10 and 4000 characters.' });
    }

    let screenshotDataUrl: string | undefined = undefined;
    if (typeof body.screenshotDataUrl === 'string' && body.screenshotDataUrl.trim().length > 0) {
      const trimmedShot = body.screenshotDataUrl.trim();
      const isUploadedImgRef = /^\/api\/images\/[a-zA-Z0-9_-]{4,80}$/.test(trimmedShot);
      const isBase64Img = /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(trimmedShot);
      if (!isUploadedImgRef && !isBase64Img) {
        return res.status(400).json({ error: 'Screenshot must be a valid JPG, PNG, or WEBP image.' });
      }
      if (isBase64Img && trimmedShot.length > 900_000) {
        return res.status(400).json({ error: 'Screenshot image is too large.' });
      }
      screenshotDataUrl = trimmedShot;
    }

    const now = new Date();
    const ticketNum = `AIS-${now.getFullYear()}-${crypto.randomInt(1000, 9999)}`;
    const id = `tkt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const studentName =
      typeof body.studentName === 'string' && body.studentName.trim()
        ? body.studentName.trim().slice(0, 120)
        : req.principal!.displayName || 'Student';
    const studentContact =
      typeof body.studentContact === 'string' && body.studentContact.trim()
        ? body.studentContact.trim().slice(0, 180)
        : req.principal!.email || req.principal!.uid;

    const created = createSupportTicket({
      id,
      ticketNumber: ticketNum,
      studentId: req.principal!.uid,
      studentName,
      studentContact,
      category,
      subject,
      description,
      ...(screenshotDataUrl ? { screenshotDataUrl } : {}),
      status: 'Pending',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    return res.status(201).json({ ticket: created });
  });

  app.put('/api/support/tickets/:id', requireAuth, (req: AuthRequest, res: Response) => {
    if (!isAdminPrincipal(req.principal)) {
      return res.status(403).json({ error: 'Forbidden: Only authorized administrators can update support tickets.' });
    }
    const { id } = req.params;
    const body = req.body || {};
    const status = String(body.status || '') as SupportTicketStatus;
    if (!['Pending', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid ticket status.' });
    }
    const adminReply =
      typeof body.adminReply === 'string' ? body.adminReply.trim().slice(0, 4000) : undefined;

    const updated = updateSupportTicket(id, {
      status,
      ...(adminReply !== undefined ? { adminReply } : {}),
      ...(adminReply ? { repliedBy: req.principal!.email || req.principal!.displayName || 'Admin', repliedAt: new Date().toISOString() } : {}),
    });

    if (!updated) {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }
    return res.json({ ticket: updated });
  });

  app.put('/api/support/contact', requireAuth, (req: AuthRequest, res: Response) => {
    if (!isAdminPrincipal(req.principal)) {
      return res.status(403).json({ error: 'Forbidden: Only authorized administrators can update support contact details.' });
    }
    const body = req.body || {};
    const sanitizeUrl = (val: unknown) => {
      if (typeof val !== 'string') return '';
      const trimmed = val.trim().slice(0, 400);
      if (!trimmed) return '';
      return /^https?:\/\//i.test(trimmed) ? trimmed : '';
    };
    const next: SupportContactInfo = {
      id: 'contact',
      ownerName:
        typeof body.ownerName === 'string' && body.ownerName.trim()
          ? body.ownerName.trim().slice(0, 120)
          : 'ABHIMANYU OFFICIAL HACKER',
      supportEmail:
        typeof body.supportEmail === 'string'
          ? body.supportEmail.replace(/\s+/g, '').slice(0, 180)
          : '',
      supportPhone:
        typeof body.supportPhone === 'string'
          ? body.supportPhone.replace(/[^\d+]/g, '').slice(0, 20)
          : '',
      supportAvailability:
        typeof body.supportAvailability === 'string'
          ? body.supportAvailability.trim().slice(0, 240)
          : '',
      whatsappChannelUrl: sanitizeUrl(body.whatsappChannelUrl),
      whatsappNumber:
        typeof body.whatsappNumber === 'string'
          ? body.whatsappNumber.replace(/[^\d+]/g, '').slice(0, 20)
          : '',
      updatedBy: req.principal!.email || req.principal!.uid,
      updatedAt: new Date().toISOString(),
    };
    return res.json({ contactInfo: saveSupportContact(next) });
  });

  app.get('/api/support/faqs', requireAuth, (req: AuthRequest, res: Response) => {
    const isAdmin = isAdminPrincipal(req.principal);
    return res.json({ faqs: getFaqs(isAdmin) });
  });

  app.put('/api/support/faqs', requireAuth, (req: AuthRequest, res: Response) => {
    if (!isAdminPrincipal(req.principal)) {
      return res.status(403).json({ error: 'Forbidden: Admin permission required to manage FAQs.' });
    }
    const body = req.body || {};
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
    if (question.length < 4 || question.length > 300 || answer.length < 4 || answer.length > 4000) {
      return res.status(400).json({ error: 'Valid FAQ question and answer are required.' });
    }
    const validCategories: FaqCategory[] = [
      'Help Center',
      'Account & Login',
      'AI Teacher & Voice',
      'Tests & Syllabus',
      'Technical Support',
      'Payments',
      'Privacy & Security',
    ];
    const category: FaqCategory = validCategories.includes(body.category)
      ? body.category
      : 'Help Center';
    const item: FaqItem = {
      id:
        typeof body.id === 'string' && /^[a-zA-Z0-9_-]{2,80}$/.test(body.id)
          ? body.id
          : `faq_${Date.now()}`,
      category,
      question,
      answer,
      orderIndex: Number.isFinite(Number(body.orderIndex)) ? Number(body.orderIndex) : 10,
      published: body.published !== false,
      updatedAt: new Date().toISOString(),
    };
    return res.json({ faq: saveFaq(item) });
  });

  app.delete('/api/support/faqs/:id', requireAuth, (req: AuthRequest, res: Response) => {
    if (!isAdminPrincipal(req.principal)) {
      return res.status(403).json({ error: 'Forbidden: Admin permission required.' });
    }
    const ok = deleteFaqById(req.params.id);
    if (!ok) return res.status(404).json({ error: 'FAQ not found.' });
    return res.json({ ok: true });
  });

  app.post('/api/support/feedback', requireAuth, rateLimit(10, 60_000), (req: AuthRequest, res: Response) => {
    const body = req.body || {};
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (subject.length < 2 || subject.length > 200 || message.length < 5 || message.length > 3000) {
      return res.status(400).json({ error: 'Feedback subject and message are required.' });
    }
    const validCats = ['Syllabus Issue', 'Question Correction', 'App Feedback', 'Bug Report', 'Feature Suggestion'] as const;
    const category = validCats.includes(body.category) ? body.category : 'App Feedback';
    const created = createFeedbackRecord({
      id: typeof body.id === 'string' && body.id.length <= 128 ? body.id : `fb_${Date.now()}`,
      studentId: req.principal!.uid,
      studentName:
        typeof body.studentName === 'string'
          ? body.studentName.trim().slice(0, 120)
          : req.principal!.displayName || 'Student',
      category,
      subject,
      message,
      status: 'open',
      createdAt: new Date().toISOString(),
    });
    return res.status(201).json({ feedback: created });
  });

  app.get('/api/support/feedback', requireAuth, (req: AuthRequest, res: Response) => {
    const isAdmin = isAdminPrincipal(req.principal);
    const list = getFeedbackList();
    return res.json({
      feedback: isAdmin ? list : list.filter((f) => f.studentId === req.principal!.uid),
    });
  });

  app.put('/api/support/feedback/:id', requireAuth, (req: AuthRequest, res: Response) => {
    if (!isAdminPrincipal(req.principal)) {
      return res.status(403).json({ error: 'Forbidden: Admin permission required.' });
    }
    const { id } = req.params;
    const body = req.body || {};
    const status = body.status;
    if (!['open', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid feedback status.' });
    }
    const updated = updateFeedbackRecord(id, {
      status,
      ...(typeof body.adminNote === 'string' ? { adminNote: body.adminNote.trim().slice(0, 1000) } : {}),
    });
    if (!updated) return res.status(404).json({ error: 'Feedback entry not found.' });
    return res.json({ feedback: updated });
  });

  // ---------------------------------------------------------------------------
  // HOME SCREEN PROMOTIONAL BANNERS & THUMBNAILS MANAGEMENT APIs
  // ---------------------------------------------------------------------------
  const ALLOWED_BANNER_DESTINATIONS: BannerDestinationPage[] = [
    'ai-teacher',
    'subjects',
    'tests',
    'progress',
    'study-planner',
    'question-bank',
    'pyq-bank',
    'library',
    'revision',
  ];

  function sanitizeBannerPayload(raw: any, updatedBy?: string, fallbackOrder = 1): HomeBanner | null {
    if (!raw || typeof raw !== 'object') return null;
    const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 140) : '';
    const ctaLabel = typeof raw.ctaLabel === 'string' ? raw.ctaLabel.trim().slice(0, 60) : '';
    if (!title || !ctaLabel) return null;

    const id =
      typeof raw.id === 'string' && /^[a-zA-Z0-9_-]{2,128}$/.test(raw.id.trim())
        ? raw.id.trim()
        : `banner_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const subtitle = typeof raw.subtitle === 'string' ? raw.subtitle.trim().slice(0, 320) : '';
    const imageUrlRaw = typeof raw.imageUrl === 'string' ? raw.imageUrl.trim().slice(0, 500) : '';
    const safeImageUrl =
      imageUrlRaw.startsWith('/api/images/') ||
      imageUrlRaw.startsWith('/assets/aistudio/') ||
      imageUrlRaw.startsWith('asset://') ||
      /^https?:\/\//i.test(imageUrlRaw)
        ? imageUrlRaw
        : `asset://${id}`;
    const destinationPage: BannerDestinationPage = ALLOWED_BANNER_DESTINATIONS.includes(raw.destinationPage)
      ? raw.destinationPage
      : 'ai-teacher';
    const orderNum = Number(raw.orderIndex);
    const orderIndex = Number.isFinite(orderNum) ? Math.max(0, Math.min(100, Math.round(orderNum))) : fallbackOrder;
    const validThemes = ['blue-purple', 'indigo-gold', 'cobalt-subjects', 'royal-amber', 'violet-blue'] as const;
    const accentTheme = validThemes.includes(raw.accentTheme) ? raw.accentTheme : 'blue-purple';

    return {
      id,
      title,
      subtitle,
      ctaLabel,
      imageUrl: safeImageUrl,
      ...(typeof raw.imageId === 'string' && raw.imageId.trim() ? { imageId: raw.imageId.trim().slice(0, 128) } : {}),
      destinationPage,
      orderIndex,
      enabled: raw.enabled !== false,
      accentTheme,
      ...(updatedBy ? { updatedBy: updatedBy.slice(0, 180) } : {}),
      updatedAt: new Date().toISOString(),
    };
  }

  app.get('/api/banners', (_req: Request, res: Response) => {
    return res.json({ banners: getHomeBanners(false) });
  });

  app.get('/api/admin/banners', requireAuth, (req: AuthRequest, res: Response) => {
    if (!isStaffPrincipal(req.principal)) {
      return res.status(403).json({ error: 'Forbidden: Staff permission required.' });
    }
    return res.json({ banners: getHomeBanners(true) });
  });

  app.put('/api/admin/banners', requireAuth, (req: AuthRequest, res: Response) => {
    if (!isAdminPrincipal(req.principal)) {
      return res.status(403).json({ error: 'Forbidden: Only authorized administrators can update banners.' });
    }
    const body = req.body || {};
    const actor = req.principal!.email || req.principal!.uid;

    if (Array.isArray(body.banners)) {
      const cleaned: HomeBanner[] = [];
      for (let i = 0; i < body.banners.length; i++) {
        const sanitized = sanitizeBannerPayload(body.banners[i], actor, i + 1);
        if (!sanitized) {
          return res.status(400).json({ error: `Invalid banner item at position ${i + 1}.` });
        }
        cleaned.push(sanitized);
      }
      const savedAll = saveAllHomeBanners(cleaned);
      return res.json({ banners: savedAll });
    }

    const sanitized = sanitizeBannerPayload(body, actor, getHomeBanners(true).length + 1);
    if (!sanitized) {
      return res.status(400).json({ error: 'Valid banner title and button text are required.' });
    }
    const saved = saveHomeBanner(sanitized);
    return res.json({ banner: saved, banners: getHomeBanners(true) });
  });

  app.post('/api/admin/banners/reset', requireAuth, (req: AuthRequest, res: Response) => {
    if (!isAdminPrincipal(req.principal)) {
      return res.status(403).json({ error: 'Forbidden: Admin permission required.' });
    }
    return res.json({ banners: resetHomeBannersToSeed() });
  });

  app.delete('/api/admin/banners/:id', requireAuth, (req: AuthRequest, res: Response) => {
    if (!isAdminPrincipal(req.principal)) {
      return res.status(403).json({ error: 'Forbidden: Admin permission required.' });
    }
    const ok = deleteHomeBannerById(String(req.params.id || ''));
    if (!ok) return res.status(404).json({ error: 'Banner not found.' });
    return res.json({ ok: true, banners: getHomeBanners(true) });
  });

  app.get('/api/branding', (_req: Request, res: Response) => {
    return res.json({ branding: getBrandBrandingConfig() });
  });

  app.put('/api/admin/branding', requireAuth, (req: AuthRequest, res: Response) => {
    if (!isAdminPrincipal(req.principal)) {
      return res.status(403).json({ error: 'Forbidden: Only authorized administrators can replace the official logo.' });
    }
    const body = req.body || {};
    const logoUrlRaw = typeof body.logoUrl === 'string' ? body.logoUrl.trim().slice(0, 500) : '';
    const isAllowed =
      logoUrlRaw === '/ai-students-logo.jpg' ||
      logoUrlRaw.startsWith('/api/images/') ||
      logoUrlRaw.startsWith('/assets/aistudio/') ||
      /^https?:\/\//i.test(logoUrlRaw);
    if (!isAllowed) {
      return res.status(400).json({ error: 'Valid official logo image URL is required.' });
    }
    const saved = saveBrandBrandingConfig({
      logoUrl: logoUrlRaw,
      logoImageId: typeof body.logoImageId === 'string' ? body.logoImageId.trim().slice(0, 128) : undefined,
      updatedBy: req.principal!.email || req.principal!.uid,
    });
    return res.json({ branding: saved });
  });

  app.post('/api/admin/branding/reset', requireAuth, (req: AuthRequest, res: Response) => {
    if (!isAdminPrincipal(req.principal)) {
      return res.status(403).json({ error: 'Forbidden: Admin permission required.' });
    }
    return res.json({ branding: resetBrandBrandingConfig() });
  });

  // Modular Payment Verification Endpoint (Disabled unless configured by owner)
  app.post('/api/payments/verify', requireAuth, (_req: AuthRequest, res: Response) => {
    const enabled = process.env.PAYMENTS_ENABLED === 'true' && Boolean(process.env.PAYMENT_WEBHOOK_SECRET);
    if (!enabled) {
      return res.status(503).json({
        error:
          'Payments module is disabled. Configure PAYMENTS_ENABLED=true and server-side payment provider credentials before accepting transactions.',
      });
    }
    return res.status(400).json({ error: 'Provider signature verification required.' });
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI STUDENTS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AI STUDENTS server:', err);
  process.exit(1);
});
