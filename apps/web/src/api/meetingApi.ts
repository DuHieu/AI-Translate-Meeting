import {
  CreateMeetingResponse,
  JoinMeetingRequest,
  JoinMeetingResponse,
  MeetingDetails,
  Participant,
} from '../types/meeting';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const problem = await response.json();
      errorDetail = problem.title || problem.detail || errorDetail;
    } catch {
      // Ignore JSON parse failure
    }
    throw new Error(errorDetail || `API request failed with status ${response.status}`);
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

  async getMeeting(meetingCode: string): Promise<MeetingDetails> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<MeetingDetails>(res);
  },

  async joinMeeting(meetingCode: string, req: JoinMeetingRequest): Promise<JoinMeetingResponse> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return handleResponse<JoinMeetingResponse>(res);
  },

  async leaveMeeting(meetingCode: string, participantId: string): Promise<void> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId }),
    });
    await handleResponse<void>(res);
  },

  async getParticipants(meetingCode: string): Promise<Participant[]> {
    const code = meetingCode.trim().toUpperCase();
    const res = await fetch(`${API_BASE_URL}/api/meetings/${code}/participants`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<Participant[]>(res);
  },
};
