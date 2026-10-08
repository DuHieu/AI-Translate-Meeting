import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Key,
  Mic,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  Globe,
  ExternalLink,
  CheckCircle2,
  CreditCard,
  Activity,
} from 'lucide-react';
import { ttsEngine } from '../utils/speechSynthesis';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { GoogleAuthControl } from '../components/auth/GoogleAuthControl';
import { useLanguage } from '../context/language-context-def';
import { AppLanguage } from '../i18n';
import { useUserPlan } from '../hooks/useUserPlan';
import {
  getUserSettings,
  saveUserSettings,
  UserMeetingSettings,
  DEFAULT_USER_SETTINGS,
  ByokProvider,
  GlossaryDomain,
} from '../utils/userSettings';
import {
  SUPPORTED_LANGUAGES_LIST,
} from '../types/meeting';
import { CountryFlag } from '../components/common/CountryFlag';

export type SettingsTab = 'subtitles' | 'audio_vad' | 'ai_byok' | 'plan';

interface SettingsCopy {
  pageTitle: string;
  pageSubtitle: string;
  backToHome: string;
  savedToast: string;
  resetDefault: string;
  resetConfirm: string;

  // Navigation Tabs
  tabSubtitles: string;
  tabAudioVad: string;
  tabAiByok: string;
  tabPlan: string;

  // Subtitles & Language
  sectionLanguageTitle: string;
  sectionLanguageDesc: string;
  subModeTitle: string;
  subModeDesc: string;
  subModeBilingual: string;
  subModeBilingualDesc: string;
  subModeTranslated: string;
  subModeTranslatedDesc: string;
  subModeOriginal: string;
  subModeOriginalDesc: string;
  subSizeTitle: string;
  subSizeDesc: string;
  sizeSm: string;
  sizeMd: string;
  sizeLg: string;
  sizeXl: string;
  subOpacityTitle: string;
  subOpacityDesc: string;
  opacityLight: string;
  opacityMedium: string;
  opacityHeavy: string;
  glossaryTitle: string;
  glossaryDesc: string;
  glossaryGeneral: string;
  glossaryIt: string;
  glossaryBusiness: string;
  autoExportTitle: string;
  autoExportDesc: string;
  previewTitle: string;
  previewOriginal: string;
  previewTranslation: string;

  // Audio & Voice
  audioChunkTitle: string;
  audioChunkDesc: string;
  audioChunkFast: string;
  audioChunkFastSub: string;
  audioChunkBalanced: string;
  audioChunkBalancedSub: string;
  audioChunkEco: string;
  audioChunkEcoSub: string;
  vadTitle: string;
  vadDesc: string;
  vadLowLabel: string;
  vadLowSub: string;
  vadMedLabel: string;
  vadMedSub: string;
  vadHighLabel: string;
  vadHighSub: string;
  duckingTitle: string;
  duckingDesc: string;
  ttsTitle: string;
  ttsDesc: string;
  ttsVolume: string;
  ttsRate: string;

  // AI & API Keys (BYOK)
  engineModeTitle: string;
  engineModeDesc: string;
  engineDefaultLabel: string;
  engineDefaultDesc: string;
  engineCustomLabel: string;
  engineCustomDesc: string;
  providerSelectLabel: string;
  keySavedBadge: string;
  keyMissingBadge: string;
  apiKeyInputLabel: string;
  byokGetKeyLink: string;
  byokKeyHint: string;

  // Plan & Usage
  planTitle: string;
  planSubtitle: string;
  planStatusTrial: string;
  planStatusActive: string;
  planOrgLabel: string;
  planRoomsLabel: string;
  planParticipantsLabel: string;
  planTranslationLabel: string;
  planTranslationVal: string;
  planStorageLabel: string;
  planStorageVal: string;
  planExpiresLabel: string;
  planUpgradeBtn: string;
  planSystemStatusLink: string;
  planSystemStatusDesc: string;
}

const COPY: Record<AppLanguage, SettingsCopy> = {
  vi: {
    pageTitle: 'Cài đặt',
    pageSubtitle: 'Quản lý ngôn ngữ phụ đề, âm thanh, kết nối API và thông tin gói dịch vụ.',
    backToHome: 'Trang chủ',
    savedToast: 'Đã lưu thay đổi',
    resetDefault: 'Đặt lại mặc định',
    resetConfirm: 'Khôi phục toàn bộ cài đặt về mặc định ban đầu?',

    tabSubtitles: 'Phụ đề & Ngôn ngữ',
    tabAudioVad: 'Âm thanh & Giọng nói',
    tabAiByok: 'Động cơ AI & API Key',
    tabPlan: 'Gói dịch vụ & Hạn mức',

    sectionLanguageTitle: 'Ngôn ngữ nhận phụ đề mặc định',
    sectionLanguageDesc: 'Phụ đề trong phòng họp sẽ tự động dịch sang ngôn ngữ này.',
    subModeTitle: 'Chế độ hiển thị phụ đề',
    subModeDesc: 'Chọn cách hiển thị văn bản gốc và bản dịch trên màn hình.',
    subModeBilingual: 'Song ngữ',
    subModeBilingualDesc: 'Hiển thị cả câu gốc và bản dịch',
    subModeTranslated: 'Chỉ bản dịch',
    subModeTranslatedDesc: 'Chỉ hiển thị ngôn ngữ của bạn',
    subModeOriginal: 'Chỉ câu gốc',
    subModeOriginalDesc: 'Chỉ hiển thị lời người nói',
    subSizeTitle: 'Cỡ chữ phụ đề',
    subSizeDesc: 'Điều chỉnh kích thước chữ hiển thị trên video.',
    sizeSm: 'Nhỏ (14px)',
    sizeMd: 'Vừa (18px)',
    sizeLg: 'Lớn (22px)',
    sizeXl: 'Rất lớn (26px)',
    subOpacityTitle: 'Độ đậm nền phụ đề',
    subOpacityDesc: 'Độ tương phản của khung nền phía sau chữ.',
    opacityLight: 'Mờ (50%)',
    opacityMedium: 'Tiêu chuẩn (80%)',
    opacityHeavy: 'Đậm (95%)',
    glossaryTitle: 'Từ điển chuyên ngành',
    glossaryDesc: 'Tối ưu thuật ngữ dịch theo lĩnh vực cuộc họp.',
    glossaryGeneral: 'Tổng quát (Họp chung & giao tiếp hàng ngày)',
    glossaryIt: 'Công nghệ thông tin (Phần mềm, Cloud, AI)',
    glossaryBusiness: 'Kinh doanh & Tài chính (Thương mại, Kế toán)',
    autoExportTitle: 'Tự động tải biên bản họp',
    autoExportDesc: 'Tự động xuất file Markdown tóm tắt khi rời phòng họp.',
    previewTitle: 'Xem trước phụ đề',
    previewOriginal: 'Xin chào mọi người, chúng ta bắt đầu cuộc họp.',
    previewTranslation: 'Hello everyone, let us start the meeting.',

    audioChunkTitle: 'Độ trễ gói âm thanh (Chunk Interval)',
    audioChunkDesc: 'Chu kỳ gửi âm thanh lên bộ nhận diện giọng nói. Chu kỳ ngắn giúp phụ đề hiện nhanh hơn.',
    audioChunkFast: '350ms · Nhanh',
    audioChunkFastSub: 'Phản hồi phụ đề tức thì (Khuyên dùng)',
    audioChunkBalanced: '500ms · Cân bằng',
    audioChunkBalancedSub: 'Cân bằng giữa tốc độ và băng thông',
    audioChunkEco: '1000ms · Tiết kiệm',
    audioChunkEcoSub: 'Giảm tải cho thiết bị cấu hình thấp',
    vadTitle: 'Độ nhạy thu âm (VAD)',
    vadDesc: 'Ngưỡng lọc khoảng lặng và tiếng ồn môi trường xung quanh.',
    vadLowLabel: 'Nhạy cao',
    vadLowSub: 'Phòng yên tĩnh, bắt được giọng nói nhỏ',
    vadMedLabel: 'Tiêu chuẩn',
    vadMedSub: 'Phù hợp với đa số tai nghe và micro',
    vadHighLabel: 'Lọc ồn mạnh',
    vadHighSub: 'Môi trường văn phòng ồn hoặc quán cà phê',
    duckingTitle: 'Tự động giảm âm nền (Audio Ducking)',
    duckingDesc: 'Giảm âm lượng media chia sẻ khi có người đang phát biểu.',
    ttsTitle: 'Đọc bản dịch tự động (TTS)',
    ttsDesc: 'Phát âm thanh đọc phụ đề đã dịch trong cuộc họp.',
    ttsVolume: 'Âm lượng đọc',
    ttsRate: 'Tốc độ đọc',

    engineModeTitle: 'Nguồn xử lý dịch thuật AI',
    engineModeDesc: 'Sử dụng máy chủ mặc định hoặc kết nối khóa API riêng của bạn.',
    engineDefaultLabel: 'Máy chủ mặc định',
    engineDefaultDesc: 'Faster-Whisper STT & dịch thuật tiêu chuẩn tích hợp sẵn.',
    engineCustomLabel: 'Dùng API Key riêng (BYOK)',
    engineCustomDesc: 'Gọi trực tiếp mô hình OpenAI, Groq, DeepSeek, Gemini bằng khóa cá nhân.',
    providerSelectLabel: 'Nhà cung cấp dịch vụ',
    keySavedBadge: 'Đã lưu khóa',
    keyMissingBadge: 'Chưa có khóa',
    apiKeyInputLabel: 'Khóa API cho',
    byokGetKeyLink: 'Lấy khóa API',
    byokKeyHint: 'Khóa API chỉ được lưu cục bộ trên trình duyệt của thiết bị này (LocalStorage).',

    planTitle: 'Gói dịch vụ hiện tại',
    planSubtitle: 'Thông tin giới hạn phòng họp và tài nguyên theo tài khoản của bạn.',
    planStatusTrial: 'Dùng thử / Pilot',
    planStatusActive: 'Đang hoạt động',
    planOrgLabel: 'Tổ chức / Tài khoản',
    planRoomsLabel: 'Số phòng họp đồng thời tối đa',
    planParticipantsLabel: 'Số người tham gia tối đa mỗi phòng',
    planTranslationLabel: 'Nhận diện giọng nói & Dịch phụ đề',
    planTranslationVal: 'Đã bao gồm',
    planStorageLabel: 'Lưu trữ biên bản họp',
    planStorageVal: 'Trình duyệt cục bộ / Máy chủ riêng',
    planExpiresLabel: 'Ngày hết hạn',
    planUpgradeBtn: 'Xem bảng giá',
    planSystemStatusLink: 'Trạng thái hệ thống',
    planSystemStatusDesc: 'Kiểm tra kết nối máy chủ, cơ sở dữ liệu và bộ nhớ đệm.',
  },
  en: {
    pageTitle: 'Settings',
    pageSubtitle: 'Manage subtitle languages, audio processing, API keys, and plan limits.',
    backToHome: 'Home',
    savedToast: 'Changes saved',
    resetDefault: 'Reset defaults',
    resetConfirm: 'Reset all settings to their default values?',

    tabSubtitles: 'Subtitles & Language',
    tabAudioVad: 'Audio & Voice',
    tabAiByok: 'AI Engine & API Keys',
    tabPlan: 'Plan & Usage',

    sectionLanguageTitle: 'Default Subtitle Target Language',
    sectionLanguageDesc: 'Live meeting subtitles will be translated into this language by default.',
    subModeTitle: 'Subtitle Display Mode',
    subModeDesc: 'Choose how original speech and translations appear on screen.',
    subModeBilingual: 'Bilingual',
    subModeBilingualDesc: 'Show both original speech and translation',
    subModeTranslated: 'Translation only',
    subModeTranslatedDesc: 'Show only your target language',
    subModeOriginal: 'Original only',
    subModeOriginalDesc: 'Show only the speaker’s original words',
    subSizeTitle: 'Font Size',
    subSizeDesc: 'Adjust subtitle text size over video.',
    sizeSm: 'Small (14px)',
    sizeMd: 'Medium (18px)',
    sizeLg: 'Large (22px)',
    sizeXl: 'Extra Large (26px)',
    subOpacityTitle: 'Background Opacity',
    subOpacityDesc: 'Contrast level of the subtitle backdrop.',
    opacityLight: 'Light (50%)',
    opacityMedium: 'Standard (80%)',
    opacityHeavy: 'Solid (95%)',
    glossaryTitle: 'Domain Terminology',
    glossaryDesc: 'Prioritize domain-specific vocabulary during translation.',
    glossaryGeneral: 'General (Everyday conversation & standard meetings)',
    glossaryIt: 'Information Technology (Software, Cloud, Engineering)',
    glossaryBusiness: 'Business & Finance (Commercial, Accounting, Legal)',
    autoExportTitle: 'Auto-export meeting minutes',
    autoExportDesc: 'Automatically download Markdown summary when leaving a meeting.',
    previewTitle: 'Subtitle Preview',
    previewOriginal: 'Xin chào mọi người, chúng ta bắt đầu cuộc họp.',
    previewTranslation: 'Hello everyone, let us start the meeting.',

    audioChunkTitle: 'Audio Chunk Interval',
    audioChunkDesc: 'Duration of audio segments sent for speech recognition. Shorter intervals reduce latency.',
    audioChunkFast: '350ms · Fast',
    audioChunkFastSub: 'Lowest subtitle latency (Recommended)',
    audioChunkBalanced: '500ms · Balanced',
    audioChunkBalancedSub: 'Balanced accuracy and network usage',
    audioChunkEco: '1000ms · Saver',
    audioChunkEcoSub: 'Lower CPU usage for lightweight devices',
    vadTitle: 'Voice Activity Detection (VAD)',
    vadDesc: 'Microphone sensitivity threshold for filtering background noise.',
    vadLowLabel: 'High sensitivity',
    vadLowSub: 'Quiet rooms, captures soft speech',
    vadMedLabel: 'Standard',
    vadMedSub: 'Balanced for most headsets and microphones',
    vadHighLabel: 'Strict noise filter',
    vadHighSub: 'Filters keyboard clicks and busy office noise',
    duckingTitle: 'Audio Ducking',
    duckingDesc: 'Lower shared media volume when someone speaks.',
    ttsTitle: 'Speech Interpretation (TTS)',
    ttsDesc: 'Read translated subtitles aloud during meetings.',
    ttsVolume: 'Voice volume',
    ttsRate: 'Speaking rate',

    engineModeTitle: 'Translation Engine Source',
    engineModeDesc: 'Use the built-in server engine or connect your own provider API key.',
    engineDefaultLabel: 'Default Server Engine',
    engineDefaultDesc: 'Built-in Faster-Whisper STT and standard translation pipeline.',
    engineCustomLabel: 'Custom API Key (BYOK)',
    engineCustomDesc: 'Connect your own OpenAI, Groq, DeepSeek, or Gemini key.',
    providerSelectLabel: 'AI Provider',
    keySavedBadge: 'Key saved',
    keyMissingBadge: 'No key set',
    apiKeyInputLabel: 'API Key for',
    byokGetKeyLink: 'Get API Key',
    byokKeyHint: 'Your API key is stored locally in this browser (LocalStorage) and never persisted on our servers.',

    planTitle: 'Current Plan',
    planSubtitle: 'Room capacity and resource limits associated with your account.',
    planStatusTrial: 'Trial / Pilot',
    planStatusActive: 'Active',
    planOrgLabel: 'Organization / Account',
    planRoomsLabel: 'Max concurrent rooms',
    planParticipantsLabel: 'Max participants per room',
    planTranslationLabel: 'Live STT & Subtitle Translation',
    planTranslationVal: 'Included',
    planStorageLabel: 'Meeting minutes storage',
    planStorageVal: 'Local browser / Self-hosted',
    planExpiresLabel: 'Expiration date',
    planUpgradeBtn: 'View pricing',
    planSystemStatusLink: 'System Status',
    planSystemStatusDesc: 'View server health, database readiness, and retention policy.',
  },
  ja: {
    pageTitle: '設定',
    pageSubtitle: '字幕の翻訳言語、音声処理、APIキー、およびプランの上限を管理します。',
    backToHome: 'ホーム',
    savedToast: '保存しました',
    resetDefault: '初期設定に戻す',
    resetConfirm: 'すべての設定を初期値にリセットしますか？',

    tabSubtitles: '字幕と言語',
    tabAudioVad: '音声とマイク感度',
    tabAiByok: 'AIエンジン & APIキー',
    tabPlan: 'プランと利用状況',

    sectionLanguageTitle: 'デフォルトの字幕翻訳言語',
    sectionLanguageDesc: '会議中の字幕はこの言語に自動翻訳されて表示されます。',
    subModeTitle: '字幕の表示モード',
    subModeDesc: '元の発言と翻訳テキストの表示方法を選択します。',
    subModeBilingual: 'バイリンガル',
    subModeBilingualDesc: '原文と翻訳の両方を表示',
    subModeTranslated: '翻訳のみ',
    subModeTranslatedDesc: '翻訳後のテキストのみ表示',
    subModeOriginal: '原文のみ',
    subModeOriginalDesc: '話者の元の発言のみ表示',
    subSizeTitle: 'フォントサイズ',
    subSizeDesc: 'ビデオ上に表示される字幕のサイズ。',
    sizeSm: '小 (14px)',
    sizeMd: '中 (18px)',
    sizeLg: '大 (22px)',
    sizeXl: '特大 (26px)',
    subOpacityTitle: '背景の不透明度',
    subOpacityDesc: '字幕背景のコントラスト調整。',
    opacityLight: '薄め (50%)',
    opacityMedium: '標準 (80%)',
    opacityHeavy: '濃いめ (95%)',
    glossaryTitle: '専門用語ドメイン',
    glossaryDesc: '会議の分野に合わせて専門用語の翻訳精度を最適化します。',
    glossaryGeneral: '一般（日常会話・定例ミーティング）',
    glossaryIt: 'IT・ソフトウェア（開発・クラウド・AI）',
    glossaryBusiness: 'ビジネス・金融（商談・法務・会計）',
    autoExportTitle: '議事録の自動ダウンロード',
    autoExportDesc: '会議退出時にMarkdown形式の要約を自動保存します。',
    previewTitle: '字幕プレビュー',
    previewOriginal: 'Xin chào mọi người, chúng ta bắt đầu cuộc họp.',
    previewTranslation: '皆様こんにちは、会議を開始しましょう。',

    audioChunkTitle: '音声チャンク間隔',
    audioChunkDesc: '音声認識へ送信する区切り時間。短いほど字幕が早く表示されます。',
    audioChunkFast: '350ms · 高速',
    audioChunkFastSub: '最小遅延（推奨）',
    audioChunkBalanced: '500ms · 標準',
    audioChunkBalancedSub: '精度と通信量のバランス',
    audioChunkEco: '1000ms · 省電力',
    audioChunkEcoSub: '低スペック端末での負荷軽減',
    vadTitle: '音声検出感度 (VAD)',
    vadDesc: '周囲の雑音を除去して発言を検出するマイク閾値。',
    vadLowLabel: '高感度',
    vadLowSub: '静かな部屋・小さな声の検出向け',
    vadMedLabel: '標準',
    vadMedSub: '一般的なヘッドセット・マイク向け',
    vadHighLabel: 'ノイズ除去優先',
    vadHighSub: '打鍵音や周囲が騒がしい環境向け',
    duckingTitle: 'オーディオダッキング',
    duckingDesc: '誰かが発言した際、共有メディアの音量を自動で下げます。',
    ttsTitle: '音声読み上げ (TTS)',
    ttsDesc: '翻訳された字幕をリアルタイムで音声再生します。',
    ttsVolume: '音量',
    ttsRate: '読み上げ速度',

    engineModeTitle: 'AI翻訳エンジンの選択',
    engineModeDesc: '標準サーバーエンジン、または独自のAPIキー（BYOK）を選択できます。',
    engineDefaultLabel: '標準サーバーエンジン',
    engineDefaultDesc: 'Faster-Whisper音声認識と標準翻訳パイプラインを使用します。',
    engineCustomLabel: '独自APIキーを使用 (BYOK)',
    engineCustomDesc: '個人のOpenAI、Groq、DeepSeek、Geminiキーを直接接続します。',
    providerSelectLabel: 'プロバイダー選択',
    keySavedBadge: '保存済み',
    keyMissingBadge: '未設定',
    apiKeyInputLabel: 'APIキー：',
    byokGetKeyLink: 'APIキーを取得',
    byokKeyHint: 'APIキーはお使いのブラウザ（LocalStorage）にのみ保存され、サーバーには保存されません。',

    planTitle: '現在のプラン',
    planSubtitle: 'アカウントに適用されているルーム上限と仕様。',
    planStatusTrial: 'トライアル / Pilot',
    planStatusActive: '有効',
    planOrgLabel: '組織 / アカウント',
    planRoomsLabel: '同時開催可能な最大ルーム数',
    planParticipantsLabel: '1ルームあたりの最大参加人数',
    planTranslationLabel: 'リアルタイム音声認識 & 字幕翻訳',
    planTranslationVal: '標準搭載',
    planStorageLabel: '議事録の保存先',
    planStorageVal: 'ローカルブラウザ / セルフホスト',
    planExpiresLabel: '有効期限',
    planUpgradeBtn: '料金プランを見る',
    planSystemStatusLink: 'システム稼働状況',
    planSystemStatusDesc: 'サーバー、データベース、キャッシュの稼働状態を確認します。',
  },
};

const PROVIDERS: {
  id: ByokProvider;
  name: string;
  modelHint: string;
  placeholder: string;
  docsUrl: string;
}[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    modelHint: 'GPT-4o / GPT-4o mini',
    placeholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'groq',
    name: 'Groq',
    modelHint: 'Llama 3.3 70B',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    modelHint: 'DeepSeek V3',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'qwen',
    name: 'Alibaba Qwen',
    modelHint: 'Qwen-MT / Plus',
    placeholder: 'sk-...',
    docsUrl: 'https://dashscope.console.aliyun.com/',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    modelHint: 'Gemini 2.0 Flash',
    placeholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    modelHint: 'Claude 3.5 Sonnet',
    placeholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'deepl',
    name: 'DeepL',
    modelHint: 'DeepL Translate API',
    placeholder: '...:fx',
    docsUrl: 'https://www.deepl.com/pro-api',
  },
];

function normalizeTab(raw: string | null): SettingsTab {
  if (raw === 'audio_vad') return 'audio_vad';
  if (raw === 'ai_byok') return 'ai_byok';
  if (raw === 'plan' || raw === 'privacy') return 'plan';
  if (raw === 'subtitles' || raw === 'meeting_limits') return 'subtitles';
  return 'subtitles';
}

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const copy = COPY[language] || COPY.vi;
  const userPlan = useUserPlan();

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => normalizeTab(searchParams.get('tab')));
  const [settings, setSettings] = useState<UserMeetingSettings>(() => getUserSettings());
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(normalizeTab(tabParam));
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
    setTimeout(() => setShowSavedToast(false), 2000);
  };

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
      byokEnabled: true,
    });
    setSettings(updated);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
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
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleResetDefaults = () => {
    if (window.confirm(copy.resetConfirm)) {
      const reset = saveUserSettings(DEFAULT_USER_SETTINGS);
      setSettings(reset);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
    }
  };

  const currentProviderInfo = useMemo(
    () => PROVIDERS.find((p) => p.id === settings.byokProvider) || PROVIDERS[0],
    [settings.byokProvider],
  );

  const navItems: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'subtitles', label: copy.tabSubtitles, icon: Globe },
    { id: 'audio_vad', label: copy.tabAudioVad, icon: Mic },
    { id: 'ai_byok', label: copy.tabAiByok, icon: Key },
    { id: 'plan', label: copy.tabPlan, icon: CreditCard },
  ];

  return (
    <div className="content-page min-h-dvh bg-zinc-50 dark:bg-[#0d0e11] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0d0e11]/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label={copy.backToHome}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{copy.backToHome}</span>
            </button>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

            <Link to="/" className="flex items-center shrink-0">
              <LayaMeetLogo size="sm" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-opacity duration-200 ${
                showSavedToast
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 opacity-100'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{copy.savedToast}</span>
            </div>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition flex items-center gap-1.5 cursor-pointer"
              title={copy.resetDefault}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{copy.resetDefault}</span>
            </button>

            <LanguageSwitcher />
            <ThemeToggle />
            <GoogleAuthControl variant="navbar" />
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {copy.pageTitle}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            {copy.pageSubtitle}
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start gap-6 lg:gap-8">
          {/* ── Sidebar Navigation ── */}
          <nav
            aria-label={copy.pageTitle}
            className="w-full md:w-56 shrink-0 flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 border-b md:border-b-0 border-zinc-200 dark:border-zinc-800 scrollbar-none"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap text-left ${
                    isSelected
                      ? 'bg-zinc-200/80 dark:bg-zinc-800/90 text-zinc-950 dark:text-white font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* ── Right Content Panel ── */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* ── TAB 1: Subtitles & Language ── */}
            {activeTab === 'subtitles' && (
              <div className="space-y-5">
                <div className="rounded-xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                  {/* 1. Target Language Grid */}
                  <div className="p-5 space-y-3.5">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {copy.sectionLanguageTitle}
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {copy.sectionLanguageDesc}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {SUPPORTED_LANGUAGES_LIST.map((lang) => {
                        const isSelected = (settings.nativeLanguage || 'vi') === lang.code;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => update('nativeLanguage', lang.code)}
                            className={`px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold'
                                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <CountryFlag code={lang.code} size="xs" />
                              <span className="text-xs truncate">{lang.nativeName}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Display Mode */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {copy.subModeTitle}
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {copy.subModeDesc}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { mode: 'bilingual' as const, label: copy.subModeBilingual, desc: copy.subModeBilingualDesc },
                        { mode: 'translation_only' as const, label: copy.subModeTranslated, desc: copy.subModeTranslatedDesc },
                        { mode: 'original_only' as const, label: copy.subModeOriginal, desc: copy.subModeOriginalDesc },
                      ].map((item) => {
                        const isSelected = settings.subtitleDisplayMode === item.mode;
                        return (
                          <button
                            key={item.mode}
                            type="button"
                            onClick={() => update('subtitleDisplayMode', item.mode)}
                            className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/15 text-zinc-900 dark:text-white'
                                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div className="text-xs font-semibold flex items-center justify-between">
                              <span>{item.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {item.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Font Size & Opacity */}
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {copy.subSizeTitle}
                      </label>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {copy.subSizeDesc}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {[
                          { size: 'sm' as const, label: copy.sizeSm },
                          { size: 'md' as const, label: copy.sizeMd },
                          { size: 'lg' as const, label: copy.sizeLg },
                          { size: 'xl' as const, label: copy.sizeXl },
                        ].map((item) => {
                          const isSelected = settings.subtitleFontSize === item.size;
                          return (
                            <button
                              key={item.size}
                              type="button"
                              onClick={() => update('subtitleFontSize', item.size)}
                              className={`px-2.5 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white font-semibold'
                                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {copy.subOpacityTitle}
                      </label>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {copy.subOpacityDesc}
                      </p>
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {[
                          { op: 'light' as const, label: copy.opacityLight },
                          { op: 'medium' as const, label: copy.opacityMedium },
                          { op: 'heavy' as const, label: copy.opacityHeavy },
                        ].map((item) => {
                          const isSelected = settings.subtitleBgOpacity === item.op;
                          return (
                            <button
                              key={item.op}
                              type="button"
                              onClick={() => update('subtitleBgOpacity', item.op)}
                              className={`px-2 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white font-semibold'
                                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 4. Domain Terminology */}
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {copy.glossaryTitle}
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {copy.glossaryDesc}
                      </p>
                    </div>
                    <select
                      aria-label={copy.glossaryTitle}
                      value={settings.glossaryDomain}
                      onChange={(e) => update('glossaryDomain', e.target.value as GlossaryDomain)}
                      className="sm:w-72 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="general">{copy.glossaryGeneral}</option>
                      <option value="it">{copy.glossaryIt}</option>
                      <option value="business">{copy.glossaryBusiness}</option>
                    </select>
                  </div>

                  {/* 5. Auto-export Meeting Minutes */}
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {copy.autoExportTitle}
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {copy.autoExportDesc}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(settings.autoAiMinutesExport)}
                      aria-label={copy.autoExportTitle}
                      onClick={() => update('autoAiMinutesExport', !settings.autoAiMinutesExport)}
                      className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                        settings.autoAiMinutesExport ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform ${
                          settings.autoAiMinutesExport ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Live Subtitle Preview */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-white space-y-2.5">
                  <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    {copy.previewTitle}
                  </div>
                  <div
                    className={`p-3.5 rounded-lg border border-white/10 transition-all ${
                      settings.subtitleBgOpacity === 'light'
                        ? 'bg-black/50'
                        : settings.subtitleBgOpacity === 'heavy'
                        ? 'bg-black/95'
                        : 'bg-black/80'
                    }`}
                  >
                    <div className="space-y-1">
                      {(settings.subtitleDisplayMode === 'bilingual' ||
                        settings.subtitleDisplayMode === 'original_only') && (
                        <p
                          className={`text-zinc-300 flex items-center gap-2 ${
                            settings.subtitleFontSize === 'sm'
                              ? 'text-xs'
                              : settings.subtitleFontSize === 'lg'
                              ? 'text-base'
                              : settings.subtitleFontSize === 'xl'
                              ? 'text-lg'
                              : 'text-sm'
                          }`}
                        >
                          <CountryFlag code="vi" size="xs" />
                          <span>{copy.previewOriginal}</span>
                        </p>
                      )}
                      {(settings.subtitleDisplayMode === 'bilingual' ||
                        settings.subtitleDisplayMode === 'translation_only') && (
                        <p
                          className={`font-semibold text-amber-300 flex items-center gap-2 ${
                            settings.subtitleFontSize === 'sm'
                              ? 'text-sm'
                              : settings.subtitleFontSize === 'lg'
                              ? 'text-lg'
                              : settings.subtitleFontSize === 'xl'
                              ? 'text-xl'
                              : 'text-base'
                          }`}
                        >
                          <CountryFlag code={settings.nativeLanguage || 'en'} size="xs" />
                          <span>{copy.previewTranslation}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: Audio & Voice ── */}
            {activeTab === 'audio_vad' && (
              <div className="rounded-xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                {/* 1. Audio Chunk Interval */}
                <div className="p-5 space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {copy.audioChunkTitle}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {copy.audioChunkDesc}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { ms: 350, label: copy.audioChunkFast, sub: copy.audioChunkFastSub },
                      { ms: 500, label: copy.audioChunkBalanced, sub: copy.audioChunkBalancedSub },
                      { ms: 1000, label: copy.audioChunkEco, sub: copy.audioChunkEcoSub },
                    ].map((item) => {
                      const isSelected = (settings.audioChunkMs || 350) === item.ms;
                      return (
                        <button
                          key={item.ms}
                          type="button"
                          onClick={() => update('audioChunkMs', item.ms)}
                          className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/15 text-zinc-900 dark:text-white'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                          }`}
                        >
                          <div className="text-xs font-semibold flex items-center justify-between">
                            <span>{item.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {item.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. VAD Sensitivity */}
                <div className="p-5 space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {copy.vadTitle}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {copy.vadDesc}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { val: 'low' as const, label: copy.vadLowLabel, sub: copy.vadLowSub },
                      { val: 'medium' as const, label: copy.vadMedLabel, sub: copy.vadMedSub },
                      { val: 'high' as const, label: copy.vadHighLabel, sub: copy.vadHighSub },
                    ].map((item) => {
                      const isSelected = settings.vadSensitivity === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => update('vadSensitivity', item.val)}
                          className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/15 text-zinc-900 dark:text-white'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                          }`}
                        >
                          <div className="text-xs font-semibold flex items-center justify-between">
                            <span>{item.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {item.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Audio Ducking */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {copy.duckingTitle}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {copy.duckingDesc}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(settings.audioDuckingEnabled)}
                    aria-label={copy.duckingTitle}
                    onClick={() => update('audioDuckingEnabled', !settings.audioDuckingEnabled)}
                    className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      settings.audioDuckingEnabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform ${
                        settings.audioDuckingEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Speech Interpretation (TTS) */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {copy.ttsTitle}
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {copy.ttsDesc}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(ttsOpts.enabled)}
                      aria-label={copy.ttsTitle}
                      onClick={() => updateTts({ enabled: !ttsOpts.enabled })}
                      className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                        ttsOpts.enabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform ${
                          ttsOpts.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                        <span>{copy.ttsVolume}</span>
                        <span className="font-mono">{Math.round(ttsOpts.volume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={ttsOpts.volume}
                        aria-label={copy.ttsVolume}
                        onChange={(e) => updateTts({ volume: parseFloat(e.target.value) })}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                        <span>{copy.ttsRate}</span>
                        <span className="font-mono">{ttsOpts.rate}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={ttsOpts.rate}
                        aria-label={copy.ttsRate}
                        onChange={(e) => updateTts({ rate: parseFloat(e.target.value) })}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: AI Engine & API Keys (BYOK) ── */}
            {activeTab === 'ai_byok' && (
              <div className="rounded-xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                {/* 1. Engine Mode Selection */}
                <div className="p-5 space-y-3.5">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {copy.engineModeTitle}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {copy.engineModeDesc}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => update('byokEnabled', false)}
                      className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        !settings.byokEnabled
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/15'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {copy.engineDefaultLabel}
                        </span>
                        {!settings.byokEnabled && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        {copy.engineDefaultDesc}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => update('byokEnabled', true)}
                      className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        settings.byokEnabled
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/15'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {copy.engineCustomLabel}
                        </span>
                        {settings.byokEnabled && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        {copy.engineCustomDesc}
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Provider & API Key Form */}
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2.5">
                      {copy.providerSelectLabel}
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {PROVIDERS.map((provider) => {
                        const isSelected = settings.byokProvider === provider.id;
                        const hasKey = Boolean(settings.providerKeys?.[provider.id]?.trim());
                        return (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => handleProviderSelect(provider.id)}
                            className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/15'
                                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 hover:border-zinc-300'
                            }`}
                          >
                            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {provider.name}
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {provider.modelHint}
                            </div>
                            <div className="mt-2 flex items-center gap-1 text-[10px]">
                              {hasKey ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  {copy.keySavedBadge}
                                </span>
                              ) : (
                                <span className="text-zinc-400 dark:text-zinc-500">{copy.keyMissingBadge}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* API Key Input */}
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="settings-provider-api-key"
                        className="text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                      >
                        {copy.apiKeyInputLabel} {currentProviderInfo.name}
                      </label>
                      <a
                        href={currentProviderInfo.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
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
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm font-mono rounded-lg pl-3.5 pr-10 py-2.5 outline-none focus:border-blue-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                        aria-label="Toggle API key visibility"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {copy.byokKeyHint}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: Plan & Usage ── */}
            {activeTab === 'plan' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  {/* Plan Header */}
                  <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                          {copy.planTitle}: {userPlan.badge}
                        </h2>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {userPlan.status === 'trial' ? copy.planStatusTrial : copy.planStatusActive}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {copy.planSubtitle}
                      </p>
                    </div>

                    <a
                      href="/#pricing"
                      className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      {copy.planUpgradeBtn}
                    </a>
                  </div>

                  {/* Factual Plan Limits Table */}
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs sm:text-sm">
                    <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <span className="text-zinc-500 dark:text-zinc-400">{copy.planOrgLabel}</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{userPlan.organizationName}</span>
                    </div>

                    <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <span className="text-zinc-500 dark:text-zinc-400">{copy.planRoomsLabel}</span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {userPlan.maxConcurrentRooms}
                      </span>
                    </div>

                    <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <span className="text-zinc-500 dark:text-zinc-400">{copy.planParticipantsLabel}</span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {userPlan.maxParticipantsPerRoom}
                      </span>
                    </div>

                    <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <span className="text-zinc-500 dark:text-zinc-400">{copy.planTranslationLabel}</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{copy.planTranslationVal}</span>
                    </div>

                    <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <span className="text-zinc-500 dark:text-zinc-400">{copy.planStorageLabel}</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{copy.planStorageVal}</span>
                    </div>

                    {userPlan.expiresAt && (
                      <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                        <span className="text-zinc-500 dark:text-zinc-400">{copy.planExpiresLabel}</span>
                        <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                          {new Date(userPlan.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Link to System Status */}
                <Link
                  to="/system-status"
                  className="p-4 rounded-xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {copy.planSystemStatusLink}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {copy.planSystemStatusDesc}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-zinc-400 shrink-0" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
