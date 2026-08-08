import { meetingApi } from '../api/meetingApi';
import { CreateMeetingResponse, JoinMeetingRequest, JoinMeetingResponse, MeetingDetails } from '../types/meeting';

export const meetingService = {
  async createMeeting(name: string): Promise<CreateMeetingResponse> {
    return meetingApi.createMeeting(name);
  },

  async getMeeting(meetingCode: string): Promise<MeetingDetails> {
    return meetingApi.getMeeting(meetingCode);
  },

  async joinMeeting(meetingCode: string, req: JoinMeetingRequest): Promise<JoinMeetingResponse> {
    return meetingApi.joinMeeting(meetingCode, req);
  },

  async leaveMeeting(meetingCode: string, participantId: string): Promise<void> {
    return meetingApi.leaveMeeting(meetingCode, participantId);
  },
};
