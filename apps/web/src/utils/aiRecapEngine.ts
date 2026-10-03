import { SubtitleMessage } from '../types/subtitle';

export interface TopicCluster {
  id: string;
  title: string;
  category: string;
  utteranceCount: number;
  speakers: string[];
  samplePoints: string[];
}

export interface SpeakerParticipation {
  name: string;
  utteranceCount: number;
  wordCount: number;
  percentage: number;
  accentColor: string;
}

export interface GeneratedRecap {
  executiveHighlights: string[];
  topics: TopicCluster[];
  speakerStats: SpeakerParticipation[];
  generatedAt: string;
}

const ACCENT_COLORS = [
  '#38bdf8', // sky-400
  '#34d399', // emerald-400
  '#f59e0b', // amber-500
  '#a78bfa', // purple-400
  '#fb7185', // rose-400
  '#22d3ee', // cyan-400
  '#818cf8', // indigo-400
  '#f43f5e', // rose-500
];

export function generateMeetingRecap(
  history: SubtitleMessage[],
  taggedItems: SubtitleMessage[]
): GeneratedRecap {
  if (history.length === 0) {
    return {
      executiveHighlights: ['Chưa có đủ dữ liệu lời thoại để tạo tóm tắt cuộc họp.'],
      topics: [],
      speakerStats: [],
      generatedAt: new Date().toLocaleTimeString(),
    };
  }

  // 1. Speaker participation stats
  const speakerMap = new Map<string, { count: number; words: number }>();
  let totalWords = 0;

  history.forEach((item) => {
    const speaker = item.participantName || 'Khách';
    const text = item.originalText || item.translatedText || '';
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    totalWords += wordCount;

    const current = speakerMap.get(speaker) || { count: 0, words: 0 };
    speakerMap.set(speaker, {
      count: current.count + 1,
      words: current.words + wordCount,
    });
  });

  const speakerStats: SpeakerParticipation[] = Array.from(speakerMap.entries()).map(
    ([name, data], idx) => {
      const percentage = totalWords > 0 ? Math.round((data.words / totalWords) * 100) : 0;
      return {
        name,
        utteranceCount: data.count,
        wordCount: data.words,
        percentage,
        accentColor: ACCENT_COLORS[idx % ACCENT_COLORS.length],
      };
    }
  );

  // 2. Executive Highlights
  const highlights: string[] = [];

  const decisions = taggedItems.filter((i) => i.tags?.includes('decision'));
  const actions = taggedItems.filter((i) => i.tags?.includes('action_item'));

  highlights.push(
    `Cuộc họp diễn ra với sự tham gia của ${speakerStats.length} thành viên (${speakerStats.map((s) => s.name).join(', ')}), tổng cộng ${history.length} lượt phát biểu.`
  );

  if (decisions.length > 0) {
    const keyDecisions = decisions
      .slice(0, 3)
      .map((d) => `"${d.originalText}"`)
      .join('; ');
    highlights.push(`Đã thống nhất các quyết định quan trọng: ${keyDecisions}.`);
  } else {
    highlights.push('Chưa có quyết định mang tính ràng buộc nào được chốt chính thức trong phiên họp.');
  }

  if (actions.length > 0) {
    highlights.push(
      `Đã ghi nhận ${actions.length} nhiệm vụ và cam kết hành động cần theo dõi tiếp theo.`
    );
  }

  // Key discussion sentences (first informative sentence, or last closing sentence)
  const informativeSentences = history.filter(
    (h) => (h.originalText || '').length > 20 && !h.tags?.includes('action_item')
  );
  if (informativeSentences.length > 0) {
    const sample = informativeSentences[0];
    highlights.push(
      `Trọng tâm thảo luận mở đầu xoay quanh: "${sample.originalText}" (phát biểu bởi ${sample.participantName}).`
    );
  }

  // 3. Categorized Discussion Topics
  const topicDefinitions = [
    {
      title: 'Kiến Trúc Kỹ Thuật & Triển Khai',
      category: 'Engineering & DevOps',
      keywords: ['server', 'docker', 'deploy', 'database', 'api', 'livekit', 'webrtc', 'token', 'redis', 'microservice', 'whisper', 'bug', 'kỹ thuật', 'kiến trúc'],
    },
    {
      title: 'Giao Diện Người Dùng & Trải Nghiệm',
      category: 'UI/UX & Frontend',
      keywords: ['ui', 'giao diện', 'phụ đề', 'subtitle', 'chat', 'icon', 'component', 'màu', 'hiển thị', 'người dùng', 'nút', 'font', 'web'],
    },
    {
      title: 'Tiến Độ Sprint & Phân Công Việc',
      category: 'Project Management',
      keywords: ['sprint', 'task', 'deadline', 'tiến độ', 'kế hoạch', 'báo cáo', 'review', 'nhiệm vụ', 'hoàn thành', 'action', 'việc'],
    },
    {
      title: 'Hợp Tác & Nghiệp Vụ Doanh Nghiệp',
      category: 'Business & Collaboration',
      keywords: ['hợp đồng', 'đối tác', 'khách hàng', 'chi phí', 'thời gian', 'trao đổi', 'thống nhất', 'giải pháp', 'kinh doanh'],
    },
  ];

  const topics: TopicCluster[] = [];

  topicDefinitions.forEach((def, idx) => {
    const matchedItems = history.filter((item) => {
      const full = `${item.originalText} ${item.translatedText}`.toLowerCase();
      return def.keywords.some((kw) => full.includes(kw));
    });

    if (matchedItems.length > 0) {
      const matchedSpeakers = Array.from(
        new Set(matchedItems.map((m) => m.participantName || 'Khách'))
      );
      const samplePoints = matchedItems
        .slice(0, 3)
        .map((m) => `${m.participantName}: "${m.originalText}"`);

      topics.push({
        id: `topic-${idx}`,
        title: def.title,
        category: def.category,
        utteranceCount: matchedItems.length,
        speakers: matchedSpeakers,
        samplePoints,
      });
    }
  });

  // If no topics matched specific keywords, create general topic
  if (topics.length === 0) {
    topics.push({
      id: 'topic-general',
      title: 'Thảo Luận Chung Về Dự Án',
      category: 'General Discussion',
      utteranceCount: history.length,
      speakers: speakerStats.map((s) => s.name),
      samplePoints: history.slice(0, 3).map((m) => `${m.participantName}: "${m.originalText}"`),
    });
  }

  return {
    executiveHighlights: highlights,
    topics,
    speakerStats,
    generatedAt: new Date().toLocaleTimeString(),
  };
}
