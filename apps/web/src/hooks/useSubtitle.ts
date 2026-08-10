import { useState, useEffect } from 'react';
import { SubtitleMessage } from '../types/subtitle';
import { subtitleWsService } from '../services/subtitleService';

interface UseSubtitleOptions {
  participantName: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export function useSubtitle(meetingId?: string, participantId?: string, options?: UseSubtitleOptions) {
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleMessage | null>(null);
  const [history, setHistory] = useState<SubtitleMessage[]>([]);

  useEffect(() => {
    if (!meetingId || !participantId || !options) return;

    let overlayTimer: number | undefined;

    subtitleWsService.connect({
      meetingId,
      participantId,
      participantName: options.participantName,
      sourceLanguage: options.sourceLanguage,
      targetLanguage: options.targetLanguage,
    });

    const unsubscribe = subtitleWsService.subscribe((msg: SubtitleMessage) => {
      setActiveSubtitle(msg);
      setHistory((prev) => [...prev, msg]);

      // Auto-clear overlay after 7 seconds
      if (overlayTimer) window.clearTimeout(overlayTimer);
      overlayTimer = window.setTimeout(() => {
        setActiveSubtitle((current) => (current?.id === msg.id ? null : current));
      }, 7000);
    });

    return () => {
      if (overlayTimer) window.clearTimeout(overlayTimer);
      unsubscribe();
      subtitleWsService.disconnect();
    };
  }, [meetingId, participantId, options]);

  return { activeSubtitle, history };
}
