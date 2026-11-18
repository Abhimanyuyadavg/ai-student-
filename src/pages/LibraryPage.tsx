import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  KeyRound,
  Library,
  Lock,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { APP_ASSETS } from '../lib/assets.ts';
import { CurriculumStatusText } from '../components/StatusText.tsx';
import { AuthImage, ZoomableAuthThumbnail } from '../components/ImageTools.tsx';
import { PdfReaderModal } from '../components/PdfReaderModal.tsx';
import { PdfCheckoutModal, PdfInvoiceModal } from '../components/PdfCheckoutAndInvoiceModal.tsx';
import { PdfPromoCodeModal } from '../components/PdfPromoCodeModal.tsx';
import { PdfToolsWorkbenchModal, PdfWorkbenchTool } from '../components/PdfToolsWorkbenchModal.tsx';
import {
  LearningMaterial,
  PaymentGatewayPublicConfig,
  PdfClassId,
  PdfEntitlement,
  PdfNoteItem,
  PdfPaymentOrder,
  PdfPromoUnlockRecord,
  PdfStreamId,
} from '../types/index.ts';

type LibraryMainTab = 'pdf-library' | 'receipts' | 'materials';

const CLASS_TABS: { id: PdfClassId; label: string; subtitle: string }[] = [
  { id: 'class_10', label: 'Class 10th PDF Library', subtitle: 'All 6 Subjects · Separate Subject & Chapter PDFs' },
  { id: 'class_11', label: 'Class 11th PDF Library', subtitle: 'Science · Commerce · Arts / Humanities · Languages' },
  { id: 'class_12', label: 'Class 12th PDF Library', subtitle: 'Science · Commerce · Arts / Humanities · Languages' },
];

const STREAM_FILTERS: { id: 'all' | PdfStreamId; label: string }[] = [
  { id: 'all', label: 'All Streams' },
  { id: 'science', label: 'Science' },
  { id: 'commerce', label: 'Commerce' },
  { id: 'arts', label: 'Arts / Humanities' },
  { id: 'na', label: 'Core Languages' },
];

export const LibraryPage: React.FC = () => {
  const {
    appUser,
    studentProfile,
    navParams,
    materials,
    subjects,
    boards,
    getApiHeaders,
    showToast,
  } = useApp();

  const isAdmin = appUser?.role === 'admin';

  // Derive sensible default Class tab from navParams or student's profile
  const initialClassId: PdfClassId = useMemo(() => {
    if (navParams?.pdfClassId) return navParams.pdfClassId;
    const cid = (studentProfile?.classId || '').toLowerCase();
    if (cid.includes('12')) return 'class_12';
    if (cid.includes('11')) return 'class_11';
    return 'class_10';
  }, [navParams?.pdfClassId, studentProfile?.classId]);

  const [mainTab, setMainTab] = useState<LibraryMainTab>('pdf-library');
  const [selectedClass, setSelectedClass] = useState<PdfClassId>(initialClassId);
  const [selectedStream, setSelectedStream] = useState<'all' | PdfStreamId>('all');
  const [mediumFilter, setMediumFilter] = useState<'both' | 'en' | 'hi'>(() => {
    const med = (studentProfile?.medium || '').toLowerCase();
    if (med.includes('hindi')) return 'hi';
    if (med.includes('english')) return 'en';
    return 'both';
  });
  const [pdfSearch, setPdfSearch] = useState('');
  const [activeSubjectKey, setActiveSubjectKey] = useState<string | null>(null);

  // Server PDF Library state
  const [pdfItems, setPdfItems] = useState<PdfNoteItem[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [entitlements, setEntitlements] = useState<PdfEntitlement[]>([]);
  const [promoUnlocks, setPromoUnlocks] = useState<PdfPromoUnlockRecord[]>([]);
  const [orders, setOrders] = useState<PdfPaymentOrder[]>([]);
  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayPublicConfig | null>(null);
  const [loadingPdfLib, setLoadingPdfLib] = useState(true);

  // Modals
  const [readerItem, setReaderItem] = useState<PdfNoteItem | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<PdfNoteItem | null>(null);
  const [promoItem, setPromoItem] = useState<PdfNoteItem | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<PdfPaymentOrder | null>(null);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [workbenchTool, setWorkbenchTool] = useState<PdfWorkbenchTool>('summarize');
  const [workbenchItem, setWorkbenchItem] = useState<PdfNoteItem | null>(null);

  useEffect(() => {
    if (navParams?.pdfClassId) {
      setSelectedClass(navParams.pdfClassId);
      setMainTab('pdf-library');
    }
  }, [navParams?.pdfClassId]);

  // Legacy Study Material Archive filters (preserved)
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewerItem, setViewerItem] = useState<LearningMaterial | null>(null);

  const loadPdfLibrary = useCallback(async () => {
    setLoadingPdfLib(true);
    try {
      const headers = await getApiHeaders();
      const reqHeaders: Record<string, string> = {};
      if (headers['Authorization']) reqHeaders['Authorization'] = headers['Authorization'];
      const res = await fetch('/api/pdf-library', { headers: reqHeaders });
      const data = await res.json();
      if (res.ok) {
        setPdfItems(Array.isArray(data.items) ? data.items : []);
        setUnlockedIds(Array.isArray(data.unlockedPdfIds) ? data.unlockedPdfIds : []);
        setEntitlements(Array.isArray(data.entitlements) ? data.entitlements : []);
        setPromoUnlocks(Array.isArray(data.promoUnlocks) ? data.promoUnlocks : []);
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        if (data.config) setGatewayConfig(data.config);
      }
    } catch {
      showToast('Unable to load PDF Study Library right now.', 'error');
    } finally {
      setLoadingPdfLib(false);
    }
  }, [getApiHeaders, showToast]);

  useEffect(() => {
    loadPdfLibrary();
  }, [loadPdfLibrary]);

  // Reset subject drill-down when changing class
  useEffect(() => {
    setActiveSubjectKey(null);
    if (selectedClass === 'class_10') {
      setSelectedStream('all');
    }
  }, [selectedClass]);

  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);

  const classScopedItems = useMemo(() => {
    return pdfItems
      .filter((item) => item.published && item.classId === selectedClass)
      .filter((item) => selectedClass === 'class_10' || selectedStream === 'all' || item.streamId === selectedStream)
      .filter((item) => {
        if (mediumFilter === 'hi') {
          return item.mediumSupport === 'bilingual' || item.mediumSupport === 'hindi';
        }
        if (mediumFilter === 'en') {
          return item.mediumSupport === 'bilingual' || item.mediumSupport === 'english';
        }
        return true;
      });
  }, [pdfItems, selectedClass, selectedStream, mediumFilter]);

  const searchFilteredItems = useMemo(() => {
    const q = pdfSearch.trim().toLowerCase();
    if (!q) return classScopedItems;
    return classScopedItems.filter(
      (it) =>
        it.subjectNameEn.toLowerCase().includes(q) ||
        it.subjectNameHi.toLowerCase().includes(q) ||
        it.chapterTitleEn.toLowerCase().includes(q) ||
        it.chapterTitleHi.toLowerCase().includes(q) ||
        `chapter ${it.chapterNumber}`.includes(q)
    );
  }, [classScopedItems, pdfSearch]);

  // Group into distinct Subject PDF Libraries
  const subjectGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        subjectKey: string;
        subjectNameEn: string;
        subjectNameHi: string;
        streamId: PdfStreamId;
        chapters: PdfNoteItem[];
        availableCount: number;
        comingSoonCount: number;
        unlockedCount: number;
      }
    >();

    for (const item of searchFilteredItems) {
      const existing = map.get(item.subjectKey);
      const isAvail = item.availability === 'available';
      const isUnl = isAvail && (item.isFree || isAdmin || unlockedSet.has(item.id));
      if (!existing) {
        map.set(item.subjectKey, {
          subjectKey: item.subjectKey,
          subjectNameEn: item.subjectNameEn,
          subjectNameHi: item.subjectNameHi,
          streamId: item.streamId,
          chapters: [item],
          availableCount: isAvail ? 1 : 0,
          comingSoonCount: isAvail ? 0 : 1,
          unlockedCount: isUnl ? 1 : 0,
        });
      } else {
        existing.chapters.push(item);
        if (isAvail) existing.availableCount += 1;
        else existing.comingSoonCount += 1;
        if (isUnl) existing.unlockedCount += 1;
      }
    }

    for (const grp of map.values()) {
      grp.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
    }

    return Array.from(map.values());
  }, [searchFilteredItems, isAdmin, unlockedSet]);

  const activeSubjectGroup = useMemo(
    () => (activeSubjectKey ? subjectGroups.find((g) => g.subjectKey === activeSubjectKey) || null : null),
    [activeSubjectKey, subjectGroups]
  );

  // Legacy Materials filtering
  const categories = [
    'all',
    'Textbook Notes',
    'Chapter Summary',
    'Formula Sheet',
    'Important Questions',
    'Model Paper',
    'Previous Year Paper',
    'Practice Worksheet',
    'Diagram',
    'Revision PDF',
    'Official Syllabus',
  ];

  const filteredMaterials = materials.filter((m) => {
    if (!m.published) return false;
    if (category !== 'all' && m.materialType !== category) return false;
    if (search.trim() && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDownloadText = (mat: LearningMaterial) => {
    const blob = new Blob(
      [
        `${mat.title}\nType: ${mat.materialType}\nVerification: ${mat.verificationStatus}\nSource: ${
          mat.sourceCitation || 'AI STUDENTS Study Library'
        }\n\n${mat.content}\n`,
      ],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mat.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderChapterRow = (item: PdfNoteItem) => {
    const isComingSoon = item.availability === 'coming_soon';
    const isUnlocked = !isComingSoon && (item.isFree || isAdmin || unlockedSet.has(item.id));
    const latestOrder = orders.find((o) => o.pdfId === item.id);
    const verifiedOrder = orders.find((o) => o.pdfId === item.id && o.paymentStatus === 'verified');
    const entitlementRec = entitlements.find((e) => e.pdfId === item.id);
    const unlockedViaPromo =
      entitlementRec?.unlockSource === 'promo_code' || promoUnlocks.some((p) => p.pdfId === item.id);
    const awaitingOrder = latestOrder?.paymentStatus === 'awaiting_verification';
    const failedOrder = latestOrder?.paymentStatus === 'failed';

    return (
      <div
        key={item.id}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              Chapter {item.chapterNumber}
            </span>
            <span className="text-slate-500">
              {item.mediumSupport === 'bilingual'
                ? 'Hindi + English'
                : item.mediumSupport === 'hindi'
                ? 'Hindi Medium'
                : 'English Medium'}
            </span>
            {isComingSoon ? (
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Coming Soon
              </span>
            ) : item.isFree ? (
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                Free Study PDF
              </span>
            ) : isUnlocked ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                <Unlock className="w-3 h-3" />
                <span>{unlockedViaPromo ? 'Unlocked · Promo Free' : 'Unlocked · Lifetime'}</span>
              </span>
            ) : awaitingOrder ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                <Clock className="w-3 h-3" />
                <span>Awaiting Verification (Locked)</span>
              </span>
            ) : failedOrder ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
                <Lock className="w-3 h-3" />
                <span>Payment Failed (Locked)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 font-mono">
                <Lock className="w-3 h-3" />
                <span>Premium · ₹{item.priceInr}</span>
              </span>
            )}
          </div>

          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            {item.chapterTitleEn}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300">{item.chapterTitleHi}</p>
          {!isComingSoon && item.content?.en?.overview && (
            <p className="text-xs text-slate-500 line-clamp-2 pt-0.5">
              {mediumFilter === 'hi' && item.content?.hi?.overview
                ? item.content.hi.overview
                : item.content.en.overview}
            </p>
          )}
        </div>

        {/* Strict Action Controls — Coming Soon NEVER renders Read, Promo, or Payment buttons! */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isComingSoon ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
              <span>Coming Soon</span>
            </span>
          ) : isUnlocked ? (
            <>
              <button
                type="button"
                onClick={() => setReaderItem(item)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Read PDF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkbenchItem(item);
                  setWorkbenchTool('summarize');
                  setWorkbenchOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-lg cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Tools</span>
              </button>
              {verifiedOrder && (
                <button
                  type="button"
                  onClick={() => setInvoiceOrder(verifiedOrder)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Invoice</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPromoItem(item)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Enter Free Access Code</span>
              </button>
              <button
                type="button"
                onClick={() => setCheckoutItem(item)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {awaitingOrder
                    ? 'Verify / Check Order'
                    : failedOrder
                    ? `Retry Payment · ₹${item.priceInr}`
                    : `Pay ₹${item.priceInr} to Unlock`}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch">
        <div className="md:col-span-8 p-6 sm:p-8 flex flex-col justify-center space-y-2.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
            <span>AI STUDENTS · Original Bilingual PDF Notes &amp; Exam Archive</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            PDF Study Library &amp; Premium Notes
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Class 10th (All 6 Subjects), Class 11th &amp; 12th (Science, Commerce, Arts &amp; Languages). Every note includes chapter summary, definitions, formulas, exam Q&amp;A, and MCQs in clean Hindi + English PDFs.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setWorkbenchItem(null);
                setWorkbenchTool('notes');
                setWorkbenchOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open PDF Tools Studio (Notes · Summarize · Translate · Search)</span>
            </button>
          </div>
        </div>
        <div className="md:col-span-4 min-h-[150px]">
          <img
            src={APP_ASSETS.studyLibraryShelf}
            alt="Study reference books and notebooks in clean light study library"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMainTab('pdf-library')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
              mainTab === 'pdf-library'
                ? 'border-indigo-700 bg-indigo-700 text-white'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Class 10–12 PDF Library</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('receipts')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
              mainTab === 'receipts'
                ? 'border-indigo-700 bg-indigo-700 text-white'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>My Unlocks &amp; Tax Invoices ({entitlements.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('materials')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
              mainTab === 'materials'
                ? 'border-indigo-700 bg-indigo-700 text-white'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>Study Material Archive ({filteredMaterials.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={loadPdfLibrary}
          disabled={loadingPdfLib}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingPdfLib ? 'animate-spin' : ''}`} />
          <span>Refresh Access</span>
        </button>
      </div>

      {/* 1. CLASS 10TH, 11TH, 12TH PDF LIBRARY */}
      {mainTab === 'pdf-library' && (
        <div className="space-y-5">
          {/* Class Cards Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CLASS_TABS.map((cls) => {
              const active = selectedClass === cls.id;
              const clsCount = pdfItems.filter((p) => p.published && p.classId === cls.id).length;
              const availCount = pdfItems.filter(
                (p) => p.published && p.classId === cls.id && p.availability === 'available'
              ).length;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClass(cls.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? 'border-indigo-700 bg-indigo-50/80 dark:bg-indigo-950/50 ring-1 ring-indigo-700'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-base font-bold text-slate-900 dark:text-white">
                      {cls.label}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-indigo-700 dark:text-indigo-300">
                      {availCount}/{clsCount} ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{cls.subtitle}</p>
                </button>
              );
            })}
          </div>

          {/* Search, Stream (Class 11/12) & Medium Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={pdfSearch}
                  onChange={(e) => setPdfSearch(e.target.value)}
                  placeholder="Search subject or chapter name (English / हिंदी)..."
                  className="w-full pl-9 pr-3 py-2 text-sm min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1 text-xs shrink-0">
                {(
                  [
                    ['both', 'Bilingual'],
                    ['hi', 'हिंदी'],
                    ['en', 'English'],
                  ] as const
                ).map(([m, lbl]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMediumFilter(m)}
                    className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                      mediumFilter === m
                        ? 'bg-indigo-700 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {selectedClass !== 'class_10' && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-500 mr-1">Stream:</span>
                {STREAM_FILTERS.map((sf) => (
                  <button
                    key={sf.id}
                    type="button"
                    onClick={() => {
                      setSelectedStream(sf.id);
                      setActiveSubjectKey(null);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                      selectedStream === sf.id
                        ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {sf.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Drill-down: Subject Library vs Subject Cards Grid */}
          {activeSubjectGroup ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSubjectKey(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>All Subjects</span>
                  </button>
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      {activeSubjectGroup.subjectNameEn} ({activeSubjectGroup.subjectNameHi})
                    </h2>
                    <p className="text-xs text-slate-500">
                      {activeSubjectGroup.availableCount} Ready PDFs ·{' '}
                      {activeSubjectGroup.comingSoonCount} Coming Soon ·{' '}
                      {activeSubjectGroup.unlockedCount} Unlocked
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {activeSubjectGroup.chapters.map((ch) => renderChapterRow(ch))}
              </div>
            </div>
          ) : pdfSearch.trim() ? (
            /* Direct Search Results Across Chapters */
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500">
                Matching Chapter PDFs ({searchFilteredItems.length})
              </p>
              {searchFilteredItems.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500">
                  No PDFs matched "{pdfSearch}". Try searching another chapter or subject name.
                </div>
              ) : (
                searchFilteredItems.map((ch) => renderChapterRow(ch))
              )}
            </div>
          ) : (
            /* Distinct Subject Libraries Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectGroups.map((grp) => (
                <div
                  key={grp.subjectKey}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 uppercase">
                        {grp.streamId === 'na' ? 'Core Subject' : grp.streamId}
                      </span>
                      <span className="font-mono text-slate-500">
                        {grp.chapters.length} Chapters
                      </span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      {grp.subjectNameEn}
                    </h2>
                    <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
                      {grp.subjectNameHi}
                    </p>
                    <p className="text-xs text-slate-500">
                      {grp.availableCount} Ready Study PDFs
                      {grp.comingSoonCount > 0 ? ` · ${grp.comingSoonCount} Coming Soon` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSubjectKey(grp.subjectKey)}
                    className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                  >
                    Open {grp.subjectNameEn} PDF Library
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Honest Guardian UPI & Promo Policy Strip */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="space-y-0.5">
              <p className="font-bold text-slate-900 dark:text-white">
                Safe ₹19 Lifetime PDF Unlock · Free Access Code &amp; Server-Verified Payments
              </p>
              <p>
                Have an official Free Access Code? Click <strong>Enter Free Access Code</strong> on any Premium PDF, or unlock via UPI (<span className="font-mono">{gatewayConfig?.upiId || '7492996601@naviaxis'}</span>) · Support (<span className="font-mono">{gatewayConfig?.supportPhone || '7492996601'}</span>).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMainTab('receipts')}
              className="px-3.5 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
            >
              View My Unlocks &amp; Invoices
            </button>
          </div>
        </div>
      )}

      {/* 2. MY UNLOCKS, ORDERS & TAX INVOICES */}
      {mainTab === 'receipts' && (
        <div className="space-y-6">
          {/* Paid Payment & Admin Grant Unlocks */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Paid PDF Unlocks &amp; Tax Invoices (
              {entitlements.filter((e) => e.unlockSource !== 'promo_code').length})
            </h2>
            {entitlements.filter((e) => e.unlockSource !== 'promo_code').length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                No paid PDF unlocks recorded on this account yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {entitlements
                  .filter((e) => e.unlockSource !== 'promo_code')
                  .map((ent) => {
                    const pdf = pdfItems.find((p) => p.id === ent.pdfId);
                    const ord = orders.find((o) => o.id === ent.orderId);
                    return (
                      <div key={ent.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {ent.pdfTitle || pdf?.chapterTitleEn || ent.pdfId}
                          </p>
                          <p className="text-xs text-slate-500">
                            Invoice: <span className="font-mono">{ent.invoiceNumber}</span> · Paid: ₹{ent.amountPaid.toFixed(2)} · Unlocked:{' '}
                            {new Date(ent.unlockedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {pdf && (
                            <button
                              type="button"
                              onClick={() => setReaderItem(pdf)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Open PDF</span>
                            </button>
                          )}
                          {ord && (
                            <button
                              type="button"
                              onClick={() => setInvoiceOrder(ord)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>Tax Invoice</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Separated Promo Code Free Unlock History */}
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <span>Free Access Code Unlocks ({promoUnlocks.length})</span>
              </h2>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded">
                Zero Payment · Separated Promo Record
              </span>
            </div>
            {promoUnlocks.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                No PDFs unlocked with a Free Access Code yet. Use "Enter Free Access Code" on any Premium chapter card.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {promoUnlocks.map((rec) => {
                  const pdf = pdfItems.find((p) => p.id === rec.pdfId);
                  return (
                    <div key={rec.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {rec.pdfTitle || pdf?.chapterTitleEn || rec.pdfId}
                        </p>
                        <p className="text-xs text-slate-500">
                          {rec.subjectName} · Unlock Method: Free Access Code (₹0) · Unlocked:{' '}
                          {new Date(rec.unlockedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {pdf && (
                        <button
                          type="button"
                          onClick={() => setReaderItem(pdf)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Read PDF</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Order &amp; Payment History ({orders.length})
            </h2>
            {orders.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No PDF orders created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                      <th className="pb-2">Order</th>
                      <th className="pb-2">Study PDF</th>
                      <th className="pb-2">UTR / Method</th>
                      <th className="pb-2 text-right">Amount</th>
                      <th className="pb-2 text-right">Status &amp; Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {orders.map((ord) => {
                      const pdf = pdfItems.find((p) => p.id === ord.pdfId);
                      return (
                        <tr key={ord.id}>
                          <td className="py-3 pr-3 font-mono font-semibold text-slate-900 dark:text-white">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3 pr-3">
                            <p className="font-semibold text-slate-900 dark:text-white">{ord.pdfTitle}</p>
                            <p className="text-slate-500">{ord.subjectName}</p>
                          </td>
                          <td className="py-3 pr-3 font-mono text-slate-600 dark:text-slate-300">
                            {ord.utrNumber || ord.gatewayPaymentId || ord.paymentMethod}
                          </td>
                          <td className="py-3 pr-3 text-right font-mono tabular-nums">
                            ₹{ord.totalAmount.toFixed(2)}
                          </td>
                          <td className="py-3 text-right space-x-2">
                            {ord.paymentStatus === 'verified' ? (
                              <button
                                type="button"
                                onClick={() => setInvoiceOrder(ord)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Invoice</span>
                              </button>
                            ) : pdf ? (
                              <button
                                type="button"
                                onClick={() => setCheckoutItem(pdf)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg cursor-pointer"
                              >
                                <FileText className="w-3 h-3" />
                                <span>
                                  {ord.paymentStatus === 'awaiting_verification'
                                    ? 'Pending Verify'
                                    : ord.paymentStatus === 'failed'
                                    ? 'Failed · Retry'
                                    : 'Complete Pay'}
                                </span>
                              </button>
                            ) : (
                              <span>{ord.paymentStatus}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. EXISTING STUDY MATERIAL ARCHIVE (PRESERVED) */}
      {mainTab === 'materials' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes, formula sheets, model papers..."
                className="w-full pl-9 pr-3 py-2 text-sm min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 text-sm leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500">
              No study materials matched your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMaterials.map((mat) => {
                const subj = subjects.find((s) => s.id === mat.subjectId);
                const board = boards.find((b) => b.id === mat.boardId);
                return (
                  <div
                    key={mat.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      {mat.imageUrl && (
                        <div className="h-36 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                          <AuthImage
                            src={mat.imageUrl}
                            alt={mat.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span>{mat.materialType}</span>
                        <CurriculumStatusText status={mat.verificationStatus} />
                      </div>
                      <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        {mat.title}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {board?.boardCode} · {subj?.subjectName || 'Subject'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setViewerItem(mat)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Read</span>
                      </button>
                      <button
                        onClick={() => handleDownloadText(mat)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legacy Material Reader Modal */}
      {viewerItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">{viewerItem.materialType}</p>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {viewerItem.title}
                </h3>
              </div>
              <button
                onClick={() => setViewerItem(null)}
                aria-label="Close reader"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <CurriculumStatusText status={viewerItem.verificationStatus} />
              {viewerItem.imageUrl && (
                <ZoomableAuthThumbnail
                  src={viewerItem.imageUrl}
                  alt={viewerItem.title}
                  title={viewerItem.title}
                  className="w-full max-h-72 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              )}
              <pre className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                {viewerItem.content}
              </pre>
              {viewerItem.fileUrl && (
                <a
                  href={viewerItem.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs font-semibold text-indigo-700 dark:text-indigo-400 underline"
                >
                  Open Attached Source Document
                </a>
              )}
              {viewerItem.sourceCitation && (
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Source Citation: {viewerItem.sourceCitation}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive PDF Reader Modal */}
      <PdfReaderModal
        open={Boolean(readerItem)}
        item={readerItem}
        initialMedium={mediumFilter}
        isAdmin={isAdmin}
        onClose={() => setReaderItem(null)}
        onRequestUnlock={(item) => setCheckoutItem(item)}
        onSwitchToPromoCode={(item) => setPromoItem(item)}
      />

      {/* Free Access Code Verification Modal */}
      <PdfPromoCodeModal
        open={Boolean(promoItem)}
        item={promoItem}
        onClose={() => setPromoItem(null)}
        onUnlocked={loadPdfLibrary}
        onOpenReader={(item) => {
          setPromoItem(null);
          setReaderItem(item);
        }}
        onSwitchToPay={(item) => {
          setPromoItem(null);
          setCheckoutItem(item);
        }}
      />

      {/* Server-Verified Checkout Modal */}
      <PdfCheckoutModal
        open={Boolean(checkoutItem)}
        item={checkoutItem}
        gatewayConfig={gatewayConfig}
        existingOrders={orders}
        onClose={() => setCheckoutItem(null)}
        onOrdersUpdated={loadPdfLibrary}
        onOpenInvoice={(ord) => {
          setCheckoutItem(null);
          setInvoiceOrder(ord);
        }}
        onSwitchToPromoCode={(item) => {
          setCheckoutItem(null);
          setPromoItem(item);
        }}
      />

      {/* Official GST Tax Invoice Modal */}
      <PdfInvoiceModal
        open={Boolean(invoiceOrder)}
        order={invoiceOrder}
        gatewayConfig={gatewayConfig}
        onClose={() => setInvoiceOrder(null)}
      />

      {/* Smart PDF Tools Workbench */}
      <PdfToolsWorkbenchModal
        open={workbenchOpen}
        initialTool={workbenchTool}
        initialLibraryItem={workbenchItem}
        pdfItems={pdfItems}
        unlockedIds={unlockedIds}
        isAdmin={isAdmin}
        onClose={() => setWorkbenchOpen(false)}
        onRequestPromoUnlock={(it) => setPromoItem(it)}
        onRequestPaidUnlock={(it) => setCheckoutItem(it)}
      />
    </div>
  );
};
