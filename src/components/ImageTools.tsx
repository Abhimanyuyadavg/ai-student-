import React, { useEffect, useState } from 'react';
import { Camera, ImagePlus, Loader2, Maximize2, RefreshCw, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

// Cache ObjectURLs briefly per authenticated image URL so sidebar & page views render without flicker
const cachedObjectUrls = new Map<string, string>();

export const AuthImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  fallback?: React.ReactNode;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'sync' | 'auto';
}> = ({ src, alt, className = '', onClick, fallback = null, loading = 'eager', decoding = 'async' }) => {
  const { getApiHeaders, appUser } = useApp();
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
    if (!src) return '';
    if (!src.startsWith('/api/images/')) return src;
    return cachedObjectUrls.get(src) || '';
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);

    if (!src) {
      setResolvedUrl('');
      return;
    }
    if (!src.startsWith('/api/images/')) {
      setResolvedUrl(src);
      return;
    }

    const cached = cachedObjectUrls.get(src);
    if (cached) {
      setResolvedUrl(cached);
      return;
    }

    (async () => {
      try {
        const headers = await getApiHeaders();
        const res = await fetch(src, { headers });
        if (!res.ok) throw new Error('Image unavailable');
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        cachedObjectUrls.set(src, objUrl);
        if (active) setResolvedUrl(objUrl);
      } catch {
        if (active) setFailed(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [src, getApiHeaders, appUser?.uid]);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  if (!resolvedUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 ${className}`}
        aria-label={alt}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      loading={loading}
      decoding={decoding}
      referrerPolicy="no-referrer"
      onClick={onClick}
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const ImageLightboxModal: React.FC<{
  src: string | null;
  title?: string;
  caption?: string;
  onClose: () => void;
}> = ({ src, title, caption, onClose }) => {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Image Preview'}
    >
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
              {title || 'Image Preview'}
            </h3>
            {caption && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{caption}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-auto flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <AuthImage
            src={src}
            alt={title || 'Full preview'}
            className="max-h-[72vh] w-auto object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

export const ZoomableAuthThumbnail: React.FC<{
  src: string;
  alt: string;
  title?: string;
  caption?: string;
  className?: string;
}> = ({ src, alt, title, caption, className = 'w-full h-44 object-cover rounded-lg' }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="relative group">
        <AuthImage
          src={src}
          alt={alt}
          onClick={() => setOpen(true)}
          className={`${className} cursor-pointer`}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Zoom ${alt}`}
          className="absolute bottom-2 right-2 p-1.5 rounded-md bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm opacity-90 group-hover:opacity-100 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <ImageLightboxModal
        src={open ? src : null}
        title={title || alt}
        caption={caption}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export const UploadPickerControls: React.FC<{
  onFilesSelected: (files: FileList) => void;
  uploading?: boolean;
  progressText?: string;
  errorText?: string;
  onRetry?: () => void;
  multiple?: boolean;
  allowCamera?: boolean;
  galleryLabel?: string;
  cameraLabel?: string;
  compact?: boolean;
}> = ({
  onFilesSelected,
  uploading = false,
  progressText,
  errorText,
  onRetry,
  multiple = false,
  allowCamera = true,
  galleryLabel = 'Choose Photo',
  cameraLabel = 'Take Photo',
  compact = false,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer transition-colors ${
            compact ? 'px-2.5 py-2 text-xs' : 'px-3.5 py-2 text-xs'
          } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          <span>{galleryLabel}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple={multiple}
            disabled={uploading}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onFilesSelected(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
          />
        </label>

        {allowCamera && (
          <label
            className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer transition-colors ${
              compact ? 'px-2.5 py-2 text-xs' : 'px-3.5 py-2 text-xs'
            } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <Camera className="w-4 h-4" />
            <span>{cameraLabel}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onFilesSelected(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
          </label>
        )}

        {uploading && progressText && (
          <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
            {progressText}
          </span>
        )}
      </div>

      {errorText && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          <span>{errorText}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 font-semibold underline cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
