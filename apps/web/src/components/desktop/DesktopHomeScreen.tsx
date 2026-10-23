import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Calendar,
  Layers,
  Clock,
  Settings,
  Volume2,
  ShieldCheck,
  ArrowRight,
  User,
  Mic,
  Cpu,
  Radio,
  ExternalLink,
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
        setRecentRooms(JSON.parse(saved).slice(0, 6));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecentRoom = (code: string) => {
    try {
      const existing = recentRooms.filter((r) => r.code !== code);
      const updated = [{ code, joinedAt: new Date().toLocaleTimeString() }, ...existing].slice(0, 6);
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
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0D0E11] text-zinc-900 dark:text-[#F3F4F6] flex font-sans select-none">
      {/* ── LEFT NATIVE SIDEBAR (md+) ────────────────────────────── */}
      <aside className="hidden md:flex w-60 border-r border-zinc-200 dark:border-[#1E2025] bg-zinc-100/70 dark:bg-[#111317] flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="px-2 pt-1 flex items-center justify-between">
            <LayaMeetLogo size="sm" />
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-[#1B1E25] text-zinc-600 dark:text-zinc-400">
              v2.4
            </span>
          </div>

          {/* Primary Navigation */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Không gian làm việc
            </div>
            <button
              type="button"
              className="w-full px-2.5 py-2 rounded-md bg-zinc-200/80 dark:bg-[#1B1E25] text-zinc-950 dark:text-white text-xs font-semibold flex items-center gap-2.5 cursor-pointer text-left"
            >
              <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Điều khiển phiên họp</span>
            </button>

            <button
              type="button"
              onClick={handleActivateFloatingOverlay}
              className="w-full px-2.5 py-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-[#161920] text-xs font-medium flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 shrink-0" />
                <span>Thanh phụ đề nổi</span>
              </span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>

            <button
              type="button"
              onClick={() => setShowTtsModal(true)}
              className="w-full px-2.5 py-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-[#161920] text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <Volume2 className="w-4 h-4 shrink-0" />
              <span>Cabin thuyết minh AI</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="w-full px-2.5 py-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-[#161920] text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Lịch cuộc họp</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/history')}
              className="w-full px-2.5 py-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-[#161920] text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>Lịch sử &amp; Biên bản</span>
            </button>
          </div>

          {/* System Settings Section */}
          <div className="space-y-1 pt-2 border-t border-zinc-200 dark:border-[#1E2025]">
            <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Cấu hình hệ thống
            </div>
            <button
              type="button"
              onClick={() => navigate('/settings?tab=ai_byok')}
              className="w-full px-2.5 py-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-[#161920] text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <Cpu className="w-4 h-4 shrink-0" />
              <span>Mô hình AI &amp; BYOK</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="w-full px-2.5 py-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-[#161920] text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Thiết bị âm thanh</span>
            </button>
          </div>
        </div>

        {/* Bottom Engine Status Card */}
        <div className="p-3 rounded-md bg-white dark:bg-[#15181F] border border-zinc-200 dark:border-[#242730] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-zinc-500 dark:text-zinc-400">WASAPI LOOPBACK</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              READY
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
            <span>100% RAM-Only Pipeline</span>
          </div>
        </div>
      </aside>

      {/* ── RIGHT MAIN WORKSPACE ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Header Bar */}
        <header className="h-13 border-b border-zinc-200 dark:border-[#1E2025] px-5 sm:px-8 flex items-center justify-between bg-[#FAF9F6] dark:bg-[#0D0E11] shrink-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <LayaMeetLogo size="sm" />
            </div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Bảng điều khiển phiên dịch &amp; phòng họp
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* User Display Name Input inline */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-[#14161B] border border-zinc-200 dark:border-[#242730]">
              <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={displayNameInput}
                onChange={(e) => {
                  setDisplayNameInput(e.target.value);
                  localStorage.setItem('layameet-desktop-display-name', e.target.value);
                }}
                placeholder="Tên hiển thị"
                aria-label="Tên hiển thị"
                className="w-28 bg-transparent text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>

            <LanguageSwitcher />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="p-1.5 rounded-md border border-zinc-200 dark:border-[#242730] bg-white dark:bg-[#14161B] text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
              title="Cài đặt"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-5 sm:p-8 space-y-6">
          {/* ── SECTION 1: SESSION CONTROL (2-Column Hairline Box) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 border border-zinc-200 dark:border-[#22252C] rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-[#22252C] bg-white dark:bg-[#111317]">
            {/* Left 6 Cols: Create Instant Room */}
            <div className="lg:col-span-6 p-6 flex flex-col justify-between gap-6">
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  PHÒNG HỌP TRỰC TUYẾN
                </div>
                <h1 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                  Khởi tạo phòng họp song ngữ mới
                </h1>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Tạo phòng họp WebRTC độ trễ thấp với phụ đề song ngữ Việt – Nhật – Anh và tự động trích xuất biên bản họp.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCreateMeeting}
                  disabled={isCreating}
                  className="px-4 py-2.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>{isCreating ? 'Đang khởi tạo...' : 'Tạo phòng họp ngay'}</span>
                </button>
                <span className="text-[11px] font-mono text-zinc-500">
                  LiveKit E2EE · RAM-Only
                </span>
              </div>
            </div>

            {/* Right 6 Cols: Join by Code */}
            <div className="lg:col-span-6 p-6 flex flex-col justify-between gap-5">
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  THAM GIA PHÒNG CÓ SẴN
                </div>
                <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                  Vào phòng bằng mã cuộc họp
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                  Nhập mã phòng (ví dụ: <code className="font-mono text-xs">MEET-ABC-XYZ</code>) do người chủ trì cung cấp.
                </p>
              </div>

              <form onSubmit={handleJoinMeeting} className="space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={meetingCodeInput}
                    onChange={(e) => {
                      setMeetingCodeInput(e.target.value);
                      setJoinError(null);
                    }}
                    placeholder="Nhập mã phòng..."
                    className="flex-1 bg-zinc-50 dark:bg-[#0D0E11] border border-zinc-300 dark:border-[#282C35] focus:border-blue-600 rounded-md px-3.5 py-2 text-xs sm:text-sm text-zinc-900 dark:text-white font-mono placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <span>Vào phòng</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {joinError && <div className="text-xs text-rose-500">{joinError}</div>}
              </form>
            </div>
          </div>

          {/* ── SECTION 2: DESKTOP OVERLAY & AUDIO UTILITY BAR ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 border border-zinc-200 dark:border-[#22252C] rounded-lg divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-[#22252C] bg-white dark:bg-[#111317]">
            <button
              type="button"
              onClick={handleActivateFloatingOverlay}
              className="p-5 text-left hover:bg-zinc-50 dark:hover:bg-[#15181F] transition-colors cursor-pointer flex items-start gap-3.5"
            >
              <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-[#1B1E26] border border-zinc-200 dark:border-[#282C35] flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0 mt-0.5">
                <Layers className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-zinc-950 dark:text-white flex items-center gap-1.5">
                  <span>Thanh phụ đề nổi</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-[#1E222B] text-zinc-600 dark:text-zinc-400">
                    Overlay
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Ghim cửa sổ phụ đề trong suốt lên trên Zoom, Teams hoặc Google Meet.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowTtsModal(true)}
              className="p-5 text-left hover:bg-zinc-50 dark:hover:bg-[#15181F] transition-colors cursor-pointer flex items-start gap-3.5"
            >
              <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-[#1B1E26] border border-zinc-200 dark:border-[#282C35] flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0 mt-0.5">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-zinc-950 dark:text-white flex items-center gap-1.5">
                  <span>Thuyết minh giọng nói</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-[#1E222B] text-zinc-600 dark:text-zinc-400">
                    TTS
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Đọc bản dịch tự động qua tai nghe bằng giọng đọc AI tự nhiên.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="p-5 text-left hover:bg-zinc-50 dark:hover:bg-[#15181F] transition-colors cursor-pointer flex items-start gap-3.5"
            >
              <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-[#1B1E26] border border-zinc-200 dark:border-[#282C35] flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-zinc-950 dark:text-white">
                  Lịch họp &amp; Biên bản
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Quản lý các cuộc họp sắp diễn ra và xuất báo cáo Markdown / PDF.
                </p>
              </div>
            </button>
          </div>

          {/* ── SECTION 3: DIAGNOSTICS & RECENT ROOMS TABLE ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Clean Hardware Audio Meter */}
            <div className="lg:col-span-5 p-5 rounded-lg border border-zinc-200 dark:border-[#22252C] bg-white dark:bg-[#111317] flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Mic className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  <div>
                    <div className="text-xs font-semibold text-zinc-950 dark:text-white">
                      Kiểm tra tín hiệu Micro
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Đo mức âm lượng đầu vào (VAD)
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleMicTest}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                    isMicTesting
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : 'bg-zinc-100 dark:bg-[#181B22] hover:bg-zinc-200 dark:hover:bg-[#20242D] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-[#282C35]'
                  }`}
                >
                  {isMicTesting ? 'Dừng' : 'Thử micro'}
                </button>
              </div>

              {/* Linear dB Level Bar */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full rounded-xs bg-zinc-100 dark:bg-[#0D0E11] border border-zinc-200 dark:border-[#22252C] overflow-hidden p-0.5">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75"
                    style={{ width: `${isMicTesting ? Math.max(4, micVolume) : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 tabular-nums">
                  <span>INPUT LEVEL</span>
                  <span>{isMicTesting ? `${micVolume}%` : 'IDLE'}</span>
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Recent Sessions Table */}
            <div className="lg:col-span-7 rounded-lg border border-zinc-200 dark:border-[#22252C] bg-white dark:bg-[#111317] overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-[#22252C] flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-950 dark:text-white flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Phiên họp gần đây</span>
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  Xem toàn bộ lịch sử
                </button>
              </div>

              {recentRooms.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  Chưa có phiên họp nào được lưu trên thiết bị này.
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-[#1E2025]">
                  {recentRooms.map((room) => (
                    <div
                      key={room.code}
                      className="px-5 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-[#15181F] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {room.code}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                          {room.joinedAt}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/meeting/${room.code}`)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <span>Kết nối lại</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* TTS Voice Dubbing Modal */}
      <TTSVoiceDubbingModal
        isOpen={showTtsModal}
        onClose={() => setShowTtsModal(false)}
      />
    </div>
  );
};
