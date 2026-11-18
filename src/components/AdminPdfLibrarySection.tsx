import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  KeyRound,
  Lock,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { PdfReaderModal } from './PdfReaderModal.tsx';
import { PdfInvoiceModal } from './PdfCheckoutAndInvoiceModal.tsx';
import {
  PaymentGatewayPublicConfig,
  PdfAvailability,
  PdfClassId,
  PdfEntitlement,
  PdfMedium,
  PdfNoteItem,
  PdfPaymentOrder,
  PdfPromoUnlockRecord,
  PdfStreamId,
  PdfTaxConfig,
} from '../types/index.ts';

type AdminPdfSubTab = 'catalog' | 'orders' | 'promo' | 'entitlements' | 'tax';

export const AdminPdfLibrarySection: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const { getApiHeaders, showToast } = useApp();

  const [subTab, setSubTab] = useState<AdminPdfSubTab>('catalog');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PdfNoteItem[]>([]);
  const [orders, setOrders] = useState<PdfPaymentOrder[]>([]);
  const [promoUnlocks, setPromoUnlocks] = useState<PdfPromoUnlockRecord[]>([]);
  const [entitlements, setEntitlements] = useState<PdfEntitlement[]>([]);
  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayPublicConfig | null>(null);

  // Filters
  const [classFilter, setClassFilter] = useState<'all' | PdfClassId>('all');
  const [search, setSearch] = useState('');

  // Form state for Add / Edit PDF Chapter
  const [editingId, setEditingId] = useState<string | null>(null);
  const [classId, setClassId] = useState<PdfClassId>('class_10');
  const [streamId, setStreamId] = useState<PdfStreamId>('na');
  const [subjectKey, setSubjectKey] = useState('mathematics');
  const [subjectNameEn, setSubjectNameEn] = useState('');
  const [subjectNameHi, setSubjectNameHi] = useState('');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterTitleEn, setChapterTitleEn] = useState('');
  const [chapterTitleHi, setChapterTitleHi] = useState('');
  const [availability, setAvailability] = useState<PdfAvailability>('available');
  const [isFree, setIsFree] = useState(false);
  const [priceInr, setPriceInr] = useState(19);
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowPrint, setAllowPrint] = useState(true);
  const [mediumSupport, setMediumSupport] = useState<PdfMedium>('bilingual');
  const [published, setPublished] = useState(true);
  const [overviewEn, setOverviewEn] = useState('');
  const [overviewHi, setOverviewHi] = useState('');
  const [savingItem, setSavingItem] = useState(false);
  const [uploadingPdfId, setUploadingPdfId] = useState<string | null>(null);

  // Manual Grant Access state
  const [grantStudentId, setGrantStudentId] = useState('');
  const [grantStudentName, setGrantStudentName] = useState('');
  const [grantPdfId, setGrantPdfId] = useState('');

  // Tax & UPI Settings draft
  const [taxDraft, setTaxDraft] = useState<PdfTaxConfig | null>(null);
  const [savingTax, setSavingTax] = useState(false);

  // Reject reason drafts & preview
  const [rejectReasonByOrder, setRejectReasonByOrder] = useState<Record<string, string>>({});
  const [previewItem, setPreviewItem] = useState<PdfNoteItem | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<PdfPaymentOrder | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<PdfNoteItem | null>(null);

  const loadAdminPdfData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getApiHeaders();
      const reqHeaders: Record<string, string> = {};
      if (headers['Authorization']) reqHeaders['Authorization'] = headers['Authorization'];
      const res = await fetch('/api/admin/pdf-library', { headers: reqHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load PDF catalog & orders.');
      setItems(Array.isArray(data.items) ? data.items : []);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setPromoUnlocks(Array.isArray(data.promoUnlocks) ? data.promoUnlocks : []);
      setEntitlements(Array.isArray(data.entitlements) ? data.entitlements : []);
      if (data.config) {
        setGatewayConfig(data.config);
        setTaxDraft(data.config.taxConfig);
      }
      if (!grantPdfId && Array.isArray(data.items) && data.items.length > 0) {
        const firstAvail = data.items.find((x: PdfNoteItem) => x.availability === 'available');
        if (firstAvail) setGrantPdfId(firstAvail.id);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load PDF Library admin data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [getApiHeaders, grantPdfId, showToast]);

  useEffect(() => {
    loadAdminPdfData();
  }, [loadAdminPdfData]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((it) => classFilter === 'all' || it.classId === classFilter)
      .filter(
        (it) =>
          !q ||
          it.subjectNameEn.toLowerCase().includes(q) ||
          it.subjectNameHi.toLowerCase().includes(q) ||
          it.chapterTitleEn.toLowerCase().includes(q) ||
          it.chapterTitleHi.toLowerCase().includes(q)
      );
  }, [items, classFilter, search]);

  const pendingVerifyCount = orders.filter((o) => o.paymentStatus === 'awaiting_verification').length;

  const resetForm = () => {
    setEditingId(null);
    setSubjectNameEn('');
    setSubjectNameHi('');
    setChapterNumber(1);
    setChapterTitleEn('');
    setChapterTitleHi('');
    setAvailability('available');
    setIsFree(false);
    setPriceInr(19);
    setAllowDownload(true);
    setAllowPrint(true);
    setMediumSupport('bilingual');
    setPublished(true);
    setOverviewEn('');
    setOverviewHi('');
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingItem(true);
    try {
      const headers = await getApiHeaders();
      const existing = items.find((it) => it.id === editingId);
      const nextContent =
        overviewEn.trim() || overviewHi.trim()
          ? {
              en: {
                ...(existing?.content?.en || {
                  definitions: [],
                  formulas: [],
                  examNotes: [],
                  importantQA: [],
                  mcqs: [],
                }),
                overview: overviewEn.trim() || existing?.content?.en?.overview || chapterTitleEn.trim(),
              },
              hi: {
                ...(existing?.content?.hi || {
                  definitions: [],
                  formulas: [],
                  examNotes: [],
                  importantQA: [],
                  mcqs: [],
                }),
                overview: overviewHi.trim() || existing?.content?.hi?.overview || chapterTitleHi.trim(),
              },
            }
          : existing?.content;

      const res = await fetch('/api/admin/pdf-library', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: editingId || undefined,
          classId,
          streamId: classId === 'class_10' ? 'na' : streamId,
          subjectKey: subjectKey.trim() || undefined,
          subjectNameEn: subjectNameEn.trim(),
          subjectNameHi: subjectNameHi.trim() || subjectNameEn.trim(),
          chapterNumber: Number(chapterNumber) || 1,
          chapterTitleEn: chapterTitleEn.trim(),
          chapterTitleHi: chapterTitleHi.trim() || chapterTitleEn.trim(),
          availability,
          isFree,
          priceInr: isFree ? 0 : Math.max(1, Number(priceInr) || 19),
          allowDownload,
          allowPrint,
          mediumSupport,
          published,
          ...(nextContent ? { content: nextContent } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save PDF item.');
      setItems(data.items || []);
      resetForm();
      showToast(editingId ? 'PDF chapter updated.' : 'New PDF chapter added to catalog.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Save failed.', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  const quickPatchItem = async (item: PdfNoteItem, patch: Partial<PdfNoteItem>, msg: string) => {
    try {
      const headers = await getApiHeaders();
      const res = await fetch('/api/admin/pdf-library', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...item, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed.');
      setItems(data.items || []);
      showToast(msg, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Update failed.', 'error');
    }
  };

  const handleUploadPdfBinary = async (itemId: string, file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast('Please select a valid .pdf file.', 'error');
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      showToast('PDF file size must be under 16 MB.', 'error');
      return;
    }
    setUploadingPdfId(itemId);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read selected file.'));
        reader.readAsDataURL(file);
      });
      const headers = await getApiHeaders();
      const res = await fetch(`/api/admin/pdf-library/${encodeURIComponent(itemId)}/upload`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PDF binary upload failed.');
      setItems(data.items || []);
      showToast('Genuine PDF file uploaded & attached successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not upload PDF file.', 'error');
    } finally {
      setUploadingPdfId(null);
    }
  };

  const handleDeletePdf = async () => {
    if (!confirmDeleteItem || !isAdmin) return;
    try {
      const headers = await getApiHeaders();
      const res = await fetch(`/api/admin/pdf-library/${encodeURIComponent(confirmDeleteItem.id)}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed.');
      setItems(data.items || []);
      showToast(`Deleted "${confirmDeleteItem.chapterTitleEn}".`, 'info');
      setConfirmDeleteItem(null);
    } catch (err: any) {
      showToast(err?.message || 'Could not delete PDF.', 'error');
    }
  };

  const handleOrderDecision = async (orderId: string, decision: 'verify' | 'fail') => {
    if (!isAdmin) return;
    try {
      const headers = await getApiHeaders();
      const res = await fetch(`/api/admin/pdf-payments/${encodeURIComponent(orderId)}/decision`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          decision,
          reason: rejectReasonByOrder[orderId] || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed.');
      setOrders(data.orders || []);
      setEntitlements(data.entitlements || []);
      showToast(
        decision === 'verify'
          ? 'Payment verified! Lifetime PDF unlocked & Tax Invoice generated.'
          : 'Order marked failed. PDF remains locked.',
        decision === 'verify' ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast(err?.message || 'Could not process decision.', 'error');
    }
  };

  const handleGrantManualAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !grantStudentId.trim() || !grantPdfId) return;
    try {
      const headers = await getApiHeaders();
      const res = await fetch('/api/admin/pdf-payments/grant-access', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          studentId: grantStudentId.trim(),
          studentName: grantStudentName.trim() || grantStudentId.trim(),
          studentContact: grantStudentId.trim(),
          pdfId: grantPdfId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grant access failed.');
      setEntitlements(data.entitlements || []);
      setGrantStudentId('');
      setGrantStudentName('');
      showToast('Lifetime PDF access granted to student.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Grant failed.', 'error');
    }
  };

  const handleRevokeEntitlement = async (entId: string) => {
    if (!isAdmin) return;
    try {
      const headers = await getApiHeaders();
      const res = await fetch(`/api/admin/pdf-payments/entitlements/${encodeURIComponent(entId)}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revoke failed.');
      setEntitlements(data.entitlements || []);
      showToast('Student PDF access revoked.', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Revoke failed.', 'error');
    }
  };

  const handleSaveTaxConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !taxDraft) return;
    setSavingTax(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch('/api/admin/pdf-payments/tax-config', {
        method: 'PUT',
        headers,
        body: JSON.stringify(taxDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save tax settings.');
      setTaxDraft(data.taxConfig);
      if (data.config) setGatewayConfig(data.config);
      showToast('Tax & Guardian UPI Gateway configuration saved.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not save tax settings.', 'error');
    } finally {
      setSavingTax(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['catalog', `PDF Catalog & Uploads (${items.length})`],
              ['orders', `Payment Verification (${pendingVerifyCount} pending)`],
              ['promo', `Promo Unlocks (${promoUnlocks.length})`],
              ['entitlements', `Unlocked Access (${entitlements.length})`],
              ['tax', 'GST Tax & UPI Config'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                subTab === id
                  ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={loadAdminPdfData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh PDF Studio</span>
        </button>
      </div>

      {/* 1. CATALOG & UPLOAD MANAGER */}
      {subTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form */}
          <form
            onSubmit={handleSaveChapter}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FilePlus2 className="w-4 h-4 text-indigo-700" />
                <span>{editingId ? 'Edit PDF Chapter' : 'Add New Chapter PDF'}</span>
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Class</label>
                <select
                  value={classId}
                  onChange={(e) => {
                    const nextCls = e.target.value as PdfClassId;
                    setClassId(nextCls);
                    if (nextCls === 'class_10') setStreamId('na');
                    else if (streamId === 'na') setStreamId('science');
                  }}
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="class_10">Class 10th</option>
                  <option value="class_11">Class 11th</option>
                  <option value="class_12">Class 12th</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Stream</label>
                <select
                  disabled={classId === 'class_10'}
                  value={classId === 'class_10' ? 'na' : streamId}
                  onChange={(e) => setStreamId(e.target.value as PdfStreamId)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
                >
                  <option value="na">Core / Class 10</option>
                  <option value="science">Science</option>
                  <option value="commerce">Commerce</option>
                  <option value="arts">Arts / Humanities</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                required
                value={subjectNameEn}
                onChange={(e) => {
                  setSubjectNameEn(e.target.value);
                  if (!editingId) {
                    setSubjectKey(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '_')
                        .replace(/^_|_$/g, '')
                    );
                  }
                }}
                placeholder="Subject Name (English)"
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                type="text"
                value={subjectNameHi}
                onChange={(e) => setSubjectNameHi(e.target.value)}
                placeholder="विषय का नाम (हिंदी)"
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min={1}
                value={chapterNumber}
                onChange={(e) => setChapterNumber(Number(e.target.value))}
                placeholder="Ch #"
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as PdfAvailability)}
                className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="available">Available Now</option>
                <option value="coming_soon">Coming Soon</option>
              </select>
              <select
                value={mediumSupport}
                onChange={(e) => setMediumSupport(e.target.value as PdfMedium)}
                className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="bilingual">Bilingual</option>
                <option value="hindi">Hindi Only</option>
                <option value="english">English Only</option>
              </select>
            </div>

            <input
              type="text"
              required
              value={chapterTitleEn}
              onChange={(e) => setChapterTitleEn(e.target.value)}
              placeholder="Chapter Title (English)"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              value={chapterTitleHi}
              onChange={(e) => setChapterTitleHi(e.target.value)}
              placeholder="अध्याय का नाम (हिंदी)"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />

            <textarea
              rows={2}
              value={overviewEn}
              onChange={(e) => setOverviewEn(e.target.value)}
              placeholder="Short English overview (used in auto-generated PDF)..."
              className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <textarea
              rows={2}
              value={overviewHi}
              onChange={(e) => setOverviewHi(e.target.value)}
              placeholder="संक्षिप्त हिंदी सारांश (optional)..."
              className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs">
              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="accent-indigo-700"
                />
                <span>Free PDF (₹0)</span>
              </label>
              <div>
                <label className="text-[11px] text-slate-500 mr-2">Price ₹</label>
                <input
                  type="number"
                  min={1}
                  disabled={isFree}
                  value={isFree ? 0 : priceInr}
                  onChange={(e) => setPriceInr(Number(e.target.value))}
                  className="w-20 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="accent-indigo-700"
                />
                <span>Allow Download</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPrint}
                  onChange={(e) => setAllowPrint(e.target.checked)}
                  className="accent-indigo-700"
                />
                <span>Allow Print</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer col-span-2">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="accent-indigo-700"
                />
                <span>Published in Student Library</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={savingItem}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
            >
              {savingItem ? 'Saving...' : editingId ? 'Save Chapter Changes' : 'Add Chapter to PDF Library'}
            </button>
          </form>

          {/* Catalog List */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Manage PDFs ({filteredItems.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="all">All Classes</option>
                  <option value="class_10">Class 10th</option>
                  <option value="class_11">Class 11th</option>
                  <option value="class_12">Class 12th</option>
                </select>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter subject or chapter..."
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[680px] overflow-y-auto pr-1">
              {filteredItems.map((it) => (
                <div key={it.id} className="py-3.5 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                        <span className="uppercase text-indigo-700 dark:text-indigo-400">
                          {it.classId.replace('_', ' ')}
                        </span>
                        <span>·</span>
                        <span>{it.subjectNameEn}</span>
                        <span>· Ch {it.chapterNumber}</span>
                        <span>·</span>
                        <span
                          className={
                            it.availability === 'available' ? 'text-emerald-700' : 'text-amber-600'
                          }
                        >
                          {it.availability === 'available' ? 'Available' : 'Coming Soon'}
                        </span>
                        <span>·</span>
                        <span className="font-mono">
                          {it.isFree ? 'FREE' : `₹${it.priceInr}`}
                        </span>
                        <span>·</span>
                        <span className="text-slate-500">
                          {it.sourceType === 'uploaded' ? 'Uploaded PDF' : 'Generated Bilingual PDF'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {it.chapterTitleEn} · {it.chapterTitleHi}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {it.availability === 'available' && (
                        <button
                          type="button"
                          onClick={() => setPreviewItem(it)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                      )}

                      <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md cursor-pointer hover:bg-slate-50">
                        <Upload className="w-3 h-3" />
                        <span>{uploadingPdfId === it.id ? 'Uploading...' : 'Upload .PDF'}</span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadPdfBinary(it.id, f);
                            e.target.value = '';
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(it.id);
                          setClassId(it.classId);
                          setStreamId(it.streamId);
                          setSubjectKey(it.subjectKey);
                          setSubjectNameEn(it.subjectNameEn);
                          setSubjectNameHi(it.subjectNameHi);
                          setChapterNumber(it.chapterNumber);
                          setChapterTitleEn(it.chapterTitleEn);
                          setChapterTitleHi(it.chapterTitleHi);
                          setAvailability(it.availability);
                          setIsFree(it.isFree);
                          setPriceInr(it.priceInr || 19);
                          setAllowDownload(it.allowDownload);
                          setAllowPrint(it.allowPrint);
                          setMediumSupport(it.mediumSupport);
                          setPublished(it.published);
                          setOverviewEn(it.content?.en?.overview || '');
                          setOverviewHi(it.content?.hi?.overview || '');
                        }}
                        aria-label={`Edit ${it.chapterTitleEn}`}
                        className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteItem(it)}
                          aria-label={`Delete ${it.chapterTitleEn}`}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick toggles */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        quickPatchItem(
                          it,
                          { availability: it.availability === 'available' ? 'coming_soon' : 'available' },
                          `Marked "${it.chapterTitleEn}" as ${
                            it.availability === 'available' ? 'Coming Soon' : 'Available'
                          }.`
                        )
                      }
                      className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Toggle {it.availability === 'available' ? 'Coming Soon' : 'Available'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        quickPatchItem(
                          it,
                          { isFree: !it.isFree, priceInr: !it.isFree ? 0 : it.priceInr || 19 },
                          `Updated pricing for "${it.chapterTitleEn}".`
                        )
                      }
                      className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Switch to {it.isFree ? '₹19 Premium' : 'Free'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        quickPatchItem(
                          it,
                          { allowDownload: !it.allowDownload },
                          `Download ${!it.allowDownload ? 'enabled' : 'disabled'}.`
                        )
                      }
                      className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Download: {it.allowDownload ? 'On' : 'Off'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        quickPatchItem(
                          it,
                          { allowPrint: !it.allowPrint },
                          `Print ${!it.allowPrint ? 'enabled' : 'disabled'}.`
                        )
                      }
                      className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Print: {it.allowPrint ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. GUARDIAN / SERVER PAYMENT VERIFICATION */}
      {subTab === 'orders' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Guardian &amp; Server Payment Verification Queue ({orders.length})
            </h2>
            <p className="text-xs text-slate-500">
              Verify real UPI UTR / bank credits before unlocking any paid PDF. Failed or unverified payments remain strictly locked on the backend.
            </p>
          </div>

          {orders.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No student PDF orders submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {ord.orderNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            ord.paymentStatus === 'verified'
                              ? 'bg-emerald-50 text-emerald-700'
                              : ord.paymentStatus === 'awaiting_verification'
                              ? 'bg-amber-50 text-amber-800'
                              : ord.paymentStatus === 'failed'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ord.paymentStatus}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          ₹{ord.totalAmount.toFixed(2)}
                        </span>
                        <span className="text-slate-500">
                          (Base ₹{ord.baseAmount.toFixed(2)} + GST ₹{ord.taxAmount.toFixed(2)})
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {ord.pdfTitle} · {ord.subjectName}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        Student: <strong>{ord.studentName}</strong> ({ord.studentContact})
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        UTR / Ref: <span className="font-mono font-bold">{ord.utrNumber || ord.gatewayPaymentId || 'Not submitted yet'}</span>
                        {ord.payerName ? ` · Payer: ${ord.payerName}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ord.paymentStatus === 'verified' ? (
                        <button
                          type="button"
                          onClick={() => setInvoiceOrder(ord)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-300 rounded-lg cursor-pointer"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Invoice {ord.invoiceNumber}</span>
                        </button>
                      ) : isAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOrderDecision(ord.id, 'verify')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify &amp; Unlock PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOrderDecision(ord.id, 'fail')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-300 rounded-lg hover:bg-rose-50 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Mark Failed (Keep Locked)</span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {isAdmin && ord.paymentStatus !== 'verified' && (
                    <input
                      type="text"
                      value={rejectReasonByOrder[ord.id] || ''}
                      onChange={(e) =>
                        setRejectReasonByOrder((prev) => ({ ...prev, [ord.id]: e.target.value }))
                      }
                      placeholder="Optional rejection / failure note (shown to student if marked failed)..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2B. SEPARATED PROMO CODE UNLOCKS LOG */}
      {subTab === 'promo' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <span>Free Access Code Unlocks ({promoUnlocks.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Separated audit log of PDFs unlocked using the backend Free Access Code environment secret (₹0 paid, no secret code values persisted).
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                gatewayConfig?.promoCodeEnabled
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
              }`}
            >
              {gatewayConfig?.promoCodeEnabled ? 'Backend Env Secret: Active' : 'Backend Env Secret: Not Configured'}
            </span>
          </div>

          {promoUnlocks.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              No Free Access Code unlocks recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {promoUnlocks.map((rec) => (
                <div key={rec.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold">
                        Free Access Code (₹0)
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{rec.pdfTitle}</span>
                    </div>
                    <p className="text-slate-500">
                      Student: <strong>{rec.studentName || rec.studentId}</strong> ({rec.studentContact || rec.studentId}) · {rec.subjectName} · Unlocked:{' '}
                      {new Date(rec.unlockedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">
                    {rec.classId.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. STUDENT PDF ACCESS ENTITLEMENTS */}
      {subTab === 'entitlements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {isAdmin && (
            <form
              onSubmit={handleGrantManualAccess}
              className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 h-fit"
            >
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Unlock className="w-4 h-4 text-indigo-700" />
                <span>Grant Lifetime PDF Access</span>
              </h2>
              <input
                type="text"
                required
                value={grantStudentId}
                onChange={(e) => setGrantStudentId(e.target.value)}
                placeholder="Student UID or User ID *"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                type="text"
                value={grantStudentName}
                onChange={(e) => setGrantStudentName(e.target.value)}
                placeholder="Student Display Name"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <select
                value={grantPdfId}
                onChange={(e) => setGrantPdfId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {items
                  .filter((it) => it.availability === 'available')
                  .map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.classId.toUpperCase()} · {it.subjectNameEn} Ch {it.chapterNumber}: {it.chapterTitleEn}
                    </option>
                  ))}
              </select>
              <button
                type="submit"
                className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
              >
                Grant Free Lifetime Unlock
              </button>
            </form>
          )}

          <div
            className={`${
              isAdmin ? 'lg:col-span-8' : 'lg:col-span-12'
            } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3`}
          >
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Active Student PDF Entitlements ({entitlements.length})
            </h2>
            {entitlements.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No unlocked entitlements yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {entitlements.map((ent) => (
                  <div key={ent.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {ent.pdfTitle || ent.pdfId}
                        </p>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            ent.unlockSource === 'promo_code'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : ent.unlockSource === 'admin_grant'
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                          }`}
                        >
                          {ent.unlockSource === 'promo_code'
                            ? 'Promo Code'
                            : ent.unlockSource === 'admin_grant'
                            ? 'Admin Grant'
                            : 'Paid Order'}
                        </span>
                      </div>
                      <p className="text-slate-500">
                        Student: {ent.studentName || ent.studentId} · Ref: <span className="font-mono">{ent.invoiceNumber}</span> · Paid: ₹{ent.amountPaid}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRevokeEntitlement(ent.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-700 border border-rose-200 rounded-md hover:bg-rose-50 cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. STATUTORY GST TAX & GUARDIAN UPI CONFIG */}
      {subTab === 'tax' && taxDraft && (
        <form
          onSubmit={handleSaveTaxConfig}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-2xl space-y-4"
        >
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Statutory GST Tax &amp; Official UPI Settings
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-2 font-semibold col-span-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={taxDraft.taxEnabled}
                onChange={(e) => setTaxDraft({ ...taxDraft, taxEnabled: e.target.checked })}
                className="accent-indigo-700"
              />
              <span>Enable Itemized GST Breakdown on Checkout &amp; Tax Invoices</span>
            </label>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">GST Slab (%)</label>
              <select
                disabled={!isAdmin}
                value={taxDraft.gstRatePercent}
                onChange={(e) => setTaxDraft({ ...taxDraft, gstRatePercent: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value={0}>0% (GST Exempt Educational Notes)</option>
                <option value={5}>5% GST (2.5% CGST + 2.5% SGST)</option>
                <option value={12}>12% GST (6% CGST + 6% SGST)</option>
                <option value={18}>18% GST (9% CGST + 9% SGST)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Tax Mode</label>
              <select
                disabled={!isAdmin}
                value={taxDraft.taxMode}
                onChange={(e) =>
                  setTaxDraft({ ...taxDraft, taxMode: e.target.value as 'inclusive' | 'exclusive' })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="inclusive">Inclusive inside ₹19 price (₹19 total)</option>
                <option value="exclusive">Exclusive (GST added on top of base price)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Official UPI ID</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={taxDraft.upiId}
                onChange={(e) => setTaxDraft({ ...taxDraft, upiId: e.target.value })}
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Official Support Phone</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={taxDraft.supportPhone}
                onChange={(e) => setTaxDraft({ ...taxDraft, supportPhone: e.target.value })}
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Supplier / Legal Name</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={taxDraft.sellerLegalName}
                onChange={(e) => setTaxDraft({ ...taxDraft, sellerLegalName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={taxDraft.sellerGstin}
                onChange={(e) => setTaxDraft({ ...taxDraft, sellerGstin: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                Free Access Code Security Status:{' '}
                {gatewayConfig?.promoCodeEnabled
                  ? 'Active via Backend Environment Variable (PDF_FREE_ACCESS_CODE)'
                  : 'Not Set in Backend Environment'}
              </span>
            </p>
            <p className="text-[11px] text-slate-500">
              For security, the Free Access Code is verified solely on the backend via <span className="font-mono">process.env.PDF_FREE_ACCESS_CODE</span> and is never stored in frontend source code or API responses.
            </p>
          </div>

          {isAdmin && (
            <button
              type="submit"
              disabled={savingTax}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
            >
              {savingTax ? 'Saving...' : 'Save Tax & UPI Configuration'}
            </button>
          )}
        </form>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-rose-700">Delete PDF Entry?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Permanently remove <strong>{confirmDeleteItem.chapterTitleEn}</strong> from the PDF catalog? Existing server uploaded binary (if any) will also be removed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteItem(null)}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePdf}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      <PdfReaderModal
        open={Boolean(previewItem)}
        item={previewItem}
        isAdmin={true}
        onClose={() => setPreviewItem(null)}
      />

      <PdfInvoiceModal
        open={Boolean(invoiceOrder)}
        order={invoiceOrder}
        gatewayConfig={gatewayConfig}
        onClose={() => setInvoiceOrder(null)}
      />
    </div>
  );
};
