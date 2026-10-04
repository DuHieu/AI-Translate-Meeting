import React, { useState } from 'react';
import { ConnectionState } from 'livekit-client';
import { Copy, Check, ShieldCheck } from 'lucide-react';
import { NetworkQualityIndicator } from './NetworkQualityIndicator';
import { ViMeetLogo } from '../common/ViMeetLogo';
import { ThemeToggle } from '../common/ThemeToggle';
import type { BrandingConfigDto } from '../../api/meetingApi';

interface MeetingTopBarProps {
  meetingCode: string;
  connectionState: ConnectionState;
  isHost: boolean;
  onOpenAdmission: () => void;
  branding: BrandingConfigDto;
  isRecording?: boolean;
  isE2eeEnabled?: boolean;
}

export const MeetingTopBar: React.FC<MeetingTopBarProps> = ({
  meetingCode,
  connectionState,
  isHost,
  onOpenAdmission,
  branding,
  isRecording = false,
  isE2eeEnabled = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    const inviteUrl = `${window.location.origin}/prejoin/${meetingCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusInfo = () => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return { text: 'Connected', dot: 'bg-green-500' };
      case ConnectionState.Connecting:
        return { text: 'Connecting...', dot: 'bg-amber-500 animate-pulse' };
      case ConnectionState.Reconnecting:
        return { text: 'Reconnecting...', dot: 'bg-amber-500 animate-pulse' };
      case ConnectionState.Disconnected:
        return { text: 'Disconnected', dot: 'bg-red-500' };
      default:
        return { text: 'Connecting...', dot: 'bg-amber-500 animate-pulse' };
    }
  };

  const status = getStatusInfo();

  return (
    <header className="h-12 border-b border-[#2e2e30] dark:border-[#2e2e30] border-zinc-200 bg-[#0f0f10] dark:bg-[#0f0f10] bg-white px-3 sm:px-5 flex items-center justify-between z-20 shrink-0 select-none transition-colors">
      {/* Brand identity */}
      <div className="flex min-w-0 items-center gap-2.5" title={branding.slogan}>
        {branding.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={`${branding.brandName} logo`}
            className="h-7 max-w-24 shrink-0 object-contain"
          />
        ) : branding.brandName === 'ViMeet' ? (
          <ViMeetLogo size="sm" showWordmark={false} showBadge={false} />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {branding.brandName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="max-w-32 truncate text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:max-w-48">
          {branding.brandName}
        </span>
      </div>

      {/* Right-side controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {isE2eeEnabled && (
          <div
            role="status"
            aria-label="Cuộc họp được bảo vệ bằng mã hóa đầu cuối"
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/70 px-2 py-1 text-xs font-semibold text-emerald-300"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>E2EE Secured 🔒</span>
          </div>
        )}

        {isRecording && (
          <div
            role="status"
            aria-label="Đang ghi hình cuộc họp"
            className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/70 px-2 py-1 text-xs font-bold tracking-wider text-red-300"
          >
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
            REC
          </div>
        )}

        {/* Room code + copy link */}
        <button
          type="button"
          onClick={handleCopyCode}
          title="Sao chép link mời phòng họp"
          className="bg-[#1a1a1b] hover:bg-[#222224] dark:bg-[#1a1a1b] dark:hover:bg-[#222224] bg-zinc-100 hover:bg-zinc-200 border border-[#3a3a3d] dark:border-[#3a3a3d] border-zinc-300 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 dark:text-zinc-300 text-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="text-zinc-500">Phòng:</span>
          <span className="text-zinc-100 dark:text-zinc-100 text-zinc-900 font-semibold uppercase tracking-wider">{meetingCode}</span>
          {copied ? (
            <span className="text-green-500 dark:text-green-400 flex items-center gap-1 font-sans font-medium ml-0.5">
              <Check className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Đã copy</span>
            </span>
          ) : (
            <span className="text-zinc-500 dark:text-zinc-500 text-zinc-600 flex items-center gap-1 font-sans ml-0.5">
              <Copy className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Copy link</span>
            </span>
          )}
        </button>

        {/* Admission button (host only) */}
        {isHost && (
          <button
            type="button"
            onClick={onOpenAdmission}
            title="Quản lý invite và duyệt người tham gia"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1b] hover:bg-[#222224] dark:bg-[#1a1a1b] dark:hover:bg-[#222224] bg-zinc-100 hover:bg-zinc-200 border border-[#3a3a3d] dark:border-[#3a3a3d] border-zinc-300 text-xs font-medium text-zinc-300 dark:text-zinc-300 text-zinc-700 hover:text-zinc-100 dark:hover:text-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            <span className="hidden md:inline">Admission</span>
          </button>
        )}

        {/* Network quality */}
        <NetworkQualityIndicator />

        {/* Light / Dark Mode Toggle */}
        <ThemeToggle />

        {/* Connection status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a1a1b] dark:bg-[#1a1a1b] bg-zinc-100 border border-[#2e2e30] dark:border-[#2e2e30] border-zinc-300 text-xs text-zinc-400 dark:text-zinc-400 text-zinc-600">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span>{status.text}</span>
        </div>
      </div>
    </header>
  );
};
