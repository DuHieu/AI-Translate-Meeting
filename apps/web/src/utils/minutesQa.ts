import type { MeetingActionItem, MeetingTranscriptEntry } from '../types/meeting';

export interface MinutesQaRecap {
  executiveHighlights: string[];
  decisions: string[];
  actionItems: MeetingActionItem[];
  blockersAndRisks?: string[];
}

export interface MinutesQaCitation {
  timestamp: string;
  speaker: string;
  excerpt: string;
}

export interface MinutesQaAnswer {
  answer: string;
  citations: MinutesQaCitation[];
}

const STOP_WORDS = new Set([
  'các', 'cho', 'có', 'của', 'đã', 'được', 'gì', 'hay', 'khi', 'là', 'những', 'nào',
  'the', 'and', 'for', 'from', 'that', 'this', 'what', 'with',
]);

export const MINUTES_QA_SUGGESTIONS = [
  'Tóm tắt các quyết định chính?',
  'Ai phụ trách các công việc cần làm?',
  'Có rủi ro hay vấn đề gì nổi bật?',
];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value).split(' ').filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function transcriptText(item: MeetingTranscriptEntry): string {
  return `${item.participantName} ${item.translatedText} ${item.originalText}`;
}

function rankTranscript(
  query: string,
  transcript: MeetingTranscriptEntry[],
): MeetingTranscriptEntry[] {
  const queryTokens = tokens(query);
  if (queryTokens.length === 0) return transcript.slice(0, 3);

  return transcript
    .map((item, index) => {
      const haystack = normalize(transcriptText(item));
      const score = queryTokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return { item, index, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map(({ item }) => item);
}

function toCitation(item: MeetingTranscriptEntry): MinutesQaCitation {
  const text = item.translatedText || item.originalText;
  return {
    timestamp: item.timestamp,
    speaker: item.participantName || 'Người phát biểu',
    excerpt: text.length > 180 ? `${text.slice(0, 177)}…` : text,
  };
}

function citationsFor(
  sourceTexts: string[],
  transcript: MeetingTranscriptEntry[],
): MinutesQaCitation[] {
  const seen = new Set<string>();
  const matches = sourceTexts.flatMap((text) => rankTranscript(text, transcript).slice(0, 1));
  return matches
    .filter((item) => {
      const key = `${item.timestamp}:${item.participantName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3)
    .map(toCitation);
}

export function askMeetingMinutes(
  question: string,
  transcript: MeetingTranscriptEntry[],
  recap: MinutesQaRecap,
): MinutesQaAnswer {
  const normalizedQuestion = normalize(question);
  const isDecisionQuestion = /(quyet dinh|thong nhat|chot|decision|agreed)/.test(normalizedQuestion);
  const isActionQuestion = /(ai phu trach|cong viec|viec can lam|action|owner|deadline)/.test(normalizedQuestion);
  const isRiskQuestion = /(rui ro|van de|diem nghen|blocker|risk|issue)/.test(normalizedQuestion);
  const isSummaryQuestion = /(tom tat|diem chinh|noi dung chinh|summary|highlight)/.test(normalizedQuestion);

  if (isDecisionQuestion) {
    const items = recap.decisions;
    return {
      answer: items.length
        ? `Cuộc họp ghi nhận ${items.length} quyết định chính: ${items.map((item, index) => `${index + 1}) ${item}`).join(' ')}`
        : 'Chưa có quyết định chính thức nào được ghi nhận trong biên bản.',
      citations: citationsFor(items, transcript),
    };
  }

  if (isActionQuestion) {
    const items = recap.actionItems;
    return {
      answer: items.length
        ? items.map((item, index) => `${index + 1}) ${item.task} — ${item.owner || 'chưa gán owner'}${item.deadline ? `, hạn ${item.deadline}` : ''}.`).join(' ')
        : 'Chưa có action item nào được ghi nhận trong biên bản.',
      citations: citationsFor(items.map((item) => `${item.task} ${item.owner || ''}`), transcript),
    };
  }

  if (isRiskQuestion) {
    const recordedRisks = recap.blockersAndRisks ?? [];
    const transcriptRisks = recordedRisks.length === 0
      ? rankTranscript('rủi ro vấn đề điểm nghẽn blocker risk issue concern', transcript)
      : [];
    const items = recordedRisks.length > 0
      ? recordedRisks
      : transcriptRisks.map((item) => item.translatedText || item.originalText);
    return {
      answer: items.length
        ? `Các rủi ro hoặc vấn đề nổi bật: ${items.map((item, index) => `${index + 1}) ${item}`).join(' ')}`
        : 'Biên bản chưa ghi nhận rủi ro hoặc điểm nghẽn nổi bật.',
      citations: transcriptRisks.length > 0
        ? transcriptRisks.map(toCitation)
        : citationsFor(items, transcript),
    };
  }

  if (isSummaryQuestion) {
    const items = recap.executiveHighlights.slice(0, 4);
    return {
      answer: items.length ? items.join(' ') : 'Chưa có đủ dữ liệu để tóm tắt cuộc họp.',
      citations: citationsFor(items, transcript),
    };
  }

  const matches = rankTranscript(question, transcript);
  if (matches.length === 0) {
    return {
      answer: 'Tôi chưa tìm thấy đoạn biên bản đủ liên quan. Hãy hỏi cụ thể hơn về quyết định, người phụ trách hoặc rủi ro.',
      citations: [],
    };
  }

  return {
    answer: `Các đoạn liên quan nhất cho thấy: ${matches.map((item) => item.translatedText || item.originalText).join(' ')}`,
    citations: matches.map(toCitation),
  };
}
