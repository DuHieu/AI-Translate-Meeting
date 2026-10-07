import React from 'react';
import { Participant } from 'livekit-client';
import { useIsSpeaking } from '@livekit/components-react';
import { ParticipantTile } from './ParticipantTile';

import { PipelineStatusMessage } from '../../types/subtitle';
import { SupportedLanguage } from '../../types/meeting';

interface FloatingSelfViewProps {
  participant: Participant;
  isHandRaised?: boolean;
  pipelineStatus?: PipelineStatusMessage;
  spokenLanguage?: SupportedLanguage | string;
}

export const FloatingSelfView: React.FC<FloatingSelfViewProps> = ({
  participant,
  isHandRaised = false,
  pipelineStatus,
  spokenLanguage,
}) => {
  const isSpeaking = useIsSpeaking(participant) || participant.isSpeaking;

  return (
    <div
      className={`absolute bottom-4 right-4 w-48 h-32 md:w-64 md:h-40 rounded-xl shadow-lg z-30 border overflow-hidden backdrop-blur-md transition-all ${
        isSpeaking
          ? 'border-emerald-400 ring-2 ring-emerald-400'
          : 'border-zinc-800'
      }`}
    >
      <ParticipantTile
        participant={participant}
        isLocal={true}
        isHandRaised={isHandRaised}
        pipelineStatus={pipelineStatus}
        spokenLanguage={spokenLanguage}
      />
    </div>
  );
};
