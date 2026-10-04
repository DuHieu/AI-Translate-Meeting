import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Globe,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Check,
  X,
  Plus
} from 'lucide-react';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Footer } from '../components/common/Footer';
import { LegalModal } from '../components/common/LegalModal';
import { meetingApi } from '../api/meetingApi';
import { admissionStorage } from '../utils/admissionStorage';

interface LandingConfig {
  variant: 'japanese' | 'english';
  pageTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  badgeText: string;
  flagPair: string;
  h1: string;
  subheading: string;
  targetAudience: string;
  painPoints: { title: string; desc: string }[];
  solutionFeatures: { title: string; desc: string }[];
  faqs: { q: string; a: string }[];
}

const CONFIGS: Record<'japanese' | 'english', LandingConfig> = {
  japanese: {
    variant: 'japanese',
    pageTitle: 'Họp Song Ngữ Tiếng Nhật AI - Dịch Trực Tiếp Việt - Nhật <350ms | LayaMeet',
    metaDescription: 'Phần mềm họp trực tuyến song ngữ Việt - Nhật thời gian thực. Tự do nói tiếng mẹ đẻ, phụ đề AI dịch hai chiều <350ms, tự động ghi biên bản họp cho kỹ sư BrSE và IT Comtor.',
    canonicalUrl: 'https://layameet.com/hop-song-ngu-tieng-nhat',
    badgeText: 'Chuyên Biệt Doanh Nghiệp Hợp Tác Việt - Nhật',
    flagPair: '🇻🇳 Tiếng Việt ⇄ 🇯🇵 日本語',
    h1: 'Nền Tảng Họp Song Ngữ Tiếng Nhật AI — Dịch Trực Tiếp Real-Time <350ms',
    subheading: 'Xóa bỏ rào cản ngôn ngữ giữa đội ngũ kỹ sư Việt Nam và đối tác Nhật Bản. Kỹ sư tự do nói tiếng Việt, khách hàng Nhật nghe và đọc phụ đề tiếng Nhật tức thì với công nghệ Faster-Whisper int8.',
    targetAudience: 'Dành riêng cho Kỹ sư cầu nối (BrSE), IT Comtor, các công ty gia công phần mềm (Offshore/Outsourcing) và doanh nghiệp thương mại Việt - Nhật.',
    painPoints: [
      {
        title: 'Áp lực phiên dịch viên (IT Comtor)',
        desc: 'Comtor phải vừa dịch đuổi kỹ thuật vừa ghi chú biên bản họp, dễ sót ý kiến quan trọng về nghiệp vụ.',
      },
      {
        title: 'Khách hàng Nhật nói nhanh & dùng Kính ngữ',
        desc: 'Sự khác biệt văn hóa giao tiếp và kính ngữ (Keigo) khiến đội ngũ kỹ sư khó bắt kịp toàn bộ yêu cầu trong thời gian thực.',
      },
      {
        title: 'Tốn 2-3 tiếng viết và dịch biên bản họp',
        desc: 'Sau mỗi buổi họp Daily hoặc Sprint Review, nhóm phát triển mất nhiều thời gian dịch lại Action Items sang tiếng Nhật.',
      },
    ],
    solutionFeatures: [
      {
        title: 'Dịch hai chiều độ trễ siêu thấp <350ms',
        desc: 'Chunking âm thanh 350ms kết hợp mô hình Whisper tối ưu nhận dạng cả thuật ngữ IT lẫn kính ngữ tiếng Nhật chuẩn xác.',
      },
      {
        title: 'Xuất biên bản họp Nhật - Việt trong 1 click',
        desc: 'Laya Sidecar tự động phân loại Quyết định (Decisions) và Việc cần làm (Action Items) theo định dạng Markdown song ngữ.',
      },
      {
        title: 'Bảo mật 100% RAM-only (Không lưu file audio)',
        desc: 'Tuân thủ tiêu chuẩn bảo mật khắt khe của các đối tác Nhật Bản. Toàn bộ âm thanh giải phóng khỏi RAM ngay sau khi phiên dịch.',
      },
    ],
    faqs: [
      {
        q: 'LayaMeet dịch tiếng Nhật có bị trễ như Google Meet hay Zoom không?',
        a: 'Không. Nhờ kiến trúc WebRTC trực tiếp và mô hình Whisper chạy trên RAM tối ưu int8, thời gian hiển thị phụ đề tạm thời (interim) chỉ ~964ms và độ trễ mục tiêu dưới 350ms, nhanh hơn gấp 3 lần so với Zoom AI Cloud.',
      },
      {
        q: 'Đối tác Nhật có cần cài đặt phần mềm gì không?',
        a: 'Hoàn toàn không. Đối tác Nhật chỉ cần nhấp vào link phòng họp trên trình duyệt (Chrome, Safari, Edge) là có thể tham gia và chọn hiển thị phụ đề tiếng Nhật ngay lập tức.',
      },
      {
        q: 'Dữ liệu cuộc họp có bị gửi về server bên thứ ba không?',
        a: 'Tuyệt đối không. LayaMeet cam kết Zero Raw Audio Storage (RAM-only), toàn bộ luồng xử lý nhận dạng và dịch thuật đều khép kín trên hạ tầng riêng của hệ thống.',
      },
    ],
  },
  english: {
    variant: 'english',
    pageTitle: 'Họp Trực Tuyến Song Ngữ Tiếng Anh AI - Dịch Trực Tiếp Việt - Anh <350ms | LayaMeet',
    metaDescription: 'Nền tảng họp trực tuyến song ngữ tiếng Anh thời gian thực. Tự do nói tiếng Việt, đối tác nhận phụ đề tiếng Anh <350ms, bảo mật On-Premise RAM-only.',
    canonicalUrl: 'https://layameet.com/hop-song-ngu-tieng-anh',
    badgeText: 'Hội Nghị Quốc Tế & Thương Mại Đa Quốc Gia',
    flagPair: '🇻🇳 Tiếng Việt ⇄ 🇺🇸 English',
    h1: 'Họp Trực Tuyến Song Ngữ Tiếng Anh AI — Dịch Trực Tiếp Việt - Anh Không Độ Trễ',
    subheading: 'Tự tin đàm phán và thảo luận với đối tác quốc tế. Bạn tự do nói tiếng mẹ đẻ, hệ thống tự động nhận dạng giọng nói và hiển thị phụ đề tiếng Anh thời gian thực với độ trễ cực thấp.',
    targetAudience: 'Dành cho các doanh nghiệp FDI, công ty xuất nhập khẩu, logistics và các startup công nghệ làm việc với khách hàng toàn cầu.',
    painPoints: [
      {
        title: 'Tâm lý e ngại nói tiếng Anh kỹ thuật',
        desc: 'Nhiều nhân sự có năng lực chuyên môn xuất sắc nhưng gặp rào cản khi phải trình bày ý tưởng bằng tiếng Anh với chuyên gia nước ngoài.',
      },
      {
        title: 'Bất đồng ngôn ngữ trong các cuộc họp khẩn',
        desc: 'Không phải cuộc họp nào cũng có sẵn phiên dịch viên, dẫn đến hiểu lầm yêu cầu kỹ thuật và kéo dài thời gian xử lý sự cố.',
      },
      {
        title: 'Mất tập trung vì vừa họp vừa phải tra từ điển',
        desc: 'Việc ngắt quãng để suy nghĩ từ vựng khiến cuộc trao đổi mất đi tính tự nhiên và nhịp độ làm việc của đội ngũ.',
      },
    ],
    solutionFeatures: [
      {
        title: 'Phụ đề song ngữ hiển thị thời gian thực',
        desc: 'Mỗi người tham gia tự do cấu hình ngôn ngữ nói và ngôn ngữ nghe độc lập. Người nói tiếng Việt, đối tác đọc tiếng Anh trôi chảy.',
      },
      {
        title: 'Tự động trích xuất biên bản họp & Action Items',
        desc: 'AI thông minh tự động tổng hợp các kết luận và danh sách công việc cần làm, xuất ra file Markdown sẵn sàng gửi qua Email/Slack.',
      },
      {
        title: 'Triển khai linh hoạt Cloud hoặc On-Premise',
        desc: 'Hỗ trợ giải pháp đám mây tốc độ cao hoặc gói cài đặt On-Premise cách ly hoàn toàn mạng nội bộ cho các tập đoàn lớn.',
      },
    ],
    faqs: [
      {
        q: 'Trong cùng một phòng họp có thể vừa có tiếng Việt, tiếng Anh và tiếng Nhật không?',
        a: 'Hoàn toàn được. LayaMeet ứng dụng ma trận Any-to-Any: mỗi thành viên chọn ngôn ngữ nói và ngôn ngữ phụ đề riêng biệt mà không ảnh hưởng tới người khác.',
      },
      {
        q: 'Chất lượng nhận dạng tiếng Anh có tốt với giọng bản địa khác nhau (Anh-Mỹ, Anh-Ấn, Anh-Sing) không?',
        a: 'Mô hình Faster-Whisper được huấn luyện trên hàng triệu giờ âm thanh đa ngữ, nhận diện cực kỳ chuẩn xác các accent tiếng Anh phổ biến trong kinh doanh toàn cầu.',
      },
      {
        q: 'Tôi có thể dùng thử miễn phí không?',
        a: 'Có. Gói Community cho phép bạn tạo phòng họp song ngữ miễn phí trọn đời cho các cuộc họp nhóm tối đa 40 phút.',
      },
    ],
  },
};

interface Props {
  variant: 'japanese' | 'english';
}

export const LanguagePairLandingPage: React.FC<Props> = ({ variant }) => {
  const config = CONFIGS[variant];
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  useEffect(() => {
    document.title = config.pageTitle;

    // Update meta description
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', config.metaDescription);
    }

    // Update canonical link
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', config.canonicalUrl);
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }, [config]);

  const handleCreateMeeting = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await meetingApi.createMeeting(`LayaMeet - ${config.flagPair}`);
      admissionStorage.saveHostToken(res.meetingCode, res.hostToken);
      navigate(`/prejoin/${res.meetingCode}`);
    } catch (err) {
      console.error('Failed to create meeting:', err);
      setError('Không thể khởi tạo phòng họp lúc này. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0f0f10] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white transition-colors">
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-[#2e2e30]/80 bg-zinc-50/80 dark:bg-[#0f0f10]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" aria-label="Trang chủ LayaMeet">
              <LayaMeetLogo size="md" showBadge={true} />
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <Link to="/#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Tính năng
              </Link>
              <Link to="/#pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Bảng giá
              </Link>
              <Link to="/developers" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Nhà phát triển
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleCreateMeeting}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tạo phòng họp</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────── */}
      <main className="flex-1">
        <section className="pt-12 pb-16 md:pt-20 md:pb-24 border-b border-zinc-200 dark:border-[#202022] bg-gradient-to-b from-blue-50/40 via-transparent to-transparent dark:from-blue-950/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            {/* Flags & Category Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
              <Globe className="h-3.5 w-3.5" />
              <span>{config.flagPair}</span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span>{config.badgeText}</span>
            </div>

            {/* H1 Primary SEO Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.15]">
              {config.h1}
            </h1>

            {/* Subheading */}
            <p className="max-w-3xl mx-auto text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {config.subheading}
            </p>

            {/* Target Audience Pill */}
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
              🎯 {config.targetAudience}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleCreateMeeting}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>{loading ? 'Đang tạo phòng họp...' : 'Bắt đầu họp song ngữ ngay (Miễn phí)'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/#features"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1a1a1c] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <span>Xem trải nghiệm mẫu</span>
              </Link>
            </div>

            {error && (
              <p className="text-xs text-red-500 font-semibold pt-2">{error}</p>
            )}

            {/* Quick Guarantees */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Độ trễ &lt;350ms
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                RAM-only (Không lưu file audio)
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-500" />
                Không cần cài đặt ứng dụng
              </span>
            </div>
          </div>
        </section>

        {/* ── Pain Points vs Solution ───────────────────────────── */}
        <section className="py-16 md:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Khắc Phục Toàn Diện Nỗi Đau Giao Tiếp
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
              Tại sao hàng nghìn kỹ sư và quản lý lựa chọn LayaMeet thay vì các giải pháp họp truyền thống?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {config.painPoints.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-red-500/20 bg-red-500/5 dark:bg-red-950/10 p-6 space-y-3"
              >
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                  <X className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {config.solutionFeatures.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10 p-6 space-y-3"
              >
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature Comparison Table ──────────────────────────── */}
        <section className="py-16 bg-zinc-100/50 dark:bg-[#141416] border-y border-zinc-200 dark:border-[#222224]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                So Sánh Với Nền Tảng Khác
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                LayaMeet tối ưu hóa chuyên sâu cho họp song ngữ đa chiều thời gian thực.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Tiêu chí</th>
                    <th className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400">LayaMeet AI</th>
                    <th className="py-3.5 px-4 font-normal">Zoom / Google Meet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <tr>
                    <td className="py-3 px-4 font-semibold">Độ trễ phụ đề (Latency)</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">&lt;350ms (Tức thì)</td>
                    <td className="py-3 px-4 text-zinc-500">2 - 5 giây (Đợi hết câu)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Lưu trữ file âm thanh</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">Zero Storage (RAM-only)</td>
                    <td className="py-3 px-4 text-zinc-500">Lưu file trên Cloud</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Trích xuất Action Items</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">Tự động (Markdown 1-Click)</td>
                    <td className="py-3 px-4 text-zinc-500">Cần trả phí gói Pro đắt đỏ</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Triển khai On-Premise riêng</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">Hỗ trợ 100% Air-gapped</td>
                    <td className="py-3 px-4 text-zinc-500">Không hỗ trợ</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQs Section ──────────────────────────────────────── */}
        <section className="py-16 md:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Câu Hỏi Thường Gặp
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Giải đáp chi tiết về giải pháp họp trực tuyến {config.flagPair}.
            </p>
          </div>

          <div className="space-y-4">
            {config.faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 space-y-2"
              >
                <h3 className="font-bold text-sm text-zinc-950 dark:text-white">
                  {faq.q}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom Action Card */}
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white space-y-4 shadow-xl">
            <h3 className="text-xl sm:text-2xl font-extrabold">
              Sẵn Sàng Trải Nghiệm Cuộc Họp Không Rào Cản?
            </h3>
            <p className="text-xs text-blue-100 max-w-lg mx-auto">
              Không cần đăng ký thẻ tín dụng. Bắt đầu phiên họp đầu tiên của bạn chỉ trong 5 giây.
            </p>
            <button
              type="button"
              onClick={handleCreateMeeting}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-100 text-blue-600 font-bold text-xs transition shadow-md cursor-pointer"
            >
              {loading ? 'Đang tạo phòng...' : 'Tạo phòng họp miễn phí ngay'}
            </button>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <Footer
        onOpenPrivacyModal={() => setLegalModalType('privacy')}
        onOpenTermsModal={() => setLegalModalType('terms')}
      />

      <LegalModal
        isOpen={Boolean(legalModalType)}
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
};
