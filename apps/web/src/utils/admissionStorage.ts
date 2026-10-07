const HOST_TOKEN_PREFIX = 'meeting-host-token:';
const PENDING_TOKEN_PREFIX = 'meeting-pending-token:';
const INVITE_TOKEN_PREFIX = 'meeting-invite-token:';

function key(prefix: string, meetingCode: string): string {
  return `${prefix}${meetingCode.trim().toUpperCase()}`;
}

export const admissionStorage = {
  saveHostToken(meetingCode: string, token: string): void {
    const k = key(HOST_TOKEN_PREFIX, meetingCode);
    sessionStorage.setItem(k, token);
    try {
      localStorage.setItem(k, token);
    } catch {
      // Ignore storage quota issues
    }
  },

  getHostToken(meetingCode: string): string | null {
    const k = key(HOST_TOKEN_PREFIX, meetingCode);
    return sessionStorage.getItem(k) || localStorage.getItem(k);
  },

  clearHostToken(meetingCode: string): void {
    const k = key(HOST_TOKEN_PREFIX, meetingCode);
    sessionStorage.removeItem(k);
    try {
      localStorage.removeItem(k);
    } catch {
      // Ignore storage issues
    }
  },

  saveInviteToken(meetingCode: string, token: string): void {
    localStorage.setItem(key(INVITE_TOKEN_PREFIX, meetingCode), token);
  },

  getInviteToken(meetingCode: string): string | null {
    return localStorage.getItem(key(INVITE_TOKEN_PREFIX, meetingCode));
  },

  clearInviteToken(meetingCode: string): void {
    localStorage.removeItem(key(INVITE_TOKEN_PREFIX, meetingCode));
  },

  savePendingToken(meetingCode: string, token: string): void {
    sessionStorage.setItem(key(PENDING_TOKEN_PREFIX, meetingCode), token);
  },

  getPendingToken(meetingCode: string): string | null {
    return sessionStorage.getItem(key(PENDING_TOKEN_PREFIX, meetingCode));
  },

  clearPendingToken(meetingCode: string): void {
    sessionStorage.removeItem(key(PENDING_TOKEN_PREFIX, meetingCode));
  },
};
