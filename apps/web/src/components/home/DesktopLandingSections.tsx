import React, { useState } from 'react';
import {
  Download,
  ShieldCheck,
  Video,
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
    featIndex: '01 · PHÂN HỆ CỐT LÕI',
    featuresTitle: isJa ? '主要モジュール' : isEn ? 'Core System Modules' : '4 Phân hệ tích hợp độc lập',

    howIndex: '02 · TRIỂN KHAI',
    howTitle: isJa ? '3ステップで開始' : isEn ? '3-Step Deployment' : 'Bắt đầu trong 3 bước',

    step1Title: isJa ? 'インストール' : isEn ? 'Install App' : 'Cài đặt ứng dụng',
    step1Desc: isJa
      ? `${DESKTOP_RELEASE.fileName} を起動（管理者権限不要）。`
      : isEn
      ? `Run ${DESKTOP_RELEASE.fileName} (No Admin rights needed).`
      : `Chạy ${DESKTOP_RELEASE.fileName} (${DESKTOP_RELEASE.sizeLabel}), không cần quyền Admin.`,

    step2Title: isJa ? '会議室を作成' : isEn ? 'Create Room' : 'Tạo hoặc vào phòng',
    step2Desc: isJa
      ? '会議コード（MEET-xxx）を発行して共有。'
      : isEn
      ? 'Generate or enter a room code (MEET-xxx).'
      : 'Tạo mã phòng tức thì (MEET-xxx) và gửi cho đối tác.',

    step3Title: isJa ? '双方向通訳' : isEn ? 'Speak Naturally' : 'Họp & dịch trực tiếp',
    step3Desc: isJa
      ? '<350msで二言語字幕・音声通訳・議事録を生成。'
      : isEn
      ? 'Live <350ms subtitles, voice dubbing & AI minutes.'
      : 'Hiển thị phụ đề <350ms, lồng tiếng AI và xuất biên bản.',

    certLabel: isJa ? '証明書 (.cer)' : isEn ? 'Certificate (.cer)' : 'Chứng chỉ (.cer)',
    copy: isJa ? 'コピー' : isEn ? 'Copy' : 'Sao chép',
    copied: isJa ? '完了' : isEn ? 'Copied' : 'Đã chép',

    compIndex: '03 · ĐỐI CHIẾU',
    comparisonTitle: isJa ? '仕様比較' : isEn ? 'System Comparison' : 'Đối chiếu năng lực kỹ thuật',

    faqIndex: '04 · HỎI ĐÁP',
    faqTitle: isJa ? 'よくある質問' : isEn ? 'Technical FAQ' : 'Câu hỏi thường gặp',

    ctaTitle: isJa ? 'LayaMeetを導入する' : isEn ? 'Deploy LayaMeet Today' : 'Sẵn sàng triển khai LayaMeet',
    ctaSub: isJa ? 'Windows 10/11 (64-bit) 対応' : isEn ? 'Windows 10/11 (64-bit) · Free download' : 'Tương thích Windows 10 & 11 (64-bit) · Cài đặt trong 60 giây.',
  };

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
        ? '他の会議ソフトは必要ですか？'
        : isEn
        ? 'Does LayaMeet require any other software?'
        : 'Có cần cài thêm phần mềm họp nào khác không?',
      a: isJa
        ? '不要です。ビデオ通話・画面共有・同時通訳を備えた完全独立型システムです。'
        : isEn
        ? 'No. LayaMeet is a standalone platform with built-in HD video rooms, screen sharing, and live translation.'
        : 'Không. LayaMeet là nền tảng độc lập tích hợp sẵn gọi Video/Audio, chia sẻ màn hình và dịch song ngữ.',
    },
    {
      q: isJa
        ? '100% RAM-Onlyとは？'
        : isEn
        ? 'How does 100% RAM-Only security work?'
        : 'Bảo mật 100% RAM-Only hoạt động thế nào?',
      a: isJa
        ? '音声はメモリ上でのみ処理され即時消去されます。ディスクには一切保存されません。'
        : isEn
        ? 'Audio is processed strictly in volatile RAM and wiped immediately. Zero audio files are written to disk.'
        : 'Âm thanh chỉ xử lý trên bộ nhớ RAM rồi xóa tức thì, tuyệt đối không lưu tệp ghi âm xuống ổ cứng.',
    },
    {
      q: isJa
        ? '専門用語辞書やBYOKは使えますか？'
        : isEn
        ? 'Are custom glossaries and BYOK supported?'
        : 'Có hỗ trợ Từ điển riêng (Glossary) và BYOK không?',
      a: isJa
        ? 'はい。社内用語辞書の登録、ローカルONNX推論、独自APIキー設定に対応しています。'
        : isEn
        ? 'Yes. Configure custom domain glossaries, run local Sherpa-ONNX models, or use your own API keys.'
        : 'Có. Hỗ trợ nạp từ điển chuyên ngành, chạy mô hình Sherpa-ONNX cục bộ hoặc gắn API Key riêng.',
    },
  ];

  const modules = [
    {
      icon: Video,
      code: 'MOD_01',
      title: isJa ? 'WebRTC ビデオ会議室' : isEn ? 'Standalone WebRTC Rooms' : 'Phòng họp Video WebRTC',
      desc: isJa
        ? 'HD映像・画面共有・待機室・ホスト管理機能を標準搭載。'
        : isEn
        ? 'HD video, screen sharing, waiting room, and host lock/mute controls.'
        : 'Gọi HD Video/Audio, chia sẻ màn hình, phòng chờ duyệt khách và khóa phòng.',
    },
    {
      icon: Headphones,
      code: 'MOD_02',
      title: isJa ? '二言語字幕＆AI音声通訳' : isEn ? 'Live Subtitles & Voice Dubbing' : 'Phụ đề & Lồng tiếng AI (<350ms)',
      desc: isJa
        ? '日・越・英の同時字幕と自然なAI音声吹き替え（TTS）。'
        : isEn
        ? 'Instant VI / JA / EN bilingual captions and neural TTS voice dubbing.'
        : 'Dịch song ngữ Việt – Nhật – Anh hai chiều kèm thuyết minh giọng nói qua tai nghe.',
    },
    {
      icon: ShieldCheck,
      code: 'MOD_03',
      title: isJa ? '100% RAM-Only 機密保護' : isEn ? '100% RAM-Only Governance' : 'Bảo mật 100% RAM-Only',
      desc: isJa
        ? '音声はRAM上でのみ処理され即時破棄。録音データ非保存。'
        : isEn
        ? 'Volatile memory inference with client-side VAD noise suppression.'
        : 'Lọc ồn thông minh và xử lý hoàn toàn trên RAM, không lưu file ghi âm.',
    },
    {
      icon: FileText,
      code: 'MOD_04',
      title: isJa ? '自動議事録＆用語辞書' : isEn ? 'AI Minutes & Domain Glossary' : 'Biên bản tự động & Từ điển riêng',
      desc: isJa
        ? '決定事項・TODOを自動抽出しMarkdown/PDF出力。専門辞書対応。'
        : isEn
        ? 'Extracts decisions and action items to Markdown/PDF with custom glossary support.'
        : 'Tự động trích xuất quyết định, đầu việc (Action Items) và chuẩn hóa thuật ngữ công ty.',
    },
  ];

  const th = isJa
    ? ['機能', 'LayaMeet', '一般的な会議ソフト', '外部通訳ボット']
    : isEn
    ? ['Capability', 'LayaMeet Suite', 'Standard Video Apps', 'External Bots']
    : ['Tiêu chí', 'LayaMeet Suite', 'App họp thông thường', 'Bot dịch bên thứ ba'];

  const rows: [string, string, string, string, boolean][] = [
    ['Phòng họp Video & Chia sẻ màn hình', 'Tích hợp sẵn (WebRTC)', 'Có', 'Không có', false],
    ['Phụ đề song ngữ Việt - Nhật - Anh', 'Có sẵn (<350ms, 2 chiều)', 'Hạn chế', 'Độ trễ 2 - 5 giây', true],
    ['Cabin thuyết minh giọng nói AI', 'Có sẵn', 'Không có', 'Không có', false],
    ['Bảo mật 100% RAM-Only', 'Không lưu tệp âm thanh', 'Lưu trên Cloud', 'Bắt buộc ghi âm', true],
    ['Biên bản họp & Action Items', 'Tự động xuất MD/PDF', 'Mua gói Add-on', 'Chỉ tiếng Anh', false],
  ];

  return (
    <div className="w-full space-y-16 pb-16">
      {/* ── 1. COMPACT 2x2 ERP MODULES GRID ── */}
      <section id="features" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20 space-y-6">
        <div className="border-b border-slate-300 dark:border-slate-800 pb-3 flex items-baseline justify-between">
          <div>
            <span className="text-[11px] font-mono font-semibold text-[#0F766E] dark:text-teal-400">
              {t.featIndex}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {t.featuresTitle}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map(({ icon: Icon, code, title, desc }) => (
            <div
              key={code}
              className="p-5 rounded-xl bg-[#E4E9F0] dark:bg-[#151A22] border border-slate-300 dark:border-slate-800 flex items-start gap-4"
            >
              <div className="w-9 h-9 rounded-lg bg-[#D0D8E3] dark:bg-[#1E2633] border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[#0F766E] dark:text-teal-400 shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">{code}</span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    {title}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. CONCISE 3-STEP DEPLOYMENT ── */}
      <section id="how-it-works" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20 space-y-6">
        <div className="border-b border-slate-300 dark:border-slate-800 pb-3">
          <span className="text-[11px] font-mono font-semibold text-[#0F766E] dark:text-teal-400">
            {t.howIndex}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {t.howTitle}
          </h2>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ['01', t.step1Title, t.step1Desc],
            ['02', t.step2Title, t.step2Desc],
            ['03', t.step3Title, t.step3Desc],
          ].map(([num, title, desc]) => (
            <li
              key={num}
              className="p-5 rounded-xl bg-[#E4E9F0] dark:bg-[#151A22] border border-slate-300 dark:border-slate-800 space-y-2"
            >
              <span className="text-[11px] font-mono font-bold text-[#0F766E] dark:text-teal-400">
                STEP {num}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {desc}
              </p>
            </li>
          ))}
        </ol>

        {/* Compact Release Bar */}
        <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#151A22] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                {DESKTOP_RELEASE.fileName}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#D0D8E3] dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                v{DESKTOP_RELEASE.version} · {DESKTOP_RELEASE.sizeLabel}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
              <span className="font-mono shrink-0">SHA-256:</span>
              <code className="truncate font-mono text-[10px] text-slate-600 dark:text-slate-400 max-w-[220px] sm:max-w-md">
                {DESKTOP_RELEASE.sha256}
              </code>
              <button
                type="button"
                onClick={copyHash}
                className="shrink-0 inline-flex items-center gap-1 text-[#0F766E] dark:text-teal-400 hover:underline font-semibold cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? t.copied : t.copy}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenDownload}
              className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Windows ({DESKTOP_RELEASE.sizeLabel})</span>
            </button>
            <a
              href={DESKTOP_RELEASE.certificateUrl}
              download
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-[#D8DEE6] dark:bg-[#1C222D] text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              {t.certLabel}
            </a>
          </div>
        </div>
      </section>

      {/* ── 3. COMPACT COMPARISON TABLE ── */}
      <section id="comparison" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20 space-y-6">
        <div className="border-b border-slate-300 dark:border-slate-800 pb-3">
          <span className="text-[11px] font-mono font-semibold text-[#0F766E] dark:text-teal-400">
            {t.compIndex}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {t.comparisonTitle}
          </h2>
        </div>

        <div
          className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#151A22]"
          role="region"
          aria-label={t.comparisonTitle}
          tabIndex={0}
        >
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 dark:border-slate-800 bg-[#D0D8E3] dark:bg-[#11151C] text-slate-700 dark:text-slate-300">
                {th.map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`py-3 px-4 font-semibold ${
                      i === 1 ? 'text-[#0F766E] dark:text-teal-300' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300/80 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {rows.map(([crit, laya, std, bot, botNeg]) => (
                <tr key={crit}>
                  <th scope="row" className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {crit}
                  </th>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400 shrink-0" />
                      {laya}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{std}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {botNeg ? (
                      <span className="inline-flex items-center gap-1">
                        <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{bot}</span>
                      </span>
                    ) : (
                      bot
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 4. CONCISE FAQ + CTA ROW ── */}
      <section id="faq" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: 3 Essential FAQs */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <span className="text-[11px] font-mono font-semibold text-[#0F766E] dark:text-teal-400">
                {t.faqIndex}
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {t.faqTitle}
              </h2>
            </div>

            <div className="border border-slate-300 dark:border-slate-800 rounded-xl divide-y divide-slate-300 dark:divide-slate-800 bg-[#E4E9F0] dark:bg-[#151A22] overflow-hidden">
              {faqs.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={item.q}>
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer hover:bg-[#D8E0EA] dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-150 ${
                          isOpen ? 'rotate-180 text-[#0F766E] dark:text-teal-400' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 5 Cols: Direct Deployment Card */}
          <div className="lg:col-span-5 p-6 rounded-xl border border-slate-300 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#151A22] space-y-4 lg:mt-11">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t.ctaTitle}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t.ctaSub}
            </p>
            <button
              type="button"
              onClick={onOpenDownload}
              className="w-full py-2.5 px-4 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải cho Windows ({DESKTOP_RELEASE.sizeLabel})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
