import { useState, useCallback } from 'react';
import { meetingService } from '../services/meetingService';
import { JoinMeetingResult, SupportedLanguage } from '../types/meeting';

export function useMeeting() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMeeting = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await meetingService.createMeeting(name);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create meeting';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const joinMeeting = useCallback(async (meetingCode: string, displayName: string, spokenLanguage: SupportedLanguage = 'vi', targetLanguage: SupportedLanguage = 'vi'): Promise<JoinMeetingResult> => {
    setLoading(true);
    setError(null);
    try {
      const res = await meetingService.joinMeeting(meetingCode, {
        displayName,
        spokenLanguage,
        targetLanguage,
      });
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join meeting';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createMeeting,
    joinMeeting,
  };
}
