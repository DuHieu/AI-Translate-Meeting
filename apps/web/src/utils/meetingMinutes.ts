import type { MeetingTranscriptEntry } from '../types/meeting';
import type { SubtitleMessage } from '../types/subtitle';

const TRANSCRIPT_HEADING = '## Nội dung chi tiết theo thời gian';

function cleanInlineText(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function toMeetingTranscript(history: SubtitleMessage[]): MeetingTranscriptEntry[] {
  return history
    .filter((item) => item.isFinal && (item.translatedText.trim() || item.originalText.trim()))
    .map((item) => ({
      id: item.id,
      participantName: cleanInlineText(item.participantName || 'Người phát biểu'),
      originalText: cleanInlineText(item.originalText),
      translatedText: cleanInlineText(item.translatedText),
      timestamp: item.timestamp,
    }));
}

export function buildTranscriptMarkdown(transcript: MeetingTranscriptEntry[]): string[] {
  if (transcript.length === 0) return [];
  return [
    '',
    TRANSCRIPT_HEADING,
    ...transcript.map((item) => {
      const text = item.translatedText || item.originalText;
      const original = item.originalText && item.originalText !== item.translatedText
        ? ` | Gốc: ${item.originalText}`
        : '';
      return `- [${item.timestamp}] ${item.participantName}: ${text}${original}`;
    }),
  ];
}

export function parseTranscriptFromMarkdown(markdown: string): MeetingTranscriptEntry[] {
  const transcriptSection = markdown.split(TRANSCRIPT_HEADING)[1];
  if (!transcriptSection) return [];

  return transcriptSection
    .split('\n')
    .map((line, index) => {
      const match = line.match(/^- \[([^\]]+)] ([^:]+): (.+)$/);
      if (!match) return null;
      const [, timestamp, participantName, combinedText] = match;
      const [translatedText, originalText = ''] = combinedText.split(' | Gốc: ', 2);
      return {
        id: `minutes-transcript-${index}`,
        participantName: participantName.trim(),
        originalText: originalText.trim(),
        translatedText: translatedText.trim(),
        timestamp: timestamp.trim(),
      } satisfies MeetingTranscriptEntry;
    })
    .filter((item): item is MeetingTranscriptEntry => item !== null);
}
