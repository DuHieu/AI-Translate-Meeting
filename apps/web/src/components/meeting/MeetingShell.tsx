import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Participant,
  LocalAudioTrack,
  ConnectionState,
  RoomEvent,
  Track,
  ParticipantEvent,
  AudioPresets,
  VideoPresets,
} from 'livekit-client';
import type {
  AudioCaptureOptions,
  LocalTrackPublication,
  ScreenShareCaptureOptions,
  VideoCaptureOptions,
  TrackPublishOptions,
} from 'livekit-client';
import {
  useRoomContext,
  useConnectionState,
  useIsSpeaking,
  useLocalParticipant,
  StartAudio,
} from '@livekit/components-react';
import { MeetingTopBar } from './MeetingTopBar';
import { MeetingStage } from './MeetingStage';
import { MeetingBottomBar } from './MeetingBottomBar';
import { MeetingAudioRenderer } from './MeetingAudioRenderer';
import { AiReadinessBanner } from './AiReadinessBanner';
import { ParticipantsPanel } from './ParticipantsPanel';
import { ChangeLayoutDialog, LayoutMode } from './ChangeLayoutDialog';
import { MeetingSettingsDialog } from './MeetingSettingsDialog';
import { MeetingDetailsDialog } from './MeetingDetailsDialog';
import { PermissionBlockedModal } from './PermissionBlockedModal';
import { ConnectionErrorModal } from './ConnectionErrorModal';
import { PostMeetingModal } from './PostMeetingModal';
import { WebRtcDiagnostics } from './WebRtcDiagnostics';
import { SubtitleOverlay } from '../subtitle/SubtitleOverlay';
import { SubtitlePanel } from '../subtitle/SubtitlePanel';
import { FloatingReactionsOverlay } from './FloatingReactionsOverlay';
import { useSubtitle } from '../../hooks/useSubtitle';
import { useAiReadiness } from '../../hooks/useAiReadiness';
import { useAudioBooth } from '../../hooks/useAudioBooth';
import {
  ChatMessage,
  FloatingReaction,
  MeetingSessionData,
  RaiseHandDataMessage,
  ReactionDataMessage,
  SidecarPreferences,
  SupportedLanguage,
  isCollaborationDataMessage,
} from '../../types/meeting';
import { classifyMediaError } from '../../utils/mediaErrors';
import { meetingStorage } from '../../utils/meetingStorage';
import { meetingService } from '../../services/meetingService';
import { generateMeetingRecap } from '../../utils/aiRecapEngine';
import { DEFAULT_BRANDING_CONFIG, meetingApi } from '../../api/meetingApi';
import type { BrandingConfigDto } from '../../api/meetingApi';

interface MeetingShellProps {
  session: MeetingSessionData;
  onLeaveRoom: () => void;
  meetingEnded?: boolean;
}

interface LocalMediaState {
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenShareEnabled: boolean;
  microphoneTrack: LocalAudioTrack | null;
}

const enableWebRtcDebug = import.meta.env.VITE_ENABLE_WEBRTC_DEBUG === 'true';

const AUDIO_PUBLISH_OPTIONS: TrackPublishOptions = {
  audioPreset: AudioPresets.speech,
  dtx: true,
};

const VIDEO_PUBLISH_OPTIONS: TrackPublishOptions = {
  simulcast: true,
  videoEncoding: VideoPresets.h720.encoding,
};
const SCREEN_SHARE_CAPTURE_OPTIONS: ScreenShareCaptureOptions = {
  audio: true,
  systemAudio: 'include',
};
const SIDECAR_PREFERENCES_KEY = 'ai-sidecar-preferences';
const DEFAULT_SIDECAR_PREFERENCES: SidecarPreferences = {
  showActions: false,
  showRecap: false,
  showChat: false,
  audioBooth: false,
  showOriginal: false,
};

function loadSidecarPreferences(): SidecarPreferences {
  try {
    const stored = localStorage.getItem(SIDECAR_PREFERENCES_KEY);
    return stored ? { ...DEFAULT_SIDECAR_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_SIDECAR_PREFERENCES;
  } catch {
    return DEFAULT_SIDECAR_PREFERENCES;
  }
}

function isPublicationActive(publication?: LocalTrackPublication): boolean {
  return Boolean(publication?.track && !publication.isMuted);
}

export const MeetingShell: React.FC<MeetingShellProps> = ({
  session,
  onLeaveRoom,
  meetingEnded = false,
}) => {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const {
    localParticipant,
    lastMicrophoneError,
    lastCameraError,
  } = useLocalParticipant();
  const isLocalSpeaking = useIsSpeaking(localParticipant) || localParticipant.isSpeaking;

  const isRoomConnected = connectionState === ConnectionState.Connected;
  const isRoomConnecting =
    connectionState === ConnectionState.Connecting ||
    connectionState === ConnectionState.Reconnecting;
  const aiReadiness = useAiReadiness();

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
  const [isPostMeetingOpen, setIsPostMeetingOpen] = useState(false);
  const [sidecarPreferences, setSidecarPreferences] = useState<SidecarPreferences>(loadSidecarPreferences);
  const [subtitleTargetLanguage, setSubtitleTargetLanguage] = useState<SupportedLanguage>(session.targetLanguage);
  const [subtitleToken, setSubtitleToken] = useState(session.subtitleToken);
  const [isUpdatingSubtitleLanguage, setIsUpdatingSubtitleLanguage] = useState(false);
  const [subtitleLanguageError, setSubtitleLanguageError] = useState<string | null>(null);
  const [branding, setBranding] = useState<BrandingConfigDto>(DEFAULT_BRANDING_CONFIG);

  const [audioBoothToast, setAudioBoothToast] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadBranding = async () => {
      try {
        const config = await meetingApi.getBrandingConfig();
        if (isActive) setBranding(config);
      } catch {
        if (isActive) setBranding(DEFAULT_BRANDING_CONFIG);
      }
    };

    void loadBranding();
    return () => {
      isActive = false;
    };
  }, []);

  const handleSidecarPreferencesChange = useCallback((preferences: SidecarPreferences) => {
    setSidecarPreferences(preferences);
    localStorage.setItem(SIDECAR_PREFERENCES_KEY, JSON.stringify(preferences));
  }, []);

  const handleToggleAudioBooth = useCallback(() => {
    const nextState = !sidecarPreferences.audioBooth;
    handleSidecarPreferencesChange({
      ...sidecarPreferences,
      audioBooth: nextState,
    });
    setAudioBoothToast(
      nextState
        ? 'Cabin phiên dịch đã bật: Tự động phát âm thanh dịch và giảm nhỏ giọng gốc (-18dB).'
        : 'Cabin phiên dịch đã tắt.'
    );
    window.setTimeout(() => {
      setAudioBoothToast(null);
    }, 3500);
  }, [handleSidecarPreferencesChange, sidecarPreferences]);

  // ── LiveKit In-Meeting Collaboration ───────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [raisedHands, setRaisedHands] = useState<Map<string, number>>(() => new Map());

  const showFloatingReaction = useCallback((emoji: string, senderName: string) => {
    const reactionId = `react-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const reaction: FloatingReaction = {
      id: reactionId,
      emoji,
      senderName,
      leftPercent: 15 + Math.random() * 70,
    };
    setReactions((prev) => [...prev, reaction]);
    window.setTimeout(() => {
      setReactions((prev) => prev.filter((item) => item.id !== reactionId));
    }, 3200);
  }, []);

  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: Participant,
      _kind?: unknown,
      topic?: string
    ) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data: unknown = JSON.parse(text);
        if (!data || typeof data !== 'object') return;
        const record = data as Record<string, unknown>;

        if (
          (topic === 'meeting-chat' || record.type === 'chat') &&
          typeof record.text === 'string'
        ) {
          const chatText = record.text;
          setChatMessages((prev) => [
            ...prev,
            {
              id: typeof record.id === 'string'
                ? record.id
                : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              senderId: participant?.identity || (
                typeof record.senderId === 'string' ? record.senderId : 'unknown'
              ),
              senderName: participant?.name || (
                typeof record.senderName === 'string' ? record.senderName : 'Người tham gia'
              ),
              text: chatText,
              timestamp: typeof record.timestamp === 'string'
                ? record.timestamp
                : new Date().toISOString(),
            },
          ]);
        } else if (isCollaborationDataMessage(data) && data.type === 'RAISE_HAND') {
          const participantId = participant?.identity || data.participantId;
          setRaisedHands((current) => {
            const next = new Map(current);
            if (data.raised) next.set(participantId, data.timestamp);
            else next.delete(participantId);
            return next;
          });
        } else if (isCollaborationDataMessage(data) && data.type === 'REACTION') {
          showFloatingReaction(
            data.emoji,
            participant?.name || data.senderName || 'Người tham gia',
          );
        } else if (
          (topic === 'meeting-reaction' || record.type === 'reaction') &&
          typeof record.emoji === 'string'
        ) {
          // Backward compatibility for clients that still send the legacy lowercase type.
          showFloatingReaction(
            record.emoji,
            participant?.name || (
              typeof record.senderName === 'string' ? record.senderName : 'Người tham gia'
            ),
          );
        }
      } catch (e) {
        console.warn('Failed to parse incoming DataChannel packet', e);
      }
    };

    const handleParticipantDisconnected = (participant: Participant) => {
      setRaisedHands((current) => {
        if (!current.has(participant.identity)) return current;
        const next = new Map(current);
        next.delete(participant.identity);
        return next;
      });
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [room, showFloatingReaction]);

  const handleSendChatMessage = useCallback(
    async (text: string) => {
      if (!room || !text.trim()) return;
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        senderId: session.participantId,
        senderName: session.displayName || 'You',
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, msg]);
      try {
        const payload = new TextEncoder().encode(JSON.stringify({ type: 'chat', ...msg }));
        await room.localParticipant.publishData(payload, { reliable: true, topic: 'meeting-chat' });
      } catch (e) {
        console.error('Failed to publish chat message via LiveKit DataChannel', e);
      }
    },
    [room, session.participantId, session.displayName]
  );

  const handleSendReaction = useCallback(
    async (emoji: string) => {
      if (!room) return;
      const message: ReactionDataMessage = {
        type: 'REACTION',
        emoji,
        senderName: session.displayName || 'You',
      };
      showFloatingReaction(message.emoji, message.senderName);

      try {
        const payload = new TextEncoder().encode(JSON.stringify(message));
        await room.localParticipant.publishData(payload, { reliable: false, topic: 'meeting-reaction' });
      } catch (e) {
        console.error('Failed to publish reaction via LiveKit DataChannel', e);
      }
    },
    [room, session.displayName, showFloatingReaction]
  );

  const handleToggleRaiseHand = useCallback(async () => {
    if (!room || !localParticipant || !isRoomConnected) return;

    const participantId = localParticipant.identity || session.identity;
    const previousRaisedAt = raisedHands.get(participantId);
    const raised = previousRaisedAt === undefined;
    const message: RaiseHandDataMessage = {
      type: 'RAISE_HAND',
      participantId,
      raised,
      timestamp: Date.now(),
    };

    setRaisedHands((current) => {
      const next = new Map(current);
      if (raised) next.set(participantId, message.timestamp);
      else next.delete(participantId);
      return next;
    });

    try {
      const payload = new TextEncoder().encode(JSON.stringify(message));
      await room.localParticipant.publishData(payload, {
        reliable: true,
        topic: 'meeting-collaboration',
      });
    } catch (error) {
      setRaisedHands((current) => {
        const next = new Map(current);
        if (raised) next.delete(participantId);
        else if (previousRaisedAt !== undefined) next.set(participantId, previousRaisedAt);
        return next;
      });
      console.error('Failed to publish raise-hand state via LiveKit DataChannel', error);
    }
  }, [isRoomConnected, localParticipant, raisedHands, room, session.identity]);

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
            await localParticipant.setMicrophoneEnabled(true, buildAudioOptions(), AUDIO_PUBLISH_OPTIONS);
            if (!cancelled) syncLocalMediaState();
          } catch (error: unknown) {
            console.error('[Media Init] Failed to publish microphone', error);
            if (!cancelled) handleMediaFailure('mic', error);
          }
        }

        if (cancelled) return;

        if (session.initialCameraOn ?? true) {
          try {
            await localParticipant.setCameraEnabled(true, buildVideoOptions(), VIDEO_PUBLISH_OPTIONS);
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
      subtitleToken,
      participantName: session.displayName,
      sourceLanguage: session.spokenLanguage,
      targetLanguage: subtitleTargetLanguage,
      isMicOn: localMediaState.micEnabled,
      isAiReady: aiReadiness.state === 'ready',
      audioTrack: localAudioTrack?.mediaStreamTrack || null,
    }),
    [
      subtitleToken,
      session.displayName,
      session.spokenLanguage,
      subtitleTargetLanguage,
      localMediaState.micEnabled,
      aiReadiness.state,
      localAudioTrack,
    ],
  );

  const {
    activeSubtitle,
    history: subtitleHistory,
    getExportHistory,
    pipelineStatuses,
  } = useSubtitle(
    session.meetingId,
    session.participantId,
    subtitleOptions,
  );

  const postMeetingRecap = React.useMemo(
    () => generateMeetingRecap(
      subtitleHistory,
      subtitleHistory.filter((item) => item.tags && item.tags.length > 0),
    ),
    [subtitleHistory],
  );

  useEffect(() => {
    if (meetingEnded) setIsPostMeetingOpen(true);
  }, [meetingEnded]);

  useAudioBooth({
    enabled: sidecarPreferences.audioBooth,
    history: subtitleHistory,
    currentUserId: session.participantId,
    targetLanguage: subtitleOptions.targetLanguage,
  });

  const handleTargetLanguageChange = useCallback(async (language: SupportedLanguage) => {
    if (language === subtitleTargetLanguage || isUpdatingSubtitleLanguage) return;
    if (!session.sessionToken) {
      setSubtitleLanguageError('Phiên họp thiếu session token. Vui lòng vào lại phòng.');
      return;
    }

    setIsUpdatingSubtitleLanguage(true);
    setSubtitleLanguageError(null);
    try {
      const response = await meetingService.updateSubtitlePreferences(
        session.meetingCode,
        language,
        session.sessionToken,
      );
      setSubtitleTargetLanguage(response.targetLanguage);
      setSubtitleToken(response.subtitleToken);
      meetingStorage.saveSession({
        ...session,
        targetLanguage: response.targetLanguage,
        subtitleToken: response.subtitleToken,
      });
    } catch (error) {
      setSubtitleLanguageError(error instanceof Error ? error.message : 'Không thể đổi ngôn ngữ phụ đề.');
    } finally {
      setIsUpdatingSubtitleLanguage(false);
    }
  }, [isUpdatingSubtitleLanguage, session, subtitleTargetLanguage]);

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
        targetState ? AUDIO_PUBLISH_OPTIONS : undefined,
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
        targetState ? VIDEO_PUBLISH_OPTIONS : undefined,
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
      if (localMediaState.screenShareEnabled) {
        await localParticipant.setScreenShareEnabled(false);
      } else {
        await localParticipant.setScreenShareEnabled(true, SCREEN_SHARE_CAPTURE_OPTIONS);
      }
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
        await localParticipant.setMicrophoneEnabled(true, buildAudioOptions(), AUDIO_PUBLISH_OPTIONS);
      }
      if (blockedPermissionType === 'both' || blockedPermissionType === 'camera') {
        await localParticipant.setCameraEnabled(true, buildVideoOptions(), VIDEO_PUBLISH_OPTIONS);
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
      <MeetingTopBar
        meetingCode={session.meetingCode}
        connectionState={connectionState}
        isHost={session.role === 'host'}
        onOpenAdmission={() => setIsDetailsOpen(true)}
        branding={branding}
      />

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

      <AiReadinessBanner state={aiReadiness.state} onRetry={aiReadiness.retry} />

      {/* Main Stage & Right Panel Drawer Container */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 h-full relative overflow-hidden flex flex-col">
          <MeetingStage
            layoutMode={layoutMode}
            meetingCode={session.meetingCode}
            pipelineStatuses={pipelineStatuses}
            raisedHands={raisedHands}
          />

          <SubtitleOverlay
            subtitle={activeSubtitle}
            recentSubtitles={subtitleHistory}
            pipelineStatuses={pipelineStatuses}
            showOriginal={sidecarPreferences.showOriginal}
          />

          {/* Floating Reactions Overlay */}
          <FloatingReactionsOverlay reactions={reactions} />
        </main>

        {/* Right Participants Side Drawer */}
        {isPeoplePanelOpen && (
          <ParticipantsPanel
            participants={participants}
            raisedHands={raisedHands}
            onClose={() => setIsPeoplePanelOpen(false)}
          />
        )}

        <SubtitlePanel
          history={subtitleHistory}
          getExportHistory={getExportHistory}
          isOpen={isSubtitlePanelOpen}
          onClose={() => setIsSubtitlePanelOpen(false)}
          chatMessages={chatMessages}
          onSendChatMessage={handleSendChatMessage}
          currentUserId={session.participantId}
          meetingCode={session.meetingCode}
          preferences={sidecarPreferences}
          onPreferencesChange={handleSidecarPreferencesChange}
          targetLanguage={subtitleTargetLanguage}
          onTargetLanguageChange={handleTargetLanguageChange}
          isUpdatingLanguage={isUpdatingSubtitleLanguage}
          languageError={subtitleLanguageError}
          branding={branding}
        />
      </div>

      {/* Floating Bottom Control Bar */}
      <MeetingBottomBar
        meetingCode={session.meetingCode}
        isMicOn={localMediaState.micEnabled}
        isSpeaking={isLocalSpeaking}
        isCameraOn={localMediaState.cameraEnabled}
        isScreenSharing={localMediaState.screenShareEnabled}
        microphoneTrack={localAudioTrack}
        isConnected={isRoomConnected}
        isConnecting={isRoomConnecting}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onLeaveRoom={() => setIsPostMeetingOpen(true)}
        onOpenPeoplePanel={handleTogglePeoplePanel}
        onToggleSubtitlePanel={handleToggleSubtitlePanel}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLayoutMenu={() => setIsLayoutMenuOpen(true)}
        isSubtitlePanelOpen={isSubtitlePanelOpen}
        subtitleCount={subtitleHistory.length}
        numParticipants={participants.length}
        isHandRaised={raisedHands.has(localParticipant?.identity || session.identity)}
        onToggleRaiseHand={handleToggleRaiseHand}
        onSendReaction={handleSendReaction}
        isAudioBoothActive={sidecarPreferences.audioBooth}
        onToggleAudioBooth={handleToggleAudioBooth}
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

      {/* Audio Booth Quick Toast */}
      {audioBoothToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-850/95 border border-sky-500/50 text-slate-100 text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 max-w-md pointer-events-none transition-all">
          <span className="text-sky-400 font-bold">🎧 Audio Booth:</span>
          <span>{audioBoothToast}</span>
        </div>
      )}

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
        <MeetingSettingsDialog
          onClose={() => setIsSettingsOpen(false)}
          sidecarPreferences={sidecarPreferences}
          onSidecarPreferencesChange={handleSidecarPreferencesChange}
        />
      )}

      {isDetailsOpen && (
        <MeetingDetailsDialog
          meetingCode={session.meetingCode}
          role={session.role}
          hostToken={session.hostToken}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}

      <PostMeetingModal
        isOpen={isPostMeetingOpen}
        meetingCode={session.meetingCode}
        recap={postMeetingRecap}
        branding={branding}
        onClose={() => setIsPostMeetingOpen(false)}
        onLeaveRoom={onLeaveRoom}
      />
    </div>
  );
};
