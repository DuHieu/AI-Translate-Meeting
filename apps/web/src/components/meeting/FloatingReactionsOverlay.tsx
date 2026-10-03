import React from 'react';
import { FloatingReaction } from '../../types/meeting';

interface FloatingReactionsOverlayProps {
  reactions: FloatingReaction[];
}

export const FloatingReactionsOverlay: React.FC<FloatingReactionsOverlayProps> = ({ reactions }) => {
  if (reactions.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute bottom-24 flex flex-col items-center animate-float-up pointer-events-none select-none drop-shadow-lg"
          style={{ left: `${reaction.leftPercent}%` }}
        >
          <span className="text-4xl filter drop-shadow-md select-none">{reaction.emoji}</span>
          <span className="text-[10px] px-2 py-0.5 mt-1 rounded-full bg-slate-900/80 text-slate-200 border border-white/10 backdrop-blur-md font-medium">
            {reaction.senderName}
          </span>
        </div>
      ))}
    </div>
  );
};
