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
  tags?: string[];
  confidence?: number;
}

export interface SubtitleBroadcast {
  type: "subtitle";
  data: SubtitleMessage;
}
