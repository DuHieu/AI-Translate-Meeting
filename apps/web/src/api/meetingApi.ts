import {
  CreateMeetingResponse,
  CreateScheduledMeetingOptions,
  JoinMeetingRequest,
  JoinMeetingResult,
  MeetingDetails,
  Participant,
  InviteResponse,
  AdmissionRequest,
  SupportedLanguage,
  UpdateSubtitlePreferencesResponse,
  SaveMeetingMinutesRequest,
  MeetingMinutesResponse,
  MeetingSchedule,
  SubmitRsvpRequest,
  SubmitRsvpResponse,
  MeetingHistoryItemDto,
} from '../types/meeting';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const MINUTES_CACHE_PREFIX = 'layameet:meeting-minutes:';
const TRANSLATION_QA_BASE_URL = '/api/translation-qa';

function normalizeMeetingCode(meetingCode: string): string {
  return meetingCode.trim().toUpperCase();
}

export function getCachedMeetingMinutes(meetingCode: string): MeetingMinutesResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${MINUTES_CACHE_PREFIX}${normalizeMeetingCode(meetingCode)}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MeetingMinutesResponse;
    return parsed && typeof parsed.title === 'string' && Array.isArray(parsed.actionItems)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function setCachedMeetingMinutes(
  meetingCode: string,
  minutes: MeetingMinutesResponse,
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${MINUTES_CACHE_PREFIX}${normalizeMeetingCode(meetingCode)}`,
      JSON.stringify(minutes),
    );
  } catch {
    // Cache is a convenience only; server persistence remains authoritative.
  }
}

export interface SsoProvider {
  id: 'google' | 'microsoft365';
  name: string;
  icon: string;
  enabled: boolean;
  authUrl: string | null;
}

export interface EnterpriseDomainValidation {
  allowed: boolean;
  domain: string | null;
  organizationName: string | null;
}

export interface BrandingConfigDto {
  brandName: string;
  slogan: string;
  logoUrl: string | null;
  primaryColor: string;
  copyrightText: string;
}

export interface RoomGlossaryResponse {
  meetingCode: string;
  terms: Record<string, string>;
}

export interface PolarProductPlan {
  id: 'pro' | 'pro_quarterly' | 'pro_annual' | 'pro_2year';
  polar_product_id: string;
  name: string;
  months: number;
  price_usd: number;
  price_vnd: number;
  price_per_month_usd: number;
  price_per_month_vnd: number;
  savings_percent: number;
}

export interface TranslationUsageResponse {
  meeting_id: string;
  tier: 'standard' | 'pro' | 'byok';
  total_tokens_used: number;
  quota: number;
  remaining_quota: number;
  is_quota_exceeded: boolean;
  downgraded: boolean;
  downgrade_reason: string | null;
}

export const DEFAULT_BRANDING_CONFIG: BrandingConfigDto = {
  brandName: 'LayaMeet',
  slogan: 'Nền tảng họp trực tuyến thông minh song ngữ',
  logoUrl: null,
  primaryColor: '#0284c7',
  copyrightText: '© LayaMeet',
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = response.statusText;
    let errorCode: string | undefined;
    try {
      const problem = await response.json();
      errorDetail = problem.detail || problem.title || errorDetail;
      errorCode = problem.code;
    } catch {
      // Keep the HTTP fallback when the response is not JSON ProblemDetails.
    }
    throw new ApiError(
      errorDetail || `API request failed with status ${response.status}`,
      response.status,
      errorCode,
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

async function handleTextResponse(response: Response): Promise<string> {
  if (!response.ok) {
    await handleResponse<never>(response);
  }
  return response.text();
}

export interface TranslationQaMeetingStats {
  meetingCode: string;
  avgAccuracyPct: number;
  avgSttConfidencePct: number;
  totalSegments: number;
  avgLatencyMs: number;
  cacheHitRatePct: number;
  flaggedLowConfidenceCount: number;
  languagePairs: string[];
  engineBreakdown: Record<string, number>;
}

export interface TranslationQaSummaryResponse {
  avgAccuracyPct: number;
  avgSttConfidencePct: number;
  totalSegments: number;
  avgLatencyMs: number;
  cacheHitRatePct: number;
  flaggedLowConfidenceCount: number;
  qaTrainingModeEnabled: boolean;
  learnedPatternsCount: number;
  meetings: TranslationQaMeetingStats[];
}

export interface TranslationQaSample {
  id: string;
  meetingId: string;
  source: string;
  machineTranslation: string;
  correctedTranslation: string | null;
  sourceLanguage: string;
  targetLanguage: string;
  domain: string;
  provider: string;
  latencyMs: number;
  accuracyScore: number;
  piiScrubbed: boolean;
  status: 'pending' | 'trained';
  createdAt: string;
}

export interface LearnedPatternRecord {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  normalizedSourceText: string;
  translation: string;
  domain: string;
  status: 'trained';
  trainedAt: string;
}

export interface TranslationQaSamplesResponse {
  samples: TranslationQaSample[];
  learnedPatterns: LearnedPatternRecord[];
}

export interface TrainTranslationPatternPayload {
  sampleId?: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  correctedTranslation: string;
  domain?: string;
}

export interface TranslationProvidersResponse {
  available: string[];
  recommended: string;
  metadata: Record<string, { label: string; badge: string; description: string }>;
}

export interface SubmitMeetingFeedbackRequest {
  rating: number; // 1 to 5
  category?: string;
  comment: string;
  userName?: string;
  userEmail?: string;
}

export interface MeetingFeedbackResponse {
  id: string;
  meetingCode: string;
  rating: number;
  category?: string;
  comment: string;
  userName?: string;
  userEmail?: string;
  createdAt: string;
}

export const meetingApi = {
  async getMeetingHistory(email?: string): Promise<MeetingHistoryItemDto[]> {
    const params = new URLSearchParams();
    if (email?.trim()) params.append('email', email.trim());
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/meetings/history${query}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<MeetingHistoryItemDto[]>(res);
  },

  async getBrandingConfig(): Promise<BrandingConfigDto> {
    const res = await fetch(`${API_BASE_URL}/api/system/branding`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return handleResponse<BrandingConfigDto>(res);
  },

  async getSsoProviders(): Promise<SsoProvider[]> {
    const res = await fetch(`${API_BASE_URL}/api/auth/providers`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return handleResponse<SsoProvider[]>(res);
  },

  async validateEnterpriseDomain(email: string): Promise<EnterpriseDomainValidation> {
    const res = await fetch(`${API_BASE_URL}/api/auth/validate-domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    return handleResponse<EnterpriseDomainValidation>(res);
  },

  async createMeeting(
    name = 'Meeting',
    options?: CreateScheduledMeetingOptions,
  ): Promise<CreateMeetingResponse> {
    const res = await fetch(`${API_BASE_URL}/api/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ...options }),
    });
    return handleResponse<CreateMeetingResponse>(res);
  },

  async getUpcomingScheduledMeetings(email?: string): Promise<MeetingSchedule[]> {
    const normalizedEmail = email?.trim();
    const query = normalizedEmail ? `?email=${encodeURIComponent(normalizedEmail)}` : '';
    const res = await fetch(`${API_BASE_URL}/api/meetings/scheduled${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return handleResponse<MeetingSchedule[]>(res);
  },

  async getMeetingSchedule(meetingCode: string): Promise<MeetingSchedule> {
    const code = normalizeMeetingCode(meetingCode);
    const res = await fetch(
      `${API_BASE_URL}/api/meetings/${encodeURIComponent(code)}/schedule`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
    );
    return handleResponse<MeetingSchedule>(res);
  },

  async submitRsvp(
    meetingCode: string,
    data: SubmitRsvpRequest,
  ): Promise<SubmitRsvpResponse> {
    const code = normalizeMeetingCode(meetingCode);
    const res = await fetch(
      `${API_BASE_URL}/api/meetings/${encodeURIComponent(code)}/rsvp`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );
    return handleResponse<SubmitRsvpResponse>(res);
  },

  getCalendarIcsUrl(meetingCode: string): string {
    return `/api/meetings/${encodeURIComponent(normalizeMeetingCode(meetingCode))}/calendar.ics`;
  },

  async getMeeting(meetingCode: string, sessionToken?: string): Promise<MeetingDetails> {
    const code = meetingCode.trim().toUpperCase();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<MeetingDetails>(res);
  },

  async joinMeeting(meetingCode: string, req: JoinMeetingRequest): Promise<JoinMeetingResult> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return handleResponse<JoinMeetingResult>(res);
  },

  async createInvite(meetingCode: string, hostToken: string, ttlMinutes = 15): Promise<InviteResponse> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/invites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`,
      },
      body: JSON.stringify({ ttlMinutes }),
    });
    return handleResponse<InviteResponse>(res);
  },

  async getAdmissions(meetingCode: string, hostToken: string): Promise<AdmissionRequest[]> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/admissions`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    return handleResponse<AdmissionRequest[]>(res);
  },

  async decideAdmission(
    meetingCode: string,
    admissionId: string,
    hostToken: string,
    decision: 'approved' | 'rejected',
  ): Promise<AdmissionRequest> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(
      `${API_BASE_URL}/api/meetings/${code}/admissions/${admissionId}/decision`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hostToken}`,
        },
        body: JSON.stringify({ decision }),
      },
    );
    return handleResponse<AdmissionRequest>(res);
  },

  async leaveMeeting(meetingCode: string, participantId: string, sessionToken?: string): Promise<void> {
    const code = meetingCode.trim().toUpperCase();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/leave`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ participantId }),
    });
    await handleResponse<void>(res);
  },

  async endMeeting(meetingCode: string, hostOrSessionToken: string): Promise<void> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostOrSessionToken}`,
      },
    });
    await handleResponse<void>(res);
  },

  async getParticipants(meetingCode: string, sessionToken?: string): Promise<Participant[]> {
    const code = meetingCode.trim().toUpperCase();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/participants`, {
      method: 'GET',
      headers,
    });
    return handleResponse<Participant[]>(res);
  },

  async updateSubtitlePreferences(
    meetingCode: string,
    targetLanguage: SupportedLanguage,
    sessionToken: string,
  ): Promise<UpdateSubtitlePreferencesResponse> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/subtitle-preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ targetLanguage }),
    });
    return handleResponse<UpdateSubtitlePreferencesResponse>(res);
  },

  async saveMeetingMinutes(
    meetingCode: string,
    data: SaveMeetingMinutesRequest,
  ): Promise<MeetingMinutesResponse> {
    const code = normalizeMeetingCode(meetingCode);
    const localMinutes: MeetingMinutesResponse = {
      id: `local-${code}`,
      meetingCode: code,
      title: data.title,
      summary: data.summary,
      markdownContent: data.markdownContent,
      decisions: data.decisions ?? [],
      actionItems: data.actionItems ?? [],
      createdAt: new Date().toISOString(),
      transcript: data.transcript,
    };
    setCachedMeetingMinutes(code, localMinutes);

    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/minutes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const saved = await handleResponse<MeetingMinutesResponse>(res);
    const result = { ...saved, transcript: data.transcript };
    setCachedMeetingMinutes(code, result);
    return result;
  },

  async getMeetingMinutes(meetingCode: string): Promise<MeetingMinutesResponse> {
    const code = normalizeMeetingCode(meetingCode);
    const cached = getCachedMeetingMinutes(code);
    try {
      const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/minutes`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const remote = await handleResponse<MeetingMinutesResponse>(res);
      const result = { ...remote, transcript: remote.transcript ?? cached?.transcript };
      setCachedMeetingMinutes(code, result);
      return result;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  },

  async submitMeetingFeedback(
    meetingCode: string,
    data: SubmitMeetingFeedbackRequest,
  ): Promise<MeetingFeedbackResponse> {
    const code = normalizeMeetingCode(meetingCode);
    const res = await fetch(`${API_BASE_URL}/api/meetings/${encodeURIComponent(code)}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<MeetingFeedbackResponse>(res);
  },

  async getRoomGlossary(meetingCode: string): Promise<RoomGlossaryResponse> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`/api/glossary/${encodeURIComponent(code)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return handleResponse<RoomGlossaryResponse>(res);
  },

  async updateRoomGlossary(
    meetingCode: string,
    terms: Record<string, string>,
  ): Promise<RoomGlossaryResponse> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`/api/glossary/${encodeURIComponent(code)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terms }),
    });
    return handleResponse<RoomGlossaryResponse>(res);
  },

  async getTranslationUsage(
    meetingId: string,
    tier: 'standard' | 'pro' | 'byok',
  ): Promise<TranslationUsageResponse> {
    const params = new URLSearchParams({ tier });
    const res = await fetch(
      `/api/translation/usage/${encodeURIComponent(meetingId)}?${params.toString()}`,
      { headers: { Accept: 'application/json' } },
    );
    return handleResponse<TranslationUsageResponse>(res);
  },

  async getAdminTranslationQaSummary(adminKey: string): Promise<TranslationQaSummaryResponse> {
    const res = await fetch(`${TRANSLATION_QA_BASE_URL}/summary`, {
      headers: { Accept: 'application/json', 'X-Admin-Key': adminKey.trim() },
    });
    return handleResponse<TranslationQaSummaryResponse>(res);
  },

  async getAdminTranslationQaSamples(
    adminKey: string,
    meetingId?: string,
  ): Promise<TranslationQaSamplesResponse> {
    const query = meetingId ? `?meetingId=${encodeURIComponent(meetingId)}` : '';
    const res = await fetch(`${TRANSLATION_QA_BASE_URL}/samples${query}`, {
      headers: { Accept: 'application/json', 'X-Admin-Key': adminKey.trim() },
    });
    return handleResponse<TranslationQaSamplesResponse>(res);
  },

  async updateAdminTranslationQaSettings(
    adminKey: string,
    qaTrainingModeEnabled: boolean,
  ): Promise<{ qaTrainingModeEnabled: boolean }> {
    const res = await fetch(`${TRANSLATION_QA_BASE_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey.trim() },
      body: JSON.stringify({ qaTrainingModeEnabled }),
    });
    return handleResponse<{ qaTrainingModeEnabled: boolean }>(res);
  },

  async trainAdminTranslationPattern(
    adminKey: string,
    payload: TrainTranslationPatternPayload,
  ): Promise<LearnedPatternRecord> {
    const res = await fetch(`${TRANSLATION_QA_BASE_URL}/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey.trim() },
      body: JSON.stringify(payload),
    });
    return handleResponse<LearnedPatternRecord>(res);
  },

  async deleteAdminTranslationPattern(
    adminKey: string,
    payload: { sourceLanguage: string; targetLanguage: string; sourceText: string },
  ): Promise<{ removed: boolean }> {
    const res = await fetch(`${TRANSLATION_QA_BASE_URL}/patterns`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey.trim() },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ removed: boolean }>(res);
  },

  async exportAdminTranslationDataset(adminKey: string): Promise<string> {
    const res = await fetch(`${TRANSLATION_QA_BASE_URL}/export`, {
      headers: { Accept: 'application/x-ndjson', 'X-Admin-Key': adminKey.trim() },
    });
    return handleTextResponse(res);
  },

  async getTranslationProviders(): Promise<TranslationProvidersResponse> {
    const res = await fetch('/api/translation/providers', {
      headers: { Accept: 'application/json' },
    });
    return handleResponse<TranslationProvidersResponse>(res);
  },

  async createPaymentOrder(
    planId: string,
    meetingCode?: string,
    customerEmail?: string,
    customerName?: string,
    userId?: string,
    paymentMethod?: 'vietqr' | 'polar',
    currency?: 'VND' | 'USD',
  ): Promise<PaymentOrderResponse> {
    const res = await fetch(`${API_BASE_URL}/api/billing/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, meetingCode, customerEmail, customerName, userId, paymentMethod, currency }),
    });
    return handleResponse<PaymentOrderResponse>(res);
  },

  async getPolarCheckoutUrl(
    productId: string,
    customerEmail?: string,
    customerName?: string,
    userId?: string,
  ): Promise<{ checkout_url: string; session_id: string }> {
    const params = new URLSearchParams({ products: productId });
    if (customerEmail) params.append('customer_email', customerEmail);
    if (customerName) params.append('customer_name', customerName);
    if (userId) params.append('external_customer_id', userId);

    const res = await fetch(`/api/polar/checkout-url?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<{ checkout_url: string; session_id: string }>(res);
  },

  async getPolarProducts(): Promise<PolarProductPlan[]> {
    const res = await fetch('/api/polar/products', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<PolarProductPlan[]>(res);
  },

  async getPaymentOrder(orderCode: string): Promise<PaymentOrderResponse> {
    const res = await fetch(`${API_BASE_URL}/api/billing/order/${encodeURIComponent(orderCode.trim())}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<PaymentOrderResponse>(res);
  },

  async getAccountSubscription(email: string): Promise<AccountSubscriptionResponse> {
    const query = new URLSearchParams({ email: email.trim() });
    const res = await fetch(`${API_BASE_URL}/api/billing/subscription?${query.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return handleResponse<AccountSubscriptionResponse>(res);
  },

  async submitEnterpriseLead(data: CreateLeadRequest): Promise<CreateLeadResponse> {
    const res = await fetch(`${API_BASE_URL}/api/system/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<CreateLeadResponse>(res);
  },

  async getBillingPlans(): Promise<PlanInfoDto[]> {
    const res = await fetch(`${API_BASE_URL}/api/billing/plans`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<PlanInfoDto[]>(res);
  },

  async getAdminMetrics(adminKey: string): Promise<AdminMetricsResponse> {
    const res = await fetch(`${API_BASE_URL}/api/admin/metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey.trim(),
      },
    });
    return handleResponse<AdminMetricsResponse>(res);
  },

  async getAdminOrders(adminKey: string): Promise<PaymentOrderResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/admin/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey.trim(),
      },
    });
    return handleResponse<PaymentOrderResponse[]>(res);
  },

  async getAdminLeads(adminKey: string): Promise<EnterpriseLeadRecord[]> {
    const res = await fetch(`${API_BASE_URL}/api/admin/leads`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey.trim(),
      },
    });
    return handleResponse<EnterpriseLeadRecord[]>(res);
  },

  async testAdminNotification(adminKey: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/test-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey.trim(),
      },
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async getAdminInfraMetrics(adminKey: string): Promise<InfraMetricsResponse> {
    const res = await fetch(`${API_BASE_URL}/api/admin/infra-metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey.trim(),
      },
    });
    return handleResponse<InfraMetricsResponse>(res);
  },

  async testAdminAlert(
    adminKey: string,
    severity: 'warning' | 'critical',
    customMessage?: string
  ): Promise<{ success: boolean; severity: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/admin/test-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey.trim(),
      },
      body: JSON.stringify({ severity, customMessage }),
    });
    return handleResponse<{ success: boolean; severity: string; message: string }>(res);
  },

  async getAdminMeetings(
    adminKey: string,
    status?: 'all' | 'active' | 'ended',
    search?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<AdminMeetingListResponse> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (search?.trim()) params.append('search', search.trim());
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    const res = await fetch(`${API_BASE_URL}/api/admin/meetings?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey.trim(),
      },
    });
    return handleResponse<AdminMeetingListResponse>(res);
  },

  async closeAdminMeeting(adminKey: string, meetingCode: string): Promise<CloseMeetingResponse> {
    const res = await fetch(`${API_BASE_URL}/api/admin/meetings/${encodeURIComponent(meetingCode)}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey.trim(),
      },
    });
    return handleResponse<CloseMeetingResponse>(res);
  },
};

export interface PaymentOrderResponse {
  orderCode: string;
  amount: number;
  planName: string;
  status: string;
  qrUrl: string;
  bankId: string;
  accountNumber: string;
  accountName: string;
  createdAt: string;
  customerEmail?: string | null;
  customerName?: string | null;
  userId?: string | null;
  planId?: string;
  paidAt?: string | null;
  subscriptionExpiresAt?: string | null;
  paymentMethod?: string;
  currency?: string;
  amountUsd?: number | null;
  checkoutUrl?: string | null;
}

export interface AccountSubscriptionResponse {
  email: string;
  tier: string;
  isPro: boolean;
  activePlanId: string | null;
  activePlanName: string | null;
  lastOrderCode: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
}

export interface CreateLeadRequest {
  fullName: string;
  email: string;
  company?: string;
  teamSize?: string;
  languagePair?: string;
  deploymentModel?: string;
  notes?: string;
}

export interface CreateLeadResponse {
  success: boolean;
  message: string;
  submittedAtUtc: string;
}

export interface AdminMetricsResponse {
  activeMeetings: number;
  totalOrders: number;
  paidOrders: number;
  totalRevenueVnd: number;
  totalLeads: number;
  telegramConfigured: boolean;
  webhookConfigured: boolean;
  zaloConfigured?: boolean;
  totalTokensUsed?: number;
  proTokensUsed?: number;
  generatedAtUtc: string;
}

export interface EnterpriseLeadRecord {
  id: string;
  fullName: string;
  email: string;
  company?: string;
  teamSize?: string;
  languagePair?: string;
  deploymentModel?: string;
  notes?: string;
  submittedAtUtc: string;
}

export interface PlanInfoDto {
  planId: string;
  name: string;
  priceVnd: number;
  durationDescription: string;
  features: string[];
  priceUsd?: number;
}

export interface InfraHealthIndicator {
  component: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  value?: number;
  unit?: string;
}

export interface InfraMetricsResponse {
  systemStatus: 'normal' | 'warning' | 'critical';
  processMemoryMb: number;
  gcAllocatedMb: number;
  activeRooms: number;
  activeParticipants: number;
  maxConcurrentRooms: number;
  roomCapacityPercent: number;
  databaseStatus: string;
  redisStatus: string;
  redisLatencyMs?: number;
  indicators: InfraHealthIndicator[];
  activeAlerts: string[];
  telegramConfigured: boolean;
  timestampUtc: string;
}

export interface AdminMeetingDto {
  id: string;
  meetingCode: string;
  roomName: string;
  name: string;
  createdAtUtc: string;
  endedAtUtc: string | null;
  activeParticipantsCount: number;
  totalParticipantsCount: number;
  isActive: boolean;
  durationMinutes: number;
}

export interface AdminMeetingListResponse {
  meetings: AdminMeetingDto[];
  totalCount: number;
  activeCount: number;
  endedCount: number;
}

export interface CloseMeetingResponse {
  success: boolean;
  meetingCode: string;
  message: string;
  endedAtUtc: string;
}

