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
  ArrowRight,
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
    compatLabel: isJa ? '対応プラットフォーム' : isEn ? 'SYSTEM COMPATIBILITY' : 'TƯƠNG THÍCH HỆ THỐNG',
    compatSub: isJa
      ? 'ボット招待不要。PCのサウンドカード（WASAPI Loopback）から直接キャプチャするため、あらゆる会議ソフトで動作します。'
      : isEn
      ? 'Works with any conferencing client by capturing system audio directly from your soundcard via WASAPI Loopback.'
      : 'Hoạt động độc lập với mọi phần mềm họp trực tuyến nhờ cơ chế bắt âm thanh trực tiếp từ card âm thanh Windows (WASAPI Loopback).',

    howIndex: '01 / QUY TRÌNH CÀI ĐẶT',
    howTitle: isJa
      ? '3ステップで導入完了'
      : isEn
      ? 'Three steps to start translating'
      : 'Ba bước cài đặt và sử dụng',
    howSub: isJa
      ? '管理者権限やサーバー設定は不要。既存の会議フローを一切変更せずに利用開始できます。'
      : isEn
      ? 'No administrator privileges or IT tickets required. Keep your existing meeting workflow intact.'
      : 'Không yêu cầu quyền Quản trị viên (Admin), không cần cấu hình mạng hay thay đổi quy trình họp của công ty.',

    step1Title: isJa ? 'インストーラーを実行' : isEn ? 'Run the user-space installer' : 'Tải và chạy bộ cài đặt',
    step1Desc: isJa
      ? `${DESKTOP_RELEASE.fileName}（${DESKTOP_RELEASE.sizeLabel}）を起動します。ユーザー領域にインストールされるため管理者権限は不要です。`
      : isEn
      ? `Launch ${DESKTOP_RELEASE.fileName} (${DESKTOP_RELEASE.sizeLabel}). Installs in your user profile without requiring Administrator privileges.`
      : `Khởi chạy ${DESKTOP_RELEASE.fileName} (${DESKTOP_RELEASE.sizeLabel}). Ứng dụng cài đặt trực tiếp vào thư mục người dùng cá nhân, không đòi quyền Admin.`,

    step2Title: isJa ? 'SmartScreenの確認' : isEn ? 'Confirm Windows SmartScreen' : 'Xác nhận khởi chạy trên Windows',
    step2Desc: isJa
      ? 'Windows SmartScreenが表示された場合は「詳細情報」→「実行」を選択してください。'
      : isEn
      ? 'If Windows SmartScreen prompts on first launch, select "More info" and click "Run anyway".'
      : 'Nếu Windows SmartScreen hiển thị hộp thoại xác nhận cho bản phát hành mới, chọn "More info" và nhấn "Run anyway".',

    step3Title: isJa ? '会議ソフトを開いて開始' : isEn ? 'Open your meeting as usual' : 'Vào cuộc họp như bình thường',
    step3Desc: isJa
      ? 'Zoom、Teams、Google Meetを開くと、自動的にシステム音声とマイクを分離認識し、最前面に二言語字幕を表示します。'
      : isEn
      ? 'Join Zoom, Teams, or Meet. LayaMeet automatically separates mic and speaker channels to display bilingual captions.'
      : 'Mở Zoom, Teams hoặc Google Meet. LayaMeet tự động tách kênh Micro và kênh Loa để hiển thị phụ đề song ngữ thời gian thực.',

    certLabel: isJa ? '発行元証明書 (.cer)' : isEn ? 'Publisher Certificate (.cer)' : 'Chứng chỉ nhà phát hành (.cer)',
    copy: isJa ? 'コピー' : isEn ? 'Copy' : 'Sao chép',
    copied: isJa ? 'コピー完了' : isEn ? 'Copied' : 'Đã sao chép',

    featIndex: '02 / KIẾN TRÚC KỸ THUẬT',
    featuresTitle: isJa
      ? '実務の会議のために設計されたコア機能'
      : isEn
      ? 'Engineered for real-world enterprise calls'
      : 'Kiến trúc âm thanh và phụ đề chuyên dụng',
    featuresSub: isJa
      ? 'クラウドボット方式の遅延やプライバシー懸念を解消するネイティブ設計。'
      : isEn
      ? 'Built to eliminate the latency, privacy risks, and awkwardness of cloud recording bots.'
      : 'Loại bỏ hoàn toàn độ trễ, rủi ro lộ dữ liệu và sự bất tiện của các con bot ghi âm đám mây truyền thống.',

    compIndex: '03 / SO SÁNH PHƯƠNG ÁN',
    comparisonTitle: isJa
      ? '既存の翻訳・字幕ツールとの違い'
      : isEn
      ? 'Technical comparison against alternatives'
      : 'So sánh kỹ thuật với các giải pháp hiện có',
    comparisonSub: isJa
      ? 'ボット不要・完全メモリ処理・双方向翻訳を両立。'
      : isEn
      ? 'How local WASAPI capture compares to OS captions and cloud meeting bots.'
      : 'Sự khác biệt giữa kiến trúc bắt âm thanh cục bộ WASAPI so với phụ đề hệ điều hành và bot đám mây.',

    faqIndex: '04 / CÂU HỎI THƯỜNG GẶP',
    faqTitle: isJa ? 'よくあるご質問' : isEn ? 'Frequently asked questions' : 'Câu hỏi kỹ thuật & bảo mật',
    faqSub: isJa
      ? '導入、音声処理、プライバシー保護に関する詳細回答。'
      : isEn
      ? 'Detailed answers regarding audio capture, RAM-only processing, and enterprise deployment.'
      : 'Giải đáp chi tiết về cơ chế bắt âm thanh, xử lý bộ nhớ tạm (RAM-Only) và khả năng triển khai.',

    ctaTitle: isJa
      ? '次回の会議から、リアルタイム双方向字幕を体験'
      : isEn
      ? 'Deploy LayaMeet Desktop for your next meeting'
      : 'Trải nghiệm phụ đề song ngữ ngay trong cuộc họp tới',
    ctaSub: isJa
      ? 'Windows 10/11対応。アカウント登録不要で今すぐテスト可能です。'
      : isEn
      ? 'Compatible with Windows 10 and 11 (64-bit). Ready to run in under a minute.'
      : 'Tương thích Windows 10 & 11 (64-bit). Cài đặt nhanh trong 60 giây, không yêu cầu thẻ tín dụng.',
  };

  const platforms = ['Zoom Workplace', 'Microsoft Teams', 'Google Meet', 'Cisco Webex', 'Slack Huddles'];

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
        ? 'LayaMeetはWindowsのサウンドカード（WASAPI Loopback）から直接システム音声をキャプチャし、最前面に透明な字幕オーバーレイを表示します。会議室にボットを招待したり、会議URLを共有する必要はありません。'
        : isEn
        ? 'LayaMeet captures dual-channel system audio directly via Windows WASAPI Loopback (your microphone input and speaker output) and renders an always-on-top subtitle bar. No bots join your call and no meeting links are shared.'
        : 'LayaMeet bắt trực tiếp luồng âm thanh 2 chiều qua giao thức Windows WASAPI Loopback (gồm kênh Micro của bạn và kênh Loa từ đối tác) và hiển thị thanh phụ đề nổi trên màn hình. Bạn không cần mời bot vào phòng hay chia sẻ đường dẫn cuộc họp.',
    },
    {
      q: isJa
        ? '100% RAM-Only（音声非保存）とはどういう仕組みですか？'
        : isEn
        ? 'What does 100% RAM-Only audio processing mean?'
        : 'Cơ chế bảo mật 100% RAM-Only hoạt động ra sao?',
      a: isJa
        ? 'キャプチャされた音声チャンク（350ms）はメモリ（RAM）上でのみ音声認識・翻訳され、処理直後にバッファから消去されます。ローカルディスクや外部ストレージに音声ファイルが書き込まれることはありません。'
        : isEn
        ? 'Captured 350ms audio chunks are transcribed and translated strictly in volatile memory (RAM) and overwritten immediately. Zero audio recordings are ever written to disk or stored on external servers.'
        : 'Các gói âm thanh 350ms chỉ được giải mã và dịch thuật trực tiếp trên bộ nhớ khả biến (RAM), sau đó bị ghi đè ngay lập tức. Hệ thống tuyệt đối không ghi bất kỳ tệp âm thanh nào xuống ổ cứng hay máy chủ lưu trữ.',
    },
    {
      q: isJa
        ? '実際の翻訳遅延はどのくらいですか？'
        : isEn
        ? 'What is the real-world transcription and translation latency?'
        : 'Độ trễ nhận diện và dịch thuật thực tế là bao nhiêu?',
      a: isJa
        ? 'CTranslate2（int8量子化）およびSherpa-ONNXストリーミングデコーダにより、350ms未満の応答速度を実現しています。話者の発話とほぼ同時に字幕が更新されます。'
        : isEn
        ? 'Using int8 quantized Faster-Whisper and Sherpa-ONNX transducer streaming, partial captions appear in under 350ms (median pipeline latency ~86ms).'
        : 'Nhờ kết hợp mô hình Faster-Whisper (lượng tử hóa int8) và bộ giải mã luồng Sherpa-ONNX, phụ đề tạm thời hiển thị dưới 350ms (độ trễ trung vị đạt ~86ms), bám sát tốc độ nói tự nhiên.',
    },
    {
      q: isJa
        ? '会議の相手側もアプリをインストールする必要がありますか？'
        : isEn
        ? 'Do other meeting participants need to install LayaMeet?'
        : 'Đối tác trong cuộc họp có cần cài đặt LayaMeet không?',
      a: isJa
        ? 'いいえ。相手側は通常のZoomやTeamsに参加するだけです。あなたのPC側で相手の音声をリアルタイム翻訳して表示します。'
        : isEn
        ? 'No. Other participants join Zoom, Teams, or Meet normally. LayaMeet runs locally on your workstation and translates incoming audio silently.'
        : 'Không. Đối tác vẫn sử dụng Zoom, Teams hoặc Google Meet bình thường. LayaMeet hoạt động độc lập trên máy tính của bạn để dịch âm thanh đầu vào.',
    },
    {
      q: isJa
        ? '独自のAI APIキー（BYOK）やオフライン動作は可能ですか？'
        : isEn
        ? 'Can I use my own API keys (BYOK) or run offline?'
        : 'Tôi có thể dùng API Key riêng (BYOK) hoặc chạy Offline không?',
      a: isJa
        ? 'はい。ローカルCPUでのSherpa-ONNXオフライン認識に加え、設定画面からご自身のGroq、OpenAI、Gemini APIキーを設定して利用できます。'
        : isEn
        ? 'Yes. You can run local offline recognition via Sherpa-ONNX on your CPU, or configure your own Groq, OpenAI, or Gemini API keys in Settings.'
        : 'Có. Bạn có thể chạy nhận diện giọng nói cục bộ trên CPU qua Sherpa-ONNX, hoặc tự cấu hình API Key riêng (Groq, OpenAI, Gemini) trong phần Cài đặt.',
    },
  ];

  const features = [
    {
      icon: Headphones,
      code: 'AUDIO_01',
      title: isJa ? '双方向WASAPI音声分離キャプチャ' : isEn ? 'Dual-channel WASAPI audio loopback' : 'Tách kênh âm thanh 2 chiều (WASAPI Loopback)',
      desc: isJa
        ? 'マイク入力（自分の声）とスピーカー出力（相手の声）をOSレベルで独立キャプチャし、混線なしで双方向翻訳を行います。'
        : isEn
        ? 'Independently captures your microphone input and system speaker output at the OS level for accurate bidirectional translation.'
        : 'Tách biệt hoàn toàn kênh Micro (giọng bạn nói) và kênh Loa hệ thống (giọng đối tác) ở tầng hệ điều hành, giúp dịch hai chiều chính xác không bị vọng âm.',
    },
    {
      icon: Eye,
      code: 'UI_02',
      title: isJa ? '最前面オーバーレイ＆マウス透過' : isEn ? 'Always-on-top & mouse click-through' : 'Thanh phụ đề nổi & Xuyên thấu chuột (Click-Through)',
      desc: isJa
        ? '会議画面の上に字幕バーを固定。クリックスルーを有効化すれば、字幕の背後にある資料やボタンをそのままクリックできます。'
        : isEn
        ? 'Pins a compact caption bar above your call. Enable click-through mode to interact with slides and windows directly underneath.'
        : 'Ghim thanh phụ đề gọn gàng phía trên màn hình họp. Khi bật chế độ Click-Through, thao tác chuột sẽ đi xuyên qua thanh phụ đề để bạn điều khiển slide bình thường.',
    },
    {
      icon: ShieldCheck,
      code: 'SEC_03',
      title: isJa ? '100% RAM-Only メモリ処理' : isEn ? '100% RAM-only ephemeral pipeline' : 'Xử lý hoàn toàn trên RAM (Zero Disk Write)',
      desc: isJa
        ? '音声ストリームはメモリ上でのみ処理され即時破棄されます。NDA契約下の機密会議でも音声データ漏洩リスクがありません。'
        : isEn
        ? 'Audio buffers exist only in RAM during inference and are immediately zeroed out. Ideal for NDA-bound executive meetings.'
        : 'Luồng âm thanh chỉ tồn tại trong bộ nhớ RAM vài trăm mili-giây để nhận diện rồi xóa sạch. Đáp ứng tiêu chuẩn bảo mật khắt khe cho các cuộc họp ký NDA.',
    },
    {
      icon: FileText,
      code: 'MIN_04',
      title: isJa ? '自動議事録＆アクション抽出' : isEn ? 'Automated minutes & action items' : 'Tổng hợp biên bản & Trích xuất đầu việc',
      desc: isJa
        ? '字幕表示をブロックすることなく、非同期サイドカーで決定事項とTODOを自動抽出しMarkdown/PDFへ出力します。'
        : isEn
        ? 'Asynchronously tags key decisions and action items during the call without blocking real-time subtitle rendering.'
        : 'Tự động đánh dấu các quyết định quan trọng và đầu việc (Action Items) theo thời gian thực, hỗ trợ xuất biên bản họp ra Markdown hoặc PDF.',
    },
    {
      icon: Cpu,
      code: 'ENG_05',
      title: isJa ? 'オンデバイス推論＋BYOK対応' : isEn ? 'Local ONNX inference + BYOK' : 'Chạy mô hình cục bộ (On-Device) & BYOK',
      desc: isJa
        ? 'Sherpa-ONNX / Faster-Whisperによるローカル実行と、Groq / OpenAI / Geminiの独自キー連携を自由に切り替えられます。'
        : isEn
        ? 'Switch seamlessly between local CPU inference (Sherpa-ONNX / Faster-Whisper) and your own cloud API keys.'
        : 'Linh hoạt chuyển đổi giữa mô hình chạy trực tiếp trên CPU máy tính (Sherpa-ONNX / Faster-Whisper) và API Key cá nhân (Groq, OpenAI, Gemini).',
    },
  ];

  const th = isJa
    ? ['評価基準', 'LayaMeet Desktop', 'Windows ライブキャプション', 'クラウド会議ボット (Otter等)', 'Google Meet 標準字幕']
    : isEn
    ? ['Specification', 'LayaMeet Desktop', 'Windows Live Captions', 'Cloud Bots (Otter / Fathom)', 'Built-in Meet Captions']
    : ['Tiêu chí kỹ thuật', 'LayaMeet Desktop', 'Windows Live Captions', 'Bot Đám Mây (Otter / Fathom)', 'Phụ đề sẵn có (Meet/Zoom)'];

  const rows: [string, string, string, string, string, boolean][] = [
    ['Dịch song ngữ hai chiều (Việt - Nhật - Anh)', 'Có (Song song 2 chiều)', 'Chỉ nhận diện 1 ngôn ngữ', 'Chủ yếu tiếng Anh', 'Giới hạn cặp ngôn ngữ', false],
    ['Cơ chế thu nhận âm thanh', 'Trực tiếp (WASAPI Loopback)', 'Trực tiếp (OS Audio)', 'Phải mời Bot vào phòng họp', 'Phụ thuộc nền tảng họp', true],
    ['Chế độ xuyên thấu chuột (Click-Through)', 'Có hỗ trợ', 'Không hỗ trợ', 'Không có thanh phụ đề nổi', 'Không hỗ trợ ngoài trình duyệt', false],
    ['Chính sách lưu trữ âm thanh', '100% RAM-Only (Không lưu file)', 'Xử lý cục bộ', 'Ghi âm & lưu trữ trên Cloud', 'Lưu trữ theo chính sách hãng', true],
    ['Tùy chọn BYOK / Chạy Offline trên máy', 'Hỗ trợ Sherpa-ONNX & BYOK', 'Không hỗ trợ dịch', 'Không hỗ trợ (Thuê bao cố định)', 'Không hỗ trợ', false],
  ];

  return (
    <div className="w-full divide-y divide-zinc-200 dark:divide-[#1E2025]">
      {/* ── 0. PLATFORM COMPATIBILITY BAR ── */}
      <section className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t.compatLabel}
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            {t.compatSub}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {platforms.map((name) => (
            <span
              key={name}
              className="px-3 py-1.5 rounded bg-zinc-100 dark:bg-[#14161B] border border-zinc-200 dark:border-[#242730] text-xs font-mono text-zinc-700 dark:text-zinc-300"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ── 1. INSTALLATION WORKFLOW (Architectural 3-Column Grid) ── */}
      <section id="how-it-works" className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 lg:py-24 scroll-mt-16 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-7 space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {t.howIndex}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
              {t.howTitle}
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {t.howSub}
            </p>
          </div>
        </div>

        {/* Hairline 3-Step Grid */}
        <ol className="grid grid-cols-1 md:grid-cols-3 border border-zinc-200 dark:border-[#22252C] rounded-lg divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-[#22252C] bg-white dark:bg-[#111317]">
          {[
            ['01', t.step1Title, t.step1Desc],
            ['02', t.step2Title, t.step2Desc],
            ['03', t.step3Title, t.step3Desc],
          ].map(([num, title, desc]) => (
            <li key={num} className="p-6 sm:p-7 space-y-3">
              <div className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                STEP {num}
              </div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {desc}
              </p>
            </li>
          ))}
        </ol>

        {/* Release Package Verification Bar */}
        <div className="rounded-lg border border-zinc-200 dark:border-[#242730] bg-zinc-100/70 dark:bg-[#13151A] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-bold font-mono text-zinc-950 dark:text-white">
                {DESKTOP_RELEASE.fileName}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-200/80 dark:bg-[#1E2129] text-zinc-700 dark:text-zinc-300">
                v{DESKTOP_RELEASE.version} · {DESKTOP_RELEASE.platform} · {DESKTOP_RELEASE.sizeLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 min-w-0">
              <span className="font-mono text-[11px] uppercase text-zinc-500 shrink-0">SHA-256:</span>
              <code className="break-all font-mono text-[11px] text-zinc-600 dark:text-zinc-400 bg-white dark:bg-[#0D0E11] px-2 py-0.5 rounded border border-zinc-200 dark:border-[#22252C]">
                {DESKTOP_RELEASE.sha256}
              </code>
              <button
                type="button"
                onClick={copyHash}
                className="shrink-0 inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t.copied : t.copy}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenDownload}
              className="px-4 py-2.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {isJa
                  ? `Windows版をダウンロード (${DESKTOP_RELEASE.sizeLabel})`
                  : isEn
                  ? `Download Installer (${DESKTOP_RELEASE.sizeLabel})`
                  : `Tải bộ cài Windows (${DESKTOP_RELEASE.sizeLabel})`}
              </span>
            </button>
            <a
              href={DESKTOP_RELEASE.certificateUrl}
              download
              className="px-4 py-2.5 rounded-md border border-zinc-300 dark:border-[#282C35] bg-white dark:bg-[#171A20] hover:bg-zinc-50 dark:hover:bg-[#1E222A] text-zinc-700 dark:text-zinc-200 font-medium text-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              {t.certLabel}
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. TECHNICAL ARCHITECTURE & FEATURES (Asymmetric Split) ── */}
      <section id="features" className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 lg:py-24 scroll-mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left 5 Columns: Sticky Section Header */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {t.featIndex}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight leading-snug">
              {t.featuresTitle}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {t.featuresSub}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenDownload}
                className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <span>
                  {isJa ? 'デスクトップ版を試す' : isEn ? 'Try LayaMeet on Windows' : 'Tải bản dùng thử cho Windows'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right 7 Columns: Structured Technical Specification Rows */}
          <div className="lg:col-span-7 border border-zinc-200 dark:border-[#22252C] rounded-lg divide-y divide-zinc-200 dark:divide-[#22252C] bg-white dark:bg-[#111317]">
            {features.map(({ icon: Icon, code, title, desc }) => (
              <div key={code} className="p-6 sm:p-7 flex items-start gap-4">
                <div className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-[#181B22] border border-zinc-200 dark:border-[#262930] flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">{code}</span>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">{title}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. TECHNICAL COMPARISON TABLE ── */}
      <section id="comparison" className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 lg:py-24 scroll-mt-16 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-7 space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {t.compIndex}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
              {t.comparisonTitle}
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {t.comparisonSub}
            </p>
          </div>
        </div>

        <div
          className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-[#22252C] bg-white dark:bg-[#111317]"
          role="region"
          aria-label={t.comparisonTitle}
          tabIndex={0}
        >
          <table className="w-full min-w-[800px] text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-[#22252C] bg-zinc-50 dark:bg-[#15181E] text-zinc-600 dark:text-zinc-300">
                {th.map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`py-3.5 px-5 font-semibold ${
                      i === 1
                        ? 'text-zinc-950 dark:text-white bg-blue-50/60 dark:bg-[#181D27] border-x border-zinc-200 dark:border-[#262B36]'
                        : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-[#1E2025] text-zinc-700 dark:text-zinc-300">
              {rows.map(([crit, laya, wlc, otter, meet, otterNeg]) => (
                <tr key={crit} className="hover:bg-zinc-50/80 dark:hover:bg-[#15171C] transition-colors">
                  <th scope="row" className="py-4 px-5 font-medium text-zinc-950 dark:text-white">
                    {crit}
                  </th>
                  <td className="py-4 px-5 font-semibold bg-blue-50/30 dark:bg-[#141821] border-x border-zinc-200 dark:border-[#222630] text-zinc-950 dark:text-white">
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      {laya}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-zinc-500 dark:text-zinc-400">{wlc}</td>
                  <td className="py-4 px-5">
                    {otterNeg ? (
                      <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                        <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{otter}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400">{otter}</span>
                    )}
                  </td>
                  <td className="py-4 px-5 text-zinc-500 dark:text-zinc-400">{meet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 4. FAQ SECTION (Asymmetric 5/7 Split) ── */}
      <section id="faq" className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 lg:py-24 scroll-mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {t.faqIndex}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
              {t.faqTitle}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {t.faqSub}
            </p>
          </div>

          <div className="lg:col-span-7 border border-zinc-200 dark:border-[#22252C] rounded-lg divide-y divide-zinc-200 dark:divide-[#22252C] bg-white dark:bg-[#111317]">
            {faqs.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-[#15181F] transition-colors"
                  >
                    <span className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-zinc-900 dark:text-white' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. CLEAN ARCHITECTURAL BOTTOM CTA ── */}
      <section className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16">
        <div className="rounded-lg border border-zinc-200 dark:border-[#242730] bg-white dark:bg-[#12141A] p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
              {t.ctaTitle}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t.ctaSub}
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onOpenDownload}
              className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {isJa
                  ? `Windows版をダウンロード (${DESKTOP_RELEASE.sizeLabel})`
                  : isEn
                  ? `Download for Windows (${DESKTOP_RELEASE.sizeLabel})`
                  : `Tải cho Windows (${DESKTOP_RELEASE.sizeLabel})`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
