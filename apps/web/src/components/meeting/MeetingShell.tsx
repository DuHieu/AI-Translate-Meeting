import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Participant,
  LocalAudioTrack,
  ConnectionState,
  RoomEvent,
  Track,
  ParticipantEvent,
} from 'livekit-client';
import type { AudioCaptureOptions, LocalTrackPublication, VideoCaptureOptions } from 'livekit-client';
import {
  useRoomContext,
  useConnectionState,
  useLocalParticipant,
  StartAudio,
} from '@livekit/components-react';
import { MeetingTopBar } from './MeetingTopBar';
import { MeetingStage } from './MeetingStage';
import { MeetingBottomBar } from './MeetingBottomBar';
import { MeetingAudioRenderer } from './MeetingAudioRenderer';
import { ParticipantsPanel } from './ParticipantsPanel';
import { ChangeLayoutDialog, LayoutMode } from './ChangeLayoutDialog';
import { MeetingSettingsDialog } from './MeetingSettingsDialog';
import { MeetingDetailsDialog } from './MeetingDetailsDialog';
import { PermissionBlockedModal } from './PermissionBlockedModal';
import { ConnectionErrorModal } from './ConnectionErrorModal';
import { WebRtcDiagnostics } from './WebRtcDiagnostics';
import { SubtitleOverlay } from '../subtitle/SubtitleOverlay';
import { SubtitlePanel } from '../subtitle/SubtitlePanel';
import { useSubtitle } from '../../hooks/useSubtitle';
import { MeetingSessionData } from '../../types/meeting';
import { classifyMediaError } from '../../utils/mediaErrors';
import { meetingStorage } from '../../utils/meetingStorage';

interface MeetingShellProps {
  session: MeetingSessionData;
  onLeaveRoom: () => void;
}

interface LocalMediaState {
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenShareEnabled: boolean;
  microphoneTrack: LocalAudioTrack | null;
}

const enableWebRtcDebug = import.meta.env.VITE_ENABLE_WEBRTC_DEBUG === 'true';

function isPublicationActive(publication?: LocalTrackPublication): boolean {
  return Boolean(publication?.track && !publication.isMuted);
}

export const MeetingShell: React.FC<MeetingShellProps> = ({ session, onLeaveRoom }) => {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const {
    localParticipant,
    lastMicrophoneError,
    lastCameraError,
  } = useLocalParticipant();

  const isRoomConnected = connectionState === ConnectionState.Connected;
  const isRoomConnecting =
    connectionState === ConnectionState.Connecting ||
    connectionState === ConnectionState.Reconnecting;

  // Track in-flight toggles to prevent concurrent negotiations on PeerConnection
  const isMediaNegotiatingRef = useRef(false);
  const initialMediaPublishedRef = useRef(false);

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    return (localStorage.getItem('meeting-layout-mode') as LayoutMode) || 'auto';
  });

  const [localMediaState, setLocalMediaState] = useState<LocalMediaState>({
    micEnabled: false,
    cameraEnabled: false,
    screenShareEnabled: false,
    microphoneTrack: null,
  });

  // ── Permission blocked modal state ──────────────────────────────────
  const [blockedPermissionType, setBlockedPermissionType] = useState<
    'microphone' | 'camera' | 'both' | null
  >(null);
  const [permissionErrorMessage, setPermissionErrorMessage] = useState<string | undefined>(
    undefined,
  );

  // ── Connection / negotiation error modal state ──────────────────────
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // ── Device error (not found / not readable) ─────────────────────────
  const [deviceError, setDeviceError] = useState<{ device: 'mic' | 'cam'; message: string } | null>(
    null,
  );

  const [isPeoplePanelOpen, setIsPeoplePanelOpen] = useState(false);
  const [isSubtitlePanelOpen, setIsSubtitlePanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const buildAudioOptions = useCallback((): AudioCaptureOptions => ({
    ...(session.audioDeviceId ? { deviceId: session.audioDeviceId } : {}),
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true,
  }), [session.audioDeviceId]);

  const buildVideoOptions = useCallback((): VideoCaptureOptions => ({
    ...(session.videoDeviceId ? { deviceId: session.videoDeviceId } : {}),
    frameRate: 24,
  }), [session.videoDeviceId]);

  const syncLocalMediaState = useCallback(() => {
    if (!localParticipant) {
      setLocalMediaState({
        micEnabled: false,
        cameraEnabled: false,
        screenShareEnabled: false,
        microphoneTrack: null,
      });
      return;
    }

    const micPublication = localParticipant.getTrackPublication(
      Track.Source.Microphone,
    ) as LocalTrackPublication | undefined;
    const cameraPublication = localParticipant.getTrackPublication(
      Track.Source.Camera,
    ) as LocalTrackPublication | undefined;
    const screenSharePublication = localParticipant.getTrackPublication(
      Track.Source.ScreenShare,
    ) as LocalTrackPublication | undefined;

    setLocalMediaState({
      micEnabled: isPublicationActive(micPublication),
      cameraEnabled: isPublicationActive(cameraPublication),
      screenShareEnabled: isPublicationActive(screenSharePublication),
      microphoneTrack: (micPublication?.track as LocalAudioTrack | undefined) ?? null,
    });
  }, [localParticipant]);

  useEffect(() => {
    syncLocalMediaState();
    if (!localParticipant) return undefined;

    const localEvents = [
      ParticipantEvent.LocalTrackPublished,
      ParticipantEvent.LocalTrackUnpublished,
      ParticipantEvent.TrackMuted,
      ParticipantEvent.TrackUnmuted,
    ] as const;
    const roomEvents = [
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
    ] as const;

    localEvents.forEach((eventName) => localParticipant.on(eventName, syncLocalMediaState));
    roomEvents.forEach((eventName) => room.on(eventName, syncLocalMediaState));

    return () => {
      localEvents.forEach((eventName) => localParticipant.off(eventName, syncLocalMediaState));
      roomEvents.forEach((eventName) => room.off(eventName, syncLocalMediaState));
    };
  }, [room, localParticipant, syncLocalMediaState]);

  const handleMediaFailure = useCallback((device: 'mic' | 'cam', error: unknown) => {
    const classified = classifyMediaError(error);
    const permissionType = device === 'mic' ? 'microphone' : 'camera';

    switch (classified.kind) {
      case 'permission':
        setBlockedPermissionType(permissionType);
        setPermissionErrorMessage(classified.message);
        break;
      case 'connection':
        setConnectionError(classified.message);
        break;
      case 'not_found':
        setDeviceError({
          device,
          message:
            device === 'mic'
              ? 'Không tìm thấy microphone. Vui lòng kiểm tra thiết bị.'
              : 'Không tìm thấy camera. Vui lòng kiểm tra thiết bị.',
        });
        break;
      case 'not_readable':
        setDeviceError({
          device,
          message:
            device === 'mic'
              ? 'Microphone đang được sử dụng bởi ứng dụng khác.'
              : 'Camera đang được sử dụng bởi ứng dụng khác.',
        });
        break;
      default:
        setDeviceError({
          device,
          message:
            classified.message ||
            (device === 'mic'
              ? 'Lỗi không xác định khi bật microphone.'
              : 'Lỗi không xác định khi bật camera.'),
        });
    }
  }, []);

  // ── Detect LiveKit permission errors via lastMicrophoneError / lastCameraError ──
  useEffect(() => {
    const micErr = lastMicrophoneError;
    const camErr = lastCameraError;

    if (micErr) {
      const classified = classifyMediaError(micErr);
      if (classified.kind === 'permission') {
        setBlockedPermissionType((prev) =>
          prev === 'camera' ? 'both' : 'microphone',
        );
        setPermissionErrorMessage(classified.message);
      } else if (classified.kind === 'connection') {
        setConnectionError(classified.message);
      }
    }

    if (camErr) {
      const classified = classifyMediaError(camErr);
      if (classified.kind === 'permission') {
        setBlockedPermissionType((prev) =>
          prev === 'microphone' ? 'both' : 'camera',
        );
        setPermissionErrorMessage(classified.message);
      } else if (classified.kind === 'connection') {
        setConnectionError(classified.message);
      }
    }
  }, [lastMicrophoneError, lastCameraError]);

  useEffect(() => {
    if (!localParticipant || !isRoomConnected || initialMediaPublishedRef.current) {
      return undefined;
    }

    let cancelled = false;
    initialMediaPublishedRef.current = true;
    isMediaNegotiatingRef.current = true;

    async function publishInitialMedia() {
      try {
        if (session.initialMicOn ?? true) {
          try {
            await localParticipant.setMicrophoneEnabled(true, buildAudioOptions());
            if (!cancelled) syncLocalMediaState();
          } catch (error: unknown) {
            console.error('[Media Init] Failed to publish microphone', error);
            if (!cancelled) handleMediaFailure('mic', error);
          }
        }

        if (cancelled) return;

        if (session.initialCameraOn ?? true) {
          try {
            await localParticipant.setCameraEnabled(true, buildVideoOptions());
            if (!cancelled) syncLocalMediaState();
          } catch (error: unknown) {
            console.error('[Media Init] Failed to publish camera', error);
            if (!cancelled) handleMediaFailure('cam', error);
          }
        }
      } finally {
        isMediaNegotiatingRef.current = false;
      }
    }

    void publishInitialMedia();

    return () => {
      cancelled = true;
    };
  }, [
    localParticipant,
    isRoomConnected,
    session.initialMicOn,
    session.initialCameraOn,
    buildAudioOptions,
    buildVideoOptions,
    syncLocalMediaState,
    handleMediaFailure,
  ]);

  // ── WebRTC & ICE Diagnostics Instrumentation ─────────────────────────
  useEffect(() => {
    if (!enableWebRtcDebug) return undefined;

    const engineAny = room.engine as unknown as {
      pcManager?: {
        publisher?: { pc?: RTCPeerConnection };
        subscriber?: { pc?: RTCPeerConnection };
      };
    };
    const publisherPc = engineAny?.pcManager?.publisher?.pc;
    const subscriberPc = engineAny?.pcManager?.subscriber?.pc;

    const logRtcState = (tag: string) => {
      console.log(`[WebRTC State][${tag}]`, {
        roomState: room.state,
        connectionState,
        publisher: publisherPc
          ? {
              iceConnectionState: publisherPc.iceConnectionState,
              iceGatheringState: publisherPc.iceGatheringState,
              signalingState: publisherPc.signalingState,
              connectionState: publisherPc.connectionState,
            }
          : 'no publisher pc',
        subscriber: subscriberPc
          ? {
              iceConnectionState: subscriberPc.iceConnectionState,
              iceGatheringState: subscriberPc.iceGatheringState,
              signalingState: subscriberPc.signalingState,
              connectionState: subscriberPc.connectionState,
            }
          : 'no subscriber pc',
        localTracks: Array.from(localParticipant.trackPublications.values()).map((p) => ({
          sid: p.trackSid,
          source: p.source,
          kind: p.kind,
          muted: p.isMuted,
          enabled: p.isEnabled,
        })),
      });
    };

    logRtcState('TelemetryUpdate');

    const handlePublisherIceConnectionChange = () => logRtcState('Pub ICE: ' + publisherPc?.iceConnectionState);
    const handlePublisherIceGatheringChange = () => logRtcState('Pub ICE Gathering: ' + publisherPc?.iceGatheringState);
    const handlePublisherSignalingChange = () => logRtcState('Pub Signaling: ' + publisherPc?.signalingState);
    const handlePublisherConnectionChange = () => logRtcState('Pub PC State: ' + publisherPc?.connectionState);
    const handleSubscriberIceConnectionChange = () => logRtcState('Sub ICE: ' + subscriberPc?.iceConnectionState);
    const handleSubscriberIceGatheringChange = () => logRtcState('Sub ICE Gathering: ' + subscriberPc?.iceGatheringState);
    const handleSubscriberSignalingChange = () => logRtcState('Sub Signaling: ' + subscriberPc?.signalingState);
    const handleSubscriberConnectionChange = () => logRtcState('Sub PC State: ' + subscriberPc?.connectionState);

    if (publisherPc) {
      publisherPc.addEventListener('iceconnectionstatechange', handlePublisherIceConnectionChange);
      publisherPc.addEventListener('icegatheringstatechange', handlePublisherIceGatheringChange);
      publisherPc.addEventListener('signalingstatechange', handlePublisherSignalingChange);
      publisherPc.addEventListener('connectionstatechange', handlePublisherConnectionChange);
    }

    if (subscriberPc) {
      subscriberPc.addEventListener('iceconnectionstatechange', handleSubscriberIceConnectionChange);
      subscriberPc.addEventListener('icegatheringstatechange', handleSubscriberIceGatheringChange);
      subscriberPc.addEventListener('signalingstatechange', handleSubscriberSignalingChange);
      subscriberPc.addEventListener('connectionstatechange', handleSubscriberConnectionChange);
    }

    return () => {
      if (publisherPc) {
        publisherPc.removeEventListener('iceconnectionstatechange', handlePublisherIceConnectionChange);
        publisherPc.removeEventListener('icegatheringstatechange', handlePublisherIceGatheringChange);
        publisherPc.removeEventListener('signalingstatechange', handlePublisherSignalingChange);
        publisherPc.removeEventListener('connectionstatechange', handlePublisherConnectionChange);
      }
      if (subscriberPc) {
        subscriberPc.removeEventListener('iceconnectionstatechange', handleSubscriberIceConnectionChange);
        subscriberPc.removeEventListener('icegatheringstatechange', handleSubscriberIceGatheringChange);
        subscriberPc.removeEventListener('signalingstatechange', handleSubscriberSignalingChange);
        subscriberPc.removeEventListener('connectionstatechange', handleSubscriberConnectionChange);
      }
    };
  }, [room, connectionState, localParticipant]);

  // ── Monitor Reconnection & Prevent Duplicate Local Tracks ────────────
  useEffect(() => {
    const handleReconnecting = () => {
      console.log('[LiveKit Reconnecting] Room is reconnecting... publications count:', localParticipant.trackPublications.size);
    };

    const handleReconnected = () => {
      const pubs = Array.from(localParticipant.trackPublications.values());
      console.log('[LiveKit Reconnected] Reconnected successfully. Local publications:', pubs.map((p) => ({
        sid: p.trackSid,
        source: p.source,
        kind: p.kind,
      })));
    };

    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);

    return () => {
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
    };
  }, [room, localParticipant]);

  const localAudioTrack = localMediaState.microphoneTrack;

  const subtitleOptions = React.useMemo(
    () => ({
      participantName: session.displayName,
      sourceLanguage: session.spokenLanguage,
      targetLanguage: session.targetLanguage,
      isMicOn: localMediaState.micEnabled,
      audioTrack: localAudioTrack?.mediaStreamTrack || null,
    }),
    [session.displayName, session.spokenLanguage, session.targetLanguage, localMediaState.micEnabled, localAudioTrack],
  );

  const { activeSubtitle, history: subtitleHistory, sendSpeechText } = useSubtitle(
    session.meetingId,
    session.participantId,
    subtitleOptions,
  );

  // ── Toggle Handlers — with in-flight lock to prevent NegotiationError ──
  const handleToggleMic = useCallback(async () => {
    if (!localParticipant) return;

    if (!isRoomConnected) {
      console.warn('[MeetingShell] Cannot toggle mic: room not connected', connectionState);
      setConnectionError(`Phòng họp chưa kết nối (${connectionState}). Vui lòng chờ kết nối hoàn tất.`);
      return;
    }

    if (isMediaNegotiatingRef.current) {
      console.warn('[MeetingShell] Media negotiation already in progress, ignoring duplicate mic action');
      return;
    }

    isMediaNegotiatingRef.current = true;
    const targetState = !localMediaState.micEnabled;
    console.log('[Media Action] Toggling microphone to:', targetState);

    try {
      await localParticipant.setMicrophoneEnabled(
        targetState,
        targetState ? buildAudioOptions() : undefined,
      );
      syncLocalMediaState();
      console.log('[Media Action] Microphone toggled successfully to:', targetState);
    } catch (e: unknown) {
      console.error('[Media Action] Failed to toggle mic', e);
      handleMediaFailure('mic', e);
    } finally {
      isMediaNegotiatingRef.current = false;
    }
  }, [
    localParticipant,
    isRoomConnected,
    localMediaState.micEnabled,
    connectionState,
    buildAudioOptions,
    syncLocalMediaState,
    handleMediaFailure,
  ]);

  const handleToggleCamera = useCallback(async () => {
    if (!localParticipant) return;

    if (!isRoomConnected) {
      console.warn('[MeetingShell] Cannot toggle camera: room not connected', connectionState);
      setConnectionError(`Phòng họp chưa kết nối (${connectionState}). Vui lòng chờ kết nối hoàn tất.`);
      return;
    }

    if (isMediaNegotiatingRef.current) {
      console.warn('[MeetingShell] Media negotiation already in progress, ignoring duplicate camera action');
      return;
    }

    isMediaNegotiatingRef.current = true;
    const targetState = !localMediaState.cameraEnabled;
    console.log('[Media Action] Toggling camera to:', targetState);

    try {
      await localParticipant.setCameraEnabled(
        targetState,
        targetState ? buildVideoOptions() : undefined,
      );
      syncLocalMediaState();
      console.log('[Media Action] Camera toggled successfully to:', targetState);
    } catch (e: unknown) {
      console.error('[Media Action] Failed to toggle camera', e);
      handleMediaFailure('cam', e);
    } finally {
      isMediaNegotiatingRef.current = false;
    }
  }, [
    localParticipant,
    isRoomConnected,
    localMediaState.cameraEnabled,
    connectionState,
    buildVideoOptions,
    syncLocalMediaState,
    handleMediaFailure,
  ]);

  const handleToggleScreenShare = async () => {
    if (!localParticipant || !isRoomConnected || isMediaNegotiatingRef.current) return;
    isMediaNegotiatingRef.current = true;
    try {
      await localParticipant.setScreenShareEnabled(!localMediaState.screenShareEnabled);
      syncLocalMediaState();
    } catch (error: unknown) {
      if (error instanceof Error && ['NotAllowedError', 'AbortError'].includes(error.name)) return;
      const classified = classifyMediaError(error);
      if (classified.kind === 'connection') setConnectionError(classified.message);
      else setDeviceError({ device: 'cam', message: 'Không thể chia sẻ màn hình. Vui lòng thử lại.' });
    } finally {
      isMediaNegotiatingRef.current = false;
    }
  };

  const handleRetryPermissions = async () => {
    if (!localParticipant || !isRoomConnected || isMediaNegotiatingRef.current) return;
    isMediaNegotiatingRef.current = true;
    try {
      if (blockedPermissionType === 'both' || blockedPermissionType === 'microphone') {
        await localParticipant.setMicrophoneEnabled(true, buildAudioOptions());
      }
      if (blockedPermissionType === 'both' || blockedPermissionType === 'camera') {
        await localParticipant.setCameraEnabled(true, buildVideoOptions());
      }
      syncLocalMediaState();
      setBlockedPermissionType(null);
      setPermissionErrorMessage(undefined);
    } catch (err: unknown) {
      console.error('Retry permission failed', err);
      const classified = classifyMediaError(err);
      setPermissionErrorMessage(classified.message || 'Permission still blocked. Please check browser settings.');
    } finally {
      syncLocalMediaState();
      isMediaNegotiatingRef.current = false;
    }
  };

  const handleRetryConnection = () => {
    setConnectionError(null);
    meetingStorage.clearSession(session.meetingCode);
    window.location.assign(`/join/${session.meetingCode}`);
  };

  const handleSelectLayout = (mode: LayoutMode) => {
    setLayoutMode(mode);
    localStorage.setItem('meeting-layout-mode', mode);
  };

  const handleTogglePeoplePanel = () => {
    setIsPeoplePanelOpen((prev) => {
      const next = !prev;
      if (next) setIsSubtitlePanelOpen(false);
      return next;
    });
  };

  const handleToggleSubtitlePanel = () => {
    setIsSubtitlePanelOpen((prev) => {
      const next = !prev;
      if (next) setIsPeoplePanelOpen(false);
      return next;
    });
  };

  const participants: Participant[] = Array.from<Participant>(room.remoteParticipants.values());
  if (room.localParticipant) {
    participants.unshift(room.localParticipant);
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative font-sans">
      {/* Diagnostics Overlay */}
      {enableWebRtcDebug && <WebRtcDiagnostics />}

      {/* Header Top Bar */}
      <MeetingTopBar meetingCode={session.meetingCode} connectionState={connectionState} />

      {/* Connecting / Reconnecting Status Banner */}
      {isRoomConnecting && (
        <div className="absolute top-14 inset-x-0 z-30 flex justify-center pointer-events-none">
          <div className="mt-2 px-4 py-2 rounded-2xl bg-amber-600/90 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {connectionState === ConnectionState.Reconnecting
              ? 'Đang kết nối lại tới phòng họp...'
              : 'Đang kết nối tới phòng họp...'}
          </div>
        </div>
      )}

      {/* Main Stage & Right Panel Drawer Container */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 h-full relative overflow-hidden flex flex-col">
          <MeetingStage layoutMode={layoutMode} meetingCode={session.meetingCode} />

          <SubtitleOverlay subtitle={activeSubtitle} />
        </main>

        {/* Right Participants Side Drawer */}
        {isPeoplePanelOpen && (
          <ParticipantsPanel
            participants={participants}
            onClose={() => setIsPeoplePanelOpen(false)}
          />
        )}

        <SubtitlePanel
          history={subtitleHistory}
          isOpen={isSubtitlePanelOpen}
          onClose={() => setIsSubtitlePanelOpen(false)}
          onSendSpeechText={sendSpeechText}
        />
      </div>

      {/* Floating Bottom Control Bar */}
      <MeetingBottomBar
        meetingCode={session.meetingCode}
        isMicOn={localMediaState.micEnabled}
        isCameraOn={localMediaState.cameraEnabled}
        isScreenSharing={localMediaState.screenShareEnabled}
        microphoneTrack={localAudioTrack}
        isConnected={isRoomConnected}
        isConnecting={isRoomConnecting}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onLeaveRoom={onLeaveRoom}
        onOpenPeoplePanel={handleTogglePeoplePanel}
        onToggleSubtitlePanel={handleToggleSubtitlePanel}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLayoutMenu={() => setIsLayoutMenuOpen(true)}
        isSubtitlePanelOpen={isSubtitlePanelOpen}
        subtitleCount={subtitleHistory.length}
        numParticipants={participants.length}
      />

      {/* Pure Audio Renderer for LiveKit WebRTC Audio Streams (no useTracks dependency) */}
      <MeetingAudioRenderer />

      {/* Autoplay unblock button */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40">
        <StartAudio
          label="Nhấp vào đây để bật âm thanh phòng họp"
          className="px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-xl animate-bounce border border-amber-400"
        />
      </div>

      {/* Device Toast (not_found / not_readable) */}
      {deviceError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-700 text-slate-200 text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 max-w-sm">
          <span>{deviceError.message}</span>
          <button
            type="button"
            onClick={() => setDeviceError(null)}
            className="ml-auto text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Connection Error Modal (NegotiationError, WebSocket failed, etc.) */}
      {connectionError && (
        <ConnectionErrorModal
          errorMessage={connectionError}
          onRetry={handleRetryConnection}
          onDismiss={() => setConnectionError(null)}
        />
      )}

      {/* Permission Blocked Modal — ONLY for real NotAllowedError / SecurityError */}
      {blockedPermissionType && !connectionError && (
        <PermissionBlockedModal
          deviceType={blockedPermissionType}
          errorMessage={permissionErrorMessage}
          onRetry={handleRetryPermissions}
          onDismiss={() => setBlockedPermissionType(null)}
        />
      )}

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
