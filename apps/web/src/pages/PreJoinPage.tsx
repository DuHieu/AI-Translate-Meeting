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
import { Video, Mic, MicOff, VideoOff, LogIn, ArrowLeft, BookOpen, Code2, Briefcase, Globe } from 'lucide-react';

export const PreJoinPage: React.FC = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [spokenLanguage, setSpokenLanguage] = useState<SupportedLanguage>('vi');
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('ja');

  const [meetingDomain, setMeetingDomain] = useState<string>(() => {
    return localStorage.getItem('ai-meeting-domain') || 'engineering';
  });
  const [customKeywords, setCustomKeywords] = useState<string>(() => {
    return localStorage.getItem('ai-meeting-initial-prompt') || 'PR, Git, Docker, Kubernetes, Refactor, 仕様書, 単体テスト';
  });

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
    <div className="min-h-screen bg-[#0f0f10] text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-[#1a1a1b] border border-[#3a3a3d] rounded-xl shadow-sm">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e2e30]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100 leading-none">Chuẩn bị tham gia</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Phòng họp:{' '}
                <span className="font-mono text-zinc-300 font-medium uppercase">
                  {meetingCode?.toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-3 py-1.5 rounded-lg border border-[#3a3a3d] bg-transparent hover:bg-[#2a2a2c] text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </button>
        </div>

        {/* ── Status Banners ───────────────────────────────────────── */}
        {error && (
          <div role="alert" className="mx-6 mt-4 p-3 rounded-lg bg-red-950/50 border border-red-900/50 text-red-400 text-xs">
            {error}
          </div>
        )}
        {pendingAdmission && (
          <div role="status" aria-live="polite" className="mx-6 mt-4 p-3 rounded-lg bg-amber-950/40 border border-amber-900/50 text-amber-300 text-xs">
            <span className="font-medium">Đang chờ host phê duyệt —</span>{' '}
            Trang sẽ tự động tiếp tục khi được chấp nhận.
          </div>
        )}
        {admissionRejected && (
          <div role="alert" className="mx-6 mt-4 p-3 rounded-lg bg-red-950/50 border border-red-900/50 text-red-400 text-xs">
            Host đã từ chối yêu cầu tham gia. Vui lòng quay lại trang chủ hoặc thử lại.
          </div>
        )}

        {/* ── Main Two-Column Layout ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 p-6 gap-6">

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
            <div className="bg-[#111112] rounded-xl border border-[#2e2e30] p-4 space-y-3">
              {permissionError && (
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-900/50 text-amber-300 text-xs flex items-center justify-between gap-2">
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
                <Mic className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <span className="text-xs text-zinc-500 shrink-0 w-20">Kiểm tra mic</span>
                <div className="flex-1 h-1.5 bg-[#2a2a2c] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-75 rounded-full"
                    style={{ width: `${isMicOn ? audioVolume : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-600 font-mono w-7 text-right shrink-0">
                  {isMicOn ? `${audioVolume}%` : '—'}
                </span>
              </div>

              {/* Device selects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Microphone</label>
                  <select
                    value={selectedAudioId}
                    onChange={(e) => setSelectedAudioId(e.target.value)}
                    className="w-full bg-[#1a1a1b] border border-[#3a3a3d] text-zinc-300 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
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
                  <label className="block text-[11px] text-zinc-500 mb-1">Camera</label>
                  <select
                    value={selectedVideoId}
                    onChange={(e) => setSelectedVideoId(e.target.value)}
                    className="w-full bg-[#1a1a1b] border border-[#3a3a3d] text-zinc-300 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
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
            className="md:col-span-5 flex flex-col gap-4 md:border-l md:border-[#2e2e30] md:pl-6"
          >
            {/* Display name */}
            <div>
              <label htmlFor="display-name" className="block text-xs font-medium text-zinc-400 mb-1.5">
                Tên hiển thị
              </label>
              <input
                id="display-name"
                type="text"
                placeholder="e.g. Hieu / Tanaka"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#111112] border border-[#3a3a3d] text-zinc-100 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition placeholder-zinc-600"
                required
              />
            </div>

            {/* Language pair */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="spoken-lang" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Ngôn ngữ nói
                </label>
                <select
                  id="spoken-lang"
                  value={spokenLanguage}
                  onChange={(e) => setSpokenLanguage(e.target.value as SupportedLanguage)}
                  className="w-full bg-[#111112] border border-[#3a3a3d] text-zinc-200 text-xs rounded-lg px-2.5 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                >
                  {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="target-lang" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Dịch sang
                </label>
                <select
                  id="target-lang"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
                  className="w-full bg-[#111112] border border-[#3a3a3d] text-zinc-200 text-xs rounded-lg px-2.5 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                >
                  {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Domain glossary */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-400">Từ điển chuyên ngành</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[
                  { id: 'engineering', label: 'IT / Kỹ thuật', icon: Code2 },
                  { id: 'business', label: 'Kinh doanh', icon: Briefcase },
                  { id: 'general', label: 'Tổng quát', icon: Globe },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = meetingDomain === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMeetingDomain(item.id);
                        localStorage.setItem('ai-meeting-domain', item.id);
                        if (item.id === 'engineering' && !customKeywords) {
                          const kw = 'PR, Git, Docker, Kubernetes, Refactor, 仕様書, 単体テスト';
                          setCustomKeywords(kw);
                          localStorage.setItem('ai-meeting-initial-prompt', kw);
                        }
                      }}
                      className={`p-2 rounded-lg text-[11px] font-medium flex flex-col items-center gap-1.5 border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500/40 text-blue-400'
                          : 'bg-[#111112] border-[#2e2e30] text-zinc-500 hover:text-zinc-300 hover:border-[#3a3a3d]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={customKeywords}
                onChange={(e) => {
                  setCustomKeywords(e.target.value);
                  localStorage.setItem('ai-meeting-initial-prompt', e.target.value);
                }}
                placeholder="e.g. PR, Docker, Kubernetes, 仕様書..."
                className="w-full bg-[#111112] border border-[#2e2e30] text-zinc-300 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition placeholder-zinc-600"
              />
            </div>

            {/* Invite token */}
            {!meetingCode || !admissionStorage.getHostToken(meetingCode) ? (
              <div>
                <label htmlFor="invite-token" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Invite token{' '}
                  <span className="text-zinc-600 font-normal">(nếu có)</span>
                </label>
                <textarea
                  id="invite-token"
                  value={inviteToken}
                  onChange={(event) => setInviteToken(event.target.value.trim())}
                  placeholder="Dán invite token do host cung cấp. Để trống để gửi yêu cầu chờ duyệt."
                  rows={2}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full resize-none bg-[#111112] border border-[#2e2e30] text-zinc-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 font-mono placeholder-zinc-600 transition"
                />
              </div>
            ) : null}

            {/* CTA — grows to bottom */}
            <div className="mt-auto">
              <button
                type="submit"
                disabled={loading || Boolean(pendingAdmission)}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer disabled:cursor-not-allowed"
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
