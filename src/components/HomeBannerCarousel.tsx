import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  HelpCircle,
  Pause,
  Play,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { HomeBanner } from '../types/index.ts';
import { PERSONAL_PHOTO_THUMBS_UP, resolveBannerImageUrl } from '../data/seedBanners.ts';
import { AuthImage } from './ImageTools.tsx';
import { BrandLogo } from './BrandLogo.tsx';

function parseBannerSubtitle(banner: HomeBanner): {
  primarySubtitle: string;
  boardLine?: string;
  highlightsLine?: string;
} {
  const raw = (banner.subtitle || '').trim();
  if (!raw) {
    return { primarySubtitle: '' };
  }
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] || '';
  let primarySubtitle = firstLine;
  let boardLine: string | undefined;

  if (firstLine.includes('|')) {
    const parts = firstLine.split('|').map((p) => p.trim());
    primarySubtitle = parts[0] || '';
    boardLine = parts[1] || undefined;
  }

  const highlightsLine = lines[1] || undefined;
  return { primarySubtitle, boardLine, highlightsLine };
}

type BannerLayoutVariant = 'welcome' | 'ai-teacher' | 'subjects' | 'tests' | 'planner';

function resolveLayoutVariant(banner: HomeBanner): BannerLayoutVariant {
  if (banner.accentTheme === 'indigo-gold') return 'ai-teacher';
  if (banner.accentTheme === 'cobalt-subjects') return 'subjects';
  if (banner.accentTheme === 'royal-amber') return 'tests';
  if (banner.accentTheme === 'violet-blue') return 'planner';
  if (banner.accentTheme === 'blue-purple') return 'welcome';
  if (banner.id === 'banner_ai_teacher') return 'ai-teacher';
  if (banner.id === 'banner_complete_learning') return 'subjects';
  if (banner.id === 'banner_smart_tests' || banner.id === 'banner_board_exam') return 'tests';
  if (banner.id === 'banner_study_planner' || banner.id === 'banner_success') return 'planner';
  return 'welcome';
}

const AiRobotGraphic: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 88 88" className={className} aria-hidden="true">
    <rect x="18" y="24" width="52" height="40" rx="14" fill="#2563EB" />
    <rect x="24" y="31" width="40" height="22" rx="8" fill="#0F172A" />
    <circle cx="36" cy="42" r="4.5" fill="#38BDF8" />
    <circle cx="52" cy="42" r="4.5" fill="#38BDF8" />
    <path d="M35 49 Q44 54 53 49" stroke="#FBBF24" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <line x1="44" y1="12" x2="44" y2="24" stroke="#4F46E5" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="44" cy="10" r="5" fill="#F59E0B" />
    <rect x="10" y="38" width="8" height="14" rx="4" fill="#7C3AED" />
    <rect x="70" y="38" width="8" height="14" rx="4" fill="#7C3AED" />
    <rect x="30" y="66" width="28" height="10" rx="5" fill="#4F46E5" />
  </svg>
);

const BooksAndNotebookGraphic: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 116 92" className={className} aria-hidden="true">
    <rect x="10" y="58" width="70" height="15" rx="3" fill="#1D4ED8" />
    <rect x="14" y="61" width="62" height="8" rx="1.5" fill="#EFF6FF" />
    <rect x="16" y="43" width="64" height="15" rx="3" fill="#7C3AED" />
    <rect x="20" y="46" width="56" height="8" rx="1.5" fill="#F5F3FF" />
    <rect x="24" y="28" width="56" height="15" rx="3" fill="#F59E0B" />
    <rect x="28" y="31" width="48" height="8" rx="1.5" fill="#FEF3C7" />
    <rect x="70" y="14" width="36" height="48" rx="5" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="2" />
    <line x1="77" y1="25" x2="99" y2="25" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="77" y1="34" x2="99" y2="34" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    <line x1="77" y1="43" x2="93" y2="43" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    <circle cx="96" cy="52" r="4" fill="#10B981" />
  </svg>
);

const ExamAndTrophyGraphic: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 116 92" className={className} aria-hidden="true">
    {/* Exam paper */}
    <rect x="12" y="16" width="52" height="64" rx="6" fill="#FFFFFF" stroke="#FBBF24" strokeWidth="2" />
    <rect x="20" y="25" width="26" height="5" rx="2" fill="#1E3A8A" />
    <circle cx="24" cy="40" r="3" fill="#10B981" />
    <line x1="31" y1="40" x2="54" y2="40" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="24" cy="52" r="3" fill="#10B981" />
    <line x1="31" y1="52" x2="54" y2="52" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="24" cy="64" r="3" fill="#F59E0B" />
    <line x1="31" y1="64" x2="48" y2="64" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
    {/* Golden Trophy */}
    <path d="M72 28 H98 V40 C98 48 92 54 85 54 C78 54 72 48 72 40 Z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
    <path d="M72 32 H65 C65 40 68 44 72 44" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M98 32 H105 C105 40 102 44 98 44" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="82" y="54" width="6" height="12" fill="#F59E0B" />
    <rect x="74" y="66" width="22" height="7" rx="2" fill="#FDE047" />
    {/* Star */}
    <circle cx="85" cy="18" r="6" fill="#38BDF8" />
    <text x="85" y="21.5" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#FFFFFF">?</text>
  </svg>
);

const PlannerAndProgressGraphic: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 120 92" className={className} aria-hidden="true">
    {/* Rising Chart Card */}
    <rect x="8" y="14" width="66" height="64" rx="9" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.34)" strokeWidth="1.5" />
    <rect x="17" y="48" width="9" height="18" rx="2.5" fill="#93C5FD" />
    <rect x="30" y="40" width="9" height="26" rx="2.5" fill="#C4B5FD" />
    <rect x="43" y="30" width="9" height="36" rx="2.5" fill="#FDE047" />
    <rect x="56" y="22" width="9" height="44" rx="2.5" fill="#34D399" />
    <path d="M18 40 L34 32 L48 24 L61 16" stroke="#FBBF24" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <circle cx="61" cy="16" r="3.5" fill="#FBBF24" />
    {/* Calendar tile */}
    <rect x="78" y="26" width="34" height="38" rx="6" fill="#FFFFFF" stroke="#C4B5FD" strokeWidth="2" />
    <rect x="78" y="26" width="34" height="11" rx="4" fill="#7C3AED" />
    <circle cx="87" cy="45" r="2.5" fill="#4F46E5" />
    <circle cx="95" cy="45" r="2.5" fill="#10B981" />
    <circle cx="103" cy="45" r="2.5" fill="#4F46E5" />
    <circle cx="87" cy="54" r="2.5" fill="#94A3B8" />
    <circle cx="95" cy="54" r="2.5" fill="#F59E0B" />
    <circle cx="103" cy="54" r="2.5" fill="#10B981" />
  </svg>
);

export const HomeBannerCard: React.FC<{
  banner: HomeBanner;
  onAction?: (banner: HomeBanner) => void;
  previewMode?: boolean;
  priority?: boolean;
}> = ({ banner, onAction, previewMode = false, priority = false }) => {
  const imageSrc = resolveBannerImageUrl(banner) || PERSONAL_PHOTO_THUMBS_UP;
  const { primarySubtitle, boardLine, highlightsLine } = parseBannerSubtitle(banner);
  const layout = resolveLayoutVariant(banner);

  const handleClick = () => {
    if (previewMode || !onAction) return;
    onAction(banner);
  };

  const photoElement = (frameClass: string) => (
    <div className={`relative overflow-hidden select-none ${frameClass}`}>
      <AuthImage
        src={imageSrc}
        alt={`${banner.title} — AI STUDENTS`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className="w-full h-full object-contain object-bottom"
        fallback={
          <img
            src={PERSONAL_PHOTO_THUMBS_UP}
            alt="AI STUDENTS presenter"
            className="w-full h-full object-contain object-bottom"
          />
        }
      />
    </div>
  );

  // THUMBNAIL 1 – WELCOME TO AI STUDENTS (Blue & Purple Gradient, Photo Right, Official Logo Top-Left)
  if (layout === 'welcome') {
    return (
      <div
        onClick={handleClick}
        role={previewMode ? undefined : 'button'}
        tabIndex={previewMode ? undefined : 0}
        onKeyDown={(e) => {
          if (!previewMode && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 text-white border border-indigo-500/40 shadow-sm md:aspect-[16/9] md:max-h-[480px] ${
          previewMode ? '' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-600'
        }`}
      >
        <div className="h-full grid grid-cols-1 md:grid-cols-12 items-stretch">
          <div className="md:col-span-7 p-5 sm:p-7 lg:p-9 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <BrandLogo size="sm" surface="badge" />
                <span className="text-[11px] font-semibold text-blue-100 tracking-wide">
                  Class 10 · 11 · 12 Learning Platform
                </span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.1] [text-wrap:balance]">
                {banner.title}
              </h3>

              {primarySubtitle && (
                <p className="text-sm sm:text-lg font-semibold text-blue-50">
                  {primarySubtitle}
                </p>
              )}

              {highlightsLine && (
                <p className="text-xs sm:text-sm font-bold text-amber-300 tracking-wide">
                  {highlightsLine}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-indigo-950 bg-white hover:bg-amber-50 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{banner.ctaLabel}</span>
                <ArrowRight className="w-4 h-4 text-indigo-700 shrink-0" />
              </button>
              <span className="text-xs font-medium text-blue-100/95 hidden sm:inline">
                BSEB · CBSE · ICSE · State Boards
              </span>
            </div>
          </div>

          <div className="md:col-span-5 relative flex items-end justify-center px-5 pt-3 md:pt-5">
            <BooksAndNotebookGraphic className="hidden sm:block w-24 h-20 absolute top-4 left-2 opacity-90 pointer-events-none" />
            {photoElement(
              'w-56 sm:w-64 md:w-full max-w-[290px] h-56 sm:h-64 md:h-[90%] bg-white rounded-t-3xl border-x-4 border-t-4 border-white/95 shadow-lg pt-2'
            )}
          </div>
        </div>
      </div>
    );
  }

  // THUMBNAIL 2 – YOUR PERSONAL AI TEACHER (Light Azure & Indigo Split, AI Robot & Books + Photo Left)
  if (layout === 'ai-teacher') {
    return (
      <div
        onClick={handleClick}
        role={previewMode ? undefined : 'button'}
        tabIndex={previewMode ? undefined : 0}
        onKeyDown={(e) => {
          if (!previewMode && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-indigo-950 dark:to-purple-950 text-slate-900 dark:text-white border border-indigo-200 dark:border-indigo-800 shadow-sm md:aspect-[16/9] md:max-h-[480px] ${
          previewMode ? '' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-600'
        }`}
      >
        <div className="h-full grid grid-cols-1 md:grid-cols-12 items-stretch">
          <div className="md:col-span-5 order-2 md:order-1 relative flex items-end justify-center px-5 pt-3 md:pt-5 bg-gradient-to-t from-indigo-100/75 via-transparent to-transparent dark:from-indigo-900/40">
            <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl p-1.5 shadow-sm z-10">
              <AiRobotGraphic className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div className="hidden sm:flex absolute bottom-4 right-3 items-center gap-1.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-indigo-700 rounded-xl px-2.5 py-2 shadow-sm z-10">
              <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-300" />
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">Books &amp; AI</span>
            </div>
            {photoElement(
              'w-56 sm:w-64 md:w-full max-w-[285px] h-56 sm:h-64 md:h-[90%] bg-white rounded-t-full border-4 border-b-0 border-indigo-200 dark:border-indigo-700 shadow-md pt-3'
            )}
          </div>

          <div className="md:col-span-7 order-1 md:order-2 p-5 sm:p-7 lg:p-9 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <BrandLogo size="sm" surface="badge" />
                <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <Bot className="w-3.5 h-3.5 shrink-0" />
                  <span>Voice &amp; Photo Doubt Solver</span>
                </span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] [text-wrap:balance]">
                {banner.title}
              </h3>

              {primarySubtitle && (
                <p className="text-sm sm:text-lg font-semibold text-slate-700 dark:text-slate-200">
                  {primarySubtitle}
                </p>
              )}

              {highlightsLine && (
                <p className="text-xs sm:text-sm font-bold text-indigo-700 dark:text-amber-300">
                  {highlightsLine}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{banner.ctaLabel}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                10-Step Guided Teaching
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // THUMBNAIL 3 – COMPLETE CHAPTER-WISE LEARNING (Cobalt Blue Gradient, Books/Notebooks, All Class 10 & 11-12 Subjects)
  if (layout === 'subjects') {
    return (
      <div
        onClick={handleClick}
        role={previewMode ? undefined : 'button'}
        tabIndex={previewMode ? undefined : 0}
        onKeyDown={(e) => {
          if (!previewMode && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-800 via-indigo-800 to-cyan-800 text-white border border-blue-500/40 shadow-sm md:aspect-[16/9] md:max-h-[480px] ${
          previewMode ? '' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-300'
        }`}
      >
        <div className="h-full grid grid-cols-1 md:grid-cols-12 items-stretch">
          <div className="md:col-span-7 p-5 sm:p-7 lg:p-9 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <BrandLogo size="sm" surface="badge" />
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-200">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>13-Section Chapter Modules</span>
                </span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.1] [text-wrap:balance]">
                {banner.title}
              </h3>

              <div className="space-y-1.5">
                {primarySubtitle && (
                  <p className="text-xs sm:text-base font-bold text-amber-300 leading-snug">
                    {primarySubtitle}
                  </p>
                )}
                {highlightsLine && (
                  <p className="text-xs sm:text-sm font-medium text-blue-100 leading-relaxed">
                    {highlightsLine}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-blue-950 bg-white hover:bg-cyan-50 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{banner.ctaLabel}</span>
                <ArrowRight className="w-4 h-4 text-blue-700 shrink-0" />
              </button>
              <span className="text-xs text-cyan-100 hidden sm:inline">
                Notes · Formulas · Examples
              </span>
            </div>
          </div>

          <div className="md:col-span-5 relative flex items-end justify-center px-5 pt-3 md:pt-5">
            <div className="hidden sm:block absolute top-4 left-2 bg-white/95 rounded-xl p-1.5 shadow-md z-10">
              <BooksAndNotebookGraphic className="w-20 h-16" />
            </div>
            {photoElement(
              'w-56 sm:w-64 md:w-full max-w-[285px] h-56 sm:h-64 md:h-[90%] bg-white rounded-t-3xl border-x-4 border-t-4 border-cyan-200/95 shadow-lg pt-2'
            )}
          </div>
        </div>
      </div>
    );
  }

  // THUMBNAIL 4 – PRACTISE • TEST • IMPROVE (Royal Navy & Gold, Exam Paper, Trophy & Question Icons)
  if (layout === 'tests') {
    return (
      <div
        onClick={handleClick}
        role={previewMode ? undefined : 'button'}
        tabIndex={previewMode ? undefined : 0}
        onKeyDown={(e) => {
          if (!previewMode && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white border border-blue-700/60 shadow-sm md:aspect-[16/9] md:max-h-[480px] ${
          previewMode ? '' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400'
        }`}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-blue-500 to-indigo-500" />
        <div className="h-full grid grid-cols-1 md:grid-cols-12 items-stretch">
          <div className="md:col-span-7 p-5 sm:p-7 lg:p-9 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <BrandLogo size="sm" surface="badge" />
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
                  <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>All Selected Subjects Tested</span>
                </span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.1] [text-wrap:balance]">
                {banner.title}
              </h3>

              <div className="space-y-1.5">
                {primarySubtitle && (
                  <p className="text-xs sm:text-base font-bold text-amber-300 leading-snug">
                    {primarySubtitle}
                  </p>
                )}
                {boardLine && (
                  <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
                    {boardLine}
                  </p>
                )}
                {highlightsLine && (
                  <p className="text-xs sm:text-sm font-medium text-blue-100 leading-relaxed">
                    {highlightsLine}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{banner.ctaLabel}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
              <span className="inline-flex items-center gap-1 text-xs text-blue-200 hidden sm:inline-flex">
                <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>AI Answer Evaluation</span>
              </span>
            </div>
          </div>

          <div className="md:col-span-5 relative flex items-center justify-center p-4 sm:p-6">
            <ExamAndTrophyGraphic className="hidden sm:block w-28 h-24 absolute bottom-3 left-2 z-10 pointer-events-none drop-shadow-md" />
            {photoElement(
              'w-56 sm:w-64 md:w-full max-w-[275px] h-56 sm:h-64 md:h-[88%] bg-white rounded-2xl border-2 border-amber-300/90 shadow-xl p-1'
            )}
          </div>
        </div>
      </div>
    );
  }

  // THUMBNAIL 5 – PLAN YOUR STUDY, TRACK YOUR PROGRESS (Purple & Sapphire Showcase, Calendar, Progress Chart & Trophy)
  return (
    <div
      onClick={handleClick}
      role={previewMode ? undefined : 'button'}
      tabIndex={previewMode ? undefined : 0}
      onKeyDown={(e) => {
        if (!previewMode && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-800 via-indigo-800 to-blue-800 text-white border border-purple-500/40 shadow-sm md:aspect-[16/9] md:max-h-[480px] ${
        previewMode ? '' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-300'
      }`}
    >
      <div className="h-full grid grid-cols-1 md:grid-cols-12 items-stretch">
        <div className="md:col-span-5 order-2 md:order-1 relative flex items-center justify-center p-4 sm:p-6">
          <div className="absolute top-3.5 left-3.5 bg-white/95 text-indigo-900 rounded-xl p-2 shadow-md z-10 flex items-center gap-1.5">
            <Award className="w-5 h-5 text-amber-500 shrink-0" />
            <GraduationCap className="w-5 h-5 text-indigo-700 shrink-0" />
          </div>
          <PlannerAndProgressGraphic className="hidden sm:block w-32 h-24 absolute bottom-3 right-2 z-10 pointer-events-none" />
          {photoElement(
            'w-56 sm:w-64 md:w-full max-w-[275px] h-56 sm:h-64 md:h-[88%] bg-white rounded-3xl border-4 border-purple-200/90 shadow-xl p-1'
          )}
        </div>

        <div className="md:col-span-7 order-1 md:order-2 p-5 sm:p-7 lg:p-9 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <BrandLogo size="sm" surface="badge" />
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-100">
                <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Smart Study Planner</span>
              </span>
            </div>

            <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.1] [text-wrap:balance]">
              {banner.title}
            </h3>

            {primarySubtitle && (
              <p className="text-xs sm:text-base font-bold text-amber-300 leading-snug">
                {primarySubtitle}
              </p>
            )}

            {highlightsLine && (
              <p className="text-xs sm:text-sm font-medium text-purple-100 leading-relaxed">
                {highlightsLine}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-indigo-950 bg-white hover:bg-amber-50 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{banner.ctaLabel}</span>
              <ArrowRight className="w-4 h-4 text-purple-700 shrink-0" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-purple-100">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              <span>Track Daily Consistency</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HomeBannerCarousel: React.FC<{
  bannersOverride?: HomeBanner[];
  heading?: string;
}> = ({ bannersOverride, heading = 'Featured AI STUDENTS Spotlight' }) => {
  const { homeBanners, navigate, appUser, showToast } = useApp();

  const activeBanners = (bannersOverride || homeBanners)
    .filter((b) => b.enabled)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const maxIndex = Math.max(0, activeBanners.length - 1);
  const safeIndex = Math.min(currentIndex, maxIndex);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [currentIndex, maxIndex]);

  useEffect(() => {
    if (activeBanners.length <= 1 || !autoPlayEnabled || interactionPaused) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev >= activeBanners.length - 1 ? 0 : prev + 1));
    }, 6500);
    return () => window.clearInterval(timer);
  }, [activeBanners.length, autoPlayEnabled, interactionPaused]);

  if (activeBanners.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handleBannerAction = (banner: HomeBanner) => {
    if (!appUser) {
      if (banner.ctaLabel.toLowerCase().includes('join')) {
        navigate('auth', { authMode: 'register' });
        return;
      }
      showToast(`Sign in to open "${banner.title}".`, 'info');
      navigate('auth', { authMode: 'login' });
      return;
    }
    navigate(banner.destinationPage);
  };

  return (
    <section
      aria-label="Promotional Home Banners Carousel"
      className="space-y-3.5"
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={() => setInteractionPaused(false)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {heading}
          </h2>
          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums ml-1">
            {safeIndex + 1} / {activeBanners.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1" role="tablist" aria-label="Banner slides">
            {activeBanners.map((b, idx) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Show banner ${idx + 1}: ${b.title}`}
                aria-selected={safeIndex === idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  safeIndex === idx
                    ? 'w-7 bg-indigo-700 dark:bg-indigo-400'
                    : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-indigo-400'
                }`}
              />
            ))}
          </div>

          {activeBanners.length > 1 && (
            <button
              type="button"
              onClick={() => setAutoPlayEnabled((prev) => !prev)}
              aria-pressed={!autoPlayEnabled}
              aria-label={autoPlayEnabled ? 'Pause automatic sliding' : 'Resume automatic sliding'}
              className="inline-flex items-center gap-1.5 px-2.5 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {autoPlayEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{autoPlayEnabled ? 'Pause' : 'Auto-Slide'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous banner"
            className="p-2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next banner"
            className="p-2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Single-Banner-at-a-Time Swipeable 16:9 Carousel */}
      <div
        className="overflow-hidden rounded-2xl touch-pan-y"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') handlePrev();
          if (e.key === 'ArrowRight') handleNext();
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
          touchStartY.current = e.touches[0]?.clientY ?? null;
          setInteractionPaused(true);
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || touchStartY.current === null) return;
          const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
          const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
          const diffX = endX - touchStartX.current;
          const diffY = endY - touchStartY.current;
          touchStartX.current = null;
          touchStartY.current = null;
          if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0) handlePrev();
            else handleNext();
          }
          setInteractionPaused(false);
        }}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {activeBanners.map((banner, idx) => (
            <div key={banner.id} className="w-full shrink-0">
              <HomeBannerCard
                banner={banner}
                onAction={handleBannerAction}
                priority={idx === 0}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
