import { useState, useEffect } from 'react';
import { SubtitleMessage } from '../types/subtitle';
import { subtitleWsService } from '../services/subtitleService';

export function useSubtitle(meetingId?: string, participantId?: string) {
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleMessage | null>(null);
  const [history, setHistory] = useState<SubtitleMessage[]>([]);

  useEffect(() => {
    if (!meetingId || !participantId) return;

    subtitleWsService.connect(meetingId, participantId);

    const unsubscribe = subtitleWsService.subscribe((msg: SubtitleMessage) => {
      setActiveSubtitle(msg);
      setHistory((prev) => [...prev, msg]);

      // Auto-clear overlay after 7 seconds
      const timer = setTimeout(() => {
        setActiveSubtitle((current) => (current?.id === msg.id ? null : current));
      }, 7000);

      return () => clearTimeout(timer);
    });

    return () => {
      unsubscribe();
      subtitleWsService.disconnect();
    };
  }, [meetingId, participantId]);

  return { activeSubtitle, history };
}
