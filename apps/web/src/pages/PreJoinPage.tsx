import React, { useState, useEffect, useRef } from 'react';
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Initialize camera preview stream
  useEffect(() => {
    async function startCameraPreview() {
      if (!isCameraOn) {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: isMicOn,
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera preview permission denied or device not found', err);
        setIsCameraOn(false);
      }
    }

    startCameraPreview();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isCameraOn, isMicOn]);

  const handleJoinNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCode) return;
    if (!displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    setLoading(true);
    setError(null);

    const code = meetingCode.trim().toUpperCase();

    // Stop local preview stream before joining LiveKit room
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
      });

      navigate(`/meeting/${joinRes.meetingCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join meeting';
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
                title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsCameraOn((prev) => !prev)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  isCameraOn ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-red-600 text-white'
                }`}
                title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
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
