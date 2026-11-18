import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { APP_ASSETS } from '../lib/assets.ts';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { HomeBannerCarousel } from '../components/HomeBannerCarousel.tsx';
import { HomePdfToolsSection } from '../components/HomePdfToolsSection.tsx';

export const WelcomePage: React.FC = () => {
  const { navigate, boards, appUser, studentProfile } = useApp();

  const handlePrimaryCta = () => {
    if (appUser) {
      navigate(studentProfile?.onboardingCompleted ? 'dashboard' : 'onboarding');
    } else {
      navigate('auth', { authMode: 'register' });
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950">
      {/* 1. Primary Top Section: Real Interactive PDF TOOLS on App Home Screen */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-4">
        <HomePdfToolsSection />
      </section>

      {/* 2. Hero Section — AI Teacher, Courses, Boards & Learning Platform */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <BrandLogo size="lg" subtitle="Class 10 · 11 · 12 · Session 2026–27" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.12] [text-wrap:balance]">
              Board-aligned AI teaching and exam mastery for school students.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              Study chapter by chapter with a personal AI Teacher tuned to your exact board, stream, and medium — paired with interactive MCQ and written tests, verified previous-year paper tracking, and a realistic study timetable.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={handlePrimaryCta}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{appUser ? 'Continue Studying' : 'Create Student Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {!appUser && (
                <button
                  onClick={() => navigate('auth', { authMode: 'login' })}
                  className="px-6 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Student Sign In
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[300px] lg:min-h-[420px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-900">
              <img
                src={APP_ASSETS.heroStudyWorkspace}
                alt="High school student studying mathematics and physics textbooks at a sunlit wooden desk"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* 4-Column Curriculum Scope Strip */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-b border-slate-200 dark:border-slate-800 py-6">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Classes Covered</p>
            <p className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              Class 10, 11 &amp; 12
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Supported Boards</p>
            <p className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
              BSEB, CBSE, ICSE, State
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Streams (11 &amp; 12)</p>
            <p className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
              Science · Commerce · Arts
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Instruction Mediums</p>
            <p className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
              Hindi · English · Bilingual
            </p>
          </div>
        </div>

        {/* 5 Promotional Personal-Photo Banners Carousel */}
        <div className="mt-10">
          <HomeBannerCarousel heading="Explore AI STUDENTS" />
        </div>
      </section>

      {/* Supported Boards Section */}
      <section id="boards" className="max-w-7xl mx-auto px-4 sm:px-8 py-14 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Separate blueprints for every board
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            We never mix syllabuses across boards. Official status is only displayed once an administrator verifies the source syllabus document for the active session.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {boards.map((board) => (
            <div
              key={board.id}
              className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {board.name}
                </h3>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {board.boardCode} · {board.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {board.description}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                {board.examPatternSummary}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-8 py-14 border-t border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <MessageSquare className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              10-Step Personal AI Teacher
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Guides you from chapter introduction and definitions through worked examples, practice exercises, mistake analysis, and spaced revision in Hindi, English, or bilingual mode.
            </p>
          </div>

          <div id="testing" className="space-y-3">
            <ClipboardCheck className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              MCQ, Written &amp; Board Mock Exams
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Practice one-by-one learning mode MCQs, receive rubric-based AI estimates on typed long answers, and take timed full mock exams with auto-saved responses.
            </p>
          </div>

          <div id="planner" className="space-y-3">
            <Calendar className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Realistic Study Planner &amp; Revision
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Builds 30, 60, or 90-day timetables around your school and coaching schedule, plus 5-stage spaced revision with formula sheets and flashcards.
            </p>
          </div>

          <div className="space-y-3">
            <CheckCircle2 className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Verified PYQ Transparency
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Previous-year questions are strictly linked to verified source papers and exam years. Practice and predicted questions are always clearly labeled as such.
            </p>
          </div>

          <div className="space-y-3">
            <BookOpen className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              13-Section Chapter Modules
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Every chapter includes definitions, formulas, diagrams, solved examples, MCQs, short &amp; long questions, revision notes, and practice tests.
            </p>
          </div>

          <div className="space-y-3">
            <ShieldCheck className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Privacy &amp; Guardian Safety
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Built for school students with age confirmation, guardian consent support, private grades and conversations, and role-based content verification.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="space-y-1.5">
            <BrandLogo size="sm" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI STUDENTS · Owner &amp; Founder:{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                ABHIMANYU OFFICIAL HACKER
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button onClick={() => navigate('help-support')} className="hover:text-slate-900 dark:hover:text-white cursor-pointer">
              Help &amp; Support
            </button>
            <button onClick={() => navigate('privacy-policy')} className="hover:text-slate-900 dark:hover:text-white cursor-pointer">
              Privacy Policy
            </button>
            <button onClick={() => navigate('terms')} className="hover:text-slate-900 dark:hover:text-white cursor-pointer">
              Terms
            </button>
            <button onClick={() => navigate('auth', { authMode: 'register' })} className="hover:text-slate-900 dark:hover:text-white cursor-pointer">
              Register
            </button>
            <button onClick={() => navigate('auth', { authMode: 'login' })} className="hover:text-slate-900 dark:hover:text-white cursor-pointer">
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
