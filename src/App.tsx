/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { AppShell } from './components/Layout.tsx';
import { WelcomePage } from './pages/WelcomePage.tsx';
import { AuthPage, ForgotPasswordPage } from './pages/AuthPages.tsx';
import { OnboardingPage } from './pages/OnboardingPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ChapterLearningPage, SubjectDetailPage, SubjectsListPage } from './pages/SubjectsPages.tsx';
import { AiTeacherPage } from './pages/AiTeacherPage.tsx';
import {
  McqTestPage,
  MockExamPage,
  TestResultsPage,
  TestsHubPage,
  WrittenTestPage,
} from './pages/TestingPages.tsx';
import { PyqBankPage, QuestionBankPage } from './pages/QuestionBankPages.tsx';
import { StudyPlannerPage } from './pages/StudyPlannerPage.tsx';
import { RevisionPage } from './pages/RevisionPage.tsx';
import { ProgressPage } from './pages/ProgressPage.tsx';
import { LibraryPage } from './pages/LibraryPage.tsx';
import {
  NotificationsPage,
  SettingsPage,
  StudentProfilePage,
} from './pages/ProfileSettingsPages.tsx';
import { AdminConsolePage } from './pages/AdminPages.tsx';
import { HelpSupportPage, PrivacyPolicyPage, TermsConditionsPage } from './pages/SupportPages.tsx';

const PageRouter: React.FC = () => {
  const { appUser, currentPage } = useApp();

  if (!appUser) {
    if (currentPage === 'auth') return <AuthPage />;
    if (currentPage === 'forgot-password') return <ForgotPasswordPage />;
    if (currentPage === 'help-support') return <HelpSupportPage />;
    if (currentPage === 'privacy-policy') return <PrivacyPolicyPage />;
    if (currentPage === 'terms') return <TermsConditionsPage />;
    return <WelcomePage />;
  }

  switch (currentPage) {
    case 'welcome':
      return <WelcomePage />;
    case 'auth':
      return <AuthPage />;
    case 'forgot-password':
      return <ForgotPasswordPage />;
    case 'onboarding':
      return <OnboardingPage />;
    case 'dashboard':
      return <DashboardPage />;
    case 'subjects':
      return <SubjectsListPage />;
    case 'subject-detail':
      return <SubjectDetailPage />;
    case 'chapter-learning':
      return <ChapterLearningPage />;
    case 'ai-teacher':
      return <AiTeacherPage />;
    case 'tests':
      return <TestsHubPage />;
    case 'mcq-test':
      return <McqTestPage />;
    case 'written-test':
      return <WrittenTestPage />;
    case 'mock-exam':
      return <MockExamPage />;
    case 'test-results':
      return <TestResultsPage />;
    case 'question-bank':
      return <QuestionBankPage />;
    case 'pyq-bank':
      return <PyqBankPage />;
    case 'study-planner':
      return <StudyPlannerPage />;
    case 'revision':
      return <RevisionPage />;
    case 'progress':
      return <ProgressPage />;
    case 'library':
      return <LibraryPage />;
    case 'notifications':
      return <NotificationsPage />;
    case 'profile':
      return <StudentProfilePage />;
    case 'settings':
      return <SettingsPage />;
    case 'help-support':
      return <HelpSupportPage />;
    case 'privacy-policy':
      return <PrivacyPolicyPage />;
    case 'terms':
      return <TermsConditionsPage />;
    case 'admin':
    case 'admin-curriculum':
    case 'admin-questions':
    case 'admin-verification':
    case 'admin-banners':
    case 'admin-pdf-library':
    case 'admin-payments':
    case 'admin-support':
      return <AdminConsolePage />;
    default:
      return <DashboardPage />;
  }
};

export default function App() {
  return (
    <AppProvider>
      <AppShell>
        <PageRouter />
      </AppShell>
    </AppProvider>
  );
}
