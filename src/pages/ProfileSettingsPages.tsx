import React, { useState } from 'react';
import { Bell, Check, Monitor, Moon, Shield, Sun, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { AuthImage, ImageLightboxModal, UploadPickerControls } from '../components/ImageTools.tsx';
import { validateAndCompressImageFile } from '../lib/imageUtils.ts';
import { ThemeMode } from '../types/index.ts';

export const NotificationsPage: React.FC = () => {
  const { notifications, announcements, markNotificationRead, studentProfile, saveStudentOnboarding } = useApp();

  const prefs = studentProfile?.notificationPrefs || {
    dailyTasks: true,
    upcomingTests: true,
    revisionReminders: true,
    announcements: true,
  };

  const togglePref = async (key: keyof typeof prefs) => {
    if (!studentProfile) return;
    await saveStudentOnboarding({
      ...studentProfile,
      notificationPrefs: { ...prefs, [key]: !prefs[key] },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Notifications &amp; Reminders
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Stay updated on study tasks, spaced revisions, mock exams, and board announcements.
        </p>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
        <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Notification Preferences
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {(
            [
              ['dailyTasks', 'Daily study task reminders'],
              ['upcomingTests', 'Upcoming test & mock exam alerts'],
              ['revisionReminders', 'Pending spaced revision reminders'],
              ['announcements', 'Important board announcements'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs[k]}
                onChange={() => togglePref(k)}
                className="rounded border-slate-300 accent-indigo-700"
              />
              <span className="text-slate-700 dark:text-slate-300">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Recent Updates
        </h2>
        {notifications.length === 0 && announcements.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">
            <Bell className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            All caught up!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => (
              <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <p className={`text-sm font-semibold ${n.read ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{n.message}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markNotificationRead(n)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400 cursor-pointer shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Read</span>
                  </button>
                )}
              </div>
            ))}
            {announcements
              .filter((a) => a.published)
              .map((a) => (
                <div key={a.id} className="py-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{a.content}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const StudentProfilePage: React.FC = () => {
  const {
    appUser,
    studentProfile,
    boards,
    classes,
    sessions,
    streams,
    navigate,
    submitFeedback,
    deleteMyAccount,
    uploadImage,
    deleteImage,
    updateUserProfilePhoto,
    showToast,
  } = useApp();

  const [fbCategory, setFbCategory] = useState<'Syllabus Issue' | 'Question Correction' | 'App Feedback' | 'Bug Report'>('App Feedback');
  const [fbSubject, setFbSubject] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [lastPhotoFile, setLastPhotoFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const board = boards.find((b) => b.id === studentProfile?.boardId);
  const cls = classes.find((c) => c.id === studentProfile?.classId);
  const session = sessions.find((s) => s.id === studentProfile?.academicSessionId);
  const stream = streams.find((st) => st.id === studentProfile?.streamId);

  const processProfilePhotoUpload = async (file: File) => {
    setLastPhotoFile(file);
    setPhotoError('');
    setPhotoUploading(true);
    setPhotoProgress('Processing image...');
    try {
      const processed = await validateAndCompressImageFile(file, {
        maxDimension: 720,
        maxBytes: 700_000,
      });
      setPhotoProgress('Uploading securely...');
      const prevUrl = appUser?.photoUrl || '';
      const uploaded = await uploadImage({
        dataUrl: processed.dataUrl,
        category: 'profile',
        visibility: 'private',
        altText: `${appUser?.displayName || 'Student'} profile photo`,
      });
      await updateUserProfilePhoto(uploaded.url);
      if (prevUrl.startsWith('/api/images/')) {
        const oldId = prevUrl.replace('/api/images/', '').split('?')[0];
        if (oldId && oldId !== uploaded.image.id) {
          deleteImage(oldId).catch(() => {});
        }
      }
      setLastPhotoFile(null);
    } catch (err: any) {
      const msg = err?.message || 'Could not upload profile photo.';
      setPhotoError(msg);
      showToast(msg, 'error');
    } finally {
      setPhotoUploading(false);
      setPhotoProgress('');
    }
  };

  const handleRemoveProfilePhoto = async () => {
    if (!appUser?.photoUrl) return;
    setPhotoUploading(true);
    setPhotoError('');
    try {
      const oldUrl = appUser.photoUrl;
      await updateUserProfilePhoto('');
      if (oldUrl.startsWith('/api/images/')) {
        const oldId = oldUrl.replace('/api/images/', '').split('?')[0];
        if (oldId) deleteImage(oldId).catch(() => {});
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not remove photo.', 'error');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser || !fbSubject.trim() || !fbMessage.trim()) return;
    await submitFeedback({
      id: `fb_${Date.now()}`,
      studentId: appUser.uid,
      category: fbCategory,
      subject: fbSubject.trim(),
      message: fbMessage.trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
    });
    setFbSubject('');
    setFbMessage('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
        Student Profile &amp; Privacy
      </h1>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => appUser?.photoUrl && setPreviewOpen(true)}
              aria-label="Preview profile photo"
              className={`w-20 h-20 rounded-full overflow-hidden bg-indigo-100 dark:bg-indigo-950 border-2 border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0 ${
                appUser?.photoUrl ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <AuthImage
                src={appUser?.photoUrl}
                alt={`${appUser?.displayName || 'Student'} profile photo`}
                className="w-full h-full object-cover"
                fallback={
                  <span className="font-display text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                    {(appUser?.displayName || 'S').trim().charAt(0).toUpperCase()}
                  </span>
                }
              />
            </button>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                {appUser?.displayName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {appUser?.email || appUser?.phone} · Role: {appUser?.role}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('onboarding')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer self-start sm:self-center"
          >
            Edit Academic Preferences
          </button>
        </div>

        {/* Profile Photo Upload & Removal Controls */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Profile Photo</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Upload JPG, JPEG, PNG, or WEBP photo from device or camera. Stored privately with your student account.
              </p>
            </div>
            {appUser?.photoUrl && (
              <button
                type="button"
                disabled={photoUploading}
                onClick={handleRemoveProfilePhoto}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>
          <UploadPickerControls
            uploading={photoUploading}
            progressText={photoProgress}
            errorText={photoError}
            onRetry={lastPhotoFile ? () => processProfilePhotoUpload(lastPhotoFile) : undefined}
            galleryLabel={appUser?.photoUrl ? 'Change Photo' : 'Upload Photo'}
            cameraLabel="Take Selfie"
            onFilesSelected={(files) => {
              const f = files[0];
              if (f) processProfilePhotoUpload(f);
            }}
          />
        </div>

        {studentProfile && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Board</span>
              <span className="font-semibold text-slate-900 dark:text-white">{board?.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Class &amp; Stream</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {cls?.className} {stream && stream.id !== 'na' ? `(${stream.name})` : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Session &amp; Medium</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {session?.name} · {studentProfile.medium}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Target &amp; Level</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {studentProfile.examGoal} · {studentProfile.preparationLevel}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Report Content / Send Feedback */}
      <form
        onSubmit={handleFeedback}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
      >
        <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Report a Syllabus / Question Issue or Send Feedback
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={fbCategory}
            onChange={(e) => setFbCategory(e.target.value as any)}
            className="px-3 py-2 text-sm leading-normal min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            <option value="App Feedback">App Feedback</option>
            <option value="Syllabus Issue">Syllabus Issue</option>
            <option value="Question Correction">Question Correction</option>
            <option value="Bug Report">Bug Report</option>
          </select>
          <input
            type="text"
            required
            value={fbSubject}
            onChange={(e) => setFbSubject(e.target.value)}
            placeholder="Subject or Chapter name"
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          />
        </div>
        <textarea
          rows={3}
          required
          value={fbMessage}
          onChange={(e) => setFbMessage(e.target.value)}
          placeholder="Describe the correction or feedback..."
          className="w-full p-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
        />
        <button
          type="submit"
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
        >
          Submit Report
        </button>
      </form>

      {/* Privacy & Data Deletion */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Shield className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
          <span>Student Data Privacy &amp; Account Management</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Your phone number, email, test scores, and AI Teacher conversations are private and never visible to other students. You may remove your profile and study data anytime.
        </p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 rounded-lg cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete My Account Data</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={deleteMyAccount}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 rounded-lg cursor-pointer"
            >
              Confirm Permanent Deletion
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      <ImageLightboxModal
        src={previewOpen && appUser?.photoUrl ? appUser.photoUrl : null}
        title={appUser?.displayName || 'Profile Photo'}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { themeMode, setThemeMode, theme, systemSettings, navigate } = useApp();

  const themeOptions: { id: ThemeMode; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'light', label: 'Light (Default)', desc: 'Clean bright background', icon: Sun },
    { id: 'dark', label: 'Dark Mode', desc: 'Low-glare dark study theme', icon: Moon },
    { id: 'auto', label: 'Automatic (System)', desc: 'Follows OS preference', icon: Monitor },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
        Settings
      </h1>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
        <div className="p-6 space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Appearance Theme
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Light Mode is the default. Currently active:{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize">{theme} Mode</span>.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const selected = themeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setThemeMode(opt.id)}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                    selected
                      ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{opt.label}</p>
                    <p className="text-[11px] opacity-80">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Academic Board, Stream &amp; Medium
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Change your board, class, academic session, medium, or selected subjects anytime.
            </p>
          </div>
          <button
            onClick={() => navigate('onboarding')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            Update Preferences
          </button>
        </div>

        <div className="p-6 space-y-2">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Plan &amp; Subscription
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Current Plan: <span className="font-semibold text-emerald-700 dark:text-emerald-400">Free Student Access</span>.{' '}
            {systemSettings.paymentsEnabled
              ? 'Premium plans are enabled by the platform owner.'
              : 'Paid subscriptions are currently disabled while the payment gateway is unconfigured.'}
          </p>
        </div>

        <div className="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Help &amp; Support, Privacy &amp; Terms
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Access FAQs, official owner contact details, bug reporting, ticket tracking, and policies.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('help-support')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
            >
              Open Help &amp; Support
            </button>
            <button
              type="button"
              onClick={() => navigate('privacy-policy')}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => navigate('terms')}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              Terms
            </button>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <BrandLogo compact />
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p>
              Official App Name: <span className="font-semibold text-slate-900 dark:text-white">AI STUDENTS</span>
            </p>
            <p>
              Owner &amp; Founder:{' '}
              <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                ABHIMANYU OFFICIAL HACKER
              </span>
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              AI STUDENTS के owner और founder ABHIMANYU OFFICIAL HACKER हैं। Dedicated to Class 10, 11 &amp; 12 board students across BSEB, CBSE, ICSE, and State Boards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
