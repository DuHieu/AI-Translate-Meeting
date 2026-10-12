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
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { MeetingLanguageDialog } from './MeetingLanguageDialog';
import { useMeetingDisplay } from '../../hooks/useMeetingDisplay';
import { MeetingTopBar } from './MeetingTopBar';
import { MeetingStage } from './MeetingStage';
import { MeetingBottomBar } from './MeetingBottomBar';
import { MeetingAudioRenderer } from './MeetingAudioRenderer';
import { AiReadinessBanner } from './AiReadinessBanner';
import { ParticipantsPanel } from './ParticipantsPanel';
import { ChangeLayoutDialog, LayoutMode } from './ChangeLayoutDialog';
import { MeetingSettingsDialog } from './MeetingSettingsDialog';
import { PermissionBlockedModal } from './PermissionBlockedModal';
import { ConnectionErrorModal } from './ConnectionErrorModal';
import { PostMeetingModal } from './PostMeetingModal';
import { UpgradeRequiredModal } from './UpgradeRequiredModal';
import { CheckoutModal } from '../common/CheckoutModal';
import { WebRtcDiagnostics } from './WebRtcDiagnostics';
import { MeetingDetailsDialog } from './MeetingDetailsDialog';
import { MeetingReadyCard } from './MeetingReadyCard';
import { SubtitleOverlay } from '../subtitle/SubtitleOverlay';
import { SubtitlePanel } from '../subtitle/SubtitlePanel';
import { InlineGlossaryModal } from '../subtitle/InlineGlossaryModal';
import { LiveMeetingCopilot } from './LiveMeetingCopilot';
import { FloatingReactionsOverlay } from './FloatingReactionsOverlay';
import { FloatingSubtitleWidget } from './FloatingSubtitleWidget';
import { ChatPanel } from './ChatPanel';
import { ActivitiesPanel } from './ActivitiesPanel';
import { HostControlsPanel } from './HostControlsPanel';
import { EmptyCallTimeoutModal } from './EmptyCallTimeoutModal';
import { useSubtitle } from '../../hooks/useSubtitle';
import { useAiReadiness } from '../../hooks/useAiReadiness';
import { useAudioBooth } from '../../hooks/useAudioBooth';
import {
  AdmissionRequest,
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
import { admissionStorage } from '../../utils/admissionStorage';
import { meetingService } from '../../services/meetingService';
import { generateMeetingRecap } from '../../utils/aiRecapEngine';
import { DEFAULT_BRANDING_CONFIG, meetingApi } from '../../api/meetingApi';
import type { BrandingConfigDto } from '../../api/meetingApi';
import { saveRecording } from '../../utils/recordingStorage';
import { BellRing, Mic } from 'lucide-react';
import { CountryFlag } from '../common/CountryFlag';
import { getUserSettings, subscribeUserSettings } from '../../utils/userSettings';

function playWaitingRoomKnockChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Gentle two-note Google Meet style bell chime (G5 -> B5)
    const notes = [783.99, 987.77];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.46);
    });

    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 1000);
  } catch {
    // Ignore audio autoplay restrictions if user hasn't interacted yet
  }
}

function playCallConnectedChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Classic pleasant Google Meet ascending connection chime (E5 -> G#5 -> B5)
    const notes = [659.25, 830.61, 987.77];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });

    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 1000);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

interface MeetingShellProps {
  session: MeetingSessionData;
  onLeaveRoom: () => void;
  meetingEnded?: boolean;
  isProPlan?: boolean;
  onUpgrade?: () => void;
}

interface LocalMediaState {
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenShareEnabled: boolean;
  microphoneTrack: LocalAudioTrack | null;
}

const enableWebRtcDebug = import.meta.env.VITE_ENABLE_WEBRTC_DEBUG === 'true';
const FREE_MEETING_LIMIT_SECONDS = 40 * 60;
const FREE_MEETING_WARNING_SECONDS = 5 * 60;

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
  fileSharing: true,
  meetingRecording: true,
  e2eeEnabled: false,
  floatingSubtitleWidget: true,
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

function getRecordingMimeType(): string | undefined {
  if (
    typeof MediaRecorder === 'undefined'
    || typeof MediaRecorder.isTypeSupported !== 'function'
  ) return undefined;

  return [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

function parseChatAttachment(value: unknown): ChatMessage['attachment'] {
  if (!value || typeof value !== 'object') return undefined;

  const attachment = value as Record<string, unknown>;
  if (typeof attachment.name !== 'string' || typeof attachment.size !== 'number') {
    return undefined;
  }

  return {
    name: attachment.name,
    size: attachment.size,
    ...(typeof attachment.summaryTranslation === 'string'
      ? { summaryTranslation: attachment.summaryTranslation }
      : {}),
  };
}

function isPublicationActive(publication?: LocalTrackPublication): boolean {
  return Boolean(publication?.track && !publication.isMuted);
}

export const MeetingShell: React.FC<MeetingShellProps> = ({
  session,
  onLeaveRoom,
  meetingEnded = false,
  isProPlan: initialProPlan = false,
  onUpgrade,
}) => {
  const [isProPlan, setIsProPlan] = useState<boolean>(() => {
    if (initialProPlan) return true;
    return getUserSettings().unlimitedFreeMeeting !== false;
  });

  useEffect(() => {
    if (initialProPlan) {
      setIsProPlan(true);
      return;
    }
    const unsub = subscribeUserSettings((s) => {
      setIsProPlan(s.unlimitedFreeMeeting !== false);
    });
    return unsub;
  }, [initialProPlan]);
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

  type ActiveSidePanel = 'none' | 'people' | 'chat' | 'activities' | 'host_controls' | 'subtitles';
  const [activeSidePanel, setActiveSidePanel] = useState<ActiveSidePanel>('none');
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const handleTogglePinParticipant = useCallback((participantId: string) => {
    setPinnedParticipantId((curr) => (curr === participantId ? null : participantId));
  }, []);
  const [isCaptionsOn, setIsCaptionsOn] = useState(true);
  const [isInfoCardOpen, setIsInfoCardOpen] = useState(false);
  const [isMeetingReadyCardOpen, setIsMeetingReadyCardOpen] = useState(() => session.role === 'host');
  const hasPlayedConnectedChimeRef = useRef(false);

  useEffect(() => {
    if (isRoomConnected && !hasPlayedConnectedChimeRef.current) {
      hasPlayedConnectedChimeRef.current = true;
      playCallConnectedChime();
    }
  }, [isRoomConnected]);

  const [isEmptyCallTimeoutOpen, setIsEmptyCallTimeoutOpen] = useState(false);
  const [showHandLowerPrompt, setShowHandLowerPrompt] = useState(false);
  const aloneStartTimeRef = useRef<number | null>(null);

  // ── In-Meeting Live Copilot & Inline Glossary ──────────────────────────
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] = useState(false);
  const [glossaryTerms, setGlossaryTerms] = useState<{ source: string; target: string }>({
    source: '',
    target: '',
  });

  const handleOpenGlossaryModal = useCallback((source: string = '', target: string = '') => {
    setGlossaryTerms({ source, target });
    setIsGlossaryModalOpen(true);
  }, []);

  const handleOpenCopilot = useCallback(() => {
    setIsCopilotOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCopilotOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeSidePanelRef = useRef(activeSidePanel);
  useEffect(() => {
    activeSidePanelRef.current = activeSidePanel;
  }, [activeSidePanel]);

  const localMediaStateRef = useRef(localMediaState);
  useEffect(() => {
    localMediaStateRef.current = localMediaState;
  }, [localMediaState]);

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const handleToggleMicRef = useRef<() => Promise<void>>();

  const effectiveHostToken =
    session.hostToken || admissionStorage.getHostToken(session.meetingCode) || undefined;
  const isHost = session.role === 'host' && Boolean(effectiveHostToken);
  const [pendingAdmissions, setPendingAdmissions] = useState<AdmissionRequest[]>([]);
  const [dismissedKnockIds, setDismissedKnockIds] = useState<string[]>([]);
  const notifiedAdmissionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isHost || !effectiveHostToken || !session.meetingCode) return;

    let isMounted = true;
    const pollAdmissions = async () => {
      try {
        const list = await meetingApi.getAdmissions(session.meetingCode, effectiveHostToken);
        if (!isMounted) return;
        const pending = list.filter((req) => req.status === 'pending');

        let hasNewKnock = false;
        for (const req of pending) {
          if (!notifiedAdmissionIdsRef.current.has(req.admissionId)) {
            notifiedAdmissionIdsRef.current.add(req.admissionId);
            hasNewKnock = true;
          }
        }
        if (hasNewKnock) {
          playWaitingRoomKnockChime();
        }
        setPendingAdmissions(pending);
      } catch {
        // Ignore transient polling errors
      }
    };

    void pollAdmissions();
    const interval = window.setInterval(pollAdmissions, 3000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [isHost, effectiveHostToken, session.meetingCode]);

  const handleDecideAdmission = useCallback(
    async (admissionId: string, decision: 'approved' | 'rejected') => {
      if (!effectiveHostToken || !session.meetingCode) return;
      try {
        await meetingApi.decideAdmission(
          session.meetingCode,
          admissionId,
          effectiveHostToken,
          decision,
        );
        setPendingAdmissions((prev) => prev.filter((req) => req.admissionId !== admissionId));
      } catch (e) {
        console.error('Failed to decide admission', e);
      }
    },
    [effectiveHostToken, session.meetingCode],
  );

  const handleApproveAllAdmissions = useCallback(async () => {
    for (const req of pendingAdmissions) {
      await handleDecideAdmission(req.admissionId, 'approved');
    }
  }, [pendingAdmissions, handleDecideAdmission]);

  const handleHostMuteAll = useCallback(async () => {
    if (!room || session.role !== 'host') return;
    try {
      const data = new TextEncoder().encode(JSON.stringify({ type: 'HOST_MUTE_ALL' }));
      if (room.localParticipant) {
        await room.localParticipant.publishData(data, { reliable: true });
      }
    } catch (e) {
      console.warn('Failed to broadcast HOST_MUTE_ALL data message', e);
    }
  }, [room, session.role]);

  const visibleKnockRequests = pendingAdmissions.filter(
    (req) => !dismissedKnockIds.includes(req.admissionId),
  );
  const latestKnockRequest = visibleKnockRequests[0] || null;

  const isPeoplePanelOpen = activeSidePanel === 'people';
  const isSubtitlePanelOpen = activeSidePanel === 'subtitles';
  const setIsPeoplePanelOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    setActiveSidePanel((cur) => {
      const next = typeof open === 'function' ? open(cur === 'people') : open;
      return next ? 'people' : 'none';
    });
  };
  const setIsSubtitlePanelOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    setActiveSidePanel((cur) => {
      const next = typeof open === 'function' ? open(cur === 'subtitles') : open;
      return next ? 'subtitles' : 'none';
    });
  };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [sidecarTab, setSidecarTab] = useState<'all' | 'actions' | 'recap'>('all');
  const display = useMeetingDisplay();
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [isPostMeetingOpen, setIsPostMeetingOpen] = useState(false);
  const [isFloatingSubtitleActive, setIsFloatingSubtitleActive] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDownloadUrl, setRecordingDownloadUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [sidecarPreferences, setSidecarPreferences] = useState<SidecarPreferences>(loadSidecarPreferences);
  const [subtitleTargetLanguage, setSubtitleTargetLanguage] = useState<SupportedLanguage>(session.targetLanguage);
  const [subtitleToken, setSubtitleToken] = useState(session.subtitleToken);
  const [isUpdatingSubtitleLanguage, setIsUpdatingSubtitleLanguage] = useState(false);
  const [subtitleLanguageError, setSubtitleLanguageError] = useState<string | null>(null);
  const [branding, setBranding] = useState<BrandingConfigDto>(DEFAULT_BRANDING_CONFIG);
  const recordingSessionRef = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
  } | null>(null);
  const recordingDownloadUrlRef = useRef<string | null>(null);

  const [audioBoothToast, setAudioBoothToast] = useState<string | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(
    isProPlan ? null : FREE_MEETING_LIMIT_SECONDS,
  );
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [meetingLimitWarning, setMeetingLimitWarning] = useState<string | null>(null);
  const meetingStartedAtRef = useRef<number | null>(null);
  const hasShownTimeWarningRef = useRef(false);
  const meetingTimerStorageKey = `layameet:free-limit-start:${session.meetingId}:${session.participantId}`;

  useEffect(() => {
    if (isProPlan) {
      meetingStartedAtRef.current = null;
      hasShownTimeWarningRef.current = false;
      sessionStorage.removeItem(meetingTimerStorageKey);
      setTimeRemainingSeconds(null);
      setIsTimeExpired(false);
      setIsUpgradeModalOpen(false);
      setMeetingLimitWarning(null);
      return;
    }

    if (meetingStartedAtRef.current === null) {
      if (connectionState !== ConnectionState.Connected) return;

      const now = Date.now();
      const storedStart = Number(sessionStorage.getItem(meetingTimerStorageKey));
      const meetingStartedAt = Number.isFinite(storedStart)
        && storedStart > 0
        && storedStart <= now
        ? storedStart
        : now;

      meetingStartedAtRef.current = meetingStartedAt;
      sessionStorage.setItem(meetingTimerStorageKey, meetingStartedAt.toString());
    }

    const updateTimeRemaining = () => {
      const startedAt = meetingStartedAtRef.current;
      if (startedAt === null) return;

      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const remainingSeconds = Math.max(0, FREE_MEETING_LIMIT_SECONDS - elapsedSeconds);
      setTimeRemainingSeconds(remainingSeconds);

      if (
        remainingSeconds <= FREE_MEETING_WARNING_SECONDS
        && remainingSeconds > 0
        && !hasShownTimeWarningRef.current
      ) {
        hasShownTimeWarningRef.current = true;
        setMeetingLimitWarning('Chỉ còn 5 phút miễn phí. Nâng cấp LayaMeet Pro để tiếp tục họp không giới hạn.');
      }

      if (remainingSeconds === 0) {
        setIsTimeExpired(true);
        setIsUpgradeModalOpen(true);
      }
    };

    updateTimeRemaining();
    const timerId = window.setInterval(updateTimeRemaining, 1000);
    return () => window.clearInterval(timerId);
  }, [connectionState, isProPlan, meetingTimerStorageKey]);

  useEffect(() => {
    if (!meetingLimitWarning) return;
    const timeoutId = window.setTimeout(() => setMeetingLimitWarning(null), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [meetingLimitWarning]);

  const handleOpenUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(true);
  }, []);

  const handleCloseUpgradeModal = useCallback(() => {
    if (!isTimeExpired) setIsUpgradeModalOpen(false);
  }, [isTimeExpired]);

  const handlePaymentSuccess = useCallback(() => {
    setIsProPlan(true);
    setTimeRemainingSeconds(null);
    setIsTimeExpired(false);
    setIsUpgradeModalOpen(false);
    setIsCheckoutOpen(false);
  }, []);

  const handleUpgrade = useCallback(() => {
    setIsCheckoutOpen(true);
    if (onUpgrade) {
      onUpgrade();
    }
  }, [onUpgrade]);

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

  const handleToggleFloatingSubtitle = useCallback(() => {
    if (!sidecarPreferences.floatingSubtitleWidget) return;
    setIsFloatingSubtitleActive((active) => !active);
  }, [sidecarPreferences.floatingSubtitleWidget]);

  useEffect(() => {
    if (!sidecarPreferences.floatingSubtitleWidget) {
      setIsFloatingSubtitleActive(false);
    }
  }, [sidecarPreferences.floatingSubtitleWidget]);

  const stopMeetingRecording = useCallback(() => {
    const session = recordingSessionRef.current;
    if (!session) {
      setIsRecording(false);
      return;
    }

    if (session.recorder.state !== 'inactive') {
      session.recorder.stop();
    }
    session.stream.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
  }, []);

  const handleToggleRecording = useCallback(async () => {
    if (!sidecarPreferences.meetingRecording) return;

    const activeSession = recordingSessionRef.current;
    if (activeSession?.recorder.state === 'recording') {
      stopMeetingRecording();
      return;
    }
    if (activeSession) return;

    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('Trình duyệt này chưa hỗ trợ ghi hình cuộc họp.');
      return;
    }

    setRecordingError(null);
    let displayStream: MediaStream | null = null;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const mimeType = getRecordingMimeType();
      const recorder = new MediaRecorder(displayStream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        displayStream?.getTracks().forEach((track) => track.stop());
        if (recordingSessionRef.current?.recorder === recorder) {
          recordingSessionRef.current = null;
        }
        setIsRecording(false);

        const recording = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        if (recording.size === 0) {
          setRecordingError('Không nhận được dữ liệu video để xuất.');
          return;
        }

        const nextUrl = URL.createObjectURL(recording);
        if (recordingDownloadUrlRef.current) {
          URL.revokeObjectURL(recordingDownloadUrlRef.current);
        }
        recordingDownloadUrlRef.current = nextUrl;
        setRecordingDownloadUrl(nextUrl);
        void saveRecording(session.meetingCode, recording);
      };

      displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, { once: true });

      recorder.start(1000);
      recordingSessionRef.current = { recorder, stream: displayStream };
      setIsRecording(true);
    } catch (error) {
      displayStream?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setRecordingError(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Bạn đã hủy hoặc chưa cấp quyền chia sẻ màn hình để ghi hình.'
          : 'Không thể bắt đầu ghi hình cuộc họp.',
      );
    }
  }, [session.meetingCode, sidecarPreferences.meetingRecording, stopMeetingRecording]);

  useEffect(() => {
    if (!sidecarPreferences.meetingRecording) stopMeetingRecording();
  }, [sidecarPreferences.meetingRecording, stopMeetingRecording]);

  useEffect(() => () => {
    const session = recordingSessionRef.current;
    if (session) {
      session.recorder.ondataavailable = null;
      session.recorder.onstop = null;
      if (session.recorder.state !== 'inactive') session.recorder.stop();
      session.stream.getTracks().forEach((track) => track.stop());
    }
    if (recordingDownloadUrlRef.current) {
      URL.revokeObjectURL(recordingDownloadUrlRef.current);
    }
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
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [raisedHands, setRaisedHands] = useState<Map<string, number>>(() => new Map());
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);

  useEffect(() => {
    if (activeSidePanel === 'chat') {
      setUnreadChatCount(0);
    }
  }, [activeSidePanel]);

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
          setUnreadChatCount((prev) => (activeSidePanelRef.current === 'chat' ? 0 : prev + 1));
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
              attachment: parseChatAttachment(record.attachment),
            },
          ]);
        } else if (record.type === 'HOST_MUTE_ALL' || record.type === 'host_mute_all') {
          if (sessionRef.current.role !== 'host') {
            if (localMediaStateRef.current.micEnabled) {
              void handleToggleMicRef.current?.();
            }
          }
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
    async (text: string, attachment?: ChatMessage['attachment']) => {
      if (!room || (!text.trim() && !attachment)) return;
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        senderId: session.participantId,
        senderName: session.displayName || 'You',
        text: text.trim(),
        timestamp: new Date().toISOString(),
        attachment,
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
  const participants: Participant[] = Array.from<Participant>(room.remoteParticipants.values());
  if (room.localParticipant) {
    participants.unshift(room.localParticipant);
  }

  // Auto-dismiss the "Meeting Ready" call prompt when another participant arrives
  useEffect(() => {
    if (participants.length > 1) {
      setIsMeetingReadyCardOpen(false);
    }
  }, [participants.length]);

  const subtitleOptions = React.useMemo(
    () => ({
      subtitleToken,
      participantName: session.displayName,
      sourceLanguage: session.spokenLanguage,
      targetLanguage: subtitleTargetLanguage,
      isMicOn: localMediaState.micEnabled,
      isAiReady: aiReadiness.state === 'ready',
      isProPlan,
      audioTrack: localAudioTrack?.mediaStreamTrack || null,
    }),
    [
      subtitleToken,
      session.displayName,
      session.spokenLanguage,
      subtitleTargetLanguage,
      localMediaState.micEnabled,
      aiReadiness.state,
      isProPlan,
      localAudioTrack,
    ],
  );

  const {
    activeSubtitle,
    history: subtitleHistory,
    getExportHistory,
    pipelineStatuses,
    isSpeaking: isVadSpeaking,
  } = useSubtitle(
    session.meetingId,
    session.participantId,
    subtitleOptions,
  );

  const remoteActiveSubtitle = activeSubtitle;
  const remotePipelineStatuses = pipelineStatuses;

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
    currentUserDisplayName: session.displayName,
    localIdentity: localParticipant?.identity,
    targetLanguage: subtitleOptions.targetLanguage,
    allowSelfSpeech: participants.length <= 1,
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
  handleToggleMicRef.current = handleToggleMic;

  const handlePushToTalk = useCallback((active: boolean) => {
    if (active) {
      if (!localMediaState.micEnabled) {
        setIsPushToTalkActive(true);
        void handleToggleMic();
      }
    } else {
      if (isPushToTalkActive) {
        setIsPushToTalkActive(false);
        if (localMediaState.micEnabled) {
          void handleToggleMic();
        }
      }
    }
  }, [localMediaState.micEnabled, handleToggleMic, isPushToTalkActive]);

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
    window.location.assign(`/meeting/${session.meetingCode}`);
  };

  const handleOpenPostMeeting = () => {
    stopMeetingRecording();
    setIsPostMeetingOpen(true);
  };

  const handleEmptyCallTimeoutLeave = useCallback(() => {
    try {
      stopMeetingRecording();
    } catch {
      // ignore
    }
    setIsEmptyCallTimeoutOpen(false);
    try {
      room.disconnect();
    } catch {
      // ignore
    }
    onLeaveRoom();
  }, [onLeaveRoom, room, stopMeetingRecording]);

  const handleEmptyCallTimeoutStay = useCallback(() => {
    setIsEmptyCallTimeoutOpen(false);
    aloneStartTimeRef.current = Date.now();
  }, []);

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

  const participantLanguages = React.useMemo(() => {
    const map: Record<string, SupportedLanguage | string> = {};
    if (localParticipant?.identity) {
      map[localParticipant.identity] = session.spokenLanguage;
    }
    if (localParticipant?.sid) {
      map[localParticipant.sid] = session.spokenLanguage;
    }
    map[session.participantId] = session.spokenLanguage;
    map[session.identity] = session.spokenLanguage;
    map[session.displayName] = session.spokenLanguage;

    for (const item of subtitleHistory) {
      if (item.sourceLanguage) {
        if (item.participantId) map[item.participantId] = item.sourceLanguage;
        if (item.participantName) map[item.participantName] = item.sourceLanguage;
      }
    }
    return map;
  }, [
    localParticipant?.identity,
    localParticipant?.sid,
    session.spokenLanguage,
    session.participantId,
    session.identity,
    session.displayName,
    subtitleHistory,
  ]);

  const handleToggleShowOriginal = useCallback(() => {
    handleSidecarPreferencesChange({
      ...sidecarPreferences,
      showOriginal: !sidecarPreferences.showOriginal,
    });
  }, [handleSidecarPreferencesChange, sidecarPreferences]);

  // Google Meet signature empty room timeout prompt (2min countdown when alone)
  useEffect(() => {
    if (participants.length <= 1 && connectionState === ConnectionState.Connected) {
      if (aloneStartTimeRef.current === null) {
        aloneStartTimeRef.current = Date.now();
      }
      const emptyTimeoutMs = Number(import.meta.env.VITE_EMPTY_ROOM_TIMEOUT_MS) || 5 * 60 * 1000;
      const checkInterval = setInterval(() => {
        if (aloneStartTimeRef.current && Date.now() - aloneStartTimeRef.current >= emptyTimeoutMs) {
          setIsEmptyCallTimeoutOpen(true);
        }
      }, 1000);
      return () => clearInterval(checkInterval);
    } else {
      aloneStartTimeRef.current = null;
      setIsEmptyCallTimeoutOpen(false);
    }
  }, [participants.length, connectionState]);

  // Google Meet signature hand lowering prompt when user starts speaking
  useEffect(() => {
    const isHandRaised = raisedHands.has(localParticipant?.identity || session.identity);
    if (!isHandRaised) {
      setShowHandLowerPrompt(false);
      return;
    }

    if (isLocalSpeaking && !showHandLowerPrompt) {
      const timer = setTimeout(() => {
        setShowHandLowerPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLocalSpeaking, raisedHands, localParticipant?.identity, session.identity, showHandLowerPrompt]);

  useEffect(() => {
    if (!showHandLowerPrompt) return;
    const timer = setTimeout(() => {
      handleToggleRaiseHand();
      setShowHandLowerPrompt(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [showHandLowerPrompt, handleToggleRaiseHand]);

  return (
    <div className="meeting-shell bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative font-sans">
      {/* Diagnostics Overlay */}
      {enableWebRtcDebug && <WebRtcDiagnostics />}

      {/* Header Top Bar */}
      <MeetingTopBar
        meetingCode={session.meetingCode}
        connectionState={connectionState}
        isHost={session.role === 'host'}
        branding={branding}
        isRecording={isRecording}
        isE2eeEnabled={sidecarPreferences.e2eeEnabled}
        numParticipants={participants.length}
        userDisplayName={session.displayName}
        isProPlan={isProPlan}
        timeRemainingSeconds={timeRemainingSeconds}
        onOpenUpgradeModal={handleOpenUpgradeModal}
        isOffline={!display.online}
      />

      {/* Connecting / Reconnecting Status Banner */}
      {isRoomConnecting && (
        <div className="absolute top-14 inset-x-0 z-30 flex justify-center pointer-events-none">
          <div className="mt-2 px-4 py-2 rounded-xl bg-amber-600 border border-amber-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {connectionState === ConnectionState.Reconnecting
              ? 'Đang kết nối lại tới phòng họp...'
              : 'Đang kết nối tới phòng họp...'}
          </div>
        </div>
      )}

      <div
        className={`meeting-display-status ${
          display.online
            ? 'sr-only'
            : 'bg-amber-950/90 text-amber-200 border-b border-amber-500/30 font-medium'
        }`}
        role="status"
      >
        {!display.online ? 'Mất mạng — đang chờ kết nối lại' : display.wakeStatus === 'active' ? 'Giữ màn hình sáng' : 'Nếu màn hình tự khóa, hãy chạm để tiếp tục cuộc họp'}
      </div>
      <AiReadinessBanner state={aiReadiness.state} onRetry={aiReadiness.retry} />

      {/* Main Stage & Right Panel Drawer Container */}
      <div className="meeting-workspace flex-1 min-h-0 flex overflow-hidden relative">
        <main className="flex-1 h-full relative overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <MeetingStage
              layoutMode={layoutMode}
              meetingCode={session.meetingCode}
              pipelineStatuses={pipelineStatuses}
              raisedHands={raisedHands}
              participantLanguages={participantLanguages}
              isInfoCardOpen={isInfoCardOpen}
              onToggleInfoCard={() => setIsInfoCardOpen((v) => !v)}
              userEmailOrName={session.displayName || session.participantId}
              pinnedParticipantId={pinnedParticipantId}
              onTogglePin={handleTogglePinParticipant}
            />
          </div>

          <SubtitleOverlay
            subtitle={remoteActiveSubtitle}
            recentSubtitles={subtitleHistory}
            pipelineStatuses={remotePipelineStatuses}
            showOriginal={sidecarPreferences.showOriginal}
            targetLanguage={subtitleTargetLanguage}
            onTargetLanguageChange={handleTargetLanguageChange}
            onToggleShowOriginal={handleToggleShowOriginal}
            isCaptionsOn={isCaptionsOn}
            onOpenSettings={() => setIsSettingsOpen(true)}
            currentUserId={session.participantId}
            currentUserDisplayName={session.displayName}
            localIdentity={localParticipant?.identity}
          />

          {/* Floating Reactions Overlay */}
          <FloatingReactionsOverlay reactions={reactions} />
        </main>

        {/* One responsive panel for every collaboration tool. */}
        {activeSidePanel !== 'none' && (
          <AdaptiveDialog docked label="Công cụ cuộc họp" onClose={() => setActiveSidePanel('none')} className="meeting-panel">
            <nav className="meeting-panel-tabs" aria-label="Công cụ cuộc họp">
              {([
                ['people', 'Mọi người'], ['chat', 'Chat'], ['subtitles', 'Trợ lý AI'],
                ['activities', 'Hoạt động'], ...(isHost ? [['host_controls', 'Chủ phòng']] : []),
              ] as [ActiveSidePanel, string][]).map(([id, label]) => (
                <button type="button" key={id} aria-pressed={activeSidePanel === id} onClick={() => setActiveSidePanel(id)}>{label}</button>
              ))}
            </nav>
            <div className="meeting-panel-body">
        {activeSidePanel === 'people' && (
          <ParticipantsPanel
            participants={participants}
            raisedHands={raisedHands}
            onClose={() => setActiveSidePanel('none')}
            participantLanguages={participantLanguages}
            isHost={session.role === 'host'}
            meetingCode={session.meetingCode}
            hostToken={effectiveHostToken}
            pendingAdmissions={pendingAdmissions}
            onDecideAdmission={handleDecideAdmission}
            onApproveAllAdmissions={handleApproveAllAdmissions}
            onMuteAll={handleHostMuteAll}
          />
        )}

        {activeSidePanel === 'chat' && (
          <ChatPanel
            messages={chatMessages}
            onSendMessage={handleSendChatMessage}
            currentUserId={session.participantId}
            isHost={session.role === 'host'}
            onClose={() => setActiveSidePanel('none')}
          />
        )}

        {activeSidePanel === 'activities' && (
          <ActivitiesPanel
            onClose={() => setActiveSidePanel('none')}
            onOpenSubtitles={() => setActiveSidePanel('subtitles')}
            onOpenMinutes={() => setActiveSidePanel('subtitles')}
            onToggleRecording={handleToggleRecording}
            isRecording={isRecording}
            onToggleAudioBooth={handleToggleAudioBooth}
            isAudioBoothActive={sidecarPreferences.audioBooth}
          />
        )}

        {activeSidePanel === 'host_controls' && (
          <HostControlsPanel
            onClose={() => setActiveSidePanel('none')}
            isHost={session.role === 'host'}
            onOpenAdmission={() => setActiveSidePanel('people')}
            meetingCode={session.meetingCode}
          />
        )}

        <SubtitlePanel
          key={sidecarTab}
          initialTab={sidecarTab}
          history={subtitleHistory}
          getExportHistory={getExportHistory}
          isOpen={activeSidePanel === 'subtitles'}
          onClose={() => setActiveSidePanel('none')}
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
          onOpenCopilot={handleOpenCopilot}
          onTeachGlossary={handleOpenGlossaryModal}
        />
            </div>
          </AdaptiveDialog>
        )}
      </div>

      {isFloatingSubtitleActive && sidecarPreferences.floatingSubtitleWidget && (
        <FloatingSubtitleWidget
          subtitles={subtitleHistory}
          onClose={() => setIsFloatingSubtitleActive(false)}
        />
      )}

      {/* Floating Bottom Control Bar */}
      <MeetingBottomBar
        meetingCode={session.meetingCode}
        isMicOn={localMediaState.micEnabled}
        isSpeaking={isVadSpeaking}
        isCameraOn={localMediaState.cameraEnabled}
        isScreenSharing={localMediaState.screenShareEnabled}
        microphoneTrack={localAudioTrack}
        isConnected={isRoomConnected}
        isConnecting={isRoomConnecting}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onLeaveRoom={handleOpenPostMeeting}
        onOpenPeoplePanel={handleTogglePeoplePanel}
        onToggleSubtitlePanel={() => setIsCaptionsOn((current) => !current)}
        onOpenLanguage={() => setIsLanguageOpen(true)}
        onOpenMeetingInfo={() => setIsInfoCardOpen((prev) => !prev)}
        isMeetingInfoOpen={isInfoCardOpen}
        onOpenSubtitleHistory={() => { setSidecarTab('all'); setActiveSidePanel('subtitles'); }}
        onOpenActions={() => {
          handleSidecarPreferencesChange({ ...sidecarPreferences, showActions: true });
          setSidecarTab('actions'); setActiveSidePanel('subtitles');
        }}
        onOpenRecap={() => {
          handleSidecarPreferencesChange({ ...sidecarPreferences, showRecap: true });
          setSidecarTab('recap'); setActiveSidePanel('subtitles');
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLayoutMenu={() => setIsLayoutMenuOpen(true)}
        onOpenCopilot={handleOpenCopilot}
        isSubtitlePanelOpen={isSubtitlePanelOpen}
        subtitleCount={subtitleHistory.length}
        numParticipants={participants.length}
        isHandRaised={raisedHands.has(localParticipant?.identity || session.identity)}
        onToggleRaiseHand={handleToggleRaiseHand}
        onSendReaction={handleSendReaction}
        isAudioBoothActive={sidecarPreferences.audioBooth}
        onToggleAudioBooth={handleToggleAudioBooth}
        isRecordingEnabled={sidecarPreferences.meetingRecording}
        isRecording={isRecording}
        onToggleRecording={handleToggleRecording}
        isFloatingSubtitleEnabled={sidecarPreferences.floatingSubtitleWidget}
        isFloatingSubtitleActive={isFloatingSubtitleActive}
        onToggleFloatingSubtitle={handleToggleFloatingSubtitle}
        spokenLanguage={session.spokenLanguage}
        targetLanguage={subtitleTargetLanguage}
        isPeoplePanelOpen={isPeoplePanelOpen}
        activeSidePanel={activeSidePanel}
        onToggleChatPanel={() => setActiveSidePanel((c) => c === 'chat' ? 'none' : 'chat')}
        onToggleActivitiesPanel={() => setActiveSidePanel((c) => c === 'activities' ? 'none' : 'activities')}
        onToggleHostControlsPanel={() => setActiveSidePanel((c) => c === 'host_controls' ? 'none' : 'host_controls')}
        isCaptionsActive={isCaptionsOn}
        isHost={session.role === 'host'}
        pendingAdmissionsCount={pendingAdmissions.length}
        onPushToTalk={handlePushToTalk}
        unreadChatCount={unreadChatCount}
      />

      {/* Push-to-Talk Floating Indicator (Zoom & Meet style) */}
      {isPushToTalkActive && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 border border-emerald-400 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-pulse pointer-events-none select-none">
          <Mic className="w-4 h-4 animate-bounce" />
          <span>Đang giữ phím Space để nói — Nhả phím để tắt mic</span>
        </div>
      )}

      {/* Google Meet style Waiting Room Knock Notification with Bell Chime */}
      {isHost && latestKnockRequest && activeSidePanel !== 'people' && (
        <div
          role="alertdialog"
          aria-label="Yêu cầu tham gia cuộc họp"
          className="fixed top-16 right-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-2xl text-slate-100 space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Có người chờ duyệt vào phòng
                </span>
                {visibleKnockRequests.length > 1 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    +{visibleKnockRequests.length - 1} khác
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-medium text-white flex items-center gap-1.5 flex-wrap">
                <CountryFlag code={latestKnockRequest.spokenLanguage || 'vi'} size="xs" />
                <strong className="font-bold text-sky-300 truncate max-w-[160px]">
                  {latestKnockRequest.displayName}
                </strong>
                <span>muốn tham gia cuộc họp này</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveSidePanel('people');
              }}
              className="mr-auto text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              Xem danh sách ({pendingAdmissions.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setDismissedKnockIds((prev) => [...prev, latestKnockRequest.admissionId]);
                void handleDecideAdmission(latestKnockRequest.admissionId, 'rejected');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-600/50 text-xs font-medium transition cursor-pointer"
            >
              Từ chối
            </button>
            <button
              type="button"
              onClick={() => {
                setDismissedKnockIds((prev) => [...prev, latestKnockRequest.admissionId]);
                void handleDecideAdmission(latestKnockRequest.admissionId, 'approved');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              Chấp nhận
            </button>
          </div>
        </div>
      )}

      {/* Google Meet signature speech-detected hand lowering toast (media_1791225242514.png) */}
      {showHandLowerPrompt && (
        <div className="fixed bottom-16 left-4 z-40 bg-[#28292a] border border-zinc-700/80 text-zinc-100 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm animate-in fade-in">
          <span>Có vẻ như bạn đã nói điều gì đó nên yêu cầu phát biểu của bạn sẽ kết thúc.</span>
          <button
            type="button"
            onClick={() => setShowHandLowerPrompt(false)}
            className="text-sky-400 hover:text-sky-300 font-semibold whitespace-nowrap cursor-pointer"
          >
            Tiếp tục giơ tay phát biểu
          </button>
        </div>
      )}

      {/* Google Meet signature empty room timeout modal (media_1791224986153.png) */}
      <EmptyCallTimeoutModal
        isOpen={isEmptyCallTimeoutOpen}
        onStay={handleEmptyCallTimeoutStay}
        onLeave={handleEmptyCallTimeoutLeave}
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
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#1e2025] border border-[#353942] text-zinc-100 text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 max-w-md pointer-events-none transition-all">
          <span className="text-sky-400 font-bold">🎧 Audio Booth:</span>
          <span>{audioBoothToast}</span>
        </div>
      )}

      {meetingLimitWarning && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-24 left-1/2 z-[90] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-xl border border-amber-500 bg-[#251808] px-4 py-3 text-sm text-amber-100 shadow-2xl"
        >
          <span aria-hidden="true">⏳</span>
          <span className="flex-1">{meetingLimitWarning}</span>
          <button
            type="button"
            onClick={() => setMeetingLimitWarning(null)}
            aria-label="Đóng cảnh báo thời lượng"
            className="rounded p-0.5 text-amber-300 transition hover:bg-amber-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            ×
          </button>
        </div>
      )}

      {recordingError && (
        <div role="alert" className="fixed bottom-24 left-1/2 z-50 flex max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl border border-rose-500/50 bg-[#201214] px-4 py-3 text-xs text-rose-100 shadow-xl">
          <span>{recordingError}</span>
          <button
            type="button"
            onClick={() => setRecordingError(null)}
            aria-label="Đóng thông báo ghi hình"
            className="ml-auto text-rose-300 transition hover:text-white"
          >
            ×
          </button>
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
      {isLanguageOpen && <MeetingLanguageDialog
        spokenLanguage={session.spokenLanguage}
        targetLanguage={subtitleTargetLanguage}
        updating={isUpdatingSubtitleLanguage}
        error={subtitleLanguageError}
        onTargetChange={handleTargetLanguageChange}
        onClose={() => setIsLanguageOpen(false)}
        onRejoin={onLeaveRoom}
      />}
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
          meetingId={session.meetingId}
          meetingCode={session.meetingCode}
          sidecarPreferences={sidecarPreferences}
          onSidecarPreferencesChange={handleSidecarPreferencesChange}
        />
      )}

      <UpgradeRequiredModal
        isOpen={isUpgradeModalOpen}
        isTimeExpired={isTimeExpired}
        onUpgrade={handleUpgrade}
        onLeaveMeeting={onLeaveRoom}
        onClose={handleCloseUpgradeModal}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        meetingCode={session.meetingCode}
        initialPlanId="pro"
        onPaymentSuccess={handlePaymentSuccess}
      />

      <PostMeetingModal
        isOpen={isPostMeetingOpen}
        meetingCode={session.meetingCode}
        recap={postMeetingRecap}
        history={subtitleHistory}
        branding={branding}
        recordingDownloadUrl={recordingDownloadUrl}
        onClose={() => setIsPostMeetingOpen(false)}
        onLeaveRoom={onLeaveRoom}
      />

      {/* In-Meeting Live Copilot (Ctrl+K) */}
      <LiveMeetingCopilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        history={subtitleHistory}
        meetingCode={session.meetingCode}
      />

      {/* Inline Glossary Live Correction Modal */}
      <InlineGlossaryModal
        isOpen={isGlossaryModalOpen}
        onClose={() => setIsGlossaryModalOpen(false)}
        meetingCode={session.meetingCode}
        initialSourceTerm={glossaryTerms.source}
        initialTargetTerm={glossaryTerms.target}
      />

      {/* Google Meet signature "Cuộc họp của bạn đã sẵn sàng" prompt */}
      <MeetingReadyCard
        meetingCode={session.meetingCode}
        isOpen={isMeetingReadyCardOpen && participants.length <= 1}
        onClose={() => setIsMeetingReadyCardOpen(false)}
        onOpenInvite={() => setIsInfoCardOpen(true)}
      />

      {/* Meeting Details Dialog (ⓘ) */}
      {isInfoCardOpen && (
        <MeetingDetailsDialog
          meetingCode={session.meetingCode}
          role={session.role}
          hostToken={effectiveHostToken}
          onClose={() => setIsInfoCardOpen(false)}
        />
      )}
    </div>
  );
};
