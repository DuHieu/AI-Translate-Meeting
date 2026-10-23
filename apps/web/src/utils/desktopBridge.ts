/**
 * Desktop Bridge Utility for LayaMeet
 * Detects whether the application is running inside Tauri Desktop Client
 * and provides appropriate API/WebSocket endpoints and native window controls.
 */

const VPS_URL_STORAGE_KEY = 'layameet:vps-url';

export function getCustomVpsUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (localStorage.getItem(VPS_URL_STORAGE_KEY) || '').trim().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function setCustomVpsUrl(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean) {
      localStorage.setItem(VPS_URL_STORAGE_KEY, clean);
    } else {
      localStorage.removeItem(VPS_URL_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

export function getApiBaseUrl(): string {
  const customVps = getCustomVpsUrl();
  if (customVps) {
    return customVps;
  }
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
  const customVps = getCustomVpsUrl();
  if (customVps) {
    const wsBase = customVps.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
    return `${wsBase}/ws/transcribe`;
  }
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


// ---------------------------------------------------------------------------
// On-device speech recognition (Rust sherpa-onnx). Audio stays on the machine;
// only the recognized text goes to the server as `client_transcript`.
// ---------------------------------------------------------------------------

export interface LocalTranscript {
  channel: string;
  text: string;
  language: string;
  isFinal: boolean;
  confidence: number;
}

type TauriInvoke = (cmd: string, args?: unknown) => Promise<unknown>;
type TauriListen = (
  event: string,
  handler: (event: { payload: unknown }) => void,
) => Promise<() => void>;

function getTauriGlobals(): { invoke?: TauriInvoke; listen?: TauriListen } {
  if (typeof window === 'undefined') return {};
  const tauri = (window as unknown as {
    __TAURI__?: { core?: { invoke: TauriInvoke }; event?: { listen: TauriListen } };
  }).__TAURI__;
  return { invoke: tauri?.core?.invoke, listen: tauri?.event?.listen };
}

/** Downloads (first run) and loads the on-device model. Resolves false when unavailable. */
export async function prepareLocalStt(): Promise<boolean> {
  const { invoke } = getTauriGlobals();
  if (!isDesktopApp() || !invoke) return false;
  try {
    await invoke('prepare_local_stt');
    return true;
  } catch (err) {
    console.warn('[DesktopBridge] prepareLocalStt failed, falling back to server STT:', err);
    return false;
  }
}

export async function startLocalStt(): Promise<boolean> {
  const { invoke } = getTauriGlobals();
  if (!invoke) return false;
  try {
    await invoke('start_local_stt');
    return true;
  } catch (err) {
    console.warn('[DesktopBridge] startLocalStt failed:', err);
    return false;
  }
}

export async function stopLocalStt(): Promise<void> {
  try {
    await getTauriGlobals().invoke?.('stop_local_stt');
  } catch (err) {
    console.debug('[DesktopBridge] stopLocalStt failed:', err);
  }
}

/** Sends PCM16 mono 16 kHz audio to the on-device recognizer (fire-and-forget). */
export function pushLocalAudio(pcm16: ArrayBuffer): void {
  getTauriGlobals().invoke?.('push_local_audio', pcm16).catch(() => undefined);
}

export function flushLocalAudio(): void {
  getTauriGlobals().invoke?.('flush_local_audio').catch(() => undefined);
}

export async function onLocalTranscript(handler: (t: LocalTranscript) => void): Promise<() => void> {
  const { listen } = getTauriGlobals();
  if (!listen) return () => undefined;
  return listen('local-transcript', (event) => handler(event.payload as LocalTranscript));
}
