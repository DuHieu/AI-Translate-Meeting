import { copyText } from '../../utils/clipboard';
import React, { useState, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Track, Participant, RoomEvent, TrackPublication, Room } from 'livekit-client';
import { X, UserPlus, Copy, Check, ShieldCheck } from 'lucide-react';
import { LayoutMode } from './ChangeLayoutDialog';
import { ParticipantTile } from './ParticipantTile';
import { FloatingSelfView } from './FloatingSelfView';
import { PresentationStage } from './PresentationStage';
import { PipelineStatusMessage } from '../../types/subtitle';
import { SupportedLanguage } from '../../types/meeting';

interface MeetingStageProps {
  layoutMode: LayoutMode;
  meetingCode?: string;
  pipelineStatuses?: Record<string, PipelineStatusMessage>;
  raisedHands: Map<string, number>;
  participantLanguages?: Record<string, SupportedLanguage | string>;
  isInfoCardOpen?: boolean;
  onToggleInfoCard?: () => void;
  onOpenShareModal?: () => void;
  userEmailOrName?: string;
  pinnedParticipantId?: string | null;
  onTogglePin?: (participantId: string) => void;
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

export const MeetingStage: React.FC<MeetingStageProps> = ({
  layoutMode,
  meetingCode,
  pipelineStatuses,
  raisedHands,
  participantLanguages,
  isInfoCardOpen,
  onToggleInfoCard,
  onOpenShareModal,
  userEmailOrName,
  pinnedParticipantId,
  onTogglePin,
}) => {
  const room = useRoomContext();
  const [isDismissed, setIsDismissed] = useState(true);
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window !== 'undefined' && meetingCode
    ? `${window.location.origin}/meeting/${meetingCode}`
    : `https://layameet.com/meeting/${meetingCode || ''}`;

  const handleCopyLink = async () => {
    const success = await copyText(inviteUrl);
    setCopied(success);
    setTimeout(() => setCopied(false), 2000);
  };

  const [activeScreenShare, setActiveScreenShare] = useState<ActiveScreenShare | null>(() => findScreenShare(room));
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const list: Participant[] = Array.from<Participant>(room.remoteParticipants.values());
    if (room.localParticipant) list.unshift(room.localParticipant);
    return list;
  });

  const getParticipantLang = (p: Participant) =>
    participantLanguages?.[p.identity] ||
    participantLanguages?.[p.sid] ||
    (p.name ? participantLanguages?.[p.name] : undefined);

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
        pipelineStatuses={pipelineStatuses}
        raisedHands={raisedHands}
        participantLanguages={participantLanguages}
      />
    );
  }

  const numParticipants = participants.length;
  const localParticipant = room.localParticipant;
  const remoteParticipants = Array.from<Participant>(room.remoteParticipants.values());
  const pinnedParticipant = pinnedParticipantId
    ? participants.find((p) => p.identity === pinnedParticipantId || p.sid === pinnedParticipantId) || null
    : null;

  // 1.5. User Pinned a participant (Google Meet & Zoom Spotlight behavior)
  if (pinnedParticipant) {
    const sideParticipants = participants.filter((p) => p.identity !== pinnedParticipant.identity);
    return (
      <div className="w-full h-full flex flex-col md:flex-row gap-3 sm:gap-4 p-3 sm:p-4 overflow-hidden relative">
        <div className="flex-1 h-full min-h-0 flex items-center justify-center">
          <div className="w-full h-full max-w-6xl max-h-[85vh]">
            <ParticipantTile
              participant={pinnedParticipant}
              isLocal={pinnedParticipant.isLocal}
              isHandRaised={raisedHands.has(pinnedParticipant.identity)}
              pipelineStatus={pipelineStatuses?.[pinnedParticipant.identity] || pipelineStatuses?.[pinnedParticipant.sid]}
              spokenLanguage={getParticipantLang(pinnedParticipant)}
              isPinned={true}
              onTogglePin={() => onTogglePin?.(pinnedParticipant.identity)}
            />
          </div>
        </div>
        {sideParticipants.length > 0 && (
          <div className="w-full md:w-64 h-36 md:h-full flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto shrink-0 py-1">
            {sideParticipants.map((p) => (
              <div key={p.identity} className="w-44 md:w-full h-full md:h-36 shrink-0">
                <ParticipantTile
                  participant={p}
                  isLocal={p.isLocal}
                  isHandRaised={raisedHands.has(p.identity)}
                  pipelineStatus={pipelineStatuses?.[p.identity] || pipelineStatuses?.[p.sid]}
                  spokenLanguage={getParticipantLang(p)}
                  isPinned={false}
                  onTogglePin={() => onTogglePin?.(p.identity)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. Auto Layout Mode (2 Participants -> Remote dominant + Floating Self View)
  if (layoutMode === 'auto' && numParticipants === 2 && localParticipant && remoteParticipants.length === 1) {
    const remote = remoteParticipants[0];
    return (
      <div className="w-full h-full p-3 sm:p-4 relative overflow-hidden flex items-center justify-center">
        {/* Dominant Remote Participant */}
        <div className="w-full h-full max-w-6xl max-h-[85vh]">
          <ParticipantTile
            participant={remote}
            isHandRaised={raisedHands.has(remote.identity)}
            pipelineStatus={pipelineStatuses?.[remote.identity] || pipelineStatuses?.[remote.sid]}
            spokenLanguage={getParticipantLang(remote)}
            isPinned={false}
            onTogglePin={() => onTogglePin?.(remote.identity)}
          />
        </div>

        {/* Floating Local Self-View Tile */}
        <FloatingSelfView
          participant={localParticipant}
          isHandRaised={raisedHands.has(localParticipant.identity)}
          pipelineStatus={pipelineStatuses?.[localParticipant.identity] || pipelineStatuses?.[localParticipant.sid]}
          spokenLanguage={getParticipantLang(localParticipant)}
        />
      </div>
    );
  }

  // 3. Spotlight Mode (Focus active speaker or first participant)
  if (layoutMode === 'spotlight' && numParticipants > 0) {
    const mainParticipant = remoteParticipants.find((p) => p.isSpeaking) || remoteParticipants[0] || localParticipant;
    return (
      <div className="w-full h-full p-3 sm:p-4 relative overflow-hidden flex items-center justify-center">
        <div className="w-full h-full max-w-6xl max-h-[85vh]">
          <ParticipantTile
            participant={mainParticipant}
            isLocal={mainParticipant.isLocal}
            isHandRaised={raisedHands.has(mainParticipant.identity)}
            pipelineStatus={pipelineStatuses?.[mainParticipant.identity] || pipelineStatuses?.[mainParticipant.sid]}
            spokenLanguage={getParticipantLang(mainParticipant)}
            isPinned={Boolean(pinnedParticipantId && (mainParticipant.identity === pinnedParticipantId || mainParticipant.sid === pinnedParticipantId))}
            onTogglePin={() => onTogglePin?.(mainParticipant.identity)}
          />
        </div>
        {localParticipant && mainParticipant.identity !== localParticipant.identity && (
          <FloatingSelfView
            participant={localParticipant}
            isHandRaised={raisedHands.has(localParticipant.identity)}
            pipelineStatus={pipelineStatuses?.[localParticipant.identity] || pipelineStatuses?.[localParticipant.sid]}
            spokenLanguage={getParticipantLang(localParticipant)}
          />
        )}
      </div>
    );
  }

  // 4. Sidebar Mode (Main speaker stage + filmstrip)
  if (layoutMode === 'sidebar' && numParticipants > 0) {
    const mainParticipant = remoteParticipants.find((p) => p.isSpeaking) || remoteParticipants[0] || localParticipant;
    const sideParticipants = participants.filter((p) => p.identity !== mainParticipant.identity);

    return (
      <div className="w-full h-full flex flex-col md:flex-row gap-3 sm:gap-4 p-3 sm:p-4 overflow-hidden">
        <div className="flex-1 h-full">
          <ParticipantTile
            participant={mainParticipant}
            isLocal={mainParticipant.isLocal}
            isHandRaised={raisedHands.has(mainParticipant.identity)}
            pipelineStatus={pipelineStatuses?.[mainParticipant.identity] || pipelineStatuses?.[mainParticipant.sid]}
            spokenLanguage={getParticipantLang(mainParticipant)}
            isPinned={Boolean(pinnedParticipantId && (mainParticipant.identity === pinnedParticipantId || mainParticipant.sid === pinnedParticipantId))}
            onTogglePin={() => onTogglePin?.(mainParticipant.identity)}
          />
        </div>
        {sideParticipants.length > 0 && (
          <div className="w-full md:w-64 h-36 md:h-full flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto shrink-0">
            {sideParticipants.map((p) => (
              <div key={p.identity} className="w-44 md:w-full h-full md:h-36 shrink-0">
                <ParticipantTile
                  participant={p}
                  isLocal={p.isLocal}
                  isHandRaised={raisedHands.has(p.identity)}
                  pipelineStatus={pipelineStatuses?.[p.identity] || pipelineStatuses?.[p.sid]}
                  spokenLanguage={getParticipantLang(p)}
                  isPinned={Boolean(pinnedParticipantId && (p.identity === pinnedParticipantId || p.sid === pinnedParticipantId))}
                  onTogglePin={() => onTogglePin?.(p.identity)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const isReadyCardVisible = isInfoCardOpen || (numParticipants <= 1 && !isDismissed);

  const renderReadyCard = () => {
    if (!isReadyCardVisible) return null;
    return (
      <div className="absolute bottom-4 left-3 right-3 sm:left-4 sm:right-auto sm:w-80 z-20 rounded-2xl bg-[#1e1f20] text-zinc-100 p-4 border border-zinc-700/60 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-100">Cuộc họp đã sẵn sàng</h3>
          <button
            type="button"
            onClick={() => {
              setIsDismissed(true);
              onToggleInfoCard?.();
            }}
            className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onOpenShareModal || handleCopyLink}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#041e49] font-medium py-2 px-3 rounded-full transition text-xs cursor-pointer shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap w-full shrink-0 sm:w-auto">Thêm người khác</span>
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Hoặc chia sẻ đường liên kết của cuộc họp này với những người mà bạn muốn họ tham gia vào cuộc họp
        </p>

        <div className="flex items-center justify-between bg-[#282a2d] px-3 py-2 rounded-lg border border-zinc-700/60 text-xs">
          <span className="truncate text-zinc-200 font-mono select-all">
            {inviteUrl}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            title="Sao chép đường liên kết"
            className="ml-2 text-zinc-300 hover:text-white p-1 rounded hover:bg-zinc-700 transition cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-start gap-2 text-[11px] text-zinc-400 leading-tight pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
          <span>Những người sử dụng đường liên kết đến cuộc họp này phải được bạn cho phép thì mới có thể tham gia.</span>
        </div>

        <div className="text-[11px] text-zinc-400 truncate pt-2 border-t border-zinc-800/80">
          Tham gia bằng {userEmailOrName || room.localParticipant?.identity || 'bạn'}
        </div>
      </div>
    );
  };

  // 5. Tiled Layout Mode (Default Grid)
  const getGridCols = () => {
    if (numParticipants <= 1) return 'grid-cols-1 max-w-4xl';
    if (numParticipants === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-6xl';
    if (numParticipants <= 4) return 'grid-cols-2 max-w-6xl';
    return 'grid-cols-2 lg:grid-cols-3 max-w-7xl';
  };

  return (
    <div className="meeting-video-stage w-full h-full p-2 sm:p-3 flex items-start justify-center overflow-y-auto relative">
      <div className={`meeting-video-grid w-full min-h-full grid gap-2.5 sm:gap-3 place-items-stretch ${getGridCols()}`}>
        {participants.map((p) => (
          <div key={p.identity} className="meeting-video-cell w-full min-h-0">
            <ParticipantTile
              participant={p}
              isLocal={p.isLocal}
              isHandRaised={raisedHands.has(p.identity)}
              pipelineStatus={pipelineStatuses?.[p.identity] || pipelineStatuses?.[p.sid]}
              spokenLanguage={getParticipantLang(p)}
              isPinned={Boolean(pinnedParticipantId && (p.identity === pinnedParticipantId || p.sid === pinnedParticipantId))}
              onTogglePin={() => onTogglePin?.(p.identity)}
            />
          </div>
        ))}
      </div>
      {renderReadyCard()}
    </div>
  );
};
