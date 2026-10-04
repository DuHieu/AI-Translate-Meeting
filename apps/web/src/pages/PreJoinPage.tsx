import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiError, meetingApi } from '../api/meetingApi';
import { meetingStorage } from '../utils/meetingStorage';
import { admissionStorage } from '../utils/admissionStorage';
import {
  AdmissionPendingResponse,
  isAdmissionPending,
  JoinMeetingResponse,
  SupportedLanguage,
  SUPPORTED_LANGUAGES_LIST,
} from '../types/meeting';
import { Video, Mic, MicOff, VideoOff, LogIn, ArrowLeft, BookOpen, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { NeuralLinguisticBackground } from '../components/common/NeuralLinguisticBackground';

interface GlossaryDomainOption {
  id: string;
  name: string;
  desc: string;
}

// Extensible glossary domains matrix for enterprise meetings
const GLOSSARY_DOMAINS: GlossaryDomainOption[] = [
  { id: 'general', name: 'Tổng quát / Đa lĩnh vực (Mặc định)', desc: 'Hội thoại thông thường, họp nội bộ, giao tiếp đa ngành' },
  { id: 'engineering', name: 'Công nghệ thông tin (IT / Tech)', desc: 'Lập trình, hệ thống, kiến trúc hạ tầng phần mềm' },
  { id: 'business', name: 'Kinh doanh & Thương mại', desc: 'Bán hàng, đối tác, đàm phán hợp đồng thương mại' },
  { id: 'finance', name: 'Tài chính & Ngân hàng', desc: 'Kế toán, kiểm toán, ngân sách, báo cáo tài chính' },
  { id: 'manufacturing', name: 'Sản xuất & Chuỗi cung ứng', desc: 'Quy trình nhà máy, QA/QC, xuất nhập khẩu, logistics' },
  { id: 'healthcare', name: 'Y tế & Dược phẩm', desc: 'Thuật ngữ y khoa, nghiên cứu lâm sàng, sức khỏe' },
  { id: 'legal', name: 'Pháp lý & Tuân thủ', desc: 'Điều khoản pháp lý, sở hữu trí tuệ, hợp đồng kinh tế' },
];

export const PreJoinPage: React.FC = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [spokenLanguage, setSpokenLanguage] = useState<SupportedLanguage>('vi');
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('ja');

  const [meetingDomain, setMeetingDomain] = useState<string>(() => {
    return localStorage.getItem('ai-meeting-domain') || 'general';
  });
  const [customKeywords, setCustomKeywords] = useState<string>(() => {
    return localStorage.getItem('ai-meeting-initial-prompt') || '';
  });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState('');
  const [pendingAdmission, setPendingAdmission] = useState<AdmissionPendingResponse | null>(null);
  const [admissionRejected, setAdmissionRejected] = useState(false);

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [previewRetryCount, setPreviewRetryCount] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastLevelUpdateRef = useRef(0);

  // Load available devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setPermissionError('Trình duyệt không hỗ trợ media devices hoặc trang chưa chạy qua localhost/HTTPS.');
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === 'audioinput');
      const cams = devices.filter((d) => d.kind === 'videoinput');
      setAudioDevices(mics);
      setVideoDevices(cams);
      setSelectedAudioId((current) => current || mics[0]?.deviceId || '');
      setSelectedVideoId((current) => current || cams[0]?.deviceId || '');
    } catch (e) {
      console.warn('Failed to enumerate devices', e);
    }
  }, []);

  const buildAudioConstraint = useCallback((): MediaTrackConstraints => ({
    ...(selectedAudioId ? { deviceId: { ideal: selectedAudioId } } : {}),
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true,
  }), [selectedAudioId]);

  const buildVideoConstraint = useCallback((): MediaTrackConstraints => ({
    ...(selectedVideoId ? { deviceId: { ideal: selectedVideoId } } : {}),
    frameRate: { ideal: 24, max: 30 },
  }), [selectedVideoId]);

  const getErrorMessage = (err: unknown) => (
    err instanceof Error ? err.message : 'Không thể mở thiết bị media'
  );

  const getPreviewStream = useCallback(async (): Promise<{
    stream: MediaStream;
    warning: string | null;
  }> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Trình duyệt không hỗ trợ mic/camera trên origin hiện tại. Hãy mở bằng http://127.0.0.1:3000, http://localhost:3000 hoặc HTTPS.');
    }

    const audioConstraint = isMicOn ? buildAudioConstraint() : false;
    const videoConstraint = isCameraOn ? buildVideoConstraint() : false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint,
        video: videoConstraint,
      });
      return { stream, warning: null };
    } catch (combinedError: unknown) {
      if (!isMicOn || !isCameraOn) {
        throw combinedError;
      }

      console.warn('Combined media request failed; retrying devices separately', combinedError);

      const tracks: MediaStreamTrack[] = [];
      const warnings: string[] = [];

      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: false,
        });
        tracks.push(...audioStream.getAudioTracks());
      } catch (audioError: unknown) {
        warnings.push(`Mic: ${getErrorMessage(audioError)}`);
      }

      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraint,
        });
        tracks.push(...videoStream.getVideoTracks());
      } catch (videoError: unknown) {
        warnings.push(`Camera: ${getErrorMessage(videoError)}`);
      }

      if (tracks.length === 0) {
        throw combinedError;
      }

      return {
        stream: new MediaStream(tracks),
        warning: warnings.length > 0 ? warnings.join(' | ') : null,
      };
    }
  }, [isMicOn, isCameraOn, buildAudioConstraint, buildVideoConstraint]);

  const handleGrantPermission = () => setPreviewRetryCount((count) => count + 1);

  // Initialize camera & mic preview stream with audio level meter
  useEffect(() => {
    let isCancelled = false;

    async function startMediaPreview() {
      // Stop old tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setAudioVolume(0);

      if (!isCameraOn && !isMicOn) {
        setPermissionError(null);
        if (videoRef.current) videoRef.current.srcObject = null;
        return;
      }

      try {
        setPermissionError(null);
        const { stream, warning } = await getPreviewStream();
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup audio level meter
        if (isMicOn && stream.getAudioTracks().length > 0) {
          try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
              if (isCancelled) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const now = performance.now();
              if (now - lastLevelUpdateRef.current >= 100) {
                setAudioVolume(Math.min(100, Math.round((avg / 128) * 100)));
                lastLevelUpdateRef.current = now;
              }
              animFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();
          } catch (audioErr) {
            console.warn('Audio analyser setup failed', audioErr);
          }
        }

        await refreshDevices();
        if (!isCancelled && warning) setPermissionError(warning);
      } catch (err: unknown) {
        console.warn('Media preview permission denied or device not found', err);
        setPermissionError(getErrorMessage(err));
      }
    }

    startMediaPreview();

    return () => {
      isCancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isCameraOn, isMicOn, getPreviewStream, refreshDevices, previewRetryCount]);

  const stopPreview = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const completeJoin = useCallback((joinRes: JoinMeetingResponse) => {
    const hostToken = admissionStorage.getHostToken(joinRes.meetingCode);
    admissionStorage.clearPendingToken(joinRes.meetingCode);
    meetingStorage.saveSession({
      meetingCode: joinRes.meetingCode,
      meetingId: joinRes.meetingId,
      participantId: joinRes.participantId,
      identity: joinRes.identity,
      displayName: joinRes.displayName,
      spokenLanguage: joinRes.spokenLanguage,
      targetLanguage: joinRes.targetLanguage,
      liveKitUrl: joinRes.liveKitUrl,
      token: joinRes.token,
      subtitleToken: joinRes.subtitleToken,
      sessionToken: joinRes.sessionToken,
      role: joinRes.role,
      hostToken: joinRes.role === 'host' ? hostToken || undefined : undefined,
      initialMicOn: isMicOn,
      initialCameraOn: isCameraOn,
      audioDeviceId: selectedAudioId || undefined,
      videoDeviceId: selectedVideoId || undefined,
    });
    navigate(`/meeting/${joinRes.meetingCode}`);
  }, [isMicOn, isCameraOn, selectedAudioId, selectedVideoId, navigate]);

  const admissionMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.code === 'admission_token_expired') return 'Invite hoặc yêu cầu tham gia đã hết hạn.';
      if (err.code === 'admission_rejected') return 'Host đã từ chối yêu cầu tham gia.';
      if (err.code === 'admission_wrong_meeting') return 'Invite không thuộc phòng họp này.';
      if (err.code === 'admission_already_used') return 'Invite đã được sử dụng.';
      if (err.code?.startsWith('admission_token')) return 'Invite không hợp lệ hoặc đã hết hạn.';
    }
    return err instanceof Error ? err.message : 'Không thể tham gia phòng họp';
  };

  useEffect(() => {
    if (!meetingCode || !pendingAdmission || admissionRejected) return undefined;

    const timer = window.setInterval(async () => {
      try {
        const result = await meetingApi.joinMeeting(meetingCode, {
          displayName: displayName.trim(),
          spokenLanguage,
          targetLanguage,
          admissionToken: pendingAdmission.admissionToken,
        });
        if (!isAdmissionPending(result)) {
          window.clearInterval(timer);
          completeJoin(result);
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && err.code === 'admission_rejected') {
          window.clearInterval(timer);
          admissionStorage.clearPendingToken(meetingCode);
          setPendingAdmission(null);
          setAdmissionRejected(true);
        }
        setError(admissionMessage(err));
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [
    meetingCode,
    pendingAdmission,
    admissionRejected,
    displayName,
    spokenLanguage,
    targetLanguage,
    completeJoin,
  ]);

  const handleJoinNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCode) return;
    if (!displayName.trim()) {
      setError('Vui lòng nhập tên hiển thị của bạn.');
      return;
    }

    setLoading(true);
    setError(null);

    const code = meetingCode.trim().toUpperCase();

    try {
      const credential = admissionStorage.getHostToken(code) || inviteToken.trim() || undefined;
      const result = await meetingApi.joinMeeting(code, {
        displayName: displayName.trim(),
        spokenLanguage,
        targetLanguage,
        admissionToken: credential,
      });

      stopPreview();
      if (isAdmissionPending(result)) {
        admissionStorage.savePendingToken(code, result.admissionToken);
        setPendingAdmission(result);
        setAdmissionRejected(false);
      } else {
        completeJoin(result);
      }
    } catch (err: unknown) {
      setError(admissionMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-100/90 dark:bg-[#070709] text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 transition-colors overflow-hidden">
      {/* ── Interactive Neural Linguistic Synapse Network (Mouse reactive) ── */}
      <NeuralLinguisticBackground />

      {/* ── Atmospheric Ambient Depth Light ──────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[650px] bg-blue-500/10 dark:bg-blue-600/20 rounded-full blur-[140px]" />
        <div className="absolute -top-40 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[120px]" />
      </div>

      {/* ── Elevated High-Contrast Modal Card ────────────────────── */}
      <div className="relative z-10 max-w-4xl w-full bg-white dark:bg-[#16161a] border border-zinc-200/90 dark:border-[#2e2e38] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.16),0_0_20px_rgba(0,0,0,0.04)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_45px_rgba(37,99,235,0.12)] ring-1 ring-zinc-950/5 dark:ring-white/10 transition-colors overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3.5 md:px-6 md:py-4 bg-zinc-50/90 dark:bg-[#1a1a1e]/90 border-b border-zinc-200 dark:border-[#2a2a30]">
          <div className="flex items-center gap-3">
            <LayaMeetLogo size="sm" showWordmark={false} />
            <div>
              <h1 className="text-sm font-bold text-zinc-900 dark:text-white leading-none">Chuẩn bị tham gia</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                <span>Phòng họp:</span>
                <span className="font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 px-1.5 py-0.2 rounded text-[11px] font-bold uppercase tracking-wider">
                  {meetingCode?.toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-[#3a3a40] bg-white hover:bg-zinc-100 dark:bg-[#202024] dark:hover:bg-[#28282e] text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </button>
          </div>
        </div>

        {/* ── Status Banners ───────────────────────────────────────── */}
        {error && (
          <div role="alert" className="mx-4 md:mx-6 mt-4 p-3 rounded-lg bg-red-950/50 border border-red-900/50 text-red-400 text-xs">
            {error}
          </div>
        )}
        {pendingAdmission && (
          <div role="status" aria-live="polite" className="mx-4 md:mx-6 mt-4 p-3 rounded-lg bg-amber-950/40 border border-amber-900/50 text-amber-300 text-xs">
            <span className="font-medium">Đang chờ host phê duyệt —</span>{' '}
            Trang sẽ tự động tiếp tục khi được chấp nhận.
          </div>
        )}
        {admissionRejected && (
          <div role="alert" className="mx-4 md:mx-6 mt-4 p-3 rounded-lg bg-red-950/50 border border-red-900/50 text-red-400 text-xs">
            Host đã từ chối yêu cầu tham gia. Vui lòng quay lại trang chủ hoặc thử lại.
          </div>
        )}

        {/* ── Main Two-Column Layout ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 p-4 md:p-6 gap-5 md:gap-6">

          {/* Left col: Camera preview + device info */}
          <div className="md:col-span-7 space-y-3">

            {/* Camera preview */}
            <div className="aspect-video bg-[#111112] rounded-xl border border-[#2e2e30] overflow-hidden relative flex items-center justify-center">
              {isCameraOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-zinc-600">
                  <VideoOff className="w-10 h-10 stroke-[1.5]" />
                  <span className="text-xs">Camera đang tắt</span>
                </div>
              )}

              {/* Mic / Camera toggle overlay */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#0f0f10]/90 px-3 py-2 rounded-lg border border-[#2e2e30]">
                <button
                  type="button"
                  onClick={() => setIsMicOn((prev) => !prev)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    isMicOn
                      ? 'bg-[#222224] text-zinc-300 hover:bg-[#2a2a2c]'
                      : 'bg-red-600 text-white hover:bg-red-500'
                  }`}
                  aria-label={isMicOn ? 'Tắt microphone' : 'Bật microphone'}
                >
                  {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCameraOn((prev) => !prev)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    isCameraOn
                      ? 'bg-[#222224] text-zinc-300 hover:bg-[#2a2a2c]'
                      : 'bg-red-600 text-white hover:bg-red-500'
                  }`}
                  aria-label={isCameraOn ? 'Tắt camera' : 'Bật camera'}
                >
                  {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Device & mic check panel */}
            <div className="bg-zinc-50/80 dark:bg-[#0e0e11] rounded-xl border border-zinc-200 dark:border-[#28282e] p-4 space-y-3 transition-colors shadow-2xs">
              {permissionError && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
                  <span className="truncate">Chưa cấp quyền: {permissionError}</span>
                  <button
                    type="button"
                    onClick={handleGrantPermission}
                    className="shrink-0 px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cấp quyền
                  </button>
                </div>
              )}

              {/* Mic level meter */}
              <div className="flex items-center gap-3">
                <Mic className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-500 shrink-0" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400 shrink-0 w-20">Kiểm tra mic</span>
                <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-[#252528] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75 rounded-full"
                    style={{ width: `${isMicOn ? audioVolume : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono w-7 text-right shrink-0">
                  {isMicOn ? `${audioVolume}%` : '—'}
                </span>
              </div>

              {/* Device selects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Microphone</label>
                  <select
                    value={selectedAudioId}
                    onChange={(e) => setSelectedAudioId(e.target.value)}
                    className="w-full bg-white dark:bg-[#18181c] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-zinc-100 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition shadow-2xs"
                  >
                    {audioDevices.length > 0 ? (
                      audioDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Microphone (${d.deviceId.slice(0, 5)})`}
                        </option>
                      ))
                    ) : (
                      <option value="">Microphone mặc định</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">Camera</label>
                  <select
                    value={selectedVideoId}
                    onChange={(e) => setSelectedVideoId(e.target.value)}
                    className="w-full bg-white dark:bg-[#18181c] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-zinc-100 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition shadow-2xs"
                  >
                    {videoDevices.length > 0 ? (
                      videoDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Camera (${d.deviceId.slice(0, 5)})`}
                        </option>
                      ))
                    ) : (
                      <option value="">Camera mặc định</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right col: Form */}
          <form
            onSubmit={handleJoinNow}
            className="md:col-span-5 flex flex-col gap-4 md:border-l md:border-zinc-200 md:dark:border-[#2a2a30] md:pl-6"
          >
            {/* Display name */}
            <div>
              <label htmlFor="display-name" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Tên hiển thị
              </label>
              <input
                id="display-name"
                type="text"
                placeholder="Nhập họ và tên của bạn"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-white dark:bg-[#18181c] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder-zinc-400 dark:placeholder-zinc-500 shadow-2xs font-medium"
                required
              />
            </div>

            {/* Language pair */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="spoken-lang" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Ngôn ngữ bạn nói
                </label>
                <select
                  id="spoken-lang"
                  value={spokenLanguage}
                  onChange={(e) => setSpokenLanguage(e.target.value as SupportedLanguage)}
                  className="w-full bg-white dark:bg-[#18181c] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-zinc-100 text-xs rounded-lg px-2.5 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-2xs font-medium"
                >
                  {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="target-lang" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Xem phụ đề bằng
                </label>
                <select
                  id="target-lang"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
                  className="w-full bg-white dark:bg-[#18181c] border border-zinc-300 dark:border-[#323238] text-zinc-900 dark:text-zinc-100 text-xs rounded-lg px-2.5 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-2xs font-medium"
                >
                  {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Collapsible Domain glossary (Advanced options) */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer select-none py-1"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                <span>Tùy chọn nâng cao (Từ điển chuyên ngành)</span>
                {showAdvancedSettings ? (
                  <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </button>

              {showAdvancedSettings && (
                <div className="mt-2.5 p-3.5 rounded-lg bg-zinc-100/60 dark:bg-[#151516] border border-zinc-200/80 dark:border-[#2a2a2c] space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      <label htmlFor="glossary-domain">Lĩnh vực thuật ngữ cuộc họp:</label>
                    </div>
                    <select
                      id="glossary-domain"
                      value={meetingDomain}
                      onChange={(e) => {
                        const newDomain = e.target.value;
                        setMeetingDomain(newDomain);
                        localStorage.setItem('ai-meeting-domain', newDomain);
                      }}
                      className="w-full bg-white dark:bg-[#1a1a1b] border border-zinc-300 dark:border-[#3a3a3d] text-zinc-900 dark:text-zinc-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition shadow-xs"
                    >
                      {GLOSSARY_DOMAINS.map((domain) => (
                        <option key={domain.id} value={domain.id}>
                          {domain.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      {GLOSSARY_DOMAINS.find((d) => d.id === meetingDomain)?.desc || ''}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="custom-keywords" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Từ khóa chuyên ngành bổ trợ (Tùy chọn):
                    </label>
                    <input
                      id="custom-keywords"
                      type="text"
                      value={customKeywords}
                      onChange={(e) => {
                        setCustomKeywords(e.target.value);
                        localStorage.setItem('ai-meeting-initial-prompt', e.target.value);
                      }}
                      placeholder="Ví dụ: SLA, KPI, Opex, Capex (phân cách bằng dấu phẩy)..."
                      className="w-full bg-white dark:bg-[#1a1a1b] border border-zinc-300 dark:border-[#3a3a3d] text-zinc-900 dark:text-zinc-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition placeholder-zinc-400 dark:placeholder-zinc-600 shadow-xs"
                    />
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                      Cung cấp thêm từ viết tắt hoặc thuật ngữ riêng của dự án để AI nhận dạng chính xác hơn.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Invite token */}
            {!meetingCode || !admissionStorage.getHostToken(meetingCode) ? (
              <div>
                <label htmlFor="invite-token" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Invite token{' '}
                  <span className="text-zinc-400 dark:text-zinc-500 font-normal">(nếu có)</span>
                </label>
                <textarea
                  id="invite-token"
                  value={inviteToken}
                  onChange={(event) => setInviteToken(event.target.value.trim())}
                  placeholder="Dán invite token do host cung cấp. Để trống để gửi yêu cầu chờ duyệt."
                  rows={2}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full resize-none bg-white dark:bg-[#16161a] border border-zinc-300/90 dark:border-[#32323a] text-zinc-900 dark:text-zinc-100 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 font-mono placeholder-zinc-400 dark:placeholder-zinc-600 transition shadow-2xs"
                />
              </div>
            ) : null}

            {/* CTA — grows to bottom */}
            <div className="mt-auto pt-2">
              <button
                type="submit"
                disabled={loading || Boolean(pendingAdmission)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:cursor-not-allowed"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {pendingAdmission ? 'Đang chờ duyệt...' : loading ? 'Đang tham gia...' : 'Tham gia ngay'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
