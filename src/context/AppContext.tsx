import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  PhoneAuthProvider,
  RecaptchaVerifier,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  type ConfirmationResult,
  User as FirebaseUser,
} from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth, googleAuthProvider, testFirestoreConnection } from '../lib/firebase.ts';
import {
  getRuntimePlatform,
  isCapacitorNative,
  isFirebaseAuthPluginAvailable,
} from '../lib/api.ts';
import {
  deleteEntityDoc,
  deleteFaqDoc,
  deleteServerWorkspace,
  deleteStudyTaskDoc,
  deleteUploadedImageDoc,
  deleteUserAccountData,
  fetchHomeBanners,
  fetchPublicSupportData,
  fetchServerWorkspace,
  fetchStudentProfile,
  fetchUserRecord,
  loadAdminDatasets,
  loadCurriculumCatalog,
  loadStudentWorkspaceData,
  saveFaqDoc,
  saveHomeBannerDoc,
  saveNotificationDoc,
  saveRevisionRecordDoc,
  saveServerWorkspace,
  saveStudentProfile,
  saveStudyPlanWithTasks,
  saveStudyTaskDoc,
  saveSupportContactDoc,
  saveSupportTicketDoc,
  saveTestResultDoc,
  saveUploadedImageDoc,
  saveUserRecord,
  submitUserFeedbackDoc,
  syncReferenceSeedToFirestore,
  upsertEntityDoc,
  writeAuditLog,
  deleteHomeBannerDoc,
} from '../lib/store.ts';
import { DEFAULT_SUPPORT_CONTACT, SEED_FAQS } from '../data/seedSupport.ts';
import { SEED_HOME_BANNERS } from '../data/seedBannersData.ts';
import {
  AcademicSession,
  AiChatMessage,
  AiPromptConfig,
  Announcement,
  AppNotification,
  AppPage,
  AppUser,
  AuditLog,
  Board,
  Chapter,
  ClassLevel,
  CustomTestConfig,
  FaqItem,
  HomeBanner,
  ImageCategory,
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
  SupportProblemCategory,
  SupportTicket,
  SupportTicketStatus,
  SystemSetting,
  TestCategory,
  TestResult,
  ThemeMode,
  Topic,
  UploadedImageRecord,
  UserFeedback,
} from '../types/index.ts';
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

const ADMIN_BOOTSTRAP_EMAIL = 'abhimanyuking2411@gmail.com';
const SESSION_TOKEN_KEY = 'ais_session_token';
const CREDENTIAL_USER_KEY = 'ais_credential_user';

export interface NavParams {
  subjectId?: string;
  chapterId?: string;
  testMode?: 'Chapter MCQ' | 'Written Test' | 'Mock Exam';
  testCategory?: TestCategory;
  topicName?: string;
  customTestId?: string;
  initialTestMode?: 'learning' | 'exam';
  resultId?: string;
  aiInitialTopic?: string;
  authMode?: 'login' | 'register';
  pdfClassId?: 'class_10' | 'class_11' | 'class_12';
}

interface AppContextValue {
  booting: boolean;
  authReady: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentPage: AppPage;
  navParams: NavParams;
  navigate: (page: AppPage, params?: NavParams) => void;
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  studentProfile: StudentProfile | null;
  sessionToken: string | null;
  getApiHeaders: () => Promise<Record<string, string>>;
  signInWithGoogle: () => Promise<void>;
  sendPhoneOtp: (
    phoneNumber: string,
    options?: { resend?: boolean; recaptchaContainerId?: string }
  ) => Promise<{ verificationId: string; normalizedPhone: string; autoSignedIn: boolean }>;
  verifyPhoneOtp: (verificationId: string, otpCode: string) => Promise<void>;
  sendFirebasePasswordReset: (email: string) => Promise<void>;
  registerWithCredentials: (payload: {
    displayName: string;
    identifier: string;
    password: string;
    photoUrl?: string;
    pendingPhotoDataUrl?: string;
    ageConfirmed: boolean;
    guardianConsent: boolean;
    guardianContact?: string;
  }) => Promise<void>;
  loginWithCredentials: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteMyAccount: () => Promise<void>;
  uploadImage: (payload: {
    dataUrl: string;
    category: ImageCategory;
    visibility?: 'private' | 'curriculum';
    altText?: string;
    caption?: string;
    targetId?: string;
  }) => Promise<{ image: UploadedImageRecord; url: string }>;
  deleteImage: (imageId: string) => Promise<void>;
  updateUserProfilePhoto: (photoUrl: string) => Promise<void>;
  saveStudentOnboarding: (profile: StudentProfile, silent?: boolean) => Promise<void>;
  toggleChapterCompleted: (chapterId: string) => Promise<void>;
  updateLastStudiedChapter: (subjectId: string, chapterId: string) => Promise<void>;
  addStudyMinutes: (minutes: number) => Promise<void>;
  boards: Board[];
  sessions: AcademicSession[];
  classes: ClassLevel[];
  streams: Stream[];
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  questions: Question[];
  materials: LearningMaterial[];
  announcements: Announcement[];
  customTests: CustomTestConfig[];
  systemSettings: SystemSetting;
  testResults: TestResult[];
  studyPlans: StudyPlan[];
  studyTasks: StudyTask[];
  revisionRecords: RevisionRecord[];
  notifications: AppNotification[];
  aiChatHistories: Record<string, AiChatMessage[]>;
  saveAiChatHistory: (subjectId: string, messages: AiChatMessage[]) => Promise<void>;
  saveTestResult: (result: TestResult) => Promise<void>;
  createStudyPlan: (plan: StudyPlan, tasks: StudyTask[]) => Promise<void>;
  updateStudyTask: (task: StudyTask) => Promise<void>;
  removeStudyTask: (taskId: string) => Promise<void>;
  updateRevisionRecord: (rec: RevisionRecord) => Promise<void>;
  markNotificationRead: (notif: AppNotification) => Promise<void>;
  addNotification: (notif: AppNotification) => Promise<void>;
  submitFeedback: (fb: UserFeedback) => Promise<void>;
  // Support & Help Center
  supportContact: SupportContactInfo;
  supportFaqs: FaqItem[];
  supportTickets: SupportTicket[];
  refreshSupportData: () => Promise<void>;
  submitSupportTicket: (payload: {
    category: SupportProblemCategory;
    subject: string;
    description: string;
    screenshotDataUrl?: string;
  }) => Promise<SupportTicket>;
  adminReplySupportTicket: (
    ticketId: string,
    status: SupportTicketStatus,
    adminReply: string
  ) => Promise<SupportTicket>;
  adminSaveContactInfo: (contact: SupportContactInfo) => Promise<SupportContactInfo>;
  adminSaveFaq: (faq: FaqItem) => Promise<FaqItem>;
  adminDeleteFaq: (faqId: string) => Promise<void>;
  adminUpdateFeedback: (
    id: string,
    status: 'open' | 'reviewed' | 'resolved',
    adminNote?: string
  ) => Promise<void>;
  // Official Branding & Home Promotional Banners
  brandLogoUrl: string;
  adminSaveBrandLogo: (logoUrl: string, logoImageId?: string) => Promise<void>;
  adminResetBrandLogo: () => Promise<void>;
  homeBanners: HomeBanner[];
  refreshBanners: () => Promise<void>;
  adminSaveBanner: (banner: HomeBanner) => Promise<HomeBanner[]>;
  adminSaveAllBanners: (banners: HomeBanner[]) => Promise<HomeBanner[]>;
  adminDeleteBanner: (bannerId: string) => Promise<void>;
  adminResetBanners: () => Promise<HomeBanner[]>;
  // Admin / Content Manager state & actions
  allUsers: AppUser[];
  auditLogs: AuditLog[];
  feedbackList: UserFeedback[];
  aiPrompts: AiPromptConfig[];
  payments: PaymentRecord[];
  refreshCatalog: () => Promise<void>;
  refreshAdminData: () => Promise<void>;
  adminUpsert: <T extends { id: string }>(
    colName: string,
    item: T,
    auditAction: string,
    entityType: string
  ) => Promise<void>;
  adminUpdateUser: (user: AppUser, auditAction?: string) => Promise<void>;
  adminDelete: (colName: string, id: string, entityType: string) => Promise<void>;
  syncSeedCatalog: () => Promise<void>;
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of secondary) map.set(item.id, item);
  for (const item of primary) map.set(item.id, item);
  return Array.from(map.values());
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [booting, setBooting] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const savedMode = window.localStorage.getItem('ais_theme_mode');
    if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto') {
      return savedMode;
    }
    return 'light';
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const theme: 'light' | 'dark' =
    themeMode === 'dark' ? 'dark' : themeMode === 'auto' && systemPrefersDark ? 'dark' : 'light';
  const [currentPage, setCurrentPage] = useState<AppPage>('welcome');
  const [navParams, setNavParams] = useState<NavParams>({});

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(SESSION_TOKEN_KEY);
  });
  const [appUser, setAppUser] = useState<AppUser | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const token = window.localStorage.getItem(SESSION_TOKEN_KEY);
      const cached = window.localStorage.getItem(CREDENTIAL_USER_KEY);
      return token && cached ? (JSON.parse(cached) as AppUser) : null;
    } catch {
      return null;
    }
  });
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const phoneConfirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const [boards, setBoards] = useState<Board[]>(SEED_BOARDS);
  const [sessions, setSessions] = useState<AcademicSession[]>(SEED_SESSIONS);
  const [classes, setClasses] = useState<ClassLevel[]>(SEED_CLASSES);
  const [streams, setStreams] = useState<Stream[]>(SEED_STREAMS);
  const [subjects, setSubjects] = useState<Subject[]>(SEED_SUBJECTS);
  const [chapters, setChapters] = useState<Chapter[]>(SEED_CHAPTERS);
  const [topics, setTopics] = useState<Topic[]>(SEED_TOPICS);
  const [questions, setQuestions] = useState<Question[]>(SEED_QUESTIONS);
  const [materials, setMaterials] = useState<LearningMaterial[]>(SEED_MATERIALS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(SEED_ANNOUNCEMENTS);
  const [customTests, setCustomTests] = useState<CustomTestConfig[]>(SEED_CUSTOM_TESTS);
  const [systemSettings, setSystemSettings] = useState<SystemSetting>({
    id: 'global',
    paymentsEnabled: false,
    guardianAgeThreshold: 18,
    aiModel: 'gemini-4-hydrogen',
    updatedAt: new Date().toISOString(),
  });

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [studyTasks, setStudyTasks] = useState<StudyTask[]>([]);
  const [revisionRecords, setRevisionRecords] = useState<RevisionRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [aiChatHistories, setAiChatHistories] = useState<Record<string, AiChatMessage[]>>({});

  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [feedbackList, setFeedbackList] = useState<UserFeedback[]>([]);
  const [aiPrompts, setAiPrompts] = useState<AiPromptConfig[]>(SEED_AI_PROMPTS);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [supportContact, setSupportContact] = useState<SupportContactInfo>(DEFAULT_SUPPORT_CONTACT);
  const [supportFaqs, setSupportFaqs] = useState<FaqItem[]>(SEED_FAQS);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string>('');
  const [homeBanners, setHomeBanners] = useState<HomeBanner[]>(SEED_HOME_BANNERS);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const sessionTokenRef = useRef<string | null>(sessionToken);
  sessionTokenRef.current = sessionToken;

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = theme;
    window.localStorage.setItem('ais_theme_mode', themeMode);
    window.localStorage.setItem('ais_theme', theme);
  }, [theme, themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const effective =
        prev === 'dark' || (prev === 'auto' && systemPrefersDark) ? 'dark' : 'light';
      return effective === 'light' ? 'dark' : 'light';
    });
  }, [systemPrefersDark]);

  const navigate = useCallback((page: AppPage, params: NavParams = {}) => {
    setCurrentPage(page);
    setNavParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const getApiHeaders = useCallback(async (overrideToken?: string): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (overrideToken) {
      headers['Authorization'] = `Bearer ${overrideToken}`;
      return headers;
    }
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } else if (sessionTokenRef.current) {
      headers['Authorization'] = `Bearer ${sessionTokenRef.current}`;
    }
    return headers;
  }, []);

  const refreshCatalog = useCallback(async () => {
    const catalog = await loadCurriculumCatalog();
    setBoards(catalog.boards);
    setSessions(catalog.sessions);
    setClasses(catalog.classes);
    setStreams(catalog.streams);
    setSubjects(catalog.subjects);
    setChapters(catalog.chapters);
    setTopics(catalog.topics);
    setQuestions(catalog.questions);
    setMaterials(catalog.materials);
    setAnnouncements(catalog.announcements);
    setCustomTests(catalog.customTests);
    setSystemSettings(catalog.systemSettings);
  }, []);

  const refreshSupportData = useCallback(async () => {
    const pub = await fetchPublicSupportData();
    setSupportContact(pub.contactInfo);
    setSupportFaqs(pub.faqs);

    const headers = await getApiHeaders();
    if (!headers['Authorization']) return;

    try {
      const [tRes, fRes, fbRes] = await Promise.all([
        fetch('/api/support/tickets', { headers }),
        fetch('/api/support/faqs', { headers }),
        fetch('/api/support/feedback', { headers }),
      ]);
      if (tRes.ok) {
        const td = await tRes.json();
        if (Array.isArray(td.tickets)) setSupportTickets(td.tickets);
      }
      if (fRes.ok) {
        const fd = await fRes.json();
        if (Array.isArray(fd.faqs) && fd.faqs.length > 0) setSupportFaqs(fd.faqs);
      }
      if (fbRes.ok) {
        const fbd = await fbRes.json();
        if (Array.isArray(fbd.feedback)) {
          setFeedbackList((prev) => mergeById(fbd.feedback, prev));
        }
      }
    } catch {
      // Retain existing state cleanly
    }
  }, [getApiHeaders]);

  const refreshBanners = useCallback(async () => {
    const headers = await getApiHeaders();
    const isStaff = appUser?.role === 'admin' || appUser?.role === 'content_manager';
    const [list, brandingRes] = await Promise.all([
      fetchHomeBanners(Boolean(isStaff && headers['Authorization']), headers),
      fetch('/api/branding').catch(() => null),
    ]);
    setHomeBanners(list);
    if (brandingRes && brandingRes.ok) {
      try {
        const bd = await brandingRes.json();
        const url = typeof bd?.branding?.logoUrl === 'string' ? bd.branding.logoUrl.trim() : '';
        if (url && url !== '/ai-students-logo.jpg') {
          setBrandLogoUrl(url);
        } else {
          setBrandLogoUrl('');
        }
      } catch {
        // Retain default logo
      }
    }
  }, [appUser?.role, getApiHeaders]);

  const refreshAdminData = useCallback(async () => {
    const data = await loadAdminDatasets();
    setAllUsers(data.allUsers);
    setAuditLogs(data.auditLogs);
    setFeedbackList((prev) => mergeById(data.feedbackList, prev));
    setAiPrompts(data.aiPrompts);
    setPayments(data.payments);
    await Promise.all([refreshSupportData(), refreshBanners()]);
  }, [refreshBanners, refreshSupportData]);

  const hydrateUserWorkspace = useCallback(
    async (uid: string, tokenOverride?: string) => {
      await refreshCatalog();
      const headers = await getApiHeaders(tokenOverride);
      const serverWs = headers['Authorization'] ? await fetchServerWorkspace(headers) : null;
      const fsWs = auth.currentUser ? await loadStudentWorkspaceData(uid) : null;

      let localChats: Record<string, AiChatMessage[]> = {};
      try {
        const rawChats = window.localStorage.getItem(`ais_chats_${uid}`);
        if (rawChats) localChats = JSON.parse(rawChats);
      } catch {
        // Ignore parse error
      }

      const mergedResults = mergeById(fsWs?.testResults || [], serverWs?.testResults || []);
      const mergedPlans = mergeById(fsWs?.studyPlans || [], serverWs?.studyPlans || []);
      const mergedTasks = mergeById(fsWs?.studyTasks || [], serverWs?.studyTasks || []);
      const mergedRevs = mergeById(fsWs?.revisionRecords || [], serverWs?.revisionRecords || []);
      const mergedNotifs = mergeById(fsWs?.notifications || [], serverWs?.notifications || []);
      const mergedChats = {
        ...localChats,
        ...((serverWs?.aiChatHistories as Record<string, AiChatMessage[]>) || {}),
      };

      setTestResults(mergedResults);
      setStudyPlans(mergedPlans);
      setStudyTasks(mergedTasks);
      setRevisionRecords(mergedRevs);
      setNotifications(mergedNotifs);
      setAiChatHistories(mergedChats);

      if (serverWs?.studentProfile) {
        setStudentProfile((prev) => prev || serverWs.studentProfile);
      }
      refreshSupportData().catch(() => {});
      return serverWs;
    },
    [getApiHeaders, refreshCatalog, refreshSupportData]
  );

  // Boot & Firebase Auth listener + Credential session restore
  useEffect(() => {
    testFirestoreConnection();
    refreshSupportData().catch(() => {});
    refreshBanners().catch(() => {});
    const timer = setTimeout(() => setBooting(false), 650);
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          let userDoc = await fetchUserRecord(fbUser.uid).catch(() => null);
          const isBootstrapAdmin =
            fbUser.email?.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL && fbUser.emailVerified;

          if (!userDoc) {
            userDoc = {
              uid: fbUser.uid,
              displayName:
                fbUser.displayName ||
                fbUser.email?.split('@')[0] ||
                fbUser.phoneNumber ||
                'Student',
              email: fbUser.email || '',
              phone: fbUser.phoneNumber || '',
              photoUrl: fbUser.photoURL || '',
              role: isBootstrapAdmin ? 'admin' : 'student',
              status: 'active',
              ageConfirmed: true,
              guardianConsent: true,
              createdAt: new Date().toISOString(),
            };
            await saveUserRecord(userDoc).catch(() => {});
          } else if (isBootstrapAdmin && userDoc.role !== 'admin') {
            userDoc = { ...userDoc, role: 'admin' };
            await saveUserRecord(userDoc).catch(() => {});
          }

          setAppUser(userDoc);
          const fsProfile = await fetchStudentProfile(fbUser.uid).catch(() => null);
          const serverWs = await hydrateUserWorkspace(fbUser.uid);
          let cachedProfile: StudentProfile | null = null;
          try {
            const rawProf = window.localStorage.getItem(`ais_profile_${fbUser.uid}`);
            if (rawProf) cachedProfile = JSON.parse(rawProf);
          } catch {
            // Ignore cache parse error
          }
          const effectiveProfile = fsProfile || serverWs?.studentProfile || cachedProfile || null;
          setStudentProfile(effectiveProfile);
          if (effectiveProfile) {
            try {
              window.localStorage.setItem(
                `ais_profile_${fbUser.uid}`,
                JSON.stringify(effectiveProfile)
              );
            } catch {
              // Ignore storage quota error
            }
          }

          if (userDoc.role === 'admin' || userDoc.role === 'content_manager') {
            refreshAdminData().catch(() => {});
          }

          setCurrentPage((prev) => {
            if (prev === 'welcome' || prev === 'auth' || prev === 'forgot-password') {
              return effectiveProfile?.onboardingCompleted ? 'dashboard' : 'onboarding';
            }
            return prev;
          });
        } catch (err) {
          console.error('Auth hydration error:', err);
        }
      } else {
        const storedToken = window.localStorage.getItem(SESSION_TOKEN_KEY);
        const storedUserRaw = window.localStorage.getItem(CREDENTIAL_USER_KEY);
        if (storedToken && storedUserRaw) {
          try {
            const parsedUser = JSON.parse(storedUserRaw) as AppUser;
            setAppUser(parsedUser);
            const serverWs = await hydrateUserWorkspace(parsedUser.uid, storedToken);
            let cachedProfile: StudentProfile | null = null;
            try {
              const rawProf = window.localStorage.getItem(`ais_profile_${parsedUser.uid}`);
              if (rawProf) cachedProfile = JSON.parse(rawProf);
            } catch {
              // Ignore
            }
            const effectiveProfile = serverWs?.studentProfile || cachedProfile;
            if (effectiveProfile) {
              setStudentProfile(effectiveProfile);
              window.localStorage.setItem(
                `ais_profile_${parsedUser.uid}`,
                JSON.stringify(effectiveProfile)
              );
            }
            if (parsedUser.role === 'admin' || parsedUser.role === 'content_manager') {
              refreshAdminData().catch(() => {});
            }
            setCurrentPage((prev) => {
              if (prev === 'welcome' || prev === 'auth' || prev === 'forgot-password') {
                return effectiveProfile?.onboardingCompleted ? 'dashboard' : 'onboarding';
              }
              return prev;
            });
          } catch {
            setAppUser(null);
            setStudentProfile(null);
          }
        } else {
          setAppUser(null);
          setStudentProfile(null);
        }
      }
      setAuthReady(true);
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [hydrateUserWorkspace, refreshAdminData]);

  const signInWithGoogle = useCallback(async () => {
    try {
      if (isCapacitorNative()) {
        if (!isFirebaseAuthPluginAvailable()) {
          const platform = getRuntimePlatform();
          throw new Error(
            `Native FirebaseAuthentication plugin is unavailable on ${platform}. This happens when android/app/google-services.json was missing during the APK build so FirebaseApp could not initialize on startup. Add google-services.json with SHA-1/SHA-256 and rebuild the APK.`
          );
        }

        let result;
        try {
          result = await FirebaseAuthentication.signInWithGoogle();
        } catch (nativeErr: any) {
          const nativeMsg = String(nativeErr?.message || '');
          // Fallback to classic Google Sign-In Intent if Android Credential Manager reports NoCredentialException
          if (/NoCredentialException|no credentials available/i.test(nativeMsg) && !/cancel/i.test(nativeMsg)) {
            result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
          } else {
            throw nativeErr;
          }
        }

        const idToken = result.credential?.idToken;
        if (!idToken) {
          throw new Error(
            'Native Google Sign-In did not return an ID token. Verify android/app/google-services.json and Firebase SHA-1/SHA-256 setup.'
          );
        }
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
        showToast('Signed in successfully.', 'success');
        return;
      }

      await signInWithPopup(auth, googleAuthProvider);
      showToast('Signed in successfully.', 'success');
    } catch (err: any) {
      const code = String(err?.code || '');
      const message = String(err?.message || '');
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'CANCELED' ||
        /cancel/i.test(message)
      ) {
        throw new Error('Google Sign-In was cancelled.');
      }
      if (
        code === 'UNIMPLEMENTED' ||
        /not implemented on android/i.test(message) ||
        /Default FirebaseApp is not initialized/i.test(message)
      ) {
        throw new Error(
          'Native Firebase Android plugin could not initialize because android/app/google-services.json was missing when this APK was built. Add google-services.json + SHA-1/SHA-256 in Firebase Console and rebuild the APK, or use Email & Password Login.'
        );
      }
      if (
        /DEVELOPER_ERROR|NoCredentialException|ApiException:\s*10\b/i.test(message)
      ) {
        throw new Error(
          'Android Google Sign-In configuration error (SHA-1/SHA-256 or OAuth client mismatch). Add your APK SHA-1 & SHA-256 in Firebase Console for com.aistudents.app and rebuild with updated google-services.json.'
        );
      }
      throw err;
    }
  }, [showToast]);

  const normalizePhoneE164 = (raw: string): string => {
    const cleaned = raw.trim().replace(/[\s()-]/g, '');
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    if (/^\+[1-9]\d{7,14}$/.test(cleaned)) {
      return cleaned;
    }
    throw new Error(
      'Enter a valid 10-digit mobile number or international number with country code (e.g. +919876543210).'
    );
  };

  const sendPhoneOtp = useCallback(
    async (
      phoneNumber: string,
      options?: { resend?: boolean; recaptchaContainerId?: string }
    ): Promise<{ verificationId: string; normalizedPhone: string; autoSignedIn: boolean }> => {
      const normalizedPhone = normalizePhoneE164(phoneNumber);

      if (isCapacitorNative()) {
        if (!isFirebaseAuthPluginAvailable()) {
          throw new Error(
            'Native FirebaseAuthentication plugin is unavailable on Android (missing android/app/google-services.json during APK build). Add google-services.json + SHA-1/SHA-256 in Firebase Console and rebuild APK.'
          );
        }
        const handles: Array<{ remove: () => Promise<void> }> = [];
        const cleanup = async () => {
          await Promise.all(handles.map((h) => h.remove().catch(() => {})));
        };

        try {
          return await new Promise<{
            verificationId: string;
            normalizedPhone: string;
            autoSignedIn: boolean;
          }>((resolve, reject) => {
            let settled = false;
            let lastVerificationId = '';
            const timeoutHandle = setTimeout(() => {
              if (!settled) {
                settled = true;
                void cleanup();
                reject(new Error('OTP request timed out. Please check your network and try again.'));
              }
            }, 35_000);

            const finishResolve = (val: {
              verificationId: string;
              normalizedPhone: string;
              autoSignedIn: boolean;
            }) => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutHandle);
              void cleanup();
              resolve(val);
            };

            const finishReject = (error: Error) => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutHandle);
              void cleanup();
              reject(error);
            };

            Promise.all([
              FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
                lastVerificationId = event.verificationId;
                finishResolve({
                  verificationId: event.verificationId,
                  normalizedPhone,
                  autoSignedIn: false,
                });
              }),
              FirebaseAuthentication.addListener('phoneVerificationCompleted', async (event) => {
                try {
                  if (event.verificationCode && lastVerificationId) {
                    const cred = PhoneAuthProvider.credential(
                      lastVerificationId,
                      event.verificationCode
                    );
                    await signInWithCredential(auth, cred);
                    showToast('Phone number verified and signed in.', 'success');
                    finishResolve({
                      verificationId: lastVerificationId,
                      normalizedPhone,
                      autoSignedIn: true,
                    });
                    return;
                  }
                } catch (err: any) {
                  finishReject(new Error(err?.message || 'Automatic OTP verification failed.'));
                }
              }),
              FirebaseAuthentication.addListener('phoneVerificationFailed', (event) => {
                const msg = String(event?.message || 'Phone verification failed.');
                if (/billing|quota|blocked|app-not-authorized|operation-not-allowed/i.test(msg)) {
                  finishReject(
                    new Error(
                      'Firebase Phone OTP is not enabled or billing/Play Integrity setup is incomplete in Firebase Console for this Android app.'
                    )
                  );
                } else {
                  finishReject(new Error(msg));
                }
              }),
            ])
              .then(async (registered) => {
                handles.push(...registered);
                await FirebaseAuthentication.signInWithPhoneNumber({
                  phoneNumber: normalizedPhone,
                  timeout: 60,
                  resendCode: Boolean(options?.resend),
                  skipNativeAuth: true,
                });
              })
              .catch((err: any) => {
                const msg = String(err?.message || '');
                const code = String(err?.code || '');
                if (
                  code === 'UNIMPLEMENTED' ||
                  /not implemented on android|Default FirebaseApp is not initialized/i.test(msg)
                ) {
                  finishReject(
                    new Error(
                      'Native Firebase Android plugin is not initialized in this APK (missing android/app/google-services.json). Add google-services.json and rebuild APK.'
                    )
                  );
                } else if (/provider is not enabled/i.test(msg)) {
                  finishReject(
                    new Error('Phone provider is not enabled in Capacitor FirebaseAuthentication config.')
                  );
                } else {
                  finishReject(new Error(msg || 'Failed to send OTP.'));
                }
              });
          });
        } catch (err) {
          await cleanup();
          throw err;
        }
      }

      const containerId = options?.recaptchaContainerId || 'recaptcha-container';
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // Ignore stale verifier cleanup
        }
        recaptchaVerifierRef.current = null;
      }

      try {
        const verifier = new RecaptchaVerifier(auth, containerId, {
          size: 'invisible',
        });
        recaptchaVerifierRef.current = verifier;
        const confirmation = await signInWithPhoneNumber(auth, normalizedPhone, verifier);
        phoneConfirmationRef.current = confirmation;
        return {
          verificationId: confirmation.verificationId,
          normalizedPhone,
          autoSignedIn: false,
        };
      } catch (err: any) {
        const code = String(err?.code || '');
        if (code === 'auth/operation-not-allowed') {
          throw new Error(
            'Phone OTP authentication is not enabled in Firebase Console -> Authentication -> Sign-in method.'
          );
        }
        if (code === 'auth/billing-not-enabled') {
          throw new Error(
            'Firebase Phone SMS requires billing/Blaze plan or Firebase Test Phone Numbers configured in Firebase Console.'
          );
        }
        if (code === 'auth/too-many-requests') {
          throw new Error('Too many OTP requests. Please wait a little while before trying again.');
        }
        if (code === 'auth/invalid-phone-number') {
          throw new Error('Invalid phone number format. Include country code (e.g. +919876543210).');
        }
        throw new Error(err?.message || 'Unable to send OTP via Firebase.');
      }
    },
    [showToast]
  );

  const verifyPhoneOtp = useCallback(
    async (verificationId: string, otpCode: string) => {
      const trimmedCode = otpCode.trim();
      if (!/^\d{6}$/.test(trimmedCode)) {
        throw new Error('Please enter a valid 6-digit OTP code.');
      }

      try {
        if (isCapacitorNative()) {
          if (!verificationId) {
            throw new Error('OTP session expired. Please request a new OTP.');
          }
          const credential = PhoneAuthProvider.credential(verificationId, trimmedCode);
          await signInWithCredential(auth, credential);
          showToast('Mobile number verified and signed in.', 'success');
          return;
        }

        const confirmation = phoneConfirmationRef.current;
        if (!confirmation) {
          throw new Error('OTP session expired. Please request a new OTP.');
        }
        await confirmation.confirm(trimmedCode);
        phoneConfirmationRef.current = null;
        showToast('Mobile number verified and signed in.', 'success');
      } catch (err: any) {
        const code = String(err?.code || '');
        if (code === 'auth/invalid-verification-code') {
          throw new Error('Incorrect OTP code. Please check and try again.');
        }
        if (code === 'auth/code-expired' || code === 'auth/session-expired') {
          throw new Error('OTP has expired. Please tap Resend OTP.');
        }
        throw err;
      }
    },
    [showToast]
  );

  const sendFirebasePasswordReset = useCallback(async (email: string) => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new Error('Please enter a valid email address.');
    }
    await sendPasswordResetEmail(auth, trimmed);
  }, []);

  const parseJsonSafe = async (
    res: Response
  ): Promise<{ isJson: boolean; data: any }> => {
    try {
      const text = await res.text();
      if (!text) return { isJson: false, data: null };
      return { isJson: true, data: JSON.parse(text) };
    } catch {
      return { isJson: false, data: null };
    }
  };

  const mapFirebaseEmailAuthError = (err: any): Error => {
    const code = String(err?.code || '');
    if (code === 'auth/email-already-in-use') {
      return new Error('An account with this email already exists. Please sign in instead.');
    }
    if (code === 'auth/invalid-email') {
      return new Error('Please enter a valid email address.');
    }
    if (code === 'auth/weak-password') {
      return new Error('Password must be at least 6–8 characters long.');
    }
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      return new Error('Invalid email or password. Please check your credentials and try again.');
    }
    if (code === 'auth/user-disabled') {
      return new Error('This account has been disabled.');
    }
    if (code === 'auth/too-many-requests') {
      return new Error('Too many failed attempts. Please wait a moment and try again.');
    }
    if (code === 'auth/operation-not-allowed') {
      return new Error(
        'Email/Password sign-in is disabled in Firebase Console -> Authentication -> Sign-in method.'
      );
    }
    if (code === 'auth/network-request-failed') {
      return new Error('Network error while connecting to Firebase Authentication. Check your internet connection.');
    }
    return err instanceof Error ? err : new Error(String(err || 'Authentication failed.'));
  };

  const registerWithCredentials = useCallback(
    async (payload: {
      displayName: string;
      identifier: string;
      password: string;
      photoUrl?: string;
      pendingPhotoDataUrl?: string;
      ageConfirmed: boolean;
      guardianConsent: boolean;
      guardianContact?: string;
    }) => {
      const { pendingPhotoDataUrl, ...registerBody } = payload;
      const trimmedIdentifier = payload.identifier.trim();
      const isEmailIdentifier = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedIdentifier);

      let backendStatus = 0;
      let backendJson = false;
      let data: any = null;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerBody),
        });
        backendStatus = res.status;
        const parsed = await parseJsonSafe(res);
        backendJson = parsed.isJson;
        data = parsed.data;
        if (!res.ok && parsed.isJson && data?.error) {
          throw new Error(data.error);
        }
      } catch (fetchErr: any) {
        if (!isCapacitorNative() || (backendJson && backendStatus >= 400 && backendStatus < 500)) {
          throw fetchErr;
        }
      }

      if (backendJson && data?.sessionToken) {
        window.localStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
        setSessionToken(data.sessionToken);

        let resolvedPhotoUrl = payload.photoUrl || '';
        if (pendingPhotoDataUrl) {
          try {
            const uploadRes = await fetch('/api/images/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.sessionToken}`,
              },
              body: JSON.stringify({
                dataUrl: pendingPhotoDataUrl,
                category: 'profile',
                visibility: 'private',
                altText: `${data.user.displayName} profile photo`,
              }),
            });
            if (uploadRes.ok) {
              const uploaded = await uploadRes.json();
              if (uploaded.url) {
                resolvedPhotoUrl = uploaded.url;
                await fetch('/api/profile/photo', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${data.sessionToken}`,
                  },
                  body: JSON.stringify({ photoUrl: resolvedPhotoUrl }),
                }).catch(() => {});
              }
            }
          } catch {
            // Non-fatal: student can upload/retry profile photo later in Profile
          }
        }

        const createdUser: AppUser = {
          uid: data.user.uid,
          displayName: data.user.displayName,
          email: data.user.email || '',
          phone: data.user.phone || '',
          photoUrl: resolvedPhotoUrl,
          role: data.user.role || 'student',
          status: 'active',
          ageConfirmed: data.user.ageConfirmed,
          guardianConsent: data.user.guardianConsent,
          guardianContact: data.user.guardianContact || '',
          createdAt: new Date().toISOString(),
        };
        window.localStorage.setItem(CREDENTIAL_USER_KEY, JSON.stringify(createdUser));
        setAppUser(createdUser);

        if (data.customToken) {
          await signInWithCustomToken(auth, data.customToken).catch(() => {});
        }
        if (auth.currentUser) {
          await saveUserRecord(createdUser).catch(() => {});
        }
        await hydrateUserWorkspace(createdUser.uid, data.sessionToken);
        setCurrentPage('onboarding');
        showToast('Account created. Let’s set up your board and subjects.', 'success');
        return;
      }

      if (isCapacitorNative() && isEmailIdentifier) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, trimmedIdentifier, payload.password);
          await updateProfile(cred.user, {
            displayName: payload.displayName.trim(),
            ...(payload.photoUrl?.trim() ? { photoURL: payload.photoUrl.trim() } : {}),
          }).catch(() => {});
          await sendEmailVerification(cred.user).catch(() => {});

          const createdUser: AppUser = {
            uid: cred.user.uid,
            displayName: payload.displayName.trim(),
            email: cred.user.email || trimmedIdentifier.toLowerCase(),
            phone: cred.user.phoneNumber || '',
            photoUrl: payload.photoUrl?.trim() || '',
            role: 'student',
            status: 'active',
            ageConfirmed: payload.ageConfirmed,
            guardianConsent: payload.guardianConsent,
            guardianContact: payload.guardianContact || '',
            createdAt: new Date().toISOString(),
          };
          setAppUser(createdUser);
          await saveUserRecord(createdUser).catch(() => {});
          await hydrateUserWorkspace(createdUser.uid);
          setCurrentPage('onboarding');
          showToast('Account created with Firebase. Let’s set up your board and subjects.', 'success');
          return;
        } catch (fbErr: any) {
          throw mapFirebaseEmailAuthError(fbErr);
        }
      }

      if (isCapacitorNative() && !isEmailIdentifier) {
        throw new Error(
          'Backend API is currently unavailable for mobile/password sign-up. Please register with your Email & Password or use the Mobile OTP tab.'
        );
      }

      throw new Error('Registration failed. Please try again.');
    },
    [hydrateUserWorkspace, showToast]
  );

  const loginWithCredentials = useCallback(
    async (identifier: string, password: string) => {
      const trimmedIdentifier = identifier.trim();
      const isEmailIdentifier = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedIdentifier);

      let backendStatus = 0;
      let backendJson = false;
      let data: any = null;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: trimmedIdentifier, password }),
        });
        backendStatus = res.status;
        const parsed = await parseJsonSafe(res);
        backendJson = parsed.isJson;
        data = parsed.data;
        if (!res.ok && parsed.isJson && data?.error) {
          // On native Android, allow Firebase Email/Password sign-in if the account lives in Firebase Auth (e.g. 401 from backend store)
          if (!(isCapacitorNative() && isEmailIdentifier && res.status === 401)) {
            throw new Error(data.error);
          }
        }
      } catch (fetchErr: any) {
        if (!isCapacitorNative() || (backendJson && backendStatus >= 400 && backendStatus < 500 && backendStatus !== 401)) {
          throw fetchErr;
        }
      }

      if (backendJson && data?.sessionToken && data?.user) {
        window.localStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
        setSessionToken(data.sessionToken);

        const loggedUser: AppUser = {
          uid: data.user.uid,
          displayName: data.user.displayName,
          email: data.user.email || '',
          phone: data.user.phone || '',
          photoUrl: data.user.photoUrl || '',
          role: data.user.role,
          status: 'active',
          ageConfirmed: data.user.ageConfirmed,
          guardianConsent: data.user.guardianConsent,
          createdAt: new Date().toISOString(),
        };
        window.localStorage.setItem(CREDENTIAL_USER_KEY, JSON.stringify(loggedUser));
        setAppUser(loggedUser);

        if (data.customToken) {
          await signInWithCustomToken(auth, data.customToken).catch(() => {});
        }

        const serverWs = await hydrateUserWorkspace(loggedUser.uid, data.sessionToken);
        let effectiveProfile: StudentProfile | null = serverWs?.studentProfile || null;
        if (!effectiveProfile && auth.currentUser) {
          effectiveProfile = await fetchStudentProfile(loggedUser.uid).catch(() => null);
        }
        if (!effectiveProfile) {
          try {
            const cached = window.localStorage.getItem(`ais_profile_${loggedUser.uid}`);
            if (cached) effectiveProfile = JSON.parse(cached);
          } catch {
            // Ignore
          }
        }

        if (effectiveProfile) {
          setStudentProfile(effectiveProfile);
          window.localStorage.setItem(`ais_profile_${loggedUser.uid}`, JSON.stringify(effectiveProfile));
          setCurrentPage(effectiveProfile.onboardingCompleted ? 'dashboard' : 'onboarding');
        } else {
          setCurrentPage('onboarding');
        }
        showToast('Welcome back to AI STUDENTS.', 'success');
        return;
      }

      if (isCapacitorNative() && isEmailIdentifier) {
        try {
          await signInWithEmailAndPassword(auth, trimmedIdentifier, password);
          showToast('Welcome back to AI STUDENTS.', 'success');
          return;
        } catch (fbErr: any) {
          throw mapFirebaseEmailAuthError(fbErr);
        }
      }

      if (isCapacitorNative() && !isEmailIdentifier) {
        throw new Error(
          'Backend API is unreachable for mobile/password sign-in. Please use the Mobile OTP tab or Email & Password.'
        );
      }

      throw new Error(data?.error || 'Sign in failed.');
    },
    [hydrateUserWorkspace, showToast]
  );

  const logout = useCallback(async () => {
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
    window.localStorage.removeItem(CREDENTIAL_USER_KEY);
    setSessionToken(null);
    setAppUser(null);
    setStudentProfile(null);
    setTestResults([]);
    setStudyPlans([]);
    setStudyTasks([]);
    setRevisionRecords([]);
    setNotifications([]);
    setAiChatHistories({});
    setSupportTickets([]);
    phoneConfirmationRef.current = null;
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // Ignore
      }
      recaptchaVerifierRef.current = null;
    }
    if (isFirebaseAuthPluginAvailable()) {
      await FirebaseAuthentication.signOut().catch(() => {});
    }
    if (auth.currentUser) {
      await signOut(auth);
    }
    setCurrentPage('welcome');
    showToast('Signed out safely.', 'info');
  }, [showToast]);

  const deleteMyAccount = useCallback(async () => {
    if (!appUser) return;
    const headers = await getApiHeaders();
    await deleteServerWorkspace(headers);
    if (auth.currentUser) {
      await deleteUserAccountData(appUser.uid);
    }
    window.localStorage.removeItem(`ais_profile_${appUser.uid}`);
    window.localStorage.removeItem(`ais_chats_${appUser.uid}`);
    await logout();
    showToast('Your student profile and account data have been removed.', 'info');
  }, [appUser, getApiHeaders, logout, showToast]);

  const uploadImage = useCallback(
    async (payload: {
      dataUrl: string;
      category: ImageCategory;
      visibility?: 'private' | 'curriculum';
      altText?: string;
      caption?: string;
      targetId?: string;
    }): Promise<{ image: UploadedImageRecord; url: string }> => {
      const headers = await getApiHeaders();
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Image upload failed.');
      }
      if (auth.currentUser && data.image) {
        await saveUploadedImageDoc(data.image).catch(() => {});
      }
      return data as { image: UploadedImageRecord; url: string };
    },
    [getApiHeaders]
  );

  const deleteImage = useCallback(
    async (imageId: string) => {
      const headers = await getApiHeaders();
      const res = await fetch(`/api/images/${encodeURIComponent(imageId)}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not remove image.');
      }
      if (auth.currentUser) {
        await deleteUploadedImageDoc(imageId).catch(() => {});
      }
    },
    [getApiHeaders]
  );

  const updateUserProfilePhoto = useCallback(
    async (photoUrl: string) => {
      if (!appUser) return;
      const headers = await getApiHeaders();
      const res = await fetch('/api/profile/photo', {
        method: 'POST',
        headers,
        body: JSON.stringify({ photoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not update profile photo.');
      }
      const updatedUser: AppUser = {
        ...appUser,
        photoUrl: data.photoUrl || '',
        updatedAt: new Date().toISOString(),
      };
      setAppUser(updatedUser);
      if (window.localStorage.getItem(SESSION_TOKEN_KEY)) {
        window.localStorage.setItem(CREDENTIAL_USER_KEY, JSON.stringify(updatedUser));
      }
      if (auth.currentUser) {
        await saveUserRecord(updatedUser).catch(() => {});
      }
      showToast(photoUrl ? 'Profile photo updated.' : 'Profile photo removed.', 'success');
    },
    [appUser, getApiHeaders, showToast]
  );

  const syncWorkspacePatch = useCallback(
    async (patch: Record<string, unknown>) => {
      const headers = await getApiHeaders();
      if (headers['Authorization']) {
        await saveServerWorkspace(headers, patch);
      }
    },
    [getApiHeaders]
  );

  const saveStudentOnboarding = useCallback(
    async (profile: StudentProfile, silent = false) => {
      const stamped = { ...profile, updatedAt: new Date().toISOString() };
      setStudentProfile(stamped);
      window.localStorage.setItem(`ais_profile_${stamped.userId}`, JSON.stringify(stamped));
      if (auth.currentUser) {
        await saveStudentProfile(stamped).catch(() => {});
      }
      await syncWorkspacePatch({ studentProfile: stamped });
      if (!silent) {
        showToast('Study profile saved.', 'success');
      }
    },
    [showToast, syncWorkspacePatch]
  );

  const toggleChapterCompleted = useCallback(
    async (chapterId: string) => {
      if (!studentProfile) return;
      const exists = studentProfile.completedChapterIds.includes(chapterId);
      const updatedIds = exists
        ? studentProfile.completedChapterIds.filter((id) => id !== chapterId)
        : [...studentProfile.completedChapterIds, chapterId];
      const updated: StudentProfile = {
        ...studentProfile,
        completedChapterIds: updatedIds,
        studyStreakDays: exists ? studentProfile.studyStreakDays : Math.max(1, studentProfile.studyStreakDays || 1),
        updatedAt: new Date().toISOString(),
      };
      await saveStudentOnboarding(updated);
    },
    [saveStudentOnboarding, studentProfile]
  );

  const updateLastStudiedChapter = useCallback(
    async (subjectId: string, chapterId: string) => {
      if (!studentProfile || !subjectId || !chapterId) return;
      if (studentProfile.lastStudiedChapterBySubject?.[subjectId] === chapterId) return;
      const updated: StudentProfile = {
        ...studentProfile,
        lastStudiedChapterBySubject: {
          ...(studentProfile.lastStudiedChapterBySubject || {}),
          [subjectId]: chapterId,
        },
        updatedAt: new Date().toISOString(),
      };
      await saveStudentOnboarding(updated, true);
    },
    [saveStudentOnboarding, studentProfile]
  );

  const addStudyMinutes = useCallback(
    async (minutes: number) => {
      if (!studentProfile || minutes <= 0) return;
      const updated: StudentProfile = {
        ...studentProfile,
        studyMinutesLogged: (studentProfile.studyMinutesLogged || 0) + Math.round(minutes),
        studyStreakDays: Math.max(1, studentProfile.studyStreakDays || 1),
        updatedAt: new Date().toISOString(),
      };
      await saveStudentOnboarding(updated, true);
    },
    [saveStudentOnboarding, studentProfile]
  );

  const saveAiChatHistory = useCallback(
    async (subjectId: string, msgs: AiChatMessage[]) => {
      const trimmed = msgs.slice(-30);
      setAiChatHistories((prev) => {
        const next = { ...prev, [subjectId]: trimmed };
        if (appUser?.uid) {
          try {
            window.localStorage.setItem(`ais_chats_${appUser.uid}`, JSON.stringify(next));
          } catch {
            // Ignore quota
          }
        }
        syncWorkspacePatch({ aiChatHistories: next });
        return next;
      });
    },
    [appUser?.uid, syncWorkspacePatch]
  );

  const saveTestResult = useCallback(
    async (result: TestResult) => {
      setTestResults((prev) => {
        const next = [result, ...prev.filter((r) => r.id !== result.id)];
        syncWorkspacePatch({ testResults: next });
        return next;
      });
      if (auth.currentUser) {
        await saveTestResultDoc(result).catch(() => {});
      }
    },
    [syncWorkspacePatch]
  );

  const createStudyPlan = useCallback(
    async (plan: StudyPlan, tasks: StudyTask[]) => {
      setStudyPlans((prev) => {
        const next = [plan, ...prev];
        syncWorkspacePatch({ studyPlans: next });
        return next;
      });
      setStudyTasks((prev) => {
        const next = [...tasks, ...prev];
        syncWorkspacePatch({ studyTasks: next });
        return next;
      });
      if (auth.currentUser) {
        await saveStudyPlanWithTasks(plan, tasks).catch(() => {});
      }
    },
    [syncWorkspacePatch]
  );

  const updateStudyTask = useCallback(
    async (task: StudyTask) => {
      setStudyTasks((prev) => {
        const next = prev.map((t) => (t.id === task.id ? task : t));
        syncWorkspacePatch({ studyTasks: next });
        return next;
      });
      if (auth.currentUser) {
        await saveStudyTaskDoc(task).catch(() => {});
      }
    },
    [syncWorkspacePatch]
  );

  const removeStudyTask = useCallback(
    async (taskId: string) => {
      setStudyTasks((prev) => {
        const next = prev.filter((t) => t.id !== taskId);
        syncWorkspacePatch({ studyTasks: next });
        return next;
      });
      if (auth.currentUser) {
        await deleteStudyTaskDoc(taskId).catch(() => {});
      }
    },
    [syncWorkspacePatch]
  );

  const updateRevisionRecord = useCallback(
    async (rec: RevisionRecord) => {
      setRevisionRecords((prev) => {
        const idx = prev.findIndex((r) => r.id === rec.id);
        let next: RevisionRecord[];
        if (idx >= 0) {
          next = [...prev];
          next[idx] = rec;
        } else {
          next = [rec, ...prev];
        }
        syncWorkspacePatch({ revisionRecords: next });
        return next;
      });
      if (auth.currentUser) {
        await saveRevisionRecordDoc(rec).catch(() => {});
      }
    },
    [syncWorkspacePatch]
  );

  const markNotificationRead = useCallback(
    async (notif: AppNotification) => {
      const updated = { ...notif, read: true };
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === notif.id ? updated : n));
        syncWorkspacePatch({ notifications: next });
        return next;
      });
      if (auth.currentUser) {
        await saveNotificationDoc(updated).catch(() => {});
      }
    },
    [syncWorkspacePatch]
  );

  const addNotification = useCallback(
    async (notif: AppNotification) => {
      setNotifications((prev) => {
        const next = [notif, ...prev];
        syncWorkspacePatch({ notifications: next });
        return next;
      });
      if (auth.currentUser) {
        await saveNotificationDoc(notif).catch(() => {});
      }
    },
    [syncWorkspacePatch]
  );

  const submitFeedback = useCallback(
    async (fb: UserFeedback) => {
      const enriched: UserFeedback = {
        ...fb,
        studentName: fb.studentName || appUser?.displayName || 'Student',
      };
      const headers = await getApiHeaders();
      if (headers['Authorization']) {
        const res = await fetch('/api/support/feedback', {
          method: 'POST',
          headers,
          body: JSON.stringify(enriched),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.feedback) {
            setFeedbackList((prev) => [data.feedback, ...prev.filter((x) => x.id !== data.feedback.id)]);
          }
        }
      } else {
        setFeedbackList((prev) => [enriched, ...prev]);
      }
      if (auth.currentUser) {
        await submitUserFeedbackDoc(enriched).catch(() => {});
      }
      showToast('Thank you! Your feedback has been submitted for review.', 'success');
    },
    [appUser?.displayName, getApiHeaders, showToast]
  );

  const submitSupportTicket = useCallback(
    async (payload: {
      category: SupportProblemCategory;
      subject: string;
      description: string;
      screenshotDataUrl?: string;
    }) => {
      const headers = await getApiHeaders();
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          studentName: appUser?.displayName || 'Student',
          studentContact: appUser?.email || appUser?.phone || appUser?.uid || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit support ticket.');
      }
      const ticket = data.ticket as SupportTicket;
      setSupportTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
      if (auth.currentUser) {
        await saveSupportTicketDoc(ticket).catch(() => {});
      }
      showToast(`Support Ticket ${ticket.ticketNumber} created.`, 'success');
      return ticket;
    },
    [appUser?.displayName, appUser?.email, appUser?.phone, appUser?.uid, getApiHeaders, showToast]
  );

  const adminReplySupportTicket = useCallback(
    async (ticketId: string, status: SupportTicketStatus, adminReply: string) => {
      const headers = await getApiHeaders();
      const res = await fetch(`/api/support/tickets/${encodeURIComponent(ticketId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status, adminReply }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update support ticket.');
      }
      const updated = data.ticket as SupportTicket;
      setSupportTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (auth.currentUser) {
        await saveSupportTicketDoc(updated).catch(() => {});
      }
      showToast(`Ticket ${updated.ticketNumber} marked ${updated.status}.`, 'success');
      return updated;
    },
    [getApiHeaders, showToast]
  );

  const adminSaveContactInfo = useCallback(
    async (contact: SupportContactInfo) => {
      const headers = await getApiHeaders();
      const res = await fetch('/api/support/contact', {
        method: 'PUT',
        headers,
        body: JSON.stringify(contact),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save contact information.');
      }
      const saved = data.contactInfo as SupportContactInfo;
      setSupportContact(saved);
      if (auth.currentUser) {
        await saveSupportContactDoc(saved).catch(() => {});
      }
      showToast('Official support contact details updated.', 'success');
      return saved;
    },
    [getApiHeaders, showToast]
  );

  const adminSaveFaq = useCallback(
    async (faq: FaqItem) => {
      const headers = await getApiHeaders();
      const res = await fetch('/api/support/faqs', {
        method: 'PUT',
        headers,
        body: JSON.stringify(faq),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save FAQ item.');
      }
      const saved = data.faq as FaqItem;
      setSupportFaqs((prev) =>
        [saved, ...prev.filter((f) => f.id !== saved.id)].sort((a, b) => a.orderIndex - b.orderIndex)
      );
      if (auth.currentUser) {
        await saveFaqDoc(saved).catch(() => {});
      }
      showToast('FAQ updated.', 'success');
      return saved;
    },
    [getApiHeaders, showToast]
  );

  const adminDeleteFaq = useCallback(
    async (faqId: string) => {
      const headers = await getApiHeaders();
      const res = await fetch(`/api/support/faqs/${encodeURIComponent(faqId)}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete FAQ item.');
      }
      setSupportFaqs((prev) => prev.filter((f) => f.id !== faqId));
      if (auth.currentUser) {
        await deleteFaqDoc(faqId).catch(() => {});
      }
      showToast('FAQ removed.', 'info');
    },
    [getApiHeaders, showToast]
  );

  const adminUpdateFeedback = useCallback(
    async (id: string, status: 'open' | 'reviewed' | 'resolved', adminNote?: string) => {
      const headers = await getApiHeaders();
      const res = await fetch(`/api/support/feedback/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status, adminNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update feedback status.');
      }
      const updated = data.feedback as UserFeedback;
      setFeedbackList((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      showToast(`Feedback marked ${updated.status}.`, 'success');
    },
    [getApiHeaders, showToast]
  );

  const adminSaveBanner = useCallback(
    async (banner: HomeBanner): Promise<HomeBanner[]> => {
      const headers = await getApiHeaders();
      const res = await fetch('/api/admin/banners', {
        method: 'PUT',
        headers,
        body: JSON.stringify(banner),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not save banner.');
      }
      const list = (data.banners as HomeBanner[]) || [];
      setHomeBanners(list);
      if (auth.currentUser && data.banner) {
        await saveHomeBannerDoc(data.banner).catch(() => {});
      }
      showToast('Banner published and synced.', 'success');
      return list;
    },
    [getApiHeaders, showToast]
  );

  const adminSaveAllBanners = useCallback(
    async (banners: HomeBanner[]): Promise<HomeBanner[]> => {
      const headers = await getApiHeaders();
      const res = await fetch('/api/admin/banners', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ banners }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not save banner order.');
      }
      const list = (data.banners as HomeBanner[]) || [];
      setHomeBanners(list);
      if (auth.currentUser) {
        await Promise.all(list.map((b) => saveHomeBannerDoc(b).catch(() => {})));
      }
      showToast('Banner order & visibility updated.', 'success');
      return list;
    },
    [getApiHeaders, showToast]
  );

  const adminDeleteBanner = useCallback(
    async (bannerId: string): Promise<void> => {
      const headers = await getApiHeaders();
      const res = await fetch(`/api/admin/banners/${encodeURIComponent(bannerId)}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not delete banner.');
      }
      setHomeBanners((data.banners as HomeBanner[]) || []);
      if (auth.currentUser) {
        await deleteHomeBannerDoc(bannerId).catch(() => {});
      }
      showToast('Banner removed.', 'info');
    },
    [getApiHeaders, showToast]
  );

  const adminResetBanners = useCallback(async (): Promise<HomeBanner[]> => {
    const headers = await getApiHeaders();
    const res = await fetch('/api/admin/banners/reset', {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not reset banners.');
    }
    const list = (data.banners as HomeBanner[]) || [];
    setHomeBanners(list);
    if (auth.currentUser) {
      await Promise.all(list.map((b) => saveHomeBannerDoc(b).catch(() => {})));
    }
    showToast('Default promotional banners restored.', 'success');
    return list;
  }, [getApiHeaders, showToast]);

  const adminSaveBrandLogo = useCallback(
    async (logoUrl: string, logoImageId?: string): Promise<void> => {
      const headers = await getApiHeaders();
      const res = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ logoUrl, logoImageId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not update official app logo.');
      }
      const nextUrl = typeof data?.branding?.logoUrl === 'string' ? data.branding.logoUrl : '';
      setBrandLogoUrl(nextUrl && nextUrl !== '/ai-students-logo.jpg' ? nextUrl : '');
      showToast('Official AI STUDENTS logo updated across the app.', 'success');
    },
    [getApiHeaders, showToast]
  );

  const adminResetBrandLogo = useCallback(async (): Promise<void> => {
    const headers = await getApiHeaders();
    const res = await fetch('/api/admin/branding/reset', {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not reset official app logo.');
    }
    setBrandLogoUrl('');
    showToast('Official default AI STUDENTS logo restored.', 'success');
  }, [getApiHeaders, showToast]);

  const adminUpsert = useCallback(
    async <T extends { id: string }>(
      colName: string,
      item: T,
      auditAction: string,
      entityType: string
    ) => {
      if (!appUser || (appUser.role !== 'admin' && appUser.role !== 'content_manager')) {
        throw new Error('Unauthorized: Admin or Content Manager permission required.');
      }
      await upsertEntityDoc(colName, item);
      await writeAuditLog({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: appUser.uid,
        userEmail: appUser.email,
        action: auditAction,
        entityType,
        entityId: item.id,
        details: `${auditAction} on ${entityType} (${item.id})`,
        createdAt: new Date().toISOString(),
      });
      await refreshCatalog();
      await refreshAdminData();
    },
    [appUser, refreshAdminData, refreshCatalog]
  );

  const adminUpdateUser = useCallback(
    async (user: AppUser, auditAction = 'UPDATE_USER_ROLE_OR_STATUS') => {
      if (!appUser || appUser.role !== 'admin') {
        throw new Error('Unauthorized: Admin permission required.');
      }
      const cleanedUser: AppUser = {
        ...user,
        updatedAt: new Date().toISOString(),
      };
      await saveUserRecord(cleanedUser);
      await writeAuditLog({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: appUser.uid,
        userEmail: appUser.email,
        action: auditAction,
        entityType: 'AppUser',
        entityId: user.uid,
        details: `${auditAction} for ${user.email || user.uid} (role=${user.role}, status=${user.status})`,
        createdAt: new Date().toISOString(),
      });
      await refreshAdminData();
    },
    [appUser, refreshAdminData]
  );

  const adminDelete = useCallback(
    async (colName: string, id: string, entityType: string) => {
      if (!appUser || appUser.role !== 'admin') {
        throw new Error('Unauthorized: Admin permission required.');
      }
      await deleteEntityDoc(colName, id);
      await writeAuditLog({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: appUser.uid,
        userEmail: appUser.email,
        action: 'DELETE',
        entityType,
        entityId: id,
        details: `Deleted ${entityType} (${id})`,
        createdAt: new Date().toISOString(),
      });
      await refreshCatalog();
      await refreshAdminData();
    },
    [appUser, refreshAdminData, refreshCatalog]
  );

  const syncSeedCatalog = useCallback(async () => {
    if (!appUser || appUser.role !== 'admin') return;
    await syncReferenceSeedToFirestore();
    await writeAuditLog({
      id: `log_${Date.now()}`,
      userId: appUser.uid,
      userEmail: appUser.email,
      action: 'SYNC_REFERENCE_CATALOG',
      entityType: 'Curriculum',
      entityId: 'global',
      details: 'Synced reference curriculum catalog to Cloud Firestore',
      createdAt: new Date().toISOString(),
    });
    await refreshCatalog();
    await refreshAdminData();
    showToast('Reference curriculum synced to database.', 'success');
  }, [appUser, refreshAdminData, refreshCatalog, showToast]);

  return (
    <AppContext.Provider
      value={{
        booting,
        authReady,
        themeMode,
        setThemeMode,
        theme,
        toggleTheme,
        currentPage,
        navParams,
        navigate,
        firebaseUser,
        appUser,
        studentProfile,
        sessionToken,
        getApiHeaders,
        signInWithGoogle,
        sendPhoneOtp,
        verifyPhoneOtp,
        sendFirebasePasswordReset,
        registerWithCredentials,
        loginWithCredentials,
        logout,
        deleteMyAccount,
        uploadImage,
        deleteImage,
        updateUserProfilePhoto,
        saveStudentOnboarding,
        toggleChapterCompleted,
        updateLastStudiedChapter,
        addStudyMinutes,
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
        testResults,
        studyPlans,
        studyTasks,
        revisionRecords,
        notifications,
        aiChatHistories,
        saveAiChatHistory,
        saveTestResult,
        createStudyPlan,
        updateStudyTask,
        removeStudyTask,
        updateRevisionRecord,
        markNotificationRead,
        addNotification,
        submitFeedback,
        supportContact,
        supportFaqs,
        supportTickets,
        refreshSupportData,
        submitSupportTicket,
        adminReplySupportTicket,
        adminSaveContactInfo,
        adminSaveFaq,
        adminDeleteFaq,
        adminUpdateFeedback,
        brandLogoUrl,
        adminSaveBrandLogo,
        adminResetBrandLogo,
        homeBanners,
        refreshBanners,
        adminSaveBanner,
        adminSaveAllBanners,
        adminDeleteBanner,
        adminResetBanners,
        allUsers,
        auditLogs,
        feedbackList,
        aiPrompts,
        payments,
        refreshCatalog,
        refreshAdminData,
        adminUpsert,
        adminUpdateUser,
        adminDelete,
        syncSeedCatalog,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
