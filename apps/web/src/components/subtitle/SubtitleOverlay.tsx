import React from 'react';
import { SubtitleMessage } from '../../types/subtitle';
import { Zap, CheckCircle2 } from 'lucide-react';

interface SubtitleOverlayProps {
  subtitle: SubtitleMessage | null;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ subtitle }) => {
  if (!subtitle) return null;

  const hasAction = subtitle.tags?.includes('action_item');
  const hasDecision = subtitle.tags?.includes('decision');

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 max-w-3xl w-full px-4 pointer-events-none transition-all duration-300">
      <div
        className={`bg-slate-950/90 backdrop-blur-md border text-center py-3.5 px-6 rounded-2xl shadow-2xl space-y-1.5 transition-all ${
          hasAction
            ? 'border-amber-500/60 shadow-amber-500/20 ring-1 ring-amber-500/30'
            : hasDecision
            ? 'border-emerald-500/60 shadow-emerald-500/20 ring-1 ring-emerald-500/30'
            : 'border-slate-800/80'
        }`}
      >
        <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
            {subtitle.participantName}
          </span>

          {hasAction && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              <Zap className="w-3 h-3 text-amber-400" />
              Action Item {subtitle.confidence ? `(${Math.round(subtitle.confidence * 100)}%)` : ''}
            </span>
          )}

          {hasDecision && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Decision {subtitle.confidence ? `(${Math.round(subtitle.confidence * 100)}%)` : ''}
            </span>
          )}
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
