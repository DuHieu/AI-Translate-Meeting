import React from 'react';
import { Participant } from 'livekit-client';
import { X, Users, Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface ParticipantsPanelProps {
  participants: Participant[];
  onClose: () => void;
}

const ParticipantRow: React.FC<{ participant: Participant }> = ({ participant }) => {
  const name = participant.name || participant.identity;
  const isAudioMuted = !participant.isMicrophoneEnabled;
  const isVideoMuted = !participant.isCameraEnabled;

  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-slate-800 hover:bg-slate-800 transition">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-sm">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-medium text-slate-100 flex items-center gap-1.5">
            <span className="truncate max-w-[140px]">{name}</span>
            {participant.isLocal && (
              <span className="px-1.5 py-0.2 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold rounded">
                You
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-slate-400">
        {isAudioMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
        {isVideoMuted ? <VideoOff className="w-4 h-4 text-red-400" /> : <Video className="w-4 h-4 text-emerald-400" />}
      </div>
    </div>
  );
};

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({ participants, onClose }) => {
  return (
    <aside className="w-full md:w-80 h-full bg-slate-900 border-l border-slate-800 p-4 flex flex-col shadow-2xl z-30 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2 font-bold text-slate-100 text-base">
          <Users className="w-5 h-5 text-sky-400" />
          <span>People ({participants.length})</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {participants.map((p) => (
          <ParticipantRow key={p.identity} participant={p} />
        ))}
      </div>
    </aside>
  );
};
