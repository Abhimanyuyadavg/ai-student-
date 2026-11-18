import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Download,
  FileCheck,
  FileQuestion,
  FileText,
  Image as ImageIcon,
  LifeBuoy,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { CurriculumStatusText, PriorityText } from '../components/StatusText.tsx';
import { AuthImage, UploadPickerControls, ZoomableAuthThumbnail } from '../components/ImageTools.tsx';
import { AdminBannersSection } from '../components/AdminBannersSection.tsx';
import { AdminPdfLibrarySection } from '../components/AdminPdfLibrarySection.tsx';
import { validateAndCompressImageFile } from '../lib/imageUtils.ts';
import {
  AcademicSession,
  Announcement,
  AppPage,
  AppUser,
  Board,
  Chapter,
  ChapterIllustration,
  CurriculumStatus,
  CustomTestConfig,
  FaqCategory,
  FaqItem,
  LearningMaterial,
  MaterialType,
  PriorityLevel,
  Question,
  QuestionSourceType,
  QuestionType,
  Subject,
  SupportContactInfo,
  SupportTicketStatus,
  TestCategory,
  UserRole,
  UserStatus,
} from '../types/index.ts';

interface ConfirmDeleteState {
  colName: string;
  id: string;
  entityType: string;
  label: string;
}

export const AdminConsolePage: React.FC = () => {
  const {
    appUser,
    currentPage,
    navigate,
    boards,
    sessions,
    classes,
    streams,
    subjects,
    chapters,
    questions,
    materials,
    announcements,
    customTests,
    systemSettings,
    allUsers,
    auditLogs,
    feedbackList,
    aiPrompts,
    payments,
    adminUpsert,
    adminUpdateUser,
    adminDelete,
    syncSeedCatalog,
    showToast,
  } = useApp();

  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = appUser?.role === 'admin';
  const isStaff = appUser?.role === 'admin' || appUser?.role === 'content_manager';

  if (!isStaff) {
    return (
      <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
        <Shield className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Staff Access Required
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The Admin &amp; Content Studio is restricted to verified Administrators and Content Managers.
        </p>
        <button
          onClick={() => navigate('dashboard')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const tabs: { id: AppPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'admin', label: 'Overview & Users', icon: Users },
    { id: 'admin-curriculum', label: 'Curriculum, Notes & Tests', icon: BookOpen },
    { id: 'admin-questions', label: 'Question Bank & PYQs', icon: FileQuestion },
    { id: 'admin-verification', label: 'Content Verification', icon: FileCheck },
    { id: 'admin-banners', label: 'Branding & Home Screen Banners', icon: ImageIcon },
    { id: 'admin-pdf-library', label: 'PDF Library & Payments', icon: FileText },
    { id: 'admin-support', label: 'Help & Support Desk', icon: LifeBuoy },
    { id: 'admin-payments', label: 'Payments & Settings', icon: CreditCard },
  ];

  const handleConfirmDelete = async () => {
    if (!confirmDelete || !isAdmin) return;
    setBusy(true);
    try {
      await adminDelete(confirmDelete.colName, confirmDelete.id, confirmDelete.entityType);
      showToast(`Deleted ${confirmDelete.entityType}: ${confirmDelete.label}`, 'info');
      setConfirmDelete(null);
    } catch (err: any) {
      showToast(err?.message || 'Delete failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSyncSeed = async () => {
    if (!isAdmin) return;
    setBusy(true);
    try {
      await syncSeedCatalog();
    } catch (err: any) {
      showToast(err?.message || 'Could not sync catalog.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
            Role: {isAdmin ? 'Platform Administrator' : 'Content Manager'} · {appUser.email}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Admin &amp; Content Studio
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Add, edit, verify, or delete boards, sessions, subjects, chapters, notes, questions, PYQs, custom mock tests, announcements, and users.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleSyncSeed}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
            <span>Sync Reference Curriculum to Firestore</span>
          </button>
        )}
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = currentPage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-indigo-700 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {currentPage === 'admin' && (
        <AdminOverviewSection
          isAdmin={isAdmin}
          allUsers={allUsers}
          chapters={chapters}
          questions={questions}
          feedbackList={feedbackList}
          announcements={announcements}
          aiPrompts={aiPrompts}
          auditLogs={auditLogs}
          boards={boards}
          appUser={appUser}
          adminUpdateUser={adminUpdateUser}
          adminUpsert={adminUpsert}
          onRequestDelete={setConfirmDelete}
          showToast={showToast}
        />
      )}

      {currentPage === 'admin-curriculum' && (
        <AdminCurriculumSection
          isAdmin={isAdmin}
          boards={boards}
          sessions={sessions}
          classes={classes}
          streams={streams}
          subjects={subjects}
          chapters={chapters}
          materials={materials}
          customTests={customTests}
          appUser={appUser}
          adminUpsert={adminUpsert}
          onRequestDelete={setConfirmDelete}
          showToast={showToast}
        />
      )}

      {currentPage === 'admin-questions' && (
        <AdminQuestionsSection
          isAdmin={isAdmin}
          subjects={subjects}
          chapters={chapters}
          questions={questions}
          adminUpsert={adminUpsert}
          onRequestDelete={setConfirmDelete}
          showToast={showToast}
        />
      )}

      {currentPage === 'admin-verification' && (
        <AdminVerificationSection
          chapters={chapters}
          materials={materials}
          questions={questions}
          subjects={subjects}
          adminUpsert={adminUpsert}
          showToast={showToast}
        />
      )}

      {currentPage === 'admin-payments' && (
        <AdminPaymentsSettingsSection
          isAdmin={isAdmin}
          systemSettings={systemSettings}
          payments={payments}
          adminUpsert={adminUpsert}
          showToast={showToast}
        />
      )}

      {currentPage === 'admin-banners' && <AdminBannersSection isAdmin={isAdmin} />}

      {currentPage === 'admin-pdf-library' && <AdminPdfLibrarySection isAdmin={isAdmin} />}

      {currentPage === 'admin-support' && <AdminSupportDeskSection isAdmin={isAdmin} />}

      {/* Explicit Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="font-display text-lg font-bold">Confirm Permanent Deletion</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{confirmDelete.label}</span> (
              {confirmDelete.entityType})? This action will be recorded in the audit log and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer disabled:opacity-60"
              >
                {busy ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 1. OVERVIEW, USERS, ANNOUNCEMENTS, FEEDBACK, AI PROMPTS & AUDIT LOGS
// ---------------------------------------------------------------------------
const AdminOverviewSection: React.FC<{
  isAdmin: boolean;
  allUsers: AppUser[];
  chapters: Chapter[];
  questions: Question[];
  feedbackList: ReturnType<typeof useApp>['feedbackList'];
  announcements: Announcement[];
  aiPrompts: ReturnType<typeof useApp>['aiPrompts'];
  auditLogs: ReturnType<typeof useApp>['auditLogs'];
  boards: Board[];
  appUser: AppUser;
  adminUpdateUser: ReturnType<typeof useApp>['adminUpdateUser'];
  adminUpsert: ReturnType<typeof useApp>['adminUpsert'];
  onRequestDelete: (d: ConfirmDeleteState) => void;
  showToast: ReturnType<typeof useApp>['showToast'];
}> = ({
  isAdmin,
  allUsers,
  chapters,
  questions,
  feedbackList,
  announcements,
  aiPrompts,
  auditLogs,
  boards,
  appUser,
  adminUpdateUser,
  adminUpsert,
  onRequestDelete,
  showToast,
}) => {
  const [userSearch, setUserSearch] = useState('');
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'important'>('normal');
  const [annBoardId, setAnnBoardId] = useState('');
  const [editingPromptId, setEditingPromptId] = useState<string>(aiPrompts[0]?.id || '');
  const [promptDraft, setPromptDraft] = useState<string>(aiPrompts[0]?.systemPrompt || '');

  const verifiedPyqCount = questions.filter((q) => q.isPyq && q.verificationStatus === 'Verified Official').length;
  const openFeedbackCount = feedbackList.filter((f) => f.status === 'open').length;

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
    );
  }, [allUsers, userSearch]);

  const sortedLogs = useMemo(
    () => [...auditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [auditLogs]
  );

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !annTitle.trim() || !annContent.trim()) return;
    try {
      const existing = announcements.find((a) => a.id === editingAnnId);
      const item: Announcement = {
        id: editingAnnId || `ann_${Date.now()}`,
        title: annTitle.trim(),
        content: annContent.trim(),
        targetBoardId: annBoardId || undefined,
        priority: annPriority,
        published: existing ? existing.published : true,
        publishedAt: existing?.publishedAt || new Date().toISOString(),
        createdBy: existing?.createdBy || appUser.uid,
      };
      await adminUpsert(
        'announcements',
        item,
        editingAnnId ? 'UPDATE_ANNOUNCEMENT' : 'CREATE_ANNOUNCEMENT',
        'Announcement'
      );
      setEditingAnnId(null);
      setAnnTitle('');
      setAnnContent('');
      setAnnBoardId('');
      showToast(editingAnnId ? 'Announcement updated.' : 'Announcement published.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save announcement.', 'error');
    }
  };

  const handleSavePrompt = async () => {
    if (!isAdmin) return;
    const current = aiPrompts.find((p) => p.id === editingPromptId);
    if (!current || !promptDraft.trim()) return;
    try {
      await adminUpsert(
        'aiPrompts',
        {
          ...current,
          systemPrompt: promptDraft.trim(),
          updatedBy: appUser.email || appUser.uid,
          updatedAt: new Date().toISOString(),
        },
        'UPDATE_AI_PROMPT',
        'AiPromptConfig'
      );
      showToast('AI teacher prompt configuration updated.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not save prompt.', 'error');
    }
  };

  const handleExportLogsCsv = () => {
    const rows = [
      ['Timestamp', 'User Email', 'Action', 'Entity Type', 'Entity ID', 'Details'].join(','),
      ...sortedLogs.map((l) =>
        [
          l.createdAt,
          `"${(l.userEmail || '').replace(/"/g, '""')}"`,
          l.action,
          l.entityType,
          l.entityId,
          `"${(l.details || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-students-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Registered Accounts</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {allUsers.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Catalog Chapters</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {chapters.length}{' '}
            <span className="text-xs font-normal text-slate-500">
              ({chapters.filter((c) => c.published).length} published)
            </span>
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Questions &amp; Verified PYQs</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {questions.length}{' '}
            <span className="text-xs font-normal text-slate-500">({verifiedPyqCount} verified PYQ)</span>
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Feedback Reports</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {openFeedbackCount}
          </p>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Users &amp; Role Management
            </h2>
            <p className="text-xs text-slate-500">
              {isAdmin
                ? 'Manage student accounts, assign Content Managers, or suspend policy-violating accounts.'
                : 'Read-only view for Content Managers. Only Admins can change user roles or status.'}
            </p>
          </div>
          <input
            type="search"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Filter by name, email, or phone..."
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 sm:w-64"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No matching user documents found in Firestore.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium">Contact</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-white">
                      {u.displayName}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-400">
                      {u.email || u.phone || u.uid}
                    </td>
                    <td className="py-2.5 pr-3">
                      <select
                        disabled={!isAdmin || u.uid === appUser.uid}
                        value={u.role}
                        onChange={async (e) => {
                          try {
                            await adminUpdateUser(
                              { ...u, role: e.target.value as UserRole },
                              'UPDATE_USER_ROLE'
                            );
                            showToast(`Updated role for ${u.displayName}.`, 'success');
                          } catch (err: any) {
                            showToast(err?.message || 'Role update failed.', 'error');
                          }
                        }}
                        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
                      >
                        <option value="student">student</option>
                        <option value="content_manager">content_manager</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-2.5">
                      <select
                        disabled={!isAdmin || u.uid === appUser.uid}
                        value={u.status}
                        onChange={async (e) => {
                          try {
                            await adminUpdateUser(
                              { ...u, status: e.target.value as UserStatus },
                              'UPDATE_USER_STATUS'
                            );
                            showToast(`Updated status for ${u.displayName}.`, 'success');
                          } catch (err: any) {
                            showToast(err?.message || 'Status update failed.', 'error');
                          }
                        }}
                        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
                      >
                        <option value="active">active</option>
                        <option value="suspended">suspended</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Announcements & Feedback Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Board Announcements
            </h2>
            {editingAnnId && (
              <button
                type="button"
                onClick={() => {
                  setEditingAnnId(null);
                  setAnnTitle('');
                  setAnnContent('');
                }}
                className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>
          {isAdmin && (
            <form onSubmit={handleSaveAnnouncement} className="space-y-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Announcement headline"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <textarea
                rows={2}
                required
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                placeholder="Verified notice or syllabus update message..."
                className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={annBoardId}
                  onChange={(e) => setAnnBoardId(e.target.value)}
                  className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="">All Boards</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.boardCode}
                    </option>
                  ))}
                </select>
                <select
                  value={annPriority}
                  onChange={(e) => setAnnPriority(e.target.value as 'normal' | 'important')}
                  className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="normal">Normal Notice</option>
                  <option value="important">Important Alert</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
              >
                {editingAnnId ? 'Save Announcement Changes' : 'Publish Announcement'}
              </button>
            </form>
          )}

          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {announcements.map((a) => (
              <div key={a.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{a.title}</p>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingAnnId(a.id);
                          setAnnTitle(a.title);
                          setAnnContent(a.content);
                          setAnnPriority(a.priority);
                          setAnnBoardId(a.targetBoardId || '');
                        }}
                        aria-label={`Edit ${a.title}`}
                        className="p-1 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          onRequestDelete({
                            colName: 'announcements',
                            id: a.id,
                            entityType: 'Announcement',
                            label: a.title,
                          })
                        }
                        aria-label={`Delete ${a.title}`}
                        className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{a.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* User Feedback & Issue Triage */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Student Feedback &amp; Correction Reports
          </h2>
          {feedbackList.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No student feedback or correction requests submitted yet.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {feedbackList.map((fb) => (
                <div key={fb.id} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {fb.category} · {fb.subject}
                    </span>
                    <select
                      disabled={!isAdmin}
                      value={fb.status}
                      onChange={async (e) => {
                        try {
                          await adminUpsert(
                            'userFeedback',
                            { ...fb, status: e.target.value as 'open' | 'reviewed' | 'resolved' },
                            'TRIAGE_FEEDBACK',
                            'UserFeedback'
                          );
                          showToast('Feedback status updated.', 'success');
                        } catch (err: any) {
                          showToast(err?.message || 'Update failed.', 'error');
                        }
                      }}
                      className="px-2 py-1 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
                    >
                      <option value="open">open</option>
                      <option value="reviewed">reviewed</option>
                      <option value="resolved">resolved</option>
                    </select>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{fb.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Prompts & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            AI Teacher Prompt Templates
          </h2>
          <select
            value={editingPromptId}
            onChange={(e) => {
              const id = e.target.value;
              setEditingPromptId(id);
              const found = aiPrompts.find((p) => p.id === id);
              setPromptDraft(found?.systemPrompt || '');
            }}
            className="w-full px-3 py-2 text-xs leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            {aiPrompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.subjectScope})
              </option>
            ))}
          </select>
          <textarea
            rows={5}
            disabled={!isAdmin}
            value={promptDraft}
            onChange={(e) => setPromptDraft(e.target.value)}
            className="w-full p-3 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-70"
          />
          {isAdmin && (
            <button
              onClick={handleSavePrompt}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
            >
              Save Prompt Template
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Immutable Audit Logs
            </h2>
            <button
              onClick={handleExportLogsCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
          {sortedLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No audit events recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
              {sortedLogs.slice(0, 25).map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {log.action} · {log.entityType}
                    </p>
                    <p className="text-slate-500">{log.details}</p>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0 tabular-nums">
                    {log.createdAt.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. CURRICULUM MANAGEMENT (Chapters, Subjects, Materials, Boards, Custom Tests)
// ---------------------------------------------------------------------------
const AdminCurriculumSection: React.FC<{
  isAdmin: boolean;
  boards: Board[];
  sessions: AcademicSession[];
  classes: ReturnType<typeof useApp>['classes'];
  streams: ReturnType<typeof useApp>['streams'];
  subjects: Subject[];
  chapters: Chapter[];
  materials: LearningMaterial[];
  customTests: CustomTestConfig[];
  appUser: AppUser;
  adminUpsert: ReturnType<typeof useApp>['adminUpsert'];
  onRequestDelete: (d: ConfirmDeleteState) => void;
  showToast: ReturnType<typeof useApp>['showToast'];
}> = ({
  isAdmin,
  boards,
  sessions,
  classes,
  streams,
  subjects,
  chapters,
  materials,
  customTests,
  appUser,
  adminUpsert,
  onRequestDelete,
  showToast,
}) => {
  const { uploadImage, deleteImage } = useApp();
  const [subTab, setSubTab] = useState<'chapters' | 'subjects' | 'materials' | 'boards' | 'tests'>('chapters');

  // Chapter form + edit state
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chSubjectId, setChSubjectId] = useState(subjects[0]?.id || '');
  const [chNumber, setChNumber] = useState(1);
  const [chUnit, setChUnit] = useState('');
  const [chName, setChName] = useState('');
  const [chIntro, setChIntro] = useState('');
  const [chExplain, setChExplain] = useState('');
  const [chNotes, setChNotes] = useState('');
  const [chSourceRef, setChSourceRef] = useState('');
  const [chStatus, setChStatus] = useState<CurriculumStatus>('Under Review');
  const [chIllustrations, setChIllustrations] = useState<ChapterIllustration[]>([]);
  const [illTitle, setIllTitle] = useState('');
  const [illKind, setIllKind] = useState<'diagram' | 'illustration' | 'photo'>('diagram');
  const [illCaption, setIllCaption] = useState('');
  const [uploadingChImage, setUploadingChImage] = useState(false);
  const [chImageError, setChImageError] = useState('');

  // Subject form + edit state
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subBoardId, setSubBoardId] = useState(boards[0]?.id || '');
  const [subSessionId, setSubSessionId] = useState(sessions[0]?.id || '');
  const [subClassId, setSubClassId] = useState(classes[0]?.id || '');
  const [subStreamId, setSubStreamId] = useState(streams[0]?.id || 'na');
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subTextbook, setSubTextbook] = useState('');
  const [subTheory, setSubTheory] = useState(70);
  const [subPractical, setSubPractical] = useState(30);
  const [subCoverUrl, setSubCoverUrl] = useState('');
  const [subCoverId, setSubCoverId] = useState('');
  const [uploadingSubCover, setUploadingSubCover] = useState(false);
  const [subCoverError, setSubCoverError] = useState('');

  // Material form + edit state
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [matSubjectId, setMatSubjectId] = useState(subjects[0]?.id || '');
  const [matType, setMatType] = useState<MaterialType>('Textbook Notes');
  const [matTitle, setMatTitle] = useState('');
  const [matContent, setMatContent] = useState('');
  const [matCitation, setMatCitation] = useState('');
  const [matImageUrl, setMatImageUrl] = useState('');
  const [matImageId, setMatImageId] = useState('');
  const [uploadingMatImage, setUploadingMatImage] = useState(false);
  const [matImageError, setMatImageError] = useState('');

  // Board form + edit state
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState('');
  const [boardCode, setBoardCode] = useState('');
  const [boardDesc, setBoardDesc] = useState('');
  const [boardPattern, setBoardPattern] = useState('');
  const [boardUrl, setBoardUrl] = useState('');

  // Custom Test / Mock Exam form + edit state
  const [editingCustomTestId, setEditingCustomTestId] = useState<string | null>(null);
  const [ctTitle, setCtTitle] = useState('');
  const [ctCategory, setCtCategory] = useState<TestCategory>('Board Pattern Mock Exam');
  const [ctBoardId, setCtBoardId] = useState('all');
  const [ctClassId, setCtClassId] = useState('all');
  const [ctSubjectId, setCtSubjectId] = useState('all');
  const [ctDuration, setCtDuration] = useState(30);
  const [ctCount, setCtCount] = useState(5);
  const [ctIncludeWritten, setCtIncludeWritten] = useState(true);
  const [ctDesc, setCtDesc] = useState('');

  const handleUploadChapterIllustration = async (file: File) => {
    setChImageError('');
    setUploadingChImage(true);
    try {
      const prepared = await validateAndCompressImageFile(file, {
        maxDimension: 1400,
        maxBytes: 750 * 1024,
      });
      const rec = await uploadImage({
        dataUrl: prepared.dataUrl,
        category: 'curriculum_chapter',
        visibility: 'curriculum',
        targetId: editingChapterId || chSubjectId || undefined,
        altText: illTitle.trim() || chName.trim() || 'Chapter illustration',
        caption: illCaption.trim() || undefined,
      });
      const nextIll: ChapterIllustration = {
        id: rec.image.id,
        imageId: rec.image.id,
        imageUrl: rec.url,
        title: illTitle.trim() || prepared.fileName.replace(/\.[^.]+$/, ''),
        caption: illCaption.trim() || undefined,
        kind: illKind,
      };
      setChIllustrations((prev) => [...prev, nextIll]);
      setIllTitle('');
      setIllCaption('');
      showToast('Chapter diagram/illustration uploaded.', 'success');
    } catch (err: any) {
      setChImageError(err?.message || 'Could not upload chapter illustration.');
    } finally {
      setUploadingChImage(false);
    }
  };

  const handleRemoveChapterIllustration = async (id: string) => {
    const target = chIllustrations.find((item) => item.id === id);
    setChIllustrations((prev) => prev.filter((item) => item.id !== id));
    const imgId = target?.imageId || (id.startsWith('img_') ? id : '');
    if (imgId) {
      await deleteImage(imgId).catch(() => {});
    }
  };

  const handleUploadSubjectCover = async (file: File) => {
    setSubCoverError('');
    setUploadingSubCover(true);
    try {
      const prepared = await validateAndCompressImageFile(file, {
        maxDimension: 1200,
        maxBytes: 600 * 1024,
      });
      const rec = await uploadImage({
        dataUrl: prepared.dataUrl,
        category: 'curriculum_subject',
        visibility: 'curriculum',
        targetId: editingSubjectId || subCode.trim() || undefined,
        altText: `${subName.trim() || 'Subject'} cover image`,
      });
      if (subCoverId && subCoverId !== rec.image.id) {
        deleteImage(subCoverId).catch(() => {});
      }
      setSubCoverUrl(rec.url);
      setSubCoverId(rec.image.id);
      showToast('Subject cover uploaded.', 'success');
    } catch (err: any) {
      setSubCoverError(err?.message || 'Could not upload subject cover.');
    } finally {
      setUploadingSubCover(false);
    }
  };

  const handleRemoveSubjectCover = async () => {
    const oldId = subCoverId;
    setSubCoverUrl('');
    setSubCoverId('');
    setSubCoverError('');
    if (oldId) {
      await deleteImage(oldId).catch(() => {});
    }
  };

  const handleUploadMaterialImage = async (file: File) => {
    setMatImageError('');
    setUploadingMatImage(true);
    try {
      const prepared = await validateAndCompressImageFile(file, {
        maxDimension: 1400,
        maxBytes: 750 * 1024,
      });
      const rec = await uploadImage({
        dataUrl: prepared.dataUrl,
        category: 'curriculum_material',
        visibility: 'curriculum',
        targetId: editingMaterialId || matSubjectId || undefined,
        altText: matTitle.trim() || 'Study material illustration',
      });
      if (matImageId && matImageId !== rec.image.id) {
        deleteImage(matImageId).catch(() => {});
      }
      setMatImageUrl(rec.url);
      setMatImageId(rec.image.id);
      showToast('Material image uploaded.', 'success');
    } catch (err: any) {
      setMatImageError(err?.message || 'Could not upload material image.');
    } finally {
      setUploadingMatImage(false);
    }
  };

  const handleRemoveMaterialImage = async () => {
    const oldId = matImageId;
    setMatImageUrl('');
    setMatImageId('');
    setMatImageError('');
    if (oldId) {
      await deleteImage(oldId).catch(() => {});
    }
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chSubjectId || !chName.trim()) return;
    if (chStatus === 'Verified Official' && !chSourceRef.trim()) {
      showToast('Verified Official chapters require a Source Reference citation.', 'error');
      return;
    }
    try {
      const existing = chapters.find((c) => c.id === editingChapterId);
      const ch: Chapter = {
        ...(existing || {
          learningObjectives: [],
          definitions: [],
          importantFacts: [],
          formulas: [],
          examples: [],
          diagrams: [],
          published: true,
        }),
        id: editingChapterId || `ch_${Date.now()}`,
        subjectId: chSubjectId,
        unitName: chUnit.trim() || 'Unit 1',
        chapterNumber: Number(chNumber) || 1,
        chapterName: chName.trim(),
        introduction: chIntro.trim() || 'Chapter overview.',
        completeExplanation: chExplain.trim() || chIntro.trim(),
        revisionNotes: chNotes.trim() || chIntro.trim(),
        illustrations: chIllustrations,
        syllabusStatus: chStatus,
        sourceReference: chSourceRef.trim() || 'Pending official syllabus link',
        published: existing ? existing.published : true,
      };
      await adminUpsert('chapters', ch, editingChapterId ? 'UPDATE_CHAPTER' : 'CREATE_CHAPTER', 'Chapter');
      setEditingChapterId(null);
      setChName('');
      setChIntro('');
      setChExplain('');
      setChNotes('');
      setChSourceRef('');
      setChIllustrations([]);
      setIllTitle('');
      setIllCaption('');
      setChImageError('');
      showToast(editingChapterId ? 'Chapter updated.' : 'Chapter saved and published.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save chapter.', 'error');
    }
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !subCode.trim()) return;
    try {
      const existing = subjects.find((s) => s.id === editingSubjectId);
      const s: Subject = {
        id: editingSubjectId || `sub_${Date.now()}`,
        boardId: subBoardId,
        academicSessionId: subSessionId,
        classId: subClassId,
        streamId: subStreamId,
        subjectName: subName.trim(),
        subjectCode: subCode.trim().toUpperCase(),
        prescribedTextbook: subTextbook.trim() || undefined,
        theoryMarks: Number(subTheory) || 70,
        practicalMarks: Number(subPractical) || 0,
        examDurationMinutes: existing?.examDurationMinutes || 180,
        coverImageUrl: subCoverUrl || undefined,
        coverImageId: subCoverId || undefined,
        status: existing?.status || 'Under Review',
      };
      await adminUpsert('subjects', s, editingSubjectId ? 'UPDATE_SUBJECT' : 'CREATE_SUBJECT', 'Subject');
      setEditingSubjectId(null);
      setSubName('');
      setSubCode('');
      setSubTextbook('');
      setSubCoverUrl('');
      setSubCoverId('');
      setSubCoverError('');
      showToast(editingSubjectId ? 'Subject updated.' : 'Subject added to catalog.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save subject.', 'error');
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const subj = subjects.find((s) => s.id === matSubjectId);
    if (!subj || !matTitle.trim() || !matContent.trim()) return;
    try {
      const existing = materials.find((m) => m.id === editingMaterialId);
      const item: LearningMaterial = {
        id: editingMaterialId || `mat_${Date.now()}`,
        chapterId: existing?.chapterId,
        subjectId: subj.id,
        boardId: subj.boardId,
        classId: subj.classId,
        materialType: matType,
        title: matTitle.trim(),
        content: matContent.trim(),
        sourceCitation: matCitation.trim() || undefined,
        imageUrl: matImageUrl || undefined,
        imageId: matImageId || undefined,
        verificationStatus: existing?.verificationStatus || 'Under Review',
        published: existing ? existing.published : true,
        createdBy: existing?.createdBy || appUser.uid,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      await adminUpsert(
        'learningMaterials',
        item,
        editingMaterialId ? 'UPDATE_MATERIAL' : 'CREATE_MATERIAL',
        'LearningMaterial'
      );
      setEditingMaterialId(null);
      setMatTitle('');
      setMatContent('');
      setMatCitation('');
      setMatImageUrl('');
      setMatImageId('');
      setMatImageError('');
      showToast(editingMaterialId ? 'Learning material updated.' : 'Learning material published.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save material.', 'error');
    }
  };

  const handleSaveBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !boardName.trim() || !boardCode.trim()) return;
    try {
      const existing = boards.find((b) => b.id === editingBoardId);
      const item: Board = {
        id: editingBoardId || `board_${Date.now()}`,
        name: boardName.trim(),
        boardCode: boardCode.trim().toUpperCase(),
        country: 'India',
        description: boardDesc.trim() || 'Board examination curriculum.',
        examPatternSummary: boardPattern.trim() || 'Board syllabus & blueprint.',
        officialSourceUrl: boardUrl.trim() || undefined,
        status: existing?.status || 'Under Review',
      };
      await adminUpsert('boards', item, editingBoardId ? 'UPDATE_BOARD' : 'CREATE_BOARD', 'Board');
      setEditingBoardId(null);
      setBoardName('');
      setBoardCode('');
      setBoardDesc('');
      setBoardPattern('');
      setBoardUrl('');
      showToast(editingBoardId ? 'Board updated.' : 'Board added.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not save board.', 'error');
    }
  };

  const handleSaveCustomTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctTitle.trim()) return;
    try {
      const existing = customTests.find((t) => t.id === editingCustomTestId);
      const item: CustomTestConfig = {
        id: editingCustomTestId || `ctest_${Date.now()}`,
        title: ctTitle.trim(),
        testCategory: ctCategory,
        boardId: ctBoardId,
        classId: ctClassId,
        subjectId: ctSubjectId,
        durationMinutes: Math.max(5, Number(ctDuration) || 30),
        questionCount: Math.max(2, Number(ctCount) || 5),
        includeWritten: ctIncludeWritten,
        description: ctDesc.trim() || undefined,
        published: existing ? existing.published : true,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      await adminUpsert(
        'customTests',
        item,
        editingCustomTestId ? 'UPDATE_CUSTOM_TEST' : 'CREATE_CUSTOM_TEST',
        'CustomTestConfig'
      );
      setEditingCustomTestId(null);
      setCtTitle('');
      setCtDesc('');
      showToast(editingCustomTestId ? 'Custom test updated.' : 'Custom test published.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save custom test.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['chapters', `Chapters (${chapters.length})`],
            ['subjects', `Subjects (${subjects.length})`],
            ['materials', `Study Library (${materials.length})`],
            ['boards', `Boards & Sessions (${boards.length})`],
            ['tests', `Custom Tests & Mocks (${customTests.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSubTab(k)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
              subTab === k
                ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'chapters' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveChapter}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {editingChapterId ? <Pencil className="w-4 h-4 text-indigo-700" /> : <Plus className="w-4 h-4 text-indigo-700" />}
                <span>{editingChapterId ? 'Edit Chapter' : 'Add Chapter'}</span>
              </h2>
              {editingChapterId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingChapterId(null);
                    setChName('');
                    setChIntro('');
                    setChExplain('');
                    setChNotes('');
                    setChSourceRef('');
                    setChIllustrations([]);
                    setIllTitle('');
                    setIllCaption('');
                    setChImageError('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <select
              value={chSubjectId}
              onChange={(e) => setChSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectName} ({s.boardId.toUpperCase()} · {s.classId})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min={1}
                value={chNumber}
                onChange={(e) => setChNumber(Number(e.target.value))}
                placeholder="Ch #"
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={chUnit}
                onChange={(e) => setChUnit(e.target.value)}
                placeholder="Unit name"
                className="col-span-2 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <input
              type="text"
              required
              value={chName}
              onChange={(e) => setChName(e.target.value)}
              placeholder="Chapter title"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
            <textarea
              rows={2}
              required
              value={chIntro}
              onChange={(e) => setChIntro(e.target.value)}
              placeholder="Introduction & board weightage overview..."
              className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
            <textarea
              rows={3}
              value={chExplain}
              onChange={(e) => setChExplain(e.target.value)}
              placeholder="Complete concept explanation..."
              className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
            <textarea
              rows={2}
              value={chNotes}
              onChange={(e) => setChNotes(e.target.value)}
              placeholder="Quick revision notes..."
              className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={chStatus}
                onChange={(e) => setChStatus(e.target.value as CurriculumStatus)}
                className="px-3 py-2 text-xs leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="Under Review">Under Review</option>
                <option value="Unverified">Unverified</option>
                <option value="Verified Official">Verified Official</option>
              </select>
              <input
                type="text"
                value={chSourceRef}
                onChange={(e) => setChSourceRef(e.target.value)}
                placeholder="Official source URL/doc"
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Diagrams, Illustrations &amp; Educational Photos ({chIllustrations.length})
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={illTitle}
                  onChange={(e) => setIllTitle(e.target.value)}
                  placeholder="Figure title (e.g., Ray Diagram)"
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                <select
                  value={illKind}
                  onChange={(e) => setIllKind(e.target.value as 'diagram' | 'illustration' | 'photo')}
                  className="px-2.5 py-1.5 text-xs leading-relaxed min-h-[38px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="diagram">Diagram</option>
                  <option value="illustration">Illustration</option>
                  <option value="photo">Educational Photo</option>
                </select>
              </div>
              <input
                type="text"
                value={illCaption}
                onChange={(e) => setIllCaption(e.target.value)}
                placeholder="Short caption (optional)"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <UploadPickerControls
                galleryLabel="Add Chapter Diagram / Photo"
                allowCamera={false}
                uploading={uploadingChImage}
                errorText={chImageError}
                onFilesSelected={(files) => {
                  const first = files[0];
                  if (first) void handleUploadChapterIllustration(first);
                }}
              />
              {chIllustrations.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {chIllustrations.map((ill) => (
                    <div
                      key={ill.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 space-y-1.5"
                    >
                      <ZoomableAuthThumbnail
                        src={ill.imageUrl}
                        alt={ill.title}
                        className="w-full h-24 object-contain rounded bg-slate-50 dark:bg-slate-950"
                      />
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">
                          {ill.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleRemoveChapterIllustration(ill.id)}
                          className="text-[11px] font-semibold text-rose-600 hover:underline shrink-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={uploadingChImage}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
            >
              {editingChapterId ? 'Update Chapter' : 'Save Chapter'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Existing Chapters
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[540px] overflow-y-auto">
              {chapters.map((ch) => {
                const subj = subjects.find((s) => s.id === ch.subjectId);
                return (
                  <div key={ch.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        {subj?.subjectName || ch.subjectId} · Ch. {ch.chapterNumber}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {ch.chapterName}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs">
                        <CurriculumStatusText status={ch.syllabusStatus} />
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">{ch.published ? 'Published' : 'Draft'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingChapterId(ch.id);
                          setChSubjectId(ch.subjectId);
                          setChNumber(ch.chapterNumber);
                          setChUnit(ch.unitName);
                          setChName(ch.chapterName);
                          setChIntro(ch.introduction);
                          setChExplain(ch.completeExplanation);
                          setChNotes(ch.revisionNotes);
                          setChStatus(ch.syllabusStatus);
                          setChSourceRef(ch.sourceReference);
                          setChIllustrations(ch.illustrations || []);
                          setChImageError('');
                        }}
                        aria-label={`Edit ${ch.chapterName}`}
                        className="p-1.5 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() =>
                            onRequestDelete({
                              colName: 'chapters',
                              id: ch.id,
                              entityType: 'Chapter',
                              label: ch.chapterName,
                            })
                          }
                          aria-label={`Delete ${ch.chapterName}`}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {subTab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveSubject}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {editingSubjectId ? 'Edit Subject' : 'Add Subject'}
              </h2>
              {editingSubjectId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubjectId(null);
                    setSubName('');
                    setSubCode('');
                    setSubTextbook('');
                    setSubCoverUrl('');
                    setSubCoverId('');
                    setSubCoverError('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={subBoardId}
                onChange={(e) => setSubBoardId(e.target.value)}
                className="px-3 py-2 text-xs leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.boardCode}
                  </option>
                ))}
              </select>
              <select
                value={subSessionId}
                onChange={(e) => setSubSessionId(e.target.value)}
                className="px-3 py-2 text-xs leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={subClassId}
                onChange={(e) => setSubClassId(e.target.value)}
                className="px-3 py-2 text-xs leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
              <select
                value={subStreamId}
                onChange={(e) => setSubStreamId(e.target.value)}
                className="px-3 py-2 text-xs leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {streams.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              required
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="Subject name (e.g., Accountancy / Vigyan)"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                required
                value={subCode}
                onChange={(e) => setSubCode(e.target.value)}
                placeholder="Code"
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={subTheory}
                onChange={(e) => setSubTheory(Number(e.target.value))}
                placeholder="Theory"
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <input
                type="number"
                min={0}
                max={50}
                value={subPractical}
                onChange={(e) => setSubPractical(Number(e.target.value))}
                placeholder="Practical"
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <input
              type="text"
              value={subTextbook}
              onChange={(e) => setSubTextbook(e.target.value)}
              placeholder="Prescribed textbook (optional)"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Subject Cover Image (Optional)
              </p>
              <UploadPickerControls
                galleryLabel={subCoverUrl ? 'Replace Cover Image' : 'Upload Subject Cover'}
                allowCamera={false}
                uploading={uploadingSubCover}
                errorText={subCoverError}
                onFilesSelected={(files) => {
                  const first = files[0];
                  if (first) void handleUploadSubjectCover(first);
                }}
              />
              {subCoverUrl && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <ZoomableAuthThumbnail
                    src={subCoverUrl}
                    alt={`${subName || 'Subject'} cover preview`}
                    className="h-16 w-28 object-cover rounded border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => void handleRemoveSubjectCover()}
                    className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove Cover
                  </button>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={uploadingSubCover}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
            >
              {editingSubjectId ? 'Update Subject' : 'Add Subject'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Subjects Catalog
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
              {subjects.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {s.coverImageUrl && (
                      <AuthImage
                        src={s.coverImageUrl}
                        alt={s.subjectName}
                        className="w-12 h-10 rounded object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {s.subjectName} <span className="font-mono text-xs text-slate-500">({s.subjectCode})</span>
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {s.boardId.toUpperCase()} · {s.classId} · {s.streamId} · {s.theoryMarks}+{s.practicalMarks} marks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingSubjectId(s.id);
                        setSubBoardId(s.boardId);
                        setSubSessionId(s.academicSessionId);
                        setSubClassId(s.classId);
                        setSubStreamId(s.streamId);
                        setSubName(s.subjectName);
                        setSubCode(s.subjectCode);
                        setSubTextbook(s.prescribedTextbook || '');
                        setSubTheory(s.theoryMarks);
                        setSubPractical(s.practicalMarks);
                        setSubCoverUrl(s.coverImageUrl || '');
                        setSubCoverId(s.coverImageId || '');
                        setSubCoverError('');
                      }}
                      aria-label={`Edit ${s.subjectName}`}
                      className="p-1.5 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() =>
                          onRequestDelete({
                            colName: 'subjects',
                            id: s.id,
                            entityType: 'Subject',
                            label: s.subjectName,
                          })
                        }
                        aria-label={`Delete ${s.subjectName}`}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'materials' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveMaterial}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {editingMaterialId ? 'Edit Study Material' : 'Add Study Material / Notes'}
              </h2>
              {editingMaterialId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMaterialId(null);
                    setMatTitle('');
                    setMatContent('');
                    setMatCitation('');
                    setMatImageUrl('');
                    setMatImageId('');
                    setMatImageError('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <select
              value={matSubjectId}
              onChange={(e) => setMatSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectName} ({s.boardId.toUpperCase()} · {s.classId})
                </option>
              ))}
            </select>
            <select
              value={matType}
              onChange={(e) => setMatType(e.target.value as MaterialType)}
              className="w-full px-3 py-2 text-xs leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="Textbook Notes">Textbook Notes</option>
              <option value="Chapter Summary">Chapter Summary</option>
              <option value="Formula Sheet">Formula Sheet</option>
              <option value="Important Questions">Important Questions</option>
              <option value="Model Paper">Model Paper</option>
              <option value="Previous Year Paper">Previous Year Paper</option>
              <option value="Practice Worksheet">Practice Worksheet</option>
              <option value="Official Syllabus">Official Syllabus</option>
            </select>
            <input
              type="text"
              required
              value={matTitle}
              onChange={(e) => setMatTitle(e.target.value)}
              placeholder="Document title"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
            <textarea
              rows={5}
              required
              value={matContent}
              onChange={(e) => setMatContent(e.target.value)}
              placeholder="Paste formatted notes, formulas, or syllabus checklist..."
              className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={matCitation}
              onChange={(e) => setMatCitation(e.target.value)}
              placeholder="Source citation / Official textbook reference"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Material Figure / Formula Diagram (Optional)
              </p>
              <UploadPickerControls
                galleryLabel={matImageUrl ? 'Replace Material Image' : 'Upload Material Image'}
                allowCamera={false}
                uploading={uploadingMatImage}
                errorText={matImageError}
                onFilesSelected={(files) => {
                  const first = files[0];
                  if (first) void handleUploadMaterialImage(first);
                }}
              />
              {matImageUrl && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <ZoomableAuthThumbnail
                    src={matImageUrl}
                    alt={matTitle || 'Material image preview'}
                    className="h-16 w-28 object-contain rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => void handleRemoveMaterialImage()}
                    className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={uploadingMatImage}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
            >
              {editingMaterialId ? 'Update Material' : 'Publish Material'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Library Items
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
              {materials.map((m) => (
                <div key={m.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {m.imageUrl && (
                      <AuthImage
                        src={m.imageUrl}
                        alt={m.title}
                        className="w-12 h-10 rounded object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold">{m.materialType}</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{m.title}</p>
                      <div className="mt-1">
                        <CurriculumStatusText status={m.verificationStatus} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingMaterialId(m.id);
                        setMatSubjectId(m.subjectId);
                        setMatType(m.materialType);
                        setMatTitle(m.title);
                        setMatContent(m.content);
                        setMatCitation(m.sourceCitation || '');
                        setMatImageUrl(m.imageUrl || '');
                        setMatImageId(m.imageId || '');
                        setMatImageError('');
                      }}
                      aria-label={`Edit ${m.title}`}
                      className="p-1.5 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() =>
                          onRequestDelete({
                            colName: 'learningMaterials',
                            id: m.id,
                            entityType: 'LearningMaterial',
                            label: m.title,
                          })
                        }
                        aria-label={`Delete ${m.title}`}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'boards' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            {isAdmin && (
              <form
                onSubmit={handleSaveBoard}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {editingBoardId ? 'Edit Board Blueprint' : 'Add Education Board'}
                  </h2>
                  {editingBoardId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBoardId(null);
                        setBoardName('');
                        setBoardCode('');
                        setBoardDesc('');
                        setBoardPattern('');
                        setBoardUrl('');
                      }}
                      className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    placeholder="Board Name"
                    className="col-span-2 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <input
                    type="text"
                    required
                    value={boardCode}
                    onChange={(e) => setBoardCode(e.target.value)}
                    placeholder="Code (UPMSP)"
                    className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <textarea
                  rows={2}
                  value={boardDesc}
                  onChange={(e) => setBoardDesc(e.target.value)}
                  placeholder="Board curriculum description..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <textarea
                  rows={2}
                  value={boardPattern}
                  onChange={(e) => setBoardPattern(e.target.value)}
                  placeholder="Exam pattern summary..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="text"
                  value={boardUrl}
                  onChange={(e) => setBoardUrl(e.target.value)}
                  placeholder="Official board website URL"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                >
                  {editingBoardId ? 'Update Board' : 'Add Board'}
                </button>
              </form>
            )}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Configured Education Boards
              </h2>
              <div className="space-y-3">
                {boards.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {b.name} ({b.boardCode})
                      </span>
                      <div className="flex items-center gap-2">
                        <CurriculumStatusText status={b.status} />
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setEditingBoardId(b.id);
                              setBoardName(b.name);
                              setBoardCode(b.boardCode);
                              setBoardDesc(b.description);
                              setBoardPattern(b.examPatternSummary);
                              setBoardUrl(b.officialSourceUrl || '');
                            }}
                            aria-label={`Edit ${b.name}`}
                            className="p-1 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{b.examPatternSummary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 h-fit">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Academic Sessions
            </h2>
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Session {s.name}</p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {s.startDate} to {s.endDate}
                    </p>
                  </div>
                  <select
                    disabled={!isAdmin}
                    value={s.status}
                    onChange={async (e) => {
                      try {
                        await adminUpsert(
                          'academicSessions',
                          { ...s, status: e.target.value as AcademicSession['status'] },
                          'UPDATE_SESSION_STATUS',
                          'AcademicSession'
                        );
                        showToast(`Session ${s.name} updated.`, 'success');
                      } catch (err: any) {
                        showToast(err?.message || 'Failed to update session.', 'error');
                      }
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
                  >
                    <option value="Active">Active</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'tests' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveCustomTest}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {editingCustomTestId ? 'Edit Custom Test / Mock' : 'Create Custom Test / Mock Exam'}
              </h2>
              {editingCustomTestId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCustomTestId(null);
                    setCtTitle('');
                    setCtDesc('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={ctTitle}
              onChange={(e) => setCtTitle(e.target.value)}
              placeholder="Test / Mock Exam Title"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <select
              value={ctCategory}
              onChange={(e) => setCtCategory(e.target.value as TestCategory)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Daily Practice Test">Daily Practice Test</option>
              <option value="Weekly Test">Weekly Test</option>
              <option value="Chapter Test">Chapter Test</option>
              <option value="Topic Test">Topic Test</option>
              <option value="Full Subject Test">Full Subject Test</option>
              <option value="Previous Year Question Test">Previous Year Question Test</option>
              <option value="Board Pattern Mock Exam">Board Pattern Mock Exam</option>
              <option value="Revision Test">Revision Test</option>
            </select>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={ctBoardId}
                onChange={(e) => setCtBoardId(e.target.value)}
                className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="all">All Boards</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.boardCode}
                  </option>
                ))}
              </select>
              <select
                value={ctClassId}
                onChange={(e) => setCtClassId(e.target.value)}
                className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
              <select
                value={ctSubjectId}
                onChange={(e) => setCtSubjectId(e.target.value)}
                className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="all">Student’s Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subjectName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Duration (mins)</label>
                <input
                  type="number"
                  min={5}
                  max={210}
                  value={ctDuration}
                  onChange={(e) => setCtDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Question Count</label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={ctCount}
                  onChange={(e) => setCtCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={ctIncludeWritten}
                onChange={(e) => setCtIncludeWritten(e.target.checked)}
                className="rounded accent-indigo-700"
              />
              <span>Include Written / Subjective Questions</span>
            </label>
            <textarea
              rows={2}
              value={ctDesc}
              onChange={(e) => setCtDesc(e.target.value)}
              placeholder="Short description for students..."
              className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <button
              type="submit"
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
            >
              {editingCustomTestId ? 'Update Custom Test' : 'Publish Custom Test'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Published Test &amp; Mock Templates
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
              {customTests.map((ct) => (
                <div key={ct.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono text-indigo-700 dark:text-indigo-400">
                      {ct.testCategory} · {ct.durationMinutes} mins · {ct.boardId.toUpperCase()}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{ct.title}</p>
                    {ct.description && <p className="text-xs text-slate-500 mt-0.5">{ct.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingCustomTestId(ct.id);
                        setCtTitle(ct.title);
                        setCtCategory(ct.testCategory);
                        setCtBoardId(ct.boardId);
                        setCtClassId(ct.classId);
                        setCtSubjectId(ct.subjectId);
                        setCtDuration(ct.durationMinutes);
                        setCtCount(ct.questionCount || 5);
                        setCtIncludeWritten(Boolean(ct.includeWritten));
                        setCtDesc(ct.description || '');
                      }}
                      aria-label={`Edit ${ct.title}`}
                      className="p-1.5 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() =>
                          onRequestDelete({
                            colName: 'customTests',
                            id: ct.id,
                            entityType: 'CustomTestConfig',
                            label: ct.title,
                          })
                        }
                        aria-label={`Delete ${ct.title}`}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. QUESTION MANAGEMENT (CREATE, EDIT, DELETE) & VERIFIED PYQ GUARD
// ---------------------------------------------------------------------------
const AdminQuestionsSection: React.FC<{
  isAdmin: boolean;
  subjects: Subject[];
  chapters: Chapter[];
  questions: Question[];
  adminUpsert: ReturnType<typeof useApp>['adminUpsert'];
  onRequestDelete: (d: ConfirmDeleteState) => void;
  showToast: ReturnType<typeof useApp>['showToast'];
}> = ({ isAdmin, subjects, chapters, questions, adminUpsert, onRequestDelete, showToast }) => {
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const subjectChapters = chapters.filter((c) => c.subjectId === subjectId);
  const [chapterId, setChapterId] = useState(subjectChapters[0]?.id || '');
  const [topicName, setTopicName] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('MCQ');
  const [optionsText, setOptionsText] = useState('Option A\nOption B\nOption C\nOption D');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [marks, setMarks] = useState(1);
  const [priority, setPriority] = useState<PriorityLevel>('YELLOW');
  const [sourceType, setSourceType] = useState<QuestionSourceType>('Teacher Curated Practice');
  const [isPyq, setIsPyq] = useState(false);
  const [verifiedYearsText, setVerifiedYearsText] = useState('');
  const [sourceDocRef, setSourceDocRef] = useState('');
  const [filterSubjId, setFilterSubjId] = useState<string>('all');

  const handleSubjectChange = (newSubId: string) => {
    setSubjectId(newSubId);
    const firstCh = chapters.find((c) => c.subjectId === newSubId);
    setChapterId(firstCh?.id || '');
  };

  const resetForm = () => {
    setEditingQuestionId(null);
    setQuestionText('');
    setCorrectAnswer('');
    setExplanation('');
    setVerifiedYearsText('');
    setSourceDocRef('');
    setIsPyq(false);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const subj = subjects.find((s) => s.id === subjectId);
    if (!subj || !chapterId || !questionText.trim()) return;

    const years = verifiedYearsText
      .split(',')
      .map((y) => y.trim())
      .filter(Boolean);

    if (isPyq && (years.length === 0 || !sourceDocRef.trim())) {
      showToast(
        'Verified PYQs require both exact Examination Years (e.g., 2023, 2024) and an Official Source Reference.',
        'error'
      );
      return;
    }

    const hasOptionChoices =
      questionType === 'MCQ' ||
      questionType === 'Multiple Correct' ||
      questionType === 'True/False' ||
      questionType === 'Diagram-Based';

    const parsedOptions = hasOptionChoices
      ? optionsText
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined;

    try {
      const existing = questions.find((q) => q.id === editingQuestionId);
      const q: Question = {
        ...(existing || {}),
        id: editingQuestionId || `q_${Date.now()}`,
        boardId: subj.boardId,
        classId: subj.classId,
        academicSessionId: subj.academicSessionId,
        subjectId: subj.id,
        chapterId,
        topicName: topicName.trim() || 'Core Topic',
        questionText: questionText.trim(),
        questionType,
        options: parsedOptions,
        correctAnswer: correctAnswer.trim() || (parsedOptions?.[0] ?? undefined),
        correctAnswers:
          questionType === 'Multiple Correct'
            ? correctAnswer
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
        modelAnswer: !hasOptionChoices ? correctAnswer.trim() : existing?.modelAnswer,
        explanation: explanation.trim() || 'Step-by-step board answer explanation.',
        marks: Number(marks) || 1,
        priority,
        isPyq,
        verifiedYears: isPyq ? years : undefined,
        verifiedAppearances: isPyq ? years.length : undefined,
        sourceType: isPyq ? 'Verified Board Paper' : sourceType,
        sourceDocumentRef: sourceDocRef.trim() || undefined,
        verificationStatus: isPyq ? 'Verified Official' : existing?.verificationStatus || 'Under Review',
        published: existing ? existing.published : true,
      };
      await adminUpsert('questions', q, editingQuestionId ? 'UPDATE_QUESTION' : 'CREATE_QUESTION', 'Question');
      resetForm();
      showToast(editingQuestionId ? 'Question updated.' : 'Question added to bank.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save question.', 'error');
    }
  };

  const shownQuestions = useMemo(() => {
    if (filterSubjId === 'all') return questions;
    return questions.filter((q) => q.subjectId === filterSubjId);
  }, [questions, filterSubjId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <form
        onSubmit={handleSaveQuestion}
        className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 h-fit"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            {editingQuestionId ? 'Edit Question / PYQ' : 'Create Question or Verified PYQ'}
          </h2>
          {editingQuestionId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <select
          value={subjectId}
          onChange={(e) => handleSubjectChange(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.subjectName} ({s.boardId.toUpperCase()} · {s.classId})
            </option>
          ))}
        </select>

        <select
          value={chapterId}
          onChange={(e) => setChapterId(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
        >
          {subjectChapters.map((c) => (
            <option key={c.id} value={c.id}>
              Ch {c.chapterNumber}: {c.chapterName}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-3 gap-2">
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as QuestionType)}
            className="col-span-2 px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="MCQ">MCQ</option>
            <option value="Multiple Correct">Multiple Correct</option>
            <option value="True/False">True/False</option>
            <option value="Fill in the Blanks">Fill in the Blanks</option>
            <option value="Match the Following">Match the Following</option>
            <option value="Very Short Answer">Very Short Answer</option>
            <option value="Short Answer">Short Answer</option>
            <option value="Long Answer">Long Answer</option>
            <option value="Numerical">Numerical</option>
            <option value="Diagram-Based">Diagram-Based</option>
            <option value="Case-Based">Case-Based</option>
          </select>
          <input
            type="number"
            min={1}
            max={20}
            value={marks}
            onChange={(e) => setMarks(Number(e.target.value))}
            placeholder="Marks"
            className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as PriorityLevel)}
            className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="RED">RED (High Priority)</option>
            <option value="YELLOW">YELLOW (Core Practice)</option>
            <option value="GREEN">GREEN (Concept Builder)</option>
          </select>
          <input
            type="text"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="Topic name"
            className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>

        <textarea
          rows={3}
          required
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Enter question statement..."
          className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
        />

        {(questionType === 'MCQ' ||
          questionType === 'Multiple Correct' ||
          questionType === 'True/False' ||
          questionType === 'Diagram-Based') && (
          <textarea
            rows={4}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder="One option per line"
            className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        )}

        <textarea
          rows={2}
          required
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(e.target.value)}
          placeholder={
            questionType === 'MCQ' || questionType === 'True/False'
              ? 'Exact text of the correct option'
              : questionType === 'Multiple Correct'
              ? 'Comma-separated correct options'
              : 'Model board answer & marking scheme points'
          }
          className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
        />

        <textarea
          rows={2}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Step-by-step explanation..."
          className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
        />

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={isPyq}
              onChange={(e) => setIsPyq(e.target.checked)}
              className="rounded border-slate-300 accent-indigo-700"
            />
            <span>Mark as Verified Previous Year Question (PYQ)</span>
          </label>
          {isPyq ? (
            <>
              <input
                type="text"
                value={verifiedYearsText}
                onChange={(e) => setVerifiedYearsText(e.target.value)}
                placeholder="Verified board exam years (e.g., 2022, 2024)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                type="text"
                value={sourceDocRef}
                onChange={(e) => setSourceDocRef(e.target.value)}
                placeholder="Official Board Paper URL / Document Citation"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </>
          ) : (
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as QuestionSourceType)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Teacher Curated Practice">Teacher Curated Practice</option>
              <option value="Predicted Practice">Predicted Practice</option>
              <option value="Official Model Paper">Official Model Paper</option>
            </select>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
        >
          {editingQuestionId ? 'Update Question' : 'Save Question'}
        </button>
      </form>

      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Question Bank ({shownQuestions.length})
          </h2>
          <select
            value={filterSubjId}
            onChange={(e) => setFilterSubjId(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.subjectName} ({s.boardId.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[680px] overflow-y-auto">
          {shownQuestions.map((q) => (
            <div key={q.id} className="py-3.5 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <PriorityText priority={q.priority} />
                  <span className="text-slate-400">·</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {q.questionType} ({q.marks}m)
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{q.sourceType}</span>
                  <span className="text-slate-400">·</span>
                  <CurriculumStatusText status={q.verificationStatus} />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{q.questionText}</p>
                {q.isPyq && q.verifiedYears && (
                  <p className="text-[11px] font-mono text-indigo-700 dark:text-indigo-400">
                    Verified PYQ Years: {q.verifiedYears.join(', ')} ({q.sourceDocumentRef})
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditingQuestionId(q.id);
                    setSubjectId(q.subjectId);
                    setChapterId(q.chapterId);
                    setTopicName(q.topicName);
                    setQuestionText(q.questionText);
                    setQuestionType(q.questionType);
                    setOptionsText((q.options || []).join('\n'));
                    setCorrectAnswer(
                      q.correctAnswers?.join(', ') || q.correctAnswer || q.modelAnswer || ''
                    );
                    setExplanation(q.explanation);
                    setMarks(q.marks);
                    setPriority(q.priority);
                    setSourceType(q.sourceType);
                    setIsPyq(q.isPyq);
                    setVerifiedYearsText((q.verifiedYears || []).join(', '));
                    setSourceDocRef(q.sourceDocumentRef || '');
                  }}
                  aria-label="Edit question"
                  className="p-1.5 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() =>
                      onRequestDelete({
                        colName: 'questions',
                        id: q.id,
                        entityType: 'Question',
                        label: q.questionText.slice(0, 50),
                      })
                    }
                    aria-label="Delete question"
                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 4. CONTENT VERIFICATION QUEUE
// ---------------------------------------------------------------------------
const AdminVerificationSection: React.FC<{
  chapters: Chapter[];
  materials: LearningMaterial[];
  questions: Question[];
  subjects: Subject[];
  adminUpsert: ReturnType<typeof useApp>['adminUpsert'];
  showToast: ReturnType<typeof useApp>['showToast'];
}> = ({ chapters, materials, questions, subjects, adminUpsert, showToast }) => {
  const [statusFilter, setStatusFilter] = useState<'review_queue' | CurriculumStatus>('review_queue');

  const matchesFilter = (st: CurriculumStatus) =>
    statusFilter === 'review_queue' ? st === 'Under Review' || st === 'Unverified' : st === statusFilter;

  const filteredChapters = chapters.filter((c) => matchesFilter(c.syllabusStatus));
  const filteredMaterials = materials.filter((m) => matchesFilter(m.verificationStatus));
  const filteredQuestions = questions.filter((q) => matchesFilter(q.verificationStatus));

  const updateChapterStatus = async (ch: Chapter, status: CurriculumStatus) => {
    if (status === 'Verified Official' && (!ch.sourceReference || ch.sourceReference.toLowerCase().includes('pending'))) {
      showToast('Add a valid official sourceReference before marking Verified Official.', 'error');
      return;
    }
    try {
      await adminUpsert('chapters', { ...ch, syllabusStatus: status }, 'VERIFY_CHAPTER', 'Chapter');
      showToast(`Chapter marked ${status}.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Verification update failed.', 'error');
    }
  };

  const updateMaterialStatus = async (m: LearningMaterial, status: CurriculumStatus) => {
    try {
      await adminUpsert('learningMaterials', { ...m, verificationStatus: status }, 'VERIFY_MATERIAL', 'LearningMaterial');
      showToast(`Material marked ${status}.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Verification update failed.', 'error');
    }
  };

  const updateQuestionStatus = async (q: Question, status: CurriculumStatus) => {
    try {
      await adminUpsert('questions', { ...q, verificationStatus: status }, 'VERIFY_QUESTION', 'Question');
      showToast(`Question marked ${status}.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Verification update failed.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Syllabus &amp; Content Verification Queue
          </h2>
          <p className="text-xs text-slate-500">
            Verify source citations before marking any syllabus item or question as Verified Official.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
        >
          <option value="review_queue">Pending Queue (Under Review &amp; Unverified)</option>
          <option value="Verified Official">Verified Official</option>
          <option value="Under Review">Under Review</option>
          <option value="Unverified">Unverified</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* Chapters Queue */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Chapters ({filteredChapters.length})
        </h3>
        {filteredChapters.length === 0 ? (
          <p className="text-xs text-slate-500">No chapters in this verification filter.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {filteredChapters.map((ch) => {
              const subj = subjects.find((s) => s.id === ch.subjectId);
              return (
                <div key={ch.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      {subj?.subjectName || ch.subjectId} · Source: {ch.sourceReference}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Ch {ch.chapterNumber}: {ch.chapterName}
                    </p>
                    <CurriculumStatusText status={ch.syllabusStatus} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateChapterStatus(ch, 'Verified Official')}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg cursor-pointer"
                    >
                      Approve Official
                    </button>
                    <button
                      onClick={() => updateChapterStatus(ch, 'Archived')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Materials & Questions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Materials ({filteredMaterials.length})
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
            {filteredMaterials.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{m.title}</p>
                  <p className="text-xs text-slate-500">{m.materialType}</p>
                </div>
                <button
                  onClick={() => updateMaterialStatus(m, 'Verified Official')}
                  className="px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg shrink-0 cursor-pointer"
                >
                  Verify
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Questions ({filteredQuestions.length})
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
            {filteredQuestions.map((q) => (
              <div key={q.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{q.questionText}</p>
                  <p className="text-xs text-slate-500">{q.sourceType}</p>
                </div>
                <button
                  onClick={() => updateQuestionStatus(q, 'Verified Official')}
                  className="px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg shrink-0 cursor-pointer"
                >
                  Verify
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 5. PAYMENT MANAGEMENT & GLOBAL SYSTEM SETTINGS
// ---------------------------------------------------------------------------
const AdminPaymentsSettingsSection: React.FC<{
  isAdmin: boolean;
  systemSettings: ReturnType<typeof useApp>['systemSettings'];
  payments: ReturnType<typeof useApp>['payments'];
  adminUpsert: ReturnType<typeof useApp>['adminUpsert'];
  showToast: ReturnType<typeof useApp>['showToast'];
}> = ({ isAdmin, systemSettings, payments, adminUpsert, showToast }) => {
  const [paymentsEnabled, setPaymentsEnabled] = useState(systemSettings.paymentsEnabled);
  const [guardianAge, setGuardianAge] = useState(systemSettings.guardianAgeThreshold || 18);
  const [aiModel, setAiModel] = useState(systemSettings.aiModel || 'gemini-4-hydrogen');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await adminUpsert(
        'systemSettings',
        {
          id: 'global',
          paymentsEnabled,
          guardianAgeThreshold: Number(guardianAge) || 18,
          aiModel,
          updatedAt: new Date().toISOString(),
        },
        'UPDATE_SYSTEM_SETTINGS',
        'SystemSetting'
      );
      showToast('System settings updated.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update system settings.', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <form
        onSubmit={handleSaveSettings}
        className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 h-fit"
      >
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Platform &amp; Payment Configuration
        </h2>

        <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
          Payments remain disabled on the server until <span className="font-mono">PAYMENTS_ENABLED=true</span> and payment provider webhook secrets are configured in the backend environment.
        </div>

        <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            disabled={!isAdmin}
            checked={paymentsEnabled}
            onChange={(e) => setPaymentsEnabled(e.target.checked)}
            className="rounded border-slate-300 accent-indigo-700"
          />
          <span>Enable Modular Subscription UI Flag</span>
        </label>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Guardian Consent Age Threshold (India DPDP)
          </label>
          <input
            type="number"
            min={13}
            max={21}
            disabled={!isAdmin}
            value={guardianAge}
            onChange={(e) => setGuardianAge(Number(e.target.value))}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Server Gemini AI Model
          </label>
          <input
            type="text"
            disabled={!isAdmin}
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>

        {isAdmin && (
          <button
            type="submit"
            className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            Save Configuration
          </button>
        )}
      </form>

      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Verified Payment Records
          </h2>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Client writes blocked by Firestore Rules</span>
          </span>
        </div>

        {payments.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No live payment transactions recorded. Students currently enjoy full Free Access.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500">
                  <th className="pb-2">Student</th>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2">Provider Tx</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 font-mono">{p.studentId}</td>
                    <td className="py-2.5">{p.planName}</td>
                    <td className="py-2.5 font-mono">{p.providerTransactionId}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">
                      {p.currency} {p.amount}
                    </td>
                    <td className="py-2.5 text-right font-semibold">{p.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 6. ADMIN SUPPORT DESK (TICKETS, OFFICIAL CONTACT INFO, FAQS & FEEDBACK)
// ---------------------------------------------------------------------------
const AdminSupportDeskSection: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const {
    supportContact,
    supportFaqs,
    supportTickets,
    feedbackList,
    refreshSupportData,
    adminReplySupportTicket,
    adminSaveContactInfo,
    adminSaveFaq,
    adminDeleteFaq,
    adminUpdateFeedback,
    showToast,
  } = useApp();

  const [subTab, setSubTab] = useState<'tickets' | 'contact' | 'faqs' | 'feedback'>('tickets');
  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SupportTicketStatus>('ALL');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, SupportTicketStatus>>({});
  const [savingTicketId, setSavingTicketId] = useState<string | null>(null);

  // Contact editor state
  const [ownerName, setOwnerName] = useState(supportContact.ownerName || 'ABHIMANYU OFFICIAL HACKER');
  const [supportEmail, setSupportEmail] = useState(supportContact.supportEmail || '');
  const [supportPhone, setSupportPhone] = useState(supportContact.supportPhone || '');
  const [supportAvailability, setSupportAvailability] = useState(supportContact.supportAvailability || '');
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState(supportContact.whatsappChannelUrl || '');
  const [whatsappNumber, setWhatsappNumber] = useState(supportContact.whatsappNumber || '');
  const [savingContact, setSavingContact] = useState(false);

  // FAQ editor state
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqCategory, setFaqCategory] = useState<FaqCategory>('Help Center');
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqOrder, setFaqOrder] = useState(1);
  const [faqPublished, setFaqPublished] = useState(true);
  const [savingFaq, setSavingFaq] = useState(false);

  const filteredTickets = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    return supportTickets
      .filter((t) => statusFilter === 'ALL' || t.status === statusFilter)
      .filter(
        (t) =>
          !q ||
          t.ticketNumber.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.studentName.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
  }, [supportTickets, statusFilter, ticketSearch]);

  const handleTicketUpdate = async (ticketId: string, currentStatus: SupportTicketStatus, currentReply?: string) => {
    if (!isAdmin) return;
    setSavingTicketId(ticketId);
    try {
      const nextStatus = statusDrafts[ticketId] || currentStatus;
      const nextReply = replyDrafts[ticketId] !== undefined ? replyDrafts[ticketId] : currentReply || '';
      await adminReplySupportTicket(ticketId, nextStatus, nextReply);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update ticket.', 'error');
    } finally {
      setSavingTicketId(null);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || savingContact) return;
    setSavingContact(true);
    try {
      const next: SupportContactInfo = {
        id: 'contact',
        ownerName: ownerName.trim() || 'ABHIMANYU OFFICIAL HACKER',
        supportEmail: supportEmail.replace(/\s+/g, '').trim(),
        supportPhone: supportPhone.replace(/[^\d+]/g, '').trim(),
        supportAvailability: supportAvailability.trim(),
        whatsappChannelUrl: whatsappChannelUrl.trim(),
        whatsappNumber: whatsappNumber.replace(/[^\d+]/g, '').trim(),
        updatedAt: new Date().toISOString(),
      };
      await adminSaveContactInfo(next);
    } catch (err: any) {
      showToast(err?.message || 'Could not update contact information.', 'error');
    } finally {
      setSavingContact(false);
    }
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || savingFaq) return;
    setSavingFaq(true);
    try {
      const item: FaqItem = {
        id: editingFaqId || `faq_${Date.now()}`,
        category: faqCategory,
        question: faqQuestion.trim(),
        answer: faqAnswer.trim(),
        orderIndex: Number(faqOrder) || 1,
        published: faqPublished,
        updatedAt: new Date().toISOString(),
      };
      await adminSaveFaq(item);
      setEditingFaqId(null);
      setFaqQuestion('');
      setFaqAnswer('');
      setFaqOrder(supportFaqs.length + 1);
      setFaqPublished(true);
    } catch (err: any) {
      showToast(err?.message || 'Could not save FAQ.', 'error');
    } finally {
      setSavingFaq(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['tickets', `Support Tickets (${supportTickets.length})`],
              ['contact', 'Official Contact Details'],
              ['faqs', `Manage FAQs (${supportFaqs.length})`],
              ['feedback', `Student Feedback (${feedbackList.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                subTab === id
                  ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => refreshSupportData().catch(() => {})}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Support Desk</span>
        </button>
      </div>

      {/* 1. TICKETS */}
      {subTab === 'tickets' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Student Support Tickets
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Search Ticket ID, category, or student..."
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs leading-normal min-h-[38px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              No support tickets matched your current filter.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((t) => {
                const draftStatus = statusDrafts[t.id] || t.status;
                const draftReply =
                  replyDrafts[t.id] !== undefined ? replyDrafts[t.id] : t.adminReply || '';
                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                            {t.ticketNumber}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {t.category}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">
                            {t.studentName} ({t.studentContact})
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{t.subject}</p>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(t.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                      {t.description}
                    </p>

                    {t.screenshotDataUrl && (
                      <ZoomableAuthThumbnail
                        src={t.screenshotDataUrl}
                        alt={`Screenshot for ${t.ticketNumber}`}
                        className="max-h-40 rounded-lg border border-slate-200 dark:border-slate-700 object-contain"
                      />
                    )}

                    {isAdmin && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Ticket Status
                          </label>
                          <select
                            value={draftStatus}
                            onChange={(e) =>
                              setStatusDrafts((prev) => ({
                                ...prev,
                                [t.id]: e.target.value as SupportTicketStatus,
                              }))
                            }
                            className="w-full px-3 py-2 text-xs leading-relaxed min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </div>
                        <div className="md:col-span-7">
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Official Reply to Student
                          </label>
                          <textarea
                            rows={2}
                            value={draftReply}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))
                            }
                            placeholder="Write resolution note or reply to student..."
                            className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="md:col-span-2 md:pt-5">
                          <button
                            type="button"
                            disabled={savingTicketId === t.id}
                            onClick={() => handleTicketUpdate(t.id, t.status, t.adminReply)}
                            className="w-full px-3 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
                          >
                            {savingTicketId === t.id ? 'Saving...' : 'Save Reply'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. OFFICIAL CONTACT DETAILS */}
      {subTab === 'contact' && (
        <form
          onSubmit={handleSaveContact}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-2xl space-y-4"
        >
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Editable Official Contact Information
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Changes appear immediately in the student Help &amp; Support Center. Leave WhatsApp Support Number blank if direct WhatsApp chat is not enabled; clearing all contact fields shows "Support contact is being updated".
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                App Owner Display Name
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Official Support Gmail
              </label>
              <input
                type="email"
                disabled={!isAdmin}
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="abhimanyuking2411@gmail.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Official Contact Number
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="7492996601"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Authorized Direct WhatsApp Number (Optional)
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Only set if direct WhatsApp chat is authorized"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Support Availability Note
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={supportAvailability}
              onChange={(e) => setSupportAvailability(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Official WhatsApp Channel URL
            </label>
            <input
              type="url"
              disabled={!isAdmin}
              value={whatsappChannelUrl}
              onChange={(e) => setWhatsappChannelUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          {isAdmin && (
            <button
              type="submit"
              disabled={savingContact}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
            >
              {savingContact ? 'Saving...' : 'Save Contact Details'}
            </button>
          )}
        </form>
      )}

      {/* 3. MANAGE FAQS */}
      {subTab === 'faqs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveFaq}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {editingFaqId ? 'Edit FAQ' : 'Add New FAQ'}
              </h2>
              {editingFaqId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingFaqId(null);
                    setFaqQuestion('');
                    setFaqAnswer('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={faqCategory}
                onChange={(e) => setFaqCategory(e.target.value as FaqCategory)}
                className="px-3 py-2 text-xs leading-normal min-h-[38px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Help Center">Help Center</option>
                <option value="Account & Login">Account &amp; Login</option>
                <option value="AI Teacher & Voice">AI Teacher &amp; Voice</option>
                <option value="Tests & Syllabus">Tests &amp; Syllabus</option>
                <option value="Technical Support">Technical Support</option>
                <option value="Payments">Payments</option>
                <option value="Privacy & Security">Privacy &amp; Security</option>
              </select>
              <input
                type="number"
                min={1}
                value={faqOrder}
                onChange={(e) => setFaqOrder(Number(e.target.value))}
                placeholder="Order #"
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <input
              type="text"
              required
              value={faqQuestion}
              onChange={(e) => setFaqQuestion(e.target.value)}
              placeholder="FAQ Question"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <textarea
              rows={4}
              required
              value={faqAnswer}
              onChange={(e) => setFaqAnswer(e.target.value)}
              placeholder="Clear step-by-step FAQ answer..."
              className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={faqPublished}
                onChange={(e) => setFaqPublished(e.target.checked)}
                className="rounded border-slate-300 accent-indigo-700"
              />
              <span>Publish in Help Center</span>
            </label>
            {isAdmin && (
              <button
                type="submit"
                disabled={savingFaq}
                className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
              >
                {savingFaq ? 'Saving...' : editingFaqId ? 'Update FAQ' : 'Add FAQ'}
              </button>
            )}
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Published &amp; Draft FAQs
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
              {supportFaqs.map((faq) => (
                <div key={faq.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                      #{faq.orderIndex} · {faq.category} · {faq.published ? 'Published' : 'Draft'}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{faq.question}</p>
                    <p className="text-xs text-slate-500 line-clamp-2">{faq.answer}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFaqId(faq.id);
                          setFaqCategory(faq.category);
                          setFaqQuestion(faq.question);
                          setFaqAnswer(faq.answer);
                          setFaqOrder(faq.orderIndex);
                          setFaqPublished(faq.published);
                        }}
                        aria-label={`Edit ${faq.question}`}
                        className="p-1.5 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => adminDeleteFaq(faq.id).catch(() => {})}
                        aria-label={`Delete ${faq.question}`}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. STUDENT FEEDBACK */}
      {subTab === 'feedback' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Student Feedback &amp; Suggestions ({feedbackList.length})
          </h2>
          {feedbackList.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No feedback submitted yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {feedbackList.map((fb) => (
                <div key={fb.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-500">
                      {fb.category} · {fb.studentName || fb.studentId} ·{' '}
                      {new Date(fb.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{fb.subject}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{fb.message}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      {(['open', 'reviewed', 'resolved'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => adminUpdateFeedback(fb.id, st).catch(() => {})}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border capitalize cursor-pointer ${
                            fb.status === st
                              ? 'border-indigo-700 bg-indigo-700 text-white'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

