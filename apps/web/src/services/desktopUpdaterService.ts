import { DESKTOP_RELEASE } from '../config/desktopRelease';
import { getApiBaseUrl, invokeTauri, isDesktopApp } from '../utils/desktopBridge';

export interface DesktopUpdateManifest {
  version: string;
  pubDate: string;
  platform: string;
  fileName: string;
  downloadUrl: string;
  sizeLabel: string;
  sha256: string;
  notes: string;
}

export interface DesktopUpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  manifest: DesktopUpdateManifest;
  checkedAt: string;
}

export function compareSemver(a: string, b: string): number {
  const cleanA = a.replace(/^v/i, '').trim().split('.').map((n) => parseInt(n, 10) || 0);
  const cleanB = b.replace(/^v/i, '').trim().split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (cleanA[i] || 0) - (cleanB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function getInstalledAppVersion(): Promise<string> {
  if (isDesktopApp()) {
    const nativeVer = await invokeTauri<string>('get_desktop_app_version');
    if (nativeVer) return nativeVer;
  }
  return DESKTOP_RELEASE.version;
}

export function resolveAbsoluteDownloadUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const base = getApiBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${cleanBase}${cleanPath}`;
}

export async function checkDesktopAppUpdate(): Promise<DesktopUpdateCheckResult> {
  const currentVersion = await getInstalledAppVersion();
  const manifestUrl = `${resolveAbsoluteDownloadUrl('/downloads/latest.json')}?t=${Date.now()}`;

  try {
    const res = await fetch(manifestUrl, { cache: 'no-store' });
    if (res.ok) {
      const manifest = (await res.json()) as DesktopUpdateManifest;
      const hasUpdate = compareSemver(manifest.version, currentVersion) > 0;
      return {
        currentVersion,
        latestVersion: manifest.version,
        hasUpdate,
        manifest: {
          ...manifest,
          downloadUrl: resolveAbsoluteDownloadUrl(manifest.downloadUrl),
        },
        checkedAt: new Date().toLocaleTimeString(),
      };
    }
  } catch {
    // Fallback to static release metadata if offline or local dev
  }

  const fallbackManifest: DesktopUpdateManifest = {
    version: DESKTOP_RELEASE.version,
    pubDate: new Date().toISOString(),
    platform: DESKTOP_RELEASE.platform,
    fileName: DESKTOP_RELEASE.fileName,
    downloadUrl: resolveAbsoluteDownloadUrl(DESKTOP_RELEASE.downloadUrl),
    sizeLabel: DESKTOP_RELEASE.sizeLabel,
    sha256: DESKTOP_RELEASE.sha256,
    notes: 'Phiên bản ổn định hiện tại.',
  };

  return {
    currentVersion,
    latestVersion: fallbackManifest.version,
    hasUpdate: compareSemver(fallbackManifest.version, currentVersion) > 0,
    manifest: fallbackManifest,
    checkedAt: new Date().toLocaleTimeString(),
  };
}

export async function installDesktopAppUpdate(
  manifest: DesktopUpdateManifest,
  onProgress?: (percent: number) => void,
  silent = false,
): Promise<void> {
  const fullUrl = resolveAbsoluteDownloadUrl(manifest.downloadUrl);

  if (isDesktopApp()) {
    let unlisten: (() => void) | undefined;
    try {
      const win = window as unknown as {
        __TAURI__?: {
          event?: {
            listen?: (
              event: string,
              cb: (ev: { payload: { percent: number } }) => void,
            ) => Promise<() => void>;
          };
        };
      };
      if (win.__TAURI__?.event?.listen && onProgress) {
        unlisten = await win.__TAURI__.event.listen('desktop-update-progress', (ev) => {
          onProgress(ev.payload.percent);
        });
      }
      await invokeTauri('install_desktop_update', {
        installerUrl: fullUrl,
        silent,
      });
      return;
    } finally {
      unlisten?.();
    }
  }

  // Fallback for browser or when Tauri command is unavailable: open direct installer download
  if (typeof window !== 'undefined') {
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  }
}
