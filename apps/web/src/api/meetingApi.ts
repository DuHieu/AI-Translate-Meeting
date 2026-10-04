import {
  CreateMeetingResponse,
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
} from '../types/meeting';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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

export const DEFAULT_BRANDING_CONFIG: BrandingConfigDto = {
  brandName: 'ViMeet',
  slogan: 'Nền tảng họp trực tuyến thông minh song ngữ',
  logoUrl: null,
  primaryColor: '#0284c7',
  copyrightText: '© ViMeet',
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

export const meetingApi = {
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

  async createMeeting(name = 'Meeting'): Promise<CreateMeetingResponse> {
    const res = await fetch(`${API_BASE_URL}/api/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleResponse<CreateMeetingResponse>(res);
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
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/minutes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<MeetingMinutesResponse>(res);
  },

  async getMeetingMinutes(meetingCode: string): Promise<MeetingMinutesResponse> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/minutes`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<MeetingMinutesResponse>(res);
  },
};
