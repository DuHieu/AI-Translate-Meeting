import React, { useState, useEffect } from 'react';
import { Volume2, Play, Sparkles, X, Globe } from 'lucide-react';
import { ttsEngine, TTSOptions } from '../../utils/speechSynthesis';
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { SupportedLanguage, SUPPORTED_LANGUAGES_LIST } from '../../types/meeting';

interface TTSVoiceDubbingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLanguage?: SupportedLanguage;
  onTargetLanguageChange?: (lang: SupportedLanguage) => void;
}

export const TTSVoiceDubbingModal: React.FC<TTSVoiceDubbingModalProps> = ({
  isOpen,
  onClose,
  targetLanguage = 'vi',
  onTargetLanguageChange,
}) => {
  const [options, setOptions] = useState<TTSOptions>(ttsEngine.options);
  const [isPlaying, setIsPlaying] = useState<boolean>(ttsEngine.isPlaying);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    return ttsEngine.subscribe((opts, playing) => {
      setOptions({ ...opts });
      setIsPlaying(playing);
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setVoices(ttsEngine.getAvailableVoices());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleEnabled = () => {
    const next = !options.enabled;
    ttsEngine.updateSettings({ enabled: next });
  };

  const handleVolumeChange = (vol: number) => {
    ttsEngine.updateSettings({ volume: vol });
  };

  const handleRateChange = (rate: number) => {
    ttsEngine.updateSettings({ rate });
  };

  const handleVoiceChange = (voiceURI: string) => {
    ttsEngine.updateSettings({ voiceURI: voiceURI || undefined });
  };

  const handleTestVoice = () => {
    ttsEngine.speakPreview();
  };

  // Filter voices matching current target language
  const langPrefix = targetLanguage.slice(0, 2).toLowerCase();
  const filteredVoices = voices.filter((v) =>
    v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix)
  );

  return (
    <AdaptiveDialog label="Cài đặt Thuyết minh AI (Voice Dubbing)" onClose={onClose} className="max-w-md w-full">
      <div className="bg-[#181a20] border border-white/10 rounded-2xl p-5 shadow-2xl text-white space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Thuyết minh AI (Voice Dubbing)</h3>
              <p className="text-xs text-zinc-400">Dịch & đọc giọng nói song ngữ vào tai nghe</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Switch */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60">
          <div className="space-y-0.5">
            <span className="font-medium text-sm text-zinc-200">Bật thuyết minh thời gian thực</span>
            <p className="text-xs text-zinc-400">Tự động đọc bản dịch khi thành viên khác phát biểu</p>
          </div>
          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              options.enabled ? 'bg-emerald-500' : 'bg-zinc-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                options.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Language Selection */}
        {onTargetLanguageChange && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-400" /> Ngôn ngữ bạn muốn nghe
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => {
                const newLang = e.target.value as SupportedLanguage;
                onTargetLanguageChange(newLang);
                ttsEngine.setLanguage(newLang);
              }}
              className="w-full bg-zinc-850 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Voice Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Giọng đọc hệ thống
            </span>
            <span className="text-[11px] text-zinc-400 font-normal">
              {filteredVoices.length > 0 ? `${filteredVoices.length} giọng sẵn có` : 'Giọng mặc định'}
            </span>
          </label>
          <select
            value={options.voiceURI || ''}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="">Tự động chọn giọng chuẩn nhất (Neural/Natural)</option>
            {(filteredVoices.length > 0 ? filteredVoices : voices).map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>

        {/* Sliders: Volume & Speed */}
        <div className="space-y-3 pt-1">
          {/* Volume */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Âm lượng giọng dịch</span>
              <span className="font-mono text-sky-400">{Math.round(options.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={options.volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Speed */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Tốc độ đọc</span>
              <span className="font-mono text-sky-400">{options.rate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={options.rate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 px-0.5">
              <span>0.8x (Chậm)</span>
              <span>1.0x (Chuẩn)</span>
              <span>1.2x (Nhanh)</span>
              <span>1.5x</span>
            </div>
          </div>
        </div>

        {/* Preview / Test Button */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handleTestVoice}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
          >
            {isPlaying ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Đang phát thử...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
                <span>Nghe thử giọng</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-lg shadow-sky-600/25 transition-colors"
          >
            Xong
          </button>
        </div>
      </div>
    </AdaptiveDialog>
  );
};
