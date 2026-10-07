import { useEffect, useState } from 'react';

type WakeStatus = 'active' | 'unavailable' | 'paused';

export function useMeetingDisplay() {
  const [wakeStatus, setWakeStatus] = useState<WakeStatus>('paused');
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    let disposed = false;
    let lock: WakeLockSentinel | undefined;
    let requesting = false;
    const acquire = async () => {
      if (!('wakeLock' in navigator)) { setWakeStatus('unavailable'); return; }
      if (disposed || requesting || lock || document.visibilityState !== 'visible') return;
      requesting = true;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (disposed || document.visibilityState !== 'visible') { await next.release(); return; }
        lock = next;
        setWakeStatus('active');
        next.addEventListener('release', () => {
          if (lock === next) lock = undefined;
          if (!disposed) {
            setWakeStatus('paused');
            if (document.visibilityState === 'visible') void acquire();
          }
        });
      } catch { if (!disposed) setWakeStatus('unavailable'); }
      finally { requesting = false; }
    };
    const visibility = () => {
      if (document.visibilityState === 'visible') void acquire();
      else { void lock?.release(); setWakeStatus('paused'); }
    };
    const network = () => setOnline(navigator.onLine);
    void acquire();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    return () => {
      disposed = true;
      void lock?.release();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('online', network);
      window.removeEventListener('offline', network);
    };
  }, []);
  return { wakeStatus, online };
}
