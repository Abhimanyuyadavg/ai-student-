import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Bot,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  LifeBuoy,
  Lock,
  Mail,
  MessageCircle,
  Mic,
  Phone,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { UploadPickerControls, ZoomableAuthThumbnail } from '../components/ImageTools.tsx';
import { validateAndCompressImageFile } from '../lib/imageUtils.ts';
import { SUPPORT_PROBLEM_CATEGORIES } from '../data/seedSupport.ts';
import { FaqCategory, SupportProblemCategory, SupportTicketStatus } from '../types/index.ts';

type SupportTab = 'overview' | 'contact' | 'report' | 'tickets' | 'feedback';

export const HelpSupportPage: React.FC = () => {
  const {
    appUser,
    navigate,
    systemSettings,
    supportContact,
    supportFaqs,
    supportTickets,
    refreshSupportData,
    submitSupportTicket,
    submitFeedback,
    uploadImage,
    deleteImage,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SupportTab>('overview');
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategory, setFaqCategory] = useState<'ALL' | FaqCategory>('ALL');
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string>('help-center');

  // Report a Problem / Bug state
  const [problemCategory, setProblemCategory] = useState<SupportProblemCategory>('Subject test not opening');
  const [problemSubject, setProblemSubject] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string>('');
  const [screenshotImageId, setScreenshotImageId] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [screenshotError, setScreenshotError] = useState('');
  const [pendingRetryFile, setPendingRetryFile] = useState<File | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [lastCreatedTicketNum, setLastCreatedTicketNum] = useState<string | null>(null);
  const [refreshingTickets, setRefreshingTickets] = useState(false);

  // Feedback & Suggestions state
  const [fbCategory, setFbCategory] = useState<
    'App Feedback' | 'Feature Suggestion' | 'Syllabus Issue' | 'Question Correction' | 'Bug Report'
  >('App Feedback');
  const [fbSubject, setFbSubject] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    refreshSupportData().catch(() => {});
  }, [refreshSupportData]);

  const cleanEmail = (supportContact.supportEmail || '').replace(/\s+/g, '').trim();
  const cleanPhone = (supportContact.supportPhone || '').replace(/[^\d+]/g, '').trim();
  const cleanWaNum = (supportContact.whatsappNumber || '').replace(/[^\d]/g, '').trim();
  const cleanChannelUrl = (supportContact.whatsappChannelUrl || '').trim();
  const cleanAvailability = (supportContact.supportAvailability || '').trim();

  const hasAnyContact = Boolean(
    cleanEmail || cleanPhone || cleanWaNum || cleanChannelUrl || cleanAvailability
  );

  const telHref = cleanPhone
    ? `tel:${cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`}`
    : '';
  const mailHref = cleanEmail
    ? `mailto:${cleanEmail}?subject=${encodeURIComponent('AI STUDENTS Support Request')}`
    : '';
  const waDirectHref = cleanWaNum ? `https://wa.me/${cleanWaNum}` : '';

  const topicCards = useMemo(() => {
    const base = [
      {
        id: 'help-center',
        title: 'Help Center',
        icon: HelpCircle,
        summary: 'Step-by-step guidance for boards, subjects, chapters, and tests.',
        detail:
          'Select your Board, Class (10, 11, or 12), Stream, Medium, and Subjects in Preferences. Every selected subject unlocks its own Chapter Learning modules, AI Personal Teacher workspace, Question Bank, and multi-format Test Center.',
      },
      {
        id: 'account-login',
        title: 'Account & Login Help',
        icon: UserCheck,
        summary: 'Sign in with Google or email/mobile and password recovery.',
        detail:
          'You can register with Google or with your email/mobile number (minimum 8-character password and guardian consent for students under 18). If you forget your email/mobile password, use Forgot Password on Sign In. Google accounts recover via Google Account Recovery.',
      },
      {
        id: 'ai-teacher',
        title: 'AI Teacher & Voice Help',
        icon: Bot,
        summary: '10-step guided teaching, microphone permissions, and Listen aloud.',
        detail:
          'Choose any enrolled subject and chapter on the AI Teacher page, check the live "AI Online" indicator at top-left, and use the 10-step pedagogy workflow or ask custom doubts. For microphone voice input or spoken answers, allow browser Microphone permission and keep device media volume turned up.',
      },
      {
        id: 'technical-support',
        title: 'Technical Support',
        icon: Bug,
        summary: 'Test loading, saved scores, offline hiccups, and bug reporting.',
        detail:
          'Always click "Submit Test" before closing an exam to record your score, accuracy, and weak topics. If any subject test fails to open or scores do not save, click Refresh or submit a Support Ticket below with a screenshot.',
      },
      {
        id: 'privacy-security',
        title: 'Privacy & Security Help',
        icon: ShieldCheck,
        summary: 'Student data protection, guardian safety, and account deletion.',
        detail:
          'Your personal email, phone number, test scores, AI chats, and support tickets remain strictly private to you and authorized administrators. You can review our Privacy Policy and delete your account anytime from Profile.',
      },
    ];

    if (systemSettings.paymentsEnabled) {
      base.splice(4, 0, {
        id: 'payment-help',
        title: 'Payment Help',
        icon: CreditCard,
        summary: 'Subscription status, receipts, and verified payment troubleshooting.',
        detail:
          'Payments are only processed through verified server-side gateways. If a deduction occurs without activation, submit a "Payment issues" support ticket with your transaction reference ID.',
      });
    } else {
      base.splice(4, 0, {
        id: 'payment-help',
        title: 'Payment & Plan Info',
        icon: CreditCard,
        summary: 'AI STUDENTS currently provides Free Student Access.',
        detail:
          'Paid subscriptions are currently disabled by the platform owner — you do not need to pay for any subject, chapter, AI Teacher session, or mock exam. Never send money to unverified links.',
      });
    }
    return base;
  }, [systemSettings.paymentsEnabled]);

  const activeTopic = topicCards.find((t) => t.id === activeTopicId) || topicCards[0];

  const faqCategories: ('ALL' | FaqCategory)[] = [
    'ALL',
    'Help Center',
    'Account & Login',
    'AI Teacher & Voice',
    'Tests & Syllabus',
    'Technical Support',
    'Payments',
    'Privacy & Security',
  ];

  const filteredFaqs = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    return supportFaqs
      .filter((f) => f.published)
      .filter((f) => faqCategory === 'ALL' || f.category === faqCategory)
      .filter(
        (f) =>
          !q ||
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      );
  }, [supportFaqs, faqCategory, faqSearch]);

  const processScreenshotUpload = async (file: File) => {
    setScreenshotError('');
    setPendingRetryFile(file);
    setUploadingScreenshot(true);
    try {
      const prepared = await validateAndCompressImageFile(file, {
        maxDimension: 1400,
        maxBytes: 750 * 1024,
      });
      if (appUser) {
        const record = await uploadImage({
          dataUrl: prepared.dataUrl,
          category: 'support_ticket',
          visibility: 'private',
          altText: 'Support ticket problem screenshot',
        });
        if (screenshotImageId && screenshotImageId !== record.image.id) {
          deleteImage(screenshotImageId).catch(() => {});
        }
        setScreenshotDataUrl(record.url);
        setScreenshotImageId(record.image.id);
      } else {
        setScreenshotDataUrl(prepared.dataUrl);
        setScreenshotImageId('');
      }
      setScreenshotName(prepared.fileName);
      setPendingRetryFile(null);
      showToast('Screenshot attached.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Could not upload screenshot.';
      setScreenshotError(msg);
      showToast(msg, 'error');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleRemoveScreenshot = async () => {
    const oldId = screenshotImageId;
    setScreenshotDataUrl('');
    setScreenshotImageId('');
    setScreenshotName('');
    setScreenshotError('');
    setPendingRetryFile(null);
    if (oldId) {
      await deleteImage(oldId).catch(() => {});
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingTicket || uploadingScreenshot) return;
    setTicketError('');

    if (!appUser) {
      setTicketError('Please sign in to submit and track a support ticket.');
      return;
    }
    if (problemSubject.trim().length < 3) {
      setTicketError('Please enter a short summary subject (at least 3 characters).');
      return;
    }
    if (problemDescription.trim().length < 10) {
      setTicketError('Please describe the problem in at least 10 characters.');
      return;
    }

    setSubmittingTicket(true);
    try {
      const created = await submitSupportTicket({
        category: problemCategory,
        subject: problemSubject.trim(),
        description: problemDescription.trim(),
        screenshotDataUrl: screenshotDataUrl || undefined,
      });
      setLastCreatedTicketNum(created.ticketNumber);
      setProblemSubject('');
      setProblemDescription('');
      setScreenshotDataUrl('');
      setScreenshotImageId('');
      setScreenshotName('');
      setScreenshotError('');
      setPendingRetryFile(null);
      setActiveTab('tickets');
    } catch (err: any) {
      setTicketError(err?.message || 'Unable to submit support ticket. Please try again.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingFeedback) return;
    if (!appUser) {
      showToast('Please sign in first to send feedback.', 'info');
      navigate('auth', { authMode: 'login' });
      return;
    }
    if (!fbSubject.trim() || !fbMessage.trim()) return;
    setSubmittingFeedback(true);
    try {
      await submitFeedback({
        id: `fb_${Date.now()}`,
        studentId: appUser.uid,
        studentName: appUser.displayName,
        category: fbCategory,
        subject: fbSubject.trim(),
        message: fbMessage.trim(),
        status: 'open',
        createdAt: new Date().toISOString(),
      });
      setFbSubject('');
      setFbMessage('');
    } catch (err: any) {
      showToast(err?.message || 'Could not submit feedback. Please retry.', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleRefreshTickets = async () => {
    setRefreshingTickets(true);
    try {
      await refreshSupportData();
      showToast('Support tickets refreshed.', 'info');
    } finally {
      setRefreshingTickets(false);
    }
  };

  const statusClasses = (status: SupportTicketStatus) => {
    if (status === 'Resolved') {
      return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (status === 'In Progress') {
      return 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2 px-1 sm:px-0">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
            <LifeBuoy className="w-4 h-4" />
            <span>AI STUDENTS Help &amp; Support Center</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            How can we help you today?
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Official support, FAQs, bug &amp; problem reporting, live ticket tracking, and direct contact details for{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {supportContact.ownerName || 'ABHIMANYU OFFICIAL HACKER'}
            </span>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('privacy-policy')}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => navigate('terms')}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
          >
            Terms &amp; Conditions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Report a Problem</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['overview', 'Help Center & FAQ', HelpCircle],
            ['contact', 'Contact Us', Phone],
            ['report', 'Report a Problem / Bug', Bug],
            ['tickets', `My Support Tickets (${supportTickets.length})`, Clock],
            ['feedback', 'Feedback & Suggestions', Sparkles],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              activeTab === id
                ? 'border-indigo-700 bg-indigo-700 text-white'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: HELP CENTER & FAQ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Help Topics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topicCards.map((topic) => {
              const Icon = topic.icon;
              const selected = activeTopic.id === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setActiveTopicId(topic.id)}
                  className={`text-left p-5 rounded-xl border transition-colors cursor-pointer space-y-2 ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-5 h-5 text-indigo-700 dark:text-indigo-400 shrink-0" />
                    <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      {topic.title}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {topic.summary}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Topic Guide Detail */}
          <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                Guide: {activeTopic.title}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {activeTopic.detail}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (activeTopic.id === 'ai-teacher') {
                  setProblemCategory('AI Teacher not responding');
                } else if (activeTopic.id === 'account-login') {
                  setProblemCategory('Login or registration problems');
                } else if (activeTopic.id === 'payment-help') {
                  setProblemCategory('Payment issues');
                } else {
                  setProblemCategory('Other technical problems');
                }
                setActiveTab('report');
              }}
              className="px-4 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              Still need help? Report Issue
            </button>
          </div>

          {/* Frequently Asked Questions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Frequently Asked Questions (FAQ)
                </h2>
                <p className="text-xs text-slate-500">
                  Quick answers on tests, AI Teacher, voice help, login, and student privacy.
                </p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Search FAQs..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {faqCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFaqCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                    faqCategory === cat
                      ? 'bg-indigo-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat === 'ALL' ? 'All Topics' : cat}
                </button>
              ))}
            </div>

            {filteredFaqs.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No FAQs matched your search. Try clearing the search filter or ask our support desk.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredFaqs.map((faq) => {
                  const isOpen = openFaqId === faq.id;
                  return (
                    <div key={faq.id} className="py-3">
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                        className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
                      >
                        <div>
                          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 block">
                            {faq.category}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {faq.question}
                          </span>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pr-6">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OFFICIAL CONTACT DETAILS */}
      {activeTab === 'contact' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Official Contact Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified owner and official student support channels for AI STUDENTS.
                </p>
              </div>
              <BrandLogo compact showSubline={false} />
            </div>

            {!hasAnyContact ? (
              <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm font-medium text-amber-900 dark:text-amber-200">
                Support contact is being updated
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500">App Owner</p>
                  <p className="font-display font-bold text-slate-900 dark:text-white mt-0.5">
                    {supportContact.ownerName || 'ABHIMANYU OFFICIAL HACKER'}
                  </p>
                </div>

                {cleanEmail && (
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Official Support Gmail</p>
                      <p className="font-mono text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                        {cleanEmail}
                      </p>
                    </div>
                    <a
                      href={mailHref}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shrink-0"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Us</span>
                    </a>
                  </div>
                )}

                {cleanPhone && (
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Official Contact Number</p>
                      <p className="font-mono text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                        {cleanPhone}
                      </p>
                    </div>
                    <a
                      href={telHref}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Support</span>
                    </a>
                  </div>
                )}

                {(cleanAvailability || cleanChannelUrl) && (
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    {cleanAvailability && (
                      <div>
                        <p className="text-xs text-slate-500">Support Availability</p>
                        <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                          {cleanAvailability}
                        </p>
                      </div>
                    )}
                    {cleanChannelUrl && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-xs text-slate-500 truncate max-w-xs sm:max-w-sm">
                          {cleanChannelUrl}
                        </span>
                        <a
                          href={cleanChannelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg shrink-0"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Official WhatsApp Channel</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {waDirectHref && (
                  <div className="p-3.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                        Direct WhatsApp Support Desk
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                        +{cleanWaNum}
                      </p>
                    </div>
                    <a
                      href={waDirectHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Support</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Quick Self-Service Support
            </h3>
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2.5">
                <Bot className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">AI Teacher Not Responding?</p>
                  <p className="mt-0.5">
                    Click the refresh icon next to "AI Online" on the AI Teacher page, verify you are signed in, or click Retry on any error notice.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2.5">
                <Mic className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Voice Input / Spoken Output</p>
                  <p className="mt-0.5">
                    Allow microphone permission in browser site settings for voice questions.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Wrong Question or Answer?</p>
                  <p className="mt-0.5">
                    Open "Report a Problem", select "Wrong answers", and mention the Board, Class, Subject, and Question so our content team corrects it.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
            >
              Open Problem &amp; Bug Report Form
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: REPORT A PROBLEM / REPORT A BUG */}
      {activeTab === 'report' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-3xl space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Report a Problem or Bug
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit any app issue, login difficulty, AI error, voice issue, wrong answer, or missing subject test. You will get a Ticket ID to track live resolution.
            </p>
          </div>

          {!appUser && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-amber-900 dark:text-amber-200">
                Sign in to create a tracked ticket linked to your student account, or contact us directly via Email or Call Support.
              </p>
              <button
                type="button"
                onClick={() => navigate('auth', { authMode: 'login' })}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-700 rounded-lg cursor-pointer"
              >
                Sign In to Submit Ticket
              </button>
            </div>
          )}

          {ticketError && (
            <div role="alert" className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {ticketError}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Problem Category
                </label>
                <select
                  value={problemCategory}
                  onChange={(e) => setProblemCategory(e.target.value as SupportProblemCategory)}
                  className="w-full px-3 py-2 text-xs leading-normal min-h-[38px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {SUPPORT_PROBLEM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Subject / Summary
                </label>
                <input
                  type="text"
                  required
                  value={problemSubject}
                  onChange={(e) => setProblemSubject(e.target.value)}
                  placeholder="e.g., Physics Ch 2 MCQ test fails to load"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Detailed Description (include Board, Class, Subject, and steps to reproduce)
              </label>
              <textarea
                rows={4}
                required
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Describe what happened, what you expected, and any error message displayed..."
                className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Optional Screenshot Attachment (JPG, PNG, WEBP · auto-compressed securely)
              </label>
              <UploadPickerControls
                galleryLabel={screenshotName ? 'Replace Screenshot' : 'Attach Screenshot'}
                cameraLabel="Take Photo"
                uploading={uploadingScreenshot}
                errorText={screenshotError}
                onFilesSelected={(files) => {
                  const first = files[0];
                  if (first) void processScreenshotUpload(first);
                }}
                onRetry={pendingRetryFile ? () => void processScreenshotUpload(pendingRetryFile) : undefined}
              />
              {screenshotName && (
                <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span>{screenshotName}</span>
                  <button
                    type="button"
                    onClick={() => void handleRemoveScreenshot()}
                    aria-label="Remove screenshot"
                    className="inline-flex items-center gap-1 text-rose-600 hover:underline cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              )}
              {screenshotDataUrl && (
                <div className="mt-3">
                  <ZoomableAuthThumbnail
                    src={screenshotDataUrl}
                    alt="Attached problem screenshot preview"
                    className="max-h-40 rounded-lg border border-slate-200 dark:border-slate-700 object-contain"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submittingTicket || uploadingScreenshot}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingTicket ? 'Submitting Ticket...' : 'Submit Support Ticket'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: STUDENT TICKET TRACKER */}
      {activeTab === 'tickets' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                My Support Tickets
              </h2>
              <p className="text-xs text-slate-500">
                Track ticket status (Pending, In Progress, Resolved) and read administrator responses.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshTickets}
                disabled={refreshingTickets}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingTickets ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
              >
                New Ticket
              </button>
            </div>
          </div>

          {lastCreatedTicketNum && (
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Your report has been saved under Ticket ID{' '}
                <strong className="font-mono">{lastCreatedTicketNum}</strong>. You can check status updates here anytime.
              </span>
            </div>
          )}

          {!appUser ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              Sign in to view your submitted support tickets.
            </p>
          ) : supportTickets.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                You have not submitted any support tickets yet.
              </p>
              <p className="text-xs text-slate-500">
                Need help with any subject, test, AI Teacher, or login problem? Submit a ticket anytime.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {supportTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">
                        {t.ticketNumber}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {t.category}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${statusClasses(t.status)}`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-900 dark:text-white">{t.subject}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {t.description}
                  </p>

                  {t.screenshotDataUrl && (
                    <ZoomableAuthThumbnail
                      src={t.screenshotDataUrl}
                      alt={`Screenshot for ${t.ticketNumber}`}
                      className="max-h-36 rounded-lg border border-slate-200 dark:border-slate-700 object-contain"
                    />
                  )}

                  {t.adminReply && (
                    <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1">
                      <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                        Official Support Reply {t.repliedBy ? `(${t.repliedBy})` : ''}
                      </p>
                      <p className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                        {t.adminReply}
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400">
                    Submitted: {new Date(t.createdAt).toLocaleString()} · Updated:{' '}
                    {new Date(t.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FEEDBACK & SUGGESTIONS */}
      {activeTab === 'feedback' && (
        <form
          onSubmit={handleFeedbackSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-2xl space-y-4"
        >
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Feedback &amp; Feature Suggestions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Share ideas for new board chapters, study tools, or improvements with ABHIMANYU OFFICIAL HACKER and the AI STUDENTS team.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={fbCategory}
              onChange={(e) => setFbCategory(e.target.value as any)}
              className="px-3 py-2 text-xs leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="App Feedback">App Feedback</option>
              <option value="Feature Suggestion">Feature Suggestion</option>
              <option value="Syllabus Issue">Syllabus Issue</option>
              <option value="Question Correction">Question Correction</option>
              <option value="Bug Report">Bug Report</option>
            </select>
            <input
              type="text"
              required
              value={fbSubject}
              onChange={(e) => setFbSubject(e.target.value)}
              placeholder="Topic or Suggestion Title"
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>
          <textarea
            rows={4}
            required
            value={fbMessage}
            onChange={(e) => setFbMessage(e.target.value)}
            placeholder="Write your feedback or suggestion..."
            className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={submittingFeedback}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
          >
            {submittingFeedback ? 'Sending...' : 'Send Feedback'}
          </button>
        </form>
      )}
    </div>
  );
};

export const PrivacyPolicyPage: React.FC = () => {
  const { appUser, navigate, supportContact } = useApp();
  const cleanEmail = (supportContact.supportEmail || '').replace(/\s+/g, '').trim();

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 px-2 sm:px-0">
      <button
        type="button"
        onClick={() => navigate(appUser ? 'help-support' : 'welcome')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
          <Lock className="w-4 h-4" />
          <span>Student Privacy &amp; Data Protection</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Privacy Policy — AI STUDENTS
        </h1>
        <p className="text-xs text-slate-500">
          App Owner: {supportContact.ownerName || 'ABHIMANYU OFFICIAL HACKER'} · Effective Session: 2026–27
        </p>

        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              1. Minimal Data We Collect
            </h2>
            <p>
              AI STUDENTS collects only the information needed to deliver personalized board education: your display name, email or mobile sign-in identifier, selected Board, Class, Stream, Medium, subjects, completed chapters, test results, study plans, and optional support tickets you submit.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              2. Protection for School Students &amp; Minors
            </h2>
            <p>
              Accounts registered for students under 18 require age confirmation and parent/guardian consent declaration during sign-up. Personal contact details, AI Teacher chats, and test scores are never publicly listed or shared with other students.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              3. Security &amp; Access Control
            </h2>
            <p>
              Passwords are salted and scrypt-hashed on the server. Student records, test results, and support tickets are isolated per user ID and enforced by backend authentication and Cloud Firestore security rules. Only verified administrators can review support tickets to resolve reported issues.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              4. Account Deletion &amp; Contact
            </h2>
            <p>
              You may permanently delete your profile, study plans, AI chats, and tickets anytime via Profile → Delete My Account Data. For privacy queries{cleanEmail ? `, email ${cleanEmail}` : ''}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export const TermsConditionsPage: React.FC = () => {
  const { appUser, navigate, supportContact } = useApp();

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 px-2 sm:px-0">
      <button
        type="button"
        onClick={() => navigate(appUser ? 'help-support' : 'welcome')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
          <FileText className="w-4 h-4" />
          <span>Platform Usage &amp; Academic Integrity</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Terms &amp; Conditions — AI STUDENTS
        </h1>
        <p className="text-xs text-slate-500">
          Official Owner &amp; Founder: {supportContact.ownerName || 'ABHIMANYU OFFICIAL HACKER'}
        </p>

        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              1. Educational Purpose
            </h2>
            <p>
              AI STUDENTS is an academic preparation platform built for Class 10, Class 11, and Class 12 learners across BSEB, CBSE, ICSE/ISC, and State Boards. It supplements — and does not replace — official board textbooks and school instruction.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              2. Verified PYQs vs AI-Generated Practice
            </h2>
            <p>
              Questions sourced from verified board papers are clearly labeled with source metadata. AI-generated explanations, written-answer rubric feedback, and predicted practice sets are labeled clearly as AI-generated study aids and carry no guarantee of appearing verbatim in any board examination.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              3. Responsible Use &amp; Account Security
            </h2>
            <p>
              Students agree not to attempt unauthorized access to administrative endpoints, submit spam tickets, or share account credentials. Administrators reserve the right to suspend abusive accounts while keeping academic progress secure.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              4. Payments &amp; Access
            </h2>
            <p>
              All core board syllabuses, subject tests, and AI learning tools currently run under Free Student Access unless paid modules are formally activated by the platform owner with verified gateway billing.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
