export type SupportedLanguage = 'vi' | 'en' | 'ja' | 'ko' | 'zh' | 'fr' | 'de' | 'es';
export type LanguageCode = SupportedLanguage;

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES_LIST: LanguageOption[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

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
  hostToken: string;
}

export interface JoinMeetingRequest {
  displayName: string;
  spokenLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  admissionToken?: string;
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
  subtitleToken: string;
  role: 'host' | 'participant';
  sessionToken?: string;

  joinedAt: string;
}

export interface AdmissionPendingResponse {
  meetingId: string;
  meetingCode: string;
  admissionId: string;
  status: 'pending';
  admissionToken: string;
  expiresAt: string;
}

export type JoinMeetingResult = JoinMeetingResponse | AdmissionPendingResponse;

export interface InviteResponse {
  admissionId: string;
  role: 'participant';
  token: string;
  expiresAt: string;
}

export interface AdmissionRequest {
  admissionId: string;
  status: 'pending' | 'approved' | 'rejected';
  role: 'participant';
  displayName: string;
  spokenLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  createdAt: string;
  expiresAt: string;
}

export function isAdmissionPending(result: JoinMeetingResult): result is AdmissionPendingResponse {
  return 'status' in result && result.status === 'pending';
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
  subtitleToken: string;
  role: 'host' | 'participant';
  sessionToken?: string;
  hostToken?: string;
  initialMicOn?: boolean;
  initialCameraOn?: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  leftPercent: number;
}

