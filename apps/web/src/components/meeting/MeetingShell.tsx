import React, { useState, useEffect } from 'react';
import { Participant } from 'livekit-client';
import { useRoomContext, useConnectionState, RoomAudioRenderer } from '@livekit/components-react';
import { MeetingTopBar } from './MeetingTopBar';
import { MeetingStage } from './MeetingStage';
import { MeetingBottomBar } from './MeetingBottomBar';
import { ParticipantsPanel } from './ParticipantsPanel';
import { ChangeLayoutDialog, LayoutMode } from './ChangeLayoutDialog';
import { MeetingSettingsDialog } from './MeetingSettingsDialog';
import { MeetingDetailsDialog } from './MeetingDetailsDialog';
import { WebRtcDiagnostics } from './WebRtcDiagnostics';
import { MeetingSessionData } from '../../types/meeting';

interface MeetingShellProps {
  session: MeetingSessionData;
  onLeaveRoom: () => void;
}

export const MeetingShell: React.FC<MeetingShellProps> = ({ session, onLeaveRoom }) => {
  const room = useRoomContext();
  const connectionState = useConnectionState();

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    return (localStorage.getItem('meeting-layout-mode') as LayoutMode) || 'auto';
  });

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const [isPeoplePanelOpen, setIsPeoplePanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Sync state with LiveKit Room
  useEffect(() => {
    if (!room || !room.localParticipant) return;
    setIsMicOn(room.localParticipant.isMicrophoneEnabled);
    setIsCameraOn(room.localParticipant.isCameraEnabled);
    setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
  }, [room]);

  const handleToggleMic = async () => {
    if (!room || !room.localParticipant) return;
    const newState = !isMicOn;
    setIsMicOn(newState);
    await room.localParticipant.setMicrophoneEnabled(newState);
  };

  const handleToggleCamera = async () => {
    if (!room || !room.localParticipant) return;
    const newState = !isCameraOn;
    setIsCameraOn(newState);
    await room.localParticipant.setCameraEnabled(newState);
  };

  const handleToggleScreenShare = async () => {
    if (!room || !room.localParticipant) return;
    const newState = !isScreenSharing;
    setIsScreenSharing(newState);
    await room.localParticipant.setScreenShareEnabled(newState);
  };

  const handleSelectLayout = (mode: LayoutMode) => {
    setLayoutMode(mode);
    localStorage.setItem('meeting-layout-mode', mode);
  };

  const participants: Participant[] = Array.from<Participant>(room.remoteParticipants.values());
  if (room.localParticipant) {
    participants.unshift(room.localParticipant);
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative font-sans">
      {/* Diagnostics Overlay (When VITE_ENABLE_WEBRTC_DEBUG=true) */}
      <WebRtcDiagnostics />

      {/* Header Top Bar */}
      <MeetingTopBar meetingCode={session.meetingCode} connectionState={connectionState} />

      {/* Main Stage & Right Panel Drawer Container */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 h-full relative overflow-hidden flex flex-col">
          <MeetingStage layoutMode={layoutMode} />

          {/* Reserved Subtitle Slot (Phase 1 Step 7+) */}
          <div id="subtitle-overlay-slot" className="absolute bottom-4 left-0 right-0 z-20 pointer-events-none" />
        </main>

        {/* Right Participants Side Drawer */}
        {isPeoplePanelOpen && (
          <ParticipantsPanel
            participants={participants}
            onClose={() => setIsPeoplePanelOpen(false)}
          />
        )}
      </div>

      {/* Floating Bottom Control Bar */}
      <MeetingBottomBar
        meetingCode={session.meetingCode}
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        isScreenSharing={isScreenSharing}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onLeaveRoom={onLeaveRoom}
        onOpenPeoplePanel={() => setIsPeoplePanelOpen((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLayoutMenu={() => setIsLayoutMenuOpen(true)}
        numParticipants={participants.length}
      />

      {/* Audio Renderer for LiveKit WebRTC Audio Streams */}
      <RoomAudioRenderer />

      {/* Dialog Modals */}
      {isLayoutMenuOpen && (
        <ChangeLayoutDialog
          currentLayout={layoutMode}
          onSelectLayout={handleSelectLayout}
          onClose={() => setIsLayoutMenuOpen(false)}
        />
      )}

      {isSettingsOpen && (
        <MeetingSettingsDialog onClose={() => setIsSettingsOpen(false)} />
      )}

      {isDetailsOpen && (
        <MeetingDetailsDialog
          meetingCode={session.meetingCode}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}
    </div>
  );
};
