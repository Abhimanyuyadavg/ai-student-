import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  KeyRound,
  Languages,
  Loader2,
  Lock,
  NotebookPen,
  Printer,
  Search,
  Sparkles,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { PdfClassId, PdfNoteItem } from '../types/index.ts';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PdfWorkbenchTool =
  | 'reader'
  | 'viewer'
  | 'notes'
  | 'summarize'
  | 'translate'
  | 'search'
  | 'download';

interface PdfToolsWorkbenchModalProps {
  open: boolean;
  initialTool: PdfWorkbenchTool;
  defaultClassId?: PdfClassId;
  initialLibraryItem?: PdfNoteItem | null;
  initialLocalFile?: File | null;
  pdfItems: PdfNoteItem[];
  unlockedIds: string[];
  isAdmin: boolean;
  onClose: () => void;
  onRequestPromoUnlock: (item: PdfNoteItem) => void;
  onRequestPaidUnlock: (item: PdfNoteItem) => void;
}

interface SearchMatch {
  pageNumber: number;
  snippet: string;
}

const TOOL_TABS: {
  id: PdfWorkbenchTool;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'reader', label: 'PDF Reader', icon: BookOpen },
  { id: 'viewer', label: 'PDF Viewer', icon: Eye },
  { id: 'notes', label: 'PDF Notes', icon: NotebookPen },
  { id: 'summarize', label: 'Summarizer', icon: Sparkles },
  { id: 'translate', label: 'Translator', icon: Languages },
  { id: 'search', label: 'PDF Search', icon: Search },
  { id: 'download', label: 'PDF Download', icon: Download },
];

export const PdfToolsWorkbenchModal: React.FC<PdfToolsWorkbenchModalProps> = ({
  open,
  initialTool,
  defaultClassId = 'class_10',
  initialLibraryItem = null,
  initialLocalFile = null,
  pdfItems,
  unlockedIds,
  isAdmin,
  onClose,
  onRequestPromoUnlock,
  onRequestPaidUnlock,
}) => {
  const { appUser, navigate, getApiHeaders, showToast } = useApp();

  const [activeTool, setActiveTool] = useState<PdfWorkbenchTool>(initialTool);
  const [sourceMode, setSourceMode] = useState<'library' | 'local'>(
    initialLocalFile ? 'local' : 'library'
  );
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('');
  const [localFile, setLocalFile] = useState<File | null>(initialLocalFile || null);
  const [medium, setMedium] = useState<'both' | 'en' | 'hi'>('both');

  // PDFJS document state
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [isLockedError, setIsLockedError] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1.1);
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [loadedTitle, setLoadedTitle] = useState('');
  const [loadedSizeBytes, setLoadedSizeBytes] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);

  // AI Notes / Summarizer / Translator state
  const [scopeMode, setScopeMode] = useState<'current_page' | 'all_pages' | 'custom'>('all_pages');
  const [customSourceText, setCustomSourceText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<'English' | 'Hindi' | 'Hindi + English'>(
    'Hindi + English'
  );
  const [summaryStyle, setSummaryStyle] = useState<'detailed' | 'quick' | 'formulas'>('detailed');
  const [processingAi, setProcessingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [notesOutput, setNotesOutput] = useState('');
  const [summaryOutput, setSummaryOutput] = useState('');
  const [translateOutput, setTranslateOutput] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  // Download center filter state
  const [dlClassFilter, setDlClassFilter] = useState<'all' | PdfClassId>('all');
  const [dlSearch, setDlSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const textLayerTaskRef = useRef<pdfjsLib.TextLayer | null>(null);
  const localFileInputRef = useRef<HTMLInputElement | null>(null);

  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);

  const accessibleLibraryItems = useMemo(
    () =>
      pdfItems.filter(
        (it) =>
          it.published &&
          it.availability === 'available' &&
          (it.isFree || isAdmin || unlockedSet.has(it.id))
      ),
    [pdfItems, isAdmin, unlockedSet]
  );

  // Sync props when modal opens
  useEffect(() => {
    if (!open) return;
    setActiveTool(initialTool);
    setAiError('');
    if (initialLocalFile) {
      setSourceMode('local');
      setLocalFile(initialLocalFile);
    } else if (initialLibraryItem) {
      setSourceMode('library');
      setSelectedLibraryId(initialLibraryItem.id);
    } else if (accessibleLibraryItems.length > 0) {
      const currentValid = accessibleLibraryItems.find((x) => x.id === selectedLibraryId);
      const classMatch = accessibleLibraryItems.find((x) => x.classId === defaultClassId);
      setSourceMode('library');
      if (!currentValid || (defaultClassId && currentValid.classId !== defaultClassId)) {
        setSelectedLibraryId((classMatch || accessibleLibraryItems[0]).id);
      }
    }
  }, [open, initialTool, initialLibraryItem, initialLocalFile, defaultClassId, accessibleLibraryItems, selectedLibraryId]);

  const activeLibraryItem = useMemo(
    () => pdfItems.find((p) => p.id === selectedLibraryId) || null,
    [pdfItems, selectedLibraryId]
  );

  // Load PDF bytes into pdfjs-dist (either authenticated server library item or local .pdf File)
  useEffect(() => {
    if (!open) {
      setPdfDoc(null);
      setNumPages(0);
      setPageTexts([]);
      setPdfError('');
      setIsLockedError(false);
      return;
    }

    if (sourceMode === 'local' && !localFile) {
      setPdfDoc(null);
      setNumPages(0);
      setPageTexts([]);
      return;
    }
    if (sourceMode === 'library' && !activeLibraryItem) {
      setPdfDoc(null);
      setNumPages(0);
      setPageTexts([]);
      return;
    }

    let cancelled = false;
    let activeDoc: pdfjsLib.PDFDocumentProxy | null = null;
    let activeLoadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    const loadDocument = async () => {
      setLoadingPdf(true);
      setPdfError('');
      setIsLockedError(false);
      setPdfDoc(null);
      setPageTexts([]);
      setCurrentPage(1);
      setPageInput('1');

      try {
        let uint8: Uint8Array;

        if (sourceMode === 'local' && localFile) {
          const buf = await localFile.arrayBuffer();
          uint8 = new Uint8Array(buf);
          setLoadedTitle(localFile.name);
          setLoadedSizeBytes(localFile.size);
        } else if (activeLibraryItem) {
          const headers = await getApiHeaders();
          const reqHeaders: Record<string, string> = {};
          if (headers['Authorization']) {
            reqHeaders['Authorization'] = headers['Authorization'];
          }
          const effectiveMedium =
            activeLibraryItem.sourceType === 'uploaded'
              ? 'both'
              : activeLibraryItem.mediumSupport === 'hindi'
              ? 'hi'
              : activeLibraryItem.mediumSupport === 'english'
              ? 'en'
              : medium;

          const res = await fetch(
            `/api/pdf-library/${encodeURIComponent(activeLibraryItem.id)}/file?medium=${effectiveMedium}`,
            { headers: reqHeaders }
          );

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            if (!cancelled) {
              setIsLockedError(res.status === 402);
              setPdfError(
                errJson.error ||
                  (res.status === 402
                    ? `This Premium PDF requires ₹${activeLibraryItem.priceInr} payment or an authorized Free Access Code.`
                    : 'Unable to open PDF from server.')
              );
            }
            return;
          }

          const buf = await res.arrayBuffer();
          uint8 = new Uint8Array(buf);
          setLoadedTitle(
            `${activeLibraryItem.subjectNameEn} Ch ${activeLibraryItem.chapterNumber}: ${activeLibraryItem.chapterTitleEn}`
          );
          setLoadedSizeBytes(buf.byteLength);
        } else {
          return;
        }

        if (cancelled) return;
        const loadingTask = pdfjsLib.getDocument({ data: uint8 });
        activeLoadingTask = loadingTask;
        const doc = await loadingTask.promise;
        activeDoc = doc;

        if (cancelled) {
          await doc.cleanup(false).catch(() => {});
          await loadingTask.destroy().catch(() => {});
          return;
        }

        setPdfDoc(doc);
        setNumPages(doc.numPages);

        // Extract text across all pages for Search, Notes, Summarize & Translate
        const extracted: string[] = [];
        for (let p = 1; p <= doc.numPages; p++) {
          if (cancelled) break;
          const pg = await doc.getPage(p);
          const tc = await pg.getTextContent();
          const txt = tc.items
            .map((it: any) => (typeof it?.str === 'string' ? it.str : ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          extracted.push(txt);
        }
        if (!cancelled) {
          setPageTexts(extracted);
        }
      } catch (err: any) {
        if (!cancelled) {
          setPdfError(err?.message || 'Could not parse PDF document. Please try another PDF file.');
        }
      } finally {
        if (!cancelled) {
          setLoadingPdf(false);
        }
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore
        }
      }
      if (textLayerTaskRef.current) {
        try {
          textLayerTaskRef.current.cancel();
        } catch {
          // Ignore
        }
      }
      if (activeDoc) {
        activeDoc.cleanup(false).catch(() => {});
      }
      if (activeLoadingTask) {
        activeLoadingTask.destroy().catch(() => {});
      }
    };
  }, [open, sourceMode, localFile, activeLibraryItem, medium, getApiHeaders]);

  // Fit scale nicely on mobile
  useEffect(() => {
    if (!open || !viewportRef.current) return;
    const width = viewportRef.current.clientWidth;
    if (width > 0 && width < 640) {
      setScale(Math.max(0.62, Number(((width - 30) / 595).toFixed(2))));
    } else if (width >= 640) {
      setScale(1.1);
    }
  }, [open, activeTool]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const applySearchHighlight = useCallback((layerDiv: HTMLDivElement, query: string) => {
    const q = query.trim().toLowerCase();
    const spans = layerDiv.querySelectorAll('span');
    spans.forEach((sp) => {
      sp.classList.remove('ais-pdf-hit', 'ais-pdf-hit-active');
      if (q && (sp.textContent || '').toLowerCase().includes(q)) {
        sp.classList.add('ais-pdf-hit');
      }
    });
  }, []);

  // Render PDF Canvas when Reader or Viewer is active
  useEffect(() => {
    const isCanvasVisible = activeTool === 'reader' || activeTool === 'viewer';
    if (!isCanvasVisible || !pdfDoc || !canvasRef.current || !textLayerRef.current || currentPage < 1) {
      return;
    }

    let cancelled = false;
    const renderPage = async () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore
        }
      }
      if (textLayerTaskRef.current) {
        try {
          textLayerTaskRef.current.cancel();
        } catch {
          // Ignore
        }
      }
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled || !canvasRef.current || !textLayerRef.current) return;

        const viewport = page.getViewport({ scale });
        const outputScale =
          typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
        const task = page.render({
          canvasContext: ctx,
          viewport,
          canvas,
          transform,
        });
        renderTaskRef.current = task;
        await task.promise;
        if (cancelled) return;

        const layerDiv = textLayerRef.current;
        layerDiv.innerHTML = '';
        layerDiv.style.width = `${Math.floor(viewport.width)}px`;
        layerDiv.style.height = `${Math.floor(viewport.height)}px`;
        layerDiv.style.setProperty('--scale-factor', String(viewport.scale));

        const textContent = await page.getTextContent();
        if (cancelled) return;

        const tl = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: layerDiv,
          viewport,
        });
        textLayerTaskRef.current = tl;
        await tl.render();
        if (!cancelled) {
          applySearchHighlight(layerDiv, searchQuery);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('PDF render error:', err);
        }
      }
    };

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [activeTool, pdfDoc, currentPage, scale, searchQuery, applySearchHighlight]);

  // Real multi-page PDF Search
  const searchMatches = useMemo<SearchMatch[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || pageTexts.length === 0) return [];
    const results: SearchMatch[] = [];
    pageTexts.forEach((txt, idx) => {
      const lower = txt.toLowerCase();
      let pos = lower.indexOf(q);
      while (pos !== -1) {
        const start = Math.max(0, pos - 36);
        const end = Math.min(txt.length, pos + q.length + 52);
        results.push({
          pageNumber: idx + 1,
          snippet: `${start > 0 ? '...' : ''}${txt.slice(start, end)}${end < txt.length ? '...' : ''}`,
        });
        pos = lower.indexOf(q, pos + q.length);
      }
    });
    return results;
  }, [searchQuery, pageTexts]);

  useEffect(() => {
    setActiveMatchIdx(0);
  }, [searchMatches.length]);

  const extractedSourceForAi = useMemo(() => {
    if (scopeMode === 'custom') return customSourceText.trim();
    if (scopeMode === 'current_page') {
      return (pageTexts[currentPage - 1] || '').trim();
    }
    return pageTexts
      .map((t, i) => (t ? `[Page ${i + 1}]\n${t}` : ''))
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 18000);
  }, [scopeMode, customSourceText, pageTexts, currentPage]);

  const handleRunAiTool = async (action: 'notes' | 'summarize' | 'translate') => {
    if (!appUser) {
      setAiError('Sign in or create a free student account to generate AI PDF Notes, Summaries, and Translations.');
      return;
    }
    const sourceText = extractedSourceForAi;
    if (sourceText.length < 10) {
      setAiError(
        'No readable text found on selected page(s). Open a PDF with selectable text or switch Source Scope to "Paste / Edit Text".'
      );
      return;
    }

    setAiError('');
    setProcessingAi(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch('/api/ai/pdf-tool', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          text: sourceText,
          title: loadedTitle || 'Study PDF',
          pdfId: sourceMode === 'library' && activeLibraryItem ? activeLibraryItem.id : undefined,
          targetLanguage,
          style: summaryStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not process PDF text.');
      }
      if (action === 'notes') setNotesOutput(data.result || '');
      else if (action === 'summarize') setSummaryOutput(data.result || '');
      else setTranslateOutput(data.result || '');
      showToast(
        action === 'notes'
          ? 'Study Notes generated from PDF!'
          : action === 'summarize'
          ? 'PDF Summary ready!'
          : 'PDF Translation completed!',
        'success'
      );
    } catch (err: any) {
      setAiError(err?.message || 'PDF AI processing failed.');
    } finally {
      setProcessingAi(false);
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard.`, 'success');
    } catch {
      showToast('Copy permission blocked by browser.', 'info');
    }
  };

  const handleExportPdfResult = async (actionLabel: string, content: string) => {
    if (!content.trim()) return;
    setExportingPdf(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch('/api/pdf-tools/export-pdf', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: loadedTitle ? `${loadedTitle} — ${actionLabel}` : `AI STUDENTS — ${actionLabel}`,
          subtitle: `Generated from AI STUDENTS PDF Tools · ${targetLanguage}`,
          actionLabel,
          content,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Could not export PDF.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI_STUDENTS_${actionLabel.replace(/[^a-zA-Z0-9]+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`${actionLabel} PDF downloaded!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'PDF export failed.', 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadLibraryPdf = async (item: PdfNoteItem) => {
    const isUnlocked = item.isFree || isAdmin || unlockedSet.has(item.id);
    if (!isUnlocked) {
      showToast('Unlock this Premium PDF first via Free Access Code or ₹19 payment.', 'info');
      return;
    }
    if (!item.allowDownload && !isAdmin) {
      showToast('Download is disabled by Administrator for this PDF.', 'info');
      return;
    }
    setDownloadingId(item.id);
    try {
      const headers = await getApiHeaders();
      const reqHeaders: Record<string, string> = {};
      if (headers['Authorization']) reqHeaders['Authorization'] = headers['Authorization'];
      const effectiveMedium =
        item.sourceType === 'uploaded'
          ? 'both'
          : item.mediumSupport === 'hindi'
          ? 'hi'
          : item.mediumSupport === 'english'
          ? 'en'
          : medium;

      const res = await fetch(
        `/api/pdf-library/${encodeURIComponent(item.id)}/file?medium=${effectiveMedium}&download=1`,
        { headers: reqHeaders }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Download failed.');
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
      showToast('Study PDF downloaded successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not download PDF.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrintLoadedPdf = async () => {
    if (!pdfDoc) return;
    if (sourceMode === 'library' && activeLibraryItem && !activeLibraryItem.allowPrint && !isAdmin) {
      showToast('Printing disabled by Administrator for this note.', 'info');
      return;
    }
    try {
      const images: string[] = [];
      const limitPages = Math.min(pdfDoc.numPages, 25);
      for (let p = 1; p <= limitPages; p++) {
        const page = await pdfDoc.getPage(p);
        const vp = page.getViewport({ scale: 1.7 });
        const offscreen = document.createElement('canvas');
        offscreen.width = Math.floor(vp.width);
        offscreen.height = Math.floor(vp.height);
        const ctx = offscreen.getContext('2d');
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport: vp, canvas: offscreen }).promise;
        images.push(offscreen.toDataURL('image/png'));
      }
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
      const doc = printFrame.contentWindow?.document;
      if (!doc) {
        printFrame.remove();
        return;
      }
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>${loadedTitle}</title>
        <style>@page{size:A4;margin:6mm;}body{margin:0;background:#fff;}img{display:block;width:100%;height:auto;page-break-after:always;}img:last-child{page-break-after:auto;}</style>
        </head><body>${images.map((s) => `<img src="${s}" />`).join('')}</body></html>`);
      doc.close();
      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } finally {
          setTimeout(() => printFrame.remove(), 1500);
        }
      }, 300);
    } catch {
      showToast('Could not prepare PDF for printing.', 'error');
    }
  };

  const filteredDownloadItems = useMemo(() => {
    const q = dlSearch.trim().toLowerCase();
    return pdfItems
      .filter((it) => it.published && it.availability === 'available')
      .filter((it) => dlClassFilter === 'all' || it.classId === dlClassFilter)
      .filter(
        (it) =>
          !q ||
          it.subjectNameEn.toLowerCase().includes(q) ||
          it.subjectNameHi.toLowerCase().includes(q) ||
          it.chapterTitleEn.toLowerCase().includes(q) ||
          it.chapterTitleHi.toLowerCase().includes(q)
      );
  }, [pdfItems, dlClassFilter, dlSearch]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/75 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 sm:rounded-2xl shadow-2xl flex flex-col w-full h-full max-w-6xl mx-auto overflow-hidden">
        {/* Top Bar: Title + Source Selector */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                AI STUDENTS · Smart PDF Tools Studio
              </p>
              <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {loadedTitle || 'Select a Library PDF or Open a Local .PDF File'}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Local PDF Picker */}
            <input
              ref={localFileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setSourceMode('local');
                  setLocalFile(f);
                }
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => localFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-lg cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Open Device PDF</span>
            </button>

            {/* Unlocked Library PDF Picker */}
            <select
              value={sourceMode === 'library' ? selectedLibraryId : ''}
              onChange={(e) => {
                if (!e.target.value) return;
                setSourceMode('library');
                setSelectedLibraryId(e.target.value);
              }}
              aria-label="Choose unlocked study PDF"
              className="max-w-[220px] px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- Switch Study Library PDF --</option>
              {accessibleLibraryItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.classId.replace('class_', 'Class ')} · {it.subjectNameEn} Ch {it.chapterNumber}: {it.chapterTitleEn}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close PDF Tools"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tool Tabs Strip */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto">
          {TOOL_TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTool(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  active
                    ? 'border-indigo-700 bg-indigo-700 text-white'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-indigo-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Tool Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 1 & 2. PDF READER / PDF VIEWER */}
          {(activeTool === 'reader' || activeTool === 'viewer') && (
            <>
              {/* Toolbar */}
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const n = Math.max(1, Math.min(numPages || 1, Number(pageInput) || 1));
                      setCurrentPage(n);
                    }}
                    className="inline-flex items-center gap-1"
                  >
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, numPages)}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      className="w-12 px-1.5 py-1 text-center font-mono text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950"
                    />
                    <span className="font-mono text-slate-500">/ {numPages}</span>
                  </form>
                  <button
                    type="button"
                    disabled={currentPage >= numPages}
                    onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {activeTool === 'viewer' && numPages > 0 && (
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                      {Math.max(1, Math.round(loadedSizeBytes / 1024))} KB · {numPages} Pages
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {sourceMode === 'library' &&
                    activeLibraryItem &&
                    activeLibraryItem.sourceType !== 'uploaded' &&
                    activeLibraryItem.mediumSupport === 'bilingual' && (
                      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
                        {(
                          [
                            ['both', 'Bilingual'],
                            ['en', 'En'],
                            ['hi', 'हिंदी'],
                          ] as const
                        ).map(([m, lbl]) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMedium(m)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                              medium === m
                                ? 'bg-indigo-700 text-white'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] w-10 text-center tabular-nums">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setScale((s) => Math.min(2.4, Number((s + 0.15).toFixed(2))))}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                      aria-label="Zoom in"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!pdfDoc}
                    onClick={handlePrintLoadedPdf}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Print</span>
                  </button>

                  {sourceMode === 'library' && activeLibraryItem && (
                    <button
                      type="button"
                      disabled={downloadingId === activeLibraryItem.id}
                      onClick={() => handleDownloadLibraryPdf(activeLibraryItem)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Body: Viewer Page Strip + Canvas Viewport */}
              <div className="flex-1 flex overflow-hidden">
                {activeTool === 'viewer' && numPages > 0 && !loadingPdf && !pdfError && (
                  <div className="hidden sm:flex flex-col w-44 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-y-auto p-2.5 space-y-1.5 shrink-0">
                    <p className="text-[11px] font-bold text-slate-500 px-1 pb-1">
                      Pages ({numPages})
                    </p>
                    {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium border cursor-pointer ${
                          currentPage === p
                            ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 font-semibold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>Page {p}</span>
                        </div>
                        {pageTexts[p - 1] && (
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {pageTexts[p - 1]}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  ref={viewportRef}
                  className="flex-1 overflow-auto bg-slate-200/75 dark:bg-slate-950 p-3 sm:p-5 flex flex-col items-center"
                >
                  {loadingPdf && (
                    <div className="my-auto flex flex-col items-center gap-3 text-slate-600 dark:text-slate-300 py-16">
                      <Loader2 className="w-7 h-7 animate-spin text-indigo-700" />
                      <p className="text-xs font-medium">Loading PDF pages...</p>
                    </div>
                  )}

                  {!loadingPdf && pdfError && (
                    <div className="my-auto max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center space-y-4">
                      <Lock className="w-8 h-8 text-amber-600 mx-auto" />
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {isLockedError ? 'Premium Study PDF Locked' : 'Cannot Open PDF'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{pdfError}</p>
                      {isLockedError && activeLibraryItem && (
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onRequestPromoUnlock(activeLibraryItem);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Enter Free Access Code</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onRequestPaidUnlock(activeLibraryItem);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                          >
                            Pay ₹{activeLibraryItem.priceInr} to Unlock
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {!loadingPdf && !pdfError && !pdfDoc && (
                    <div className="my-auto max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center space-y-3">
                      <FilePlus2 className="w-8 h-8 text-indigo-700 mx-auto" />
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        Open a PDF to Read or Inspect
                      </h3>
                      <p className="text-xs text-slate-500">
                        Choose any unlocked Study Library PDF from the selector above or upload a `.pdf` file directly from your device.
                      </p>
                      <button
                        type="button"
                        onClick={() => localFileInputRef.current?.click()}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                      >
                        Choose Local .PDF File
                      </button>
                    </div>
                  )}

                  {!loadingPdf && !pdfError && pdfDoc && (
                    <div className="relative bg-white shadow-lg border border-slate-300 dark:border-slate-700">
                      <canvas ref={canvasRef} className="block" />
                      <div ref={textLayerRef} className="ais-pdf-textlayer" />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 3, 4 & 5. PDF NOTES / PDF SUMMARIZER / PDF TRANSLATOR */}
          {(activeTool === 'notes' || activeTool === 'summarize' || activeTool === 'translate') && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {activeTool === 'notes'
                          ? 'PDF Notes Generator — PDF से एग्जाम-रेडी नोट्स बनाएं'
                          : activeTool === 'summarize'
                          ? 'PDF Summarizer — PDF का सरल सारांश'
                          : 'PDF Translator — हिंदी और अंग्रेजी अनुवाद'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {numPages > 0
                          ? `Extracted ${pageTexts.filter(Boolean).length} readable page(s) from "${loadedTitle}"`
                          : 'Open a Library PDF or Local .PDF file above, or paste text directly.'}
                      </p>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        PDF Text Source Scope
                      </label>
                      <select
                        value={scopeMode}
                        onChange={(e) => setScopeMode(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        <option value="all_pages">All Loaded PDF Pages ({numPages || 0})</option>
                        <option value="current_page">Current Page Only (Page {currentPage})</option>
                        <option value="custom">Paste / Edit Custom PDF Text</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Output Language
                      </label>
                      <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        <option value="Hindi + English">Hindi + English (Bilingual)</option>
                        <option value="Hindi">हिंदी (Hindi Only)</option>
                        <option value="English">English Only</option>
                      </select>
                    </div>

                    {activeTool === 'summarize' ? (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Summary Depth
                        </label>
                        <select
                          value={summaryStyle}
                          onChange={(e) => setSummaryStyle(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                        >
                          <option value="detailed">Detailed Chapter Summary</option>
                          <option value="quick">Quick 2-Minute Revision</option>
                          <option value="formulas">Formulas, Laws &amp; Key Points</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-end">
                        <button
                          type="button"
                          disabled={processingAi}
                          onClick={() => handleRunAiTool(activeTool)}
                          className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                        >
                          {processingAi ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {processingAi
                              ? 'Processing...'
                              : activeTool === 'notes'
                              ? 'Generate Study Notes'
                              : 'Translate PDF Text'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {activeTool === 'summarize' && (
                    <button
                      type="button"
                      disabled={processingAi}
                      onClick={() => handleRunAiTool('summarize')}
                      className="w-full sm:w-auto py-2.5 px-5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                    >
                      {processingAi ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>{processingAi ? 'Summarizing PDF...' : 'Generate Easy Summary'}</span>
                    </button>
                  )}

                  {scopeMode === 'custom' && (
                    <textarea
                      rows={4}
                      value={customSourceText}
                      onChange={(e) => setCustomSourceText(e.target.value)}
                      placeholder="Paste or edit any paragraph/topic from your PDF here..."
                      className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  )}

                  {aiError && (
                    <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                      <span>{aiError}</span>
                      {!appUser && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate('auth', { authMode: 'login' });
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer shrink-0"
                        >
                          Sign In / Register Free
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Output Area (Editable for Notes, Clean Display + Export PDF/Copy) */}
                {(() => {
                  const activeOutput =
                    activeTool === 'notes'
                      ? notesOutput
                      : activeTool === 'summarize'
                      ? summaryOutput
                      : translateOutput;
                  const actionLabel =
                    activeTool === 'notes'
                      ? 'PDF Study Notes'
                      : activeTool === 'summarize'
                      ? 'PDF Summary'
                      : 'PDF Translation';

                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {actionLabel} Output
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={!activeOutput.trim()}
                            onClick={() => handleCopyText(activeOutput, actionLabel)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-45"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </button>
                          <button
                            type="button"
                            disabled={!activeOutput.trim() || exportingPdf}
                            onClick={() => handleExportPdfResult(actionLabel, activeOutput)}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer disabled:opacity-45"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{exportingPdf ? 'Building PDF...' : 'Download as PDF'}</span>
                          </button>
                        </div>
                      </div>

                      {activeTool === 'notes' ? (
                        <textarea
                          rows={13}
                          value={notesOutput}
                          onChange={(e) => setNotesOutput(e.target.value)}
                          placeholder="Click 'Generate Study Notes' above — or type/edit your own PDF study notes here and click 'Download as PDF'..."
                          className="w-full p-3.5 text-xs sm:text-sm leading-relaxed rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans"
                        />
                      ) : activeOutput ? (
                        <pre className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-100 max-h-[420px] overflow-y-auto">
                          {activeOutput}
                        </pre>
                      ) : (
                        <p className="text-xs text-slate-500 py-8 text-center">
                          Click the button above to process the opened PDF with AI STUDENTS.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 6. PDF TEXT SEARCH */}
          {activeTool === 'search' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
              <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    PDF Text &amp; Formula Search ({numPages} Pages Loaded)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Search English or हिंदी words across every page of "{loadedTitle || 'opened PDF'}". Click any match to open that exact page.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type keyword, formula, or हिंदी शब्द to search across PDF pages..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                {searchQuery.trim() ? (
                  searchMatches.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      No matches found for "{searchQuery}" in this PDF.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[430px] overflow-y-auto">
                      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                        Found {searchMatches.length} matching occurrence(s):
                      </p>
                      {searchMatches.map((m, i) => (
                        <button
                          key={`${m.pageNumber}_${i}`}
                          type="button"
                          onClick={() => {
                            setActiveMatchIdx(i);
                            setCurrentPage(m.pageNumber);
                            setActiveTool('reader');
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                            activeMatchIdx === i
                              ? 'border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/40'
                              : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                            <span>Page {m.pageNumber}</span>
                            <span>Jump to Page →</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300">{m.snippet}</p>
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    Start typing above to search inside all {numPages || 0} pages of the loaded PDF.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 7. PDF DOWNLOAD CENTER */}
          {activeTool === 'download' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Study PDF Download Manager
                      </h3>
                      <p className="text-xs text-slate-500">
                        Download Free &amp; Unlocked Study PDFs directly (where permitted by Admin). Premium PDFs require ₹19 or an authorized Free Access Code.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={dlSearch}
                        onChange={(e) => setDlSearch(e.target.value)}
                        placeholder="Filter downloadable PDFs by subject or chapter..."
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <select
                      value={dlClassFilter}
                      onChange={(e) => setDlClassFilter(e.target.value as any)}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="all">All Classes (10–12)</option>
                      <option value="class_10">Class 10th</option>
                      <option value="class_11">Class 11th</option>
                      <option value="class_12">Class 12th</option>
                    </select>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[430px] overflow-y-auto">
                    {filteredDownloadItems.map((it) => {
                      const unlocked = it.isFree || isAdmin || unlockedSet.has(it.id);
                      const canDl = unlocked && (it.allowDownload || isAdmin);
                      return (
                        <div
                          key={it.id}
                          className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                              <span className="text-indigo-700 dark:text-indigo-400 uppercase">
                                {it.classId.replace('class_', 'Class ')}
                              </span>
                              <span>·</span>
                              <span>{it.subjectNameEn}</span>
                              <span>· Ch {it.chapterNumber}</span>
                              {it.isFree ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                  Free PDF
                                </span>
                              ) : unlocked ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                  Unlocked
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono">
                                  Premium · ₹{it.priceInr}
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {it.chapterTitleEn} · {it.chapterTitleHi}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {canDl ? (
                              <button
                                type="button"
                                disabled={downloadingId === it.id}
                                onClick={() => handleDownloadLibraryPdf(it)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-55"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{downloadingId === it.id ? 'Saving...' : 'Download PDF'}</span>
                              </button>
                            ) : unlocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-lg">
                                <FileCheck2 className="w-3.5 h-3.5" />
                                <span>Read Only (Download Disabled)</span>
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onRequestPromoUnlock(it);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg cursor-pointer"
                                >
                                  <KeyRound className="w-3 h-3" />
                                  <span>Enter Free Access Code</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onRequestPaidUnlock(it);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-white bg-indigo-700 rounded-lg cursor-pointer"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>Pay ₹{it.priceInr} to Unlock</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
