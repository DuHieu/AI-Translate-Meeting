import {
  CreateMeetingResponse,
  JoinMeetingRequest,
  JoinMeetingResult,
  MeetingDetails,
  Participant,
  InviteResponse,
  AdmissionRequest,
} from '../types/meeting';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
};
