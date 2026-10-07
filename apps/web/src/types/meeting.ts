export type SupportedLanguage = 'vi' | 'en' | 'ja' | 'ko' | 'zh' | 'th' | 'id' | 'tl' | 'ar' | 'fr' | 'de' | 'es';
export type LanguageCode = SupportedLanguage;

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  countryCode: string;
}

export const SUPPORTED_LANGUAGES_LIST: LanguageOption[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', countryCode: 'VN' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', countryCode: 'US' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', countryCode: 'JP' },
  { code: 'ko', name: 'Korean', nativeName: 'Tiếng Hàn', flag: '🇰🇷', countryCode: 'KR' },
  { code: 'zh', name: 'Chinese', nativeName: 'Tiếng Trung', flag: '🇨🇳', countryCode: 'CN' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', countryCode: 'TH' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', countryCode: 'ID' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Filipino', flag: '🇵🇭', countryCode: 'PH' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', countryCode: 'SA' },
  { code: 'fr', name: 'French', nativeName: 'Tiếng Pháp', flag: '🇫🇷', countryCode: 'FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', countryCode: 'DE' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', countryCode: 'ES' },
];

export function getLanguageOption(code?: string | null): LanguageOption {
  const normalized = (code || 'vi').toLowerCase().split('-')[0];
  return (
    SUPPORTED_LANGUAGES_LIST.find((lang) => lang.code === normalized) ||
    SUPPORTED_LANGUAGES_LIST[0]
  );
}

export function getLanguageFlag(code?: string | null): string {
  return getLanguageOption(code).flag;
}

export interface CreateMeetingRequest {
  name: string;
}

export interface CreateScheduledMeetingOptions {
  scheduledStartAt?: string | null;
  durationMinutes?: number;
  timezone?: string;
  agenda?: string;
  defaultSpokenLanguage?: SupportedLanguage | 'auto';
  defaultTargetLanguage?: SupportedLanguage;
  domainGlossary?: string;
  hostEmail?: string | null;
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
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  timezone?: string | null;
  agenda?: string | null;
  defaultSpokenLanguage?: string | null;
  defaultTargetLanguage?: string | null;
  domainGlossary?: string | null;
}

export interface RsvpAttendee {
  rsvpId: string;
  displayName: string;
  status: 'going' | 'maybe' | 'declined';
  spokenLanguage: string;
  targetLanguage: string;
  updatedAt: string;
}

export interface MeetingSchedule {
  meetingId: string;
  meetingCode: string;
  name: string;
  createdAt: string;
  endedAt?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  timezone: string;
  agenda?: string | null;
  defaultSpokenLanguage: string;
  defaultTargetLanguage: string;
  domainGlossary: string;
  goingCount: number;
  maybeCount: number;
  declinedCount: number;
  attendees: RsvpAttendee[];
}

export interface SubmitRsvpRequest {
  displayName: string;
  email?: string | null;
  status: 'going' | 'maybe' | 'declined';
  spokenLanguage: string;
  targetLanguage: string;
}

export interface SubmitRsvpResponse {
  rsvpId: string;
  meetingCode: string;
  displayName: string;
  status: 'going' | 'maybe' | 'declined';
  spokenLanguage: string;
  targetLanguage: string;
  preApprovedAdmissionToken?: string | null;
  admissionExpiresAt?: string | null;
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
  fileSharing: boolean;
  meetingRecording: boolean;
  e2eeEnabled: boolean;
  floatingSubtitleWidget: boolean;
  audioBooth: boolean;
  showOriginal: boolean;
}

export interface MeetingActionItem {
  task: string;
  owner?: string | null;
  deadline?: string | null;
  priority?: string | null;
}

export interface MeetingTranscriptEntry {
  id: string;
  participantName: string;
  originalText: string;
  translatedText: string;
  timestamp: string;
}

export interface SaveMeetingMinutesRequest {
  title: string;
  summary: string;
  markdownContent: string;
  decisions?: string[] | null;
  actionItems?: MeetingActionItem[] | null;
  transcript?: MeetingTranscriptEntry[];
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
  transcript?: MeetingTranscriptEntry[];
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
  attachment?: {
    name: string;
    size: number;
    summaryTranslation?: string;
  };
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

export interface MeetingHistoryItemDto {
  meetingId: string;
  meetingCode: string;
  name: string;
  createdAt: string;
  endedAt?: string | null;
  hasMinutes: boolean;
  title?: string | null;
  summaryExcerpt?: string | null;
  participantCount: number;
}
