import React, { useState } from 'react';
import { ConnectionState } from 'livekit-client';
import { Copy, Check, ShieldCheck, Zap } from 'lucide-react';
import { NetworkQualityIndicator } from './NetworkQualityIndicator';

interface MeetingTopBarProps {
  meetingCode: string;
  connectionState: ConnectionState;
  isHost: boolean;
  onOpenAdmission: () => void;
}

export const MeetingTopBar: React.FC<MeetingTopBarProps> = ({
  meetingCode,
  connectionState,
  isHost,
  onOpenAdmission,
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
    <header className="h-12 border-b border-[#2e2e30] bg-[#0f0f10] px-4 md:px-5 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Product logo + title */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white shrink-0">
          <Zap className="w-3.5 h-3.5" />
        </div>
        <span className="font-semibold text-zinc-100 text-sm tracking-tight">
          AI Translate Meeting
        </span>
      </div>

      {/* Right-side controls */}
      <div className="flex items-center gap-2">
        {/* Room code + copy link */}
        <button
          type="button"
          onClick={handleCopyCode}
          title="Sao chép link mời phòng họp"
          className="bg-[#1a1a1b] hover:bg-[#222224] border border-[#3a3a3d] px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="text-zinc-500">Phòng:</span>
          <span className="text-zinc-100 font-semibold uppercase tracking-wider">{meetingCode}</span>
          {copied ? (
            <span className="text-green-400 flex items-center gap-1 font-sans font-medium ml-0.5">
              <Check className="w-3.5 h-3.5" /> Đã copy
            </span>
          ) : (
            <span className="text-zinc-500 flex items-center gap-1 font-sans ml-0.5">
              <Copy className="w-3.5 h-3.5" /> Copy link
            </span>
          )}
        </button>

        {/* Admission button (host only) */}
        {isHost && (
          <button
            type="button"
            onClick={onOpenAdmission}
            title="Quản lý invite và duyệt người tham gia"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1b] border border-[#3a3a3d] text-xs font-medium text-zinc-300 hover:bg-[#222224] hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            <span className="hidden md:inline">Admission</span>
          </button>
        )}

        {/* Network quality */}
        <NetworkQualityIndicator />

        {/* Connection status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a1a1b] border border-[#2e2e30] text-xs text-zinc-400">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span>{status.text}</span>
        </div>
      </div>
    </header>
  );
};
