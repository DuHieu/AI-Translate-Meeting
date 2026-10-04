import React from 'react';
import { Participant } from 'livekit-client';
import { X, Users, Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface ParticipantsPanelProps {
  participants: Participant[];
  raisedHands: Map<string, number>;
  onClose: () => void;
}

const ParticipantRow: React.FC<{ participant: Participant; isHandRaised: boolean }> = ({
  participant,
  isHandRaised,
}) => {
  const name = participant.name || participant.identity;
  const isAudioMuted = !participant.isMicrophoneEnabled;
  const isVideoMuted = !participant.isCameraEnabled;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1b] border border-[#2e2e30] hover:border-[#3a3a3d] transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-xs font-medium text-zinc-100 flex items-center gap-1.5">
            <span className="truncate max-w-[140px] sm:max-w-[180px]">{name}</span>
            {isHandRaised && (
              <span role="img" aria-label="Đã giơ tay" title="Đã giơ tay" className="text-base leading-none">
                ✋
              </span>
            )}
            {participant.isLocal && (
              <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[9px] font-semibold rounded">
                Bạn
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-zinc-400">
        {isAudioMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-green-400" />}
        {isVideoMuted ? <VideoOff className="w-4 h-4 text-red-400" /> : <Video className="w-4 h-4 text-green-400" />}
      </div>
    </div>
  );
};

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  participants,
  raisedHands,
  onClose,
}) => {
  const sortedParticipants = [...participants].sort((left, right) => {
    const leftRaisedAt = raisedHands.get(left.identity);
    const rightRaisedAt = raisedHands.get(right.identity);
    if (leftRaisedAt !== undefined && rightRaisedAt !== undefined) {
      return leftRaisedAt - rightRaisedAt;
    }
    if (leftRaisedAt !== undefined) return -1;
    if (rightRaisedAt !== undefined) return 1;
    return 0;
  });

  return (
    <aside className="absolute inset-0 md:static md:w-80 h-full bg-[#111112] md:border-l border-[#2e2e30] p-4 flex flex-col z-30 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2e2e30] pb-3 mb-4">
        <div className="flex items-center gap-2 font-semibold text-zinc-100 text-sm">
          <Users className="w-4 h-4 text-blue-400" />
          <span>Người tham gia ({participants.length})</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-[#1a1a1b] hover:bg-[#222224] text-zinc-400 hover:text-zinc-100 border border-[#3a3a3d] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Đóng danh sách"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {sortedParticipants.map((p) => (
          <ParticipantRow
            key={p.sid || p.identity}
            participant={p}
            isHandRaised={raisedHands.has(p.identity)}
          />
        ))}
      </div>
    </aside>
  );
};
