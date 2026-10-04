import React, { useEffect, useRef } from 'react';
import { TrackPublication, Participant } from 'livekit-client';
import { Monitor, StopCircle } from 'lucide-react';
import { ParticipantTile } from './ParticipantTile';
import { PipelineStatusMessage } from '../../types/subtitle';

interface PresentationStageProps {
  presenter: Participant;
  screenTrack: TrackPublication;
  participants: Participant[];
  isLocalPresenting: boolean;
  onStopPresenting: () => void;
  pipelineStatuses?: Record<string, PipelineStatusMessage>;
  raisedHands: Map<string, number>;
}

export const PresentationStage: React.FC<PresentationStageProps> = ({
  presenter,
  screenTrack,
  participants,
  isLocalPresenting,
  onStopPresenting,
  pipelineStatuses,
  raisedHands,
}) => {
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = screenVideoRef.current;
    const track = screenTrack.track;
    if (el && track) {
      track.attach(el);
      return () => {
        track.detach(el);
      };
    }
  }, [screenTrack, screenTrack.track]);

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-4 p-4 overflow-hidden relative">
      {/* Main Dominant Presentation Stage */}
      <div className="flex-1 h-full relative bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden flex flex-col items-center justify-center">
        <video
          ref={screenVideoRef}
          autoPlay
          playsInline
          muted={true}
          className="w-full h-full object-contain"
        />

        {/* Presenter Info Banner */}
        <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800 text-xs font-medium text-slate-200 flex items-center gap-2 shadow-lg">
          <Monitor className="w-4 h-4 text-sky-400" />
          <span>{presenter.name || presenter.identity} is presenting</span>
        </div>

        {/* Stop Presenting Button (When Local User is Presenting) */}
        {isLocalPresenting && (
          <button
            type="button"
            onClick={onStopPresenting}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 transition"
          >
            <StopCircle className="w-4 h-4" />
            <span>Stop Presenting</span>
          </button>
        )}
      </div>

      {/* Participants Filmstrip / Sidebar */}
      <div className="w-full md:w-64 h-36 md:h-full flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto shrink-0 scrollbar-thin">
        {participants.map((p) => (
          <div key={p.identity} className="w-44 md:w-full h-full md:h-36 shrink-0">
            <ParticipantTile
              participant={p}
              isLocal={p.isLocal}
              isHandRaised={raisedHands.has(p.identity)}
              pipelineStatus={pipelineStatuses?.[p.identity] || pipelineStatuses?.[p.sid]}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
