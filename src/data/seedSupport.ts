import { FaqItem, SupportContactInfo, SupportProblemCategory } from '../types/index.ts';

export const DEFAULT_SUPPORT_CONTACT: SupportContactInfo = {
  id: 'contact',
  ownerName: 'ABHIMANYU OFFICIAL HACKER',
  supportEmail: 'abhimanyuking2411@gmail.com',
  supportPhone: '7492996601',
  supportAvailability:
    'Official WhatsApp Channel Updates & Support Desk (Mon–Sat, 9:00 AM – 7:00 PM IST)',
  whatsappChannelUrl: 'https://whatsapp.com/channel/0029VbCn3vKATRSx4HiWBX1V',
  whatsappNumber: '',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

export const SUPPORT_PROBLEM_CATEGORIES: SupportProblemCategory[] = [
  'App not opening',
  'Login or registration problems',
  'AI Teacher not responding',
  'Voice feature not working',
  'Wrong answers',
  'Subject test not opening',
  'Results not saving',
  'Payment issues',
  'Bug Report',
  'Other technical problems',
];

export const SEED_FAQS: FaqItem[] = [
  {
    id: 'faq_all_subjects_tests',
    category: 'Tests & Syllabus',
    question: 'Do all selected subjects have dedicated tests and mock exams?',
    answer:
      'Yes. Every subject in your selected Board, Class (10, 11, or 12), and Stream has its own Chapter Tests, Topic Tests, Full Subject Tests, and Board Pattern Mock Exams. Questions are strictly filtered to the selected subject so Mathematics questions never appear inside Science, Commerce, Arts, or Language tests.',
    orderIndex: 1,
    published: true,
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'faq_pyq_vs_practice',
    category: 'Tests & Syllabus',
    question: 'How are Verified Previous Year Questions separated from AI practice questions?',
    answer:
      'Verified Board Paper questions strictly display their source document and verified exam years. Whenever official PYQs are unavailable for a chapter or custom practice test, AI-generated practice questions are created strictly from that chapter syllabus and clearly badged as "AI-Generated Practice".',
    orderIndex: 2,
    published: true,
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'faq_ai_teacher',
    category: 'AI Teacher & Voice',
    question: 'How does the 10-step AI Teacher adapt to my board and medium?',
    answer:
      'In the AI Teacher workspace, you can choose any of your enrolled subjects, any chapter, your preferred medium (English, Hindi, or Hindi + English), and your teaching mode (Guided Steps, Doubt Solving, Numerical Drill, Interactive Quiz, or Exam Framing). You can check live AI status at the top-left of the deck.',
    orderIndex: 3,
    published: true,
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'faq_voice_feature',
    category: 'AI Teacher & Voice',
    question: 'Voice input or Listen aloud is not working on my phone — how do I fix it?',
    answer:
      'Spoken voice features use your browser’s built-in Speech Recognition and Speech Synthesis engines. Make sure you grant Microphone permission when prompted, keep your device media volume up, and use Chrome, Edge, or Safari. If your embedded WebView blocks microphone access, type your doubt directly or open the app in a standard browser.',
    orderIndex: 4,
    published: true,
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'faq_login_recovery',
    category: 'Account & Login',
    question: 'How do I sign in, reset my password, or update my board and subjects?',
    answer:
      'You can sign in with Google or with your email/mobile number and password. For password recovery on email/mobile accounts, click "Forgot password?" on the Sign In screen. Once signed in, open Profile or Settings -> Update Preferences anytime to change your board, class, stream, medium, or subjects.',
    orderIndex: 5,
    published: true,
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'faq_results_saving',
    category: 'Technical Support',
    question: 'Why did my test score or study plan not appear after refreshing?',
    answer:
      'Make sure you remain signed in while completing a test and click "Submit Test" before leaving. Your workspace saves automatically to the server database. If a network drop occurs, use the Retry button or check Help & Support -> My Support Tickets to report a sync issue.',
    orderIndex: 6,
    published: true,
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'faq_payments_status',
    category: 'Payments',
    question: 'Is AI STUDENTS currently free or do I need to pay?',
    answer:
      'AI STUDENTS currently offers full Free Student Access across all supported boards, classes, subjects, tests, and study planners. Paid subscriptions remain disabled unless explicitly enabled by the platform owner with verified payment gateway integration.',
    orderIndex: 7,
    published: true,
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'faq_privacy_data',
    category: 'Privacy & Security',
    question: 'Who can see my personal contact details, test scores, and AI chats?',
    answer:
      'Your email, phone number, test scores, study plans, AI conversations, and support tickets are strictly private to your account and authorized support administrators when troubleshooting a ticket you submit. You can permanently delete your account and study data anytime from Profile -> Delete My Account Data.',
    orderIndex: 8,
    published: true,
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'faq_track_ticket',
    category: 'Help Center',
    question: 'How do I report a bug or wrong question and track the response?',
    answer:
      'Go to Help & Support -> Report a Problem, choose the problem category (such as Wrong answers, Subject test not opening, or Bug Report), attach an optional screenshot, and submit. You receive a unique Ticket ID (e.g., AIS-2026-1042) and can track live status updates (Pending, In Progress, Resolved) and admin replies right below.',
    orderIndex: 9,
    published: true,
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
];
