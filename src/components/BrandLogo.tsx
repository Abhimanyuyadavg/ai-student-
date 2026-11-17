import React from 'react';
import { Award, ShieldCheck, X } from 'lucide-react';
import { APP_ASSETS } from '../lib/assets.ts';
import { useApp } from '../context/AppContext.tsx';
import { AuthImage } from './ImageTools.tsx';

export const APP_OWNER_NAME = 'ABHIMANYU OFFICIAL HACKER';
export const APP_OWNER_ANSWER = 'AI STUDENTS के owner और founder ABHIMANYU OFFICIAL HACKER हैं।';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  compact?: boolean;
  showSubline?: boolean;
  surface?: 'default' | 'badge';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size,
  showText = true,
  subtitle,
  compact = false,
  showSubline = false,
  surface = 'default',
  className = '',
}) => {
  const { brandLogoUrl } = useApp();
  const resolvedLogoSrc = brandLogoUrl || APP_ASSETS.aiStudentsLogo;
  const effectiveSize = size ?? (compact ? 'sm' : 'md');
  const effectiveSubtitle = subtitle ?? (showSubline ? 'Board Examination AI Platform' : undefined);

  const iconDimensions =
    effectiveSize === 'xl'
      ? 'w-24 h-24 rounded-2xl p-1'
      : effectiveSize === 'lg'
      ? 'w-14 h-14 rounded-xl p-0.5'
      : effectiveSize === 'sm'
      ? 'w-9 h-9 rounded-lg p-0.5'
      : 'w-11 h-11 rounded-xl p-0.5';

  const textSize =
    effectiveSize === 'xl'
      ? 'text-3xl sm:text-4xl'
      : effectiveSize === 'lg'
      ? 'text-xl sm:text-2xl'
      : effectiveSize === 'sm'
      ? 'text-sm sm:text-base'
      : 'text-lg';

  const fallbackImg = (
    <img
      src={APP_ASSETS.aiStudentsLogo}
      alt="AI STUDENTS Official Logo"
      className="w-full h-full object-contain rounded-lg"
    />
  );

  const isBadgeSurface = surface === 'badge';

  return (
    <span
      className={`inline-flex items-center gap-2.5 select-none shrink-0 ${
        isBadgeSurface
          ? 'bg-white/95 border border-indigo-200/90 px-2.5 py-1.5 rounded-xl shadow-sm'
          : ''
      } ${className}`}
    >
      <span
        className={`${iconDimensions} inline-flex items-center justify-center bg-white border border-indigo-200/90 dark:border-indigo-700/80 shadow-sm shrink-0 overflow-hidden`}
      >
        <AuthImage
          src={resolvedLogoSrc}
          alt="AI STUDENTS Official Logo"
          className="w-full h-full object-contain rounded-lg"
          fallback={fallbackImg}
        />
      </span>

      {showText && (
        <span className="flex flex-col text-left leading-tight">
          <span
            className={`font-display ${textSize} font-extrabold tracking-tight whitespace-nowrap ${
              isBadgeSurface ? 'text-indigo-950' : 'text-indigo-900 dark:text-white'
            }`}
          >
            <span className={isBadgeSurface ? 'text-blue-700' : 'text-blue-700 dark:text-blue-300'}>
              AI
            </span>{' '}
            <span className={isBadgeSurface ? 'text-indigo-900' : 'text-indigo-800 dark:text-purple-300'}>
              STUDENTS
            </span>
          </span>
          {effectiveSubtitle && (
            <span
              className={`text-[10px] sm:text-[11px] font-semibold tracking-wide whitespace-nowrap ${
                isBadgeSurface ? 'text-slate-600' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {effectiveSubtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );
};

export const AboutAppModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div
        className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <BrandLogo size="lg" subtitle="Board Examination Learning Platform" />
          <button
            onClick={onClose}
            aria-label="Close about dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Award className="w-4 h-4 shrink-0 text-amber-500" />
            <span>Official App Ownership &amp; Brand</span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            App Name: AI STUDENTS · Owner: {APP_OWNER_NAME}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {APP_OWNER_ANSWER}
          </p>
        </div>

        <div className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            <strong className="text-slate-900 dark:text-white">AI STUDENTS</strong> provides Class 10, Class 11, and Class 12 learners across Bihar Board (BSEB), CBSE, ICSE/ISC, and State Boards with dedicated subject teaching, multi-format board tests, strict AI written-answer checking, and spaced revision planning.
          </p>
          <div className="flex items-start gap-2 pt-1 text-xs text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Academic Integrity Policy: Verified Board PYQs are strictly separated from AI-generated practice questions and never invent past exam years or guarantees.
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
