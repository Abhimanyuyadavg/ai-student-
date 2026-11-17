import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BannerDestinationPage, HomeBanner } from '../types/index.ts';
import {
  BANNER_DESTINATION_OPTIONS,
  PERSONAL_PHOTO_PRIMARY,
  PERSONAL_PHOTO_THUMBS_UP,
  resolveBannerImageUrl,
} from '../data/seedBanners.ts';
import { AuthImage, UploadPickerControls } from './ImageTools.tsx';
import { validateAndCompressImageFile } from '../lib/imageUtils.ts';
import { HomeBannerCard } from './HomeBannerCarousel.tsx';
import { BrandLogo } from './BrandLogo.tsx';
import { APP_ASSETS } from '../lib/assets.ts';

const PRESET_BANNER_ARTWORKS = [
  { key: PERSONAL_PHOTO_THUMBS_UP, label: 'Official Personal Photo (Thumbs Up)' },
  { key: PERSONAL_PHOTO_PRIMARY, label: 'Personal Photo (Arms Crossed)' },
  { key: 'asset://banner_ai_teacher', label: 'AI Teacher Graphic' },
  { key: 'asset://banner_smart_tests', label: 'Exam & Trophy Graphic' },
];

export const AdminBannersSection: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const {
    homeBanners,
    brandLogoUrl,
    uploadImage,
    adminSaveBanner,
    adminSaveAllBanners,
    adminDeleteBanner,
    adminResetBanners,
    adminSaveBrandLogo,
    adminResetBrandLogo,
    showToast,
  } = useApp();

  const sortedBanners = [...homeBanners].sort((a, b) => a.orderIndex - b.orderIndex);

  const [editingId, setEditingId] = useState<string | null>(sortedBanners[0]?.id || null);
  const [title, setTitle] = useState<string>(sortedBanners[0]?.title || 'WELCOME TO AI STUDENTS');
  const [subtitle, setSubtitle] = useState<string>(sortedBanners[0]?.subtitle || '');
  const [ctaLabel, setCtaLabel] = useState<string>(sortedBanners[0]?.ctaLabel || 'Start Learning');
  const [destinationPage, setDestinationPage] = useState<BannerDestinationPage>(
    sortedBanners[0]?.destinationPage || 'subjects'
  );
  const [imageUrl, setImageUrl] = useState<string>(
    sortedBanners[0]?.imageUrl || PERSONAL_PHOTO_THUMBS_UP
  );
  const [imageId, setImageId] = useState<string | undefined>(sortedBanners[0]?.imageId);
  const [orderIndex, setOrderIndex] = useState<number>(sortedBanners[0]?.orderIndex || 1);
  const [enabled, setEnabled] = useState<boolean>(sortedBanners[0]?.enabled ?? true);
  const [accentTheme, setAccentTheme] = useState<HomeBanner['accentTheme']>(
    sortedBanners[0]?.accentTheme || 'blue-purple'
  );

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadIntoEditor = (banner: HomeBanner) => {
    setEditingId(banner.id);
    setTitle(banner.title);
    setSubtitle(banner.subtitle);
    setCtaLabel(banner.ctaLabel);
    setDestinationPage(banner.destinationPage);
    setImageUrl(banner.imageUrl);
    setImageId(banner.imageId);
    setOrderIndex(banner.orderIndex);
    setEnabled(banner.enabled);
    setAccentTheme(banner.accentTheme || 'blue-purple');
    setUploadError('');
  };

  const startNewBanner = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('Your Smart Study Partner\nLearn Smart • Practise More • Improve Every Day');
    setCtaLabel('Explore Now');
    setDestinationPage('subjects');
    setImageUrl(PERSONAL_PHOTO_THUMBS_UP);
    setImageId(undefined);
    setOrderIndex(sortedBanners.length + 1);
    setEnabled(true);
    setAccentTheme('blue-purple');
    setUploadError('');
  };

  const handleUploadBrandLogo = async (files: FileList) => {
    const file = files[0];
    if (!file) return;
    setLogoError('');
    setUploadingLogo(true);
    try {
      const processed = await validateAndCompressImageFile(file, {
        maxDimension: 1024,
        maxBytes: 800_000,
      });
      const res = await uploadImage({
        dataUrl: processed.dataUrl,
        category: 'brand_logo',
        visibility: 'curriculum',
        altText: 'AI STUDENTS Official App Logo',
        targetId: 'official_app_logo',
      });
      await adminSaveBrandLogo(res.url, res.image.id);
    } catch (err: any) {
      setLogoError(err?.message || 'Unable to upload official logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleResetLogo = async () => {
    if (!isAdmin) return;
    setLogoError('');
    setUploadingLogo(true);
    try {
      await adminResetBrandLogo();
    } catch (err: any) {
      setLogoError(err?.message || 'Unable to restore official logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleUploadThumbnail = async (files: FileList) => {
    const file = files[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const processed = await validateAndCompressImageFile(file, {
        maxDimension: 1400,
        maxBytes: 1_200_000,
      });
      const res = await uploadImage({
        dataUrl: processed.dataUrl,
        category: 'banner',
        visibility: 'curriculum',
        altText: title.trim() || 'AI STUDENTS promotional banner',
        targetId: editingId || undefined,
      });
      setImageUrl(res.url);
      setImageId(res.image.id);
      showToast('Thumbnail uploaded cleanly. Preview and click Publish Banner.', 'success');
    } catch (err: any) {
      setUploadError(err?.message || 'Unable to upload banner image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!title.trim() || !ctaLabel.trim()) {
      showToast('Banner title and button text are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const id = editingId || `banner_${Date.now()}`;
      const payload: HomeBanner = {
        id,
        title: title.trim(),
        subtitle: subtitle.trim(),
        ctaLabel: ctaLabel.trim(),
        imageUrl: imageUrl.trim() || PERSONAL_PHOTO_THUMBS_UP,
        ...(imageId ? { imageId } : {}),
        destinationPage,
        orderIndex: Math.max(1, Math.round(Number(orderIndex) || 1)),
        enabled,
        accentTheme,
        updatedAt: new Date().toISOString(),
      };
      const updatedList = await adminSaveBanner(payload);
      const saved = updatedList.find((b) => b.id === id);
      if (saved) loadIntoEditor(saved);
    } catch (err: any) {
      showToast(err?.message || 'Could not save banner.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (banner: HomeBanner) => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await adminSaveBanner({
        ...banner,
        enabled: !banner.enabled,
      });
    } catch (err: any) {
      showToast(err?.message || 'Could not toggle banner.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    if (!isAdmin) return;
    const target = index + direction;
    if (target < 0 || target >= sortedBanners.length) return;
    const copy = [...sortedBanners];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    const reindexed = copy.map((b, i) => ({ ...b, orderIndex: i + 1 }));
    setSaving(true);
    try {
      await adminSaveAllBanners(reindexed);
    } catch (err: any) {
      showToast(err?.message || 'Could not reorder banners.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (banner: HomeBanner) => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await adminDeleteBanner(banner.id);
      if (editingId === banner.id) startNewBanner();
    } catch (err: any) {
      showToast(err?.message || 'Could not delete banner.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const defaults = await adminResetBanners();
      if (defaults[0]) loadIntoEditor(defaults[0]);
    } catch (err: any) {
      showToast(err?.message || 'Could not reset banners.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const previewBanner: HomeBanner = {
    id: editingId || 'banner_preview',
    title: title.trim() || 'Banner Headline Preview',
    subtitle:
      subtitle.trim() ||
      'Concise description of how this learning module helps board exam students.',
    ctaLabel: ctaLabel.trim() || 'Start Learning',
    imageUrl: imageUrl.trim() || PERSONAL_PHOTO_THUMBS_UP,
    imageId,
    destinationPage,
    orderIndex,
    enabled,
    accentTheme,
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
            <span>Branding &amp; Home Screen Banners</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage the official AI STUDENTS app logo, upload home screen banners, edit headlines &amp; CTA buttons, reorder slides, enable/disable banners, and preview live.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={startNewBanner}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Banner</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore 5 Defaults</span>
            </button>
          </div>
        )}
      </div>

      {/* Official App Logo Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Official App Logo Management</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Used consistently across the splash screen, loading screen, login, registration, navigation bars, AI Teacher, About Us modal, and all home screen banners.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              disabled={uploadingLogo}
              onClick={handleResetLogo}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer shrink-0 disabled:opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Official Logo</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="md:col-span-5 flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 rounded-xl bg-white border border-indigo-200 dark:border-indigo-700 p-1 shrink-0 overflow-hidden shadow-sm">
              <AuthImage
                src={brandLogoUrl || APP_ASSETS.aiStudentsLogo}
                alt="Current Official App Logo"
                className="w-full h-full object-contain rounded-lg"
                fallback={
                  <img
                    src={APP_ASSETS.aiStudentsLogo}
                    alt="Default Official App Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                }
              />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Active App Emblem
              </p>
              <BrandLogo size="sm" />
            </div>
          </div>

          <div className="md:col-span-7 space-y-2">
            {isAdmin ? (
              <UploadPickerControls
                onFilesSelected={handleUploadBrandLogo}
                uploading={uploadingLogo}
                progressText="Uploading & applying official app logo..."
                errorText={logoError}
                allowCamera={false}
                galleryLabel="Upload Replacement App Logo"
              />
            ) : (
              <p className="text-xs text-slate-500">
                Only administrators can replace the official AI STUDENTS app logo.
              </p>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Recommended: Square high-resolution PNG/JPG logo with blue, purple, white, and golden academic colors.
            </p>
          </div>
        </div>
      </div>

      {/* Existing Banners List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Configured Home Screen Banners ({sortedBanners.length})
          </h3>
          <span className="text-xs text-slate-500">
            {sortedBanners.filter((b) => b.enabled).length} visible on Home screen
          </span>
        </div>

        {sortedBanners.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            No home banners configured. Click &ldquo;Restore 5 Defaults&rdquo; or &ldquo;New Banner&rdquo;.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedBanners.map((b, idx) => (
              <div
                key={b.id}
                className={`py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  editingId === b.id ? 'bg-indigo-50/40 dark:bg-indigo-950/20 -mx-3 px-3 rounded-lg' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shrink-0">
                    <AuthImage
                      src={resolveBannerImageUrl(b)}
                      alt={b.title}
                      className="w-full h-full object-contain object-top"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-400">
                        #{b.orderIndex}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          b.enabled
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {b.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className="text-slate-500">
                        Links to: <strong className="text-slate-700 dark:text-slate-200">{b.destinationPage}</strong>
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{b.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      Button: &ldquo;{b.ctaLabel}&rdquo; {b.subtitle ? `· ${b.subtitle}` : ''}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={saving || idx === 0}
                      onClick={() => handleMove(idx, -1)}
                      aria-label={`Move ${b.title} up`}
                      className="p-2 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={saving || idx === sortedBanners.length - 1}
                      onClick={() => handleMove(idx, 1)}
                      aria-label={`Move ${b.title} down`}
                      className="p-2 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleToggleEnabled(b)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {b.enabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{b.enabled ? 'Disable' : 'Enable'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadIntoEditor(b)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-lg cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleDelete(b)}
                      aria-label={`Delete ${b.title}`}
                      className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Form & Full-Width Live Preview */}
      <div className="space-y-6">
        <form
          onSubmit={handleSaveBanner}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              {editingId ? 'Edit Selected Banner' : 'Create New Promotional Banner'}
            </h3>
            {editingId && (
              <span className="text-[11px] font-mono text-slate-500">ID: {editingId}</span>
            )}
          </div>

          <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Presenter Photograph / Banner Image (Use Uploaded Photo or Upload Replacement)
            </label>
            <UploadPickerControls
              onFilesSelected={handleUploadThumbnail}
              uploading={uploading}
              progressText="Optimizing & uploading banner..."
              errorText={uploadError}
              allowCamera={false}
              galleryLabel="Upload Replacement Photo"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {PRESET_BANNER_ARTWORKS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    setImageUrl(preset.key);
                    setImageId(undefined);
                  }}
                  className={`p-2 text-[11px] font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                    imageUrl === preset.key
                      ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Banner Headline Title
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                maxLength={140}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., WELCOME TO AI STUDENTS"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                CTA Button Label
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                maxLength={60}
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="e.g., Start Learning"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Subtitle &amp; Feature Highlights (Optional 2nd line separated by Enter)
            </label>
            <textarea
              rows={2}
              disabled={!isAdmin}
              maxLength={320}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder={'Line 1: Your Smart Study Partner\nLine 2: Learn Smart • Practise More • Improve Every Day'}
              className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Destination Section
              </label>
              <select
                disabled={!isAdmin}
                value={destinationPage}
                onChange={(e) => setDestinationPage(e.target.value as BannerDestinationPage)}
                className="w-full px-3 py-2 text-xs leading-normal min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {BANNER_DESTINATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Banner Layout &amp; Theme
              </label>
              <select
                disabled={!isAdmin}
                value={accentTheme}
                onChange={(e) => setAccentTheme(e.target.value as HomeBanner['accentTheme'])}
                className="w-full px-3 py-2 text-xs leading-normal min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="blue-purple">Welcome Hero (Blue &amp; Purple, Photo Right)</option>
                <option value="indigo-gold">AI Teacher + Robot &amp; Books (Photo Left)</option>
                <option value="cobalt-subjects">Chapter-Wise Subjects + Books (Cobalt Blue)</option>
                <option value="royal-amber">Practise &amp; Tests + Exam Paper &amp; Trophy (Navy &amp; Gold)</option>
                <option value="violet-blue">Study Planner + Calendar &amp; Chart (Purple &amp; Blue)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Display Order
              </label>
              <input
                type="number"
                min={1}
                max={100}
                disabled={!isAdmin}
                value={orderIndex}
                onChange={(e) => setOrderIndex(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-slate-300 accent-indigo-700"
            />
            <span>Enable banner on student Home Screen carousel</span>
          </label>

          {isAdmin && (
            <button
              type="submit"
              disabled={saving || uploading}
              className="w-full py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Publishing...' : editingId ? 'Publish Banner Changes' : 'Publish New Banner'}
            </button>
          )}
        </form>

        {/* Full-Width Live Preview Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Live Home Screen Carousel Preview
            </h3>
            <span className="text-[11px] font-medium text-slate-500">
              Updates in real time before publishing
            </span>
          </div>
          <HomeBannerCard banner={previewBanner} previewMode />
        </div>
      </div>
    </div>
  );
};
