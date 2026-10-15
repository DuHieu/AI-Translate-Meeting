import React, { useState } from 'react';
import {
  Monitor,
  Download,
  Zap,
  ShieldCheck,
  Globe,
  CheckCircle2,
  Layers,
  Eye,
  Cpu,
  FileText,
  Check,
  X,
  Sparkles,
  Headphones,
  Sliders,
  ExternalLink,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';

interface DesktopLandingSectionsProps {
  onOpenDownload: () => void;
  language?: string;
}

export const DesktopLandingSections: React.FC<DesktopLandingSectionsProps> = ({
  onOpenDownload,
  language = 'vi',
}) => {
  const isJa = language === 'ja';
  const isEn = language === 'en';

  const t = {
    compatTitle: isJa
      ? '既存の全Web会議ツールに完全対応'
      : isEn
      ? 'Seamlessly Compatible with All Video Conferencing Apps'
      : 'Tương Thích Mượt Mà Với Mọi Nền Tảng Họp Trực Tuyến',
    compatSub: isJa
      ? 'ボットの招待やリンク共有は一切不要。PC内の音声を直接キャプチャして字幕化します。'
      : isEn
      ? 'No bots to invite, no room link sharing required. Captures system audio directly from your soundcard.'
      : 'Không cần mời bot, không bắt đối tác đổi link. Tự động bắt âm thanh hệ thống trực tiếp từ máy tính của bạn.',

    howTitle: isJa
      ? 'わずか3ステップで会議の言語の壁を解消'
      : isEn
      ? 'Break Language Barriers in 3 Simple Steps'
      : '3 Bước Đơn Giản Để Bắt Đầu Cuộc Họp Không Rào Cản',
    howSub: isJa
      ? '複雑な設定やアカウント登録の強制なし。1分で準備完了。'
      : isEn
      ? 'No complicated setups or forced server accounts. Ready in under 60 seconds.'
      : 'Không cần cài đặt phức tạp, không làm gián đoạn thói quen họp quen thuộc của công ty.',

    step1Title: isJa ? '1. アプリを起動' : isEn ? '1. Launch LayaMeet' : '1. Khởi Chạy LayaMeet',
    step1Desc: isJa
      ? '軽量インストーラー（15MB）をダウンロードし、起動します。メモリ消費量はわずか50MB。'
      : isEn
      ? 'Download the lightweight 15MB installer and open it. Runs at just ~50MB of RAM.'
      : 'Tải bộ cài siêu nhẹ 15MB và mở lên. Ứng dụng chạy mượt mà chỉ với ~50MB RAM.',

    step2Title: isJa ? '2. 通常通り会議に参加' : isEn ? '2. Join Meetings Normally' : '2. Vào Họp Như Mọi Ngày',
    step2Desc: isJa
      ? 'Zoom、Google Meet、Microsoft Teamsなど、いつものツールで相手と会話を始めます。'
      : isEn
      ? 'Join your meeting in Zoom, Google Meet, or Microsoft Teams with your normal link.'
      : 'Mở Zoom, Google Meet hoặc Microsoft Teams để trao đổi với khách hàng, đối tác như bình thường.',

    step3Title: isJa ? '3. リアルタイム字幕を体感' : isEn ? '3. See Live Subtitles' : '3. Xem Phụ Đề Nổi Song Ngữ',
    step3Desc: isJa
      ? '画面最前面に透明字幕バーが表示され、双方の音声を即時翻訳。<350msの超低遅延。'
      : isEn
      ? 'A floating translucent subtitle bar overlays your screen, translating both speakers in <350ms.'
      : 'Thanh phụ đề nổi trong suốt bám sát màn hình, dịch 2 chiều với độ trễ <350ms và tự lưu biên bản họp.',

    featuresTitle: isJa
      ? 'ビジネスを加速する最先端AI機能'
      : isEn
      ? 'Enterprise-Grade Real-Time AI Features'
      : 'Tính Năng Đột Phá Cho Cuộc Họp Doanh Nghiệp',
    featuresSub: isJa
      ? '帯域幅コストをゼロにし、セキュリティと操作性を極限まで高めた設計'
      : isEn
      ? 'Zero cloud bandwidth overhead with maximum privacy and seamless UX.'
      : 'Thiết kế triệt tiêu 100% chi phí băng thông máy chủ, bảo mật tối đa và tiện ích vượt bậc.',

    comparisonTitle: isJa
      ? '他社ソリューションとの比較'
      : isEn
      ? 'Why Choose LayaMeet Over Alternatives?'
      : 'Tại Sao Chọn LayaMeet Thay Vì Các Giải Pháp Khác?',
    comparisonSub: isJa
      ? '相手に負担をかけず、プライバシーを厳格に保護する唯一のデスクトップAIコンパニオン'
      : isEn
      ? 'The only desktop companion that requires zero bots, preserves 100% privacy, and costs zero server fees.'
      : 'Giải pháp duy nhất không cần mời bot, bảo mật 100% RAM-Only và tự do chọn mô hình AI.',

    ctaTitle: isJa
      ? '次回の国際会議を、母国語で自信を持って行いませんか？'
      : isEn
      ? 'Ready to Run Your Next Global Meeting with Confidence?'
      : 'Sẵn Sàng Phá Bỏ Rào Cản Ngôn Ngữ Trong Cuộc Họp Tới?',
    ctaSub: isJa
      ? '今すぐWindows版（無料）をお試しください。クレジットカード不要。'
      : isEn
      ? 'Download the free Windows companion app today. No credit card required.'
      : 'Tải ngay ứng dụng Windows miễn phí. Không cần thẻ tín dụng, cài đặt trong 10 giây.',
  };

  const platforms = [
    { name: 'Google Meet', color: 'from-emerald-500 to-teal-600', badge: '100% Native Audio' },
    { name: 'Zoom Meetings', color: 'from-blue-500 to-indigo-600', badge: 'WASAPI Direct' },
    { name: 'Microsoft Teams', color: 'from-indigo-600 to-purple-600', badge: 'Auto Speaker' },
    { name: 'Slack Huddles', color: 'from-amber-500 to-rose-600', badge: 'Zero Bot' },
    { name: 'Cisco Webex', color: 'from-sky-500 to-blue-600', badge: 'No Latency' },
    { name: 'YouTube Live', color: 'from-red-500 to-rose-600', badge: 'Stream Audio' },
  ];

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: isJa
        ? 'LayaMeetはZoomやGoogle Meet、Teamsとどのように連携しますか？'
        : isEn
        ? 'How does LayaMeet work with Zoom, Google Meet, and Teams?'
        : 'LayaMeet hoạt động với Zoom, Google Meet và Teams như thế nào?',
      a: isJa
        ? 'LayaMeetは軽量なデスクトップコンパニオンアプリ（15MB）です。PCのサウンドカード（WASAPI Loopback）から直接音声をキャプチャし、最前面に透明なリアルタイム字幕バーを表示します。ボットを招待したり会議リンクを変更する必要はありません。'
        : isEn
        ? 'LayaMeet is a lightweight 15MB desktop companion app. It captures dual-channel system audio directly via WASAPI Loopback (your microphone and the speaker output) and displays an always-on-top translucent subtitle bar. Zero bots, zero meeting link changes.'
        : 'LayaMeet là ứng dụng Desktop siêu nhẹ (15MB). Ứng dụng tự động bắt luồng âm thanh 2 chiều qua WASAPI Loopback (tiếng micro của bạn và tiếng loa đối tác) và hiển thị thanh phụ đề nổi trong suốt trên màn hình. Bạn không cần mời bot vào phòng hay đổi link họp.',
    },
    {
      q: isJa
        ? '100% RAM-Only（音声非保存）セキュリティとはどういう意味ですか？'
        : isEn
        ? 'What does 100% RAM-Only security mean?'
        : 'Bảo mật 100% RAM-Only có nghĩa là gì?',
      a: isJa
        ? '音声データはメモリ（RAM）上でのみリアルタイム認識・翻訳処理され、処理完了後に即時破棄されます。音声ファイルとしてローカルディスクや外部サーバーに保存されることは一切ありません。'
        : isEn
        ? 'Audio streams are transcribed in memory (RAM) in real-time and wiped immediately. Zero raw audio files are ever written to disk or third-party cloud servers.'
        : 'Toàn bộ luồng âm thanh chỉ được xử lý tạm thời trên bộ nhớ RAM để nhận diện giọng nói và dịch thuật, sau đó được giải phóng ngay lập tức. Không có bất kỳ file ghi âm nào được lưu xuống ổ đĩa hay máy chủ trung gian.',
    },
    {
      q: isJa
        ? '実際の翻訳遅延はどのくらいですか？'
        : isEn
        ? 'What is the actual translation latency?'
        : 'Độ trễ dịch thuật thực tế là bao nhiêu?',
      a: isJa
        ? '最適化されたFaster-Whisper（int8）と軽量ルーターにより、350ms以下の超低遅延を実現しています（p50中央値は約77ms）。相手の発言とほぼ同時に字幕が表示されます。'
        : isEn
        ? 'Our optimized Faster-Whisper pipeline delivers ultra-low latency under 350ms (p50 reaches ~77ms), providing near-instant subtitles as participants speak.'
        : 'Hệ thống tối ưu hóa Faster-Whisper và bộ định tuyến đa ngữ giúp đạt độ trễ cực thấp dưới 350ms (p50 đạt ~77ms). Phụ đề hiển thị gần như song song với lời người nói.',
    },
    {
      q: isJa
        ? '相手側もLayaMeetをインストールする必要がありますか？'
        : isEn
        ? 'Does my meeting partner need to install LayaMeet?'
        : 'Đối tác của tôi có cần cài đặt LayaMeet không?',
      a: isJa
        ? 'いいえ、一切不要です。相手は通常のZoomやMeet、Teamsに参加するだけで会話できます。あなた側の画面に相手の言語の日本語訳が表示されます。'
        : isEn
        ? 'No, absolutely not. Your partners join Zoom, Meet, or Teams as usual. Subtitles appear directly on your screen without any installation required on their end.'
        : 'Hoàn toàn không. Đối tác chỉ cần tham gia Zoom, Google Meet hoặc Microsoft Teams như bình thường. Bạn có thể chia sẻ phụ đề nổi qua chia sẻ màn hình hoặc dùng làm trợ lý phiên dịch cá nhân.',
    },
    {
      q: isJa
        ? 'LayaMeetは無料で利用できますか？'
        : isEn
        ? 'Is LayaMeet free to use?'
        : 'LayaMeet có miễn phí không?',
      a: isJa
        ? 'はい。基本機能（リアルタイム字幕・音声キャプチャ）は無料でご利用いただけます。企業向けには用語辞書カスタマイズやBYOK（独自AIキー連携）プランもご用意しています。'
        : isEn
        ? 'Yes, core real-time subtitle features are free. We also offer Pro and Enterprise plans for custom domain glossaries and bring-your-own-key (BYOK) AI models.'
        : 'Có. Bạn có thể tải và sử dụng LayaMeet miễn phí với đầy đủ tính năng phụ đề thời gian thực. Chúng tôi cũng cung cấp gói Pro và Doanh nghiệp với từ điển thuật ngữ riêng (Glossary) và tích hợp AI riêng (BYOK).',
    },
  ];

  return (
    <div className="w-full space-y-24 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── 1. PLATFORM COMPATIBILITY STRIP ── */}
      <section className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-semibold">
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>{t.compatTitle}</span>
        </div>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {t.compatSub}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {platforms.map((p) => (
            <div
              key={p.name}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-400/50 transition-all flex flex-col items-center justify-center text-center group cursor-default"
            >
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${p.color} text-white flex items-center justify-center font-bold text-sm shadow-xs mb-2 group-hover:scale-105 transition-transform`}
              >
                {p.name.charAt(0)}
              </div>
              <div className="text-xs font-bold text-slate-800">{p.name}</div>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                {p.badge}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. HOW IT WORKS: 3 STEPS ── */}
      <section id="how-it-works" className="space-y-12 scroll-mt-24">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Workflow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.howTitle}
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            {t.howSub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <div className="relative p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg shadow-2xs">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t.step1Title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t.step1Desc}</p>
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <span>Windows 10/11 64-bit</span>
              <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-500" />
            </div>
          </div>

          <div className="relative p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg shadow-2xs">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t.step2Title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t.step2Desc}</p>
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <span>WASAPI Dual-Channel Loopback</span>
              <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-500" />
            </div>
          </div>

          <div className="relative p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg shadow-2xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t.step3Title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t.step3Desc}</p>
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>Always-On-Top & Click-Through</span>
              <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-500" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. BENTO GRID FEATURES ── */}
      <section id="features" className="space-y-12 scroll-mt-24">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Core Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.featuresTitle}
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            {t.featuresSub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: 2-Channel WASAPI Loopback (Col-span 2 on desktop) */}
          <div className="md:col-span-2 p-7 sm:p-9 rounded-3xl bg-gradient-to-br from-white via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isJa
                ? '双方向音声キャプチャ（WASAPIループバック）'
                : isEn
                ? 'Dual-Channel WASAPI Audio Loopback'
                : 'Bắt Âm Thanh Hệ Thống 2 Chiều (WASAPI Loopback)'}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              {isJa
                ? 'マイク（自分の声）とスピーカー（Zoom/Meetの相手の声）を独立してキャプチャ。相手の声は自動で日本語に、あなたの声は自動で相手の言語（英語/ベトナム語）に双方向同時翻訳します。'
                : isEn
                ? 'Separates your microphone from system audio output automatically. The speaker voice translates into your language, while your voice translates into theirs in real-time.'
                : 'Tự động tách riêng tiếng Microphone của bạn và tiếng Loa đối tác trong Zoom/Meet. Tiếng đối tác tự động dịch sang Tiếng Việt cho bạn đọc; tiếng bạn nói tự dịch sang Tiếng Nhật/Anh cho đối tác.'}
            </p>
            <div className="pt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                🎙️ Kênh Micro (Self)
              </span>
              <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                🎧 Kênh Loa (Attendee)
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 shadow-2xs">
                ⚡ Độ trễ &lt; 350ms
              </span>
            </div>
          </div>

          {/* Card 2: Floating Translucent Overlay */}
          <div className="p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isJa
                ? '最前面フローティング＆クリックスルー'
                : isEn
                ? 'Always-On-Top & Click-Through'
                : 'Phụ Đề Nổi Trong Suốt & Click-Through'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isJa
                ? '常に最前面にピン留め可能。さらに「クリックスルー」モードをオンにすれば、字幕の下の資料やスライドをそのままマウスクリックして操作できます。'
                : isEn
                ? 'Pins on top of your Zoom call. Toggle click-through mode to interact with presentation slides beneath the subtitle overlay seamlessly.'
                : 'Thanh phụ đề nổi luôn ghim trên cùng màn hình. Bật chế độ xuyên thấu (Click-Through) để chuột click xuyên qua xem slide tài liệu mà không vướng víu.'}
            </p>
          </div>

          {/* Card 3: 100% RAM-Only Security */}
          <div className="p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isJa ? '完全RAMメモリ処理（音声非保存）' : isEn ? '100% RAM-Only Audio' : 'Bảo Mật 100% RAM-Only'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {isJa
                ? '音声データはRAM上でリアルタイム処理され、ディスクやクラウドに音声ファイルとして保存されることはありません。社内コンプライアンスを完全クリア。'
                : isEn
                ? 'Audio streams are transcribed strictly in memory and wiped immediately. Zero raw audio files stored on disk or cloud servers.'
                : 'Dữ liệu âm thanh được xử lý tức thời trong bộ nhớ đệm RAM và giải phóng ngay. Tuyệt đối không lưu file âm thanh trên ổ cứng hay server trung gian.'}
            </p>
          </div>

          {/* Card 4: Meeting Minutes & Action Items */}
          <div className="p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isJa ? '自動議事録＆アクション抽出' : isEn ? 'AI Meeting Minutes & Actions' : 'Biên Bản Họp & Action Items'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {isJa
                ? '会議中の決定事項や宿題（Action Items）をAIが自動判別。会議終了後、1クリックでMarkdownやPDF形式でローカルに保存できます。'
                : isEn
                ? 'Laya Sidecar tags decisions and action items automatically, exporting full formatted minutes to Markdown or PDF with one click.'
                : 'Laya Sidecar tự động phân loại quyết định và đầu việc cần làm, xuất ra biên bản hoàn chỉnh định dạng Markdown / PDF lưu ngay trong máy.'}
            </p>
          </div>

          {/* Card 5: Hybrid On-Device & BYOK */}
          <div className="p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isJa ? 'ハイブリッドAI（オフライン＋BYOK）' : isEn ? 'Hybrid AI (On-Device + BYOK)' : 'Linh Hoạt On-Device & BYOK'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {isJa
                ? '無料のSherpa-ONNXで完全オフライン動作（0円）。または自身のGroq/OpenAI/Geminiキーを入力して超高速LPU翻訳を利用可能です。'
                : isEn
                ? 'Runs offline for free with Sherpa-ONNX, or bring your own API keys (Groq, OpenAI, Gemini) directly from client without server fees.'
                : 'Chạy offline 100% miễn phí với Sherpa-ONNX trên CPU máy bạn, hoặc nhập API Key (Groq, OpenAI, Gemini) để dịch cực nhanh mà bạn không tốn phí duy trì server.'}
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. COMPARISON MATRIX TABLE ── */}
      <section id="comparison" className="space-y-10 scroll-mt-24">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
            <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Benchmark Comparison</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.comparisonTitle}
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            {t.comparisonSub}
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <th className="py-4 px-6">Tiêu chí so sánh</th>
                <th className="py-4 px-6 text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/50 dark:bg-blue-950/30">
                  LayaMeet Desktop
                </th>
                <th className="py-4 px-6 text-slate-500 dark:text-slate-400">Windows Live Captions</th>
                <th className="py-4 px-6 text-slate-500 dark:text-slate-400">Otter.ai / Fathom</th>
                <th className="py-4 px-6 text-slate-500 dark:text-slate-400">Google Meet Phụ đề</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                  Dịch song ngữ trực tiếp (Việt - Nhật - Anh)
                </td>
                <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4" /> Có (Hai chiều)
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Chỉ phụ đề 1 ngôn ngữ</td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Chỉ tiếng Anh</td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Chỉ dịch một số cặp hạn chế</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                  Bắt âm thanh Zoom/Meet không cần bot
                </td>
                <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4" /> Bắt trực tiếp (WASAPI)
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Có</td>
                <td className="py-4 px-6 text-red-500 dark:text-red-400 flex items-center gap-1">
                  <X className="w-4 h-4" /> Bắt buộc mời bot vào phòng
                </td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Chỉ dùng trong Google Meet</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                  Chế độ xuyên thấu chuột (Click-Through)
                </td>
                <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4" /> Có (Không vướng click)
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Không hỗ trợ</td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Không hỗ trợ</td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Không có overlay</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                  Bảo mật RAM-Only (Không lưu âm thanh)
                </td>
                <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4" /> 100% RAM-Only
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Xử lý cục bộ</td>
                <td className="py-4 px-6 text-red-500 dark:text-red-400 flex items-center gap-1">
                  <X className="w-4 h-4" /> Lưu âm thanh lên cloud bot
                </td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Lưu trữ trên máy chủ Google</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                  Chi phí máy chủ & Tùy chọn BYOK
                </td>
                <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4" /> 0đ (Tự do BYOK / On-Device)
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Miễn phí nhưng không dịch</td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Từ $10 - $30 / tháng</td>
                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">Gói Workspace trả phí</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 5. ENTERPRISE FAQ SECTION (Matches Schema.org FAQPage) ── */}
      <section id="faq" className="space-y-10 scroll-mt-24">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isJa ? 'よくあるご質問' : isEn ? 'Frequently Asked Questions' : 'Câu Hỏi Thường Gặp'}
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            {isJa
              ? 'LayaMeetの導入やセキュリティ、操作方法に関する疑問にお答えします。'
              : isEn
              ? 'Everything you need to know about LayaMeet desktop companion, privacy, and compatibility.'
              : 'Giải đáp nhanh mọi thắc mắc về cách cài đặt, bảo mật âm thanh và khả năng tương thích.'}
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full py-4 px-6 flex items-center justify-between text-left font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <span className="text-sm sm:text-base pr-4">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 animate-in fade-in duration-150">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 6. FINAL DOWNLOAD CTA BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-600 text-white p-8 sm:p-12 lg:p-16 text-center shadow-xl shadow-blue-500/20">
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-semibold">
            <Monitor className="w-3.5 h-3.5" />
            <span>Windows 10/11 & macOS Compatible</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            {t.ctaTitle}
          </h2>

          <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
            {t.ctaSub}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenDownload}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-blue-600 hover:bg-blue-50 font-bold text-base flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Download className="w-5 h-5 text-blue-600" />
              <span>Tải LayaMeet Cho Windows (.exe)</span>
            </button>
            <a
              href="https://github.com/DuHieu/AI-Translate-Meeting"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Xem Mã Nguồn GitHub</span>
              <ExternalLink className="w-4 h-4 opacity-80" />
            </a>
          </div>

          <p className="text-xs text-blue-200">
            Dung lượng chỉ 15 MB • Không cần thẻ tín dụng • Cài đặt trong 10 giây
          </p>
        </div>
      </section>
    </div>
  );
};
