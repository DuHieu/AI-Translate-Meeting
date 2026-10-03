import { useCallback, useEffect, useState } from 'react';
import {
  fetchAiReadiness,
  type AiReadinessStatus,
} from '../services/aiHealthService';

const INITIAL_STATUS: AiReadinessStatus = {
  state: 'starting',
  retryAfterMs: 2000,
};

export function useAiReadiness() {
  const [status, setStatus] = useState<AiReadinessStatus>(INITIAL_STATUS);
  const [retrySequence, setRetrySequence] = useState(0);
  const retry = useCallback(() => setRetrySequence((value) => value + 1), []);

  useEffect(() => {
    let retryTimer: number | undefined;
    let requestTimer: number | undefined;
    let activeController: AbortController | null = null;
    let disposed = false;

    const poll = async () => {
      const controller = new AbortController();
      activeController = controller;
      requestTimer = window.setTimeout(() => controller.abort(), 5000);

      try {
        const next = await fetchAiReadiness(controller.signal);
        if (disposed) return;

        setStatus(next);
        if (next.state !== 'ready') {
          retryTimer = window.setTimeout(() => void poll(), next.retryAfterMs);
        }
      } catch {
        if (disposed) return;

        const next: AiReadinessStatus = {
          state: 'unavailable',
          code: 'ai_health_unavailable',
          retryAfterMs: 5000,
        };
        setStatus(next);
        retryTimer = window.setTimeout(() => void poll(), next.retryAfterMs);
      } finally {
        if (requestTimer !== undefined) window.clearTimeout(requestTimer);
        if (activeController === controller) activeController = null;
      }
    };

    void poll();

    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      if (requestTimer !== undefined) window.clearTimeout(requestTimer);
      activeController?.abort();
    };
  }, [retrySequence]);

  return { ...status, retry };
}
