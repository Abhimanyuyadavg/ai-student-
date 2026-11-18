import { Capacitor } from '@capacitor/core';

const DEFAULT_NATIVE_API_BASE_URL =
  'https://ais-pre-sep3an4tmru2vymxhi6lyy-318163649696.asia-northeast1.run.app';

let bridgeInstalled = false;

export function isCapacitorNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configured) {
    return configured;
  }
  if (isCapacitorNative()) {
    return DEFAULT_NATIVE_API_BASE_URL;
  }
  return '';
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}

/**
 * Ensures relative `/api/...` calls seamlessly target the configured Cloud backend
 * when the bundled web app runs inside the Capacitor Android APK.
 */
export function installNativeApiBridge(): void {
  if (bridgeInstalled || typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }
  const base = getApiBaseUrl();
  if (!base) {
    return;
  }
  bridgeInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return originalFetch(`${base}${input}`, init);
    }
    if (input instanceof URL && input.origin === window.location.origin && input.pathname.startsWith('/api/')) {
      return originalFetch(`${base}${input.pathname}${input.search}`, init);
    }
    if (input instanceof Request) {
      try {
        const reqUrl = new URL(input.url);
        if (reqUrl.origin === window.location.origin && reqUrl.pathname.startsWith('/api/')) {
          const rewritten = new Request(`${base}${reqUrl.pathname}${reqUrl.search}`, input);
          return originalFetch(rewritten, init);
        }
      } catch {
        // Leave original Request unchanged if URL parsing fails
      }
    }
    return originalFetch(input, init);
  };
}
