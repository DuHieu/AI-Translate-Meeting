export interface SystemPrivacyContract {
  zeroRawAudioPolicy: boolean;
  ephemeralAudioOnly: boolean;
  localModelTranscription: boolean;
  retentionAutoPurge: boolean;
}

export interface SystemRetentionInfo {
  cleanupEnabled: boolean;
  intervalHours: number;
  retentionHours: number;
}

export interface SystemSecurityInfo {
  zeroRawAudioPolicy: boolean;
  liveKitTokenTtlMinutes: number;
  subtitleTokenTtlMinutes: number;
  sessionTokenTtlMinutes: number;
  admissionHostTokenTtlMinutes: number;
  admissionInviteTokenTtlMinutes: number;
  requireHostAuthentication?: boolean;
}

export interface AuditEventRecord {
  id: string;
  eventType: string;
  meetingId?: string | null;
  participantId?: string | null;
  details: string;
  timestampUtc: string;
}

export interface SystemLicenseInfo {
  status: 'active' | 'trial' | 'expired' | 'invalid' | string;
  organizationName: string;
  tier: 'pilot' | 'team' | 'enterprise' | string;
  maxConcurrentRooms: number;
  maxParticipantsPerRoom: number;
  allowedFeatures: string[];
  expiresAtUtc?: string | null;
  daysRemaining?: number | null;
}

export interface SystemStatusResponse {
  productName: string;
  version: string;
  deploymentProfile: 'pilot' | 'business' | string;
  environment: string;
  databaseStatus: 'healthy' | 'unhealthy' | string;
  redisStatus: 'healthy' | 'unhealthy' | 'not_configured' | string;
  supportedGlossaryDomains: string[];
  privacy: SystemPrivacyContract;
  retention: SystemRetentionInfo;
  security: SystemSecurityInfo;
  license?: SystemLicenseInfo;
  timestamp: string;
}

export interface SystemCleanupResult {
  deletedAdmissions: number;
  deletedSessions: number;
  cutoffUtc: string;
  purgedAtUtc: string;
}

export interface GlossaryStatsResponse {
  total_terms?: number;
  domains?: Record<string, number>;
  [key: string]: unknown;
}

export async function fetchSystemStatus(signal?: AbortSignal): Promise<SystemStatusResponse> {
  const res = await fetch('/api/system/status', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!res.ok) {
    throw new Error(`Failed to load system status: HTTP ${res.status}`);
  }
  return (await res.json()) as SystemStatusResponse;
}

export async function fetchSystemLicense(signal?: AbortSignal): Promise<SystemLicenseInfo> {
  const res = await fetch('/api/system/license', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!res.ok) {
    throw new Error(`Failed to load system license: HTTP ${res.status}`);
  }
  return (await res.json()) as SystemLicenseInfo;
}

export async function triggerSystemCleanup(): Promise<SystemCleanupResult> {
  const res = await fetch('/api/system/cleanup', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Cleanup failed: HTTP ${res.status}`);
  }
  return (await res.json()) as SystemCleanupResult;
}

export async function fetchGlossaryStats(signal?: AbortSignal): Promise<GlossaryStatsResponse | null> {
  try {
    const res = await fetch('/ai-glossary/stats', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as GlossaryStatsResponse;
  } catch {
    return null;
  }
}

export async function reloadGlossary(): Promise<{ status: string; stats?: GlossaryStatsResponse }> {
  const res = await fetch('/ai-glossary/reload', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Glossary reload failed: HTTP ${res.status}`);
  }
  return (await res.json()) as { status: string; stats?: GlossaryStatsResponse };
}

export async function fetchAuditLogs(limit = 20, signal?: AbortSignal): Promise<AuditEventRecord[]> {
  try {
    const res = await fetch(`/api/system/audit?limit=${limit}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    });
    if (!res.ok) {
      return [];
    }
    return (await res.json()) as AuditEventRecord[];
  } catch {
    return [];
  }
}
