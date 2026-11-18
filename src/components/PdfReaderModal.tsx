import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  Printer,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { PdfNoteItem } from '../types/index.ts';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfReaderModalProps {
  open: boolean;
  item: PdfNoteItem | null;
  initialMedium?: 'both' | 'en' | 'hi';
  isAdmin?: boolean;
  onClose: () => void;
  onRequestUnlock?: (item: PdfNoteItem) => void;
  onSwitchToPromoCode?: (item: PdfNoteItem) => void;
}

interface SearchMatch {
  pageNumber: number;
  snippet: string;
}

export const PdfReaderModal: React.FC<PdfReaderModalProps> = ({
  open,
  item,
  initialMedium = 'both',
  isAdmin = false,
  onClose,
  onRequestUnlock,
  onSwitchToPromoCode,
}) => {
  const { getApiHeaders, showToast } = useApp();

  const [medium, setMedium] = useState<'both' | 'en' | 'hi'>(initialMedium);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLockedError, setIsLockedError] = useState(false);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.15);

  const [searchQuery, setSearchQuery] = useState('');
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const textLayerTaskRef = useRef<pdfjsLib.TextLayer | null>(null);

  useEffect(() => {
    setMedium(initialMedium);
  }, [initialMedium, item?.id]);

  // Load PDF bytes from authenticated backend route (NEVER bypass lock or use raw public URL)
  useEffect(() => {
    if (!open || !item) {
      setPdfDoc(null);
      setNumPages(0);
      setPageTexts([]);
      setErrorMsg('');
      setIsLockedError(false);
      return;
    }

    let cancelled = false;
    let activeDoc: pdfjsLib.PDFDocumentProxy | null = null;
    let activeLoadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    const loadPdf = async () => {
      setLoading(true);
      setErrorMsg('');
      setIsLockedError(false);
      setPdfDoc(null);
      setPageTexts([]);
      setCurrentPage(1);

      try {
        const headers = await getApiHeaders();
        // Omit Content-Type JSON header when downloading PDF binary
        const reqHeaders: Record<string, string> = {};
        if (headers['Authorization']) {
          reqHeaders['Authorization'] = headers['Authorization'];
        }
        const effectiveMedium =
          item.sourceType === 'uploaded'
            ? 'both'
            : item.mediumSupport === 'hindi'
            ? 'hi'
            : item.mediumSupport === 'english'
            ? 'en'
            : medium;

        const res = await fetch(
          `/api/pdf-library/${encodeURIComponent(item.id)}/file?medium=${effectiveMedium}`,
          { headers: reqHeaders }
        );

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          if (!cancelled) {
            setIsLockedError(res.status === 402);
            setErrorMsg(
              errJson.error ||
                (res.status === 402
                  ? `This premium PDF requires ₹${item.priceInr} server-verified payment to unlock.`
                  : 'Unable to load PDF file.')
            );
          }
          return;
        }

        const buffer = await res.arrayBuffer();
        if (cancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
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

        // Pre-extract text across all pages for instant in-PDF search
        const extracted: string[] = [];
        for (let p = 1; p <= doc.numPages; p++) {
          if (cancelled) break;
          const pg = await doc.getPage(p);
          const tc = await pg.getTextContent();
          const text = tc.items
            .map((it: any) => (typeof it?.str === 'string' ? it.str : ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          extracted.push(text);
        }
        if (!cancelled) {
          setPageTexts(extracted);
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message || 'Failed to load PDF document.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancel error
        }
      }
      if (textLayerTaskRef.current) {
        try {
          textLayerTaskRef.current.cancel();
        } catch {
          // Ignore cancel error
        }
      }
      if (activeDoc) {
        activeDoc.cleanup(false).catch(() => {});
      }
      if (activeLoadingTask) {
        activeLoadingTask.destroy().catch(() => {});
      }
    };
  }, [open, item, medium, getApiHeaders]);

  // Fit scale neatly to mobile/tablet width on initial load
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const width = containerRef.current.clientWidth;
    if (width > 0 && width < 640) {
      setScale(Math.max(0.65, Number(((width - 32) / 595).toFixed(2))));
    } else if (width >= 640) {
      setScale(1.15);
    }
  }, [open, item?.id]);

  // Search matches across pages
  const searchMatches = useMemo<SearchMatch[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || pageTexts.length === 0) return [];
    const results: SearchMatch[] = [];
    pageTexts.forEach((txt, idx) => {
      const lower = txt.toLowerCase();
      let pos = lower.indexOf(q);
      while (pos !== -1) {
        const start = Math.max(0, pos - 28);
        const end = Math.min(txt.length, pos + q.length + 36);
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
    if (searchMatches.length > 0) {
      setCurrentPage(searchMatches[0].pageNumber);
    }
  }, [searchMatches]);

  // Highlight matching spans in TextLayer
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

  // Render active page Canvas + selectable TextLayer
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !textLayerRef.current || currentPage < 1) return;
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
        const outputScale = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;

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

        // Clear & build crisp selectable TextLayer over canvas
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
          console.error('PDF page render error:', err);
        }
      }
    };

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, scale, searchQuery, applySearchHighlight]);

  const handleJumpMatch = (dir: -1 | 1) => {
    if (searchMatches.length === 0) return;
    const nextIdx = (activeMatchIdx + dir + searchMatches.length) % searchMatches.length;
    setActiveMatchIdx(nextIdx);
    setCurrentPage(searchMatches[nextIdx].pageNumber);
  };

  const handleDownloadPdf = async () => {
    if (!item) return;
    if (!item.allowDownload && !isAdmin) {
      showToast('Download has been disabled by Administrator for this note.', 'info');
      return;
    }
    setDownloading(true);
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
      showToast('PDF downloaded successfully.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'PDF download failed.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintPdf = async () => {
    if (!item || !pdfDoc) return;
    if (!item.allowPrint && !isAdmin) {
      showToast('Printing has been disabled by Administrator for this note.', 'info');
      return;
    }
    setPrinting(true);
    try {
      const images: string[] = [];
      for (let p = 1; p <= pdfDoc.numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const vp = page.getViewport({ scale: 1.8 });
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
        throw new Error('Unable to initialize print frame.');
      }
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>${item.chapterTitleEn}</title>
        <style>
          @page { size: A4; margin: 6mm; }
          body { margin: 0; background: #fff; }
          img { display: block; width: 100%; height: auto; page-break-after: always; }
          img:last-child { page-break-after: auto; }
        </style></head><body>
        ${images.map((src) => `<img src="${src}" />`).join('')}
        </body></html>`);
      doc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } finally {
          setTimeout(() => printFrame.remove(), 1500);
        }
      }, 350);
    } catch (err: any) {
      showToast(err?.message || 'Could not print PDF.', 'error');
    } finally {
      setPrinting(false);
    }
  };

  if (!open || !item) return null;

  const canDownload = item.allowDownload || isAdmin;
  const canPrint = item.allowPrint || isAdmin;
  const showMediumToggle = item.sourceType !== 'uploaded' && item.mediumSupport === 'bilingual';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/75 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 sm:rounded-2xl shadow-2xl flex flex-col w-full h-full max-w-6xl mx-auto overflow-hidden">
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
              <span>{item.subjectNameEn} ({item.subjectNameHi})</span>
              <span>·</span>
              <span>Chapter {item.chapterNumber}</span>
              {isAdmin && !item.isFree && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  Admin Preview
                </span>
              )}
            </div>
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
              {item.chapterTitleEn} · {item.chapterTitleHi}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showMediumToggle && (
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs">
                {(
                  [
                    ['both', 'Bilingual'],
                    ['en', 'English'],
                    ['hi', 'हिंदी'],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMedium(m)}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      medium === m
                        ? 'bg-indigo-700 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!canDownload || downloading || loading || Boolean(errorMsg)}
              title={canDownload ? 'Download PDF' : 'Download disabled by Admin'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{downloading ? 'Saving...' : 'Download'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={!canPrint || printing || loading || Boolean(errorMsg)}
              title={canPrint ? 'Print PDF' : 'Print disabled by Admin'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{printing ? 'Preparing...' : 'Print'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close PDF reader"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search + Page + Zoom Bar */}
        {!errorMsg && (
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
            {/* In-PDF Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[210px] max-w-md">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search inside PDF (text, formula, हिंदी)..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              {searchQuery.trim() && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                  <span className="tabular-nums">
                    {searchMatches.length > 0 ? `${activeMatchIdx + 1}/${searchMatches.length}` : '0 hits'}
                  </span>
                  {searchMatches.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleJumpMatch(-1)}
                        className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                        aria-label="Previous search match"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleJumpMatch(1)}
                        className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                        aria-label="Next search match"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Page & Zoom Controls */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 tabular-nums px-1">
                  Page {numPages > 0 ? currentPage : 0} / {numPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= numPages}
                  onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 w-11 text-center tabular-nums">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.min(2.4, Number((s + 0.15).toFixed(2))))}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Canvas Viewport */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-200/75 dark:bg-slate-950 p-3 sm:p-6 flex flex-col items-center"
        >
          {loading && (
            <div className="my-auto flex flex-col items-center gap-3 text-slate-600 dark:text-slate-300 py-16">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-700 dark:text-indigo-400" />
              <p className="text-xs font-medium">Loading PDF document securely from server...</p>
            </div>
          )}

          {!loading && errorMsg && (
            <div className="my-auto max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center space-y-4">
              {isLockedError ? (
                <Lock className="w-9 h-9 text-amber-600 mx-auto" />
              ) : (
                <FileText className="w-9 h-9 text-slate-400 mx-auto" />
              )}
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {isLockedError ? 'PDF Locked Until Payment Verification' : 'Unable to Open PDF'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{errorMsg}</p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {isLockedError && onSwitchToPromoCode && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSwitchToPromoCode(item);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 rounded-lg cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Enter Free Access Code</span>
                  </button>
                )}
                {isLockedError && onRequestUnlock && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRequestUnlock(item);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                  >
                    Pay ₹{item.priceInr} to Unlock
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {!loading && !errorMsg && pdfDoc && (
            <div className="relative bg-white shadow-lg border border-slate-300 dark:border-slate-700">
              <canvas ref={canvasRef} className="block" />
              <div ref={textLayerRef} className="ais-pdf-textlayer" />
            </div>
          )}
        </div>

        {/* Footer tip */}
        {!errorMsg && !loading && (
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>Tip: Select &amp; copy any text directly from the PDF page or use the search bar above.</span>
            <span>
              Download: {canDownload ? 'Allowed' : 'Disabled by Admin'} · Print:{' '}
              {canPrint ? 'Allowed' : 'Disabled by Admin'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
