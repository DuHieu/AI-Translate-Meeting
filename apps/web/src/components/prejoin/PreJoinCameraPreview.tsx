import React from 'react';
import { Video, Mic, MicOff, VideoOff } from 'lucide-react';
import { CountryFlag } from '../common/CountryFlag';
import { SupportedLanguage } from '../../types/meeting';

export interface PreJoinCameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isCameraOn: boolean;
  isMicOn: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  nativeLanguage: SupportedLanguage;
  cameraOffText: string;
  subtitleBadgeText: string;
}

export const PreJoinCameraPreview: React.FC<PreJoinCameraPreviewProps> = ({
  videoRef,
  isCameraOn,
  isMicOn,
  onToggleCamera,
  onToggleMic,
  nativeLanguage,
  cameraOffText,
  subtitleBadgeText,
}) => {
  return (
    <div className="h-32 sm:h-48 md:h-auto md:aspect-video bg-[#111112] rounded-xl border border-[#2e2e30] overflow-hidden relative flex items-center justify-center">
      {isCameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1.5 text-zinc-600">
          <VideoOff className="w-8 h-8 md:w-10 md:h-10 stroke-[1.5]" />
          <span className="text-xs">{cameraOffText}</span>
        </div>
      )}

      {/* Language Indicator Pill (Top Left on Camera Preview) */}
      <div className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[11px] font-medium text-zinc-100 shadow-md">
        <CountryFlag code={nativeLanguage} size="xs" />
        <span>{subtitleBadgeText}</span>
      </div>

      {/* Mic / Camera toggle overlay */}
      <div className="absolute bottom-2.5 md:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#0f0f10]/90 px-2.5 py-1.5 md:px-3 md:py-2 rounded-full border border-[#2e2e30] shadow-lg">
        <button
          type="button"
          onClick={onToggleMic}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isMicOn
              ? 'bg-[#222224] text-zinc-300 hover:bg-[#2a2a2c]'
              : 'bg-red-600 text-white hover:bg-red-500'
          }`}
          aria-label={isMicOn ? 'Tắt microphone' : 'Bật microphone'}
        >
          {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onToggleCamera}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isCameraOn
              ? 'bg-[#222224] text-zinc-300 hover:bg-[#2a2a2c]'
              : 'bg-red-600 text-white hover:bg-red-500'
          }`}
          aria-label={isCameraOn ? 'Tắt camera' : 'Bật camera'}
        >
          {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
