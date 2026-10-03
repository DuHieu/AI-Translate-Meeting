import { meetingApi } from '../api/meetingApi';
import { CreateMeetingResponse, JoinMeetingRequest, JoinMeetingResult, MeetingDetails } from '../types/meeting';

export const meetingService = {
  async createMeeting(name: string): Promise<CreateMeetingResponse> {
    return meetingApi.createMeeting(name);
  },

  async getMeeting(meetingCode: string, sessionToken?: string): Promise<MeetingDetails> {
    return meetingApi.getMeeting(meetingCode, sessionToken);
  },

  async joinMeeting(meetingCode: string, req: JoinMeetingRequest): Promise<JoinMeetingResult> {
    return meetingApi.joinMeeting(meetingCode, req);
  },

  async leaveMeeting(meetingCode: string, participantId: string, sessionToken?: string): Promise<void> {
    return meetingApi.leaveMeeting(meetingCode, participantId, sessionToken);
  },
};
