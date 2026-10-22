import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Plus,
  Calendar,
  Layers,
  Clock,
  Settings,
  Volume2,
  Shield,
  ArrowRight,
  User,
  Mic,
  Sparkles,
  Lock,
} from 'lucide-react';
import { meetingApi } from '../../api/meetingApi';
import { LayaMeetLogo } from '../common/LayaMeetLogo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { ThemeToggle } from '../common/ThemeToggle';
import { TTSVoiceDubbingModal } from '../meeting/TTSVoiceDubbingModal';
import { setDesktopWindowMode } from '../../utils/desktopBridge';

export const DesktopHomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showTtsModal, setShowTtsModal] = useState(false);
  const [meetingCodeInput, setMeetingCodeInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState(() => {
    return localStorage.getItem('layameet-desktop-display-name') || 'Bạn';
  });
  const [recentRooms, setRecentRooms] = useState<{ code: string; title?: string; joinedAt: string }[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Live Microphone Level State
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('layameet-desktop-recent-rooms');
      if (saved) {
        setRecentRooms(JSON.parse(saved).slice(0, 5));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecentRoom = (code: string) => {
    try {
      const existing = recentRooms.filter((r) => r.code !== code);
      const updated = [{ code, joinedAt: new Date().toLocaleTimeString() }, ...existing].slice(0, 5);
      setRecentRooms(updated);
      localStorage.setItem('layameet-desktop-recent-rooms', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleCreateMeeting = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      localStorage.setItem('layameet-desktop-display-name', displayNameInput);
      const res = await meetingApi.createMeeting();
      if (res && res.meetingCode) {
        saveRecentRoom(res.meetingCode);
        navigate(`/meeting/${res.meetingCode}`);
      }
    } catch (err) {
      console.error('Failed to create meeting', err);
      const fallbackCode = `MEET-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      saveRecentRoom(fallbackCode);
      navigate(`/meeting/${fallbackCode}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = meetingCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setJoinError('Vui lòng nhập mã phòng họp');
      return;
    }
    localStorage.setItem('layameet-desktop-display-name', displayNameInput);
    saveRecentRoom(cleanCode);
    navigate(`/meeting/${cleanCode}`);
  };

  const toggleMicTest = async () => {
    if (isMicTesting) {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close();
      setIsMicTesting(false);
      setMicVolume(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      setIsMicTesting(true);

      const loop = () => {
        if (!mediaStreamRef.current?.active) return;
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setIsMicTesting(false);
    }
  };

  const handleActivateFloatingOverlay = async () => {
    await setDesktopWindowMode('mini');
    navigate('/features');
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans select-none relative overflow-x-hidden selection:bg-sky-500/30 selection:text-sky-200">
      {/* ── AMBIENT BACKGROUND GLOW (Matching Landing Page Style) ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.18)_0%,rgba(99,102,241,0.12)_40%,transparent_70%)] blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* ── TOP DESKTOP APP HEADER ───────────────────────────────── */}
      <header className="h-16 border-b border-white/[0.08] px-6 lg:px-8 flex items-center justify-between bg-[#0B0F19]/80 backdrop-blur-xl shrink-0 z-20 shadow-lg shadow-black/20">
        <div className="flex items-center gap-4">
          <LayaMeetLogo size="md" />
          <span className="hidden sm:inline-flex text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/25 uppercase">
            Desktop Pro Companion
          </span>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">WASAPI Engine</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">&lt;150ms Local STT</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTtsModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Cài đặt Thuyết minh giọng nói AI (Voice Dubbing)"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Thuyết Minh AI</span>
          </button>
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10"
            title="Cài đặt âm thanh & thiết bị"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE ───────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 sm:p-10 flex flex-col justify-center gap-8 z-10">
        {/* Welcome Headline */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold uppercase tracking-wider text-sky-400 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Phòng Họp Thông Minh Song Ngữ</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Trung Tâm Điều Khiển <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">LayaMeet AI</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Họp song ngữ trực tiếp với phụ đề thời gian thực trên Zoom, Microsoft Teams & Google Meet. Âm thanh xử lý 100% RAM-Only.
          </p>
        </div>

        {/* ── PRIMARY HERO ACTIONS (New Meeting & Join Meeting) ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Action 1: New Meeting Instant Card */}
          <div className="lg:col-span-7 p-7 sm:p-8 rounded-3xl bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.01] border border-white/[0.12] backdrop-blur-2xl shadow-2xl flex flex-col justify-between gap-6 relative overflow-hidden group">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/25 text-xs font-bold uppercase tracking-wider">
                <Video className="w-3.5 h-3.5" />
                <span>Bắt Đầu Tức Thì</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Tạo Cuộc Họp Mới
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
                Khởi tạo phòng họp video song ngữ chuẩn LiveKit Media Server với phụ đề AI, phiên dịch tai nghe hai chiều và tự động ghi biên bản họp.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleCreateMeeting}
                disabled={isCreating}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <Video className="w-5 h-5" />
                <span>{isCreating ? 'Đang khởi tạo...' : 'Tạo Cuộc Họp Ngay'}</span>
              </button>

              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Mã hóa E2EE · Không giới hạn thời gian
              </span>
            </div>
          </div>

          {/* Action 2: Join by Meeting Code Card */}
          <div className="lg:col-span-5 p-7 sm:p-8 rounded-3xl bg-[#0B0F19]/80 border border-white/[0.1] backdrop-blur-2xl shadow-2xl flex flex-col justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.08] text-xs font-bold uppercase tracking-wider mb-3">
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>Tham Gia Nhanh</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Vào Phòng Đang Họp
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Nhập mã cuộc họp được chia sẻ bởi đồng nghiệp hoặc đối tác.
              </p>
            </div>

            <form onSubmit={handleJoinMeeting} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={meetingCodeInput}
                  onChange={(e) => {
                    setMeetingCodeInput(e.target.value);
                    setJoinError(null);
                  }}
                  placeholder="Mã phòng (Ví dụ: MEET-ABC-XYZ)"
                  className="w-full bg-black/40 border border-white/10 focus:border-sky-500 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none transition-colors"
                />
                {joinError && <div className="text-xs text-rose-400 mt-1">{joinError}</div>}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    placeholder="Tên của bạn..."
                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10 shrink-0"
                >
                  <span>Vào Phòng</span>
                  <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── 3 COMPANION BENTO CARDS ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tool 1: Always-On-Top Floating Subtitles */}
          <div
            onClick={handleActivateFloatingOverlay}
            className="p-6 rounded-2xl bg-[#0B0F19]/60 border border-white/[0.08] hover:border-sky-500/40 backdrop-blur-xl transition-all hover:-translate-y-1 shadow-lg cursor-pointer flex flex-col justify-between gap-4 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30 uppercase tracking-wide">
                Always-On-Top
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                Thanh Phụ Đề Nổi Trong Suốt
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ghim đè trực tiếp lên Zoom, Teams hoặc Google Meet. Chuột xuyên qua (Click-Through) mà không che khuất tài liệu.
              </p>
            </div>
          </div>

          {/* Tool 2: AI Voice Dubbing Cabin */}
          <div
            onClick={() => setShowTtsModal(true)}
            className="p-6 rounded-2xl bg-[#0B0F19]/60 border border-white/[0.08] hover:border-emerald-500/40 backdrop-blur-xl transition-all hover:-translate-y-1 shadow-lg cursor-pointer flex flex-col justify-between gap-4 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Volume2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                Audio Booth
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Cabin Thuyết Minh Giọng Nói AI
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Lắng nghe đối tác nước ngoài nói tiếng mẹ đẻ qua giọng lồng tiếng AI truyền cảm (Edge TTS & ElevenLabs).
              </p>
            </div>
          </div>

          {/* Tool 3: Calendar & Schedule Hub */}
          <div
            onClick={() => navigate('/calendar')}
            className="p-6 rounded-2xl bg-[#0B0F19]/60 border border-white/[0.08] hover:border-indigo-500/40 backdrop-blur-xl transition-all hover:-translate-y-1 shadow-lg cursor-pointer flex flex-col justify-between gap-4 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase tracking-wide">
                Agenda
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                Lên Lịch & Biên Bản Họp
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Quản lý lịch họp sắp diễn ra, tạo thư mời và xem lại bản tổng hợp Action Items đã được Laya AI phân tích.
              </p>
            </div>
          </div>
        </div>

        {/* ── DIAGNOSTICS & RECENT MEETINGS ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Live Microphone Meter */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0B0F19]/60 border border-white/[0.08] backdrop-blur-xl shadow-xl flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 font-bold">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Kiểm Tra Micro Thực Tế</div>
                  <div className="text-[11px] text-slate-400">Kiểm tra âm lượng trước khi vào họp</div>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleMicTest}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isMicTesting
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : 'bg-white/[0.05] hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                {isMicTesting ? 'Dừng kiểm tra' : 'Thử micro'}
              </button>
            </div>

            {/* Equalizer Visualizer Bars */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center gap-2 justify-between">
              {[...Array(16)].map((_, i) => {
                const threshold = (i + 1) * 6;
                const isActive = isMicTesting && micVolume >= threshold;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-75 ${
                      isActive
                        ? i > 12
                          ? 'bg-rose-500 h-8 shadow-sm shadow-rose-500/50'
                          : i > 8
                          ? 'bg-amber-400 h-6'
                          : 'bg-emerald-400 h-5 shadow-sm shadow-emerald-400/50'
                        : 'bg-white/10 h-2'
                    }`}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Shield className="w-3.5 h-3.5" />
                100% RAM-Only Audio
              </span>
              <span>Độ nhạy VAD: Tự động</span>
            </div>
          </div>

          {/* Right: Recent Meeting History List */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0B0F19]/60 border border-white/[0.08] backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Cuộc họp gần đây
              </span>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold transition-colors cursor-pointer"
              >
                Xem tất cả
              </button>
            </div>

            {recentRooms.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Chưa có cuộc họp nào gần đây. Hãy bấm &quot;Tạo Cuộc Họp Ngay&quot; để bắt đầu!
              </div>
            ) : (
              <div className="space-y-2">
                {recentRooms.map((room, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs border border-sky-500/20">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white tracking-wide">{room.code}</div>
                        <div className="text-[11px] text-slate-400">Đã tham gia lúc {room.joinedAt}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/meeting/${room.code}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>Vào lại</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── JOIN MEETING DIALOG MODAL ─────────────────────────────── */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0B0F19] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold text-white mb-1">Tham Gia Cuộc Họp</h2>
            <p className="text-xs text-slate-400 mb-5">Nhập mã phòng được chia sẻ bởi đồng nghiệp hoặc đối tác.</p>

            <form onSubmit={handleJoinMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mã Cuộc Họp (Meeting Code)</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={meetingCodeInput}
                  onChange={(e) => {
                    setMeetingCodeInput(e.target.value);
                    setJoinError(null);
                  }}
                  placeholder="Ví dụ: MEET-ABC-XYZ"
                  className="w-full bg-black/50 border border-white/15 focus:border-sky-500 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none transition-colors"
                />
                {joinError && <div className="text-xs text-rose-400 mt-1">{joinError}</div>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tên Của Bạn</label>
                <input
                  type="text"
                  required
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Nhập tên của bạn..."
                  className="w-full bg-black/50 border border-white/15 focus:border-sky-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Vào Phòng</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TTS Voice Dubbing Modal */}
      <TTSVoiceDubbingModal
        isOpen={showTtsModal}
        onClose={() => setShowTtsModal(false)}
      />
    </div>
  );
};
