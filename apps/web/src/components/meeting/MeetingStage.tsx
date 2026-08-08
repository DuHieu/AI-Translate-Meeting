import React from 'react';
import { useRoomContext, useTracks } from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';
import { LayoutMode } from './ChangeLayoutDialog';
import { ParticipantTile } from './ParticipantTile';
import { FloatingSelfView } from './FloatingSelfView';
import { PresentationStage } from './PresentationStage';

interface MeetingStageProps {
  layoutMode: LayoutMode;
}

export const MeetingStage: React.FC<MeetingStageProps> = ({ layoutMode }) => {
  const room = useRoomContext();

  // Retrieve published tracks
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  });

  const screenTrackRef = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const participants: Participant[] = Array.from<Participant>(room.remoteParticipants.values());
  if (room.localParticipant) {
    participants.unshift(room.localParticipant);
  }

  // 1. Presentation Mode (Screen Share Active)
  if (screenTrackRef) {
    const presenter = screenTrackRef.participant;
    const isLocalPresenting = presenter.identity === room.localParticipant?.identity;

    return (
      <PresentationStage
        presenter={presenter}
        screenTrack={screenTrackRef.publication}
        participants={participants}
        isLocalPresenting={isLocalPresenting}
        onStopPresenting={async () => {
          if (room.localParticipant) {
            await room.localParticipant.setScreenShareEnabled(false);
          }
        }}
      />
    );
  }

  const numParticipants = participants.length;
  const localParticipant = room.localParticipant;
  const remoteParticipants = Array.from<Participant>(room.remoteParticipants.values());

  // 2. Auto Layout Mode (2 Participants -> Remote dominant + Floating Self View)
  if (layoutMode === 'auto' && numParticipants === 2 && localParticipant && remoteParticipants.length === 1) {
    return (
      <div className="w-full h-full p-4 relative overflow-hidden flex items-center justify-center">
        {/* Dominant Remote Participant */}
        <div className="w-full h-full max-w-6xl max-h-[85vh]">
          <ParticipantTile participant={remoteParticipants[0]} />
        </div>

        {/* Floating Local Self-View Tile */}
        <FloatingSelfView participant={localParticipant} />
      </div>
    );
  }

  // 3. Spotlight Mode (Focus active speaker or first participant)
  if (layoutMode === 'spotlight' && numParticipants > 0) {
    const mainParticipant = remoteParticipants[0] || localParticipant;
    return (
      <div className="w-full h-full p-4 relative overflow-hidden flex items-center justify-center">
        <div className="w-full h-full max-w-6xl max-h-[85vh]">
          <ParticipantTile participant={mainParticipant} />
        </div>
        {localParticipant && mainParticipant.identity !== localParticipant.identity && (
          <FloatingSelfView participant={localParticipant} />
        )}
      </div>
    );
  }

  // 4. Sidebar Mode (Main speaker stage + filmstrip)
  if (layoutMode === 'sidebar' && numParticipants > 0) {
    const mainParticipant = remoteParticipants[0] || localParticipant;
    const sideParticipants = participants.filter((p) => p.identity !== mainParticipant.identity);

    return (
      <div className="w-full h-full flex flex-col md:flex-row gap-4 p-4 overflow-hidden">
        <div className="flex-1 h-full">
          <ParticipantTile participant={mainParticipant} />
        </div>
        {sideParticipants.length > 0 && (
          <div className="w-full md:w-64 h-36 md:h-full flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto shrink-0">
            {sideParticipants.map((p) => (
              <div key={p.identity} className="w-44 md:w-full h-full md:h-36 shrink-0">
                <ParticipantTile participant={p} isLocal={p.isLocal} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 5. Tiled Layout Mode (Default Grid)
  const getGridCols = () => {
    if (numParticipants <= 1) return 'grid-cols-1 max-w-4xl';
    if (numParticipants === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-6xl';
    if (numParticipants <= 4) return 'grid-cols-2 max-w-6xl';
    return 'grid-cols-2 lg:grid-cols-3 max-w-7xl';
  };

  return (
    <div className="w-full h-full p-4 flex items-center justify-center overflow-hidden">
      <div className={`w-full h-full grid gap-4 place-items-center ${getGridCols()}`}>
        {participants.map((p) => (
          <div key={p.identity} className="w-full h-full min-h-[220px]">
            <ParticipantTile participant={p} isLocal={p.isLocal} />
          </div>
        ))}
      </div>
    </div>
  );
};
