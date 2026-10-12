import React from 'react';
import { ConnectionState } from 'livekit-client';
import { ShieldCheck, Clock, Zap, Lock } from 'lucide-react';
import { NetworkQualityIndicator } from './NetworkQualityIndicator';
import { LayaMeetLogo } from '../common/LayaMeetLogo';
import { ThemeToggle } from '../common/ThemeToggle';
import type { BrandingConfigDto } from '../../api/meetingApi';

interface MeetingTopBarProps {
  meetingCode: string;
  connectionState: ConnectionState;
  isHost?: boolean;
  onOpenAdmission?: () => void;
  branding: BrandingConfigDto;
  isRecording?: boolean;
  isE2eeEnabled?: boolean;
  isProPlan?: boolean;
  timeRemainingSeconds?: number | null;
  onOpenUpgradeModal?: () => void;
  isInfoOpen?: boolean;
  onToggleInfo?: () => void;
  numParticipants?: number;
  userDisplayName?: string;
  isOffline?: boolean;
  isLocked?: boolean;
}

const FREE_MEETING_WARNING_SECONDS = 5 * 60;

function formatRemainingTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export const MeetingTopBar: React.FC<MeetingTopBarProps> = ({
  meetingCode: _meetingCode,
  connectionState,
  isHost: _isHost,
  onOpenAdmission: _onOpenAdmission,
  branding,
  isRecording = false,
  isE2eeEnabled = false,
  isProPlan = false,
  timeRemainingSeconds = null,
  onOpenUpgradeModal,
  isInfoOpen: _isInfoOpen = false,
  onToggleInfo: _onToggleInfo,
  numParticipants = 1,
  userDisplayName,
  isOffline = false,
  isLocked = false,
}) => {
  const getStatusInfo = () => {
    if (isOffline) {
      return { text: 'Mất mạng', dot: 'bg-amber-500 animate-pulse' };
    }
    switch (connectionState) {
      case ConnectionState.Connected:
        return { text: 'Đã kết nối', dot: 'bg-green-500' };
      case ConnectionState.Connecting:
        return { text: 'Đang kết nối', dot: 'bg-amber-500 animate-pulse' };
      case ConnectionState.Reconnecting:
        return { text: 'Kết nối lại', dot: 'bg-amber-500 animate-pulse' };
      case ConnectionState.Disconnected:
        return { text: 'Mất kết nối', dot: 'bg-red-500' };
      default:
        return { text: 'Connecting...', dot: 'bg-amber-500 animate-pulse' };
    }
  };

  const status = getStatusInfo();
  const hasFreeCountdown = !isProPlan && timeRemainingSeconds !== null;
  const isTimeWarning = hasFreeCountdown
    && timeRemainingSeconds <= FREE_MEETING_WARNING_SECONDS;

  return (
    <header className="h-11 border-b border-zinc-200 dark:border-[#2e2e30] bg-white dark:bg-[#0f0f10] px-3 sm:px-4 flex items-center justify-between z-20 shrink-0 select-none transition-colors">
      {/* Brand identity */}
      <div className="flex min-w-0 items-center gap-2.5" title={branding.slogan || 'LayaMeet'}>
        {branding.logoUrl ? (
          <>
            <img
              src={branding.logoUrl}
              alt={`${branding.brandName} logo`}
              className="h-7 max-w-24 shrink-0 object-contain"
            />
            <span className="hidden sm:inline max-w-32 truncate text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:max-w-48">
              {branding.brandName}
            </span>
          </>
        ) : (
          <LayaMeetLogo size="sm" showWordmark={true} showBadge={false} />
        )}

        {_meetingCode && (
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-zinc-200 dark:border-[#2e2e30]">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-[#1a1a1b] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-[#3a3a3d]">
              {_meetingCode}
            </span>
          </div>
        )}
      </div>

      {/* Right-side controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {isProPlan ? (
          <div
            role="status"
            aria-label="Gói LayaMeet Pro không giới hạn thời lượng"
            className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-amber-700 dark:text-amber-300"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Pro Unlimited ⚡</span>
            <span className="sm:hidden">Pro</span>
          </div>
        ) : hasFreeCountdown ? (
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            disabled={!onOpenUpgradeModal}
            aria-label={`Gói miễn phí, còn ${formatRemainingTime(timeRemainingSeconds)}. Mở tùy chọn nâng cấp.`}
            title="Nâng cấp để họp không giới hạn"
            className={`flex items-center gap-1 rounded-md border px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-default ${
              isTimeWarning
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 focus:ring-amber-400'
                : 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:border-zinc-500 hover:text-white focus:ring-zinc-400'
            }`}
          >
            <span className="hidden sm:inline">Free ·&nbsp;</span>
            <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
            <span className="font-mono tabular-nums">
              {formatRemainingTime(timeRemainingSeconds)}
            </span>
          </button>
        ) : null}

        {isE2eeEnabled && (
          <div
            role="status"
            aria-label="Cuộc họp được bảo vệ bằng mã hóa đầu cuối"
            className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] sm:text-xs font-medium text-emerald-700 dark:text-emerald-300"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">E2EE Secured 🔒</span>
          </div>
        )}

        {isRecording && (
          <div
            role="status"
            aria-label="Đang ghi hình cuộc họp"
            className="flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] sm:text-xs font-medium text-rose-700 dark:text-rose-300"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" aria-hidden="true" />
            <span>REC</span>
          </div>
        )}

        {isLocked && (
          <div
            role="status"
            aria-label="Cuộc họp đang được khóa"
            className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] sm:text-xs font-semibold text-amber-700 dark:text-amber-300"
          >
            <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Đã khóa 🔒</span>
            <span className="sm:hidden">Khóa</span>
          </div>
        )}

        {/* Network quality */}
        <NetworkQualityIndicator />

        {/* Light / Dark Mode Toggle */}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        {/* Connection status */}
        <div role="status" className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-[#1a1a1b] border border-zinc-300 dark:border-[#2e2e30] text-xs text-zinc-600 dark:text-zinc-400">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span>{status.text}</span>
        </div>

        {/* User Avatar Circle with Participant Count Badge (Google Meet signature top-right element) */}
        <div className="flex items-center gap-1.5 pl-1">
          <div
            title={userDisplayName || 'Bạn'}
            className="relative w-7 h-7 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 text-white font-semibold text-xs flex items-center justify-center shadow-xs select-none border border-sky-400/40"
          >
            {(userDisplayName || 'U').charAt(0).toUpperCase()}
            {numParticipants > 0 && (
              <span
                title={`${numParticipants} người trong phòng`}
                className="absolute -bottom-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-zinc-800 border border-zinc-600 text-[9px] font-bold text-zinc-200 flex items-center justify-center shadow-xs"
              >
                {numParticipants}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
