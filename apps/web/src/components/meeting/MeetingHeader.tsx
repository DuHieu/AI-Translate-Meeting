import React from 'react';
import { Video } from 'lucide-react';
import { ConnectionState } from 'livekit-client';

interface MeetingHeaderProps {
  meetingCode: string;
  connectionState?: ConnectionState;
}

export const MeetingHeader: React.FC<MeetingHeaderProps> = ({ meetingCode, connectionState }) => {
  const getStatusTextAndColor = () => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return { text: 'Connected', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' };
      case ConnectionState.Connecting:
        return { text: 'Connecting...', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-500 animate-pulse' };
      case ConnectionState.Reconnecting:
        return { text: 'Reconnecting...', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-500 animate-ping' };
      case ConnectionState.Disconnected:
        return { text: 'Disconnected', color: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-500' };
      default:
        return { text: 'Connecting...', color: 'bg-slate-800 text-slate-400 border-slate-700', dot: 'bg-slate-400' };
    }
  };

  const status = getStatusTextAndColor();

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 md:px-6 flex items-center justify-between z-20">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
          <Video className="w-4 h-4" />
        </div>
        <h1 className="font-semibold text-slate-100 text-sm md:text-base tracking-tight">ViMeet</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1 rounded-full text-xs font-mono text-slate-300 flex items-center gap-1.5">
          <span className="text-slate-400">Code:</span>
          <span className="text-sky-400 font-bold uppercase tracking-wider">{meetingCode}</span>
        </div>

        <div className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${status.color}`}>
          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
          <span>{status.text}</span>
        </div>
      </div>
    </header>
  );
};
