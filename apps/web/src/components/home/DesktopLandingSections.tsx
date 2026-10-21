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

    step1Title: isJa ? 'インストーラーを実行' : isEn ? 'Download and run the installer' : 'Tải và chạy bộ cài đặt',
    step1Desc: isJa
      ? `${DESKTOP_RELEASE.fileName}（${DESKTOP_RELEASE.sizeLabel}）を実行します。ユーザー単位のインストールで管理者権限は不要です。`
      : isEn
      ? `Run ${DESKTOP_RELEASE.fileName} (${DESKTOP_RELEASE.sizeLabel}). It installs for your user only, so no Admin rights are needed.`
      : `Chạy ${DESKTOP_RELEASE.fileName} (${DESKTOP_RELEASE.sizeLabel}). Cài riêng cho tài khoản của bạn nên không cần quyền Admin.`,

    step2Title: isJa ? 'SmartScreenが表示されたら' : isEn ? 'If Windows SmartScreen appears' : 'Nếu Windows SmartScreen hiện cảnh báo',
    step2Desc: isJa
      ? '「詳細情報」→「実行」を選択してください。署名者は LayaMeet AI Technologies です。下の SHA-256 で整合性を確認できます。'
      : isEn
      ? 'Choose "More info" then "Run anyway". The publisher is LayaMeet AI Technologies; verify the file with the SHA-256 below.'
      : 'Chọn "More info" rồi "Run anyway". Nhà phát hành là LayaMeet AI Technologies; có thể đối chiếu tệp bằng SHA-256 bên dưới.',

    step3Title: isJa ? '通常通り会議へ参加' : isEn ? 'Join your meeting as usual' : 'Vào họp như mọi ngày',
    step3Desc: isJa
      ? 'Zoom、Meet、Teamsを開くと、LayaMeetが音声を検知して最前面に二言語字幕を表示します。'
      : isEn
      ? 'Open Zoom, Meet or Teams. LayaMeet picks up the audio and shows bilingual subtitles on top of your screen.'
      : 'Mở Zoom, Meet hoặc Teams. LayaMeet tự bắt âm thanh và hiện phụ đề song ngữ nổi trên màn hình.',

    certLabel: isJa ? '発行元証明書 (.cer)' : isEn ? 'Publisher certificate (.cer)' : 'Chứng chỉ nhà phát hành (.cer)',
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
      : 'Tải ngay ứng dụng Windows miễn phí. Không cần thẻ tín dụng.',
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

  // [criteria, LayaMeet, WLC, Otter, Meet, otterIsNegative]
  const rows: [string, string, string, string, string, boolean][] = [
    ['Dịch song ngữ trực tiếp (Việt - Nhật - Anh)', 'Có (Hai chiều)', 'Chỉ phụ đề 1 ngôn ngữ', 'Chỉ tiếng Anh', 'Chỉ dịch một số cặp hạn chế', false],
    ['Bắt âm thanh Zoom/Meet không cần bot', 'Bắt trực tiếp (WASAPI)', 'Có', 'Bắt buộc mời bot vào phòng', 'Chỉ dùng trong Google Meet', true],
    ['Chế độ xuyên thấu chuột (Click-Through)', 'Có (Không vướng click)', 'Không hỗ trợ', 'Không hỗ trợ', 'Không có overlay', false],
    ['Bảo mật RAM-Only (Không lưu âm thanh)', '100% RAM-Only', 'Xử lý cục bộ', 'Lưu âm thanh lên cloud bot', 'Lưu trữ trên máy chủ Google', true],
    ['Chi phí máy chủ & Tùy chọn BYOK', '0đ (Tự do BYOK / On-Device)', 'Miễn phí nhưng không dịch', 'Từ $10 - $30 / tháng', 'Gói Workspace trả phí', false],
  ];

  const h2 = 'text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight';
  const lead = 'text-base text-slate-600 dark:text-slate-400 max-w-xl';
  const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

  return (
    <div className="w-full space-y-20 sm:space-y-24 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── 1. COMPATIBILITY ── */}
      <section className="text-center space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.compatTitle}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">{t.compatSub}</p>
        <ul className="flex flex-wrap justify-center gap-2 pt-2">
          {platforms.map((name) => (
            <li
              key={name}
              className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {name}
            </li>
          ))}
        </ul>
      </section>

      {/* ── 2. INSTALL IN 3 STEPS ── */}
      <section id="how-it-works" className="space-y-10 scroll-mt-24">
        <div className="space-y-3 text-center">
          <h2 className={h2}>{t.howTitle}</h2>
          <p className={`${lead} mx-auto`}>{t.howSub}</p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {[
            [t.step1Title, t.step1Desc],
            [t.step2Title, t.step2Desc],
            [t.step3Title, t.step3Desc],
          ].map(([title, desc], i) => (
            <li
              key={title}
              className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
            </li>
          ))}
        </ol>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex items-center gap-4 min-w-0 lg:flex-1">
            <img src="/layameet-icon-192.png" alt="" width={48} height={48} className="w-12 h-12 rounded-xl shrink-0" />
            <div className="min-w-0 space-y-1">
              <div className="text-base font-semibold text-slate-900 dark:text-white">
                {DESKTOP_RELEASE.fileName}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                v{DESKTOP_RELEASE.version} · {DESKTOP_RELEASE.platform} · {DESKTOP_RELEASE.sizeLabel}
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 min-w-0">
                <span className="font-semibold shrink-0">SHA-256</span>
                <code className="break-all font-mono">{DESKTOP_RELEASE.sha256}</code>
                <button
                  type="button"
                  onClick={copyHash}
                  className={`shrink-0 inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 font-semibold hover:underline cursor-pointer rounded ${focus}`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span aria-live="polite">{copied ? t.copied : t.copy}</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenDownload}
              className={`px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${focus}`}
            >
              <Download className="w-5 h-5" />
              <span>{isJa ? 'Windows版をダウンロード' : isEn ? 'Download for Windows' : 'Tải cho Windows'}</span>
            </button>
            <a
              href={DESKTOP_RELEASE.certificateUrl}
              download
              className={`px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-sm flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${focus}`}
            >
              {t.certLabel}
            </a>
          </div>
        </div>
      </section>

      {/* ── 3. FEATURES: one lead + list ── */}
      <section id="features" className="space-y-10 scroll-mt-24">
        <div className="space-y-3 text-center">
          <h2 className={h2}>{t.featuresTitle}</h2>
          <p className={`${lead} mx-auto`}>{t.featuresSub}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 p-6 sm:p-8 rounded-xl bg-blue-600 text-white space-y-4">
            <Headphones className="w-8 h-8" aria-hidden="true" />
            <h3 className="text-2xl font-bold">
              {isJa
                ? '双方向音声キャプチャ（WASAPIループバック）'
                : isEn
                ? 'Dual-channel WASAPI audio loopback'
                : 'Bắt âm thanh hệ thống 2 chiều (WASAPI Loopback)'}
            </h3>
            <p className="text-base text-blue-50 leading-relaxed">
              {isJa
                ? 'マイク（自分の声）とスピーカー（相手の声）を独立してキャプチャし、双方向に同時翻訳します。'
                : isEn
                ? 'Your microphone and the system output are captured separately. Their voice is translated into your language and yours into theirs, in real time.'
                : 'Tự tách tiếng Micro của bạn và tiếng Loa đối tác trong Zoom/Meet. Tiếng đối tác dịch sang ngôn ngữ của bạn; tiếng bạn nói dịch sang ngôn ngữ của đối tác.'}
            </p>
            <ul className="flex flex-wrap gap-2 text-sm font-medium">
              {[
                isJa ? 'マイク（自分）' : isEn ? 'Mic (you)' : 'Kênh Micro (Self)',
                isJa ? 'スピーカー（相手）' : isEn ? 'Speaker (attendee)' : 'Kênh Loa (Attendee)',
              ].map((chip) => (
                <li key={chip} className="px-3 py-1 rounded-lg bg-white/15">{chip}</li>
              ))}
            </ul>
          </div>

          <ul className="lg:col-span-2 divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {features.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="p-5 flex gap-4">
                <Icon className="w-5 h-5 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 4. COMPARISON ── */}
      <section id="comparison" className="space-y-10 scroll-mt-24">
        <div className="space-y-3 text-center">
          <h2 className={h2}>{t.comparisonTitle}</h2>
          <p className={`${lead} mx-auto`}>{t.comparisonSub}</p>
        </div>

        <div
          className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          role="region"
          aria-label={t.comparisonTitle}
          tabIndex={0}
        >
          <table className="w-full min-w-[820px] text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300">
                {th.map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`py-3.5 px-5 font-semibold ${i === 1 ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {rows.map(([crit, laya, wlc, otter, meet, otterNeg]) => (
                <tr key={crit}>
                  <th scope="row" className="py-4 px-5 font-semibold text-slate-900 dark:text-white">{crit}</th>
                  <td className="py-4 px-5 font-semibold bg-blue-50/60 dark:bg-blue-950/20">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <Check className="w-4 h-4 shrink-0" aria-hidden="true" /> {laya}
                    </span>
                  </td>
                  <td className="py-4 px-5">{wlc}</td>
                  <td className="py-4 px-5">
                    {otterNeg ? (
                      <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-400">
                        <X className="w-4 h-4 shrink-0" aria-hidden="true" /> {otter}
                      </span>
                    ) : (
                      otter
                    )}
                  </td>
                  <td className="py-4 px-5">{meet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 5. FAQ ── */}
      <section id="faq" className="space-y-10 scroll-mt-24">
        <div className="space-y-3 text-center">
          <h2 className={h2}>{isJa ? 'よくあるご質問' : isEn ? 'Frequently asked questions' : 'Câu hỏi thường gặp'}</h2>
          <p className={`${lead} mx-auto`}>
            {isJa
              ? 'LayaMeetの導入やセキュリティ、操作方法に関する疑問にお答えします。'
              : isEn
              ? 'Everything you need to know about the desktop app, privacy and compatibility.'
              : 'Giải đáp nhanh về cách cài đặt, bảo mật âm thanh và khả năng tương thích.'}
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className={`w-full py-4 px-5 flex items-center justify-between text-left font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer ${focus}`}
                >
                  <span className="text-base pr-4">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-500 shrink-0 transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 6. FINAL CTA ── */}
      <section className="rounded-xl bg-slate-900 dark:bg-slate-800 text-white p-8 sm:p-12 text-center">
        <div className="max-w-2xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight">{t.ctaTitle}</h2>
          <p className="text-base text-slate-300 leading-relaxed">{t.ctaSub}</p>
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={onOpenDownload}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base flex items-center justify-center gap-2.5 transition-colors cursor-pointer ${focus}`}
            >
              <Download className="w-5 h-5" />
              <span>
                {isJa ? 'Windows版をダウンロード' : isEn ? 'Download for Windows' : 'Tải LayaMeet cho Windows'} (
                {DESKTOP_RELEASE.sizeLabel})
              </span>
            </button>
          </div>
          <p className="text-sm text-slate-400">
            v{DESKTOP_RELEASE.version} · {DESKTOP_RELEASE.platform}
          </p>
        </div>
      </section>
    </div>
  );
};
