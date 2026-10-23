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
  HardDrive,
  Terminal,
  CheckCircle2,
  Download,
  RefreshCw,
} from 'lucide-react';
import { meetingApi } from '../../api/meetingApi';
import { LayaMeetLogo } from '../common/LayaMeetLogo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { ThemeToggle } from '../common/ThemeToggle';
import { TTSVoiceDubbingModal } from '../meeting/TTSVoiceDubbingModal';
import {
  setDesktopWindowMode,
  getCustomVpsUrl,
  setCustomVpsUrl,
  getApiBaseUrl,
} from '../../utils/desktopBridge';
import {
  checkDesktopAppUpdate,
  installDesktopAppUpdate,
  DesktopUpdateCheckResult,
} from '../../services/desktopUpdaterService';
import { ModuleManagerPanel } from './ModuleManagerModal';
import {
  desktopModuleManager,
  WorkspaceModuleItem,
} from '../../services/desktopModuleManager';

const IT_ROOM_PRESETS = [
  { id: 'standup', label: 'Daily Standup', prefix: 'STANDUP' },
  { id: 'brse', label: 'BrSE Sync (VI-JA)', prefix: 'BRSE' },
  { id: 'incident', label: 'Incident War-Room', prefix: 'WARROOM' },
  { id: 'arch', label: 'Arch Review (ADR)', prefix: 'ADR' },
] as const;

export const DesktopHomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'operations' | 'modules'>(
    'operations',
  );
  const [connectionMode, setConnectionMode] = useState<'p2p' | 'server'>('server');
  const [vpsUrlInput, setVpsUrlInput] = useState<string>(() => getCustomVpsUrl());
  const [vpsUrlSaved, setVpsUrlSaved] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showTtsModal, setShowTtsModal] = useState(false);
  const [meetingCodeInput, setMeetingCodeInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState(() => {
    return localStorage.getItem('layameet-desktop-display-name') || 'Kỹ sư IT';
  });
  const [recentRooms, setRecentRooms] = useState<
    { code: string; mode?: 'p2p' | 'server'; joinedAt: string }[]
  >([]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [modules, setModules] = useState<WorkspaceModuleItem[]>(() =>
    desktopModuleManager.getModules(),
  );
  const [updateCheck, setUpdateCheck] = useState<DesktopUpdateCheckResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  // Live Microphone Level State
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return desktopModuleManager.subscribe(setModules);
  }, []);

  const handleCheckAppUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await checkDesktopAppUpdate();
      setUpdateCheck(res);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallAppUpdate = async (silent = true) => {
    if (!updateCheck || isInstallingUpdate) return;
    setIsInstallingUpdate(true);
    setUpdateProgress(10);
    try {
      await installDesktopAppUpdate(
        updateCheck.manifest,
        (pct) => setUpdateProgress(pct),
        silent,
      );
    } finally {
      setIsInstallingUpdate(false);
    }
  };

  useEffect(() => {
    void handleCheckAppUpdate();
  }, []);

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

  const saveRecentRoom = (code: string, mode: 'p2p' | 'server') => {
    try {
      const existing = recentRooms.filter((r) => r.code !== code);
      const updated = [
        { code, mode, joinedAt: new Date().toLocaleTimeString() },
        ...existing,
      ].slice(0, 6);
      setRecentRooms(updated);
      localStorage.setItem('layameet-desktop-recent-rooms', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleCreateMeeting = async (presetPrefix?: string) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      localStorage.setItem('layameet-desktop-display-name', displayNameInput);

      if (connectionMode === 'p2p') {
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = presetPrefix ? `${presetPrefix}-${suffix}` : `P2P-${suffix}`;
        saveRecentRoom(code, 'p2p');
        navigate(`/meeting/${code}?mode=p2p`);
        return;
      }

      const res = await meetingApi.createMeeting();
      if (res && res.meetingCode) {
        saveRecentRoom(res.meetingCode, 'server');
        navigate(`/meeting/${res.meetingCode}`);
      }
    } catch {
      // Automatic fallback to Serverless P2P if backend is unreachable
      const fallbackCode = `P2P-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      saveRecentRoom(fallbackCode, 'p2p');
      navigate(`/meeting/${fallbackCode}?mode=p2p`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = meetingCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setJoinError('Vui lòng nhập mã phòng');
      return;
    }
    localStorage.setItem('layameet-desktop-display-name', displayNameInput);
    saveRecentRoom(cleanCode, connectionMode);
    navigate(
      connectionMode === 'p2p' ? `/meeting/${cleanCode}?mode=p2p` : `/meeting/${cleanCode}`,
    );
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
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  const updatesCount = modules.filter(
    (m) => m.status === 'update_available' || m.version !== m.latestVersion,
  ).length;

  return (
    <div className="min-h-screen bg-[#D8DEE6] dark:bg-[#0E1218] text-slate-900 dark:text-slate-100 flex font-sans select-none">
      {/* ── LEFT ENTERPRISE ERP SIDEBAR (md+) ───────────────────── */}
      <aside className="hidden md:flex w-60 border-r border-slate-300/80 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#131820] flex-col justify-between p-4 shrink-0">
        <div className="space-y-5">
          {/* Brand Header */}
          <div className="px-2 pt-1 flex items-center justify-between">
            <LayaMeetLogo size="sm" />
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-500/30 text-[#0F766E] dark:text-teal-300 font-bold">
              ERP P2P v2.5
            </span>
          </div>

          {/* Primary Navigation */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              IT Workspace
            </div>
            <button
              type="button"
              onClick={() => setActiveWorkspaceTab('operations')}
              className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 cursor-pointer text-left transition-colors ${
                activeWorkspaceTab === 'operations'
                  ? 'bg-teal-900/10 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-300 border border-teal-700/20 dark:border-teal-800/70'
                  : 'text-slate-700 dark:text-slate-400 hover:bg-slate-300/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Terminal className="w-4 h-4 shrink-0" />
              <span>Phòng họp &amp; P2P Mesh</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveWorkspaceTab('modules')}
              className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer text-left transition-colors ${
                activeWorkspaceTab === 'modules'
                  ? 'bg-teal-900/10 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-300 border border-teal-700/20 dark:border-teal-800/70'
                  : 'text-slate-700 dark:text-slate-400 hover:bg-slate-300/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 shrink-0" />
                <span>Quản lý Modules</span>
              </span>
              {updatesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-bold">
                  {updatesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleActivateFloatingOverlay}
              className="w-full px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/50 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 shrink-0" />
                <span>Chế độ Mini Overlay</span>
              </span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>

            <button
              type="button"
              onClick={() => setShowTtsModal(true)}
              className="w-full px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/50 text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <Volume2 className="w-4 h-4 shrink-0" />
              <span>Thuyết minh TTS</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="w-full px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/50 text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Lịch họp</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/history')}
              className="w-full px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/50 text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>Biên bản họp (ADR)</span>
            </button>
          </div>

          {/* System Settings Section */}
          <div className="space-y-1 pt-2 border-t border-slate-300/70 dark:border-slate-800">
            <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Hệ thống &amp; AI
            </div>
            <button
              type="button"
              onClick={() => navigate('/settings?tab=ai_byok')}
              className="w-full px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/50 text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <Cpu className="w-4 h-4 shrink-0" />
              <span>Cấu hình AI &amp; BYOK</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="w-full px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/50 text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Thiết bị Âm thanh</span>
            </button>
          </div>
        </div>

        {/* Bottom Engine & OTA Version Status Card */}
        <div className="p-2.5 rounded-lg bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300/80 dark:border-slate-800 space-y-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400 shrink-0" />
              <span>{connectionMode === 'server' ? 'VPS SFU Hybrid' : 'Zero-Server P2P'}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[#0F766E] dark:text-teal-400 font-mono font-semibold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              v{updateCheck?.currentVersion || '1.7.0'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <span>MODULES ACTIVE</span>
            <span>{modules.length}/{modules.length}</span>
          </div>
          <button
            type="button"
            onClick={() => void handleCheckAppUpdate()}
            disabled={isCheckingUpdate}
            className="w-full py-1.5 px-2 rounded bg-[#E4E9F0] dark:bg-[#151A22] hover:bg-slate-300/70 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            <span>
              {isCheckingUpdate
                ? 'Đang kiểm tra...'
                : updateCheck?.hasUpdate
                  ? `Cập nhật lên v${updateCheck.latestVersion}`
                  : 'Kiểm tra bản cập nhật'}
            </span>
          </button>
        </div>
      </aside>

      {/* ── RIGHT MAIN WORKSPACE ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Header Bar */}
        <header className="h-13 border-b border-slate-300/80 dark:border-slate-800 px-5 sm:px-8 flex items-center justify-between bg-[#E4E9F0] dark:bg-[#131820] shrink-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <LayaMeetLogo size="sm" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
              LAYAMEET IT WORKSPACE · ERP CONSOLE
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300 dark:border-slate-700">
              <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="text"
                value={displayNameInput}
                onChange={(e) => {
                  setDisplayNameInput(e.target.value);
                  localStorage.setItem('layameet-desktop-display-name', e.target.value);
                }}
                placeholder="Tên hiển thị"
                aria-label="Tên hiển thị"
                className="w-28 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <LanguageSwitcher />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-[#D8DEE6] dark:bg-[#151A24] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Cài đặt"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5">
          {activeWorkspaceTab === 'modules' ? (
            <ModuleManagerPanel />
          ) : (
            <>
              {/* ── OTA DESKTOP INSTALLER & AUTO-UPDATE BAR ── */}
              <div className="p-3 rounded-xl border border-slate-300/80 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#151A22] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-[#0F766E] dark:text-teal-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Bộ cài Windows Chuẩn (NSIS Setup) &amp; Tự động Cập nhật (OTA)</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono text-[10px]">
                        Đã cài: v{updateCheck?.currentVersion || '1.7.0'}
                      </span>
                      {updateCheck?.hasUpdate && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-bold">
                          MỚI: v{updateCheck.latestVersion}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {updateCheck?.hasUpdate
                        ? `Phát hiện bản mới v${updateCheck.latestVersion}: ${updateCheck.manifest.notes}`
                        : 'Cài đặt như ứng dụng Windows chuẩn (Start Menu, Desktop Shortcut, gỡ cài đặt trong Settings) và tự động cập nhật khi VPS có bản mới.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCheckAppUpdate()}
                    disabled={isCheckingUpdate}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-[#D8DEE6] dark:bg-[#0E1218] text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    <span>Kiểm tra bản mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleInstallAppUpdate(true)}
                    disabled={isInstallingUpdate}
                    className="px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      {isInstallingUpdate
                        ? `Đang cập nhật (${updateProgress}%)...`
                        : updateCheck?.hasUpdate
                          ? `Cập nhật ngay (v${updateCheck.latestVersion})`
                          : 'Tải bộ cài Setup .exe'}
                    </span>
                  </button>
                </div>
              </div>

              {/* ── TOP CONNECTION TOPOLOGY BAR (SERVER SFU HYBRID vs P2P SERVERLESS) ── */}
              <div className="p-3.5 rounded-xl border border-slate-300/80 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#151A22] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-4 h-4 text-[#0F766E] dark:text-teal-400" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Chế độ Kết nối Hạ tầng (Network Topology)</span>
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-500/30 text-[10px] font-mono text-[#0F766E] dark:text-teal-300">
                          {connectionMode === 'server' ? 'VPS SFU PRIMARY · 50+ USERS' : 'P2P MESH · ≤8 USERS'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {connectionMode === 'server'
                          ? 'Dùng VPS hiện tại (LiveKit SFU + .NET API) kết hợp nhận diện giọng nói trên máy khách (Hybrid Offload giảm 80% CPU cho VPS).'
                          : 'P2P Mesh qua Internet (Trystero Nostr + WebRTC DataChannel) — Dự phòng khi không có VPS (Tối đa 6–8 người).'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#D8DEE6] dark:bg-[#0E1218] p-1 rounded-lg border border-slate-300 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setConnectionMode('server')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        connectionMode === 'server'
                          ? 'bg-[#0F766E] text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>VPS Server SFU (Hybrid)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectionMode('p2p')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        connectionMode === 'p2p'
                          ? 'bg-[#0F766E] text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>P2P Dự phòng (≤8 người)</span>
                    </button>
                  </div>
                </div>

                {connectionMode === 'server' && (
                  <div className="pt-2.5 border-t border-slate-300/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        VPS Endpoint:
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300 dark:border-slate-800 text-[#0F766E] dark:text-teal-400">
                        {getApiBaseUrl() || window.location.origin}
                      </span>
                      <span className="hidden lg:inline text-slate-500">
                        · Client STT Offload: BẬT (Tiết kiệm RAM/CPU VPS)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        value={vpsUrlInput}
                        onChange={(e) => {
                          setVpsUrlInput(e.target.value);
                          setVpsUrlSaved(false);
                        }}
                        placeholder="URL VPS (để trống nếu dùng mặc định)"
                        className="w-56 sm:w-64 bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-[11px] font-mono text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#0F766E]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCustomVpsUrl(vpsUrlInput);
                          setVpsUrlSaved(true);
                          window.setTimeout(() => setVpsUrlSaved(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold text-[11px] cursor-pointer"
                      >
                        {vpsUrlSaved ? 'Đã lưu' : 'Lưu VPS'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECTION 1: SESSION CONTROL (2-Column ERP Card) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 border border-slate-300/80 dark:border-slate-800 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-300/80 dark:divide-slate-800 bg-[#E4E9F0] dark:bg-[#151A22]">
                {/* Left 7 Cols: Create Instant Room + IT Workspace Presets */}
                <div className="lg:col-span-7 p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#0F766E] dark:text-teal-400">
                      {connectionMode === 'p2p'
                        ? 'KHỞI TẠO PHÒNG P2P TRỰC TIẾP (SERVERLESS)'
                        : 'KHỞI TẠO PHÒNG HỌP SONG NGỮ'}
                    </div>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      Phòng họp kỹ thuật IT song ngữ (Việt – Nhật – Anh)
                    </h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Các máy tự tìm nhau qua Internet, nhận diện giọng nói trên thiết bị và đồng bộ biên bản ADR/Action Items trực tiếp.
                    </p>
                  </div>

                  {/* Quick IT Preset Templates */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono uppercase text-slate-500">
                      Mẫu cuộc họp IT nhanh:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {IT_ROOM_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => void handleCreateMeeting(preset.prefix)}
                          className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-[#D8DEE6] dark:bg-[#0E1218] hover:border-[#0F766E] dark:hover:border-teal-500 text-[11px] font-mono text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          + {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => void handleCreateMeeting()}
                      disabled={isCreating}
                      className="px-4 py-2.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>
                        {isCreating
                          ? 'Đang khởi tạo...'
                          : connectionMode === 'p2p'
                            ? 'Tạo phòng P2P ngay'
                            : 'Tạo phòng ngay'}
                      </span>
                    </button>
                    <span className="text-[11px] font-mono text-slate-500">
                      0 Server Cost · E2EE WebRTC
                    </span>
                  </div>
                </div>

                {/* Right 5 Cols: Join by Code */}
                <div className="lg:col-span-5 p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                      KẾT NỐI ĐỒNG NGHIỆP
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      Vào phòng bằng mã
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Nhập mã phòng chung (VD: <code className="font-mono">P2P-8F2A</code> hoặc <code className="font-mono">STANDUP-01</code>).
                    </p>
                  </div>

                  <form onSubmit={handleJoinMeeting} className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={meetingCodeInput}
                        onChange={(e) => {
                          setMeetingCodeInput(e.target.value);
                          setJoinError(null);
                        }}
                        placeholder="Mã phòng..."
                        className="flex-1 bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300 dark:border-slate-700 focus:border-[#0F766E] rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white font-mono placeholder-slate-500 focus:outline-none transition-colors"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-200 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <span>Vào phòng</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {joinError && <div className="text-xs text-rose-500">{joinError}</div>}
                  </form>
                </div>
              </div>

              {/* ── SECTION 2: MODULAR ARCHITECTURE STATUS STRIP ── */}
              <div className="rounded-xl border border-slate-300/80 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#151A22] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-[#0F766E] dark:text-teal-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Trạng thái các Module Lõi (Hot-Swappable Desktop &amp; Edge Modules)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('modules')}
                    className="text-xs font-semibold text-[#0F766E] dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Mở trình Quản lý &amp; Nâng cấp Module ({updatesCount} bản cập nhật)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {modules.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setActiveWorkspaceTab('modules')}
                      className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-[#D8DEE6]/70 dark:bg-[#0E1218] hover:border-teal-600 transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-slate-600 dark:text-slate-400">
                          {m.code}
                        </span>
                        {m.status === 'update_available' ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                            UPDATE
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> v{m.version}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {m.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── SECTION 3: DIAGNOSTICS & RECENT ROOMS TABLE ── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left 5 Cols: Clean Hardware Audio Meter */}
                <div className="lg:col-span-5 p-4 rounded-xl border border-slate-300/80 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#151A22] flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-[#0F766E] dark:text-teal-400" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        Kiểm tra Micro &amp; Client VAD
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleMicTest}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        isMicTesting
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : 'bg-[#D8DEE6] dark:bg-slate-800 hover:bg-slate-300/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isMicTesting ? 'Dừng' : 'Thử micro'}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="h-2 w-full rounded bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300 dark:border-slate-800 overflow-hidden p-0.5">
                      <div
                        className="h-full bg-[#0F766E] dark:bg-teal-400 transition-all duration-75 rounded-xs"
                        style={{ width: `${isMicTesting ? Math.max(4, micVolume) : 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 tabular-nums">
                      <span>ON-DEVICE VAD</span>
                      <span>{isMicTesting ? `${micVolume}%` : 'IDLE'}</span>
                    </div>
                  </div>
                </div>

                {/* Right 7 Cols: Recent Sessions Table */}
                <div className="lg:col-span-7 rounded-xl border border-slate-300/80 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#151A22] overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-300/80 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Phiên làm việc gần đây</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/history')}
                      className="text-xs text-[#0F766E] dark:text-teal-400 hover:underline font-medium cursor-pointer"
                    >
                      Biên bản đã lưu
                    </button>
                  </div>

                  {recentRooms.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Chưa có phiên họp gần đây.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-300/70 dark:divide-slate-800">
                      {recentRooms.map((room) => (
                        <div
                          key={room.code}
                          className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-300/40 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {room.code}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-[10px] font-mono text-teal-600 dark:text-teal-400 uppercase">
                              {room.mode || 'p2p'}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                              {room.joinedAt}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                room.mode === 'server'
                                  ? `/meeting/${room.code}`
                                  : `/meeting/${room.code}?mode=p2p`,
                              )
                            }
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] dark:text-teal-400 hover:underline cursor-pointer"
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
            </>
          )}
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
