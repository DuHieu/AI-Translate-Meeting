import React from 'react';
import { Participant, Track } from 'livekit-client';
import { VideoTrack, useTracks, useIsSpeaking } from '@livekit/components-react';
import { Mic, MicOff, User } from 'lucide-react';

interface ParticipantTileProps {
  participant: Participant;
  isLocal?: boolean;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({ participant, isLocal = false }) => {
  const isSpeaking = useIsSpeaking(participant);

  // Find camera track for participant
  const tracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  });

  const cameraTrackRef = tracks.find((t) => t.participant.identity === participant.identity);
  const isVideoMuted = !cameraTrackRef || cameraTrackRef.publication?.isMuted || !participant.isCameraEnabled;
  const isAudioMuted = !participant.isMicrophoneEnabled;

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
      className={`relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-200 flex items-center justify-center select-none ${
        isSpeaking ? 'border-sky-400 ring-2 ring-sky-400/50 shadow-lg shadow-sky-500/20' : 'border-slate-800'
      }`}
    >
      {/* Video Stream or Avatar Fallback */}
      {!isVideoMuted && cameraTrackRef && cameraTrackRef.publication ? (
        <VideoTrack
          trackRef={cameraTrackRef}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center space-y-3">
          <div
            className={`w-20 h-20 md:w-24 md:h-24 rounded-full ${getAvatarBg(
              participant.identity
            )} flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-xl border-2 border-white/20`}
          >
            {initial || <User className="w-10 h-10" />}
          </div>
          <span className="text-sm font-medium text-slate-300">{displayName}</span>
        </div>
      )}

      {/* Participant Info Overlay (Bottom Left) */}
      <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/80 flex items-center gap-2 max-w-[80%] z-10">
        <span className="text-xs font-medium text-slate-100 truncate">
          {displayName} {isLocal ? '(You)' : ''}
        </span>

        <div className="flex items-center gap-1">
          {isAudioMuted ? (
            <MicOff className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-slate-300'}`} />
          )}
        </div>
      </div>
    </div>
  );
};
