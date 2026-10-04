import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Globe, Zap, ShieldCheck, CheckCircle2, Play, Pause, Sparkles } from 'lucide-react';

// Lightweight, razor-sharp inline SVG flags for universal cross-platform rendering
const FlagJP: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => (
  <svg className={`${className} rounded-[2px] overflow-hidden inline-block shrink-0 shadow-xs border border-zinc-200 dark:border-zinc-700`} viewBox="0 0 900 600">
    <rect width="900" height="600" fill="#ffffff" />
    <circle cx="450" cy="300" r="180" fill="#bc002d" />
  </svg>
);

const FlagVN: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => (
  <svg className={`${className} rounded-[2px] overflow-hidden inline-block shrink-0 shadow-xs border border-zinc-200 dark:border-zinc-700`} viewBox="0 0 900 600">
    <rect width="900" height="600" fill="#da251d" />
    <polygon points="450,150 491,277 625,277 516,356 558,483 450,404 342,483 384,356 275,277 409,277" fill="#ffff00" />
  </svg>
);

const FlagUS: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => (
  <svg className={`${className} rounded-[2px] overflow-hidden inline-block shrink-0 shadow-xs border border-zinc-200 dark:border-zinc-700`} viewBox="0 0 741 390">
    <rect width="741" height="390" fill="#B22234" />
    <path d="M0,30H741M0,90H741M0,150H741M0,210H741M0,270H741M0,330H741" stroke="#fff" strokeWidth="30" />
    <rect width="296" height="210" fill="#3C3B6E" />
    <circle cx="148" cy="105" r="70" fill="#ffffff" opacity="0.3" />
  </svg>
);

const FlagZH: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => (
  <svg className={`${className} rounded-[2px] overflow-hidden inline-block shrink-0 shadow-xs border border-zinc-200 dark:border-zinc-700`} viewBox="0 0 900 600">
    <rect width="900" height="600" fill="#DE2910" />
    <polygon points="150,60 178,146 269,146 195,200 223,286 150,232 77,286 105,200 31,146 122,146" fill="#FFDE00" />
    <circle cx="300" cy="100" r="22" fill="#FFDE00" />
    <circle cx="360" cy="160" r="22" fill="#FFDE00" />
    <circle cx="360" cy="240" r="22" fill="#FFDE00" />
    <circle cx="300" cy="300" r="22" fill="#FFDE00" />
  </svg>
);

const FlagTH: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => (
  <svg className={`${className} rounded-[2px] overflow-hidden inline-block shrink-0 shadow-xs border border-zinc-200 dark:border-zinc-700`} viewBox="0 0 900 600">
    <rect width="900" height="600" fill="#A51931" />
    <rect y="100" width="900" height="400" fill="#F4F5F8" />
    <rect y="200" width="900" height="200" fill="#2D2A4A" />
  </svg>
);

const FlagLA: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => (
  <svg className={`${className} rounded-[2px] overflow-hidden inline-block shrink-0 shadow-xs border border-zinc-200 dark:border-zinc-700`} viewBox="0 0 900 600">
    <rect width="900" height="600" fill="#CE1126" />
    <rect y="150" width="900" height="300" fill="#002868" />
    <circle cx="450" cy="300" r="110" fill="#ffffff" />
  </svg>
);

type TargetLanguage = 'VI' | 'EN' | 'JA' | 'ZH' | 'TH' | 'LA';

interface DialogueTurn {
  id: string;
  speaker: string;
  role: string;
  avatarInitials: string;
  avatarBg: string;
  flagComponent: React.FC<{ className?: string }>;
  sourceLang: string;
  sourceText: string;
  translations: Record<TargetLanguage, string>;
  actionItem?: {
    text: string;
    confidence: string;
  };
  latencyMs: number;
}

const DIALOGUE_SCRIPT: DialogueTurn[] = [
  {
    id: 'turn-1',
    speaker: 'Kenji Sato',
    role: 'Lead Architect · Tokyo',
    avatarInitials: 'KS',
    avatarBg: 'bg-violet-600',
    flagComponent: FlagJP,
    sourceLang: '日本語 (JA)',
    sourceText: '来週のリリースに向けて、多言語リアルタイム翻訳の遅延を350ms以下に最適化しました。',
    translations: {
      VI: 'Trước thềm phát hành tuần tới, chúng tôi đã tối ưu độ trễ dịch đa ngữ thời gian thực xuống dưới 350ms.',
      EN: 'Ahead of next week\'s release, we have optimized multi-language real-time translation latency to under 350ms.',
      JA: '来週のリリースに向けて、多言語リアルタイム翻訳の遅延を350ms以下に最適化しました。',
      ZH: '针对下周的系统发布，我们已将多语言实时翻译延迟优化至350毫秒以内。',
      TH: 'สำหรับเวอร์ชันสัปดาห์หน้า เราได้ปรับเวลาแฝงของการแปลหลายภาษาแบบเรียลไทม์ให้ต่ำกว่า 350ms แล้ว',
      LA: 'ສຳລັບການປ່ອຍຕົວໃນອາທິດໜ້າ, ພວກເຮົາໄດ້ປັບປຸງຄວາມຊັກຊ້າໃນການແປພາສາເວລາຈິງໃຫ້ຫຼຸດລົງຕໍ່າກວ່າ 350ms.',
    },
    actionItem: {
      text: 'Xác nhận benchmark STT đa ngữ <350ms trên cụm máy chủ Staging',
      confidence: '98%',
    },
    latencyMs: 312,
  },
  {
    id: 'turn-2',
    speaker: 'David Miller',
    role: 'VP Engineering · San Francisco',
    avatarInitials: 'DM',
    avatarBg: 'bg-emerald-600',
    flagComponent: FlagUS,
    sourceLang: 'English (US)',
    sourceText: 'All global participants are receiving seamless local subtitles in their own language without any lag.',
    translations: {
      VI: 'Tất cả thành viên toàn cầu đều nhận được phụ đề địa phương theo ngôn ngữ riêng mà không bị gián đoạn.',
      EN: 'All global participants are receiving seamless local subtitles in their own language without any lag.',
      JA: '世界中の全参加者が、遅延なく各自の母国語でリアルタイム字幕を受信できています。',
      ZH: '所有全球参会者都能毫无延迟地接收到各自母语的实时字幕。',
      TH: 'ผู้เข้าร่วมประชุมทั่วโลกทุกคนได้รับคำบรรยายสดในภาษาของตนเองโดยไม่มีการดีเลย์',
      LA: 'ຜູ້ເຂົ້າຮ່ວມທົ່ວໂລກທັງໝົດກຳລັງໄດ້ຮັບຄຳບັນຍາຍສົດຕາມພາສາຂອງຕົນເອງໂດຍບໍ່ມີການຊັກຊ້າ.',
    },
    actionItem: {
      text: 'Mở rộng thử nghiệm phòng họp 10 quốc gia đồng thời vào thứ Năm',
      confidence: '96%',
    },
    latencyMs: 295,
  },
  {
    id: 'turn-3',
    speaker: 'Minh Nguyen',
    role: 'AI Tech Lead · Đà Nẵng',
    avatarInitials: 'MN',
    avatarBg: 'bg-blue-600',
    flagComponent: FlagVN,
    sourceLang: 'Tiếng Việt (VI)',
    sourceText: 'Phía Việt Nam đã sẵn sàng. Hệ thống Laya AI đang trích xuất Action Items đồng thời cho mọi ngôn ngữ.',
    translations: {
      VI: 'Phía Việt Nam đã sẵn sàng. Hệ thống Laya AI đang trích xuất Action Items đồng thời cho mọi ngôn ngữ.',
      EN: 'The Vietnam team is ready. The Laya AI engine is concurrently extracting Action Items across all languages.',
      JA: 'ベトナム側も準備完了です。Laya AIが全言語向けにアクションアイテムをリアルタイム抽出しています。',
      ZH: '越南团队已准备就绪。Laya AI智能助手正面向所有语种同步提取待办事项与决议。',
      TH: 'ทีมเวียดนามพร้อมแล้ว ระบบ Laya AI กำลังดึงรายการงานสำหรับทุกภาษาไปพร้อมกัน',
      LA: 'ທີມຫວຽດນາມພ້ອມແລ້ວ. ລະບົບ Laya AI ພວມສະກັດລາຍການວຽກສຳລັບທຸກພາສາໄປພ້ອມໆກັນ.',
    },
    actionItem: {
      text: 'Xuất biên bản họp đa ngữ tự động sang Markdown và gửi vào nhóm dự án',
      confidence: '95%',
    },
    latencyMs: 284,
  },
];

const LANGUAGE_LABELS: Record<
  TargetLanguage,
  { label: string; code: string; flagComponent: React.FC<{ className?: string }> }
> = {
  VI: { label: 'Tiếng Việt', code: 'VI', flagComponent: FlagVN },
  EN: { label: 'English (US)', code: 'EN', flagComponent: FlagUS },
  JA: { label: '日本語', code: 'JA', flagComponent: FlagJP },
  ZH: { label: '中文', code: 'ZH', flagComponent: FlagZH },
  TH: { label: 'ไทย', code: 'TH', flagComponent: FlagTH },
  LA: { label: 'ລາວ', code: 'LA', flagComponent: FlagLA },
};

export const InteractiveMeetingPreview: React.FC = () => {
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [selectedLang, setSelectedLang] = useState<TargetLanguage>('VI');
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-cycle dialogue turns every 7 seconds
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTurnIndex((prev) => (prev + 1) % DIALOGUE_SCRIPT.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentTurn = DIALOGUE_SCRIPT[currentTurnIndex];
  const translatedText = currentTurn.translations[selectedLang] || currentTurn.translations.VI;

  return (
    <div className="w-full sm:w-[480px] lg:w-[540px] xl:w-[600px] 2xl:w-[660px] bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#333336] rounded-2xl overflow-hidden shrink-0 shadow-2xl transition-all">
      {/* ── Studio Top Chrome Bar ─────────────────────────────── */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-[#121214] border-b border-zinc-200 dark:border-[#2b2b2e] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          {/* Mac-style subtle window controls */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/90 dark:bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90 dark:bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90 dark:bg-emerald-500/70" />
          </div>
          <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 pl-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-blue-600 dark:text-blue-400">LayaMeet</span>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span>global-polyglot-room</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Tạm dừng mô phỏng' : 'Tiếp tục mô phỏng'}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="w-2.5 h-2.5 text-zinc-500" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-2.5 h-2.5 text-blue-500" />
                <span className="text-blue-500 font-semibold">Play</span>
              </>
            )}
          </button>
          <span className="text-[9px] font-mono font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-200/70 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            Any-to-Any
          </span>
        </div>
      </div>

      {/* ── Polyglot Matrix Notice Banner ────────────────────────── */}
      <div className="px-3 py-1.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-[10px] text-blue-800 dark:text-blue-300">
        <span className="flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span>Mỗi thành viên tự chọn ngôn ngữ nghe/đọc riêng</span>
        </span>
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-blue-100/80 dark:bg-blue-900/50">
          50+ Ngôn ngữ
        </span>
      </div>

      {/* ── Meeting Video Stage (3 Active Global Participants) ──── */}
      <div className="p-2.5 bg-zinc-100/60 dark:bg-[#131315] grid grid-cols-3 gap-1.5 border-b border-zinc-200 dark:border-[#2b2b2e]">
        {/* Participant 1: Kenji Sato (JP) */}
        <div
          onClick={() => setCurrentTurnIndex(0)}
          className={`relative cursor-pointer rounded-lg p-2 border transition-all ${
            currentTurn.id === 'turn-1'
              ? 'bg-white dark:bg-[#1d1d20] border-blue-500/70 shadow-sm ring-1 ring-blue-500/25'
              : 'bg-white/70 dark:bg-[#161618] border-zinc-200/80 dark:border-zinc-800 opacity-75 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
              KS
            </div>
            {currentTurn.id === 'turn-1' ? (
              <span className="w-4 h-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Mic className="w-2.5 h-2.5" />
              </span>
            ) : (
              <span className="w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
                <MicOff className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1">
            <span>Kenji S.</span>
            <FlagJP className="w-3 h-2" />
          </div>
          <div className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate">Tokyo</div>
        </div>

        {/* Participant 2: David Miller (US) */}
        <div
          onClick={() => setCurrentTurnIndex(1)}
          className={`relative cursor-pointer rounded-lg p-2 border transition-all ${
            currentTurn.id === 'turn-2'
              ? 'bg-white dark:bg-[#1d1d20] border-blue-500/70 shadow-sm ring-1 ring-blue-500/25'
              : 'bg-white/70 dark:bg-[#161618] border-zinc-200/80 dark:border-zinc-800 opacity-75 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
              DM
            </div>
            {currentTurn.id === 'turn-2' ? (
              <span className="w-4 h-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Mic className="w-2.5 h-2.5" />
              </span>
            ) : (
              <span className="w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
                <MicOff className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1">
            <span>David M.</span>
            <FlagUS className="w-3 h-2" />
          </div>
          <div className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate">San Francisco</div>
        </div>

        {/* Participant 3: Minh Nguyen (VN) */}
        <div
          onClick={() => setCurrentTurnIndex(2)}
          className={`relative cursor-pointer rounded-lg p-2 border transition-all ${
            currentTurn.id === 'turn-3'
              ? 'bg-white dark:bg-[#1d1d20] border-blue-500/70 shadow-sm ring-1 ring-blue-500/25'
              : 'bg-white/70 dark:bg-[#161618] border-zinc-200/80 dark:border-zinc-800 opacity-75 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
              MN
            </div>
            {currentTurn.id === 'turn-3' ? (
              <span className="w-4 h-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Mic className="w-2.5 h-2.5" />
              </span>
            ) : (
              <span className="w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
                <MicOff className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1">
            <span>Minh N.</span>
            <FlagVN className="w-3 h-2" />
          </div>
          <div className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate">Đà Nẵng</div>
        </div>
      </div>

      {/* ── Interactive Translation Selector Bar (6 Languages Matrix) */}
      <div className="px-3 py-2 bg-zinc-50/80 dark:bg-[#151517] border-b border-zinc-200 dark:border-[#2b2b2e] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
          <Globe className="w-3.5 h-3.5 text-blue-500" />
          <span>Ngôn ngữ bạn muốn xem:</span>
        </div>
        <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-[#202023] p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60 overflow-x-auto">
          {(['VI', 'EN', 'JA', 'ZH', 'TH', 'LA'] as TargetLanguage[]).map((lang) => {
            const FlagComp = LANGUAGE_LABELS[lang].flagComponent;
            return (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all shrink-0 ${
                  selectedLang === lang
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <FlagComp className="w-3 h-2" />
                <span>{lang}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Live Subtitle Stream & Translation Box ──────────────── */}
      <div className="p-3.5 space-y-2.5">
        <div className="bg-zinc-50 dark:bg-[#121214] rounded-xl border border-zinc-200 dark:border-[#2b2b2e] p-3 space-y-2">
          {/* Header of speech bubble */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <span>{currentTurn.speaker}</span>
                <span className="text-[10px] text-zinc-500 font-normal">đang phát biểu bằng {currentTurn.sourceLang}</span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>{currentTurn.latencyMs}ms</span>
            </div>
          </div>

          {/* Original transcript */}
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-mono">
            {currentTurn.sourceText}
          </p>

          {/* Real-time Translation output */}
          <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
            <div className="flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-1">
              <Zap className="w-3 h-3" />
              <span>Dịch trực tiếp sang {LANGUAGE_LABELS[selectedLang].label}:</span>
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
              {translatedText}
            </p>
          </div>
        </div>

        {/* ── Laya AI Sidecar: Action Item Live Extraction ────────── */}
        {currentTurn.actionItem && (
          <div className="bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200/80 dark:border-blue-900/40 rounded-xl p-2.5 flex items-start gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[10px] font-semibold tracking-wide uppercase text-blue-700 dark:text-blue-400">
                  LayaMeet AI (Laya) · Action Item ({currentTurn.actionItem.confidence})
                </span>
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400">Auto-logged</span>
              </div>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-tight">
                {currentTurn.actionItem.text}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Studio Telemetry Footer ─────────────────────────────── */}
      <div className="px-3.5 py-2.5 bg-zinc-50 dark:bg-[#121214] border-t border-zinc-200 dark:border-[#2b2b2e] flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>LayaMeet On-Prem (int8)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Chunk: 350ms</span>
          <span>Matrix: Any-to-Any</span>
        </div>
      </div>
    </div>
  );
};
