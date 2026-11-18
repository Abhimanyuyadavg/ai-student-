import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Download,
  Eye,
  FileText,
  KeyRound,
  Languages,
  Library,
  Lock,
  NotebookPen,
  Search,
  Sparkles,
  Unlock,
  Upload,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  PaymentGatewayPublicConfig,
  PdfClassId,
  PdfNoteItem,
  PdfPaymentOrder,
  PdfStreamId,
} from '../types/index.ts';
import { PdfToolsWorkbenchModal, PdfWorkbenchTool } from './PdfToolsWorkbenchModal.tsx';
import { PdfPromoCodeModal } from './PdfPromoCodeModal.tsx';
import { PdfCheckoutModal, PdfInvoiceModal } from './PdfCheckoutAndInvoiceModal.tsx';

const PDF_TOOL_CARDS: {
  id: PdfWorkbenchTool | 'study_library';
  title: string;
  hindiTag: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
}[] = [
  {
    id: 'reader',
    title: 'PDF Reader',
    hindiTag: 'PDF पढ़ने के लिए',
    description: 'Read Study PDFs or any phone PDF smoothly page-by-page.',
    icon: BookOpen,
    iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
  },
  {
    id: 'viewer',
    title: 'PDF Viewer',
    hindiTag: 'PDF खोलने और देखने के लिए',
    description: 'Page navigator, zoom controls, file info & fast page jump.',
    icon: Eye,
    iconBg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  },
  {
    id: 'notes',
    title: 'PDF Notes',
    hindiTag: 'PDF से नोट्स बनाने के लिए',
    description: 'Turn any PDF into clean exam notes & download as PDF.',
    icon: NotebookPen,
    iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  {
    id: 'summarize',
    title: 'PDF Summarizer',
    hindiTag: 'PDF का आसान सारांश',
    description: 'Easy chapter revision summary & key formulas in seconds.',
    icon: Sparkles,
    iconBg: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
  },
  {
    id: 'translate',
    title: 'PDF Translator',
    hindiTag: 'हिंदी और अंग्रेजी अनुवाद',
    description: 'Translate PDF content accurately between Hindi & English.',
    icon: Languages,
    iconBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  {
    id: 'search',
    title: 'PDF Search',
    hindiTag: 'PDF में टेक्स्ट खोजने के लिए',
    description: 'Find definitions, formulas & Hindi/English words across pages.',
    icon: Search,
    iconBg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  },
  {
    id: 'download',
    title: 'PDF Download',
    hindiTag: 'अनुमति वाली PDF डाउनलोड',
    description: 'Download Free or Unlocked Study Library PDFs cleanly.',
    icon: Download,
    iconBg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
  },
  {
    id: 'study_library',
    title: 'PDF Study Library',
    hindiTag: 'Class 10th, 11th & 12th',
    description: 'Subject-wise & chapter-wise PDFs for every board stream.',
    icon: Library,
    iconBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  },
];

const CLASS_OPTIONS: { id: PdfClassId; label: string }[] = [
  { id: 'class_10', label: 'Class 10th' },
  { id: 'class_11', label: 'Class 11th' },
  { id: 'class_12', label: 'Class 12th' },
];

export const HomePdfToolsSection: React.FC = () => {
  const { appUser, studentProfile, getApiHeaders, navigate, showToast } = useApp();
  const isAdmin = appUser?.role === 'admin';

  const defaultClass: PdfClassId = useMemo(() => {
    const cid = (studentProfile?.classId || '').toLowerCase();
    if (cid.includes('12')) return 'class_12';
    if (cid.includes('11')) return 'class_11';
    return 'class_10';
  }, [studentProfile?.classId]);

  const [selectedClass, setSelectedClass] = useState<PdfClassId>(defaultClass);
  const [selectedStream, setSelectedStream] = useState<'all' | PdfStreamId>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [pdfItems, setPdfItems] = useState<PdfNoteItem[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<PdfPaymentOrder[]>([]);
  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayPublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Workbench & Unlock Modals
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [workbenchTool, setWorkbenchTool] = useState<PdfWorkbenchTool>('reader');
  const [workbenchItem, setWorkbenchItem] = useState<PdfNoteItem | null>(null);
  const [workbenchLocalFile, setWorkbenchLocalFile] = useState<File | null>(null);

  const [promoItem, setPromoItem] = useState<PdfNoteItem | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<PdfNoteItem | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<PdfPaymentOrder | null>(null);

  const libraryStripRef = useRef<HTMLDivElement | null>(null);
  const localFileRef = useRef<HTMLInputElement | null>(null);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getApiHeaders();
      const reqHeaders: Record<string, string> = {};
      if (headers['Authorization']) reqHeaders['Authorization'] = headers['Authorization'];
      const res = await fetch('/api/pdf-library', { headers: reqHeaders });
      const data = await res.json();
      if (res.ok) {
        setPdfItems(Array.isArray(data.items) ? data.items : []);
        setUnlockedIds(Array.isArray(data.unlockedPdfIds) ? data.unlockedPdfIds : []);
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        if (data.config) setGatewayConfig(data.config);
      }
    } catch {
      // Keep quiet on initial dashboard load; user can retry or open full library
    } finally {
      setLoading(false);
    }
  }, [getApiHeaders]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    setSelectedSubject('all');
    if (selectedClass === 'class_10') setSelectedStream('all');
  }, [selectedClass]);

  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);

  const classItems = useMemo(
    () =>
      pdfItems.filter(
        (it) =>
          it.published &&
          it.classId === selectedClass &&
          (selectedClass === 'class_10' || selectedStream === 'all' || it.streamId === selectedStream)
      ),
    [pdfItems, selectedClass, selectedStream]
  );

  const subjectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of classItems) {
      if (!map.has(it.subjectKey)) {
        map.set(it.subjectKey, `${it.subjectNameEn} (${it.subjectNameHi})`);
      }
    }
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [classItems]);

  const visibleChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = q
      ? pdfItems.filter(
          (it) =>
            it.published &&
            (it.classId === selectedClass || q.length >= 2) &&
            (it.subjectNameEn.toLowerCase().includes(q) ||
              it.subjectNameHi.toLowerCase().includes(q) ||
              it.chapterTitleEn.toLowerCase().includes(q) ||
              it.chapterTitleHi.toLowerCase().includes(q) ||
              `chapter ${it.chapterNumber}`.includes(q))
        )
      : classItems.filter((it) => selectedSubject === 'all' || it.subjectKey === selectedSubject);

    const accessScoped = base.filter((it) => {
      if (accessFilter === 'free') return it.isFree;
      if (accessFilter === 'paid') return !it.isFree;
      return true;
    });

    return accessScoped.slice(0, 6);
  }, [pdfItems, classItems, selectedClass, selectedSubject, accessFilter, searchQuery]);

  const openToolWorkbench = (tool: PdfWorkbenchTool, item: PdfNoteItem | null = null, file: File | null = null) => {
    setWorkbenchTool(tool);
    setWorkbenchItem(item);
    setWorkbenchLocalFile(file);
    setWorkbenchOpen(true);
  };

  const requireAccountForPremium = (actionText: string): boolean => {
    if (appUser) return true;
    showToast(`Sign in or register free to ${actionText}.`, 'info');
    navigate('auth', { authMode: 'login' });
    return false;
  };

  const openFullLibrary = () => {
    if (!appUser) {
      showToast('Sign in to open the full Class 10–12 PDF Study Library & Unlocks.', 'info');
      navigate('auth', { authMode: 'login' });
      return;
    }
    navigate('library', { pdfClassId: selectedClass });
  };

  const handleQuickDownload = async (item: PdfNoteItem) => {
    const unlocked = item.isFree || isAdmin || unlockedSet.has(item.id);
    if (!unlocked) {
      if (!requireAccountForPremium('unlock this Premium PDF')) return;
      setCheckoutItem(item);
      return;
    }
    if (!item.allowDownload && !isAdmin) {
      showToast('Download has been disabled by Administrator for this PDF.', 'info');
      return;
    }
    setDownloadingId(item.id);
    try {
      const headers = await getApiHeaders();
      const reqHeaders: Record<string, string> = {};
      if (headers['Authorization']) reqHeaders['Authorization'] = headers['Authorization'];
      const res = await fetch(
        `/api/pdf-library/${encodeURIComponent(item.id)}/file?medium=both&download=1`,
        { headers: reqHeaders }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Could not download PDF.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI_STUDENTS_${item.classId}_Ch${item.chapterNumber}_${item.chapterTitleEn.replace(
        /[^a-zA-Z0-9]+/g,
        '_'
      )}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Study PDF downloaded!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Download failed.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section
      aria-label="PDF Tools & Study Library"
      className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5"
    >
      {/* Top Section Header + Search + Open Local PDF */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-indigo-700 dark:text-indigo-400 uppercase">
            <FileText className="w-4 h-4" />
            <span>PDF TOOLS · Complete PDF Studio &amp; Library</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            PDF Tools — Reader, Notes, Summarizer, Translator &amp; Class 10–12 Library
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            पढ़ें, व्यू करें, AI नोट्स और आसान सारांश बनाएं, हिंदी-अंग्रेजी अनुवाद करें या Class 10th, 11th, 12th की Study PDF डाउनलोड करें।
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <input
            ref={localFileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) openToolWorkbench('reader', null, f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => localFileRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl whitespace-nowrap cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Open Any PDF File</span>
          </button>
          <button
            type="button"
            onClick={openFullLibrary}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-xl whitespace-nowrap cursor-pointer"
          >
            <Library className="w-4 h-4" />
            <span>Full PDF Library</span>
          </button>
        </div>
      </div>

      {/* 8 Interactive PDF Tools Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PDF_TOOL_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                if (card.id === 'study_library') {
                  libraryStripRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  return;
                }
                openToolWorkbench(card.id, null, null);
              }}
              className="group text-left p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-700 transition-all cursor-pointer flex flex-col justify-between space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {card.title}
                </h3>
                <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 mt-0.5">
                  {card.hindiTag}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Inline Class 10th / 11th / 12th Study PDF Library Browser */}
      <div
        ref={libraryStripRef}
        className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3.5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Class 10th, 11th, 12th Switcher + Stream & Subject Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {CLASS_OPTIONS.map((cls) => {
              const active = selectedClass === cls.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => {
                    setSelectedClass(cls.id);
                    setSearchQuery('');
                  }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors whitespace-nowrap ${
                    active
                      ? 'border-indigo-700 bg-indigo-700 text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {cls.label}
                </button>
              );
            })}

            {selectedClass !== 'class_10' && (
              <select
                value={selectedStream}
                onChange={(e) => {
                  setSelectedStream(e.target.value as 'all' | PdfStreamId);
                  setSelectedSubject('all');
                }}
                aria-label="Filter by stream"
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Streams</option>
                <option value="science">Science</option>
                <option value="commerce">Commerce</option>
                <option value="arts">Arts / Humanities</option>
                <option value="na">Core Languages</option>
              </select>
            )}

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              aria-label="Filter by subject"
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 max-w-[220px]"
            >
              <option value="all">All Subjects ({subjectOptions.length})</option>
              {subjectOptions.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value as 'all' | 'free' | 'paid')}
              aria-label="Filter Free or Premium PDFs"
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All (Free &amp; ₹19)</option>
              <option value="free">Free PDFs</option>
              <option value="paid">Premium (₹19)</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Chapter or Subject PDF..."
              className="w-full pl-8 pr-3 py-1.5 text-xs min-h-[34px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Chapter PDF Cards Strip */}
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-500">
            Loading Class 10th, 11th &amp; 12th Study PDFs...
          </div>
        ) : visibleChapters.length === 0 ? (
          <div className="py-5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center text-xs text-slate-500">
            No chapter PDFs matched your filter. Click{' '}
            <button
              type="button"
              onClick={() => navigate('library', { pdfClassId: selectedClass })}
              className="font-semibold text-indigo-700 underline cursor-pointer"
            >
              Open Full PDF Library
            </button>{' '}
            to browse all chapters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleChapters.map((item) => {
              const isComingSoon = item.availability === 'coming_soon';
              const isUnlocked = !isComingSoon && (item.isFree || isAdmin || unlockedSet.has(item.id));
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-semibold">
                      <span className="text-indigo-700 dark:text-indigo-400 truncate">
                        {searchQuery.trim() ? `${item.classId.replace('class_', 'Cl ')} · ` : ''}
                        {item.subjectNameEn} · Ch {item.chapterNumber}
                      </span>
                      {isComingSoon ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <Clock className="w-3 h-3" />
                          <span>Coming Soon</span>
                        </span>
                      ) : item.isFree ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                          Free PDF
                        </span>
                      ) : isUnlocked ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                          <Unlock className="w-3 h-3" />
                          <span>Unlocked</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 font-mono">
                          <Lock className="w-3 h-3" />
                          <span>Premium · ₹{item.priceInr}</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {item.chapterTitleEn}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{item.chapterTitleHi}</p>
                  </div>

                  {/* Working Actions */}
                  {isComingSoon ? (
                    <div className="text-[11px] font-medium text-slate-400 pt-1">
                      Preparing bilingual study notes...
                    </div>
                  ) : isUnlocked ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => openToolWorkbench('reader', item, null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Read</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openToolWorkbench('summarize', item, null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-lg cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>AI Tools</span>
                      </button>
                      {(item.allowDownload || isAdmin) && (
                        <button
                          type="button"
                          disabled={downloadingId === item.id}
                          onClick={() => handleQuickDownload(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          <span>{downloadingId === item.id ? '...' : 'Save'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!requireAccountForPremium('use a Free Access Code')) return;
                          setPromoItem(item);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 rounded-lg cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Enter Free Access Code</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!requireAccountForPremium(`unlock via ₹${item.priceInr} payment`)) return;
                          setCheckoutItem(item);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Pay ₹{item.priceInr} to Unlock</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <span className="text-slate-500">
            Showing {visibleChapters.length} of {classItems.length} chapter PDFs in{' '}
            {CLASS_OPTIONS.find((c) => c.id === selectedClass)?.label} · Free Access Code &amp; ₹19 UPI supported
          </span>
          <button
            type="button"
            onClick={openFullLibrary}
            className="inline-flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            <span>Open All Chapters in PDF Study Library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Multi-Tool PDF Workbench */}
      <PdfToolsWorkbenchModal
        open={workbenchOpen}
        initialTool={workbenchTool}
        defaultClassId={selectedClass}
        initialLibraryItem={workbenchItem}
        initialLocalFile={workbenchLocalFile}
        pdfItems={pdfItems}
        unlockedIds={unlockedIds}
        isAdmin={isAdmin}
        onClose={() => setWorkbenchOpen(false)}
        onRequestPromoUnlock={(it) => {
          if (!requireAccountForPremium('use a Free Access Code')) return;
          setPromoItem(it);
        }}
        onRequestPaidUnlock={(it) => {
          if (!requireAccountForPremium(`unlock via ₹${it.priceInr} payment`)) return;
          setCheckoutItem(it);
        }}
      />

      {/* Free Access Code Modal */}
      <PdfPromoCodeModal
        open={Boolean(promoItem)}
        item={promoItem}
        onClose={() => setPromoItem(null)}
        onUnlocked={loadLibrary}
        onOpenReader={(it) => {
          setPromoItem(null);
          openToolWorkbench('reader', it, null);
        }}
        onSwitchToPay={(it) => {
          setPromoItem(null);
          setCheckoutItem(it);
        }}
      />

      {/* Server-Verified Checkout Modal */}
      <PdfCheckoutModal
        open={Boolean(checkoutItem)}
        item={checkoutItem}
        gatewayConfig={gatewayConfig}
        existingOrders={orders}
        onClose={() => setCheckoutItem(null)}
        onOrdersUpdated={loadLibrary}
        onOpenInvoice={(ord) => {
          setCheckoutItem(null);
          setInvoiceOrder(ord);
        }}
        onSwitchToPromoCode={(it) => {
          setCheckoutItem(null);
          setPromoItem(it);
        }}
      />

      {/* Tax Invoice Modal */}
      <PdfInvoiceModal
        open={Boolean(invoiceOrder)}
        order={invoiceOrder}
        gatewayConfig={gatewayConfig}
        onClose={() => setInvoiceOrder(null)}
      />
    </section>
  );
};
