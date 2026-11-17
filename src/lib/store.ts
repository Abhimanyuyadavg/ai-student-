import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase.ts';
import {
  AcademicSession,
  AiPromptConfig,
  Announcement,
  AppNotification,
  AppUser,
  AuditLog,
  Board,
  Chapter,
  ClassLevel,
  CustomTestConfig,
  FaqItem,
  HomeBanner,
  LearningMaterial,
  PaymentRecord,
  Question,
  RevisionRecord,
  Stream,
  StudentProfile,
  StudyPlan,
  StudyTask,
  Subject,
  SupportContactInfo,
  SupportTicket,
  SystemSetting,
  TestResult,
  Topic,
  UploadedImageRecord,
  UserFeedback,
} from '../types/index.ts';
import { DEFAULT_SUPPORT_CONTACT, SEED_FAQS } from '../data/seedSupport.ts';
import { SEED_HOME_BANNERS } from '../data/seedBannersData.ts';
import {
  SEED_AI_PROMPTS,
  SEED_ANNOUNCEMENTS,
  SEED_BOARDS,
  SEED_CHAPTERS,
  SEED_CLASSES,
  SEED_CUSTOM_TESTS,
  SEED_MATERIALS,
  SEED_QUESTIONS,
  SEED_SESSIONS,
  SEED_STREAMS,
  SEED_SUBJECTS,
  SEED_TOPICS,
} from '../data/seedCurriculum.ts';

export async function getAuthToken(): Promise<string | null> {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  return null;
}

export async function fetchUserRecord(uid: string): Promise<AppUser | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as AppUser) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveUserRecord(user: AppUser): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, 'users', user.uid), user, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteUserAccountData(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'studentProfiles', uid));
    await deleteDoc(doc(db, 'users', uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
  }
}

export async function fetchStudentProfile(uid: string): Promise<StudentProfile | null> {
  const path = `studentProfiles/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'studentProfiles', uid));
    return snap.exists() ? (snap.data() as StudentProfile) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveStudentProfile(profile: StudentProfile): Promise<void> {
  const path = `studentProfiles/${profile.userId}`;
  try {
    await setDoc(
      doc(db, 'studentProfiles', profile.userId),
      { ...profile, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

async function fetchCollectionWithSeed<T extends { id: string }>(
  colName: string,
  seed: T[]
): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, colName));
    if (snap.empty) {
      return seed;
    }
    const dbItems = snap.docs.map((d) => d.data() as T);
    // Merge any missing baseline items by id while preferring Firestore edits
    const map = new Map<string, T>();
    for (const s of seed) map.set(s.id, s);
    for (const item of dbItems) map.set(item.id, item);
    return Array.from(map.values());
  } catch {
    return seed;
  }
}

export async function loadCurriculumCatalog() {
  const [
    boards,
    sessions,
    classes,
    streams,
    subjects,
    chapters,
    topics,
    questions,
    materials,
    announcements,
    customTests,
  ] = await Promise.all([
    fetchCollectionWithSeed<Board>('boards', SEED_BOARDS),
    fetchCollectionWithSeed<AcademicSession>('academicSessions', SEED_SESSIONS),
    fetchCollectionWithSeed<ClassLevel>('classes', SEED_CLASSES),
    fetchCollectionWithSeed<Stream>('streams', SEED_STREAMS),
    fetchCollectionWithSeed<Subject>('subjects', SEED_SUBJECTS),
    fetchCollectionWithSeed<Chapter>('chapters', SEED_CHAPTERS),
    fetchCollectionWithSeed<Topic>('topics', SEED_TOPICS),
    fetchCollectionWithSeed<Question>('questions', SEED_QUESTIONS),
    fetchCollectionWithSeed<LearningMaterial>('learningMaterials', SEED_MATERIALS),
    fetchCollectionWithSeed<Announcement>('announcements', SEED_ANNOUNCEMENTS),
    fetchCollectionWithSeed<CustomTestConfig>('customTests', SEED_CUSTOM_TESTS),
  ]);

  let systemSettings: SystemSetting = {
    id: 'global',
    paymentsEnabled: false,
    guardianAgeThreshold: 18,
    aiModel: 'gemini-4-hydrogen',
    updatedAt: new Date().toISOString(),
  };

  try {
    const settingSnap = await getDoc(doc(db, 'systemSettings', 'global'));
    if (settingSnap.exists()) {
      systemSettings = settingSnap.data() as SystemSetting;
    }
  } catch {
    // Use safe default
  }

  return {
    boards,
    sessions,
    classes,
    streams,
    subjects,
    chapters,
    topics,
    questions,
    materials,
    announcements,
    customTests,
    systemSettings,
  };
}

export async function loadStudentWorkspaceData(uid: string) {
  const resultsQ = query(collection(db, 'testResults'), where('studentId', '==', uid));
  const plansQ = query(collection(db, 'studyPlans'), where('studentId', '==', uid));
  const tasksQ = query(collection(db, 'studyTasks'), where('studentId', '==', uid));
  const revQ = query(collection(db, 'revisionRecords'), where('studentId', '==', uid));
  const notifQ = query(collection(db, 'notifications'), where('studentId', '==', uid));

  const [resultsSnap, plansSnap, tasksSnap, revSnap, notifSnap] = await Promise.all([
    getDocs(resultsQ).catch(() => null),
    getDocs(plansQ).catch(() => null),
    getDocs(tasksQ).catch(() => null),
    getDocs(revQ).catch(() => null),
    getDocs(notifQ).catch(() => null),
  ]);

  return {
    testResults: resultsSnap ? resultsSnap.docs.map((d) => d.data() as TestResult) : [],
    studyPlans: plansSnap ? plansSnap.docs.map((d) => d.data() as StudyPlan) : [],
    studyTasks: tasksSnap ? tasksSnap.docs.map((d) => d.data() as StudyTask) : [],
    revisionRecords: revSnap ? revSnap.docs.map((d) => d.data() as RevisionRecord) : [],
    notifications: notifSnap ? notifSnap.docs.map((d) => d.data() as AppNotification) : [],
  };
}

export async function saveTestResultDoc(result: TestResult): Promise<void> {
  const path = `testResults/${result.id}`;
  try {
    await setDoc(doc(db, 'testResults', result.id), result);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function saveStudyPlanWithTasks(plan: StudyPlan, tasks: StudyTask[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'studyPlans', plan.id), plan);
    for (const task of tasks) {
      batch.set(doc(db, 'studyTasks', task.id), task);
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `studyPlans/${plan.id}`);
  }
}

export async function saveStudyTaskDoc(task: StudyTask): Promise<void> {
  try {
    await setDoc(doc(db, 'studyTasks', task.id), task, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `studyTasks/${task.id}`);
  }
}

export async function deleteStudyTaskDoc(taskId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'studyTasks', taskId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `studyTasks/${taskId}`);
  }
}

export async function saveRevisionRecordDoc(rec: RevisionRecord): Promise<void> {
  try {
    await setDoc(doc(db, 'revisionRecords', rec.id), rec, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `revisionRecords/${rec.id}`);
  }
}

export async function saveNotificationDoc(notif: AppNotification): Promise<void> {
  try {
    await setDoc(doc(db, 'notifications', notif.id), notif, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `notifications/${notif.id}`);
  }
}

export async function submitUserFeedbackDoc(fb: UserFeedback): Promise<void> {
  try {
    await setDoc(doc(db, 'userFeedback', fb.id), fb);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `userFeedback/${fb.id}`);
  }
}

// Admin & Content Manager Firestore Operations
export async function upsertEntityDoc<T extends { id: string }>(
  colName: string,
  item: T
): Promise<void> {
  try {
    await setDoc(doc(db, colName, item.id), item, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${colName}/${item.id}`);
  }
}

export async function deleteEntityDoc(colName: string, id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, colName, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${colName}/${id}`);
  }
}

export async function writeAuditLog(log: AuditLog): Promise<void> {
  try {
    await setDoc(doc(db, 'auditLogs', log.id), log);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `auditLogs/${log.id}`);
  }
}

export async function loadAdminDatasets() {
  const [usersSnap, logsSnap, feedbackSnap, promptsSnap, paymentsSnap] = await Promise.all([
    getDocs(collection(db, 'users')).catch(() => null),
    getDocs(collection(db, 'auditLogs')).catch(() => null),
    getDocs(collection(db, 'userFeedback')).catch(() => null),
    getDocs(collection(db, 'aiPrompts')).catch(() => null),
    getDocs(collection(db, 'payments')).catch(() => null),
  ]);

  return {
    allUsers: usersSnap ? usersSnap.docs.map((d) => d.data() as AppUser) : [],
    auditLogs: logsSnap ? logsSnap.docs.map((d) => d.data() as AuditLog) : [],
    feedbackList: feedbackSnap ? feedbackSnap.docs.map((d) => d.data() as UserFeedback) : [],
    aiPrompts:
      promptsSnap && !promptsSnap.empty
        ? promptsSnap.docs.map((d) => d.data() as AiPromptConfig)
        : SEED_AI_PROMPTS,
    payments: paymentsSnap ? paymentsSnap.docs.map((d) => d.data() as PaymentRecord) : [],
  };
}

export async function syncReferenceSeedToFirestore(): Promise<void> {
  const entries: Array<{ col: string; id: string; data: unknown }> = [];
  for (const b of SEED_BOARDS) entries.push({ col: 'boards', id: b.id, data: b });
  for (const s of SEED_SESSIONS) entries.push({ col: 'academicSessions', id: s.id, data: s });
  for (const c of SEED_CLASSES) entries.push({ col: 'classes', id: c.id, data: c });
  for (const st of SEED_STREAMS) entries.push({ col: 'streams', id: st.id, data: st });
  for (const sub of SEED_SUBJECTS) entries.push({ col: 'subjects', id: sub.id, data: sub });
  for (const ch of SEED_CHAPTERS) entries.push({ col: 'chapters', id: ch.id, data: ch });
  for (const top of SEED_TOPICS) entries.push({ col: 'topics', id: top.id, data: top });
  for (const q of SEED_QUESTIONS) entries.push({ col: 'questions', id: q.id, data: q });
  for (const m of SEED_MATERIALS) entries.push({ col: 'learningMaterials', id: m.id, data: m });
  for (const a of SEED_ANNOUNCEMENTS) entries.push({ col: 'announcements', id: a.id, data: a });
  for (const p of SEED_AI_PROMPTS) entries.push({ col: 'aiPrompts', id: p.id, data: p });
  for (const ct of SEED_CUSTOM_TESTS) entries.push({ col: 'customTests', id: ct.id, data: ct });
  for (const hb of SEED_HOME_BANNERS) entries.push({ col: 'homeBanners', id: hb.id, data: hb });

  const CHUNK_SIZE = 350;
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const slice = entries.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of slice) {
      batch.set(doc(db, item.col, item.id), item.data as Record<string, unknown>, { merge: true });
    }
    await batch.commit();
  }
}

export async function fetchServerWorkspace(headers: Record<string, string>) {
  try {
    const res = await fetch('/api/workspace', { headers });
    if (!res.ok) return null;
    return (await res.json()) as {
      studentProfile: StudentProfile | null;
      testResults: TestResult[];
      studyPlans: StudyPlan[];
      studyTasks: StudyTask[];
      revisionRecords: RevisionRecord[];
      notifications: AppNotification[];
      aiChatHistories: Record<string, unknown[]>;
    };
  } catch {
    return null;
  }
}

export async function saveServerWorkspace(
  headers: Record<string, string>,
  patch: Record<string, unknown>
): Promise<void> {
  try {
    await fetch('/api/workspace', {
      method: 'PUT',
      headers,
      body: JSON.stringify(patch),
    });
  } catch {
    // Non-fatal fallback: localStorage + Firestore remain intact
  }
}

export async function deleteServerWorkspace(headers: Record<string, string>): Promise<void> {
  try {
    await fetch('/api/workspace', { method: 'DELETE', headers });
  } catch {
    // Ignore
  }
}

export async function fetchPublicSupportData(): Promise<{
  contactInfo: SupportContactInfo;
  faqs: FaqItem[];
}> {
  let contactInfo: SupportContactInfo = { ...DEFAULT_SUPPORT_CONTACT };
  let faqs: FaqItem[] = [...SEED_FAQS];

  try {
    const res = await fetch('/api/support/public');
    if (res.ok) {
      const data = await res.json();
      if (data.contactInfo) contactInfo = data.contactInfo;
      if (Array.isArray(data.faqs) && data.faqs.length > 0) faqs = data.faqs;
      return { contactInfo, faqs };
    }
  } catch {
    // Fallback to Firestore
  }

  try {
    const [contactSnap, faqSnap] = await Promise.all([
      getDoc(doc(db, 'supportSettings', 'contact')).catch(() => null),
      getDocs(collection(db, 'supportFaqs')).catch(() => null),
    ]);
    if (contactSnap && contactSnap.exists()) {
      contactInfo = contactSnap.data() as SupportContactInfo;
    }
    if (faqSnap && !faqSnap.empty) {
      faqs = faqSnap.docs
        .map((d) => d.data() as FaqItem)
        .filter((f) => f.published)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    }
  } catch {
    // Keep safe defaults
  }
  return { contactInfo, faqs };
}

export async function saveSupportTicketDoc(ticket: SupportTicket): Promise<void> {
  try {
    await setDoc(doc(db, 'supportTickets', ticket.id), ticket, { merge: true });
  } catch {
    // Server store remains primary for credential sessions
  }
}

export async function saveSupportContactDoc(contact: SupportContactInfo): Promise<void> {
  try {
    await setDoc(doc(db, 'supportSettings', 'contact'), contact, { merge: true });
  } catch {
    // Ignore
  }
}

export async function saveFaqDoc(faq: FaqItem): Promise<void> {
  try {
    await setDoc(doc(db, 'supportFaqs', faq.id), faq, { merge: true });
  } catch {
    // Ignore
  }
}

export async function deleteFaqDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'supportFaqs', id));
  } catch {
    // Ignore
  }
}

export async function saveUploadedImageDoc(record: UploadedImageRecord): Promise<void> {
  try {
    await setDoc(doc(db, 'uploadedImages', record.id), record, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `uploadedImages/${record.id}`);
  }
}

export async function deleteUploadedImageDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'uploadedImages', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `uploadedImages/${id}`);
  }
}

export async function fetchHomeBanners(
  includeDisabled = false,
  headers?: Record<string, string>
): Promise<HomeBanner[]> {
  try {
    const endpoint = includeDisabled ? '/api/admin/banners' : '/api/banners';
    const res = await fetch(endpoint, headers ? { headers } : undefined);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.banners) && data.banners.length > 0) {
        return [...data.banners].sort((a: HomeBanner, b: HomeBanner) => a.orderIndex - b.orderIndex);
      }
    }
  } catch {
    // Fallback to Firestore
  }

  try {
    const snap = await getDocs(collection(db, 'homeBanners'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as HomeBanner).sort((a, b) => a.orderIndex - b.orderIndex);
      return includeDisabled ? list : list.filter((b) => b.enabled);
    }
  } catch {
    // Keep seed defaults
  }
  return [...SEED_HOME_BANNERS];
}

export async function saveHomeBannerDoc(banner: HomeBanner): Promise<void> {
  try {
    await setDoc(doc(db, 'homeBanners', banner.id), banner, { merge: true });
  } catch {
    // Non-fatal if session is credential-only
  }
}

export async function deleteHomeBannerDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'homeBanners', id));
  } catch {
    // Non-fatal
  }
}


