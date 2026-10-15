/**
 * Desktop Bridge Utility for LayaMeet
 * Detects whether the application is running inside Tauri Desktop Client
 * and provides appropriate API/WebSocket endpoints and native window controls.
 */

export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

export function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (isDesktopApp()) {
    // In desktop mode, direct to the local or cloud backend API server
    return 'http://localhost:5000';
  }
  return '';
}

export function getSubtitleWsUrl(): string {
  if (import.meta.env.VITE_SUBTITLE_WS_URL) {
    return import.meta.env.VITE_SUBTITLE_WS_URL;
  }
  if (isDesktopApp()) {
    return 'ws://localhost:8000/ws/transcribe';
  }
  if (typeof window === 'undefined') return 'ws://localhost:8000/ws/transcribe';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/transcribe`;
}

export async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    __TAURI__?: {
      core?: { invoke: <R>(cmd: string, args?: Record<string, unknown>) => Promise<R> };
      invoke?: <R>(cmd: string, args?: Record<string, unknown>) => Promise<R>;
    };
  };

  try {
    if (win.__TAURI__?.core?.invoke) {
      return await win.__TAURI__.core.invoke<T>(cmd, args);
    }
    if (win.__TAURI__?.invoke) {
      return await win.__TAURI__.invoke<T>(cmd, args);
    }
  } catch (err) {
    console.warn(`[DesktopBridge] invokeTauri('${cmd}') failed:`, err);
  }
  return null;
}

export async function setDesktopWindowMode(mode: 'mini' | 'normal'): Promise<boolean> {
  if (!isDesktopApp()) return false;
  try {
    const res = await invokeTauri<void>('set_window_mode', { mode });
    return res !== null;
  } catch (err) {
    console.warn('[DesktopBridge] setDesktopWindowMode failed:', err);
    return false;
  }
}

export async function setDesktopWindowSize(width: number, height: number): Promise<void> {
  if (typeof window === 'undefined') return;
  const tauriWindow = (window as unknown as { __TAURI__?: { window?: { getCurrentWindow?: () => { setSize: (size: unknown) => Promise<void> } } } })
    .__TAURI__?.window?.getCurrentWindow?.();

  if (tauriWindow && typeof tauriWindow.setSize === 'function') {
    try {
      // Logical size in Tauri v2
      await tauriWindow.setSize({ type: 'Logical', width, height });
    } catch (err) {
      console.warn('[DesktopBridge] Failed to set window size', err);
    }
  }
}

