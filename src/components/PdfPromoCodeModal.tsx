import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  KeyRound,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { PdfNoteItem } from '../types/index.ts';

interface PdfPromoCodeModalProps {
  open: boolean;
  item: PdfNoteItem | null;
  onClose: () => void;
  onUnlocked: () => Promise<void>;
  onOpenReader: (item: PdfNoteItem) => void;
  onSwitchToPay: (item: PdfNoteItem) => void;
}

export const PdfPromoCodeModal: React.FC<PdfPromoCodeModalProps> = ({
  open,
  item,
  onClose,
  onUnlocked,
  onOpenReader,
  onSwitchToPay,
}) => {
  const { getApiHeaders, showToast } = useApp();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const [unlockedSuccess, setUnlockedSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setCode('');
      setErrorMsg('');
      setRateLimited(false);
      setUnlockedSuccess(false);
    }
  }, [open, item?.id]);

  if (!open || !item) return null;

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim();
    if (!cleaned || submitting) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const headers = await getApiHeaders();
      const res = await fetch(`/api/pdf-library/${encodeURIComponent(item.id)}/redeem-code`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: cleaned }),
      });
      const data = await res.json();

      if (!res.ok) {
        setRateLimited(res.status === 429);
        setErrorMsg(
          data.error || 'Invalid Promo Code. PDF remains locked. Please try again.'
        );
        return;
      }

      setUnlockedSuccess(true);
      await onUnlocked();
      showToast(
        data.message || 'Access code verified! PDF unlocked for lifetime free access.',
        'success'
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to verify promo code on server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Server-Verified Free Access Code</span>
            </div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Ch {item.chapterNumber}: {item.chapterTitleEn}
            </h2>
            <p className="text-xs text-slate-500">
              {item.subjectNameEn} ({item.subjectNameHi})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close access code modal"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {unlockedSuccess ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Access Code Verified — PDF Unlocked Free!
                  </p>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    No payment required. Lifetime free access has been saved to your AI STUDENTS account.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenReader(item);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Read PDF Now</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitCode} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0" />
                <span>
                  Enter your official Free Access Code to unlock this chapter free on the server.
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Invalid Promo Code</p>
                    <p className="mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Free Access Code
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  disabled={rateLimited}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter Free Access Code"
                  className="w-full px-3.5 py-2.5 text-sm font-mono uppercase tracking-wider rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || rateLimited || !code.trim()}
                className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Verifying on Server...' : 'Verify & Unlock PDF Free'}
              </button>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Don&apos;t have a code?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchToPay(item);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg hover:bg-indigo-100 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Pay ₹{item.priceInr} to Unlock</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
