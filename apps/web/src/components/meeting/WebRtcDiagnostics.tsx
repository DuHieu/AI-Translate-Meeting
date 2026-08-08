import React from 'react';
import { useRoomContext, useConnectionState } from '@livekit/components-react';
import { ConnectionQuality } from 'livekit-client';
import { Activity } from 'lucide-react';

export const WebRtcDiagnostics: React.FC = () => {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const isDebugEnabled = import.meta.env.VITE_ENABLE_WEBRTC_DEBUG === 'true';

  if (!isDebugEnabled || !room) return null;

  const localParticipant = room.localParticipant;
  const numParticipants = room.remoteParticipants.size + 1;
  const quality = localParticipant?.connectionQuality ?? ConnectionQuality.Unknown;

  return (
    <div className="fixed top-16 left-4 z-50 bg-slate-900/90 border border-slate-800 backdrop-blur-md text-slate-300 p-3 rounded-2xl shadow-xl text-xs font-mono max-w-xs space-y-1.5 pointer-events-none opacity-90">
      <div className="flex items-center justify-between font-bold text-sky-400 border-b border-slate-800 pb-1 mb-1">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" /> WebRTC Diagnostics
        </span>
        <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 text-[10px]">DEBUG</span>
      </div>

      <div className="grid grid-cols-2 gap-[2px]">
        <span className="text-slate-500">State:</span>
        <span className="text-emerald-400 font-semibold">{connectionState}</span>

        <span className="text-slate-500">Participants:</span>
        <span>{numParticipants}</span>

        <span className="text-slate-500">Local ID:</span>
        <span className="truncate">{localParticipant?.identity || 'N/A'}</span>

        <span className="text-slate-500">Quality:</span>
        <span>{String(quality)}</span>

        <span className="text-slate-500">Transport:</span>
        <span className="text-sky-400">UDP (7882)</span>

        <span className="text-slate-500">Server:</span>
        <span className="truncate">{room.engine.client.ws?.url || '127.0.0.1:7880'}</span>
      </div>
    </div>
  );
};
