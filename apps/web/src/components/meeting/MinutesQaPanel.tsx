import React, { useState } from 'react';
import { MessageCircleQuestion, Send, Sparkles } from 'lucide-react';
import type { MeetingTranscriptEntry } from '../../types/meeting';
import {
  askMeetingMinutes,
  MINUTES_QA_SUGGESTIONS,
  type MinutesQaAnswer,
  type MinutesQaRecap,
} from '../../utils/minutesQa';

interface MinutesQaPanelProps {
  transcript: MeetingTranscriptEntry[];
  recap: MinutesQaRecap;
  className?: string;
}

function formatCitationTime(timestamp: string): string {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime())
    ? timestamp
    : parsed.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const MinutesQaPanel: React.FC<MinutesQaPanelProps> = ({
  transcript,
  recap,
  className = '',
}) => {
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [answer, setAnswer] = useState<MinutesQaAnswer | null>(null);

  const handleAsk = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSubmittedQuestion(trimmed);
    setAnswer(askMeetingMinutes(trimmed, transcript, recap));
    setQuestion('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleAsk(question);
  };

  return (
    <section className={`rounded-xl border border-sky-500/20 bg-sky-950/15 p-4 ${className}`} aria-labelledby="minutes-qa-title">
      <div className="flex items-center gap-2">
        <MessageCircleQuestion className="h-4 w-4 text-sky-400" aria-hidden="true" />
        <h3 id="minutes-qa-title" className="text-sm font-semibold text-sky-200">Hỏi đáp AI với Biên bản họp</h3>
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">Truy vấn cục bộ trên recap và transcript; nội dung họp không được gửi ra ngoài.</p>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Câu hỏi gợi ý">
        {MINUTES_QA_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => handleAsk(suggestion)}
            className="rounded-full border border-sky-500/20 bg-sky-500/5 px-2.5 py-1.5 text-left text-[11px] text-sky-300 hover:bg-sky-500/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <label htmlFor="minutes-qa-question" className="sr-only">Câu hỏi về biên bản họp</label>
        <input
          id="minutes-qa-question"
          value={question}
          maxLength={500}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Hỏi về quyết định, owner, deadline…"
          className="min-h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500"
        />
        <button type="submit" disabled={!question.trim()} aria-label="Gửi câu hỏi" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </form>

      {answer && (
        <div className="mt-3 rounded-lg border border-white/[0.08] bg-black/20 p-3" aria-live="polite">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-400"><Sparkles className="h-3.5 w-3.5" /> {submittedQuestion}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-300">{answer.answer}</p>
          {answer.citations.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t border-white/[0.08] pt-2" aria-label="Nguồn trích dẫn">
              {answer.citations.map((citation, index) => (
                <li key={`${citation.timestamp}-${citation.speaker}-${index}`} className="text-[11px] leading-4 text-zinc-500">
                  <span className="font-mono text-sky-400">[{formatCitationTime(citation.timestamp)}]</span>{' '}
                  <strong className="text-zinc-400">{citation.speaker}</strong>: {citation.excerpt}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-amber-400">Không có transcript theo thời gian để tạo trích dẫn.</p>
          )}
        </div>
      )}
    </section>
  );
};
