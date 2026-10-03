import React, { useEffect, useRef, useState } from 'react';
import { Participant, Track, TrackPublication, ParticipantEvent } from 'livekit-client';
import { useIsSpeaking } from '@livekit/components-react';
import { Mic, MicOff, User, Sparkles } from 'lucide-react';
import { PipelineStatusMessage } from '../../types/subtitle';

interface ParticipantTileProps {
  participant: Participant;
  isLocal?: boolean;
  pipelineStatus?: PipelineStatusMessage;
}


export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isLocal = false,
  pipelineStatus,
}) => {
  const isSpeaking = useIsSpeaking(participant);
  const videoRef = useRef<HTMLVideoElement>(null);


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

  // Attach / Detach video track to HTMLVideoElement directly
  useEffect(() => {
    const el = videoRef.current;
    const track = camPub?.track;

    if (!isVideoMuted && el && track) {
      track.attach(el);
      return () => {
        track.detach(el);
      };
    }
  }, [camPub, camPub?.track, isVideoMuted]);

  const displayName = participant.name || participant.identity || 'Participant';
  const initial = displayName.charAt(0).toUpperCase();

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
      className={`relative w-full h-full rounded-3xl overflow-hidden bg-black/60 border transition-all duration-300 flex items-center justify-center select-none shadow-2xl ${
        isSpeaking ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.25)]' : 'border-white/10'
      }`}
    >
      {/* Video Stream or Avatar Fallback */}
      {!isVideoMuted ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={true}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center space-y-3">
          <div
            className={`w-20 h-20 md:w-24 md:h-24 rounded-full ${getAvatarBg(
              participant.identity
            )} flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-xl border-2 border-white/20 ${
              isSpeaking ? 'ring-4 ring-cyan-400/60 scale-105' : ''
            } transition-transform`}
          >
            {initial || <User className="w-10 h-10" />}
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-slate-200">{displayName} {isLocal ? '(Bạn)' : ''}</span>
            <span className="text-[11px] text-slate-500">Camera đã tắt</span>
          </div>
        </div>
      )}

      {/* Participant Info Overlay (Bottom Left - Google Meet / Zoom style) */}
      <div className="absolute bottom-3 left-3 bg-[#0B0F19]/80 backdrop-blur-xl px-3 py-1.5 rounded-2xl border border-white/10 flex items-center gap-2 max-w-[80%] z-10 shadow-lg">
        <span className="text-xs font-medium text-slate-100 truncate">
          {displayName} {isLocal ? '(Bạn)' : ''}
        </span>

        <div className="flex items-center gap-1">
          {isAudioMuted ? (
            <div className="flex items-center text-red-400" title="Đã tắt mic">
              <MicOff className="w-3.5 h-3.5" />
            </div>
          ) : isSpeaking ? (
            <div className="flex items-center gap-0.5 px-0.5" title="Đang nói...">
              <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-4 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-2 bg-cyan-400 rounded-full animate-bounce" />
            </div>
          ) : (
            <Mic className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>

        {pipelineStatus?.phase === 'translating' && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold border border-cyan-500/30 animate-pulse shadow-sm"
            title="Đang chuyển ngữ lời nói..."
          >
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
            <span>Đang dịch...</span>
          </div>
        )}
      </div>
    </div>

  );
};
