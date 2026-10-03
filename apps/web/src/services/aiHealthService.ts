export type AiReadinessState = 'starting' | 'ready' | 'failed' | 'unavailable';

export interface AiReadinessStatus {
  state: AiReadinessState;
  code?: string;
  retryAfterMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchAiReadiness(signal?: AbortSignal): Promise<AiReadinessStatus> {
  const response = await fetch('/ai-health/ready', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  const body = await readJson(response);

  if (response.ok && isRecord(body) && body.status === 'ready') {
    return { state: 'ready', retryAfterMs: 0 };
  }

  if (response.status === 503) {
    const code = isRecord(body) && typeof body.code === 'string' ? body.code : 'whisper_loading';
    return {
      state: code === 'model_load_failed' ? 'failed' : 'starting',
      code,
      retryAfterMs: code === 'model_load_failed' ? 5000 : 2000,
    };
  }

  return { state: 'unavailable', code: 'ai_health_unavailable', retryAfterMs: 5000 };
}
