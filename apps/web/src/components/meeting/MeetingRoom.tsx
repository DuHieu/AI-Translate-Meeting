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
  const [meetingEnded, setMeetingEnded] = useState(false);

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

  const handleLeaveRoom = async () => {
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

  const handleDisconnected = () => {
    if (!isLeaving) setMeetingEnded(true);
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        meetingStorage.clearSession(session.meetingCode);
        const body = JSON.stringify({ participantId: session.participantId });
        fetch(`/api/meetings/${session.meetingCode}/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.sessionToken}`,
          },
          body,
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Ignore unload errors
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session.meetingCode, session.participantId, session.sessionToken]);

  const serverUrl = React.useMemo(() => {
    // When served over HTTPS (e.g. Cloudflare Quick Tunnel or custom domain),
    // browsers forbid insecure ws:// endpoints (Mixed Content).
    // Route LiveKit signaling through the secure same-origin reverse proxy (/rtc) if session.liveKitUrl is localhost/127.0.0.1
    if (window.location.protocol === 'https:' && (session.liveKitUrl.includes('127.0.0.1') || session.liveKitUrl.includes('localhost'))) {
      return window.location.origin;
    }
    return session.liveKitUrl;
  }, [session.liveKitUrl]);

  if (typeof RTCPeerConnection === 'undefined') {
    return (
      <main className="content-page min-h-dvh flex items-center justify-center bg-slate-950 p-6 text-slate-100">
        <section className="w-full max-w-lg rounded-2xl border border-slate-600 p-6 space-y-4">
          <h1 className="text-xl font-semibold">Trình duyệt chưa hỗ trợ cuộc họp WebRTC</h1>
          <p role="alert">Hãy cập nhật Safari hoặc Chrome, hoặc mở cùng mã phòng trên máy tính. Bạn không cần microphone hay camera để vào ở chế độ chỉ nghe.</p>
          <p className="font-mono select-all">Mã phòng: {session.meetingCode}</p>
          <button type="button" onClick={() => void handleLeaveRoom()} className="meeting-menu-action">Quay lại màn hình chuẩn bị</button>
        </section>
      </main>
    );
  }

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
      className="meeting-room w-full overflow-hidden bg-slate-950"
    >
      <MeetingShell
        session={session}
        onLeaveRoom={handleLeaveRoom}
        meetingEnded={meetingEnded}
      />
    </LiveKitRoom>
  );
};
