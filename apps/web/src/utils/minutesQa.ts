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
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  const norm = normalize(value);
  const spaceTokens = norm.split(' ').filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  // For CJK characters (Japanese, Chinese), generate bigrams for substring ranking
  const cjkChars = norm.replace(/[\s\x20-\x7E]/g, '');
  if (cjkChars.length >= 2) {
    for (let i = 0; i < cjkChars.length - 1; i++) {
      spaceTokens.push(cjkChars.slice(i, i + 2));
    }
  } else if (cjkChars.length === 1) {
    spaceTokens.push(cjkChars);
  }

  return spaceTokens;
}

function transcriptText(item: MeetingTranscriptEntry): string {
  return `${item.participantName} ${item.translatedText} ${item.originalText}`;
}

function rankTranscript(
  query: string,
  transcript: MeetingTranscriptEntry[],
): MeetingTranscriptEntry[] {
  const queryTokens = tokens(query);
  if (queryTokens.length === 0) return [];

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
  const isDecisionQuestion = /(quyet dinh|thong nhat|chot|decision|agreed|decide|ket luan|ke hoach chot|決定|合意)/i.test(normalizedQuestion);
  const isActionQuestion = /(ai phu trach|cong viec|viec can lam|action|owner|deadline|assign|who is responsible|task|nhiem vu|phan cong|担当|タスク|締切)/i.test(normalizedQuestion);
  const isRiskQuestion = /(rui ro|van de|diem nghen|blocker|risk|issue|concern|impediment|kho khan|thach thuc|リスク|問題|懸念)/i.test(normalizedQuestion);
  const isSummaryQuestion = /(tom tat|diem chinh|noi dung chinh|summary|highlight|recap|overview|dien bien|cuoc hop ve gi|要約|まとめ|概要)/i.test(normalizedQuestion);

  // Speaker queries: Suffix pattern ("Nam nói gì", "Alice đã nói gì", "Tanakaさんの発言")
  // or Prefix pattern ("What did Alice say?", "ý kiến của Nam", "nghe Nam nói")
  const suffixMatch = /([\p{L}\p{N}_]+)\s*(?:nói gì|đã nói gì|phát biểu gì|da noi|noi gi|さんの発言|の発言)/iu.exec(question);
  const prefixMatch = /(?:what did|ý kiến của|y kien cua|nghe)\s+([\p{L}\p{N}_]+)(?:\s+say|\s+nói)?/iu.exec(question);
  const speakerCandidate = suffixMatch?.[1] || prefixMatch?.[1];

  if (speakerCandidate) {
    const rawTargetSpeaker = normalize(speakerCandidate);
    if (rawTargetSpeaker.length >= 2 && !STOP_WORDS.has(rawTargetSpeaker)) {
      const speakerEntries = transcript.filter((t) => {
        const normalizedSpeaker = normalize(t.participantName);
        return normalizedSpeaker.includes(rawTargetSpeaker) || rawTargetSpeaker.includes(normalizedSpeaker);
      });

      if (speakerEntries.length > 0) {
        const recent = speakerEntries.slice(-4);
        const points = recent.map((item) => item.translatedText || item.originalText).join(' ');
        return {
          answer: `${speakerEntries[0].participantName} đã phát biểu ${speakerEntries.length} lần: "${points}"`,
          citations: recent.map(toCitation),
        };
      }
    }
  }

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
