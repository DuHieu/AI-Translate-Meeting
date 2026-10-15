import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, Calendar, Layers, Clock, Settings, Volume2, Shield, ArrowRight, User } from 'lucide-react';
import { meetingApi } from '../../api/meetingApi';
import { LayaMeetLogo } from '../common/LayaMeetLogo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { ThemeToggle } from '../common/ThemeToggle';
import { TTSVoiceDubbingModal } from '../meeting/TTSVoiceDubbingModal';

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

  useEffect(() => {
    // Load recent rooms from meetingStorage or localStorage
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
      const existing = recentRooms.filter(r => r.code !== code);
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
      // Fallback: generate local room code
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

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col select-none">
      {/* Top Desktop App Header */}
      <header className="h-14 border-b border-white/10 px-6 flex items-center justify-between bg-[#0b0f19]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <LayaMeetLogo className="h-7 w-auto" />
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            DESKTOP CLIENT
          </span>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>⚡ &lt;350ms</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">100% RAM-Only</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTtsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors cursor-pointer"
            title="Cài đặt Thuyết minh AI (Voice Dubbing)"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thuyết minh AI</span>
          </button>
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
            title="Cài đặt âm thanh & thiết bị"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Action Hub (Zoom-inspired Grid) */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 sm:p-10 flex flex-col justify-center">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Họp Song Ngữ Trực Tuyến AI
          </h1>
          <p className="text-sm text-slate-400">
            Nền tảng họp video thời gian thực siêu nhẹ, xóa bỏ rào cản ngôn ngữ bằng STT & Thuyết minh giọng nói AI.
          </p>
        </div>

        {/* 4 Primary Action Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Action 1: New Meeting */}
          <button
            onClick={handleCreateMeeting}
            disabled={isCreating}
            className="group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 border border-amber-500/30 hover:border-amber-400/50 transition-all shadow-lg hover:shadow-amber-500/10 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform mb-3">
              <Video className="w-7 h-7" />
            </div>
            <span className="text-sm font-bold text-white mb-1">
              {isCreating ? 'Đang tạo...' : 'Cuộc Họp Mới'}
            </span>
            <span className="text-[11px] text-amber-300/80 font-medium">Bắt đầu tức thì</span>
          </button>

          {/* Action 2: Join Meeting */}
          <button
            onClick={() => setShowJoinModal(true)}
            className="group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-blue-500/20 to-blue-600/10 hover:from-blue-500/30 hover:to-blue-600/20 border border-blue-500/30 hover:border-blue-400/50 transition-all shadow-lg hover:shadow-blue-500/10 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform mb-3">
              <Plus className="w-7 h-7" />
            </div>
            <span className="text-sm font-bold text-white mb-1">Tham Gia</span>
            <span className="text-[11px] text-blue-300/80 font-medium">Nhập mã phòng</span>
          </button>

          {/* Action 3: Calendar / Schedule */}
          <button
            onClick={() => navigate('/calendar')}
            className="group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-indigo-500/20 to-indigo-600/10 hover:from-indigo-500/30 hover:to-indigo-600/20 border border-indigo-500/30 hover:border-indigo-400/50 transition-all shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform mb-3">
              <Calendar className="w-7 h-7" />
            </div>
            <span className="text-sm font-bold text-white mb-1">Lên Lịch</span>
            <span className="text-[11px] text-indigo-300/80 font-medium">Đặt lịch họp</span>
          </button>

          {/* Action 4: Floating Overlay Companion */}
          <button
            onClick={() => navigate('/features')}
            className="group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-emerald-500/20 to-emerald-600/10 hover:from-emerald-500/30 hover:to-emerald-600/20 border border-emerald-500/30 hover:border-emerald-400/50 transition-all shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform mb-3">
              <Layers className="w-7 h-7" />
            </div>
            <span className="text-sm font-bold text-white mb-1">Phụ Đề Nổi</span>
            <span className="text-[11px] text-emerald-300/80 font-medium">Ghim đè app khác</span>
          </button>
        </div>

        {/* User Identity & Recent Rooms Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Quick Profile Card */}
          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Tên người phát biểu</div>
                  <div className="text-xs text-slate-400">Hiển thị khi tham gia phòng</div>
                </div>
              </div>
              <input
                type="text"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="Nhập họ và tên..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Shield className="w-3.5 h-3.5" />
                Bảo mật E2EE
              </span>
              <span>STT: Groq LPU &lt;150ms</span>
            </div>
          </div>

          {/* Right: Recent Meeting History */}
          <div className="md:col-span-2 p-5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Cuộc họp gần đây
              </span>
              <button
                onClick={() => navigate('/history')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Xem tất cả
              </button>
            </div>

            {recentRooms.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Chưa có cuộc họp nào gần đây. Hãy bấm &quot;Cuộc Họp Mới&quot; để bắt đầu!
              </div>
            ) : (
              <div className="space-y-2">
                {recentRooms.map((room, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white tracking-wide">{room.code}</div>
                        <div className="text-[11px] text-slate-400">Đã tham gia lúc {room.joinedAt}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/meeting/${room.code}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors"
                    >
                      Vào lại
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Join Meeting Modal Dialog */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0e1320] border border-white/15 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-white mb-1">Tham Gia Cuộc Họp</h2>
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
                  placeholder="Ví dụ: MEET-ABC-XYZ hoặc 123-456"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                {joinError && <div className="text-xs text-red-400 mt-1">{joinError}</div>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tên Của Bạn</label>
                <input
                  type="text"
                  required
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Nhập tên của bạn..."
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-colors flex items-center gap-1.5"
                >
                  Vào Phòng
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

