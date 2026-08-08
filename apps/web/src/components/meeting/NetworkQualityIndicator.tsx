import React from 'react';
import { ConnectionQuality } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';

export const NetworkQualityIndicator: React.FC = () => {
  const room = useRoomContext();
  const quality = room?.localParticipant?.connectionQuality ?? ConnectionQuality.Unknown;

  const getQualityDetails = () => {
    switch (quality) {
      case ConnectionQuality.Excellent:
        return { label: 'Excellent', color: 'bg-emerald-500', text: 'text-emerald-400' };
      case ConnectionQuality.Good:
        return { label: 'Good', color: 'bg-emerald-400', text: 'text-emerald-300' };
      case ConnectionQuality.Poor:
        return { label: 'Poor', color: 'bg-amber-500 animate-pulse', text: 'text-amber-400' };
      case ConnectionQuality.Lost:
        return { label: 'Lost', color: 'bg-red-500 animate-ping', text: 'text-red-400' };
      default:
        return { label: 'Good', color: 'bg-emerald-500', text: 'text-emerald-400' };
    }
  };

  const status = getQualityDetails();

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-medium">
      <span className={`w-2 h-2 rounded-full ${status.color}`} />
      <span className={`hidden sm:inline ${status.text}`}>{status.label}</span>
    </div>
  );
};
