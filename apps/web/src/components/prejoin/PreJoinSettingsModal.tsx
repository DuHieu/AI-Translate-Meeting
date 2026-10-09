import React from 'react';
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { Mic, Volume2, BookOpen, X } from 'lucide-react';
import { SupportedLanguage, SUPPORTED_LANGUAGES_LIST } from '../../types/meeting';

export interface GlossaryDomainOption {
  id: string;
  name: string;
  desc: string;
}

export interface PreJoinSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  selectedAudioId: string;
  setSelectedAudioId: (id: string) => void;
  selectedVideoId: string;
  setSelectedVideoId: (id: string) => void;
  isMicOn: boolean;
  audioVolume: number;
  handleTestSpeakerSound: () => void;
  isPlayingSpeakerTest: boolean;
  spokenLanguage: SupportedLanguage;
  setSpokenLanguage: (lang: SupportedLanguage) => void;
  meetingDomain: string;
  setMeetingDomain: (domain: string) => void;
  customKeywords: string;
  setCustomKeywords: (kw: string) => void;
  glossaryDomains: GlossaryDomainOption[];
}

export const PreJoinSettingsModal: React.FC<PreJoinSettingsModalProps> = ({
  isOpen,
  onClose,
  audioDevices,
  videoDevices,
  selectedAudioId,
  setSelectedAudioId,
  selectedVideoId,
  setSelectedVideoId,
  isMicOn,
  audioVolume,
  handleTestSpeakerSound,
  isPlayingSpeakerTest,
  spokenLanguage,
  setSpokenLanguage,
  meetingDomain,
  setMeetingDomain,
  customKeywords,
  setCustomKeywords,
  glossaryDomains,
}) => {
  if (!isOpen) return null;

  return (
    <AdaptiveDialog
      label="Thiết lập thiết bị và từ điển cuộc họp"
      onClose={onClose}
      className="prejoin-settings-dialog"
    >
      <div className="w-full max-w-none max-h-[88dvh] overflow-y-auto bg-zinc-100 dark:bg-[#1e1f26] rounded-2xl p-4 shadow-2xl space-y-3">
        {/* Sheet Header */}
        <div className="relative flex items-center justify-center py-1">
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Thiết lập phòng họp &amp; AI
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thiết lập"
            className="absolute right-1 p-1.5 rounded-full text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card 1: Audio & Video Devices */}
        <div className="bg-white dark:bg-[#14151a] rounded-2xl p-3.5 border border-zinc-200/70 dark:border-white/[0.06] space-y-3">
          <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 text-emerald-500" />
            <span>Thiết bị Âm thanh &amp; Camera</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">Mic</span>
              <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-[#252528] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-75 rounded-full"
                  style={{ width: `${isMicOn ? audioVolume : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono w-6 text-right">
                {isMicOn ? `${audioVolume}%` : '—'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleTestSpeakerSound}
              disabled={isPlayingSpeakerTest}
              className={`px-2 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                isPlayingSpeakerTest
                  ? 'bg-blue-600 text-white border-blue-500 animate-pulse'
                  : 'bg-zinc-100 dark:bg-[#1e2028] border-zinc-300 dark:border-[#323542] text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Volume2 className={`w-3 h-3 ${isPlayingSpeakerTest ? 'text-white' : 'text-blue-500'}`} />
              <span>{isPlayingSpeakerTest ? 'Đang phát...' : 'Thử loa'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Microphone
              </label>
              <select
                aria-label="Microphone"
                value={selectedAudioId}
                onChange={(e) => setSelectedAudioId(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#1c1e26] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-zinc-100 text-xs rounded-xl px-2.5 py-2 outline-none"
              >
                {audioDevices.length > 0 ? (
                  audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone (${d.deviceId.slice(0, 5)})`}
                    </option>
                  ))
                ) : (
                  <option value="">Microphone mặc định</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Camera
              </label>
              <select
                aria-label="Camera"
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#1c1e26] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-zinc-100 text-xs rounded-xl px-2.5 py-2 outline-none"
              >
                {videoDevices.length > 0 ? (
                  videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera (${d.deviceId.slice(0, 5)})`}
                    </option>
                  ))
                ) : (
                  <option value="">Camera mặc định</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Card 2: AI Domain Glossary, Spoken Language & Keywords */}
        <div className="bg-white dark:bg-[#14151a] rounded-2xl p-3.5 border border-zinc-200/70 dark:border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>Từ điển chuyên ngành AI</span>
          </div>
          <div>
            <label
              htmlFor="spoken-language-select"
              className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Ngôn ngữ phát biểu (Khi bạn nói)
            </label>
            <select
              id="spoken-language-select"
              aria-label="Ngôn ngữ phát biểu"
              value={spokenLanguage}
              onChange={(e) => setSpokenLanguage(e.target.value as SupportedLanguage)}
              className="w-full bg-zinc-50 dark:bg-[#1c1e26] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-zinc-200 text-base sm:text-xs rounded-xl px-2.5 py-2 outline-none"
            >
              {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>
          <select
            aria-label="Chuyên ngành cuộc họp"
            value={meetingDomain}
            onChange={(e) => {
              const newDomain = e.target.value;
              setMeetingDomain(newDomain);
              localStorage.setItem('ai-meeting-domain', newDomain);
            }}
            className="w-full bg-zinc-50 dark:bg-[#1c1e26] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-zinc-200 text-base sm:text-xs rounded-xl px-2.5 py-2 outline-none"
          >
            {glossaryDomains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={customKeywords}
            onChange={(e) => {
              setCustomKeywords(e.target.value);
              localStorage.setItem('ai-meeting-initial-prompt', e.target.value);
            }}
            aria-label="Từ khóa bổ trợ"
            placeholder="Từ khóa bổ trợ: SLA, KPI, Opex, Capex..."
            className="w-full bg-zinc-50 dark:bg-[#1c1e26] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-zinc-200 text-base sm:text-xs rounded-xl px-2.5 py-2 outline-none placeholder-zinc-400"
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
        >
          Xong
        </button>
      </div>
    </AdaptiveDialog>
  );
};
