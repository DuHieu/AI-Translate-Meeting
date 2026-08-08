import React from 'react';
import { SubtitleMessage } from '../../types/subtitle';

interface SubtitleOverlayProps {
  subtitle: SubtitleMessage | null;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ subtitle }) => {
  if (!subtitle) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 max-w-3xl w-full px-4 pointer-events-none transition-all duration-300">
      <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/80 text-center py-3 px-6 rounded-2xl shadow-2xl space-y-1">
        <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">
          {subtitle.participantName}
        </div>
        {/* Original text: smaller font size */}
        <p className="text-sm text-slate-300 font-light italic">
          {subtitle.originalText}
        </p>
        {/* Translated text: larger font size (main content) */}
        <p className="text-lg md:text-xl font-semibold text-white tracking-wide">
          {subtitle.translatedText}
        </p>
      </div>
    </div>
  );
};
