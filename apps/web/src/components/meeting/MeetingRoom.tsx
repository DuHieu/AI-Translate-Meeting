import React, { useState, useEffect } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import { LogLevel, setLogLevel } from 'livekit-client';
import { MeetingShell } from './MeetingShell';
import { MeetingSessionData } from '../../types/meeting';
import { meetingApi } from '../../api/meetingApi';
import { meetingStorage } from '../../utils/meetingStorage';

interface MeetingRoomProps {
  session: MeetingSessionData;
  onLeaveComplete: () => void;
}

const enableWebRtcDebug = import.meta.env.VITE_ENABLE_WEBRTC_DEBUG === 'true';

// LiveKit's built-in connection logs can include signed access-token URLs.
// Application-owned diagnostics below provide redacted state when explicitly enabled.
setLogLevel(LogLevel.silent);

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ session, onLeaveComplete }) => {
  const [isLeaving, setIsLeaving] = useState(false);

  // Safe JWT inspection without logging full token or secrets
  useEffect(() => {
    if (!enableWebRtcDebug) return;

    try {
      const parts = session.token.split('.');
      if (parts.length === 3) {
        let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4 !== 0) b64 += '=';
        const claims = JSON.parse(atob(b64));
        console.log('[LiveKit JWT Claims]', {
          iss: claims.iss,
          sub: claims.sub,
          room: claims.video?.room,
          roomJoin: claims.video?.roomJoin,
          canPublish: claims.video?.canPublish,
          canSubscribe: claims.video?.canSubscribe,
          iat: claims.iat,
          nbf: claims.nbf,
          exp: claims.exp,
        });
      }
    } catch (e) {
      console.warn('[LiveKit JWT] Could not parse claims', e);
    }
  }, [session.token]);

  const handleDisconnected = async () => {
    if (isLeaving) return;
    setIsLeaving(true);

    try {
      await meetingApi.leaveMeeting(session.meetingCode, session.participantId, session.sessionToken);
    } catch (e) {
      console.error('Failed to report leave to backend API', e);
    } finally {
      meetingStorage.clearSession(session.meetingCode);
      onLeaveComplete();
    }
  };

  const serverUrl = React.useMemo(() => {
    // When served over HTTPS (e.g. Cloudflare Quick Tunnel or custom domain),
    // browsers forbid insecure ws:// endpoints (Mixed Content).
    // Route LiveKit signaling through the secure same-origin reverse proxy (/rtc) if session.liveKitUrl is localhost/127.0.0.1
    if (window.location.protocol === 'https:' && (session.liveKitUrl.includes('127.0.0.1') || session.liveKitUrl.includes('localhost'))) {
      return window.location.origin;
    }
    return session.liveKitUrl;
  }, [session.liveKitUrl]);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={session.token}
      connect={true}
      // Avoid concurrent audio+video publish on signal connect.
      // MeetingShell publishes initial media sequentially after the room is fully connected.
      audio={false}
      video={false}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      onDisconnected={handleDisconnected}
      data-lk-theme="default"
      className="h-screen w-screen overflow-hidden bg-slate-950"
    >
      <MeetingShell session={session} onLeaveRoom={handleDisconnected} />
    </LiveKitRoom>
  );
};
