import React, { useState } from 'react';
import { ConnectionState } from 'livekit-client';
import { Video, Copy, Check, ShieldCheck } from 'lucide-react';
import { NetworkQualityIndicator } from './NetworkQualityIndicator';

interface MeetingTopBarProps {
  meetingCode: string;
  connectionState: ConnectionState;
}

export const MeetingTopBar: React.FC<MeetingTopBarProps> = ({ meetingCode, connectionState }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(meetingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusText = () => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return 'Connected';
      case ConnectionState.Connecting:
        return 'Connecting...';
      case ConnectionState.Reconnecting:
        return 'Reconnecting...';
      case ConnectionState.Disconnected:
        return 'Disconnected';
      default:
        return 'Connecting...';
    }
  };

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 md:px-6 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Product Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
          <Video className="w-4 h-4" />
        </div>
        <span className="font-semibold text-slate-100 text-sm md:text-base tracking-tight">
          AI Translate Meeting
        </span>
      </div>

      {/* Code & Quality Status */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={handleCopyCode}
          title="Click to copy meeting code"
          className="bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 px-3 py-1 rounded-full text-xs font-mono text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
        >
          <span className="text-slate-400">Code:</span>
          <span className="text-sky-400 font-bold uppercase tracking-wider">{meetingCode}</span>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        <NetworkQualityIndicator />

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/50 border border-slate-800 text-xs text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          <span>{getStatusText()}</span>
        </div>
      </div>
    </header>
  );
};
