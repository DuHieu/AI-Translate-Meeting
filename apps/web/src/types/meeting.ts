export type SupportedLanguage = 'vi' | 'en' | 'ja';
export type LanguageCode = SupportedLanguage;

export interface CreateMeetingRequest {
  name: string;
}

export interface Meeting {
  id: string;
  meetingCode: string;
  roomName: string;
  name: string;
  createdAt: string;
  endedAt?: string | null;
}

export interface CreateMeetingResponse {
  meetingId: string;
  meetingCode: string;
  roomName: string;
  name: string;
  createdAt: string;
}

export interface JoinMeetingRequest {
  displayName: string;
  spokenLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
}

export interface JoinMeetingResponse {
  meetingId: string;
  meetingCode: string;

  participantId: string;
  identity: string;

  displayName: string;

  spokenLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;

  liveKitUrl: string;
  token: string;

  joinedAt: string;
}

export interface MeetingDetails {
  meetingId: string;
  meetingCode: string;
  roomName: string;
  name: string;
  createdAt: string;
  endedAt?: string | null;
}

export interface Participant {
  participantId: string;
  identity: string;
  displayName: string;
  spokenLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  joinedAt: string;
}

export interface MeetingSessionData {
  meetingCode: string;
  meetingId: string;
  participantId: string;
  identity: string;
  displayName: string;
  spokenLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  liveKitUrl: string;
  token: string;
}
