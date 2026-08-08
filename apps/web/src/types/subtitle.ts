export interface SubtitleMessage {
  id: string;
  meetingId: string;
  participantId: string;
  participantName: string;
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  isFinal: boolean;
  timestamp: string;
}

export interface SubtitleBroadcast {
  type: "subtitle";
  data: {
    meetingId: string;
    participantId: string;
    participantName: string;
    sourceLanguage: string;
    originalText: string;
    translations: Record<string, string>;
    isFinal: boolean;
    timestamp: string;
  };
}
