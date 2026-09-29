import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { meetingApi } from '../api/meetingApi';
import { meetingStorage } from '../utils/meetingStorage';
import { SupportedLanguage } from '../types/meeting';
import { Video, Mic, MicOff, VideoOff, LogIn, ArrowLeft, Sparkles } from 'lucide-react';

export const PreJoinPage: React.FC = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [spokenLanguage, setSpokenLanguage] = useState<SupportedLanguage>('vi');
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('ja');

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Clean up local preview stream before joining LiveKit room
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const joinRes = await meetingApi.joinMeeting(code, {
        displayName: displayName.trim(),
        spokenLanguage,
        targetLanguage,
      });

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
        initialMicOn: isMicOn,
        initialCameraOn: isCameraOn,
        audioDeviceId: selectedAudioId || undefined,
        videoDeviceId: selectedVideoId || undefined,
      });

      navigate(`/meeting/${joinRes.meetingCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tham gia phòng họp';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Ready to join? <Sparkles className="w-4 h-4 text-sky-400" />
              </h2>
              <p className="text-xs text-slate-400">
                Meeting Code: <span className="font-mono text-sky-400 font-bold uppercase">{meetingCode?.toUpperCase()}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left: Real Camera Preview Box */}
          <div className="md:col-span-7 aspect-video bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative flex items-center justify-center shadow-inner">
            {isCameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
                <VideoOff className="w-12 h-12 stroke-[1.5]" />
                <span className="text-xs font-medium">Camera is off</span>
              </div>
            )}

            {/* In-Preview Camera & Mic Control Buttons */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800 shadow-xl">
              <button
                type="button"
                onClick={() => setIsMicOn((prev) => !prev)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  isMicOn ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-red-600 text-white'
                }`}
                title={isMicOn ? 'Tắt microphone' : 'Bật microphone'}
              >
                {isMicOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsCameraOn((prev) => !prev)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  isCameraOn ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-red-600 text-white'
                }`}
                title={isCameraOn ? 'Tắt camera' : 'Bật camera'}
              >
                {isCameraOn ? <Video className="w-4 h-4 text-sky-400" /> : <VideoOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Device Selection & Mic Volume Indicator Bar */}
          <div className="md:col-span-7 space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            {permissionError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                <span>Trình duyệt chưa cấp quyền Camera/Mic: {permissionError}</span>
                <button
                  type="button"
                  onClick={handleGrantPermission}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold"
                >
                  Cấp quyền
                </button>
              </div>
            )}

            {/* Live Audio Level Meter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-[90px]">
                <Mic className="w-3.5 h-3.5 text-sky-400" />
                <span>Kiểm tra mic:</span>
              </div>
              <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75 rounded-full"
                  style={{ width: `${isMicOn ? audioVolume : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-mono w-8 text-right">
                {isMicOn ? `${audioVolume}%` : 'Tắt'}
              </span>
            </div>

            {/* Device Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Thiết bị Microphone</label>
                <select
                  value={selectedAudioId}
                  onChange={(e) => setSelectedAudioId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-2 outline-none focus:ring-1 focus:ring-sky-500 truncate"
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
                <label className="block text-[11px] text-slate-400 mb-1">Thiết bị Camera</label>
                <select
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-2 outline-none focus:ring-1 focus:ring-sky-500 truncate"
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

          {/* Right: User Info & Language Preferences */}
          <form onSubmit={handleJoinNow} className="md:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Your Display Name</label>
              <input
                type="text"
                placeholder="e.g. Hieu / Tanaka"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-xl p-3 focus:ring-2 focus:ring-sky-500 outline-none transition"
                required
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">I Speak</label>
                <select
                  value={spokenLanguage}
                  onChange={(e) => setSpokenLanguage(e.target.value as SupportedLanguage)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="vi">Vietnamese (vi)</option>
                  <option value="en">English (en)</option>
                  <option value="ja">Japanese (ja)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Translate To</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="ja">Japanese (ja)</option>
                  <option value="vi">Vietnamese (vi)</option>
                  <option value="en">English (en)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 disabled:opacity-50 text-base"
            >
              <LogIn className="w-5 h-5" />
              <span>{loading ? 'Joining...' : 'Join Now'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
