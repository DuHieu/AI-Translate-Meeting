import React, { useState } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import { MeetingShell } from './MeetingShell';
import { MeetingSessionData } from '../../types/meeting';
import { meetingApi } from '../../api/meetingApi';
import { meetingStorage } from '../../utils/meetingStorage';

interface MeetingRoomProps {
  session: MeetingSessionData;
  onLeaveComplete: () => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ session, onLeaveComplete }) => {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleDisconnected = async () => {
    if (isLeaving) return;
    setIsLeaving(true);

    try {
      await meetingApi.leaveMeeting(session.meetingCode, session.participantId);
    } catch (e) {
      console.error('Failed to report leave to backend API', e);
    } finally {
      meetingStorage.clearSession(session.meetingCode);
      onLeaveComplete();
    }
  };

  return (
    <LiveKitRoom
      serverUrl={session.liveKitUrl}
      token={session.token}
      connect={true}
      audio={true}
      video={true}
      onDisconnected={handleDisconnected}
      data-lk-theme="default"
      className="h-screen w-screen overflow-hidden bg-slate-950"
    >
      <MeetingShell session={session} onLeaveRoom={handleDisconnected} />
    </LiveKitRoom>
  );
};
