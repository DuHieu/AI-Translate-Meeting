import React, { useEffect, useRef, useState } from 'react';
import { Participant, Track, TrackPublication, ParticipantEvent } from 'livekit-client';
import { useIsSpeaking } from '@livekit/components-react';
import { Mic, MicOff, User, Sparkles, Pin, PinOff, Hand } from 'lucide-react';
import { PipelineStatusMessage } from '../../types/subtitle';
import { getLanguageOption, SupportedLanguage } from '../../types/meeting';
import { CountryFlag } from '../common/CountryFlag';
import { getUserSettings, subscribeUserSettings, VirtualBackgroundMode } from '../../utils/userSettings';

interface ParticipantTileProps {
  participant: Participant;
  isLocal?: boolean;
  isHandRaised?: boolean;
  pipelineStatus?: PipelineStatusMessage;
  spokenLanguage?: SupportedLanguage | string;
  isPinned?: boolean;
  onTogglePin?: () => void;
}


export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isLocal = false,
  isHandRaised = false,
  pipelineStatus,
  spokenLanguage,
  isPinned = false,
  onTogglePin,
}) => {
  const isSpeaking = useIsSpeaking(participant) || participant.isSpeaking;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [virtualBg, setVirtualBg] = useState<VirtualBackgroundMode>(() =>
    isLocal ? (getUserSettings().virtualBackground || 'none') : 'none'
  );

  useEffect(() => {
    if (!isLocal) return;
    return subscribeUserSettings((s) => {
      setVirtualBg(s.virtualBackground || 'none');
    });
  }, [isLocal]);


  const [camPub, setCamPub] = useState<TrackPublication | undefined>(() =>
    participant.getTrackPublication(Track.Source.Camera)
  );

  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(() => {
    const pub = participant.getTrackPublication(Track.Source.Camera);
    return !pub || !pub.track || pub.isMuted || !participant.isCameraEnabled;
  });

  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => !participant.isMicrophoneEnabled);

  useEffect(() => {
    const syncState = () => {
      const pub = participant.getTrackPublication(Track.Source.Camera);
      setCamPub(pub);
      const isMuted = !pub || !pub.track || pub.isMuted || !participant.isCameraEnabled;
      setIsVideoMuted(isMuted);
      setIsAudioMuted(!participant.isMicrophoneEnabled);
    };

    syncState();

    participant.on(ParticipantEvent.TrackPublished, syncState);
    participant.on(ParticipantEvent.TrackUnpublished, syncState);
    participant.on(ParticipantEvent.TrackSubscribed, syncState);
    participant.on(ParticipantEvent.TrackUnsubscribed, syncState);
    participant.on(ParticipantEvent.TrackMuted, syncState);
    participant.on(ParticipantEvent.TrackUnmuted, syncState);
    participant.on(ParticipantEvent.LocalTrackPublished, syncState);
    participant.on(ParticipantEvent.LocalTrackUnpublished, syncState);

    return () => {
      participant.off(ParticipantEvent.TrackPublished, syncState);
      participant.off(ParticipantEvent.TrackUnpublished, syncState);
      participant.off(ParticipantEvent.TrackSubscribed, syncState);
      participant.off(ParticipantEvent.TrackUnsubscribed, syncState);
      participant.off(ParticipantEvent.TrackMuted, syncState);
      participant.off(ParticipantEvent.TrackUnmuted, syncState);
      participant.off(ParticipantEvent.LocalTrackPublished, syncState);
      participant.off(ParticipantEvent.LocalTrackUnpublished, syncState);
    };
  }, [participant]);

  // Robust attach & play handler to prevent browser buffering / loading spinner hang
  const setVideoRef = React.useCallback(
    (el: HTMLVideoElement | null) => {
      const prev = videoRef.current;
      videoRef.current = el;
      const track = camPub?.track;

      if (prev && prev !== el && track) {
        track.detach(prev);
      }

      if (el && track && !isVideoMuted) {
        el.muted = true;
        el.defaultMuted = true;
        track.attach(el);
        const playPromise = el.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      }
    },
    [camPub?.track, isVideoMuted],
  );

  // Attach / Detach video track to HTMLVideoElement directly and ensure playback
  useEffect(() => {
    const el = videoRef.current;
    const track = camPub?.track;

    if (!isVideoMuted && el && track) {
      el.muted = true;
      el.defaultMuted = true;
      track.attach(el);
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      return () => {
        track.detach(el);
      };
    }
  }, [camPub, camPub?.track, isVideoMuted]);

  const displayName = participant.name || participant.identity || 'Participant';
  const initial = displayName.charAt(0).toUpperCase();

  const resolvedSpokenLang = React.useMemo(() => {
    if (spokenLanguage) return getLanguageOption(spokenLanguage);
    try {
      if (participant.metadata) {
        const meta = JSON.parse(participant.metadata) as { spokenLanguage?: string; language?: string };
        if (meta.spokenLanguage || meta.language) {
          return getLanguageOption(meta.spokenLanguage || meta.language);
        }
      }
    } catch {
      // ignore non-json metadata
    }
    return getLanguageOption('vi');
  }, [spokenLanguage, participant.metadata]);

  const getAvatarBg = (str: string) => {
    const colors = ['bg-indigo-600', 'bg-sky-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      className={`group relative w-full h-full rounded-2xl overflow-hidden bg-[#18181b] border transition-all duration-200 flex items-center justify-center select-none shadow-sm ${
        isSpeaking
          ? 'border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)]'
          : isPinned
          ? 'border-blue-500 ring-2 ring-blue-500/60'
          : 'border-white/10'
      }`}
    >
      {isSpeaking && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 rounded-2xl ring-2 ring-inset ring-emerald-400/70 animate-pulse"
        />
      )}

      {/* Top-Right Badges & Hover Action Bar (Google Meet & Zoom style) */}
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
        {onTogglePin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            title={isPinned ? 'Bỏ ghim người này' : 'Ghim người này vào giữa màn hình'}
            aria-label={isPinned ? 'Bỏ ghim' : 'Ghim'}
            className={`icon-target rounded-full backdrop-blur-md transition-all cursor-pointer ${
              isPinned
                ? 'bg-sky-500 text-white shadow-md hover:bg-sky-400 scale-100'
                : 'bg-black/60 text-zinc-300 hover:bg-black/85 hover:text-white'
            }`}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        )}

        {isHandRaised && (
          <div
            role="img"
            aria-label={`${displayName} đã giơ tay`}
            title={`${displayName} đã giơ tay`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/70 bg-amber-400 text-[#072711] shadow-lg shadow-black/30"
          >
            <Hand className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Video Stream or Avatar Fallback */}
      {!isVideoMuted ? (
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted={true}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            el.muted = true;
            el.defaultMuted = true;
            el.play().catch(() => {});
          }}
          onCanPlay={(e) => {
            const el = e.currentTarget;
            el.muted = true;
            el.defaultMuted = true;
            el.play().catch(() => {});
          }}
          style={
            isLocal && virtualBg !== 'none'
              ? { filter: virtualBg === 'blur_light' ? 'blur(6px)' : 'blur(14px)' }
              : undefined
          }
          className={`w-full h-full object-cover transition-[filter] duration-300 ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="relative">
            <div
              className={`w-20 h-20 md:w-24 md:h-24 rounded-full ${getAvatarBg(
                participant.identity
              )} flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-xl border-2 border-white/20 ${
                isSpeaking ? 'ring-4 ring-emerald-400/60 scale-105' : ''
              } transition-transform`}
            >
              {initial || <User className="w-10 h-10" />}
            </div>
            {resolvedSpokenLang && (
              <span
                title={`Ngôn ngữ nói: ${resolvedSpokenLang.nativeName}`}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 border border-white/20 text-sm shadow-md"
              >
                <CountryFlag code={resolvedSpokenLang.code} size="xs" />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Participant Info Overlay (Bottom Left - Google Meet style) */}
      {isHandRaised ? (
        <div className="absolute bottom-3 left-3 bg-[#c4eed0] text-[#072711] px-2.5 py-1 rounded-full font-medium text-xs flex items-center gap-1.5 shadow-md z-10 animate-in fade-in select-none">
          <Hand className="w-3.5 h-3.5 text-[#072711] shrink-0" aria-hidden="true" />
          {resolvedSpokenLang && (
            <CountryFlag code={resolvedSpokenLang.code} size="xs" />
          )}
          <span className="truncate max-w-[140px] font-semibold">{displayName}</span>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 bg-[#0B0F19]/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 flex items-center gap-2 max-w-[85%] z-10 shadow-lg select-none">
          {resolvedSpokenLang && (
            <span
              title={`Đang nói: ${resolvedSpokenLang.nativeName}`}
              className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-100 shrink-0"
            >
              <CountryFlag code={resolvedSpokenLang.code} size="xs" />
              <span className="font-mono text-[10px] text-sky-300 uppercase">{resolvedSpokenLang.code}</span>
            </span>
          )}

          <span className="text-xs font-medium text-slate-100 truncate">
            {displayName} {isLocal ? '(Bạn)' : ''}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {isAudioMuted ? (
              <div className="flex items-center text-red-400" title="Đã tắt mic">
                <MicOff className="w-3.5 h-3.5" />
              </div>
            ) : isSpeaking ? (
              <div
                role="status"
                aria-label="Đang nói"
                className="flex items-center gap-0.5 px-0.5"
                title="Đang nói..."
              >
                <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce" />
              </div>
            ) : (
              <Mic className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>

          {pipelineStatus?.phase === 'translating' && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold border border-cyan-500/30 animate-pulse shadow-xs shrink-0"
              title="Đang chuyển ngữ lời nói..."
            >
              <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
              <span>Đang dịch...</span>
            </div>
          )}
        </div>
      )}
    </div>

  );
};
