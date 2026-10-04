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
  { code: 'ko', name: 'Korean', nativeName: 'Tiếng Hàn' },
  { code: 'zh', name: 'Chinese', nativeName: 'Tiếng Trung' },
  { code: 'fr', name: 'French', nativeName: 'Tiếng Pháp' },
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

export interface UpdateSubtitlePreferencesResponse {
  targetLanguage: SupportedLanguage;
  subtitleToken: string;
}

export interface SidecarPreferences {
  showActions: boolean;
  showRecap: boolean;
  showChat: boolean;
  audioBooth: boolean;
  showOriginal: boolean;
}

export interface MeetingActionItem {
  task: string;
  owner?: string | null;
  deadline?: string | null;
  priority?: string | null;
}

export interface SaveMeetingMinutesRequest {
  title: string;
  summary: string;
  markdownContent: string;
  decisions?: string[] | null;
  actionItems?: MeetingActionItem[] | null;
}

export interface MeetingMinutesResponse {
  id: string;
  meetingCode: string;
  title: string;
  summary: string;
  markdownContent: string;
  decisions: string[];
  actionItems: MeetingActionItem[];
  createdAt: string;
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

export interface RaiseHandDataMessage {
  type: 'RAISE_HAND';
  participantId: string;
  raised: boolean;
  timestamp: number;
}

export interface ReactionDataMessage {
  type: 'REACTION';
  emoji: string;
  senderName: string;
}

export type CollaborationDataMessage = RaiseHandDataMessage | ReactionDataMessage;

export function isCollaborationDataMessage(value: unknown): value is CollaborationDataMessage {
  if (!value || typeof value !== 'object') return false;

  const message = value as Record<string, unknown>;
  if (message.type === 'RAISE_HAND') {
    return (
      typeof message.participantId === 'string' &&
      typeof message.raised === 'boolean' &&
      typeof message.timestamp === 'number'
    );
  }

  return (
    message.type === 'REACTION' &&
    typeof message.emoji === 'string' &&
    typeof message.senderName === 'string'
  );
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  leftPercent: number;
}
