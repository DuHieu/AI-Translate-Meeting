const HOST_TOKEN_PREFIX = 'meeting-host-token:';
const PENDING_TOKEN_PREFIX = 'meeting-pending-token:';

function key(prefix: string, meetingCode: string): string {
  return `${prefix}${meetingCode.trim().toUpperCase()}`;
}

export const admissionStorage = {
  saveHostToken(meetingCode: string, token: string): void {
    sessionStorage.setItem(key(HOST_TOKEN_PREFIX, meetingCode), token);
  },

  getHostToken(meetingCode: string): string | null {
    return sessionStorage.getItem(key(HOST_TOKEN_PREFIX, meetingCode));
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
