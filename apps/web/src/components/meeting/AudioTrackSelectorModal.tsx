import React, { useState } from 'react';
import {
  X,
  Headphones,
  Mic,
  VolumeX,
  Sliders,
  Check,
  Play,
  Square,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { SupportedLanguage } from '../../types/meeting';
import {
  AudioTrackMode,
  AudioBoothVoiceGender,
  getUserSettings,
  saveUserSettings,
} from '../../utils/userSettings';
import { audioDuckingRegistry } from '../../utils/audioDuckingRegistry';
import { speakText, stopSpeech } from '../../utils/speechAndAudio';

export interface AudioTrackSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode?: AudioTrackMode;
  onSelectMode?: (mode: AudioTrackMode) => void;
  targetLanguage?: SupportedLanguage;
  onSelectTargetLanguage?: (lang: SupportedLanguage) => void;
}

const SUPPORTED_DUBBING_LANGUAGES: { id: SupportedLanguage; label: string; flag: string }[] = [
  { id: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { id: 'en', label: 'English', flag: '🇺🇸' },
  { id: 'ja', label: '日本語', flag: '🇯🇵' },
  { id: 'ko', label: '한국어', flag: '🇰🇷' },
  { id: 'zh', label: '中文', flag: '🇨🇳' },
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
  { id: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
];

export const AudioTrackSelectorModal: React.FC<AudioTrackSelectorModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  targetLanguage,
  onSelectTargetLanguage,
}) => {
  const [settings, setSettings] = useState(() => getUserSettings());
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  if (!isOpen) return null;

  const activeMode: AudioTrackMode = currentMode ?? settings.audioTrackMode;
  const activeLang: SupportedLanguage = targetLanguage ?? settings.dubbingTargetLanguage ?? 'vi';

  const handleModeChange = (mode: AudioTrackMode) => {
    const updated = saveUserSettings({ audioTrackMode: mode });
    setSettings(updated);
    audioDuckingRegistry.setMode(mode);
    onSelectMode?.(mode);
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    const updated = saveUserSettings({ dubbingTargetLanguage: lang });
    setSettings(updated);
    onSelectTargetLanguage?.(lang);
  };

  const handleVoiceGenderChange = (gender: AudioBoothVoiceGender) => {
    const updated = saveUserSettings({ audioBoothVoiceGender: gender });
    setSettings(updated);
  };

  const handleSpeedRateChange = (rate: number) => {
    const updated = saveUserSettings({ audioBoothSpeedRate: rate });
    setSettings(updated);
  };

  const handleVolumeChange = (vol: number) => {
    const updated = saveUserSettings({ dubbingVolume: vol });
    setSettings(updated);
  };

  const handleDuckedVolumeChange = (vol: number) => {
    const updated = saveUserSettings({ duckedVolume: vol });
    setSettings(updated);
    audioDuckingRegistry.setDuckedVolume(vol);
  };

  const handleToggleTestVoice = () => {
    if (isPlayingTest) {
      stopSpeech();
      setIsPlayingTest(false);
      return;
    }

    const testPhrases: Record<SupportedLanguage, string> = {
      vi: 'Xin chào! Đây là kênh âm thanh lồng tiếng AI thông minh thời gian thực.',
      en: 'Hello! This is your real-time AI live dubbing audio channel.',
      ja: 'こんにちは！これはリアルタイムAI吹き替え音声チャンネルです。',
      ko: '안녕하세요! 실시간 AI 동시 더빙 오디오 채널입니다.',
      zh: '您好！这是您的实时AI同声传译音频频道。',
      fr: 'Bonjour ! Ceci est votre canal audio de doublage IA en temps réel.',
      de: 'Hallo! Dies ist Ihr Echtzeit-KI-Synchronisations-Audiokanal.',
      es: '¡Hola! Este es su canal de audio de doblaje con IA en tiempo real.',
      id: 'Halo! Ini adalah saluran audio sulih suara AI real-time Anda.',
      th: 'สวัสดี! นี่คือช่องสัญญาณเสียงพากย์สด AI แบบเรียลไทม์ของคุณ',
      tl: 'Kumusta! Ito ang iyong real-time AI dubbing audio channel.',
      ar: 'مرحبًا! هذه هي قناة الدبلجة الصوتية بالذكاء الاصطناعي في الوقت الفعلي.',
    };

    const textToSpeak = testPhrases[activeLang] || testPhrases.vi;
    setIsPlayingTest(true);

    const spoken = speakText(
      textToSpeak,
      activeLang,
      () => setIsPlayingTest(true),
      () => setIsPlayingTest(false),
      settings.audioBoothSpeedRate,
      settings.dubbingVolume,
      settings.audioBoothVoiceGender,
    );

    if (!spoken) {
      setIsPlayingTest(false);
    }
  };

  return (
    <AdaptiveDialog label="Kênh âm thanh đa luồng" onClose={onClose} className="meeting-audio-tracks-dialog">
      <div className="bg-[#181a20] border border-[#2b2e36] rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[85vh] flex flex-col text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2b2e36] px-5 sm:px-6 py-3.5 sm:py-4 shrink-0 bg-[#1e2027]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-zinc-100 leading-tight">
                Kênh âm thanh đa luồng
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                Lựa chọn chế độ nghe giọng người nói &amp; lồng tiếng AI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng kênh âm thanh"
            className="w-9 h-9 rounded-full bg-[#2a2d36] hover:bg-[#343844] text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Section 1: Track Mode Selection Cards */}
          <div className="space-y-2.5" role="radiogroup" aria-label="Chế độ kênh âm thanh">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              1. Chế độ nghe (Listening Track Mode)
            </span>

            {/* Mode 1: Dual Audio Ducking (Recommended) */}
            <div
              role="radio"
              tabIndex={0}
              aria-checked={activeMode === 'dual_ducking'}
              onClick={() => handleModeChange('dual_ducking')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleModeChange('dual_ducking');
                }
              }}
              className={`p-3.5 sm:p-4 rounded-xl border transition cursor-pointer relative flex items-start gap-3 ${
                activeMode === 'dual_ducking'
                  ? 'bg-sky-500/10 border-sky-500 text-white shadow-sm ring-1 ring-sky-500/30'
                  : 'bg-[#1f2127] border-[#2c2f37] text-zinc-300 hover:border-zinc-500 hover:bg-[#252830]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  activeMode === 'dual_ducking'
                    ? 'bg-sky-500 text-white'
                    : 'bg-[#2b2e37] text-zinc-400'
                }`}
              >
                <Sliders className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-100">
                    Âm thanh kép thông minh (Dual Audio Ducking)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Khuyên dùng
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  Nghe đồng thời cả hai: Âm thanh gốc tự động giảm nhỏ (-18dB) khi AI thuyết minh và tự khôi phục khi ngừng nói.
                </p>
              </div>
              {activeMode === 'dual_ducking' && (
                <div className="absolute top-4 right-4 text-sky-400">
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>

            {/* Mode 2: Translated Only */}
            <div
              role="radio"
              tabIndex={0}
              aria-checked={activeMode === 'translated_only'}
              onClick={() => handleModeChange('translated_only')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleModeChange('translated_only');
                }
              }}
              className={`p-3.5 sm:p-4 rounded-xl border transition cursor-pointer relative flex items-start gap-3 ${
                activeMode === 'translated_only'
                  ? 'bg-sky-500/10 border-sky-500 text-white shadow-sm ring-1 ring-sky-500/30'
                  : 'bg-[#1f2127] border-[#2c2f37] text-zinc-300 hover:border-zinc-500 hover:bg-[#252830]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  activeMode === 'translated_only'
                    ? 'bg-sky-500 text-white'
                    : 'bg-[#2b2e37] text-zinc-400'
                }`}
              >
                <VolumeX className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-100">
                    Chỉ nghe dịch (Translated Only)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Tập trung cao độ
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  Tắt hoàn toàn tiếng gốc của người nói (Mute 100%). Chỉ nghe duy nhất giọng thuyết minh dịch thuật của AI.
                </p>
              </div>
              {activeMode === 'translated_only' && (
                <div className="absolute top-4 right-4 text-sky-400">
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>

            {/* Mode 3: Original Audio */}
            <div
              role="radio"
              tabIndex={0}
              aria-checked={activeMode === 'original'}
              onClick={() => handleModeChange('original')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleModeChange('original');
                }
              }}
              className={`p-3.5 sm:p-4 rounded-xl border transition cursor-pointer relative flex items-start gap-3 ${
                activeMode === 'original'
                  ? 'bg-sky-500/10 border-sky-500 text-white shadow-sm ring-1 ring-sky-500/30'
                  : 'bg-[#1f2127] border-[#2c2f37] text-zinc-300 hover:border-zinc-500 hover:bg-[#252830]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  activeMode === 'original'
                    ? 'bg-sky-500 text-white'
                    : 'bg-[#2b2e37] text-zinc-400'
                }`}
              >
                <Mic className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-100">
                    Âm thanh gốc (Original Audio)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-700/60 text-zinc-300 border border-zinc-600/50">
                    Không lồng tiếng
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  Nghe trọn vẹn 100% giọng thực của người phát biểu. Tắt hoàn toàn bộ thuyết minh lồng tiếng AI.
                </p>
              </div>
              {activeMode === 'original' && (
                <div className="absolute top-4 right-4 text-sky-400">
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Dubbing Language & Voice Settings (active if not 'original') */}
          {activeMode !== 'original' && (
            <div className="space-y-4 pt-1 border-t border-[#2c2f37]">
              {/* Language Selection */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  2. Kênh ngôn ngữ thuyết minh (Target Language)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SUPPORTED_DUBBING_LANGUAGES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleLanguageChange(item.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                        activeLang === item.id
                          ? 'bg-sky-600 text-white border-sky-400 shadow-xs'
                          : 'bg-[#1f2127] border-[#2c2f37] text-zinc-300 hover:bg-[#282b34]'
                      }`}
                    >
                      <span className="text-base">{item.flag}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Gender & Speed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Voice Gender */}
                <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3 space-y-2">
                  <label className="block text-[11px] font-semibold text-zinc-300">
                    Giọng đọc AI
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'auto', label: 'Tự động' },
                      { id: 'male', label: 'Nam' },
                      { id: 'female', label: 'Nữ' },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleVoiceGenderChange(g.id as AudioBoothVoiceGender)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                          (settings.audioBoothVoiceGender || 'auto') === g.id
                            ? 'bg-sky-600 text-white font-semibold'
                            : 'bg-[#282b34] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed Rate */}
                <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-zinc-300">
                      Tốc độ lồng tiếng
                    </label>
                    <span className="text-[11px] font-mono text-sky-400 font-bold">
                      {(settings.audioBoothSpeedRate || 1.0).toFixed(1)}x
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0.8, 1.0, 1.2, 1.4].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleSpeedRateChange(rate)}
                        className={`py-1.5 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                          (settings.audioBoothSpeedRate || 1.0) === rate
                            ? 'bg-sky-600 text-white font-semibold'
                            : 'bg-[#282b34] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {rate.toFixed(1)}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dubbing Volume Slider */}
              <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-semibold text-zinc-200">
                      Âm lượng lồng tiếng AI
                    </span>
                  </div>
                  <span className="text-xs font-mono text-sky-400 font-bold">
                    {Math.round((settings.dubbingVolume ?? 1.0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.dubbingVolume ?? 1.0}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  aria-label="Âm lượng lồng tiếng AI"
                  className="w-full accent-sky-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg"
                />
              </div>

              {/* Ducking Intensity Level (if in dual_ducking mode) */}
              {activeMode === 'dual_ducking' && (
                <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">
                      Mức giảm âm nền (Ducking Level)
                    </span>
                    <span className="text-xs font-mono text-sky-400 font-bold">
                      {settings.duckedVolume <= 0.12
                        ? '-24dB (Sâu)'
                        : settings.duckedVolume <= 0.2
                        ? '-18dB (Tiêu chuẩn)'
                        : '-12dB (Nhẹ)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { vol: 0.25, label: '-12dB (Nhẹ)' },
                      { vol: 0.18, label: '-18dB (Chuẩn)' },
                      { vol: 0.10, label: '-24dB (Sâu)' },
                    ].map(({ vol, label }) => (
                      <button
                        key={vol}
                        type="button"
                        onClick={() => handleDuckedVolumeChange(vol)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                          Math.abs((settings.duckedVolume ?? 0.18) - vol) < 0.03
                            ? 'bg-sky-600 text-white font-semibold'
                            : 'bg-[#282b34] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Voice Button */}
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleToggleTestVoice}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isPlayingTest
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-[#282b34] hover:bg-[#343842] text-zinc-200 border border-[#383b44]'
                  }`}
                >
                  {isPlayingTest ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Dừng phát thử</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current text-sky-400" />
                      <span>Nghe thử giọng lồng tiếng</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  Độ trễ lồng tiếng &lt; 250ms
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#2b2e36] px-5 py-3.5 bg-[#14151a] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition cursor-pointer shadow-md"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </AdaptiveDialog>
  );
};
