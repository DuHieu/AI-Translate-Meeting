import { MeetingSessionData, MeetingHistoryItemDto } from '../types/meeting';

const SESSION_PREFIX = 'meeting-session:';
const HISTORY_KEY = 'layameet-meeting-history';

export const meetingStorage = {
  saveSession(session: MeetingSessionData): void {
    try {
      const key = `${SESSION_PREFIX}${session.meetingCode.toUpperCase()}`;
      sessionStorage.setItem(key, JSON.stringify(session));
      sessionStorage.setItem('current-meeting-code', session.meetingCode.toUpperCase());
    } catch (e) {
      console.error('Failed to save meeting session to sessionStorage', e);
    }
  },

  getSession(meetingCode: string): MeetingSessionData | null {
    try {
      const key = `${SESSION_PREFIX}${meetingCode.toUpperCase()}`;
      const data = sessionStorage.getItem(key);
      return data ? (JSON.parse(data) as MeetingSessionData) : null;
    } catch (e) {
      console.error('Failed to parse meeting session from sessionStorage', e);
      return null;
    }
  },

  clearSession(meetingCode?: string): void {
    try {
      if (meetingCode) {
        sessionStorage.removeItem(`${SESSION_PREFIX}${meetingCode.toUpperCase()}`);
      } else {
        const currentCode = sessionStorage.getItem('current-meeting-code');
        if (currentCode) {
          sessionStorage.removeItem(`${SESSION_PREFIX}${currentCode}`);
        }
      }
      sessionStorage.removeItem('current-meeting-code');
    } catch (e) {
      console.error('Failed to clear meeting session', e);
    }
  },

  getLocalHistory(): MeetingHistoryItemDto[] {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addLocalHistory(item: MeetingHistoryItemDto): void {
    try {
      const history = this.getLocalHistory();
      const existingIdx = history.findIndex(h => h.meetingCode === item.meetingCode);
      if (existingIdx >= 0) {
        history[existingIdx] = { ...history[existingIdx], ...item };
      } else {
        history.unshift(item);
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
    } catch {
      // ignore
    }
  },
};
