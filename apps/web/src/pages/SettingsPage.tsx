import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
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
  Sliders,
  Type,
  Layers,
  CheckCircle2,
  Headphones,
} from 'lucide-react';
import { ttsEngine } from '../utils/speechSynthesis';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useLanguage } from '../context/language-context-def';
import { AppLanguage } from '../i18n';
import {
  getUserSettings,
  saveUserSettings,
  UserMeetingSettings,
  DEFAULT_USER_SETTINGS,
  ByokProvider,
  GlossaryDomain,
} from '../utils/userSettings';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES_LIST,
  getLanguageOption,
} from '../types/meeting';
import { CountryFlag } from '../components/common/CountryFlag';

export type SettingsTab = 'ai_byok' | 'audio_vad' | 'meeting_limits' | 'subtitles';

const COPY: Record<
  AppLanguage,
  {
    pageTitle: string;
    pageSubtitle: string;
    backToHome: string;
    savedToast: string;
    resetDefault: string;
    resetConfirm: string;
    activeStatus: string;
    
    // Tabs
    tabAiByok: string;
    tabAiByokDesc: string;
    tabAudioVad: string;
    tabAudioVadDesc: string;
    tabLimits: string;
    tabLimitsDesc: string;
    tabSubtitles: string;
    tabSubtitlesDesc: string;

    // AI & BYOK
    freeAiTitle: string;
    freeAiBadge: string;
    freeAiDesc: string;
    freeAiActive: string;
    byokTitle: string;
    byokSubtitle: string;
    byokToggleLabel: string;
    byokKeyInput: string;
    byokKeyHint: string;
    byokSecurityNotice: string;
    byokGetKeyLink: string;
    byokCurrentKeySaved: string;

    // Audio & VAD
    audioChunkTitle: string;
    audioChunkDesc: string;
    vadTitle: string;
    vadDesc: string;
    duckingTitle: string;
    duckingDesc: string;

    // Limits
    unlimitedTitle: string;
    unlimitedDesc: string;
    autoExportTitle: string;
    autoExportDesc: string;
    tierTitle: string;
    tierStandard: string;
    tierPro: string;

    // Subtitles & Languages
    nativeLanguageTitle: string;
    nativeLanguageDesc: string;
    otherLanguages: string;
    subModeTitle: string;
    subSizeTitle: string;
    subOpacityTitle: string;
    glossaryTitle: string;
    previewTitle: string;
    previewOriginal: string;
    previewTranslation: string;
  }
> = {
  vi: {
    pageTitle: 'Cài đặt hệ thống & Thông số AI',
    pageSubtitle: 'Tùy chỉnh động cơ dịch thuật AI, khóa API riêng (BYOK), độ trễ âm thanh và cấu hình phụ đề hiển thị.',
    backToHome: 'Quay lại Trang chủ',
    savedToast: 'Đã lưu tự động vào trình duyệt',
    resetDefault: 'Khôi phục mặc định',
    resetConfirm: 'Bạn có chắc muốn khôi phục toàn bộ cài đặt về mặc định ban đầu?',
    activeStatus: 'Đang hoạt động',

    tabAiByok: 'AI & API Key (BYOK)',
    tabAiByokDesc: 'Động cơ AI, khóa API OpenAI, Groq, DeepSeek, Qwen',
    tabAudioVad: 'Âm thanh & VAD',
    tabAudioVadDesc: 'Độ trễ chunking, độ nhạy micro và giảm âm nền',
    tabLimits: 'Thời lượng & Giới hạn',
    tabLimitsDesc: 'Chế độ họp không giới hạn, xuất biên bản tự động',
    tabSubtitles: 'Giao diện Phụ đề & Ngôn ngữ',
    tabSubtitlesDesc: 'Ngôn ngữ mẹ đẻ, kích thước chữ, độ mờ và từ điển',

    freeAiTitle: 'Chế độ AI Miễn phí Cục bộ (Local AI Engine)',
    freeAiBadge: '100% Free · RAM-Only · Không cần thẻ',
    freeAiDesc:
      'Sử dụng mô hình Faster-Whisper int8 và bộ dịch Multi-Engine Fast (Google GTX + Fallback) tốc độ <350ms, chạy hoàn toàn trên RAM và không lưu file âm thanh.',
    freeAiActive: 'Động cơ AI mặc định đang sẵn sàng',

    byokTitle: 'Mang theo API Key riêng (BYOK - Bring Your Own Key)',
    byokSubtitle: 'Kết nối trực tiếp tài khoản AI cá nhân để sử dụng các mô hình hàng đầu thế giới với tốc độ và ngữ cảnh tối ưu.',
    byokToggleLabel: 'Kích hoạt chế độ dùng API Key riêng (BYOK)',
    byokKeyInput: 'Nhập API Key cá nhân của bạn...',
    byokKeyHint: 'Khóa API chỉ được lưu an toàn trong trình duyệt của bạn (LocalStorage) và không bao giờ gửi đến máy chủ của LayaMeet.',
    byokSecurityNotice: 'Client-side storage · Mã hóa bộ nhớ tạm · Không ghi log',
    byokGetKeyLink: 'Lấy API Key tại dashboard nhà cung cấp',
    byokCurrentKeySaved: 'Đã lưu khóa API cho nhà cung cấp này',

    audioChunkTitle: 'Kích thước gói âm thanh (Audio Chunk Interval)',
    audioChunkDesc: 'Thời lượng phân đoạn âm thanh gửi đến AI STT để nhận diện giọng nói. Số càng nhỏ phụ đề xuất hiện càng nhanh.',
    vadTitle: 'Độ nhạy ngắt khoảng lặng VAD (Voice Activity Detection)',
    vadDesc: 'Ngưỡng năng lượng RMS để phát hiện giọng nói và tự động lọc bỏ tiếng ồn nền.',
    duckingTitle: 'Tự động giảm âm nền (Audio Ducking -18dB)',
    duckingDesc: 'Hạ âm lượng các video, file nhạc hoặc media chia sẻ khi phát hiện người nói trong phòng.',

    unlimitedTitle: 'Chế độ họp miễn phí không giới hạn (Unlimited Mode)',
    unlimitedDesc: 'Bỏ mốc đếm ngược 40 phút cho tất cả các cuộc họp tạo trên thiết bị này.',
    autoExportTitle: 'Tự động tải biên bản họp AI (Auto Minutes Markdown)',
    autoExportDesc: 'Tự động tải file tóm tắt và danh sách việc cần làm (Action Items) khi bạn rời phòng họp.',
    tierTitle: 'Cấp độ dịch thuật AI (Translation Tier)',
    tierStandard: 'Tiêu chuẩn (Fast GTX Multi-Engine)',
    tierPro: 'Cao cấp (Ngữ cảnh AI Contextual)',

    nativeLanguageTitle: 'Ngôn ngữ mẹ đẻ mặc định (Nhận phụ đề)',
    nativeLanguageDesc:
      'Hệ thống sẽ dịch và hiển thị phụ đề theo ngôn ngữ này cho bạn khi nghe người khác nói (kể cả khi bạn chỉ vào nghe mà không phát biểu).',
    otherLanguages: 'Ngôn ngữ khác...',
    subModeTitle: 'Chế độ hiển thị phụ đề',
    subSizeTitle: 'Kích thước chữ phụ đề',
    subOpacityTitle: 'Độ mờ phông nền phụ đề',
    glossaryTitle: 'Từ điển thuật ngữ chuyên ngành',
    previewTitle: 'Xem trước giao diện phụ đề thực tế',
    previewOriginal: 'Xin chào mọi người, hôm nay chúng ta bắt đầu cuộc họp dự án.',
    previewTranslation: 'Hello everyone, today we kick off the project meeting.',
  },
  en: {
    pageTitle: 'System Settings & AI Parameters',
    pageSubtitle: 'Configure AI translation engines, custom API keys (BYOK), audio latency and live subtitle appearance.',
    backToHome: 'Back to Home',
    savedToast: 'Saved automatically to browser',
    resetDefault: 'Reset to Defaults',
    resetConfirm: 'Are you sure you want to reset all settings to defaults?',
    activeStatus: 'Active',

    tabAiByok: 'AI & API Key (BYOK)',
    tabAiByokDesc: 'AI engine, custom keys for OpenAI, Groq, DeepSeek, Qwen',
    tabAudioVad: 'Audio & VAD',
    tabAudioVadDesc: 'Chunk interval, microphone sensitivity & audio ducking',
    tabLimits: 'Duration & Limits',
    tabLimitsDesc: 'Unlimited meeting mode & auto AI minutes export',
    tabSubtitles: 'Subtitles & Language',
    tabSubtitlesDesc: 'Native language, font size, opacity and domain glossary',

    freeAiTitle: 'Free Local AI Engine (Default)',
    freeAiBadge: '100% Free · RAM-Only · No Card Required',
    freeAiDesc:
      'Uses Faster-Whisper int8 and Multi-Engine Fast (Google GTX + Fallback) with <350ms latency, RAM-only execution and zero audio storage.',
    freeAiActive: 'Default AI Engine Ready',

    byokTitle: 'Bring Your Own Key (BYOK)',
    byokSubtitle: 'Connect your personal AI accounts for advanced reasoning models with premium accuracy and custom rate limits.',
    byokToggleLabel: 'Enable custom API Key (BYOK)',
    byokKeyInput: 'Enter your personal API Key...',
    byokKeyHint: 'Keys are stored securely in your client browser (LocalStorage) and are never uploaded to LayaMeet servers.',
    byokSecurityNotice: 'Client-side storage · Memory encrypted · Never logged',
    byokGetKeyLink: 'Get API Key from provider dashboard',
    byokCurrentKeySaved: 'API key saved for this provider',

    audioChunkTitle: 'Audio Chunk Interval (Latency)',
    audioChunkDesc: 'Audio stream slice duration dispatched to AI STT pipeline. Smaller values yield faster subtitles.',
    vadTitle: 'Voice Activity Detection (VAD) Sensitivity',
    vadDesc: 'RMS energy threshold to isolate voice segments from background noise.',
    duckingTitle: 'Audio Ducking (-18dB)',
    duckingDesc: 'Automatically lowers background media volume when speech is detected.',

    unlimitedTitle: 'Unlimited Free Meeting Mode',
    unlimitedDesc: 'Removes the 40-minute countdown limit for meetings created on this device.',
    autoExportTitle: 'Auto Export AI Meeting Minutes',
    autoExportDesc: 'Automatically downloads meeting recap Markdown and Action Items upon departure.',
    tierTitle: 'AI Translation Tier',
    tierStandard: 'Standard (Fast GTX Multi-Engine)',
    tierPro: 'Pro Contextual (AI Reasoning)',

    nativeLanguageTitle: 'Default Native Language (Subtitle Target)',
    nativeLanguageDesc:
      'The system will translate and display subtitles in this language for you when others speak (even if you only listen without speaking).',
    otherLanguages: 'Other languages...',
    subModeTitle: 'Subtitle Display Mode',
    subSizeTitle: 'Subtitle Font Size',
    subOpacityTitle: 'Background Opacity',
    glossaryTitle: 'Terminology Domain Glossary',
    previewTitle: 'Live Subtitle Real-time Preview',
    previewOriginal: 'Xin chào mọi người, hôm nay chúng ta bắt đầu cuộc họp dự án.',
    previewTranslation: 'Hello everyone, today we kick off the project meeting.',
  },
  ja: {
    pageTitle: 'システム設定 & AIパラメータ',
    pageSubtitle: 'AI翻訳エンジン、独自APIキー（BYOK）、音声VAD遅延、字幕表示設定をカスタマイズできます。',
    backToHome: 'ホームへ戻る',
    savedToast: 'ブラウザに自動保存されました',
    resetDefault: '初期設定に戻す',
    resetConfirm: 'すべての設定を初期値にリセットしてもよろしいですか？',
    activeStatus: '有効',

    tabAiByok: 'AI & APIキー (BYOK)',
    tabAiByokDesc: 'AIエンジン、OpenAI・Groq・DeepSeek・Qwenキー',
    tabAudioVad: '音声 & VAD',
    tabAudioVadDesc: 'チャンク間隔、マイク感度、オーディオダッキング',
    tabLimits: '制限 & 時間',
    tabLimitsDesc: '時間無制限フリーモード、AI議事録自動保存',
    tabSubtitles: '字幕表示 & 言語',
    tabSubtitlesDesc: '母国語、フォントサイズ、透明度、専門用語辞書',

    freeAiTitle: '無料ローカルAIエンジン（標準）',
    freeAiBadge: '100%無料 · 完全RAM · カード不要',
    freeAiDesc:
      'Faster-Whisper int8とマルチエンジン高速翻訳（遅延350ms未満、完全RAMメモリ処理、音声保存なし）を使用します。',
    freeAiActive: '標準AIエンジン待機中',

    byokTitle: '独自APIキーの利用 (BYOK)',
    byokSubtitle: '個人または企業のAIアカウントを直接接続し、GPT-4oやClaudeなどの高精度モデルを利用できます。',
    byokToggleLabel: '独自APIキーモードを有効にする',
    byokKeyInput: '個人用APIキーを入力...',
    byokKeyHint: 'APIキーはブラウザ内（LocalStorage）に安全に保存され、サーバーへは送信されません。',
    byokSecurityNotice: 'クライアント側保存 · 暗号化メモリ · ログ記録なし',
    byokGetKeyLink: 'プロバイダーのダッシュボードでAPIキーを取得',
    byokCurrentKeySaved: 'このプロバイダーのAPIキーは保存されています',

    audioChunkTitle: '音声チャンク間隔（レイテンシ）',
    audioChunkDesc: 'AI音声認識パイプラインに送信する音声区切り時間。短いほど素早く字幕が表示されます。',
    vadTitle: '音声検出（VAD）の感度',
    vadDesc: '周囲の雑音と話者の発言を識別するエネルギー閾値。',
    duckingTitle: '自動音量抑制（オーディオダッキング -18dB）',
    duckingDesc: '話者が発言している間、共有メディアの音量を自動で下げます。',

    unlimitedTitle: '時間無制限フリーモード',
    unlimitedDesc: '40分の時間制限カウントダウンを解除して会議を継続できます。',
    autoExportTitle: 'AI議事録の自動保存',
    autoExportDesc: '会議退出時に要約とAction ItemsのMarkdownファイルを自動ダウンロードします。',
    tierTitle: 'AI翻訳ティア',
    tierStandard: '標準（高速GTXマルチエンジン）',
    tierPro: 'Pro高精度（コンテキストAI）',

    nativeLanguageTitle: 'デフォルトの母国語（字幕翻訳先）',
    nativeLanguageDesc:
      '他の参加者の発言をこの言語にリアルタイム翻訳して字幕表示します（発言せず聞くだけの場合でも有効）。',
    otherLanguages: 'その他の言語...',
    subModeTitle: '字幕表示モード',
    subSizeTitle: '字幕フォントサイズ',
    subOpacityTitle: '背景透過度',
    glossaryTitle: '専門用語辞書ドメイン',
    previewTitle: '字幕リアルタイムプレビュー',
    previewOriginal: 'Xin chào mọi người, hôm nay chúng ta bắt đầu cuộc họp dự án.',
    previewTranslation: '皆様こんにちは、本日のプロジェクト会議を開始します。',
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
    name: 'Anthropic Claude',
    badge: 'Claude 3.5 Sonnet',
    speed: '~550ms',
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

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const copy = COPY[language] || COPY.vi;

  const initialTab = (searchParams.get('tab') as SettingsTab) || 'ai_byok';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [settings, setSettings] = useState<UserMeetingSettings>(() => getUserSettings());
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab | null;
    if (tabParam && ['ai_byok', 'audio_vad', 'meeting_limits', 'subtitles'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleSelectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const [ttsOpts, setTtsOpts] = useState(ttsEngine.options);
  const updateTts = (opts: Partial<typeof ttsOpts>) => {
    const next = { ...ttsOpts, ...opts };
    setTtsOpts(next);
    ttsEngine.updateSettings(next);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2200);
  };

  const update = <K extends keyof UserMeetingSettings>(key: K, value: UserMeetingSettings[K]) => {
    const updated = saveUserSettings({ [key]: value });
    setSettings(updated);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2200);
  };

  const handleProviderSelect = (provider: ByokProvider) => {
    const existingKey = settings.providerKeys?.[provider] || '';
    const updated = saveUserSettings({
      byokProvider: provider,
      byokApiKey: existingKey,
      byokEnabled: true,
    });
    setSettings(updated);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2200);
  };

  const handleApiKeyChange = (value: string) => {
    const currentProvider = settings.byokProvider;
    const updatedKeys = {
      ...(settings.providerKeys || {}),
      [currentProvider]: value,
    };
    const updated = saveUserSettings({
      byokApiKey: value,
      providerKeys: updatedKeys,
      byokEnabled: value.trim().length > 0,
    });
    setSettings(updated);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2200);
  };

  const handleResetDefaults = () => {
    if (window.confirm(copy.resetConfirm)) {
      const reset = saveUserSettings(DEFAULT_USER_SETTINGS);
      setSettings(reset);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2200);
    }
  };

  const currentProviderInfo = useMemo(
    () => PROVIDERS.find((p) => p.id === settings.byokProvider) || PROVIDERS[0],
    [settings.byokProvider],
  );

  return (
    <div className="content-page min-h-dvh bg-zinc-50 dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#121316]/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-[#22242b]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label={copy.backToHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1a1b22] dark:hover:bg-[#252732] text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{copy.backToHome}</span>
            </button>

            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

            <Link to="/" className="flex items-center gap-2 shrink-0">
              <LayaMeetLogo size="sm" />
            </Link>
          </div>

          {/* Right Status & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Auto-saved badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-300 ${
                showSavedToast
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <Check className="w-3 h-3 text-emerald-500" />
              <span>{copy.savedToast}</span>
            </div>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition flex items-center gap-1.5 cursor-pointer"
              title={copy.resetDefault}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{copy.resetDefault}</span>
            </button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Main Layout (Left Navigation + Right Workspace) ────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
        {/* Title Heading */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
            {copy.pageTitle}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-3xl">
            {copy.pageSubtitle}
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
          {/* ── Left Sidebar Navigation (Desktop) & Top Pills (Mobile) ── */}
          <nav className="w-full lg:w-72 shrink-0 space-y-1 sm:space-y-1.5 flex lg:flex-col overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {[
              {
                id: 'ai_byok' as const,
                title: copy.tabAiByok,
                desc: copy.tabAiByokDesc,
                icon: Cpu,
                color: 'text-blue-500',
              },
              {
                id: 'audio_vad' as const,
                title: copy.tabAudioVad,
                desc: copy.tabAudioVadDesc,
                icon: Mic,
                color: 'text-emerald-500',
              },
              {
                id: 'meeting_limits' as const,
                title: copy.tabLimits,
                desc: copy.tabLimitsDesc,
                icon: Clock,
                color: 'text-amber-500',
              },
              {
                id: 'subtitles' as const,
                title: copy.tabSubtitles,
                desc: copy.tabSubtitlesDesc,
                icon: Globe,
                color: 'text-purple-500',
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  className={`w-full text-left p-3 sm:p-3.5 rounded-2xl transition-all cursor-pointer border shrink-0 sm:shrink ${
                    isSelected
                      ? 'bg-white dark:bg-[#181920] border-blue-500 shadow-md ring-1 ring-blue-500/20'
                      : 'bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-zinc-100 dark:bg-[#202128] text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          isSelected ? 'text-zinc-950 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {tab.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-400 line-clamp-1 hidden lg:block mt-0.5">
                        {tab.desc}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Quick Status Pill Card on Sidebar */}
            <div className="hidden lg:block mt-6 p-4 rounded-2xl bg-zinc-100/70 dark:bg-[#14151a] border border-zinc-200/70 dark:border-[#22242c] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Bảo mật RAM-Only</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Mô hình Whisper STT xử lý trực tiếp trên RAM, không ghi âm hay lưu trữ bất kỳ file giọng nói nào trên đĩa cứng.
              </p>
            </div>
          </nav>

          {/* ── Right Content Area ───────────────────────────────────── */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* ── TAB 1: AI & API Key (BYOK) ─────────────────────────── */}
            {activeTab === 'ai_byok' && (
              <div className="space-y-6">
                {/* Section 1: Default Local Engine */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">
                          {copy.freeAiTitle}
                        </h2>
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                          {copy.freeAiBadge}
                        </span>
                      </div>
                    </div>

                    {!settings.byokEnabled && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                        <span>{copy.freeAiActive}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {copy.freeAiDesc}
                  </p>
                </div>

                {/* Section 2: Bring Your Own Key (BYOK) */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-[#22242c]">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                        <Key className="w-4 h-4 text-amber-500" />
                        <span>{copy.byokTitle}</span>
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
                        {copy.byokSubtitle}
                      </p>
                    </div>

                    {/* BYOK Toggle */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {copy.byokToggleLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => update('byokEnabled', !settings.byokEnabled)}
                        className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                          settings.byokEnabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                        aria-label={copy.byokToggleLabel}
                      >
                        <div
                          className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform ${
                            settings.byokEnabled ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Provider Selection Cards */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                      Chọn nhà cung cấp AI:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {PROVIDERS.map((provider) => {
                        const isSelected = settings.byokProvider === provider.id;
                        const hasKey = Boolean(settings.providerKeys?.[provider.id]?.trim());
                        return (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => handleProviderSelect(provider.id)}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/10 ring-1 ring-blue-500/20'
                                : 'border-zinc-200 dark:border-[#262832] bg-zinc-50/50 dark:bg-[#1a1b22] hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                                {provider.name}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-200/80 dark:bg-[#252733] text-zinc-600 dark:text-zinc-300">
                                {provider.speed}
                              </span>
                            </div>

                            <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400 mt-1">
                              {provider.badge}
                            </div>

                            <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                              {hasKey ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Đã lưu key</span>
                                </>
                              ) : (
                                <span>Chưa nhập key</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Provider API Key Input Form */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-[#1a1b22] border border-zinc-200 dark:border-[#282a36] space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="settings-provider-api-key" className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Khóa API của {currentProviderInfo.name}:
                      </label>
                      <a
                        href={currentProviderInfo.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        <span>{copy.byokGetKeyLink}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="relative">
                      <input
                        id="settings-provider-api-key"
                        type={showApiKey ? 'text' : 'password'}
                        value={settings.providerKeys?.[settings.byokProvider] || ''}
                        onChange={(e) => handleApiKeyChange(e.target.value)}
                        placeholder={currentProviderInfo.placeholder}
                        className="w-full bg-white dark:bg-[#121316] border border-zinc-300 dark:border-[#323542] text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm font-mono rounded-xl pl-3.5 pr-11 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {copy.byokKeyHint}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{copy.byokSecurityNotice}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: Audio & VAD ─────────────────────────────────── */}
            {activeTab === 'audio_vad' && (
              <div className="space-y-6">
                {/* Audio Chunk Interval */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm space-y-4">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      <span>{copy.audioChunkTitle}</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      {copy.audioChunkDesc}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { ms: 350, label: '350ms (Khuyên dùng)', sub: 'Độ trễ thấp nhất <350ms, phụ đề tức thì' },
                      { ms: 500, label: '500ms (Cân bằng)', sub: 'Tối ưu độ chính xác và đường truyền vừa phải' },
                      { ms: 1000, label: '1000ms (Tiết kiệm CPU)', sub: 'Phù hợp máy tính cấu hình yếu hoặc tiết kiệm pin' },
                    ].map((item) => {
                      const isSelected = (settings.audioChunkMs || 350) === item.ms;
                      return (
                        <button
                          key={item.ms}
                          type="button"
                          onClick={() => update('audioChunkMs', item.ms)}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-500/10 ring-1 ring-emerald-500/20'
                              : 'border-zinc-200 dark:border-[#262832] bg-zinc-50/50 dark:bg-[#1a1b22] hover:border-zinc-300'
                          }`}
                        >
                          <div className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                            {item.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* VAD Sensitivity */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm space-y-4">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <Mic className="w-4 h-4 text-emerald-500" />
                      <span>{copy.vadTitle}</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      {copy.vadDesc}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { val: 'low' as const, label: 'Nhẹ nhàng (RMS 0.008)', sub: 'Bắt giọng nói thì thầm, phòng họp cách âm tốt' },
                      { val: 'medium' as const, label: 'Tiêu chuẩn (RMS 0.015)', sub: 'Cân bằng tối ưu cho hầu hết tai nghe và micro' },
                      { val: 'high' as const, label: 'Chặt chẽ (RMS 0.025)', sub: 'Lọc tạp âm gõ phím, văn phòng ồn hoặc quán cafe' },
                    ].map((item) => {
                      const isSelected = settings.vadSensitivity === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => update('vadSensitivity', item.val)}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-500/10 ring-1 ring-emerald-500/20'
                              : 'border-zinc-200 dark:border-[#262832] bg-zinc-50/50 dark:bg-[#1a1b22] hover:border-zinc-300'
                          }`}
                        >
                          <div className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                            {item.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Audio Ducking */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">
                        {copy.duckingTitle}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-xl">
                        {copy.duckingDesc}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => update('audioDuckingEnabled', !settings.audioDuckingEnabled)}
                    className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      settings.audioDuckingEnabled ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                    aria-label={copy.duckingTitle}
                  >
                    <div
                      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform ${
                        settings.audioDuckingEnabled ? 'translate-x-5.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* TTS Audio Interpretation */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm space-y-6">
                  <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-[#252732] pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">
                        Phiên dịch âm thanh (TTS)
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Tự động đọc phụ đề được dịch theo thời gian thực
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Kích hoạt TTS</span>
                      <button
                        type="button"
                        onClick={() => updateTts({ enabled: !ttsOpts.enabled })}
                        aria-label="Kích hoạt TTS"
                        aria-pressed={ttsOpts.enabled}
                        className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                          ttsOpts.enabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform ${
                            ttsOpts.enabled ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                        <span>Âm lượng</span>
                        <span>{Math.round(ttsOpts.volume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0" max="1" step="0.1"
                        value={ttsOpts.volume}
                        aria-label="Âm lượng TTS"
                        onChange={e => updateTts({ volume: parseFloat(e.target.value) })}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                        <span>Tốc độ đọc</span>
                        <span>{ttsOpts.rate}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5" max="2" step="0.1"
                        value={ttsOpts.rate}
                        aria-label="Tốc độ đọc TTS"
                        onChange={e => updateTts({ rate: parseFloat(e.target.value) })}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: Limits & Duration ───────────────────────────── */}
            {activeTab === 'meeting_limits' && (
              <div className="space-y-6">
                {/* Unlimited Free Meeting Mode */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">
                        {copy.unlimitedTitle}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-xl">
                        {copy.unlimitedDesc}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => update('unlimitedFreeMeeting', !settings.unlimitedFreeMeeting)}
                    className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      settings.unlimitedFreeMeeting ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                    aria-label={copy.unlimitedTitle}
                  >
                    <div
                      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform ${
                        settings.unlimitedFreeMeeting ? 'translate-x-5.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Auto AI Minutes Export */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">
                        {copy.autoExportTitle}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-xl">
                        {copy.autoExportDesc}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => update('autoAiMinutesExport', !settings.autoAiMinutesExport)}
                    className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      settings.autoAiMinutesExport ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                    aria-label={copy.autoExportTitle}
                  >
                    <div
                      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform ${
                        settings.autoAiMinutesExport ? 'translate-x-5.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Translation Tier */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm space-y-4">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span>{copy.tierTitle}</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'standard' as const, label: copy.tierStandard, sub: 'Nhanh, nhẹ, tối ưu đường truyền và không hao quota' },
                      { id: 'pro' as const, label: copy.tierPro, sub: 'Mô hình ngữ cảnh nâng cao, hiểu sâu ngữ cảnh chuyên ngành' },
                    ].map((item) => {
                      const isSelected = settings.translationTier === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => update('translationTier', item.id)}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/10 ring-1 ring-blue-500/20'
                              : 'border-zinc-200 dark:border-[#262832] bg-zinc-50/50 dark:bg-[#1a1b22] hover:border-zinc-300'
                          }`}
                        >
                          <div className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                            {item.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: Subtitles & Languages ───────────────────────── */}
            {activeTab === 'subtitles' && (
              <div className="space-y-6">
                {/* 1. Native Language Selection (Crucial for Silent Listeners) */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-blue-500/30 dark:border-blue-500/20 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">
                          {copy.nativeLanguageTitle}
                        </h2>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                          <CountryFlag code={settings.nativeLanguage || 'vi'} size="xs" />
                          <span>{getLanguageOption(settings.nativeLanguage || 'vi').nativeName}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
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
                    ].map((item) => {
                      const isSelected = (settings.nativeLanguage || 'vi') === item.code;
                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => update('nativeLanguage', item.code)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-500/20'
                              : 'border-zinc-200 dark:border-[#262832] bg-zinc-50/50 dark:bg-[#1a1b22] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                          }`}
                        >
                          <CountryFlag code={item.code} size="xs" />
                          <span className="text-xs font-semibold">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Secondary Quick-chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer border ${
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
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
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
                      className="text-xs sm:text-sm bg-zinc-50 dark:bg-[#1a1b22] border border-zinc-200 dark:border-[#282a36] text-zinc-900 dark:text-zinc-100 rounded-xl px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name} ({lang.nativeName}) - {lang.code.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Subtitle Display Mode */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm space-y-4">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-500" />
                    <span>{copy.subModeTitle}</span>
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { mode: 'bilingual' as const, label: 'Song ngữ (Bilingual)', desc: 'Hiển thị đồng thời câu gốc và câu dịch' },
                      { mode: 'translation_only' as const, label: 'Chỉ câu dịch', desc: 'Chỉ hiển thị phụ đề dịch sang ngôn ngữ của bạn' },
                      { mode: 'original_only' as const, label: 'Chỉ câu gốc', desc: 'Chỉ hiển thị chính xác những gì người nói phát biểu' },
                    ].map((item) => {
                      const isSelected = settings.subtitleDisplayMode === item.mode;
                      return (
                        <button
                          key={item.mode}
                          type="button"
                          onClick={() => update('subtitleDisplayMode', item.mode)}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/10 ring-1 ring-blue-500/20 font-semibold text-blue-700 dark:text-blue-300'
                              : 'border-zinc-200 dark:border-[#262832] bg-zinc-50/50 dark:bg-[#1a1b22] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                          }`}
                        >
                          <div className="text-xs sm:text-sm font-bold">{item.label}</div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                            {item.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Font Size & Opacity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Font Size */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm space-y-4">
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                      <Type className="w-4 h-4 text-blue-500" />
                      <span>{copy.subSizeTitle}</span>
                    </h2>

                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { size: 'sm' as const, label: 'Nhỏ (14px)' },
                        { size: 'md' as const, label: 'Vừa (18px)' },
                        { size: 'lg' as const, label: 'Lớn (22px)' },
                        { size: 'xl' as const, label: 'Cực lớn (26px)' },
                      ].map((item) => {
                        const isSelected = settings.subtitleFontSize === item.size;
                        return (
                          <button
                            key={item.size}
                            type="button"
                            onClick={() => update('subtitleFontSize', item.size)}
                            className={`p-3 rounded-xl border text-center transition-all cursor-pointer text-xs sm:text-sm ${
                              isSelected
                                ? 'border-blue-500 bg-blue-600 text-white font-bold shadow-xs'
                                : 'border-zinc-200 dark:border-[#262832] bg-zinc-50/50 dark:bg-[#1a1b22] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Opacity */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm space-y-4">
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-500" />
                      <span>{copy.subOpacityTitle}</span>
                    </h2>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { op: 'light' as const, label: '50% Mờ' },
                        { op: 'medium' as const, label: '80% Tiêu chuẩn' },
                        { op: 'heavy' as const, label: '95% Tối đậm' },
                      ].map((item) => {
                        const isSelected = settings.subtitleBgOpacity === item.op;
                        return (
                          <button
                            key={item.op}
                            type="button"
                            onClick={() => update('subtitleBgOpacity', item.op)}
                            className={`p-3 rounded-xl border text-center transition-all cursor-pointer text-xs ${
                              isSelected
                            ? 'border-emerald-500 bg-emerald-700 text-white font-bold shadow-xs'
                                : 'border-zinc-200 dark:border-[#262832] bg-zinc-50/50 dark:bg-[#1a1b22] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 4. Live Subtitle Real-time Preview Box */}
                <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 text-white shadow-xl space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold tracking-wider uppercase">
                    <span>{copy.previewTitle}</span>
                    <span className="text-blue-400 font-mono text-[11px]">Real-time Preview</span>
                  </div>

                  {/* Simulated Subtitle Pill */}
                  <div
                    className={`p-4 rounded-2xl transition-all duration-200 border border-white/10 ${
                      settings.subtitleBgOpacity === 'light'
                        ? 'bg-black/50 backdrop-blur-md'
                        : settings.subtitleBgOpacity === 'heavy'
                        ? 'bg-black/95'
                        : 'bg-black/80 backdrop-blur-sm'
                    }`}
                  >
                    <div className="space-y-1.5">
                      {(settings.subtitleDisplayMode === 'bilingual' ||
                        settings.subtitleDisplayMode === 'original_only') && (
                        <p
                          className={`font-medium text-zinc-300 leading-snug ${
                            settings.subtitleFontSize === 'sm'
                              ? 'text-xs'
                              : settings.subtitleFontSize === 'lg'
                              ? 'text-base'
                              : settings.subtitleFontSize === 'xl'
                              ? 'text-lg'
                              : 'text-sm'
                          }`}
                        >
                          🇻🇳 {copy.previewOriginal}
                        </p>
                      )}

                      {(settings.subtitleDisplayMode === 'bilingual' ||
                        settings.subtitleDisplayMode === 'translation_only') && (
                        <p
                          className={`font-bold text-yellow-300 leading-snug ${
                            settings.subtitleFontSize === 'sm'
                              ? 'text-sm'
                              : settings.subtitleFontSize === 'lg'
                              ? 'text-lg'
                              : settings.subtitleFontSize === 'xl'
                              ? 'text-xl'
                              : 'text-base'
                          }`}
                        >
                          🇺🇸 {copy.previewTranslation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. Domain Glossary */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#15161c] border border-zinc-200/80 dark:border-[#252732] shadow-sm space-y-3">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {copy.glossaryTitle}
                  </h2>
                  <select
                    aria-label={copy.glossaryTitle}
                    value={settings.glossaryDomain}
                    onChange={(e) => update('glossaryDomain', e.target.value as GlossaryDomain)}
                    className="w-full bg-zinc-50 dark:bg-[#1a1b22] border border-zinc-200 dark:border-[#282a36] text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="general">Tổng quát (Hội thoại đời sống &amp; họp chung đa ngành)</option>
                    <option value="it">Công nghệ thông tin (IT / Cloud / DevOps / BrSE / AI)</option>
                    <option value="business">Kinh doanh &amp; Tài chính (Fintech / Hợp đồng thương mại / Kế toán)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
