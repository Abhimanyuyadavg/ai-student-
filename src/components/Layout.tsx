import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Home,
  Info,
  Library,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  RefreshCw,
  Settings,
  Shield,
  Sun,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { AppPage } from '../types/index.ts';
import { AboutAppModal, APP_OWNER_NAME, BrandLogo } from './BrandLogo.tsx';
import { AuthImage } from './ImageTools.tsx';

const PAGE_LABELS: Record<AppPage, string> = {
  welcome: 'Welcome',
  auth: 'Sign In & Register',
  'forgot-password': 'Password Recovery',
  onboarding: 'Academic Preferences',
  dashboard: 'Home',
  'ai-teacher': 'AI Teacher',
  subjects: 'Subjects',
  'subject-detail': 'Subject Overview',
  'chapter-learning': 'Chapter Study',
  tests: 'Tests & Mock Exams',
  'mcq-test': 'MCQ & Objective Test',
  'written-test': 'Written Assessment',
  'mock-exam': 'Board Exam Simulator',
  'test-results': 'Test Scorecard',
  'question-bank': 'Question Bank',
  'pyq-bank': 'Previous Year Questions',
  revision: 'Revision & Memory',
  'study-planner': 'Study Planner',
  progress: 'My Progress',
  library: 'Study Library',
  notifications: 'Notifications',
  profile: 'Profile',
  settings: 'Settings',
  'help-support': 'Help & Support',
  'privacy-policy': 'Privacy Policy',
  terms: 'Terms & Conditions',
  admin: 'Admin Dashboard',
  'admin-curriculum': 'Curriculum Management',
  'admin-questions': 'Question Management',
  'admin-verification': 'Content Verification',
  'admin-banners': 'Branding & Home Screen Banners',
  'admin-payments': 'Payment Management',
  'admin-support': 'Help & Support Desk',
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    booting,
    appUser,
    studentProfile,
    currentPage,
    navigate,
    theme,
    toggleTheme,
    boards,
    classes,
    sessions,
    streams,
    notifications,
    logout,
    toast,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  if (booting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 text-slate-900 dark:text-slate-100 px-6">
        <div className="flex flex-col items-center text-center space-y-5 bg-white/90 dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-900 rounded-2xl px-8 py-10 shadow-sm max-w-md w-full">
          <BrandLogo size="xl" subtitle="Board Exam AI Learning Workspace" />
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Preparing your board syllabus, personal AI teacher, and subject test engine...
          </p>
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
            Owner &amp; Founder: {APP_OWNER_NAME}
          </p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeBoard = boards.find((b) => b.id === studentProfile?.boardId);
  const activeClass = classes.find((c) => c.id === studentProfile?.classId);
  const activeSession = sessions.find((s) => s.id === studentProfile?.academicSessionId);
  const activeStream = streams.find((st) => st.id === studentProfile?.streamId);

  const isStaff = appUser?.role === 'admin' || appUser?.role === 'content_manager';

  // Unauthenticated public pages (Welcome, Auth, Forgot Password, Help & Support, Privacy, Terms)
  const isPublicRoute =
    currentPage === 'welcome' ||
    currentPage === 'auth' ||
    currentPage === 'forgot-password' ||
    (!appUser && (currentPage === 'help-support' || currentPage === 'privacy-policy' || currentPage === 'terms'));

  if (!appUser || isPublicRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
            <button
              onClick={() => navigate('welcome')}
              className="flex items-center whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BrandLogo size="sm" />
            </button>

            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
              <a href="#boards" onClick={() => navigate('welcome')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
                Boards
              </a>
              <a href="#features" onClick={() => navigate('welcome')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
                AI Teacher
              </a>
              <button
                type="button"
                onClick={() => navigate('help-support')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Help &amp; Support
              </button>
              <button
                type="button"
                onClick={() => setAboutOpen(true)}
                className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                About App
              </button>
            </nav>

            <div className="flex items-center gap-3 shrink-0">
              {appUser ? (
                <button
                  onClick={() => navigate(studentProfile?.onboardingCompleted ? 'dashboard' : 'onboarding')}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Workspace
                </button>
              ) : (
                <button
                  onClick={() => navigate('auth', { authMode: 'login' })}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <AboutAppModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
        {toast && <ToastBanner toast={toast} />}
      </div>
    );
  }

  const primaryNav: { id: AppPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'ai-teacher', label: 'AI Teacher', icon: MessageSquare },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'tests', label: 'Tests', icon: ClipboardCheck },
    { id: 'study-planner', label: 'Study Planner', icon: Calendar },
    { id: 'progress', label: 'My Progress', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const secondaryNav: { id: AppPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'question-bank', label: 'Question Bank', icon: FileText },
    { id: 'pyq-bank', label: 'Previous Papers (PYQ)', icon: ClipboardCheck },
    { id: 'revision', label: 'Revision & Memory', icon: RefreshCw },
    { id: 'library', label: 'Study Library', icon: Library },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'help-support', label: 'Help & Support', icon: LifeBuoy },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNav = (page: AppPage) => {
    navigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen">
        <div className="h-16 px-4 flex items-center border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => handleNav('dashboard')}
            className="flex items-center cursor-pointer"
          >
            <BrandLogo size="sm" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <nav className="space-y-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active =
                currentPage === item.id ||
                (item.id === 'subjects' && (currentPage === 'subject-detail' || currentPage === 'chapter-learning')) ||
                (item.id === 'tests' && (currentPage === 'mcq-test' || currentPage === 'written-test' || currentPage === 'mock-exam' || currentPage === 'test-results'));
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="px-3 mb-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              Study Resources
            </p>
            <nav className="space-y-1">
              {secondaryNav.map((item) => {
                const Icon = item.icon;
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {isStaff && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="px-3 mb-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                Administration
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => handleNav('admin')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    currentPage.startsWith('admin')
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Admin Studio</span>
                </button>
              </nav>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
          <button
            type="button"
            onClick={() => handleNav('profile')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
              <AuthImage
                src={appUser.photoUrl}
                alt={`${appUser.displayName} profile photo`}
                className="w-full h-full object-cover"
                fallback={
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    {(appUser.displayName || 'S').trim().charAt(0).toUpperCase()}
                  </span>
                }
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {appUser.displayName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate capitalize">
                {appUser.role === 'content_manager' ? 'Content Manager' : appUser.role}
              </p>
            </div>
          </button>
          <button
            onClick={() => setAboutOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>About AI STUDENTS</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Context Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => handleNav('dashboard')}
              className="lg:hidden flex items-center shrink-0 cursor-pointer"
              aria-label="AI STUDENTS Home"
            >
              <BrandLogo size="sm" />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {PAGE_LABELS[currentPage] || 'Workspace'}
              </span>
              {studentProfile?.onboardingCompleted && (
                <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  <span>{activeBoard?.boardCode || studentProfile.boardId}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeClass?.className || studentProfile.classId}</span>
                  {activeStream && activeStream.id !== 'na' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{activeStream.name}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>{activeSession?.name || '2026–27'}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              aria-label="Toggle light or dark theme"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => handleNav('notifications')}
              aria-label="Notifications"
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 text-[10px] font-mono font-bold bg-indigo-700 text-white px-1 rounded">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleNav('ai-teacher')}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask AI Teacher</span>
            </button>
            <button
              type="button"
              onClick={() => handleNav('profile')}
              aria-label="Open student profile"
              className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 dark:bg-indigo-950 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <AuthImage
                src={appUser.photoUrl}
                alt={`${appUser.displayName} avatar`}
                className="w-full h-full object-cover"
                fallback={
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    {(appUser.displayName || 'S').trim().charAt(0).toUpperCase()}
                  </span>
                }
              />
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation (within 15% mobile height cap) */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 h-16">
          {primaryNav.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium cursor-pointer ${
                  active
                    ? 'text-indigo-700 dark:text-indigo-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-[64px]">{item.label.replace('Study ', '')}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Full Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <BrandLogo size="sm" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-5">
              <div className="space-y-1">
                {primaryNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
                {secondaryNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                {isStaff && (
                  <button
                    onClick={() => handleNav('admin')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin Studio</span>
                  </button>
                )}
              </div>
            </div>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAboutOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Info className="w-4 h-4" />
                <span>About AI STUDENTS</span>
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <AboutAppModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      {toast && <ToastBanner toast={toast} />}
    </div>
  );
};

const ToastBanner: React.FC<{ toast: { message: string; type: 'info' | 'success' | 'error' } }> = ({
  toast,
}) => {
  const styles =
    toast.type === 'error'
      ? 'bg-rose-900 text-white border-rose-700'
      : toast.type === 'success'
      ? 'bg-emerald-900 text-white border-emerald-700'
      : 'bg-slate-900 text-white border-slate-700';

  return (
    <div
      role="status"
      className={`fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 max-w-sm px-4 py-3 rounded-lg border shadow-lg text-sm font-medium ${styles}`}
    >
      {toast.message}
    </div>
  );
};
