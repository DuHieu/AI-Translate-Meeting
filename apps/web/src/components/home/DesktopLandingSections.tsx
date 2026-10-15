import React from 'react';
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
  ArrowRight,
  Headphones,
  Sliders,
  ExternalLink,
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
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Workflow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t.howTitle}
          </h2>
          <p className="text-base text-slate-600 max-w-xl mx-auto">
            {t.howSub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <div className="relative p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shadow-2xs">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{t.step1Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t.step1Desc}</p>
            </div>
            <div className="pt-6 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1">
              <span>Windows 10/11 64-bit</span>
              <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-500" />
            </div>
          </div>

          <div className="relative p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shadow-2xs">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{t.step2Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t.step2Desc}</p>
            </div>
            <div className="pt-6 border-t border-slate-100 text-xs font-semibold text-indigo-600 flex items-center gap-1">
              <span>WASAPI Dual-Channel Loopback</span>
              <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-500" />
            </div>
          </div>

          <div className="relative p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg shadow-2xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{t.step3Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t.step3Desc}</p>
            </div>
            <div className="pt-6 border-t border-slate-100 text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <span>Always-On-Top & Click-Through</span>
              <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-500" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. BENTO GRID FEATURES ── */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Core Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t.featuresTitle}
          </h2>
          <p className="text-base text-slate-600 max-w-xl mx-auto">
            {t.featuresSub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: 2-Channel WASAPI Loopback (Col-span 2 on desktop) */}
          <div className="md:col-span-2 p-7 sm:p-9 rounded-3xl bg-gradient-to-br from-white via-white to-blue-50/40 border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">
              {isJa
                ? '双方向音声キャプチャ（WASAPIループバック）'
                : isEn
                ? 'Dual-Channel WASAPI Audio Loopback'
                : 'Bắt Âm Thanh Hệ Thống 2 Chiều (WASAPI Loopback)'}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {isJa
                ? 'マイク（自分の声）とスピーカー（Zoom/Meetの相手の声）を独立してキャプチャ。相手の声は自動で日本語に、あなたの声は自動で相手の言語（英語/ベトナム語）に双方向同時翻訳します。'
                : isEn
                ? 'Separates your microphone from system audio output automatically. The speaker voice translates into your language, while your voice translates into theirs in real-time.'
                : 'Tự động tách riêng tiếng Microphone của bạn và tiếng Loa đối tác trong Zoom/Meet. Tiếng đối tác tự động dịch sang Tiếng Việt cho bạn đọc; tiếng bạn nói tự dịch sang Tiếng Nhật/Anh cho đối tác.'}
            </p>
            <div className="pt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="px-3 py-1 rounded-full bg-white border border-slate-200/80 shadow-2xs">
                🎙️ Kênh Micro (Self)
              </span>
              <span className="px-3 py-1 rounded-full bg-white border border-slate-200/80 shadow-2xs">
                🎧 Kênh Loa (Attendee)
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
                ⚡ Độ trễ &lt; 350ms
              </span>
            </div>
          </div>

          {/* Card 2: Floating Translucent Overlay */}
          <div className="p-7 sm:p-9 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
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
          <div className="p-7 sm:p-9 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {isJa ? '完全RAMメモリ処理（音声非保存）' : isEn ? '100% RAM-Only Audio' : 'Bảo Mật 100% RAM-Only'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isJa
                ? '音声データはRAM上でリアルタイム処理され、ディスクやクラウドに音声ファイルとして保存されることはありません。社内コンプライアンスを完全クリア。'
                : isEn
                ? 'Audio streams are transcribed strictly in memory and wiped immediately. Zero raw audio files stored on disk or cloud servers.'
                : 'Dữ liệu âm thanh được xử lý tức thời trong bộ nhớ đệm RAM và giải phóng ngay. Tuyệt đối không lưu file âm thanh trên ổ cứng hay server trung gian.'}
            </p>
          </div>

          {/* Card 4: Meeting Minutes & Action Items */}
          <div className="p-7 sm:p-9 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {isJa ? '自動議事録＆アクション抽出' : isEn ? 'AI Meeting Minutes & Actions' : 'Biên Bản Họp & Action Items'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isJa
                ? '会議中の決定事項や宿題（Action Items）をAIが自動判別。会議終了後、1クリックでMarkdownやPDF形式でローカルに保存できます。'
                : isEn
                ? 'Laya Sidecar tags decisions and action items automatically, exporting full formatted minutes to Markdown or PDF with one click.'
                : 'Laya Sidecar tự động phân loại quyết định và đầu việc cần làm, xuất ra biên bản hoàn chỉnh định dạng Markdown / PDF lưu ngay trong máy.'}
            </p>
          </div>

          {/* Card 5: Hybrid On-Device & BYOK */}
          <div className="p-7 sm:p-9 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {isJa ? 'ハイブリッドAI（オフライン＋BYOK）' : isEn ? 'Hybrid AI (On-Device + BYOK)' : 'Linh Hoạt On-Device & BYOK'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
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
      <section className="space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Benchmark Comparison</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t.comparisonTitle}
          </h2>
          <p className="text-base text-slate-600 max-w-xl mx-auto">
            {t.comparisonSub}
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-700">
                <th className="py-4 px-6">Tiêu chí so sánh</th>
                <th className="py-4 px-6 text-blue-600 font-extrabold bg-blue-50/50">
                  LayaMeet Desktop
                </th>
                <th className="py-4 px-6 text-slate-500">Windows Live Captions</th>
                <th className="py-4 px-6 text-slate-500">Otter.ai / Fathom</th>
                <th className="py-4 px-6 text-slate-500">Google Meet Phụ đề</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-4 px-6 font-semibold text-slate-900">
                  Dịch song ngữ trực tiếp (Việt - Nhật - Anh)
                </td>
                <td className="py-4 px-6 font-bold text-blue-600 bg-blue-50/30">
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <Check className="w-4 h-4" /> Có (Hai chiều)
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-500">Chỉ phụ đề 1 ngôn ngữ</td>
                <td className="py-4 px-6 text-slate-500">Chỉ tiếng Anh</td>
                <td className="py-4 px-6 text-slate-500">Chỉ dịch một số cặp hạn chế</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-semibold text-slate-900">
                  Bắt âm thanh Zoom/Meet không cần bot
                </td>
                <td className="py-4 px-6 font-bold text-blue-600 bg-blue-50/30">
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <Check className="w-4 h-4" /> Bắt trực tiếp (WASAPI)
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-500">Có</td>
                <td className="py-4 px-6 text-red-500 flex items-center gap-1">
                  <X className="w-4 h-4" /> Bắt buộc mời bot vào phòng
                </td>
                <td className="py-4 px-6 text-slate-500">Chỉ dùng trong Google Meet</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-semibold text-slate-900">
                  Chế độ xuyên thấu chuột (Click-Through)
                </td>
                <td className="py-4 px-6 font-bold text-blue-600 bg-blue-50/30">
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <Check className="w-4 h-4" /> Có (Không vướng click)
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-500">Không hỗ trợ</td>
                <td className="py-4 px-6 text-slate-500">Không hỗ trợ</td>
                <td className="py-4 px-6 text-slate-500">Không có overlay</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-semibold text-slate-900">
                  Bảo mật RAM-Only (Không lưu âm thanh)
                </td>
                <td className="py-4 px-6 font-bold text-blue-600 bg-blue-50/30">
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <Check className="w-4 h-4" /> 100% RAM-Only
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-500">Xử lý cục bộ</td>
                <td className="py-4 px-6 text-red-500 flex items-center gap-1">
                  <X className="w-4 h-4" /> Lưu âm thanh lên cloud bot
                </td>
                <td className="py-4 px-6 text-slate-500">Lưu trữ trên máy chủ Google</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-semibold text-slate-900">
                  Chi phí máy chủ & Tùy chọn BYOK
                </td>
                <td className="py-4 px-6 font-bold text-blue-600 bg-blue-50/30">
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <Check className="w-4 h-4" /> 0đ (Tự do BYOK / On-Device)
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-500">Miễn phí nhưng không dịch</td>
                <td className="py-4 px-6 text-slate-500">Từ $10 - $30 / tháng</td>
                <td className="py-4 px-6 text-slate-500">Gói Workspace trả phí</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 5. FINAL DOWNLOAD CTA BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-600 text-white p-8 sm:p-12 lg:p-16 text-center shadow-xl shadow-blue-500/20">
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-semibold">
            <Monitor className="w-3.5 h-3.5" />
            <span>Windows 10/11 64-bit Compatible</span>
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
            Dung lượng chỉ 15 MB • Không cần thẻ tín dụng • Hoạt động ngay lập tức
          </p>
        </div>
      </section>
    </div>
  );
};
