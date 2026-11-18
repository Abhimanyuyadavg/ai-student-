export type UserRole = 'student' | 'admin' | 'content_manager';
export type UserStatus = 'active' | 'suspended' | 'deleted';
export type CurriculumStatus = 'Verified Official' | 'Under Review' | 'Unverified' | 'Archived';
export type MediumType = 'Hindi' | 'English' | 'Hindi + English';
export type PrepLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type ImageCategory =
  | 'profile'
  | 'ai_question'
  | 'support_ticket'
  | 'curriculum_subject'
  | 'curriculum_chapter'
  | 'curriculum_material'
  | 'banner'
  | 'brand_logo';

export type BannerDestinationPage =
  | 'ai-teacher'
  | 'subjects'
  | 'tests'
  | 'progress'
  | 'study-planner'
  | 'question-bank'
  | 'pyq-bank'
  | 'library'
  | 'revision';

export interface HomeBanner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  imageUrl: string;
  imageId?: string;
  destinationPage: BannerDestinationPage;
  orderIndex: number;
  enabled: boolean;
  accentTheme?: 'blue-purple' | 'indigo-gold' | 'cobalt-subjects' | 'royal-amber' | 'violet-blue';
  updatedBy?: string;
  updatedAt: string;
}

export interface BrandBrandingConfig {
  id: 'brand';
  appName: string;
  ownerName: string;
  logoUrl: string;
  logoImageId?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface UploadedImageRecord {
  id: string;
  ownerId: string;
  category: ImageCategory;
  visibility: 'private' | 'curriculum';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  storageFile: string;
  altText?: string;
  caption?: string;
  targetId?: string;
  createdAt: string;
}

export interface ChapterIllustration {
  id: string;
  title: string;
  caption?: string;
  imageUrl: string;
  imageId?: string;
  kind: 'diagram' | 'illustration' | 'photo';
}
export type QuestionType =
  | 'MCQ'
  | 'Multiple Correct'
  | 'True/False'
  | 'Fill in the Blanks'
  | 'Match the Following'
  | 'Very Short Answer'
  | 'Short Answer'
  | 'Long Answer'
  | 'Numerical'
  | 'Diagram-Based'
  | 'Case-Based'
  | 'Practical';

export type TestCategory =
  | 'Chapter Test'
  | 'Topic Test'
  | 'Daily Practice Test'
  | 'Weekly Test'
  | 'Full Subject Test'
  | 'Previous Year Question Test'
  | 'Board Pattern Mock Exam'
  | 'Revision Test'
  | 'Chapter MCQ'
  | 'Written Test'
  | 'Mock Exam';

export type PriorityLevel = 'RED' | 'YELLOW' | 'GREEN';
export type QuestionSourceType =
  | 'Verified Board Paper'
  | 'Official Model Paper'
  | 'Teacher Curated Practice'
  | 'Predicted Practice';

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  role: UserRole;
  status: UserStatus;
  ageConfirmed?: boolean;
  guardianConsent?: boolean;
  guardianContact?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationPreferences {
  dailyTasks: boolean;
  upcomingTests: boolean;
  revisionReminders: boolean;
  announcements: boolean;
}

export interface StudentProfile {
  userId: string;
  classId: string;
  boardId: string;
  academicSessionId: string;
  streamId: string;
  medium: MediumType;
  selectedSubjectIds: string[];
  weakSubjectIds: string[];
  examGoal: string;
  preparationLevel: PrepLevel;
  dailyStudyHours: number;
  completedChapterIds: string[];
  studyStreakDays: number;
  lastStudiedChapterBySubject?: Record<string, string>;
  studyMinutesLogged?: number;
  onboardingCompleted: boolean;
  notificationPrefs?: NotificationPreferences;
  updatedAt?: string;
}

export interface Board {
  id: string;
  name: string;
  boardCode: string;
  country: string;
  description: string;
  examPatternSummary: string;
  officialSourceUrl?: string;
  status: CurriculumStatus;
}

export interface AcademicSession {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Upcoming' | 'Archived';
}

export interface ClassLevel {
  id: string;
  className: string;
  classLevel: number;
}

export interface Stream {
  id: string;
  name: string;
  description?: string;
}

export interface Subject {
  id: string;
  boardId: string;
  academicSessionId: string;
  classId: string;
  streamId: string;
  subjectName: string;
  subjectCode: string;
  prescribedTextbook?: string;
  theoryMarks: number;
  practicalMarks: number;
  examDurationMinutes: number;
  status: CurriculumStatus;
  coverImageUrl?: string;
  coverImageId?: string;
}

export interface DefinitionItem {
  term: string;
  meaning: string;
}

export interface FormulaItem {
  name: string;
  expression: string;
  usage: string;
}

export interface WorkedExample {
  problem: string;
  solution: string;
}

export interface DiagramItem {
  title: string;
  description: string;
  svgType?: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  unitName: string;
  chapterNumber: number;
  chapterName: string;
  introduction: string;
  completeExplanation: string;
  learningObjectives: string[];
  definitions: DefinitionItem[];
  importantFacts: string[];
  formulas: FormulaItem[];
  examples: WorkedExample[];
  diagrams: DiagramItem[];
  illustrations?: ChapterIllustration[];
  revisionNotes: string;
  syllabusStatus: CurriculumStatus;
  sourceReference: string;
  published: boolean;
}

export interface Topic {
  id: string;
  chapterId: string;
  orderIndex: number;
  topicName: string;
  content: string;
  difficulty: 'Foundation' | 'Standard' | 'HOTS';
}

export type MaterialType =
  | 'Textbook Notes'
  | 'Chapter Summary'
  | 'Formula Sheet'
  | 'Important Questions'
  | 'Model Paper'
  | 'Previous Year Paper'
  | 'Practice Worksheet'
  | 'Diagram'
  | 'Revision PDF'
  | 'Official Syllabus';

export interface LearningMaterial {
  id: string;
  chapterId?: string;
  subjectId: string;
  boardId: string;
  classId: string;
  materialType: MaterialType;
  title: string;
  content: string;
  fileUrl?: string;
  imageUrl?: string;
  imageId?: string;
  sourceCitation?: string;
  verificationStatus: CurriculumStatus;
  published: boolean;
  createdBy: string;
  createdAt: string;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface Question {
  id: string;
  boardId: string;
  classId: string;
  academicSessionId?: string;
  subjectId: string;
  chapterId: string;
  topicName: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer?: string;
  correctAnswers?: string[];
  matchPairs?: MatchPair[];
  diagramSvg?: string;
  aiGenerated?: boolean;
  explanation: string;
  modelAnswer?: string;
  rubricPoints?: string[];
  marks: number;
  priority: PriorityLevel;
  isPyq: boolean;
  verifiedYears?: string[];
  verifiedAppearances?: number;
  sourceType: QuestionSourceType;
  sourceDocumentRef?: string;
  verificationStatus: CurriculumStatus;
  published: boolean;
}

export interface CustomTestConfig {
  id: string;
  title: string;
  boardId: string;
  classId: string;
  subjectId: string;
  chapterId?: string;
  testCategory: TestCategory;
  durationMinutes: number;
  questionCount?: number;
  includeWritten?: boolean;
  description?: string;
  totalMarks?: number;
  questionIds?: string[];
  published: boolean;
  createdAt: string;
}

export interface TestSession {
  id: string;
  studentId: string;
  subjectId: string;
  chapterId?: string;
  testType: TestCategory;
  title: string;
  totalMarks: number;
  durationMinutes: number;
  status: 'in_progress' | 'completed';
  questionIds: string[];
  draftAnswers?: Record<string, string>;
  createdAt: string;
}

export interface EvaluatedAnswerItem {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  studentAnswer: string;
  correctOrModelAnswer: string;
  isCorrect?: boolean;
  awardedMarks: number;
  maxMarks: number;
  feedback: string;
  mistakes?: string[];
  missingKeyPoints?: string[];
  topicName: string;
  aiGenerated?: boolean;
}

export interface TestResult {
  id: string;
  testId: string;
  studentId: string;
  subjectId: string;
  chapterId?: string;
  testType: TestCategory;
  title: string;
  score: number;
  totalMarks: number;
  accuracy: number;
  answers: EvaluatedAnswerItem[];
  weakTopics: string[];
  timeSpentMinutes: number;
  completedAt: string;
}

export interface StudyPlan {
  id: string;
  studentId: string;
  planType: '30-Day' | '60-Day' | '90-Day' | 'Custom';
  startDate: string;
  endDate: string;
  examDate: string;
  dailyHours: number;
  schoolSchedule: string;
  coachingSchedule: string;
  targetMarks: string;
  createdAt: string;
}

export interface StudyTask {
  id: string;
  studyPlanId: string;
  studentId: string;
  title: string;
  subjectName: string;
  taskType: 'Chapter Study' | 'Revision' | 'Chapter Test' | 'Model Paper' | 'Final Revision';
  scheduledDate: string;
  timeSlot: string;
  durationMinutes: number;
  status: 'pending' | 'completed' | 'overdue';
}

export interface RevisionRecord {
  id: string;
  studentId: string;
  chapterId: string;
  subjectId: string;
  chapterName: string;
  stage: 1 | 2 | 3 | 4 | 5;
  nextReviewDate: string;
  lastPerformance: string;
  incorrectQuestionIds: string[];
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetBoardId?: string;
  priority: 'normal' | 'important';
  published: boolean;
  publishedAt: string;
  createdBy: string;
}

export interface AppNotification {
  id: string;
  studentId: string;
  title: string;
  message: string;
  category: 'task' | 'test' | 'revision' | 'announcement';
  read: boolean;
  createdAt: string;
}

export interface UserFeedback {
  id: string;
  studentId: string;
  studentName?: string;
  category: 'Syllabus Issue' | 'Question Correction' | 'App Feedback' | 'Bug Report' | 'Feature Suggestion';
  subject: string;
  message: string;
  status: 'open' | 'reviewed' | 'resolved';
  adminNote?: string;
  createdAt: string;
}

export type SupportProblemCategory =
  | 'App not opening'
  | 'Login or registration problems'
  | 'AI Teacher not responding'
  | 'Voice feature not working'
  | 'Wrong answers'
  | 'Subject test not opening'
  | 'Results not saving'
  | 'Payment issues'
  | 'Bug Report'
  | 'Other technical problems';

export type SupportTicketStatus = 'Pending' | 'In Progress' | 'Resolved';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  studentId: string;
  studentName: string;
  studentContact: string;
  category: SupportProblemCategory;
  subject: string;
  description: string;
  screenshotDataUrl?: string;
  status: SupportTicketStatus;
  adminReply?: string;
  repliedBy?: string;
  repliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type FaqCategory =
  | 'Help Center'
  | 'Account & Login'
  | 'AI Teacher & Voice'
  | 'Tests & Syllabus'
  | 'Technical Support'
  | 'Payments'
  | 'Privacy & Security';

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  orderIndex: number;
  published: boolean;
  updatedAt: string;
}

export interface SupportContactInfo {
  id: 'contact';
  ownerName: string;
  supportEmail: string;
  supportPhone: string;
  supportAvailability: string;
  whatsappChannelUrl: string;
  whatsappNumber?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface AiPromptConfig {
  id: string;
  name: string;
  subjectScope: string;
  systemPrompt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  planName: string;
  amount: number;
  currency: string;
  paymentProvider: string;
  providerTransactionId: string;
  paymentStatus: 'pending' | 'verified' | 'failed' | 'refunded';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface SystemSetting {
  id: string;
  paymentsEnabled: boolean;
  guardianAgeThreshold: number;
  aiModel: string;
  updatedAt: string;
}

export type AppPage =
  | 'welcome'
  | 'auth'
  | 'forgot-password'
  | 'onboarding'
  | 'dashboard'
  | 'ai-teacher'
  | 'subjects'
  | 'subject-detail'
  | 'chapter-learning'
  | 'tests'
  | 'mcq-test'
  | 'written-test'
  | 'mock-exam'
  | 'test-results'
  | 'question-bank'
  | 'pyq-bank'
  | 'revision'
  | 'study-planner'
  | 'progress'
  | 'library'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'help-support'
  | 'privacy-policy'
  | 'terms'
  | 'admin'
  | 'admin-curriculum'
  | 'admin-questions'
  | 'admin-verification'
  | 'admin-banners'
  | 'admin-pdf-library'
  | 'admin-payments'
  | 'admin-support';

export interface AiImageAttachment {
  id: string;
  url: string;
  mimeType: string;
  name?: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  stepLabel?: string;
  timestamp: string;
  attachments?: AiImageAttachment[];
}

export type PdfAvailability = 'available' | 'coming_soon';
export type PdfMedium = 'bilingual' | 'hindi' | 'english';
export type PdfClassId = 'class_10' | 'class_11' | 'class_12';
export type PdfStreamId = 'na' | 'science' | 'commerce' | 'arts';

export interface PdfStudyLangSection {
  overview: string;
  definitions: { term: string; meaning: string }[];
  formulas: { name: string; expression: string; usage: string }[];
  examNotes: string[];
  importantQA: { question: string; answer: string; marks: number }[];
  mcqs: { question: string; options: string[]; answerIndex: number; explanation: string }[];
}

export interface PdfChapterContent {
  en: PdfStudyLangSection;
  hi: PdfStudyLangSection;
}

export interface PdfNoteItem {
  id: string;
  classId: PdfClassId;
  streamId: PdfStreamId;
  boardId: string;
  subjectKey: string;
  subjectNameEn: string;
  subjectNameHi: string;
  chapterNumber: number;
  chapterTitleEn: string;
  chapterTitleHi: string;
  chapterIdRef?: string;
  subjectIdRef?: string;
  availability: PdfAvailability;
  isFree: boolean;
  priceInr: number;
  allowDownload: boolean;
  allowPrint: boolean;
  mediumSupport: PdfMedium;
  sourceType: 'generated' | 'uploaded';
  storageFile?: string;
  fileSizeBytes?: number;
  pageCount?: number;
  published: boolean;
  content?: PdfChapterContent;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type PdfPaymentMethod =
  | 'upi_qr'
  | 'upi_id'
  | 'upi_phone'
  | 'razorpay_card'
  | 'razorpay_netbanking'
  | 'razorpay_upi';

export type PdfPaymentStatus =
  | 'pending'
  | 'awaiting_verification'
  | 'verified'
  | 'failed';

export interface PdfTaxConfig {
  taxEnabled: boolean;
  gstRatePercent: number; // e.g., 0, 5, 12, 18 (real statutory GST %)
  taxMode: 'inclusive' | 'exclusive';
  sellerLegalName: string;
  sellerGstin: string;
  sellerState: string;
  sacHsnCode: string; // e.g., 4901 / 998431 Digital Educational Notes
  upiId: string;
  supportPhone: string;
  upiQrImageUrl: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface PdfPaymentOrder {
  id: string;
  orderNumber: string;
  invoiceNumber?: string;
  studentId: string;
  studentName: string;
  studentContact: string;
  pdfId: string;
  pdfTitle: string;
  classId: PdfClassId;
  subjectName: string;
  baseAmount: number;
  taxRatePercent: number;
  cgstAmount: number;
  sgstAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxMode: 'inclusive' | 'exclusive';
  currency: 'INR';
  paymentMethod: PdfPaymentMethod;
  paymentProvider: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  utrNumber?: string;
  payerName?: string;
  guardianConfirmed?: boolean;
  paymentStatus: PdfPaymentStatus;
  failureReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type PdfUnlockSource = 'payment' | 'promo_code' | 'admin_grant';

export interface PdfEntitlement {
  id: string;
  studentId: string;
  studentName?: string;
  studentContact?: string;
  pdfId: string;
  pdfTitle?: string;
  classId?: PdfClassId;
  subjectName?: string;
  unlockSource?: PdfUnlockSource;
  orderId: string;
  invoiceNumber: string;
  amountPaid: number;
  unlockedAt: string;
}

export interface PdfPromoUnlockRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentContact: string;
  pdfId: string;
  pdfTitle: string;
  classId: PdfClassId;
  subjectName: string;
  unlockType: 'free_access_code';
  codeMask: string;
  unlockedAt: string;
}

export interface PaymentGatewayPublicConfig {
  guardianMerchantName: string;
  upiId: string;
  supportPhone: string;
  upiQrImageUrl: string;
  razorpayConfigured: boolean;
  razorpayKeyId?: string;
  promoCodeEnabled: boolean;
  taxConfig: PdfTaxConfig;
}


