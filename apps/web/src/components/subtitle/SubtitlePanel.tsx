import React, { useEffect, useRef } from 'react';
import { SubtitleMessage } from '../../types/subtitle';
import { X, MessageSquare } from 'lucide-react';
import { formatTimestamp } from '../../utils';

interface SubtitlePanelProps {
  history: SubtitleMessage[];
  isOpen: boolean;
  onClose: () => void;
}

export const SubtitlePanel: React.FC<SubtitlePanelProps> = ({ history, isOpen, onClose }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shadow-xl">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-sky-400" />
          <h3 className="font-semibold text-slate-100">Live Transcript</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <div className="text-center text-slate-500 py-10 text-sm">
            No spoken transcript yet. Subtitles will appear here in real-time.
          </div>
        ) : (
          history.map((item, idx) => (
            <div key={item.id || idx} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-sky-400">{item.participantName}</span>
                <span>{formatTimestamp(item.timestamp)}</span>
              </div>
              <p className="text-xs text-slate-300 italic">{item.originalText}</p>
              <p className="text-sm font-medium text-white">{item.translatedText}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
