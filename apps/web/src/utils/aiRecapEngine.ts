import { SubtitleMessage } from '../types/subtitle';
import { getActiveSkill, MeetingRecapSkill } from './recapSkillManager';

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

export interface ActionItemDetail {
  task: string;
  owner?: string;
  deadline?: string;
  priority?: 'High' | 'Medium' | 'Low';
}

export interface GeneratedRecap {
  executiveHighlights: string[];
  topics: TopicCluster[];
  speakerStats: SpeakerParticipation[];
  generatedAt: string;
  decisions: string[];
  actionItems: ActionItemDetail[];
  blockersAndRisks: string[];
  activeSkillName?: string;
  customSectionResults?: Array<{ title: string; items: string[] }>;
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

function extractOwnerFromText(text: string, speakerName?: string): string | undefined {
  if (/(tôi|mình|em)\s+(sẽ|nhận|phụ trách)/i.test(text) && speakerName) {
    return speakerName;
  }
  const match = text.match(/(giao cho|nhờ|assign cho|giao)\s+([A-ZÀ-Ỹa-zà-ỹ0-9_\s-]{2,15})/i);
  if (match) return match[2].trim();
  return speakerName || undefined;
}

function extractDeadlineFromText(text: string): string | undefined {
  const match = text.match(
    /(trước\s+(thứ\s+[2-7]|chủ nhật|ngày mai|hôm nay|cuối tuần|hết ngày)|deadline\s+([A-Za-z0-9_.-]+)|by\s+(friday|monday|eod|tomorrow)|明日まで|今日中|今週中)/i
  );
  if (match) return match[0].trim();
  return undefined;
}

function extractPriority(text: string): 'High' | 'Medium' | 'Low' {
  if (/(gấp|khẩn|ngay|urgent|asap|ngay lập tức|ưu tiên cao|cao nhất|khẩn cấp)/i.test(text)) {
    return 'High';
  }
  if (/(khi nào rảnh|khi tiện|tùy chọn|optional|low priority)/i.test(text)) {
    return 'Low';
  }
  return 'Medium';
}

export function generateMeetingRecap(
  history: SubtitleMessage[],
  taggedItems: SubtitleMessage[],
  skillId?: string
): GeneratedRecap {
  const activeSkill: MeetingRecapSkill = getActiveSkill(skillId);

  if (history.length === 0) {
    return {
      executiveHighlights: ['Chưa có đủ dữ liệu lời thoại để tạo tóm tắt cuộc họp.'],
      topics: [],
      speakerStats: [],
      decisions: [],
      actionItems: [],
      blockersAndRisks: [],
      activeSkillName: activeSkill.name,
      generatedAt: new Date().toLocaleTimeString(),
    };
  }

  // 1. Speaker participation statistics
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

  // 2. Extract Decisions (Tagged + Heuristic)
  const decisionSentences = new Set<string>();
  taggedItems
    .filter((i) => i.tags?.includes('decision'))
    .forEach((d) => {
      const txt = (d.translatedText || d.originalText || '').trim();
      if (txt) decisionSentences.add(txt);
    });

  history.forEach((h) => {
    const txt = h.originalText || '';
    if (/(thống nhất|chốt phương án|đồng ý|quyết định|phê duyệt|agreed|approved|決定|合意)/i.test(txt)) {
      if (txt.length >= 15) decisionSentences.add(h.translatedText || txt);
    }
  });

  const decisions = Array.from(decisionSentences).slice(0, 5);

  // 3. Extract Action Items (Tagged + Heuristic)
  const rawActions = taggedItems.filter((i) => i.tags?.includes('action_item'));
  const actionItems: ActionItemDetail[] = [];

  rawActions.forEach((action) => {
    const text = action.translatedText || action.originalText || '';
    const task = text.trim();
    if (!task) return;
    const owner = extractOwnerFromText(action.originalText || text, action.participantName);
    const deadline = extractDeadlineFromText(action.originalText || text);
    const priority = extractPriority(action.originalText || text);
    actionItems.push({ task, owner, deadline, priority });
  });

  // If no tagged actions, search history for commitments
  if (actionItems.length === 0) {
    history.forEach((item) => {
      const txt = item.originalText || '';
      if (/(sẽ làm|cần làm|phải hoàn thành|gửi báo cáo|tiến hành|triển khai xong|task|action item)/i.test(txt)) {
        if (txt.length >= 15 && actionItems.length < 5) {
          actionItems.push({
            task: item.translatedText || txt,
            owner: extractOwnerFromText(txt, item.participantName),
            deadline: extractDeadlineFromText(txt),
            priority: extractPriority(txt),
          });
        }
      }
    });
  }

  // 4. Extract Blockers, Risks & Open Questions (Laya tags + Heuristics)
  const blockersAndRisks: string[] = [];
  taggedItems.forEach((item) => {
    if (item.tags?.includes('critical_risk')) {
      const cleaned = (item.translatedText || item.originalText || '').trim();
      const label = `⚠️ [Rủi ro] ${cleaned}`;
      if (cleaned && !blockersAndRisks.includes(label)) {
        blockersAndRisks.push(label);
      }
    }
    if (item.tags?.includes('question')) {
      const cleaned = (item.translatedText || item.originalText || '').trim();
      const label = `❓ [Câu hỏi mở] ${cleaned}`;
      if (cleaned && !blockersAndRisks.includes(label)) {
        blockersAndRisks.push(label);
      }
    }
  });

  history.forEach((item) => {
    const txt = item.originalText || '';
    if (/(chưa rõ|rủi ro|nguy cơ|điểm nghẽn|vấn đề|kẹt|chậm trễ|chưa giải quyết|bị lỗi|delay|blocker|risk|issue|concern|課題|懸念|リスク)/i.test(txt)) {
      const cleaned = (item.translatedText || txt).trim();
      if (cleaned.length >= 15 && !blockersAndRisks.includes(cleaned) && blockersAndRisks.length < 5) {
        blockersAndRisks.push(`${item.participantName ? `[${item.participantName}] ` : ''}${cleaned}`);
      }
    }
  });

  // 5. Categorized Discussion Topics (Enhanced with Custom Keywords)
  const baseTopicDefinitions = [
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

  // Inject custom skill keywords into matching categories or as an extra category
  if (activeSkill.customKeywords && activeSkill.customKeywords.length > 0) {
    baseTopicDefinitions.unshift({
      title: `Trọng Tâm Nghiệp Vụ (${activeSkill.targetDepartment || activeSkill.name})`,
      category: activeSkill.targetDepartment || 'Chuyên Môn Doanh Nghiệp',
      keywords: activeSkill.customKeywords.map((k) => k.toLowerCase()),
    });
  }

  const topics: TopicCluster[] = [];

  baseTopicDefinitions.forEach((def, idx) => {
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
        .map((m) => `${m.participantName}: "${m.translatedText || m.originalText}"`);

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

  if (topics.length === 0) {
    topics.push({
      id: 'topic-general',
      title: 'Thảo Luận Chung Về Dự Án',
      category: 'General Discussion',
      utteranceCount: history.length,
      speakers: speakerStats.map((s) => s.name),
      samplePoints: history.slice(0, 3).map((m) => `${m.participantName}: "${m.translatedText || m.originalText}"`),
    });
  }

  // 6. Executive Highlights (Standard MoM Executive Snapshot)
  const highlights: string[] = [];
  highlights.push(
    `Phiên họp quy tụ ${speakerStats.length} thành viên (${speakerStats.map((s) => s.name).join(', ')}), ghi nhận tổng cộng ${history.length} lượt phát biểu song ngữ.`
  );

  if (decisions.length > 0) {
    const topDecisions = decisions.slice(0, 2).map((d) => `"${d}"`).join('; ');
    highlights.push(`Đã chốt ${decisions.length} quyết định quan trọng: ${topDecisions}.`);
  } else {
    highlights.push('Chưa có quyết định ràng buộc nào được chốt chính thức trong phiên họp.');
  }

  if (actionItems.length > 0) {
    highlights.push(
      `Đã phân công ${actionItems.length} nhiệm vụ và cam kết hành động cụ thể cần theo dõi tiếp theo.`
    );
  }

  if (blockersAndRisks.length > 0) {
    highlights.push(
      `Lưu ý: Có ${blockersAndRisks.length} điểm nghẽn, rủi ro hoặc câu hỏi tồn đọng cần làm rõ ở các buổi tiếp theo.`
    );
  }

  // Key opening sentence
  const informativeSentences = history.filter(
    (h) => (h.originalText || '').length > 20 && !h.tags?.includes('action_item')
  );
  if (informativeSentences.length > 0) {
    const sample = informativeSentences[0];
    highlights.push(
      `Trọng tâm thảo luận chính: "${sample.translatedText || sample.originalText}" (phát biểu bởi ${sample.participantName}).`
    );
  }

  return {
    executiveHighlights: highlights,
    topics,
    speakerStats,
    decisions,
    actionItems,
    blockersAndRisks,
    activeSkillName: activeSkill.name,
    generatedAt: new Date().toLocaleTimeString(),
  };
}
