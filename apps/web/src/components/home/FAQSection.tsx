import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
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
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
            <span>Câu Hỏi Thường Gặp (FAQ)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
            Giải đáp thắc mắc về nền tảng <span className="text-blue-600 dark:text-blue-400">LayaMeet</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Mọi điều bạn cần biết về kiến trúc Any-to-Any đa ngôn ngữ, cam kết bảo mật On-Premise và hiệu năng thời gian thực.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
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
