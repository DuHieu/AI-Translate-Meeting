import React, { useState } from 'react';
import {
  Download,
  ShieldCheck,
  Eye,
  Cpu,
  FileText,
  Check,
  X,
  Headphones,
  ChevronDown,
  Copy,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import { DESKTOP_RELEASE } from '../../config/desktopRelease';

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
      ? 'Tất cả các nền tảng họp trực tuyến đều tương thích hoàn hảo'
      : isEn
      ? 'Seamlessly Compatible with All Video Conferencing Platforms'
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

    step1Title: isJa ? 'Tải bộ cài đặt' : isEn ? 'Download and run installer' : '1. Tải và chạy bộ cài đặt',
    step1Desc: isJa
      ? `${DESKTOP_RELEASE.fileName}（${DESKTOP_RELEASE.sizeLabel}）を実行します。ユーザー単位のインストールで管理者権限は不要です。`
      : isEn
      ? `Run ${DESKTOP_RELEASE.fileName} (${DESKTOP_RELEASE.sizeLabel}). Installs per-user without requiring Administrator rights.`
      : `Chạy ${DESKTOP_RELEASE.fileName} (${DESKTOP_RELEASE.sizeLabel}). Cài riêng cho tài khoản của bạn nên không cần quyền Admin.`,

    step2Title: isJa ? 'SmartScreenが表示されたら' : isEn ? 'If Windows SmartScreen prompts' : '2. Bấm "More info" rồi "Run anyway"',
    step2Desc: isJa
      ? '「詳細情報」→「実行」を選択してください。署名者は LayaMeet AI Technologies です。'
      : isEn
      ? 'Click "More info" then "Run anyway" when Windows SmartScreen prompts. App is safely built by LayaMeet.'
      : 'Do là file mới tải, nếu Windows hiện màn hình xanh SmartScreen, hãy nhấp "More info" (Xem thêm) rồi bấm "Run anyway" (Vẫn chạy).',

    step3Title: isJa ? 'Vào họp bình thường' : isEn ? 'Join meeting as usual' : '3. Vào họp và tận hưởng phụ đề',
    step3Desc: isJa
      ? 'Zoom、Meet、Teamsを開くと、LayaMeetが音声を検知して最前面に二言語字幕を表示します。'
      : isEn
      ? 'Open Zoom, Meet or Teams. LayaMeet automatically picks up audio and floats bilingual subtitles on screen.'
      : 'Mở Zoom, Meet hoặc Teams. LayaMeet tự động bắt âm thanh và hiển thị thanh phụ đề song ngữ nổi trước màn hình.',

    certLabel: isJa ? '発行元証明書 (.cer)' : isEn ? 'Publisher cert (.cer)' : 'Chứng chỉ nhà phát hành (.cer)',
    copy: isJa ? 'コピー' : isEn ? 'Copy' : 'Sao chép',
    copied: isJa ? 'コピーしました' : isEn ? 'Copied' : 'Đã sao chép',
    featSecondary: isJa ? 'その他の機能' : isEn ? 'And more' : 'Và còn nữa',

    featuresTitle: isJa
      ? 'ビジネスを加速する最先端AI機能'
      : isEn
      ? 'Enterprise-Grade Real-Time AI Features'
      : 'Tính Năng Đột Phá Cho Cuộc Họp Doanh Nghiệp',
    featuresSub: isJa
      ? '帯域幅コストをゼロにし、セキュリティと操作性を極限まで高めた設計'
      : isEn
      ? 'Zero cloud bandwidth overhead with maximum privacy and seamless UX.'
      : 'Thiết kế triệt tiêu chi phí máy chủ, bảo mật 100% RAM-Only và mang lại sự tiện ích vượt trội.',

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
      : 'Tải ngay ứng dụng Windows miễn phí. Không cần thẻ tín dụng, sẵn sàng sau 60 giây.',
  };

  const platforms = ['Google Meet', 'Zoom', 'Microsoft Teams', 'Slack Huddles', 'Cisco Webex', 'YouTube Live'];

  const [copied, setCopied] = useState(false);
  const copyHash = () => {
    void navigator.clipboard?.writeText(DESKTOP_RELEASE.sha256).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: isJa
        ? 'LayaMeetはZoomやGoogle Meet、Teamsとどのように連携しますか？'
        : isEn
        ? 'How does LayaMeet work with Zoom, Google Meet, and Teams?'
        : 'LayaMeet hoạt động với Zoom, Google Meet và Teams như thế nào?',
      a: isJa
        ? 'LayaMeetは軽量なデスクトップコンパニオンアプリです。PCのサウンドカード（WASAPI Loopback）から直接音声をキャプチャし、最前面に透明なリアルタイム字幕バーを表示します。ボットを招待したり会議リンクを変更する必要はありません。'
        : isEn
        ? 'LayaMeet is a lightweight desktop companion app. It captures dual-channel system audio directly via WASAPI Loopback (your microphone and the speaker output) and displays an always-on-top translucent subtitle bar. Zero bots, zero meeting link changes.'
        : 'LayaMeet là ứng dụng Desktop siêu nhẹ. Ứng dụng tự động bắt luồng âm thanh 2 chiều qua WASAPI Loopback (tiếng micro của bạn và tiếng loa đối tác) và hiển thị thanh phụ đề nổi trong suốt trên màn hình. Bạn không cần mời bot vào phòng hay đổi link họp.',
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
        : 'Hoàn toàn không. Đối tác chỉ cần tham gia Zoom, Google Meet hoặc Microsoft Teams như bình thường. Bạn có thể xem phụ đề nổi trực tiếp trên màn hình của mình mà đối tác không hề bị làm phiền.',
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

  const features = [
    {
      icon: Eye,
      title: isJa ? '最前面フローティング＆クリックスルー' : isEn ? 'Always-on-top & click-through' : 'Phụ đề nổi trong suốt & Click-Through',
      desc: isJa
        ? '常に最前面に表示。クリックスルーをオンにすれば、字幕の下の資料をそのまま操作できます。'
        : isEn
        ? 'Pinned above your call. Turn on click-through to interact with slides beneath the subtitles.'
        : 'Thanh phụ đề luôn ghim trên cùng. Bật Click-Through để chuột xuyên qua xem slide mà không vướng.',
    },
    {
      icon: ShieldCheck,
      title: isJa ? '完全RAM処理（音声非保存）' : isEn ? '100% RAM-only audio' : 'Bảo mật 100% RAM-Only',
      desc: isJa
        ? '音声はメモリ上で処理後すぐ破棄され、ディスクやクラウドに保存されません。'
        : isEn
        ? 'Audio is processed in memory and discarded at once. Nothing is stored on disk or in the cloud.'
        : 'Âm thanh được xử lý trong RAM rồi giải phóng ngay, không lưu xuống ổ cứng hay server trung gian.',
    },
    {
      icon: FileText,
      title: isJa ? '自動議事録＆アクション抽出' : isEn ? 'AI minutes & action items' : 'Biên bản họp & Action Items',
      desc: isJa
        ? '決定事項と宿題をAIが自動判別し、Markdown/PDFで出力できます。'
        : isEn
        ? 'Decisions and action items are tagged automatically and exported as Markdown or PDF.'
        : 'Tự động phân loại quyết định và đầu việc, xuất biên bản Markdown / PDF.',
    },
    {
      icon: Cpu,
      title: isJa ? 'オンデバイス＋BYOK' : isEn ? 'On-device + BYOK' : 'On-Device & BYOK',
      desc: isJa
        ? 'Sherpa-ONNXでオフライン動作、またはご自身のGroq/OpenAI/Geminiキーを利用できます。'
        : isEn
        ? 'Run offline with Sherpa-ONNX, or bring your own Groq, OpenAI or Gemini key.'
        : 'Chạy offline với Sherpa-ONNX trên CPU của bạn, hoặc nhập API Key riêng (Groq, OpenAI, Gemini).',
    },
  ];

  const th = isJa
    ? ['比較項目', 'LayaMeet Desktop', 'Windows ライブキャプション', 'Otter.ai / Fathom', 'Google Meet 字幕']
    : isEn
    ? ['Criteria', 'LayaMeet Desktop', 'Windows Live Captions', 'Otter.ai / Fathom', 'Google Meet captions']
    : ['Tiêu chí so sánh', 'LayaMeet Desktop', 'Windows Live Captions', 'Otter.ai / Fathom', 'Google Meet Phụ đề'];

  const rows: [string, string, string, string, string, boolean][] = [
    ['Dịch song ngữ trực tiếp (Việt - Nhật - Anh)', 'Có (Hai chiều)', 'Chỉ phụ đề 1 ngôn ngữ', 'Chỉ tiếng Anh', 'Chỉ dịch một số cặp hạn chế', false],
    ['Bắt âm thanh Zoom/Meet không cần bot', 'Bắt trực tiếp (WASAPI)', 'Có', 'Bắt buộc mời bot vào phòng', 'Chỉ dùng trong Google Meet', true],
    ['Chế độ xuyên thấu chuột (Click-Through)', 'Có (Không vướng click)', 'Không hỗ trợ', 'Không hỗ trợ', 'Không có overlay', false],
    ['Bảo mật RAM-Only (Không lưu âm thanh)', '100% RAM-Only', 'Xử lý cục bộ', 'Lưu âm thanh lên cloud bot', 'Lưu trữ trên máy chủ Google', true],
    ['Chi phí máy chủ & Tùy chọn BYOK', '0đ (Tự do BYOK / On-Device)', 'Miễn phí nhưng không dịch', 'Từ $10 - $30 / tháng', 'Gói Workspace trả phí', false],
  ];

  return (
    <div className="w-full space-y-24 sm:space-y-32 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── 1. COMPATIBILITY STRIP ── */}
      <section className="text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold uppercase tracking-wider text-sky-400">
          <Layers className="w-3.5 h-3.5" />
          <span>Tương Thích Mọi Nền Tảng</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{t.compatTitle}</h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">{t.compatSub}</p>
        <div className="flex flex-wrap justify-center gap-2.5 pt-3">
          {platforms.map((name) => (
            <div
              key={name}
              className="px-4 py-2 rounded-xl bg-[#0B0F19]/80 border border-white/[0.08] hover:border-sky-500/30 text-sm font-medium text-slate-200 backdrop-blur-md shadow-sm transition-all hover:-translate-y-0.5"
            >
              {name}
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. INSTALL IN 3 STEPS (Bento Step Cards) ── */}
      <section id="how-it-works" className="space-y-12 scroll-mt-24">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Sẵn Sàng Trong 60 Giây</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{t.howTitle}</h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto leading-relaxed">{t.howSub}</p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            [t.step1Title, t.step1Desc],
            [t.step2Title, t.step2Desc],
            [t.step3Title, t.step3Desc],
          ].map(([title, desc], i) => (
            <li
              key={title}
              className="p-7 rounded-2xl bg-[#0B0F19]/60 border border-white/[0.08] hover:border-sky-500/30 backdrop-blur-xl space-y-4 shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white text-base font-bold flex items-center justify-center shadow-lg shadow-sky-500/25">
                {i + 1}
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
            </li>
          ))}
        </ol>

        {/* Binary Info & Direct Download Box */}
        <div className="rounded-2xl border border-white/[0.12] bg-gradient-to-r from-sky-950/20 via-[#0B0F19] to-indigo-950/20 p-6 sm:p-8 backdrop-blur-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-sky-500/25">
              <Download className="w-7 h-7" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="text-lg font-bold text-white">
                {DESKTOP_RELEASE.fileName}
              </div>
              <div className="text-xs sm:text-sm text-slate-400">
                v{DESKTOP_RELEASE.version} · {DESKTOP_RELEASE.platform} · {DESKTOP_RELEASE.sizeLabel}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0 pt-0.5">
                <span className="font-semibold text-slate-300 shrink-0">SHA-256</span>
                <code className="break-all font-mono text-[11px] text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">{DESKTOP_RELEASE.sha256}</code>
                <button
                  type="button"
                  onClick={copyHash}
                  className="shrink-0 inline-flex items-center gap-1 text-sky-400 font-semibold hover:text-sky-300 cursor-pointer rounded transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? t.copied : t.copy}</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenDownload}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isJa ? 'Windows版をダウンロード' : isEn ? 'Download for Windows' : 'Tải Cho Windows (23.2 MB)'}</span>
            </button>
            <a
              href={DESKTOP_RELEASE.certificateUrl}
              download
              className="px-5 py-3.5 rounded-2xl border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 font-semibold text-sm flex items-center justify-center transition-colors cursor-pointer"
            >
              {t.certLabel}
            </a>
          </div>
        </div>
      </section>

      {/* ── 3. FEATURES BENTO GRID ── */}
      <section id="features" className="space-y-12 scroll-mt-24">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Công Nghệ AI Cốt Lõi</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{t.featuresTitle}</h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto leading-relaxed">{t.featuresSub}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main Hero Bento Card (WASAPI Dual-Channel) */}
          <div className="lg:col-span-3 p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 text-white space-y-6 shadow-2xl relative overflow-hidden border border-white/20">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Headphones className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {isJa
                  ? '双方向音声キャプチャ（WASAPIループバック）'
                  : isEn
                  ? 'Dual-channel WASAPI Audio Loopback'
                  : 'Bắt Âm Thanh Hệ Thống 2 Chiều (WASAPI Loopback)'}
              </h3>
              <p className="text-blue-100 text-base leading-relaxed">
                {isJa
                  ? 'マイク（自分の声）とスピーカー（相手の声）を独立してキャプチャし、双方向に同時翻訳します。'
                  : isEn
                  ? 'Your microphone and speaker output are captured separately. Their voice translates into your language and yours into theirs, in real time.'
                  : 'Tự tách riêng tiếng Micro của bạn và tiếng Loa đối tác trong Zoom/Meet. Tiếng đối tác dịch sang ngôn ngữ của bạn; tiếng bạn nói dịch sang ngôn ngữ của đối tác.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 pt-2 text-xs font-semibold">
              {[
                isJa ? 'マイク（自分）' : isEn ? 'Mic Channel (Self)' : '🎤 Kênh Micro (Giọng Bạn)',
                isJa ? 'スピーカー（相手）' : isEn ? 'Speaker Channel (Attendee)' : '🔊 Kênh Loa (Đối Tác)',
                '⚡ <350ms Latency',
              ].map((chip) => (
                <div key={chip} className="px-3.5 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20">{chip}</div>
              ))}
            </div>
          </div>

          {/* 4 Feature Bento List */}
          <div className="lg:col-span-2 grid grid-cols-1 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-5 rounded-2xl bg-[#0B0F19]/60 border border-white/[0.08] hover:border-sky-500/30 backdrop-blur-xl flex gap-4 transition-all hover:-translate-y-0.5 shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">{title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. COMPARISON MATRIX ── */}
      <section id="comparison" className="space-y-12 scroll-mt-24">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold uppercase tracking-wider text-sky-400">
            <Shield className="w-3.5 h-3.5" />
            <span>So Sánh Giải Pháp</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{t.comparisonTitle}</h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto leading-relaxed">{t.comparisonSub}</p>
        </div>

        <div
          className="overflow-x-auto rounded-3xl border border-white/[0.08] bg-[#0B0F19]/80 backdrop-blur-xl shadow-2xl"
          role="region"
          aria-label={t.comparisonTitle}
          tabIndex={0}
        >
          <table className="w-full min-w-[820px] text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.03] text-slate-300">
                {th.map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`py-4 px-6 font-bold ${i === 1 ? 'text-sky-400 bg-sky-500/10 border-x border-sky-500/20' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-slate-300">
              {rows.map(([crit, laya, wlc, otter, meet, otterNeg]) => (
                <tr key={crit} className="hover:bg-white/[0.02] transition-colors">
                  <th scope="row" className="py-4 px-6 font-semibold text-white">{crit}</th>
                  <td className="py-4 px-6 font-bold bg-sky-500/5 border-x border-sky-500/10 text-emerald-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      {laya}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-400">{wlc}</td>
                  <td className="py-4 px-6">
                    {otterNeg ? (
                      <span className="inline-flex items-center gap-1.5 text-rose-400">
                        <X className="w-4 h-4 shrink-0" /> {otter}
                      </span>
                    ) : (
                      <span className="text-slate-400">{otter}</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-400">{meet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 5. FAQ ACCORDION ── */}
      <section id="faq" className="space-y-12 scroll-mt-24">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold uppercase tracking-wider text-sky-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Hỏi & Đáp</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isJa ? 'よくあるご質問' : isEn ? 'Frequently Asked Questions' : 'Câu Hỏi Thường Gặp'}
          </h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            {isJa
              ? 'LayaMeetの導入やセキュリティ、操作方法に関する疑問にお答えします。'
              : isEn
              ? 'Everything you need to know about the desktop app, privacy and compatibility.'
              : 'Giải đáp nhanh về cách cài đặt, bảo mật âm thanh và khả năng tương thích.'}
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={item.q}
                className="rounded-2xl border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl overflow-hidden transition-all shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
                >
                  <span className="text-base font-bold text-white">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-sky-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed border-t border-white/[0.06] pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 6. BOTTOM CALL TO ACTION ── */}
      <section className="text-center p-10 sm:p-14 rounded-3xl bg-gradient-to-br from-sky-500/20 via-indigo-600/10 to-transparent border border-white/[0.12] backdrop-blur-2xl shadow-2xl space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{t.ctaTitle}</h2>
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">{t.ctaSub}</p>
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={onOpenDownload}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-base flex items-center gap-2.5 shadow-2xl shadow-sky-500/30 hover:shadow-sky-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>{isJa ? 'Windows版を無料ダウンロード' : isEn ? 'Download for Windows Free' : 'Tải Cho Windows Miễn Phí (23.2 MB)'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </section>
    </div>
  );
};
