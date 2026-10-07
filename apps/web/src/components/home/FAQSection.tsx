import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/language-context-def';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: Record<string, { badge: string; title: string; highlight: string; subtitle: string; items: FAQItem[] }> = {
  vi: {
    badge: 'Câu Hỏi Thường Gặp (FAQ)',
    title: 'Giải đáp thắc mắc về nền tảng',
    highlight: 'LayaMeet',
    subtitle: 'Mọi điều bạn cần biết về kiến trúc Any-to-Any đa ngôn ngữ, cam kết bảo mật On-Premise và hiệu năng thời gian thực.',
    items: [
      {
        question: 'LayaMeet hỗ trợ những ngôn ngữ nào trong phòng họp?',
        answer:
          'LayaMeet ứng dụng ma trận Any-to-Any đa chiều: không giới hạn ở một cặp ngôn ngữ song phương cố định. Trong cùng một phòng họp có thể có đồng thời người nói tiếng Việt, Nhật, Anh, Trung, Thái, Lào... Mỗi thành viên tự do chọn ngôn ngữ nghe/đọc phụ đề riêng biệt cho mình mà không ảnh hưởng đến những người khác.',
      },
      {
        question: 'Dữ liệu âm thanh và nội dung cuộc họp có được bảo mật không?',
        answer:
          'Tuyệt đối an toàn với cam kết Zero Raw Audio Storage (RAM-only). Toàn bộ luồng âm thanh được xử lý trên RAM để nhận dạng giọng nói và dịch thuật, sau đó giải phóng ngay lập tức mà không bao giờ lưu trữ file âm thanh xuống đĩa. Doanh nghiệp cũng có thể chọn triển khai mô hình On-Premise Air-gapped hoàn toàn trong hạ tầng mạng nội bộ.',
      },
      {
        question: 'Độ trễ nhận dạng giọng nói và hiển thị phụ đề dịch thuật là bao nhiêu?',
        answer:
          'Nhờ cơ chế audio chunking siêu ngắn 350ms kết hợp mô hình Whisper tối ưu int8 đa luồng và bộ nhớ đệm phân tán Redis, thời gian hiển thị phụ đề sơ bộ (TTFS) trung bình chỉ ~964ms và độ trễ phụ đề dịch thuật mục tiêu dưới 350ms, đảm bảo cuộc trò chuyện diễn ra tự nhiên như phiên dịch viên trực tiếp.',
      },
      {
        question: 'LayaMeet có tự động ghi biên bản họp và trích xuất việc cần làm không?',
        answer:
          'Có. Động cơ phân tích Laya Sidecar hoạt động độc lập bất đồng bộ ngoài luồng phụ đề chính, tự động phát hiện các quyết định quan trọng (Decisions) và phân loại công việc cần làm (Action Items) gán cho từng người. Bạn có thể xuất biên bản họp ra định dạng Markdown chỉ với 1 cú click.',
      },
      {
        question: 'Doanh nghiệp có thể dùng thử PoC (Proof of Concept) trước khi ký hợp đồng không?',
        answer:
          'Hoàn toàn có thể. Bên cạnh gói Community miễn phí trọn đời cho nhóm nhỏ, LayaMeet cung cấp chương trình dùng thử PoC 14 ngày không rủi ro cho khối doanh nghiệp và cam kết hoàn tiền 100% nếu không đáp ứng tiêu chuẩn SLA.',
      },
      {
        question: 'Làm sao để họp trực tuyến với đối tác Nhật Bản hoặc nước ngoài khi không biết ngoại ngữ?',
        answer:
          'Với LayaMeet, bạn chỉ cần phát biểu bằng tiếng Việt mẹ đẻ. AI sẽ nhận dạng giọng nói và tự động hiển thị phụ đề dịch thuật sang tiếng Nhật (hoặc tiếng Anh, Trung...) trên màn hình của đối tác chỉ sau <350ms. Khi đối tác nói tiếng Nhật, bạn sẽ đọc được phụ đề tiếng Việt tức thì mà không cần thuê phiên dịch viên đi kèm.',
      },
      {
        question: 'LayaMeet khác gì so với tính năng phiên dịch của Zoom hoặc Google Meet?',
        answer:
          'So với Zoom và Google Meet, LayaMeet vượt trội ở 4 điểm: (1) Nhận dạng tiếng Việt chính xác cao nhờ mô hình Faster-Whisper tối ưu; (2) Hỗ trợ ma trận Any-to-Any đa chiều cùng lúc cho nhiều người; (3) Tốc độ dịch cực nhanh <350ms so với 2-3s của Zoom; (4) Bảo mật RAM-only tuyệt đối không lưu file âm thanh cuộc họp.',
      },
      {
        question: 'LayaMeet có miễn phí không và có cần cài đặt phần mềm không?',
        answer:
          'LayaMeet hoàn toàn miễn phí cho gói Community, sử dụng trực tiếp 100% trên trình duyệt web (WebRTC) mà không cần cài đặt bất kỳ ứng dụng nào. Bạn chỉ cần truy cập layameet.com, bấm Tạo phòng họp và gửi link mời đối tác tham gia ngay lập tức.',
      },
    ],
  },
  en: {
    badge: 'Frequently Asked Questions (FAQ)',
    title: 'Everything you need to know about',
    highlight: 'LayaMeet',
    subtitle: 'Learn about our Any-to-Any polyglot matrix, enterprise zero-disk RAM-only architecture, and ultra-low latency real-time pipeline.',
    items: [
      {
        question: 'Which languages does LayaMeet support in meetings?',
        answer:
          'LayaMeet uses a multi-directional Any-to-Any matrix: you are not locked into a single language pair. Participants speaking Vietnamese, Japanese, English, Chinese, etc., can converse simultaneously. Each attendee independently selects their own listening and subtitle display language without affecting others.',
      },
      {
        question: 'How is audio and conversation data secured?',
        answer:
          'We guarantee Zero Raw Audio Storage (RAM-only). Audio streams are processed entirely in volatile memory for speech recognition and translation, and immediately discarded without ever touching the disk. Enterprises can also deploy on-premises in air-gapped internal networks.',
      },
      {
        question: 'What is the end-to-end subtitle and translation latency?',
        answer:
          'With 350ms audio chunking, multi-threaded int8 Whisper, and Redis streaming cache, interim captions appear in ~964ms (TTFS) and live translated subtitles arrive under 350ms, delivering natural flow without interpreter pauses.',
      },
      {
        question: 'Does LayaMeet automatically extract meeting minutes and Action Items?',
        answer:
          'Yes. Our asynchronous Laya Sidecar engine runs completely out of band from the critical subtitle path, identifying key Decisions and Action Items assigned to individuals, with 1-click Markdown and Word export.',
      },
      {
        question: 'Can enterprises request a Proof-of-Concept (PoC) before contract?',
        answer:
          'Absolutely. In addition to our Free Community plan, LayaMeet provides a 14-day zero-risk enterprise PoC trial with complete on-site or private VPS assistance and SLA guarantee.',
      },
      {
        question: 'How does it enable cross-border meetings when attendees do not share a language?',
        answer:
          'Speak freely in your native language. Laya AI transcribes and renders translated subtitles on the foreign attendee’s screen within 350ms, and translates their replies back into your chosen language in real time.',
      },
      {
        question: 'How does LayaMeet compare to Zoom or Google Meet live translation?',
        answer:
          'LayaMeet provides 4 core advantages: (1) Superior accuracy for Vietnamese and Japanese; (2) True simultaneous multi-directional Any-to-Any matrix; (3) Real-time <350ms latency vs 2-3s on standard video tools; (4) 100% RAM-only zero-disk security.',
      },
      {
        question: 'Is LayaMeet free to use and does it require software installation?',
        answer:
          'The Community tier is 100% free and runs entirely in your modern web browser via WebRTC with no app downloads required. Simply visit layameet.com, create a room, and share the link.',
      },
    ],
  },
  ja: {
    badge: 'よくあるご質問 (FAQ)',
    title: '次世代多言語プラットフォーム',
    highlight: 'LayaMeetについて',
    subtitle: 'Any-to-Any多方向言語マトリクス、完全オンプレミスRAM-only機密保護、超低遅延リアルタイム技術について解説します。',
    items: [
      {
        question: '会議室で利用可能な言語は何ですか？',
        answer:
          'LayaMeetは多方向Any-to-Anyマトリクスを採用しており、特定の言語ペアに固定されません。日本語、ベトナム語、英語、中国語などの話者が同時に参加可能で、各参加者は他のメンバーに影響を与えることなく自分の希望する字幕言語を自由に選択できます。',
      },
      {
        question: '音声データや会議内容のセキュリティはどうなっていますか？',
        answer:
          '完全RAMメモリ処理（Zero Raw Audio Storage）を徹底しています。音声ストリームはRAM上でのみ認識・翻訳処理され、ハードディスクに音声ファイルとして保存されることなく即時解放されます。完全閉域網オンプレミス導入にも対応。',
      },
      {
        question: '音声認識および字幕翻訳のレイテンシはどれくらいですか？',
        answer:
          '350ms超短時間オーディオチャンクとint8最適化Whisper、Redis分散キャッシュの連携により、予備字幕（TTFS）は約964ms、翻訳字幕は350ms未満で即座に配信されます。',
      },
      {
        question: '議事録やAction Itemsは自動抽出されますか？',
        answer:
          'はい。Laya Sidecarが字幕配信のクリティカルパスに影響を与えることなく非同期で動作し、重要決定事項（Decisions）や担当者別タスク（Action Items）を自動抽出し、Markdown形式でワンクリック出力可能です。',
      },
      {
        question: '契約前に企業向けPoC（概念実証）を実施できますか？',
        answer:
          'もちろん可能です。小規模向けの永久無料コミュニティ版に加え、エンタープライズ企業向けに14日間の無料PoCトライアルを提供しており、オンプレミス環境の導入支援も行っています。',
      },
      {
        question: '外国語が話せなくても海外パートナーとスムーズに会議できますか？',
        answer:
          'はい、母国語でそのまま話すだけで結構です。Laya AIが音声を認識し、相手の画面に350ms未満で正確な翻訳字幕を表示します。相手の発言もあなたの画面に日本語で即座に翻訳されます。',
      },
      {
        question: 'ZoomやGoogle Meetの字幕翻訳機能との違いは何ですか？',
        answer:
          '主な優位点は4点です: (1) ベトナム語・日本語に特化した高精度認識; (2) 多国籍メンバーが同時に各々の言語を選べるAny-to-Any設計; (3) 350ms未満の超高速翻訳; (4) 音声ファイルを一切保存しないRAM-onlyセキュリティ。',
      },
      {
        question: '利用は無料ですか？アプリのインストールは必要ですか？',
        answer:
          'コミュニティ版は完全無料で、WebRTCによりブラウザのみで動作するためインストールは不要です。layameet.comにアクセスしてルームを作成し、リンクを共有するだけで利用開始できます。',
      },
    ],
  },
};

export const FAQSection: React.FC = () => {
  const { language } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const content = FAQ_DATA[language] || FAQ_DATA.vi;

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="border-t border-[#2e2e30] dark:border-[#2e2e30] border-zinc-200 bg-[#0f0f10] dark:bg-[#0f0f10] bg-white transition-colors py-12 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{content.badge}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
            {content.title} <span className="text-blue-600 dark:text-blue-400">{content.highlight}</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            {content.subtitle}
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {content.items.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border transition-colors ${
                  isOpen
                    ? 'border-blue-500/40 bg-zinc-50 dark:bg-[#151518]'
                    : 'border-[#2e2e30] dark:border-[#2e2e30] border-zinc-200 bg-white dark:bg-[#1a1a1b] hover:border-[#3a3a3d] dark:hover:border-[#3a3a3d] hover:border-zinc-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  id={`faq-question-${idx}`}
                  className="w-full flex items-center justify-between text-left p-4 sm:p-5 gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
                >
                  <span className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {isOpen && <Sparkles className="w-4 h-4 text-blue-500 shrink-0 hidden sm:inline" />}
                    {faq.question}
                  </span>
                  <div
                    className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 ${
                      isOpen
                        ? 'rotate-180 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                        : 'bg-zinc-100 dark:bg-[#222224] text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 stroke-[2.2]" />
                  </div>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${idx}`}
                    role="region"
                    aria-labelledby={`faq-question-${idx}`}
                    className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200/50 dark:border-zinc-800/60 mt-1 pt-3"
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
