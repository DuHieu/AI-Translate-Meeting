export type TextDirection = 'rtl' | 'ltr';

export interface LayaMetadata {
  isActionItem?: boolean;
  isDecision?: boolean;
  topic?: string | null;
}

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
  speakerSequence?: number;
  direction?: TextDirection;
  latencyMs?: number | null;
  layaMetadata?: LayaMetadata | null;
}

export interface SubtitleBroadcast {
  type: "subtitle";
  data: SubtitleMessage;
}

export type PipelinePhase = "transcribing" | "translating" | "ready" | "failed";

export interface PipelineStatusMessage {
  meetingId: string;
  utteranceId: string;
  participantId: string;
  liveKitIdentity: string;
  phase: PipelinePhase;
  sequence: number;
  timestamp: string;
  expiresAt: string;
  reasonCode?: string | null;
}

export interface PipelineStatusBroadcast {
  type: "pipeline_status";
  data: PipelineStatusMessage;
}

export type SubtitleSocketBroadcast = SubtitleBroadcast | PipelineStatusBroadcast;
