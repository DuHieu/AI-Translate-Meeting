import React, { useState, useEffect } from 'react';
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { Sparkles, Send, Clock, Quote, X, Bot } from 'lucide-react';
import type { SubtitleMessage } from '../../types/subtitle';
import { toMeetingTranscript } from '../../utils/meetingMinutes';
import { askMeetingMinutes, MinutesQaAnswer } from '../../utils/minutesQa';

export interface LiveMeetingCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  history: SubtitleMessage[];
  meetingCode?: string;
}

const COPILOT_SUGGESTIONS = [
  'Khách vừa chốt quyết định gì gần nhất?',
  'Ai phụ trách các công việc cần làm?',
  'Tóm tắt 5 phút hội thoại vừa qua?',
  'Có rủi ro hay vướng mắc kỹ thuật nào không?',
];

export const LiveMeetingCopilot: React.FC<LiveMeetingCopilotProps> = ({
  isOpen,
  onClose,
  history,
}) => {
  const [query, setQuery] = useState('');
  const [activeQuestion, setActiveQuestion] = useState('');
  const [answer, setAnswer] = useState<MinutesQaAnswer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setActiveQuestion('');
      setAnswer(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAsk = (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;

    setActiveQuestion(trimmed);
    setIsProcessing(true);

    // Convert live subtitle stream to meeting transcript
    const transcript = toMeetingTranscript(history);

    // Extract quick highlights from recent messages
    const recentFinalMessages = history.filter((m) => m.isFinal).slice(-15);
    const highlights = recentFinalMessages.map(
      (m) => `${m.participantName}: ${m.translatedText || m.originalText}`,
    );

    // Contextual query over transcript
    const result = askMeetingMinutes(trimmed, transcript, {
      executiveHighlights: highlights,
      decisions: history
        .filter((m) => m.tags?.includes('decision'))
        .map((m) => m.translatedText || m.originalText),
      actionItems: history
        .filter((m) => m.tags?.includes('action_item'))
        .map((m) => ({
          task: m.translatedText || m.originalText,
          owner: m.participantName || null,
        })),
    });

    setAnswer(result);
    setIsProcessing(false);
    setQuery('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleAsk(query);
  };

  return (
    <AdaptiveDialog
      label="Trợ lý AI Live Copilot cuộc họp"
      onClose={onClose}
      className="live-meeting-copilot"
    >
      <div className="w-full max-w-xl bg-zinc-900 border border-sky-500/30 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">Live Copilot (Hỏi-đáp trong lúc họp)</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Ctrl + K
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Truy vấn riêng tư trên dữ liệu hội thoại thời gian thực, không gửi ra ngoài
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Copilot"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestions */}
        <div className="flex flex-wrap gap-1.5 shrink-0" aria-label="Gợi ý câu hỏi nhanh">
          {COPILOT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleAsk(suggestion)}
              className="text-left px-3 py-1.5 rounded-full border border-sky-500/20 bg-sky-950/30 text-sky-300 hover:bg-sky-900/40 hover:text-sky-200 text-xs transition cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Question Form */}
        <form onSubmit={handleSubmit} className="flex gap-2 shrink-0">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hỏi AI: Khách vừa nói gì? Deadline là khi nào?..."
            className="flex-1 bg-zinc-800/90 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={!query.trim() || isProcessing}
            aria-label="Gửi câu hỏi"
            className="min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-40 cursor-pointer flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Answer Display */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {answer ? (
            <div className="rounded-xl border border-sky-500/20 bg-black/40 p-3.5 space-y-3" aria-live="polite">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                <Bot className="w-4 h-4" />
                <span>{activeQuestion}</span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-200 font-medium whitespace-pre-line">
                {answer.answer}
              </p>

              {answer.citations.length > 0 && (
                <div className="pt-2.5 border-t border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <Quote className="w-3 h-3 text-sky-400" />
                    <span>Trích dẫn từ cuộc họp</span>
                  </div>
                  {answer.citations.map((c, idx) => (
                    <div key={`${c.timestamp}-${idx}`} className="text-[11px] text-zinc-400 flex items-start gap-1.5 bg-zinc-800/50 p-2 rounded-lg">
                      <Clock className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                      <span className="flex-1 leading-normal">
                        <strong className="text-zinc-200">{c.speaker}</strong>: {c.excerpt}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-500 space-y-2">
              <Sparkles className="w-8 h-8 stroke-1 text-sky-500/40" />
              <p className="text-xs">
                Nhập câu hỏi hoặc bấm vào gợi ý bên trên để hỏi AI về diễn biến cuộc họp.
              </p>
            </div>
          )}
        </div>
      </div>
    </AdaptiveDialog>
  );
};
