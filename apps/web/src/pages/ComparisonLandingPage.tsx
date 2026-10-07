import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Check,
  X,
  Scale,
  ChevronRight
} from 'lucide-react';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Footer } from '../components/common/Footer';
import { LegalModal } from '../components/common/LegalModal';
import { meetingApi } from '../api/meetingApi';
import { admissionStorage } from '../utils/admissionStorage';

export interface ComparisonLandingPageProps {
  competitor: 'zoom' | 'google-meet';
}

interface ComparisonFeature {
  feature: string;
  category: string;
  layameet: {
    highlight: string;
    detail: string;
    winner: boolean;
  };
  competitor: {
    highlight: string;
    detail: string;
  };
}

interface ComparisonConfig {
  competitorKey: 'zoom' | 'google-meet';
  competitorName: string;
  competitorShort: string;
  pageTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  badgeText: string;
  h1: string;
  subheading: string;
  verdictSummary: string;
  features: ComparisonFeature[];
  deepDives: {
    title: string;
    description: string;
    layameetAdvantage: string;
  }[];
  faqs: {
    q: string;
    a: string;
  }[];
}

const CONFIGS: Record<'zoom' | 'google-meet', ComparisonConfig> = {
  zoom: {
    competitorKey: 'zoom',
    competitorName: 'Zoom Meetings',
    competitorShort: 'Zoom',
    pageTitle: 'So Sánh LayaMeet vs Zoom: Nền Tảng Họp Song Ngữ AI <350ms, RAM-Only | LayaMeet',
    metaDescription: 'So sánh chi tiết LayaMeet vs Zoom Meetings. Đối chiếu tốc độ phụ đề dịch song ngữ (<350ms vs >2s), tính năng ghi biên bản họp tự động, bảo mật RAM-only và chi phí triển khai.',
    canonicalUrl: 'https://layameet.com/so-sanh/layameet-vs-zoom',
    badgeText: 'Đối Chiếu Chi Tiết & Khách Quan 2026',
    h1: 'So Sánh LayaMeet vs Zoom: Lựa Chọn Nào Tối Ưu Cho Cuộc Họp Đa Ngôn Ngữ?',
    subheading: 'Trong khi Zoom là nền tảng gọi video phổ biến toàn cầu, LayaMeet được thiết kế chuyên biệt để giải quyết triệt để rào cản ngôn ngữ với phụ đề AI dịch hai chiều <350ms, bảo mật RAM-only và tự động trích xuất biên bản họp.',
    verdictSummary: 'Chọn Zoom nếu bạn chỉ cần gọi video thông thường nội bộ. Chọn LayaMeet nếu bạn họp đàm phán xuyên biên giới (Việt - Nhật, Việt - Anh), cần phiên dịch chuẩn xác tức thì mà không muốn lưu lại âm thanh cuộc họp.',
    features: [
      {
        feature: 'Độ trễ phụ đề dịch thuật AI (Latency)',
        category: 'Trải Nghiệm Dịch Thuật',
        layameet: {
          highlight: '<350ms (Interim <964ms)',
          detail: 'Xử lý WebRTC trực tiếp kết hợp mô hình Whisper int8, hiển thị từ ngữ ngay khi người nói cất giọng.',
          winner: true,
        },
        competitor: {
          highlight: '1.5s - 3.5s (Phải đợi hết câu)',
          detail: 'Cần gửi chunk dài lên hạ tầng đám mây của Zoom để xử lý, tạo độ trễ lớn gây ngắt quãng cuộc trò chuyện.',
        },
      },
      {
        feature: 'Bảo mật dữ liệu âm thanh (Privacy & Compliance)',
        category: 'Bảo Mật Doanh Nghiệp',
        layameet: {
          highlight: '100% RAM-only (Zero Storage)',
          detail: 'Âm thanh chỉ tồn tại trong bộ nhớ RAM tạm thời và hủy ngay lập tức sau khi phiên dịch. Không lưu file audio vào ổ cứng.',
          winner: true,
        },
        competitor: {
          highlight: 'Lưu trữ đám mây & Tiềm ẩn rủi ro AI training',
          detail: 'File ghi âm và dữ liệu trao đổi lưu trên server Zoom, từng gây tranh cãi về điều khoản sử dụng dữ liệu khách hàng huấn luyện AI.',
        },
      },
      {
        feature: 'Hỗ trợ cặp ngôn ngữ Tiếng Việt ⇄ Tiếng Nhật / Tiếng Anh',
        category: 'Độ Chính Xác Ngôn Ngữ',
        layameet: {
          highlight: 'Tối ưu chuyên sâu cho Kỹ sư & IT Comtor',
          detail: 'Nhận diện chuẩn xác thuật ngữ kỹ thuật, kính ngữ tiếng Nhật (Keigo) và tiếng lóng thương mại hai chiều.',
          winner: true,
        },
        competitor: {
          highlight: 'Mô hình đa ngữ tổng quát',
          detail: 'Chất lượng dịch tiếng Nhật - tiếng Việt còn gượng gạo, dễ dịch sai các thuật ngữ chuyên ngành IT Offshore.',
        },
      },
      {
        feature: 'Tự động trích xuất Biên bản & Việc cần làm (Action Items)',
        category: 'Năng Suất Sau Họp',
        layameet: {
          highlight: 'Laya Sidecar phân loại tự động (Markdown 1-Click)',
          detail: 'Tự động tách riêng Quyết định (Decisions) và Việc cần làm (Action Items) theo định dạng Markdown tải về ngay.',
          winner: true,
        },
        competitor: {
          highlight: 'Zoom AI Companion (Yêu cầu trả phí)',
          detail: 'Chỉ tóm tắt chung chung, người dùng vẫn phải đọc lại toàn bộ transcript thô để lọc đầu việc.',
        },
      },
      {
        feature: 'Cài đặt phần mềm & Thiết bị',
        category: 'Tiện Ích Người Dùng',
        layameet: {
          highlight: '100% Trình duyệt Web (Zero-Install)',
          detail: 'Khách hàng và đối tác chỉ cần nhấp vào link phòng (Chrome, Safari, Edge) là vào họp ngay lập tức.',
          winner: true,
        },
        competitor: {
          highlight: 'Bắt buộc tải ứng dụng Zoom Client',
          detail: 'Ứng dụng nặng, thường xuyên yêu cầu cập nhật phiên bản trước khi được phép tham gia cuộc họp.',
        },
      },
      {
        feature: 'Giới hạn thời lượng cuộc họp miễn phí',
        category: 'Quyền Lợi & Gói Cước',
        layameet: {
          highlight: 'Không giới hạn 40 phút',
          detail: 'Thoải mái đàm phán hợp đồng hoặc trao đổi công việc dài mà không lo cuộc gọi bị ngắt giữa chừng.',
          winner: true,
        },
        competitor: {
          highlight: 'Tự động ngắt sau 40 phút',
          detail: 'Gói Basic miễn phí giới hạn nghiêm ngặt 40 phút cho cuộc họp từ 3 người trở lên.',
        },
      },
      {
        feature: 'Khả năng triển khai On-Premise / Máy chủ riêng',
        category: 'Triển Khai Doanh Nghiệp',
        layameet: {
          highlight: 'Hỗ trợ Docker & Private Server',
          detail: 'Doanh nghiệp khối tài chính, ngân hàng và nhà nước có thể tự vận hành trên hạ tầng nội bộ khép kín.',
          winner: true,
        },
        competitor: {
          highlight: 'Chỉ hoạt động trên Public Cloud',
          detail: 'Không cho phép doanh nghiệp tự lưu trữ và kiểm soát hoàn toàn mã nguồn cũng như luồng dữ liệu truyền thông.',
        },
      },
      {
        feature: 'Chi phí Add-on AI phiên dịch',
        category: 'Chi Phí Doanh Nghiệp',
        layameet: {
          highlight: 'Tích hợp sẵn trong mọi phòng họp',
          detail: 'Không tính thêm phí phụ trợ cho từng người dùng (Seat-based fee).',
          winner: true,
        },
        competitor: {
          highlight: 'Phụ thu gói dịch vụ cao cấp',
          detail: 'Yêu cầu đăng ký các gói Enterprise hoặc Add-on dịch thuật phụ đề riêng biệt.',
        },
      },
    ],
    deepDives: [
      {
        title: '1. Tốc độ dịch thuật tức thì (<350ms vs >2s của Zoom)',
        description: 'Khi trao đổi kỹ thuật với đối tác nước ngoài, độ trễ 2-3 giây của Zoom khiến cuộc trò chuyện thường xuyên bị "nói chèn nhau" hoặc khoảng lặng ngượng ngùng.',
        layameetAdvantage: 'LayaMeet áp dụng audio chunking 350ms và mô hình Faster-Whisper int8 trên WebRTC trực tiếp, giúp phụ đề xuất hiện gần như đồng thời với âm thanh thực tế.',
      },
      {
        title: '2. Giải quyết nỗi lo bảo mật của các đối tác khắt khe',
        description: 'Các doanh nghiệp Nhật Bản và đối tác quốc tế thường có điều khoản NDA nghiêm ngặt, cấm ghi âm hoặc lưu trữ file âm thanh đàm phán trên máy chủ bên thứ ba.',
        layameetAdvantage: 'LayaMeet cam kết kiến trúc RAM-only (Zero Raw Audio Storage). Âm thanh được giải phóng khỏi RAM ngay sau khi nhận dạng, đảm bảo không có bất kỳ file mp3/wav nào bị ghi vào ổ đĩa.',
      },
      {
        title: '3. Tiết kiệm 2-3 giờ ghi chép biên bản mỗi ngày',
        description: 'Sau mỗi buổi họp Daily, Sprint Review hay thương thảo hợp đồng, trợ lý hoặc IT Comtor thường mất từ 1 đến 3 tiếng dịch lại Action Items sang tiếng Nhật hoặc tiếng Anh.',
        layameetAdvantage: 'Laya Sidecar hoạt động song song trong nền, tự động phân loại Quyết định (Decisions) và Việc cần làm (Action Items) theo định dạng Markdown song ngữ chỉ với 1 click xuất báo cáo.',
      },
    ],
    faqs: [
      {
        q: 'Tôi đang dùng Zoom quen rồi, chuyển sang LayaMeet có mất thời gian học không?',
        a: 'Hoàn toàn không. LayaMeet có giao diện tối giản, chỉ cần nhấp "Tạo phòng họp" là bạn nhận được link mời gửi cho đối tác. Không ai cần tải phần mềm hay tạo tài khoản phức tạp.',
      },
      {
        q: 'LayaMeet có tính năng chia sẻ màn hình và chat như Zoom không?',
        a: 'Có. LayaMeet hỗ trợ đầy đủ chia sẻ màn hình HD, camera, microphone, phòng chờ bảo mật và khung chat trực tiếp, bên cạnh ưu thế vượt trội về phụ đề song ngữ AI.',
      },
      {
        q: 'Đối tác Nhật Bản hoặc nước ngoài của tôi có cần trả phí để tham gia không?',
        a: 'Không. Khách mời tham gia hoàn toàn miễn phí chỉ qua đường link phòng họp trên trình duyệt web.',
      },
      {
        q: 'Tôi có thể xuất biên bản họp ra file gì?',
        a: 'Bạn có thể xuất biên bản họp ra file Markdown (.md), dễ dàng sao chép vào Notion, Jira, Confluence, Slack hoặc gửi email trực tiếp cho khách hàng.',
      },
    ],
  },
  'google-meet': {
    competitorKey: 'google-meet',
    competitorName: 'Google Meet',
    competitorShort: 'Google Meet',
    pageTitle: 'So Sánh LayaMeet vs Google Meet: Giải Pháp Họp Song Ngữ Tức Thì | LayaMeet',
    metaDescription: 'So sánh chi tiết LayaMeet vs Google Meet. Phụ đề dịch hai chiều thời gian thực tiếng Việt - Nhật - Anh <350ms, tự động trích xuất Action Items và bảo mật RAM-only.',
    canonicalUrl: 'https://layameet.com/so-sanh/layameet-vs-google-meet',
    badgeText: 'Đối Chiếu Chi Tiết & Khách Quan 2026',
    h1: 'So Sánh LayaMeet vs Google Meet: Đâu Là Công Cụ Họp Song Ngữ Tốt Hơn?',
    subheading: 'Google Meet rất tiện lợi trong hệ sinh thái Google Workspace, nhưng tính năng dịch thuật của LayaMeet được tinh chỉnh chuyên sâu cho doanh nghiệp đàm phán quốc tế với khả năng dịch hai chiều tức thì <350ms và bảo mật RAM-only.',
    verdictSummary: 'Chọn Google Meet nếu toàn bộ đội ngũ của bạn dùng Google Workspace và chỉ cần họp nội bộ đơn giản. Chọn LayaMeet nếu bạn cần phá vỡ rào cản tiếng Việt - Nhật - Anh với độ trễ cực thấp và bảo mật dữ liệu độc lập.',
    features: [
      {
        feature: 'Dịch thuật phụ đề song ngữ hai chiều đồng thời',
        category: 'Trải Nghiệm Dịch Thuật',
        layameet: {
          highlight: 'Hai chiều đồng thời (Việt ⇄ Nhật, Việt ⇄ Anh)',
          detail: 'Người nói tự do dùng tiếng mẹ đẻ, màn hình hiển thị đồng thời cả câu gốc và câu dịch song ngữ chuẩn xác.',
          winner: true,
        },
        competitor: {
          highlight: 'Chỉ dịch 1 chiều và giới hạn ngôn ngữ',
          detail: 'Google Meet chủ yếu dịch tiếng Anh sang một số ngôn ngữ phổ biến; việc dịch tiếng Việt và kính ngữ Nhật Bản còn rất hạn chế.',
        },
      },
      {
        feature: 'Độ trễ hiển thị phụ đề (Real-Time Latency)',
        category: 'Tốc Độ & Độ Nhạy',
        layameet: {
          highlight: '<350ms với mô hình Faster-Whisper int8',
          detail: 'Phụ đề cập nhật tức thì theo từng âm tiết, mang lại cảm giác giao tiếp tự nhiên như có thông dịch viên trực tiếp.',
          winner: true,
        },
        competitor: {
          highlight: '1.5s - 2.5s',
          detail: 'Phải phân tích theo cụm câu dài, người nghe phải chờ nói xong một đoạn mới đọc được bản dịch.',
        },
      },
      {
        feature: 'Tự động trích xuất Action Items & Biên bản họp',
        category: 'Năng Suất Sau Họp',
        layameet: {
          highlight: 'Laya Sidecar phân loại Decisions & Tasks',
          detail: 'Không cần phụ tá ghi chú. Cuộc họp kết thúc là có ngay biên bản Markdown song ngữ tóm tắt đầy đủ quyết định quan trọng.',
          winner: true,
        },
        competitor: {
          highlight: 'Yêu cầu gói Gemini for Google Workspace đắt đỏ',
          detail: 'Tính năng tóm tắt AI chỉ có trên các gói Google Workspace Enterprise bổ sung thêm phí giấy phép hàng tháng.',
        },
      },
      {
        feature: 'Bảo mật dữ liệu âm thanh (Zero Raw Audio Storage)',
        category: 'Bảo Mật Doanh Nghiệp',
        layameet: {
          highlight: '100% RAM-only, Không lưu trữ âm thanh',
          detail: 'Cam kết tuyệt đối không lưu file audio cuộc họp, không dùng dữ liệu doanh nghiệp để huấn luyện mô hình bên ngoài.',
          winner: true,
        },
        competitor: {
          highlight: 'Chính sách dữ liệu thuộc hệ sinh thái Google Cloud',
          detail: 'Dữ liệu cuộc họp và transcript gắn liền với tài khoản Google, khó đáp ứng các yêu cầu kiểm toán On-Premise cô lập hoàn toàn.',
        },
      },
      {
        feature: 'Yêu cầu tài khoản đăng nhập khi tham gia',
        category: 'Tiện Ích Người Dùng',
        layameet: {
          highlight: 'Vào họp ngay không cần tài khoản',
          detail: 'Đối tác và khách hàng chỉ cần nhập tên hiển thị là vào phòng ngay, không vướng rào cản đăng nhập tài khoản bên thứ ba.',
          winner: true,
        },
        competitor: {
          highlight: 'Ưu tiên tài khoản Google Account',
          detail: 'Khách ngoài tổ chức thường gặp thông báo yêu cầu đăng nhập tài khoản Google hoặc chờ host duyệt rườm rà.',
        },
      },
      {
        feature: 'Khả năng tùy chỉnh Từ điển chuyên ngành (Glossary)',
        category: 'Tùy Biến Doanh Nghiệp',
        layameet: {
          highlight: 'Hỗ trợ từ điển chuyên ngành IT & Sản xuất',
          detail: 'Tùy chỉnh các thuật ngữ viết tắt của dự án, tên riêng sản phẩm giúp AI không dịch nhầm từ khóa quan trọng.',
          winner: true,
        },
        competitor: {
          highlight: 'Không thể tùy chỉnh từ điển chuyên ngành',
          detail: 'Áp dụng bộ từ điển chung cố định của Google, hay dịch sai từ lóng hoặc từ viết tắt công nghệ.',
        },
      },
      {
        feature: 'Khả năng tự triển khai máy chủ riêng (Self-Hosted)',
        category: 'Hạ Tầng Triển Khai',
        layameet: {
          highlight: 'Hỗ trợ On-Premise & Private Cloud',
          detail: 'Khách hàng khối quân sự, tài chính, cơ quan nhà nước có thể triển khai trên cụm máy chủ nội bộ không ra Internet.',
          winner: true,
        },
        competitor: {
          highlight: 'Hoàn toàn đóng trong Google Cloud',
          detail: 'Không thể tự chủ máy chủ hoặc triển khai trong mạng nội bộ cô lập (Air-gapped network).',
        },
      },
      {
        feature: 'Giao diện hiển thị song ngữ chuyên dụng',
        category: 'Trải Nghiệm Người Dùng',
        layameet: {
          highlight: 'Subtitle Overlay & Subtitle Panel chuyên biệt',
          detail: 'Hiển thị song song hai dòng: tiếng gốc và tiếng dịch, kèm thông tin người nói và trạng thái mic rõ ràng.',
          winner: true,
        },
        competitor: {
          highlight: 'Phụ đề cơ bản nằm góc dưới',
          detail: 'Chỉ hiển thị dòng chữ đơn giản, dễ bị che khuất khi trình chiếu slide hoặc nhiều người phát biểu.',
        },
      },
    ],
    deepDives: [
      {
        title: '1. Khả năng dịch hai chiều chuyên sâu tiếng Việt ⇄ Tiếng Nhật / Tiếng Anh',
        description: 'Google Meet được xây dựng cho các thị trường phương Tây, nên các tính năng dịch thuật sang tiếng Việt hoặc giữa tiếng Việt và tiếng Nhật thường bị xếp sau và thiếu chính xác.',
        layameetAdvantage: 'LayaMeet được phát triển với trọng tâm cốt lõi là các cặp ngôn ngữ châu Á (Việt - Nhật - Anh), xử lý hoàn hảo các đặc thù ngữ pháp, kính ngữ và thuật ngữ IT.',
      },
      {
        title: '2. Tự động hóa biên bản họp không tốn phí Gemini Enterprise',
        description: 'Để có tính năng "Take notes for me" trên Google Meet, doanh nghiệp phải mua gói bổ sung Gemini AI với chi phí lên tới 20 - 30 USD/người dùng mỗi tháng.',
        layameetAdvantage: 'LayaMeet tích hợp sẵn cơ chế trích xuất Laya Sidecar, tự động nhóm các quyết định và việc cần làm theo định dạng chuẩn Markdown cho mọi cuộc họp.',
      },
      {
        title: '3. Bảo mật tối đa với nguyên lý RAM-only',
        description: 'Khi trao đổi thông tin chiến lược với đối tác quốc tế, việc đưa dữ liệu cuộc họp lên các dịch vụ đám mây công cộng tiềm ẩn nguy cơ rò rỉ thông tin cạnh tranh.',
        layameetAdvantage: 'LayaMeet áp dụng kiến trúc RAM-only cô lập: không lưu file ghi âm thô, không lưu trữ giọng nói, giải phóng bộ nhớ ngay sau khi chuyển ngữ.',
      },
    ],
    faqs: [
      {
        q: 'Tôi có thể chia sẻ link LayaMeet vào lịch Google Calendar không?',
        a: 'Hoàn toàn được. Bạn chỉ cần tạo phòng họp LayaMeet, sao chép liên kết phòng và dán vào phần ghi chú hoặc địa điểm trong sự kiện Google Calendar của bạn.',
      },
      {
        q: 'LayaMeet có giới hạn số lượng người tham gia họp không?',
        a: 'Hệ thống hỗ trợ từ các cuộc họp 1-1, Daily Scrum nhóm nhỏ đến các hội nghị đa phương hàng chục người cùng lúc với độ trễ WebRTC siêu thấp.',
      },
      {
        q: 'Chất lượng video và âm thanh của LayaMeet có tương đương Google Meet không?',
        a: 'LayaMeet sử dụng hạ tầng LiveKit WebRTC chuẩn công nghiệp viễn thông thế giới, cung cấp âm thanh Opus băng thông rộng và video HD sắc nét với cơ chế thích ứng băng thông thông minh.',
      },
      {
        q: 'Tôi có cần cài đặt extension Chrome nào không?',
        a: 'Không cần bất kỳ extension nào. LayaMeet chạy trực tiếp 100% bằng công nghệ WebRTC và WebSockets trên trình duyệt tiêu chuẩn.',
      },
    ],
  },
};

export const ComparisonLandingPage: React.FC<ComparisonLandingPageProps> = ({ competitor }) => {
  const navigate = useNavigate();
  const config = CONFIGS[competitor];

  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set Page Meta Title & Description Dynamically
  useEffect(() => {
    document.title = config.pageTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', config.metaDescription);
    }
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', config.canonicalUrl);
    }
  }, [config]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const hostDisplayName = userName.trim() || 'Host ' + Math.floor(1000 + Math.random() * 9000);
      const res = await meetingApi.createMeeting(`LayaMeet vs ${config.competitorShort}`);
      admissionStorage.saveHostToken(res.meetingCode, res.hostToken);
      navigate(`/meeting/${res.meetingCode}?role=host&name=${encodeURIComponent(hostDisplayName)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể khởi tạo phòng họp. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-page min-h-dvh bg-[#fcfcfd] dark:bg-[#0c0c0d] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors selection:bg-blue-500 selection:text-white">
      {/* ── Top Navigation Bar ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-[#0c0c0d]/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <LayaMeetLogo size="sm" showBadge={false} />
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
              <ChevronRight className="w-3.5 h-3.5" />
              <span>So Sánh</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-blue-600 dark:text-blue-400">vs {config.competitorShort}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Switch competitor button */}
            <Link
              to={config.competitorKey === 'zoom' ? '/so-sanh/layameet-vs-google-meet' : '/so-sanh/layameet-vs-zoom'}
              className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 inline-flex items-center gap-1 transition"
            >
              <span>Xem vs {config.competitorKey === 'zoom' ? 'Google Meet' : 'Zoom'}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <ThemeToggle />
            <Link
              to="/"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Trang Chủ
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Breadcrumb Bar ─────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:underline">Trang chủ</Link>
            <span>/</span>
            <span>So sánh giải pháp</span>
            <span>/</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-medium">LayaMeet vs {config.competitorShort}</span>
          </nav>
        </div>

        {/* ── Hero Section ──────────────────────────────────────── */}
        <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <Scale className="w-3.5 h-3.5" />
            <span>{config.badgeText}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight text-zinc-950 dark:text-white">
            {config.h1}
          </h1>

          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            {config.subheading}
          </p>

          {/* Verdict Box */}
          <div className="max-w-3xl mx-auto p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-left text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 space-y-1.5 shadow-xs">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Đánh giá tóm tắt (TL;DR):</span>
            </div>
            <p className="leading-relaxed">
              {config.verdictSummary}
            </p>
          </div>

          {/* Quick Start Form */}
          <form onSubmit={handleCreateMeeting} className="max-w-md mx-auto pt-4 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Nhập tên của bạn để thử họp..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Đang tạo...' : 'Tạo phòng thử ngay'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {error && <p className="text-xs text-rose-500 max-w-md mx-auto">{error}</p>}
        </section>

        {/* ── Main Comparison Matrix ────────────────────────────── */}
        <section className="py-12 bg-zinc-100/60 dark:bg-[#121214] border-y border-zinc-200 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                Bảng Đối Chiếu Tính Năng Chi Tiết
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
                So sánh đối đầu giữa LayaMeet AI và {config.competitorName} trên 8 tiêu chí quan trọng nhất đối với doanh nghiệp.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="py-4 px-5 font-semibold w-1/3">Tiêu chí đánh giá</th>
                    <th className="py-4 px-5 font-semibold text-zinc-950 dark:text-white w-1/3 bg-zinc-100/50 dark:bg-zinc-800/40 border-x border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>LayaMeet AI</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold ml-auto hidden sm:inline">Khuyên Dùng</span>
                      </div>
                    </th>
                    <th className="py-4 px-5 font-semibold text-zinc-600 dark:text-zinc-400 w-1/3">
                      {config.competitorName}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {config.features.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                      <td className="py-4 px-5 align-top">
                        <div className="font-semibold text-zinc-950 dark:text-white">{item.feature}</div>
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-400 mt-0.5">{item.category}</div>
                      </td>
                      <td className="py-4 px-5 align-top bg-zinc-50/40 dark:bg-zinc-800/20 border-x border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-start gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{item.layameet.highlight}</span>
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                          {item.layameet.detail}
                        </p>
                      </td>
                      <td className="py-4 px-5 align-top">
                        <div className="flex items-start gap-1.5 font-medium text-zinc-500 dark:text-zinc-400">
                          <X className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400" />
                          <span>{item.competitor.highlight}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {item.competitor.detail}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Deep Dive Reasons ─────────────────────────────────── */}
        <section className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              3 Lý Do Hàng Đầu Khiến Doanh Nghiệp Chọn LayaMeet Thay Vì {config.competitorShort}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
              Những giá trị khác biệt không thể tìm thấy ở các ứng dụng gọi video phổ thông.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {config.deepDives.map((dive, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 space-y-4 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                    0{idx + 1}
                  </div>
                  <h3 className="font-bold text-sm text-zinc-950 dark:text-white leading-snug">
                    {dive.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {dive.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lợi thế của LayaMeet:</span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {dive.layameetAdvantage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQs Section ──────────────────────────────────────── */}
        <section className="py-16 md:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Câu Hỏi Thường Gặp Khi Chuyển Từ {config.competitorShort}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Giải đáp thắc mắc của người dùng khi cân nhắc giải pháp họp song ngữ.
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

          {/* Bottom Conversion CTA */}
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white space-y-4 shadow-xl">
            <h3 className="text-xl sm:text-2xl font-extrabold">
              Khám Phá Trải Nghiệm Họp Song Ngữ Mới Với LayaMeet
            </h3>
            <p className="text-xs text-blue-100 max-w-lg mx-auto">
              Không cần cài app, không giới hạn 40 phút, không lưu dữ liệu âm thanh. Tạo phòng họp và gửi link cho đối tác ngay bây giờ.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCreateMeeting}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-100 text-blue-600 font-bold text-xs transition shadow-md cursor-pointer"
              >
                {loading ? 'Đang tạo phòng...' : 'Tạo phòng họp miễn phí ngay'}
              </button>
              <Link
                to="/"
                className="px-5 py-3 rounded-xl bg-blue-700/50 hover:bg-blue-700 text-white font-semibold text-xs border border-white/20 transition"
              >
                Tìm hiểu thêm tính năng
              </Link>
            </div>
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
