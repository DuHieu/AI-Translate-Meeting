import React from 'react';
import { Participant } from 'livekit-client';
import { useIsSpeaking } from '@livekit/components-react';
import { ParticipantTile } from './ParticipantTile';

import { PipelineStatusMessage } from '../../types/subtitle';

interface FloatingSelfViewProps {
  participant: Participant;
  isHandRaised?: boolean;
  pipelineStatus?: PipelineStatusMessage;
}

export const FloatingSelfView: React.FC<FloatingSelfViewProps> = ({
  participant,
  isHandRaised = false,
  pipelineStatus,
}) => {
  const isSpeaking = useIsSpeaking(participant) || participant.isSpeaking;

  return (
    <div
      className={`absolute bottom-4 right-4 w-48 h-32 md:w-64 md:h-40 rounded-2xl shadow-2xl z-30 border overflow-hidden backdrop-blur-md transition-all hover:scale-105 ${
        isSpeaking
          ? 'border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)]'
          : 'border-slate-700/80'
      }`}
    >
      <ParticipantTile
        participant={participant}
        isLocal={true}
        isHandRaised={isHandRaised}
        pipelineStatus={pipelineStatus}
      />
    </div>
  );
};
