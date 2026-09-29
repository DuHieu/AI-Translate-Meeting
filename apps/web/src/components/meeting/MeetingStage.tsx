import React, { useState, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Track, Participant, RoomEvent, TrackPublication, Room } from 'livekit-client';
import { Link2, Check } from 'lucide-react';
import { LayoutMode } from './ChangeLayoutDialog';
import { ParticipantTile } from './ParticipantTile';
import { FloatingSelfView } from './FloatingSelfView';
import { PresentationStage } from './PresentationStage';

interface MeetingStageProps {
  layoutMode: LayoutMode;
  meetingCode?: string;
}

interface ActiveScreenShare {
  presenter: Participant;
  screenTrack: TrackPublication;
}

function findScreenShare(room: Room): ActiveScreenShare | null {
  // Check local participant first
  if (room.localParticipant) {
    const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    if (pub && pub.track && !pub.isMuted) {
      return { presenter: room.localParticipant, screenTrack: pub };
    }
  }
  // Check remote participants
  for (const p of room.remoteParticipants.values()) {
    const pub = p.getTrackPublication(Track.Source.ScreenShare);
    if (pub && pub.track && !pub.isMuted) {
      return { presenter: p, screenTrack: pub };
    }
  }
  return null;
}

export const MeetingStage: React.FC<MeetingStageProps> = ({ layoutMode, meetingCode }) => {
  const room = useRoomContext();
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [activeScreenShare, setActiveScreenShare] = useState<ActiveScreenShare | null>(() => findScreenShare(room));
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const list: Participant[] = Array.from<Participant>(room.remoteParticipants.values());
    if (room.localParticipant) list.unshift(room.localParticipant);
    return list;
  });

  useEffect(() => {
    const syncState = () => {
      setActiveScreenShare(findScreenShare(room));
      const list: Participant[] = Array.from<Participant>(room.remoteParticipants.values());
      if (room.localParticipant) list.unshift(room.localParticipant);
      setParticipants(list);
    };

    syncState();

    room.on(RoomEvent.TrackPublished, syncState);
    room.on(RoomEvent.TrackUnpublished, syncState);
    room.on(RoomEvent.TrackSubscribed, syncState);
    room.on(RoomEvent.TrackUnsubscribed, syncState);
    room.on(RoomEvent.TrackMuted, syncState);
    room.on(RoomEvent.TrackUnmuted, syncState);
    room.on(RoomEvent.LocalTrackPublished, syncState);
    room.on(RoomEvent.LocalTrackUnpublished, syncState);
    room.on(RoomEvent.ParticipantConnected, syncState);
    room.on(RoomEvent.ParticipantDisconnected, syncState);

    return () => {
      room.off(RoomEvent.TrackPublished, syncState);
      room.off(RoomEvent.TrackUnpublished, syncState);
      room.off(RoomEvent.TrackSubscribed, syncState);
      room.off(RoomEvent.TrackUnsubscribed, syncState);
      room.off(RoomEvent.TrackMuted, syncState);
      room.off(RoomEvent.TrackUnmuted, syncState);
      room.off(RoomEvent.LocalTrackPublished, syncState);
      room.off(RoomEvent.LocalTrackUnpublished, syncState);
      room.off(RoomEvent.ParticipantConnected, syncState);
      room.off(RoomEvent.ParticipantDisconnected, syncState);
    };
  }, [room]);

  // 1. Presentation Mode (Screen Share Active)
  if (activeScreenShare) {
    const presenter = activeScreenShare.presenter;
    const isLocalPresenting = presenter.identity === room.localParticipant?.identity;

    return (
      <PresentationStage
        presenter={presenter}
        screenTrack={activeScreenShare.screenTrack}
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
    <div className="w-full h-full p-4 flex items-center justify-center overflow-hidden relative">
      {numParticipants <= 1 && meetingCode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 border border-sky-500/30 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Đang chờ người tham gia:</span>
            <span className="font-bold text-sky-400 font-mono text-sm">{meetingCode}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const link = `${window.location.origin}/prejoin/${meetingCode}`;
              navigator.clipboard.writeText(link);
              setCopiedInvite(true);
              setTimeout(() => setCopiedInvite(false), 2000);
            }}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Link2 className="w-3.5 h-3.5" />}
            <span>{copiedInvite ? 'Đã sao chép link!' : 'Sao chép link mời'}</span>
          </button>
        </div>
      )}

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
