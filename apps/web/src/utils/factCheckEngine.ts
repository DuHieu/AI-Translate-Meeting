import type { SubtitleMessage } from '../types/subtitle';

export type FactCheckStatus = 'VERIFIED' | 'DISCREPANCY' | 'UNVERIFIED';

export type KnowledgeCategory =
  | 'sla'
  | 'policy'
  | 'pricing'
  | 'tech_spec'
  | 'security'
  | 'glossary';

export interface KnowledgeItem {
  id: string;
  category: KnowledgeCategory;
  subject: string;
  officialValue: string;
  summary: string;
  source: string;
  keywords: string[];
  evaluator: (text: string) => {
    isTriggered: boolean;
    status: FactCheckStatus;
    spokenClaim?: string;
    explanation: string;
  };
}

export interface FactCheckEvent {
  id: string;
  timestamp: string;
  participantId?: string;
  participantName: string;
  spokenText: string;
  subject: string;
  category: KnowledgeCategory;
  status: FactCheckStatus;
  spokenClaim: string;
  officialValue: string;
  explanation: string;
  source: string;
}

export interface KnowledgeQueryResult {
  answer: string;
  items: KnowledgeItem[];
  verifiedStatus: FactCheckStatus;
  source?: string;
}

/**
 * Normalizes text for insensitive regex and token matching.
 */
function normalizeForMatching(val: string): string {
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Built-in official Enterprise Knowledge Base.
 */
export const BUILT_IN_KNOWLEDGE_BASE: KnowledgeItem[] = [
  // 1. SLA Cam Kết (Service Level Agreement)
  {
    id: 'kb-sla',
    category: 'sla',
    subject: 'Cam Kết Mức Dịch Vụ (SLA)',
    officialValue: 'Enterprise: 99.99% (Gián đoạn < 5.2 phút/năm) | Pro: 99.9%',
    summary: 'Cam kết mức độ sẵn sàng hoạt động tối thiểu đạt 99.99% cho gói Doanh nghiệp và 99.9% cho gói Chuyên gia.',
    source: 'Điều khoản SLA Doanh Nghiệp LayaMeet (Mục 2.1)',
    keywords: ['sla', 'uptime', 'san sang', 'cam ket dich vu', 'kha dung', '稼働率', '可用性'],
    evaluator: (text: string) => {
      const norm = normalizeForMatching(text);
      const isSlaMention = /(sla|uptime|cam ket|kha dung|do san sang|稼働率|可用性)/i.test(norm);
      if (!isSlaMention) {
        return { isTriggered: false, status: 'UNVERIFIED', explanation: '' };
      }

      // Check percentage mentioned
      const percentMatch = /(\d+(?:\.\d+)?)\s*(?:%|phan tram|percent)/i.exec(norm);
      if (percentMatch) {
        const val = parseFloat(percentMatch[1]);
        if (val >= 99.9) {
          return {
            isTriggered: true,
            status: 'VERIFIED',
            spokenClaim: `${val}%`,
            explanation: `Khớp cam kết chuẩn: Doanh nghiệp cam kết SLA 99.99% (Enterprise) và 99.9% (Pro).`,
          };
        } else {
          return {
            isTriggered: true,
            status: 'DISCREPANCY',
            spokenClaim: `${val}%`,
            explanation: `Cảnh báo sai lệch: Người nói đề cập SLA ${val}%, trong khi tài liệu chính thức quy định SLA là 99.99% (Enterprise) hoặc 99.9% (Pro).`,
          };
        }
      }

      return {
        isTriggered: true,
        status: 'VERIFIED',
        spokenClaim: 'Đề cập SLA',
        explanation: 'SLA cam kết chính thức của LayaMeet là 99.99% cho Enterprise và 99.9% cho Pro.',
      };
    },
  },

  // 2. Chính Sách Hoàn Tiền (Refund Policy)
  {
    id: 'kb-refund',
    category: 'policy',
    subject: 'Chính Sách Hoàn Tiền (Refund Policy)',
    officialValue: '14 ngày kể từ ngày nâng cấp (kèm điều kiện dưới 5 giờ họp dịch)',
    summary: 'Khách hàng có quyền yêu cầu hoàn trả 100% tiền trong vòng 14 ngày nếu chưa sử dụng vượt quá hạn mức quy định.',
    source: 'Chính Sách Khiếu Nại & Hoàn Tiền LayaMeet (Điều 3)',
    keywords: ['hoan tien', 'tra lai tien', 'refund', 'money back', 'tra tien', '返金'],
    evaluator: (text: string) => {
      const norm = normalizeForMatching(text);
      const isRefundMention = /(hoan tien|tra lai tien|refund|money back|tra tien|返金)/i.test(norm);
      if (!isRefundMention) {
        return { isTriggered: false, status: 'UNVERIFIED', explanation: '' };
      }

      // Check days mentioned
      const daysMatch = /(\d+)\s*(?:ngay|day|days|日)/i.exec(norm);
      const noRefundMention = /(khong hoan tien|no refund|khong the hoan|khong duoc hoan)/i.test(norm);

      if (noRefundMention) {
        return {
          isTriggered: true,
          status: 'DISCREPANCY',
          spokenClaim: 'Không hoàn tiền',
          explanation: 'Cảnh báo sai lệch: LayaMeet có chính sách hoàn tiền 100% trong vòng 14 ngày đầu tiên.',
        };
      }

      if (daysMatch) {
        const days = parseInt(daysMatch[1], 10);
        if (days === 14) {
          return {
            isTriggered: true,
            status: 'VERIFIED',
            spokenClaim: `${days} ngày`,
            explanation: 'Chính xác theo chính sách: Thời hạn khiếu nại hoàn tiền là 14 ngày kể từ thời điểm thanh toán.',
          };
        } else {
          return {
            isTriggered: true,
            status: 'DISCREPANCY',
            spokenClaim: `${days} ngày`,
            explanation: `Cảnh báo sai lệch: Người nói đề cập hoàn tiền trong ${days} ngày, nhưng chính sách quy định là 14 ngày.`,
          };
        }
      }

      return {
        isTriggered: true,
        status: 'VERIFIED',
        spokenClaim: 'Đề cập hoàn tiền',
        explanation: 'Chính sách hoàn tiền chính thức là 14 ngày kể từ ngày đăng ký/thanh toán.',
      };
    },
  },

  // 3. Thời Lượng Cuộc Họp & Giới Hạn Gói Miễn Phí (Meeting Duration)
  {
    id: 'kb-duration',
    category: 'pricing',
    subject: 'Thời Lượng Cuộc Họp (Meeting Duration)',
    officialValue: 'Gói Free: 45 phút/cuộc họp | Gói Pro & Enterprise: Không giới hạn (tối đa 24h liên tục)',
    summary: 'Người dùng Free được tổ chức cuộc họp tối đa 45 phút. Người dùng Pro/Enterprise không bị giới hạn thời lượng.',
    source: 'Biểu Phí & Bảng Tính Năng Dịch Vụ LayaMeet',
    keywords: ['thoi luong', 'gioi han cuoc hop', 'hop bao lau', 'thoi gian hop', 'meeting limit', '45 phut', '60 phut', '制限時間'],
    evaluator: (text: string) => {
      const norm = normalizeForMatching(text);
      const isDurationMention = /(thoi luong|gioi han|hop bao lau|thoi gian hop|bao nhieu phut|bao nhieu tieng|45 phut|60 phut|制限時間)/i.test(norm);
      if (!isDurationMention) {
        return { isTriggered: false, status: 'UNVERIFIED', explanation: '' };
      }

      const freeMention = /(free|mien phi|goi thuong|free tier)/i.test(norm);
      const minutesMatch = /(\d+)\s*(?:phut|minute|minutes|分)/i.exec(norm);

      if (freeMention && minutesMatch) {
        const mins = parseInt(minutesMatch[1], 10);
        if (mins === 45) {
          return {
            isTriggered: true,
            status: 'VERIFIED',
            spokenClaim: `Free: ${mins} phút`,
            explanation: 'Chính xác: Gói Miễn phí giới hạn thời lượng là 45 phút mỗi cuộc họp.',
          };
        } else {
          return {
            isTriggered: true,
            status: 'DISCREPANCY',
            spokenClaim: `Free: ${mins} phút`,
            explanation: `Cảnh báo sai lệch: Người nói đề cập gói Free họp được ${mins} phút, trong khi hạn mức chuẩn là 45 phút.`,
          };
        }
      }

      if (/(pro|enterprise|tra phi)/i.test(norm) && /(khong gioi han|unlimited|24h|24 tieng)/i.test(norm)) {
        return {
          isTriggered: true,
          status: 'VERIFIED',
          spokenClaim: 'Không giới hạn thời gian',
          explanation: 'Khớp chuẩn: Gói Pro và Enterprise hỗ trợ thời lượng họp liên tục không giới hạn (tối đa 24h/phiên).',
        };
      }

      return {
        isTriggered: true,
        status: 'VERIFIED',
        spokenClaim: 'Đề cập thời lượng',
        explanation: 'Thời lượng quy định: Gói Free tối đa 45 phút/cuộc họp; Gói Pro/Enterprise không giới hạn.',
      };
    },
  },

  // 4. Chính Sách Bảo Mật RAM-Only (Zero-Disk Data Retention)
  {
    id: 'kb-ram-only',
    category: 'security',
    subject: 'Bảo Mật Dữ Liệu RAM-Only',
    officialValue: 'RAM-Only (Không lưu trữ âm thanh hay phụ đề trên đĩa cứng; Xóa sạch ngay sau phiên họp)',
    summary: 'Toàn bộ luồng âm thanh và phụ đề tạm thời chỉ lưu trữ trên bộ nhớ RAM và tự hủy ngay khi kết thúc phòng họp.',
    source: 'Chính Sách Bảo Mật Thông Tin & RAM-Only Appliance LayaMeet (Mục 4)',
    keywords: ['ram only', 'luu tru', 'xoa du lieu', 'bao mat', 'retention', 'disk', 'o dia', 'プライバシー', 'メモリ'],
    evaluator: (text: string) => {
      const norm = normalizeForMatching(text);
      const isSecurityMention = /(ram only|luu tru|xoa du lieu|bao mat du lieu|luu tren dia|ghi lai am thanh|ghi am|retention|プライバシー)/i.test(norm);
      if (!isSecurityMention) {
        return { isTriggered: false, status: 'UNVERIFIED', explanation: '' };
      }

      const persistentMention = /(tu dong luu|luu vinh vien|ghi vao o cung|server luu lai am thanh|save on disk)/i.test(norm);
      if (persistentMention) {
        return {
          isTriggered: true,
          status: 'DISCREPANCY',
          spokenClaim: 'Lưu vĩnh viễn / Ghi vào ổ cứng',
          explanation: 'Cảnh báo sai lệch: Hệ thống tuân thủ chính sách RAM-Only, âm thanh và phụ đề tạm thời không lưu vào đĩa cứng và tự hủy sau cuộc họp.',
        };
      }

      if (/(ram|xoa ngay|khong luu|ram only|huy sau hop|memory only)/i.test(norm)) {
        return {
          isTriggered: true,
          status: 'VERIFIED',
          spokenClaim: 'RAM-Only / Không lưu trữ',
          explanation: 'Khớp cam kết: LayaMeet hoạt động theo cơ chế RAM-Only an toàn tuyệt đối cho doanh nghiệp.',
        };
      }

      return {
        isTriggered: true,
        status: 'VERIFIED',
        spokenClaim: 'Đề cập bảo mật dữ liệu',
        explanation: 'Quy chuẩn bảo mật LayaMeet: Kiến trúc RAM-Only không lưu giữ âm thanh sau khi rời phòng.',
      };
    },
  },

  // 5. Độ Trễ Phụ Đề TTFS (Sub-200ms Translation Latency)
  {
    id: 'kb-ttfs',
    category: 'tech_spec',
    subject: 'Độ Trễ Phụ Đề & Dịch Thuật (TTFS Latency)',
    officialValue: 'TTFS < 200ms (P50 đạt 77.3ms) | Audio chunk 350ms',
    summary: 'Thời gian từ khi người nói phát âm đến khi phụ đề dịch hiển thị trên màn hình đạt trung vị P50 77.3ms.',
    source: 'Báo Cáo Benchmark AI Audio Pipeline LayaMeet 2.0',
    keywords: ['do tre', 'latency', 'ttfs', 'toc do dich', 'mili giay', 'ms', '遅延', 'レイテンシ'],
    evaluator: (text: string) => {
      const norm = normalizeForMatching(text);
      const isLatencyMention = /(do tre|latency|ttfs|toc do dich|mili giay|ms|cham|nhanh|遅延|レイテンシ)/i.test(norm);
      if (!isLatencyMention) {
        return { isTriggered: false, status: 'UNVERIFIED', explanation: '' };
      }

      const secondsMatch = /(\d+(?:\.\d+)?)\s*(?:giay|second|seconds|s|秒)/i.exec(norm);
      if (secondsMatch) {
        const sec = parseFloat(secondsMatch[1]);
        if (sec >= 1.0) {
          return {
            isTriggered: true,
            status: 'DISCREPANCY',
            spokenClaim: `Độ trễ ~${sec} giây`,
            explanation: `Cảnh báo sai lệch: Độ trễ phụ đề LayaMeet đo kiểm thực tế là dưới 200 mili-giây (P50 77.3ms), không phải ${sec} giây.`,
          };
        }
      }

      if (/(duoi 200ms|77ms|77.3ms|tuc thi|thoi gian thuc|realtime|< 200ms)/i.test(norm)) {
        return {
          isTriggered: true,
          status: 'VERIFIED',
          spokenClaim: 'Dưới 200ms / Tức thì',
          explanation: 'Khớp thông số: Độ trễ P50 đạt 77.3ms (SLA TTFS < 200ms).',
        };
      }

      return {
        isTriggered: true,
        status: 'VERIFIED',
        spokenClaim: 'Đề cập độ trễ dịch',
        explanation: 'Thông số chuẩn: Độ trễ dịch thuật tức thì TTFS dưới 200 mili-giây.',
      };
    },
  },

  // 6. Mã Hóa Đầu Cuối & Tiêu Chuẩn Bảo Mật E2EE (AES-256 GCM)
  {
    id: 'kb-e2ee',
    category: 'security',
    subject: 'Mã Hóa & Tiêu Chuẩn Bảo Mật (E2EE)',
    officialValue: 'Mã hóa đầu-cuối AES-256 GCM (Insertable Streams) & ISO 27001',
    summary: 'Mọi luồng âm thanh và hình ảnh đều được bảo vệ bởi khóa mã hóa cục bộ phía client WebRTC.',
    source: 'Tài Liệu Kỹ Thuật Bảo Mật LayaMeet (ISO 27001)',
    keywords: ['ma hoa', 'e2ee', 'end to end', 'aes 256', 'iso 27001', '暗号化'],
    evaluator: (text: string) => {
      const norm = normalizeForMatching(text);
      if (!/(ma hoa|e2ee|end to end|aes|iso 27001|bao mat duong truyen|暗号化)/i.test(norm)) {
        return { isTriggered: false, status: 'UNVERIFIED', explanation: '' };
      }

      return {
        isTriggered: true,
        status: 'VERIFIED',
        spokenClaim: 'Mã hóa E2EE',
        explanation: 'Khớp chuẩn: LayaMeet sử dụng chuẩn mã hóa WebRTC Insertable Streams AES-256 GCM.',
      };
    },
  },
];

/**
 * Loads enterprise glossary entries from localStorage or returns defaults.
 */
export function getEnterpriseGlossary(): Array<{ term: string; translation: string; domain: string }> {
  try {
    const raw = localStorage.getItem('layameet_enterprise_glossary');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  return [
    { term: 'Pull Request (PR)', translation: 'Yêu cầu tích hợp mã nguồn', domain: 'it' },
    { term: 'Zero-downtime Deployment', translation: 'Triển khai không gián đoạn dịch vụ', domain: 'it' },
    { term: 'EBITDA', translation: 'Lợi nhuận trước lãi vay, thuế và khấu hao', domain: 'finance' },
    { term: 'Due Diligence', translation: 'Thẩm định doanh nghiệp chuyên sâu', domain: 'finance' },
    { term: 'Throughput', translation: 'Lưu lượng xử lý đồng thời', domain: 'it' },
  ];
}

/**
 * Cache to prevent duplicate alerts for the same speaker & topic within 20 seconds.
 */
const recentFactCheckCache = new Map<string, number>();

/**
 * Evaluates a single subtitle message against the knowledge base and enterprise glossary.
 */
export function evaluateSubtitleFactCheck(
  subtitle: SubtitleMessage,
  customGlossary?: Record<string, string>,
): FactCheckEvent | null {
  if (!subtitle.isFinal) return null;

  const textToEvaluate = `${subtitle.translatedText || ''} ${subtitle.originalText || ''}`.trim();
  if (textToEvaluate.length < 5) return null;

  const now = Date.now();

  // 1. Evaluate against Knowledge Base items
  for (const item of BUILT_IN_KNOWLEDGE_BASE) {
    const evalResult = item.evaluator(textToEvaluate);
    if (evalResult.isTriggered) {
      const cacheKey = `${subtitle.participantId || subtitle.participantName}:${item.id}`;
      const lastTriggered = recentFactCheckCache.get(cacheKey) || 0;
      if (now - lastTriggered < 20000) {
        // Skip duplicate trigger within 20s
        continue;
      }
      recentFactCheckCache.set(cacheKey, now);

      return {
        id: `fc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: subtitle.timestamp || new Date().toISOString(),
        participantId: subtitle.participantId,
        participantName: subtitle.participantName || 'Người phát biểu',
        spokenText: textToEvaluate,
        subject: item.subject,
        category: item.category,
        status: evalResult.status,
        spokenClaim: evalResult.spokenClaim || 'Đề cập thông số',
        officialValue: item.officialValue,
        explanation: evalResult.explanation,
        source: item.source,
      };
    }
  }

  // 2. Evaluate against Enterprise Glossary (Term Verification)
  const enterpriseTerms = getEnterpriseGlossary();
  const allTerms = [
    ...enterpriseTerms,
    ...Object.entries(customGlossary || {}).map(([term, translation]) => ({
      term,
      translation,
      domain: 'custom',
    })),
  ];

  const normText = normalizeForMatching(textToEvaluate);
  for (const termObj of allTerms) {
    const normTerm = normalizeForMatching(termObj.term);
    if (normTerm.length >= 3 && normText.includes(normTerm)) {
      const cacheKey = `${subtitle.participantId || subtitle.participantName}:glossary:${normTerm}`;
      const lastTriggered = recentFactCheckCache.get(cacheKey) || 0;
      if (now - lastTriggered < 30000) {
        continue;
      }
      recentFactCheckCache.set(cacheKey, now);

      return {
        id: `fc-gloss-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: subtitle.timestamp || new Date().toISOString(),
        participantId: subtitle.participantId,
        participantName: subtitle.participantName || 'Người phát biểu',
        spokenText: textToEvaluate,
        subject: `Thuật Ngữ: ${termObj.term}`,
        category: 'glossary',
        status: 'VERIFIED',
        spokenClaim: termObj.term,
        officialValue: termObj.translation,
        explanation: `Khớp thuật ngữ chuẩn doanh nghiệp: "${termObj.term}" định nghĩa là "${termObj.translation}".`,
        source: `Từ Điển Thuật Ngữ Doanh Nghiệp (${termObj.domain.toUpperCase()})`,
      };
    }
  }

  return null;
}

/**
 * Query Knowledge Base directly (used for @Laya fact-check queries in Chat).
 */
export function queryKnowledgeBase(
  query: string,
  customGlossary?: Record<string, string>,
): KnowledgeQueryResult {
  const normQuery = normalizeForMatching(query);

  // Find matching Knowledge Base item
  const matchedItem = BUILT_IN_KNOWLEDGE_BASE.find((item) => {
    return item.keywords.some((k) => normQuery.includes(normalizeForMatching(k)));
  });

  if (matchedItem) {
    const evalResult = matchedItem.evaluator(query);
    const answer = `[Xác minh AI - ${matchedItem.subject}]\n• Tiêu chuẩn chính thức: ${matchedItem.officialValue}\n• Tóm tắt quy định: ${matchedItem.summary}\n• Nguồn tham chiếu: ${matchedItem.source}${
      evalResult.status === 'DISCREPANCY'
        ? `\n⚠️ CẢNH BÁO: Phát hiện sai lệch (${evalResult.explanation})`
        : ''
    }`;

    return {
      answer,
      items: [matchedItem],
      verifiedStatus: evalResult.status,
      source: matchedItem.source,
    };
  }

  // Check glossary
  const enterpriseTerms = getEnterpriseGlossary();
  const allTerms = [
    ...enterpriseTerms,
    ...Object.entries(customGlossary || {}).map(([term, translation]) => ({
      term,
      translation,
      domain: 'custom',
    })),
  ];

  const matchedTerm = allTerms.find((t) => normQuery.includes(normalizeForMatching(t.term)));
  if (matchedTerm) {
    return {
      answer: `[Tra cứu Thuật Ngữ Doanh Nghiệp]\n• Thuật ngữ: ${matchedTerm.term}\n• Định nghĩa/Bản dịch chuẩn: ${matchedTerm.translation}\n• Chuyên ngành: ${matchedTerm.domain.toUpperCase()}\n• Nguồn: Từ Điển Doanh Nghiệp LayaMeet`,
      items: [],
      verifiedStatus: 'VERIFIED',
      source: 'Từ Điển Doanh Nghiệp LayaMeet',
    };
  }

  // Generic fallback summary of Knowledge Base
  return {
    answer: `Laya Fact-Check hiện hỗ trợ đối soát các thông số chính thức:\n1) SLA Cam Kết (Enterprise 99.99%, Pro 99.9%)\n2) Chính Sách Hoàn Tiền (14 ngày)\n3) Thời Lượng Họp (Free 45 phút, Pro không giới hạn)\n4) Bảo Mật RAM-Only (Không lưu trữ đĩa cứng)\n5) Độ Trễ Phụ Đề TTFS (< 200ms)\n6) Thuật ngữ chuyên ngành IT/Finance.`,
    items: BUILT_IN_KNOWLEDGE_BASE,
    verifiedStatus: 'UNVERIFIED',
    source: 'Cơ Sở Tri Thức Doanh Nghiệp LayaMeet',
  };
}
