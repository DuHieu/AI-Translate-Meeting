import { AdaptiveDialog } from '../common/AdaptiveDialog';
import React, { useEffect, useState } from 'react';
import {
  X,
  Sliders,
  Key,
  Mic,
  Cpu,
  Clock,
  Volume2,
  Sparkles,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  ShieldCheck,
  Zap,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../../context/language-context-def';
import {
  getUserSettings,
  saveUserSettings,
  UserMeetingSettings,
  DEFAULT_USER_SETTINGS,
  ByokProvider,
  VadSensitivity,
  SubtitleDisplayMode,
  SubtitleFontSize,
  SubtitleBgOpacity,
  GlossaryDomain,
  TranslationTier,
} from '../../utils/userSettings';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES_LIST,
  getLanguageOption,
} from '../../types/meeting';
import { CountryFlag } from '../common/CountryFlag';

interface SystemToolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'ai_byok' | 'audio_vad' | 'meeting_limits' | 'subtitles';

interface SystemToolSettingsCopy {
  title: string;
  subtitle: string;
  tabAiByok: string;
  tabAudioVad: string;
  tabLimits: string;
  tabSubtitles: string;
  savedToast: string;
  resetDefault: string;
  close: string;
  freeAiTitle: string;
  freeAiBadge: string;
  freeAiDesc: string;
  byokTitle: string;
  byokDesc: string;
  byokKeyInput: string;
  byokKeyHint: string;
  byokSecurityNotice: string;
  audioChunkTitle: string;
  audioChunkDesc: string;
  vadTitle: string;
  vadDesc: string;
  duckingTitle: string;
  duckingDesc: string;
  unlimitedTitle: string;
  unlimitedDesc: string;
  autoExportTitle: string;
  autoExportDesc: string;
  subModeTitle: string;
  subSizeTitle: string;
  subOpacityTitle: string;
  glossaryTitle: string;
  tierTitle: string;
  tierStandard: string;
  tierPro: string;
  nativeLanguageTitle: string;
  nativeLanguageDesc: string;
  otherLanguages: string;
}

const COPY: Record<string, SystemToolSettingsCopy> = {
  vi: {
    title: 'Cài đặt thông số AI & API Key',
    subtitle: 'Tùy chỉnh động cơ dịch thuật, khóa API riêng (BYOK), độ trễ âm thanh và chế độ họp.',
    tabAiByok: 'AI & API Key (BYOK)',
    tabAudioVad: 'Âm thanh & VAD',
    tabLimits: 'Thời lượng & Giới hạn',
    tabSubtitles: 'Giao diện Phụ đề',
    savedToast: 'Đã lưu cài đặt tự động',
    resetDefault: 'Khôi phục mặc định',
    close: 'Xong',
    freeAiTitle: 'Chế độ AI Miễn phí Cục bộ (Local AI Engine)',
    freeAiBadge: '100% Free · Không cần thẻ',
    freeAiDesc:
      'Sử dụng mô hình Faster-Whisper int8 và bộ dịch Multi-Engine Fast (Google GTX + Fallback) tốc độ <350ms, bảo mật RAM-only.',
    byokTitle: 'Mang theo API Key riêng (BYOK - Bring Your Own Key)',
    byokDesc:
      'Kết nối trực tiếp tài khoản AI của bạn với các mô hình mạnh mẽ nhất như GPT-4o, Claude 3.5, Groq, DeepSeek hoặc Qwen.',
    byokKeyInput: 'Nhập API Key cá nhân của bạn...',
    byokKeyHint: 'Khóa API được lưu cục bộ an toàn trên trình duyệt của bạn (LocalStorage) và không lưu trên server.',
    byokSecurityNotice: 'Bảo mật Client-Side · Mã hóa bộ nhớ · Không log key',
    audioChunkTitle: 'Kích thước gói âm thanh (Audio Chunking)',
    audioChunkDesc: 'Thời lượng phân đoạn âm thanh gửi đến AI STT để nhận diện giọng nói.',
    vadTitle: 'Độ nhạy ngắt khoảng lặng VAD (Voice Activity Detection)',
    vadDesc: 'Ngưỡng năng lượng để phát hiện người đang nói và lọc tạp âm nền.',
    duckingTitle: 'Tự động giảm âm nền (Audio Ducking)',
    duckingDesc: 'Hạ âm lượng các video, file chia sẻ (-18dB) khi phát hiện người nói trong phòng.',
    unlimitedTitle: 'Chế độ họp miễn phí không giới hạn (Unlimited Free)',
    unlimitedDesc: 'Bỏ mốc đếm ngược 40 phút cho tất cả các cuộc họp trên hệ thống này.',
    autoExportTitle: 'Tự động tải biên bản họp AI (Auto Minutes)',
    autoExportDesc: 'Tự động tải file Markdown tóm tắt và Action Items khi bạn rời phòng họp.',
    subModeTitle: 'Chế độ hiển thị phụ đề mặc định',
    subSizeTitle: 'Kích thước chữ phụ đề',
    subOpacityTitle: 'Độ mờ phông nền phụ đề',
    glossaryTitle: 'Từ điển thuật ngữ chuyên ngành',
    tierTitle: 'Cấp độ dịch thuật AI',
    tierStandard: 'Tiêu chuẩn (Fast GTX Multi-Engine)',
    tierPro: 'Cao cấp (Ngữ cảnh AI Contextual)',
    nativeLanguageTitle: 'Ngôn ngữ mẹ đẻ mặc định (Nhận phụ đề)',
    nativeLanguageDesc:
      'Tự động chọn làm ngôn ngữ nhận phụ đề khi bạn tham gia phòng họp (kể cả khi chỉ vào nghe không phát biểu).',
    otherLanguages: 'Ngôn ngữ khác...',
  },
  en: {
    title: 'AI Tools & API Key Settings',
    subtitle: 'Configure translation engine, custom API keys (BYOK), audio latency and meeting limits.',
    tabAiByok: 'AI & API Key (BYOK)',
    tabAudioVad: 'Audio & VAD',
    tabLimits: 'Duration & Limits',
    tabSubtitles: 'Subtitles UI',
    savedToast: 'Settings saved automatically',
    resetDefault: 'Reset to Defaults',
    close: 'Done',
    freeAiTitle: 'Free Local AI Engine (Default)',
    freeAiBadge: '100% Free · No Card Required',
    freeAiDesc:
      'Uses Faster-Whisper int8 and Multi-Engine Fast (Google GTX + Fallback) with <350ms latency and RAM-only security.',
    byokTitle: 'Bring Your Own Key (BYOK)',
    byokDesc:
      'Connect your own AI API accounts for advanced models like GPT-4o, Claude 3.5, Groq, DeepSeek, or Qwen.',
    byokKeyInput: 'Enter your personal API Key...',
    byokKeyHint: 'Keys are stored securely in your client browser (LocalStorage) and never stored on our server.',
    byokSecurityNotice: 'Client-side storage · Memory encrypted · Never logged',
    audioChunkTitle: 'Audio Chunk Interval (Latency)',
    audioChunkDesc: 'Audio stream slice duration dispatched to AI STT pipeline.',
    vadTitle: 'Voice Activity Detection (VAD) Sensitivity',
    vadDesc: 'RMS energy threshold to isolate voice segments from background noise.',
    duckingTitle: 'Audio Ducking (-18dB)',
    duckingDesc: 'Automatically lowers background media volume when speech is detected.',
    unlimitedTitle: 'Unlimited Free Meeting Mode',
    unlimitedDesc: 'Removes the 40-minute countdown limit for meetings created on this device.',
    autoExportTitle: 'Auto Export AI Meeting Minutes',
    autoExportDesc: 'Automatically downloads meeting recap Markdown when leaving a meeting.',
    subModeTitle: 'Default Subtitle Display Mode',
    subSizeTitle: 'Subtitle Font Size',
    subOpacityTitle: 'Background Opacity',
    glossaryTitle: 'Terminology Domain Glossary',
    tierTitle: 'AI Translation Tier',
    tierStandard: 'Standard (Fast GTX Multi-Engine)',
    tierPro: 'Pro Contextual (AI Reasoning)',
    nativeLanguageTitle: 'Default Native Language (Subtitle Target)',
    nativeLanguageDesc:
      'Automatically set as your subtitle target language when joining any meeting (even if you only listen).',
    otherLanguages: 'Other languages...',
  },
  ja: {
    title: 'AIツール・APIキー設定',
    subtitle: '翻訳エンジン、カスタムAPIキー（BYOK）、音声遅延、会議時間制限を設定できます。',
    tabAiByok: 'AI・APIキー (BYOK)',
    tabAudioVad: '音声 & VAD',
    tabLimits: '制限・時間',
    tabSubtitles: '字幕表示',
    savedToast: '設定は自動保存されました',
    resetDefault: '初期設定に戻す',
    close: '完了',
    freeAiTitle: '無料ローカルAIエンジン（標準）',
    freeAiBadge: '100%無料・カード不要',
    freeAiDesc:
      'Faster-Whisper int8とマルチエンジン高速翻訳（遅延350ms未満、完全RAMメモリ処理）を使用します。',
    byokTitle: '独自APIキーの利用 (BYOK)',
    byokDesc:
      'GPT-4o、Claude 3.5、Groq、DeepSeek、Qwenなどの高度なAIモデルを直接接続して利用できます。',
    byokKeyInput: '個人用APIキーを入力...',
    byokKeyHint: 'APIキーはブラウザ内（LocalStorage）に安全に保存され、サーバーには送信されません。',
    byokSecurityNotice: 'クライアント側保存・暗号化メモリ・ログ記録なし',
    audioChunkTitle: '音声チャンク間隔（レイテンシ）',
    audioChunkDesc: 'AI音声認識パイプラインに送信する音声データの区切り時間。',
    vadTitle: '音声検出（VAD）の感度',
    vadDesc: '周囲の雑音と話者の発言を識別するエネルギー閾値。',
    duckingTitle: '自動音量抑制（オーディオダッキング）',
    duckingDesc: '話者が発言している間、共有メディアの音量を自動で-18dB下げます。',
    unlimitedTitle: '時間無制限フリーモード',
    unlimitedDesc: '40分の時間制限カウントダウンを解除して会議を継続できます。',
    autoExportTitle: 'AI議事録の自動保存',
    autoExportDesc: '会議退出時に要約とAction ItemsのMarkdownファイルを自動ダウンロードします。',
    subModeTitle: '字幕表示モード',
    subSizeTitle: '字幕フォントサイズ',
    subOpacityTitle: '背景透過度',
    glossaryTitle: '専門用語辞書ドメイン',
    tierTitle: 'AI翻訳ティア',
    tierStandard: '標準（高速GTXマルチエンジン）',
    tierPro: 'Pro高精度（コンテキストAI）',
    nativeLanguageTitle: 'デフォルトの母国語（字幕翻訳先）',
    nativeLanguageDesc:
      '会議参加時に自動的に字幕の翻訳先言語として設定されます（発言せず聞くだけの場合でも有効）。',
    otherLanguages: 'その他の言語...',
  },
};

const PROVIDERS: {
  id: ByokProvider;
  name: string;
  badge: string;
  speed: string;
  placeholder: string;
  docsUrl: string;
}[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    badge: 'GPT-4o / mini',
    speed: '~450ms',
    placeholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'groq',
    name: 'Groq',
    badge: '⚡ Siêu tốc ~200ms',
    speed: '~200ms',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: '💰 Siêu rẻ (V3 / R1)',
    speed: '~500ms',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'qwen',
    name: 'Qwen (Alibaba)',
    badge: '🌏 Vi / Ja / Zh MT',
    speed: '~350ms',
    placeholder: 'sk-...',
    docsUrl: 'https://dashscope.console.aliyun.com/',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Flash 2.0',
    speed: '~300ms',
    placeholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'anthropic',
    name: 'Claude Anthropic',
    badge: 'Sonnet 3.5 / Haiku',
    speed: '~400ms',
    placeholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'deepl',
    name: 'DeepL Translate',
    badge: 'MT Chuyên nghiệp',
    speed: '~350ms',
    placeholder: '...:fx (Free) / ... (Pro)',
    docsUrl: 'https://www.deepl.com/pro-api',
  },
];

export const SystemToolSettingsModal: React.FC<SystemToolSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { language } = useLanguage();
  const copy = COPY[language] || COPY.vi;

  const [activeTab, setActiveTab] = useState<TabType>('ai_byok');
  const [settings, setSettings] = useState<UserMeetingSettings>(() => getUserSettings());
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getUserSettings());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const update = <K extends keyof UserMeetingSettings>(key: K, value: UserMeetingSettings[K]) => {
    const updated = saveUserSettings({ [key]: value });
    setSettings(updated);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleProviderSelect = (provider: ByokProvider) => {
    const existingKey = settings.providerKeys?.[provider] || '';
    const updated = saveUserSettings({
      byokProvider: provider,
      byokApiKey: existingKey,
    });
    setSettings(updated);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleKeyChange = (newKey: string) => {
    const updatedKeys = {
      ...(settings.providerKeys || {}),
      [settings.byokProvider]: newKey,
    };
    const updated = saveUserSettings({
      byokApiKey: newKey,
      providerKeys: updatedKeys,
    });
    setSettings(updated);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt về mặc định?')) {
      const reset = saveUserSettings(DEFAULT_USER_SETTINGS);
      setSettings(reset);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
    }
  };

  if (!isOpen) return null;

  const currentProviderInfo =
    PROVIDERS.find((p) => p.id === settings.byokProvider) || PROVIDERS[0];

  return (
    <AdaptiveDialog label={copy.title} onClose={onClose} className="system-tools-dialog">

      <div className="relative z-10 w-full max-w-2xl max-h-[calc(var(--app-height)-64px)] flex flex-col rounded-3xl bg-white dark:bg-[#14151a] border border-zinc-200 dark:border-[#272832] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4.5 border-b border-zinc-200/80 dark:border-[#272832] flex items-center justify-between shrink-0 bg-zinc-50/70 dark:bg-[#181920]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 id="tool-settings-modal-title" className="text-base sm:text-lg font-bold tracking-tight">
                {copy.title}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showSavedToast && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 animate-in fade-in">
                <Check className="w-3 h-3" />
                <span>{copy.savedToast}</span>
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              aria-label={copy.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-[#272832] bg-zinc-100/60 dark:bg-[#101116] px-4 pt-1 gap-1 sm:gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {(
            [
              ['ai_byok', copy.tabAiByok, Cpu],
              ['audio_vad', copy.tabAudioVad, Mic],
              ['meeting_limits', copy.tabLimits, Clock],
              ['subtitles', copy.tabSubtitles, Globe],
            ] as [TabType, string, React.ComponentType<{ className?: string }>][]
          ).map(([tabId, label, Icon]) => {
            const isActive = activeTab === tabId;
            return (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                className={`py-3 px-3.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#14151a]'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/40 dark:hover:bg-white/[0.03]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* ── TAB 1: AI & API Key (BYOK) ────────────────────── */}
          {activeTab === 'ai_byok' && (
            <div className="space-y-5">
              {/* Free Local Engine card */}
              <div
                onClick={() => update('byokEnabled', false)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  !settings.byokEnabled
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/10 shadow-xs ring-1 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="engine_mode"
                      aria-label={copy.freeAiTitle}
                      checked={!settings.byokEnabled}
                      onChange={() => update('byokEnabled', false)}
                      className="mt-1 accent-blue-600 w-4 h-4"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {copy.freeAiTitle}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {copy.freeAiBadge}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        {copy.freeAiDesc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* BYOK Mode Card */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  settings.byokEnabled
                    ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs ring-1 ring-amber-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40'
                }`}
              >
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => update('byokEnabled', true)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="engine_mode"
                      aria-label={copy.byokTitle}
                      checked={settings.byokEnabled}
                      onChange={() => update('byokEnabled', true)}
                      className="mt-1 accent-amber-500 w-4 h-4"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {copy.byokTitle}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          BYOK
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        {copy.byokDesc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* BYOK Configuration Form */}
                {settings.byokEnabled && (
                  <div className="mt-4 pt-4 border-t border-amber-500/20 space-y-3.5">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Chọn nhà cung cấp AI (Provider):
                    </label>

                    {/* Providers Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {PROVIDERS.map((p) => {
                        const isSelected = settings.byokProvider === p.id;
                        const hasKeySaved = Boolean(settings.providerKeys?.[p.id]);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleProviderSelect(p.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                              isSelected
                                ? 'border-amber-500 bg-amber-500/15 text-zinc-900 dark:text-white shadow-xs font-semibold ring-1 ring-amber-500/40'
                                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1a1b22] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate">{p.name}</span>
                              {hasKeySaved && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Key saved" />
                              )}
                            </div>
                            <div className="text-[10px] text-amber-600 dark:text-amber-400/90 font-medium truncate mt-0.5">
                              {p.badge}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* API Key Input */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="system-tools-api-key" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                          <span>API Key cho {currentProviderInfo.name}:</span>
                        </label>
                        <a
                          href={currentProviderInfo.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>Lấy key ở đâu?</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          id="system-tools-api-key"
                          type={showApiKey ? 'text' : 'password'}
                          placeholder={currentProviderInfo.placeholder}
                          value={settings.byokApiKey}
                          onChange={(e) => handleKeyChange(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#121318] px-3.5 py-2.5 pr-20 text-xs font-mono text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                            title={showApiKey ? 'Ẩn' : 'Hiện'}
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          {settings.byokApiKey && (
                            <button
                              type="button"
                              onClick={() => handleKeyChange('')}
                              className="p-1 rounded-lg text-zinc-400 hover:text-red-500 transition cursor-pointer text-xs"
                              title="Xóa"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {copy.byokKeyHint}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{copy.byokSecurityNotice}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: Audio & VAD ────────────────────────────── */}
          {activeTab === 'audio_vad' && (
            <div className="space-y-5">
              {/* Audio Chunk Latency */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span>{copy.audioChunkTitle}</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {copy.audioChunkDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      [350, '350ms (Siêu tốc)', 'Độ trễ thấp nhất · Khuyến nghị'],
                      [500, '500ms (Cân bằng)', 'Tối ưu CPU & máy cấu hình nhẹ'],
                      [1000, '1000ms (Tiết kiệm)', 'Dành cho mạng di động 3G/4G'],
                    ] as [number, string, string][]
                  ).map(([ms, label, hint]) => {
                    const isSelected = (settings.audioChunkMs || 350) === ms;
                    return (
                      <button
                        key={ms}
                        type="button"
                        onClick={() => update('audioChunkMs', ms)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-xs font-semibold ring-1 ring-blue-500/20'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1a1b22] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{label}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">{hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* VAD Sensitivity */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-emerald-500" />
                    <span>{copy.vadTitle}</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {copy.vadDesc}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      ['low', 'Thấp (Low)', 'Chỉ bắt khi nói to, lọc tạp âm gõ phím'],
                      ['medium', 'Vừa (Medium)', 'Chuẩn cho phòng họp thông thường'],
                      ['high', 'Cao (High)', 'Nhạy cả thì thầm & người ngồi xa mic'],
                    ] as [VadSensitivity, string, string][]
                  ).map(([lvl, label, hint]) => {
                    const isSelected = settings.vadSensitivity === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => update('vadSensitivity', lvl)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-xs font-semibold ring-1 ring-emerald-500/20'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1a1b22] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{label}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audio Ducking */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {copy.duckingTitle}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {copy.duckingDesc}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => update('audioDuckingEnabled', !settings.audioDuckingEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    settings.audioDuckingEnabled ? 'bg-purple-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                  aria-label={copy.duckingTitle}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                      settings.audioDuckingEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* ── TAB 3: Duration & Limits ───────────────────────── */}
          {activeTab === 'meeting_limits' && (
            <div className="space-y-4">
              {/* Unlimited Free Meeting Mode */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {copy.unlimitedTitle}
                      </h3>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        Miễn phí
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {copy.unlimitedDesc}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => update('unlimitedFreeMeeting', !settings.unlimitedFreeMeeting)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    settings.unlimitedFreeMeeting !== false ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                  aria-label={copy.unlimitedTitle}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                      settings.unlimitedFreeMeeting !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Export Minutes */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {copy.autoExportTitle}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {copy.autoExportDesc}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => update('autoAiMinutesExport', !settings.autoAiMinutesExport)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    settings.autoAiMinutesExport ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                  aria-label={copy.autoExportTitle}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                      settings.autoAiMinutesExport ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Translation Tier */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {copy.tierTitle}
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      ['standard', copy.tierStandard, 'Nhanh, nhẹ, không tốn quota'],
                      ['pro', copy.tierPro, 'Mô hình ngữ cảnh nâng cao'],
                    ] as [TranslationTier, string, string][]
                  ).map(([tier, label, desc]) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => update('translationTier', tier)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        settings.translationTier === tier
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1a1b22] text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{label}</div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: Subtitles UI ───────────────────────────── */}
          {activeTab === 'subtitles' && (
            <div className="space-y-4">
              {/* Native Language Selector (Default Subtitle Target) */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      {copy.nativeLanguageTitle}
                    </h3>
                  </div>
                  {settings.nativeLanguage && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      <CountryFlag code={settings.nativeLanguage} size="xs" />
                      <span>{getLanguageOption(settings.nativeLanguage).nativeName}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {copy.nativeLanguageDesc}
                </p>

                {/* Top 6 Quick-pick buttons with CountryFlag */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {[
                    { code: 'vi' as const, label: 'Tiếng Việt' },
                    { code: 'ja' as const, label: '日本語' },
                    { code: 'en' as const, label: 'English' },
                    { code: 'zh' as const, label: '中文' },
                    { code: 'ko' as const, label: '한국어' },
                    { code: 'th' as const, label: 'ไทย' },
                  ].map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => update('nativeLanguage', item.code)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                        (settings.nativeLanguage || 'vi') === item.code
                          ? 'bg-blue-600 text-white font-semibold border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-[#1a1b22] border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <CountryFlag code={item.code} size="xs" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Secondary Quick-chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] text-zinc-400 font-medium mr-1">Ngôn ngữ khác:</span>
                  {[
                    { code: 'id' as const, label: 'Bahasa Indonesia' },
                    { code: 'tl' as const, label: 'Filipino' },
                    { code: 'ar' as const, label: 'العربية' },
                    { code: 'fr' as const, label: 'Français' },
                    { code: 'de' as const, label: 'Deutsch' },
                    { code: 'es' as const, label: 'Español' },
                  ].map((item) => {
                    const isSelected = (settings.nativeLanguage || 'vi') === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => update('nativeLanguage', item.code)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] transition cursor-pointer border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500 font-semibold shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <CountryFlag code={item.code} size="xs" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* All 12 languages dropdown */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Danh sách đầy đủ (12 ngôn ngữ):
                  </span>
                  <select
                    aria-label="Ngôn ngữ nói mặc định"
                    value={settings.nativeLanguage || 'vi'}
                    onChange={(e) => {
                      if (e.target.value) {
                        update('nativeLanguage', e.target.value as SupportedLanguage);
                      }
                    }}
                    className="text-xs bg-white dark:bg-[#14151a] border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.nativeName}) - {lang.code.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Display Mode */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {copy.subModeTitle}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['bilingual', 'Song ngữ (Bilingual)'],
                      ['translation_only', 'Chỉ câu dịch'],
                      ['original_only', 'Chỉ câu gốc'],
                    ] as [SubtitleDisplayMode, string][]
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => update('subtitleDisplayMode', mode)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-medium transition cursor-pointer text-center ${
                        settings.subtitleDisplayMode === mode
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'bg-white dark:bg-[#1a1b22] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {copy.subSizeTitle}
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      ['sm', 'Nhỏ (14px)'],
                      ['md', 'Vừa (18px)'],
                      ['lg', 'Lớn (22px)'],
                      ['xl', 'Cực lớn (26px)'],
                    ] as [SubtitleFontSize, string][]
                  ).map(([size, label]) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => update('subtitleFontSize', size)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium transition cursor-pointer text-center ${
                        settings.subtitleFontSize === size
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'bg-white dark:bg-[#1a1b22] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {copy.subOpacityTitle}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['light', 'Trong suốt (50%)'],
                      ['medium', 'Tiêu chuẩn (80%)'],
                      ['heavy', 'Tối đậm (95%)'],
                    ] as [SubtitleBgOpacity, string][]
                  ).map(([opacity, label]) => (
                    <button
                      key={opacity}
                      type="button"
                      onClick={() => update('subtitleBgOpacity', opacity)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium transition cursor-pointer text-center ${
                        settings.subtitleBgOpacity === opacity
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'bg-white dark:bg-[#1a1b22] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Domain Glossary */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {copy.glossaryTitle}
                </h3>
                <select
                  aria-label={copy.glossaryTitle}
                  value={settings.glossaryDomain}
                  onChange={(e) => update('glossaryDomain', e.target.value as GlossaryDomain)}
                  className="w-full bg-white dark:bg-[#121318] border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">Tổng quát (Hội thoại đời sống &amp; chung)</option>
                  <option value="it">Công nghệ thông tin (IT / Cloud / DevOps / BrSE)</option>
                  <option value="business">Kinh doanh &amp; Tài chính (Fintech / Hợp đồng / Kế toán)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-zinc-200/80 dark:border-[#272832] flex items-center justify-between shrink-0 bg-zinc-50/70 dark:bg-[#181920]/80">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{copy.resetDefault}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            {copy.close}
          </button>
        </div>
      </div>
    </AdaptiveDialog>
  );
};
