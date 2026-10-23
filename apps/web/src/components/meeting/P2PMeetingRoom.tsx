import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Cpu,
  Hand,
  LayoutGrid,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Radio,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Subtitles,
  Terminal,
  Users,
  Video,
  VideoOff,
  Volume2,
} from 'lucide-react';
import {
  ChatMessage,
  FloatingReaction,
  getLanguageOption,
  MeetingSessionData,
  SidecarPreferences,
  SupportedLanguage,
  SUPPORTED_LANGUAGES_LIST,
} from '../../types/meeting';
import { SubtitleMessage } from '../../types/subtitle';
import { DEFAULT_BRANDING_CONFIG } from '../../api/meetingApi';
import { CountryFlag } from '../common/CountryFlag';
import { SubtitleOverlay } from '../subtitle/SubtitleOverlay';
import { SubtitlePanel } from '../subtitle/SubtitlePanel';
import { FloatingReactionsOverlay } from './FloatingReactionsOverlay';
import { TTSVoiceDubbingModal } from './TTSVoiceDubbingModal';
import { ModuleManagerModal } from '../desktop/ModuleManagerModal';
import {
  P2PMeetingRoomController,
  P2PPeerParticipant,
} from '../../services/p2pMeetingService';
import {
  P2PSpeechTranscriber,
  P2PSttEngineName,
  P2PTranslationEngineName,
} from '../../services/p2pAiTranslatorService';
import { ttsEngine } from '../../utils/speechSynthesis';

interface P2PMeetingRoomProps {
  session: MeetingSessionData;
  onLeaveComplete: () => void;
}

const IT_QUICK_PHRASES: Record<SupportedLanguage | 'default', string[]> = {
  vi: [
    'Quyết định chốt kiến trúc WebRTC P2P không dùng server để tối ưu chi phí.',
    'Nhờ team Backend hoàn thành review Pull Request trước 17h hôm nay.',
    'Cảnh báo rủi ro: Môi trường Staging đang bị chậm kết nối, cần kiểm tra lại.',
  ],
  en: [
    'We decided to approve the serverless WebRTC P2P architecture for production.',
    'Action item: Please complete the security code review by Friday.',
    'Critical risk: Deployment pipeline has a bottleneck on staging.',
  ],
  ja: [
    'コスト最適化のため、サーバーレスP2Pアーキテクチャの採用を決定しました。',
    '本日17時までにプルリクエストのレビュー対応をお願いします。',
    '緊急課題：ステージング環境で遅延リスクが発生しているため確認が必要です。',
  ],
  ko: ['오늘 오후 5시까지 코드 리뷰를 완료해 주세요.'],
  zh: ['我们决定采用无服务器 P2P 架构。'],
  th: ['เรากำหนดให้เสร็จสิ้นการตรวจสอบโค้ดภายในวันนี้'],
  id: ['Tolong selesaikan code review sebelum jam 5 sore.'],
  tl: ['Tapusin natin ang code review ngayong araw.'],
  ar: ['يرجى إكمال مراجعة الكود اليوم.'],
  fr: ['Nous avons décidé de valider cette architecture P2P.'],
  de: ['Bitte schließen Sie das Code-Review bis 17 Uhr ab.'],
  es: ['Por favor completen la revisión de código hoy.'],
  default: [
    'Quyết định chốt kiến trúc WebRTC P2P không dùng server.',
    'Nhờ team hoàn thành review Pull Request trước 17h hôm nay.',
  ],
};

const RemotePeerVideoTile: React.FC<{
  peer: P2PPeerParticipant;
}> = ({ peer }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeStream = peer.screenStream || peer.cameraStream || null;

  useEffect(() => {
    if (videoRef.current && activeStream) {
      videoRef.current.srcObject = activeStream;
    }
  }, [activeStream]);

  const langOpt = getLanguageOption(peer.spokenLanguage);

  return (
    <div
      className={`meeting-video-cell relative rounded-xl border overflow-hidden bg-[#131820] flex flex-col justify-between min-h-[200px] transition-all ${
        peer.isSpeaking
          ? 'border-teal-400 ring-2 ring-teal-500/30'
          : 'border-slate-800'
      }`}
    >
      {activeStream && (peer.isCameraOn || peer.isScreenSharing) ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 select-none">
          {activeStream && (
            <video ref={videoRef} autoPlay playsInline className="hidden" />
          )}
          <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-teal-400 font-mono">
            {(peer.displayName || 'P').slice(0, 2).toUpperCase()}
          </div>
          <span className="mt-2 text-xs text-slate-400 font-mono">
            {peer.isMicOn ? 'AUDIO P2P ACTIVE' : 'MIC MUTED'}
          </span>
        </div>
      )}

      {/* Top Badges */}
      <div className="relative z-10 p-2.5 flex items-center justify-between gap-2">
        <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-700/80 text-[10px] font-mono text-teal-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {peer.transport === 'internet-webrtc' ? 'P2P WAN' : 'P2P LOCAL'}
        </span>
        {peer.raisedHand && (
          <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[11px] font-bold flex items-center gap-1">
            <Hand className="w-3 h-3" /> Giơ tay
          </span>
        )}
      </div>

      {/* Bottom Name & Language Strip */}
      <div className="relative z-10 p-2.5 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CountryFlag code={langOpt.code} size="xs" />
          <span className="text-xs font-semibold text-white truncate">
            {peer.displayName}
          </span>
          <span className="text-[10px] font-mono text-slate-400 uppercase">
            ({peer.spokenLanguage}→{peer.targetLanguage})
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!peer.isMicOn ? (
            <MicOff className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Mic
              className={`w-3.5 h-3.5 ${
                peer.isSpeaking ? 'text-teal-400 animate-pulse' : 'text-slate-300'
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const P2PMeetingRoom: React.FC<P2PMeetingRoomProps> = ({
  session,
  onLeaveComplete,
}) => {
  const [spokenLanguage, setSpokenLanguage] = useState<SupportedLanguage>(
    session.spokenLanguage || 'vi',
  );
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>(
    session.targetLanguage || 'en',
  );
  const [isMicOn, setIsMicOn] = useState<boolean>(session.initialMicOn ?? true);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(
    session.initialCameraOn ?? false,
  );
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const [isCaptionsOn, setIsCaptionsOn] = useState(true);
  const [showOriginal, setShowOriginal] = useState(true);

  // ERP Workspace Layout Mode: 'split' (IT Workspace with Terminal) | 'grid' (Video Grid)
  const [workspaceMode, setWorkspaceMode] = useState<'split' | 'grid'>('split');

  // Sidecar & Modals
  const [isSidecarOpen, setIsSidecarOpen] = useState(true);
  const [sidecarTab, setSidecarTab] = useState<'all' | 'actions' | 'recap' | 'chat'>('all');
  const [isModuleManagerOpen, setIsModuleManagerOpen] = useState(false);
  const [isTtsModalOpen, setIsTtsModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // P2P State
  const [peers, setPeers] = useState<P2PPeerParticipant[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleMessage[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleMessage | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [sttEngine, setSttEngine] = useState<P2PSttEngineName>('browser-speech');
  const [translationEngine, setTranslationEngine] =
    useState<P2PTranslationEngineName>('neural-edge');
  const [manualCaptionText, setManualCaptionText] = useState('');

  const [sidecarPrefs, setSidecarPrefs] = useState<SidecarPreferences>({
    showActions: true,
    showRecap: true,
    showChat: true,
    fileSharing: true,
    meetingRecording: false,
    e2eeEnabled: true,
    floatingSubtitleWidget: false,
    audioBooth: true,
    showOriginal: true,
  });

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const controllerRef = useRef<P2PMeetingRoomController | null>(null);
  const transcriberRef = useRef<P2PSpeechTranscriber | null>(null);
  const activeUtteranceIdRef = useRef<string>(`utt-${Date.now()}`);

  const appendOrUpdateSubtitle = useCallback(
    (incoming: SubtitleMessage, engine?: P2PTranslationEngineName) => {
      if (engine) setTranslationEngine(engine);
      setCurrentSubtitle(incoming);

      setSubtitles((prev) => {
        const idx = prev.findIndex((item) => item.id === incoming.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = incoming;
          return next;
        }
        return [...prev.slice(-199), incoming];
      });

      // Trigger TTS Voice Dubbing if final subtitle came from a remote participant
      if (
        incoming.isFinal &&
        incoming.participantId !== session.participantId &&
        incoming.translatedText
      ) {
        ttsEngine.setLanguage(incoming.targetLanguage);
        ttsEngine.speak(incoming.translatedText);
      }
    },
    [session.participantId],
  );

  // Initialize P2P Controller & Speech Transcriber
  useEffect(() => {
    const controller = new P2PMeetingRoomController(
      {
        meetingCode: session.meetingCode,
        participantId: session.participantId,
        displayName: session.displayName,
        spokenLanguage,
        targetLanguage,
        isMicOn,
        isCameraOn,
      },
      {
        onPeersUpdated: (updatedPeers) => {
          setPeers(updatedPeers);
        },
        onSubtitleReceived: (sub, engine) => {
          appendOrUpdateSubtitle(sub, engine);
        },
        onChatReceived: (msg) => {
          setChatMessages((prev) => [...prev, msg]);
        },
        onReactionReceived: (emoji, senderName) => {
          const item: FloatingReaction = {
            id: `react-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            emoji,
            senderName,
            leftPercent: 20 + Math.floor(Math.random() * 60),
          };
          setReactions((prev) => [...prev.slice(-12), item]);
        },
      },
    );

    controller.connect();
    controllerRef.current = controller;

    const transcriber = new P2PSpeechTranscriber({
      onTranscript: (text, isFinal, confidence) => {
        const uttId = activeUtteranceIdRef.current;
        void controller.broadcastSubtitleUtterance(uttId, text, isFinal, confidence);
        if (isFinal) {
          activeUtteranceIdRef.current = `utt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        }
      },
      onSpeakingChange: (speaking) => {
        setIsSpeaking(speaking);
        controller.updateLocalState({ isSpeaking: speaking });
      },
      onEngineChange: (eng) => {
        setSttEngine(eng);
      },
    });
    transcriberRef.current = transcriber;

    return () => {
      transcriber.stop();
      controller.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.meetingCode, session.participantId, session.displayName]);

  // Manage Local Camera & Mic Stream
  useEffect(() => {
    let cancelled = false;

    async function syncLocalMedia() {
      if (!isMicOn && !isCameraOn) {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
          localStreamRef.current = null;
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        transcriberRef.current?.setMuted(true);
        await controllerRef.current?.setCameraStream(null);
        controllerRef.current?.updateLocalState({ isMicOn: false, isCameraOn: false });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: isMicOn
            ? session.audioDeviceId
              ? { deviceId: { ideal: session.audioDeviceId } }
              : true
            : false,
          video: isCameraOn
            ? session.videoDeviceId
              ? { deviceId: { ideal: session.videoDeviceId } }
              : { width: { ideal: 1280 }, height: { ideal: 720 } }
            : false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        await controllerRef.current?.setCameraStream(stream);
        controllerRef.current?.updateLocalState({ isMicOn, isCameraOn });

        if (isMicOn) {
          transcriberRef.current?.start(spokenLanguage, stream);
          transcriberRef.current?.setMuted(false);
        } else {
          transcriberRef.current?.setMuted(true);
        }
      } catch {
        // Fallback if camera/mic hardware is unavailable: still start SpeechRecognition if unmuted
        controllerRef.current?.updateLocalState({ isMicOn, isCameraOn: false });
        if (isMicOn) {
          transcriberRef.current?.start(spokenLanguage, null);
          transcriberRef.current?.setMuted(false);
        }
      }
    }

    void syncLocalMedia();

    return () => {
      cancelled = true;
    };
  }, [isMicOn, isCameraOn, session.audioDeviceId, session.videoDeviceId, spokenLanguage]);

  // Keep controller language preferences synced
  useEffect(() => {
    controllerRef.current?.updateLocalState({
      spokenLanguage,
      targetLanguage,
    });
    transcriberRef.current?.setSpokenLanguage(spokenLanguage);
  }, [spokenLanguage, targetLanguage]);

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      controllerRef.current?.setScreenStream(null);
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = displayStream;
      setIsScreenSharing(true);
      controllerRef.current?.setScreenStream(displayStream);
      displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        screenStreamRef.current = null;
        setIsScreenSharing(false);
        controllerRef.current?.setScreenStream(null);
      });
    } catch {
      // User cancelled screen picker
    }
  };

  const handleSendManualCaption = async (textToBroadcast?: string) => {
    const text = (textToBroadcast ?? manualCaptionText).trim();
    if (!text || !controllerRef.current) return;
    if (!textToBroadcast) setManualCaptionText('');

    const uttId = `utt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await controllerRef.current.broadcastSubtitleUtterance(uttId, text, true, 0.98);
  };

  const handleSendChat = (text: string, attachment?: ChatMessage['attachment']) => {
    if (!text.trim() && !attachment) return;
    const msg = controllerRef.current?.sendChatMessage(text, attachment);
    if (msg) {
      setChatMessages((prev) => [...prev, msg]);
    }
  };

  const handleTriggerReaction = (emoji: string) => {
    controllerRef.current?.sendReaction(emoji);
    setReactions((prev) => [
      ...prev.slice(-12),
      {
        id: `react-${Date.now()}`,
        emoji,
        senderName: session.displayName,
        leftPercent: 30 + Math.floor(Math.random() * 40),
      },
    ]);
  };

  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}/meeting/${session.meetingCode}?mode=p2p`;
    void navigator.clipboard?.writeText(url).then(() => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleLeave = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    transcriberRef.current?.stop();
    controllerRef.current?.disconnect();
    onLeaveComplete();
  };

  const quickPhrases = useMemo(
    () => IT_QUICK_PHRASES[spokenLanguage] || IT_QUICK_PHRASES.default,
    [spokenLanguage],
  );

  const actionAndDecisionItems = useMemo(
    () =>
      subtitles.filter(
        (s) =>
          s.isFinal &&
          (s.layaMetadata?.isDecision ||
            s.layaMetadata?.isActionItem ||
            (s.tags && s.tags.length > 0)),
      ),
    [subtitles],
  );

  return (
    <div className="meeting-shell h-dvh w-full bg-[#0B0E14] text-slate-100 flex flex-col font-sans overflow-hidden select-none">
      {/* ── TOP ERP TELEMETRY & COMMAND HEADER ── */}
      <header className="h-13 shrink-0 px-3 sm:px-5 border-b border-slate-800 bg-[#11161F] flex items-center justify-between gap-2 z-30">
        {/* Left: Room Code + P2P Mesh Telemetry */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-950/80 border border-teal-700/60 text-teal-300 font-mono text-[11px] font-bold tracking-wide">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>P2P MESH · Đã kết nối</span>
          </span>

          <div className="flex items-center gap-1.5 bg-[#0B0E14] border border-slate-800 rounded-md px-2.5 py-1">
            <span className="font-mono text-xs font-bold text-white select-all">
              {session.meetingCode}
            </span>
            <button
              type="button"
              onClick={handleCopyInviteLink}
              title="Sao chép liên kết phòng P2P qua Internet"
              className="text-slate-400 hover:text-teal-300 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-mono pl-1.5 border-l border-slate-800"
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline text-emerald-400">Đã chép link P2P</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Copy Link P2P</span>
                </>
              )}
            </button>
          </div>

          <span className="hidden xl:inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#0B0E14] border border-slate-800 text-[11px] font-mono text-slate-400">
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span>{peers.length + 1} Peers</span>
            <span>•</span>
            <span>STT: {sttEngine.toUpperCase()}</span>
            <span>•</span>
            <span>NMT: {translationEngine.toUpperCase()}</span>
          </span>
        </div>

        {/* Center: ERP Workspace Mode Switcher */}
        <div className="hidden md:flex items-center bg-[#0B0E14] p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setWorkspaceMode('split')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              workspaceMode === 'split'
                ? 'bg-[#0F766E] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>IT Workspace</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceMode('grid')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              workspaceMode === 'grid'
                ? 'bg-[#0F766E] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Video Grid</span>
          </button>
        </div>

        {/* Right: Language Pair Selector + Module Manager Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-[#0B0E14] border border-slate-800 rounded-lg px-2 py-1 text-xs">
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">Nói:</span>
            <select
              aria-label="Ngôn ngữ nói"
              value={spokenLanguage}
              onChange={(e) => setSpokenLanguage(e.target.value as SupportedLanguage)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES_LIST.map((l) => (
                <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                  {l.flag} {l.code.toUpperCase()}
                </option>
              ))}
            </select>
            <span className="text-slate-600">→</span>
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">Nhận:</span>
            <select
              id="meeting-target-language"
              aria-label="Ngôn ngữ nhận phụ đề"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
              className="bg-transparent text-xs font-semibold text-teal-300 focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES_LIST.map((l) => (
                <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                  {l.flag} {l.nativeName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsModuleManagerOpen(true)}
            title="Quản lý & Nâng cấp Module Động"
            className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-700 bg-[#151C28] hover:bg-slate-800 text-xs font-mono font-semibold text-teal-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Modules</span>
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE BODY (STAGE + OPTIONAL SIDECAR) ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <FloatingReactionsOverlay reactions={reactions} />

        {/* Left/Center Main Stage */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 p-2.5 sm:p-4 gap-3 overflow-hidden">
          {workspaceMode === 'grid' ? (
            /* ── MODE A: PURE P2P VIDEO MESH GRID ── */
            <div
              className={`flex-1 grid gap-3 min-h-0 overflow-y-auto ${
                peers.length === 0
                  ? 'grid-cols-1 md:grid-cols-2'
                  : peers.length === 1
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {/* Local Participant Tile */}
              <div
                className={`meeting-video-cell relative rounded-xl border overflow-hidden bg-[#131820] flex flex-col justify-between min-h-[220px] ${
                  isSpeaking
                    ? 'border-teal-400 ring-2 ring-teal-500/30'
                    : 'border-slate-800'
                }`}
              >
                {isCameraOn || isScreenSharing ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-16 h-16 rounded-xl bg-teal-950/80 border border-teal-700/60 flex items-center justify-center text-xl font-bold text-teal-300 font-mono">
                      {(session.displayName || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="mt-2 text-xs font-mono text-slate-400">
                      {isMicOn ? 'ĐANG BẬT MIC (ON-DEVICE STT)' : 'MIC ĐANG TẮT'}
                    </span>
                  </div>
                )}

                <div className="relative z-10 p-2.5 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-700/80 text-[10px] font-mono text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    LOCAL NODE (BẠN)
                  </span>
                  {raisedHand && (
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[11px] font-bold">
                      ✋ Đang giơ tay
                    </span>
                  )}
                </div>

                <div className="relative z-10 p-2.5 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CountryFlag code={spokenLanguage} size="xs" />
                    <span className="text-xs font-semibold text-white">
                      {session.displayName} (Bạn)
                    </span>
                  </div>
                  {isMicOn ? (
                    <Mic
                      className={`w-3.5 h-3.5 ${
                        isSpeaking ? 'text-teal-400 animate-pulse' : 'text-slate-300'
                      }`}
                    />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  )}
                </div>
              </div>

              {/* Remote Peer Tiles */}
              {peers.map((peer) => (
                <RemotePeerVideoTile key={peer.peerId} peer={peer} />
              ))}

              {/* Waiting for Peers Invite Card */}
              {peers.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700 bg-[#11161F]/70 p-6 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-950/60 border border-teal-800 flex items-center justify-center text-teal-400">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h2 className="text-sm font-bold text-white">
                      Phòng họp P2P qua Internet đã sẵn sàng (Không cần Server)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Mở liên kết dưới đây trên một tab khác hoặc gửi cho đồng nghiệp qua Internet để kết nối WebRTC trực tiếp.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0B0E14] border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-teal-300 select-all">
                    <span>
                      {window.location.origin}/meeting/{session.meetingCode}?mode=p2p
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{linkCopied ? 'Đã sao chép liên kết P2P!' : 'Sao chép liên kết mời P2P'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ── MODE B: IT WORKSPACE (COMPACT VIDEO STRIP + LIVE BILINGUAL TERMINAL & ADR LOG) ── */
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
              {/* Left 4 Cols: Compact P2P Nodes + Sprint ADR / Action Tracker */}
              <div className="lg:col-span-4 flex flex-col gap-3 min-h-0 overflow-y-auto">
                {/* Compact Video Strip */}
                <div className="grid grid-cols-2 gap-2 shrink-0">
                  <div
                    className={`meeting-video-cell relative rounded-xl border overflow-hidden bg-[#131820] h-32 flex flex-col justify-between ${
                      isSpeaking ? 'border-teal-400' : 'border-slate-800'
                    }`}
                  >
                    {isCameraOn || isScreenSharing ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-lg bg-teal-950 border border-teal-700/60 flex items-center justify-center text-xs font-mono font-bold text-teal-300">
                          {(session.displayName || 'U').slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                    )}
                    <div className="relative z-10 px-2 py-1 bg-slate-950/85 flex items-center justify-between text-[11px]">
                      <span className="truncate font-semibold text-white">
                        {session.displayName} (Bạn)
                      </span>
                      <span className="font-mono text-[10px] text-teal-400 uppercase">
                        {spokenLanguage}
                      </span>
                    </div>
                  </div>

                  {peers.length === 0 ? (
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className="rounded-xl border border-dashed border-slate-700 bg-[#11161F] h-32 p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:border-teal-600 transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-teal-400" />
                      <span className="text-[11px] font-semibold text-slate-200">
                        Mời Peer P2P
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {linkCopied ? 'Đã chép link!' : session.meetingCode}
                      </span>
                    </button>
                  ) : (
                    peers.map((peer) => (
                      <div key={peer.peerId} className="h-32">
                        <RemotePeerVideoTile peer={peer} />
                      </div>
                    ))
                  )}
                </div>

                {/* IT Sprint Decisions & Action Items Live Board */}
                <div className="flex-1 rounded-xl border border-slate-800 bg-[#11161F] flex flex-col min-h-[160px] overflow-hidden">
                  <div className="px-3.5 py-2.5 border-b border-slate-800 bg-[#0B0E14]/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>ADR &amp; Action Items ({actionAndDecisionItems.length})</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">AUTO-TAGGED</span>
                  </div>
                  <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                    {actionAndDecisionItems.length === 0 ? (
                      <div className="text-xs text-slate-500 font-mono leading-relaxed">
                        Chưa có Quyết định (ADR) hoặc Action Item. Hãy nói hoặc bấm các câu mẫu IT bên dưới để tự động trích xuất.
                      </div>
                    ) : (
                      actionAndDecisionItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg border border-slate-800 bg-[#0B0E14] space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-teal-300">
                              {item.participantName}
                            </span>
                            <div className="flex items-center gap-1">
                              {item.tags?.map((tag) => (
                                <span
                                  key={tag}
                                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                                    tag === 'critical_risk'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : tag === 'decision'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  }`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-slate-100">{item.translatedText}</p>
                          <p className="text-[11px] text-slate-400">{item.originalText}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right 8 Cols: Live Bilingual IT Terminal & Quick Utterance Bar */}
              <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-[#11161F] flex flex-col min-h-0 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-800 bg-[#0B0E14]/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold text-white">
                      Luồng Phụ đề Song ngữ P2P Trực tiếp (Real-time Bilingual Stream)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {subtitles.filter((s) => s.isFinal).length} câu đã dịch
                  </span>
                </div>

                {/* Bilingual Stream Table */}
                <div className="flex-1 p-3.5 space-y-2.5 overflow-y-auto select-text">
                  {subtitles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <p className="text-xs text-slate-400 max-w-md">
                        Hãy nói vào Micro hoặc bấm thử một câu giao tiếp kỹ thuật IT dưới đây để phát phụ đề song ngữ qua P2P DataChannel:
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {quickPhrases.map((phrase, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => void handleSendManualCaption(phrase)}
                            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-[#151C28] hover:border-teal-500/60 hover:bg-slate-800 text-xs text-slate-200 transition-colors cursor-pointer text-left"
                          >
                            “{phrase}”
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    subtitles.map((sub) => (
                      <div
                        key={sub.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          sub.isFinal
                            ? 'border-slate-800 bg-[#0B0E14]'
                            : 'border-teal-700/50 bg-teal-950/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400 mb-1">
                          <div className="flex items-center gap-2">
                            <CountryFlag code={sub.sourceLanguage} size="xs" />
                            <span className="font-bold text-slate-200">
                              {sub.participantName}
                            </span>
                            <span>
                              ({sub.sourceLanguage.toUpperCase()} → {sub.targetLanguage.toUpperCase()})
                            </span>
                            {sub.latencyMs != null && (
                              <span className="text-teal-400">{sub.latencyMs}ms</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {sub.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 text-[10px] uppercase font-bold"
                              >
                                {tag}
                              </span>
                            ))}
                            <span>
                              {new Date(sub.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-white">
                          {sub.translatedText}
                        </div>
                        {showOriginal && sub.originalText !== sub.translatedText && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {sub.originalText}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Bottom Quick Speak / Technical Dictation Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendManualCaption();
                  }}
                  className="p-2.5 border-t border-slate-800 bg-[#0B0E14] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={manualCaptionText}
                    onChange={(e) => setManualCaptionText(e.target.value)}
                    placeholder="Nhập nhanh nội dung phát biểu / thuật ngữ kỹ thuật để dịch & phát P2P..."
                    aria-label="Nhập nhanh phụ đề P2P"
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-[#131820] border border-slate-700 focus:border-teal-500 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!manualCaptionText.trim()}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Phát &amp; Dịch P2P</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Dedicated Docked SubtitleOverlay Band */}
          <SubtitleOverlay
            subtitle={currentSubtitle}
            recentSubtitles={subtitles}
            showOriginal={showOriginal}
            targetLanguage={targetLanguage}
            onTargetLanguageChange={setTargetLanguage}
            onToggleShowOriginal={() => setShowOriginal((prev) => !prev)}
            isCaptionsOn={isCaptionsOn}
            currentUserId={session.participantId}
            currentUserDisplayName={session.displayName}
            localIdentity={session.identity}
          />
        </div>

        {/* Right Docked ERP Sidecar (SubtitlePanel: All / Action Items / AI Recap / P2P Chat) */}
        <SubtitlePanel
          history={subtitles}
          getExportHistory={() => subtitles}
          isOpen={isSidecarOpen}
          onClose={() => setIsSidecarOpen(false)}
          chatMessages={chatMessages}
          onSendChatMessage={handleSendChat}
          currentUserId={session.participantId}
          meetingCode={session.meetingCode}
          initialTab={sidecarTab}
          preferences={sidecarPrefs}
          onPreferencesChange={setSidecarPrefs}
          targetLanguage={targetLanguage}
          onTargetLanguageChange={setTargetLanguage}
          branding={DEFAULT_BRANDING_CONFIG}
        />
      </div>

      {/* ── BOTTOM ERP CONTROL BAR ── */}
      <footer className="meeting-primary-controls h-16 shrink-0 px-3 sm:px-6 border-t border-slate-800 bg-[#11161F] flex items-center justify-between gap-2 z-30">
        {/* Left: Mic & Camera & Screen Share */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMicOn((prev) => !prev)}
            aria-label={isMicOn ? 'Tắt mic' : 'Bật mic'}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              isMicOn
                ? 'bg-[#151C28] border-slate-700 text-white hover:bg-slate-800'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
            }`}
          >
            {isMicOn ? <Mic className="w-4 h-4 text-teal-400" /> : <MicOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{isMicOn ? 'Tắt mic' : 'Bật mic'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCameraOn((prev) => !prev)}
            aria-label={isCameraOn ? 'Tắt cam' : 'Bật cam'}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              isCameraOn
                ? 'bg-[#151C28] border-slate-700 text-white hover:bg-slate-800'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
            }`}
          >
            {isCameraOn ? <Video className="w-4 h-4 text-teal-400" /> : <VideoOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{isCameraOn ? 'Tắt cam' : 'Bật cam'}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleToggleScreenShare()}
            aria-label="Chia sẻ màn hình"
            className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isScreenSharing
                ? 'bg-teal-600 border-teal-500 text-white'
                : 'bg-[#151C28] border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <MonitorUp className="w-4 h-4" />
            <span className="hidden md:inline">
              {isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
            </span>
          </button>
        </div>

        {/* Center: Captions, TTS Dubbing, Raise Hand, Quick Reactions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Phụ đề"
            aria-pressed={isCaptionsOn}
            onClick={() => setIsCaptionsOn((prev) => !prev)}
            className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isCaptionsOn
                ? 'bg-teal-950/80 border-teal-700 text-teal-300'
                : 'bg-[#151C28] border-slate-700 text-slate-400'
            }`}
          >
            <Subtitles className="w-4 h-4" />
            <span className="hidden sm:inline">Phụ đề</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTtsModalOpen(true)}
            className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-700 bg-[#151C28] hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-teal-400" />
            <span className="hidden lg:inline">Thuyết minh TTS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !raisedHand;
              setRaisedHand(next);
              controllerRef.current?.updateLocalState({ raisedHand: next });
            }}
            className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              raisedHand
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-[#151C28] border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Hand className="w-4 h-4" />
            <span className="hidden lg:inline">Giơ tay</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerReaction('👍')}
            title="Thả biểu cảm 👍"
            className="min-h-[42px] px-2.5 py-2 rounded-xl border border-slate-700 bg-[#151C28] hover:bg-slate-800 text-xs cursor-pointer hidden sm:flex items-center gap-1"
          >
            <Smile className="w-4 h-4 text-amber-400" />
          </button>
        </div>

        {/* Right: Sidecar Toggle & Leave Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSidecarTab('chat');
              setIsSidecarOpen((prev) => !prev);
            }}
            className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              isSidecarOpen
                ? 'bg-teal-950/80 border-teal-700 text-teal-300'
                : 'bg-[#151C28] border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden md:inline">Biên bản &amp; Chat</span>
          </button>

          <button
            type="button"
            onClick={handleLeave}
            aria-label="Rời cuộc họp"
            className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Rời</span>
          </button>
        </div>
      </footer>

      {/* Modals */}
      <ModuleManagerModal
        isOpen={isModuleManagerOpen}
        onClose={() => setIsModuleManagerOpen(false)}
      />
      <TTSVoiceDubbingModal
        isOpen={isTtsModalOpen}
        onClose={() => setIsTtsModalOpen(false)}
      />
    </div>
  );
};

export default P2PMeetingRoom;
