import React from 'react';
import { Participant } from 'livekit-client';
import { ParticipantTile } from './ParticipantTile';

import { PipelineStatusMessage } from '../../types/subtitle';

interface FloatingSelfViewProps {
  participant: Participant;
  pipelineStatus?: PipelineStatusMessage;
}

export const FloatingSelfView: React.FC<FloatingSelfViewProps> = ({ participant, pipelineStatus }) => {
  return (
    <div className="absolute bottom-4 right-4 w-48 h-32 md:w-64 md:h-40 rounded-2xl shadow-2xl z-30 border border-slate-700/80 overflow-hidden backdrop-blur-md transition-all hover:scale-105">
      <ParticipantTile participant={participant} isLocal={true} pipelineStatus={pipelineStatus} />
    </div>
  );
};
