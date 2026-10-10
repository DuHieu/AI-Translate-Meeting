import { MeetingSchedule } from '../types/meeting';

const CUSTOM_MEETINGS_KEY = 'layameet:custom-scheduled-meetings';
const EDITED_OVERRIDES_KEY = 'layameet:edited-schedules-overrides';
const DELETED_CODES_KEY = 'layameet:deleted-scheduled-meeting-codes';

function safeGetJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSetJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or private mode
  }
}

export const calendarScheduleStorage = {
  getCustomMeetings(): MeetingSchedule[] {
    return safeGetJson<MeetingSchedule[]>(CUSTOM_MEETINGS_KEY, []);
  },

  getOverrides(): Record<string, Partial<MeetingSchedule>> {
    return safeGetJson<Record<string, Partial<MeetingSchedule>>>(EDITED_OVERRIDES_KEY, {});
  },

  getDeletedCodes(): string[] {
    return safeGetJson<string[]>(DELETED_CODES_KEY, []);
  },

  saveCustomMeeting(meeting: MeetingSchedule): void {
    const existing = this.getCustomMeetings();
    const updated = [meeting, ...existing.filter((m) => m.meetingCode !== meeting.meetingCode)];
    safeSetJson(CUSTOM_MEETINGS_KEY, updated);
  },

  updateMeeting(meetingCode: string, updates: Partial<MeetingSchedule>): void {
    const upperCode = meetingCode.toUpperCase();
    // 1. If it's a custom meeting in localStorage, update it directly
    const custom = this.getCustomMeetings();
    const idx = custom.findIndex((m) => m.meetingCode.toUpperCase() === upperCode);
    if (idx >= 0) {
      custom[idx] = { ...custom[idx], ...updates };
      safeSetJson(CUSTOM_MEETINGS_KEY, custom);
    }

    // 2. Also save an override for this code (in case it comes from backend API)
    const overrides = this.getOverrides();
    overrides[upperCode] = { ...(overrides[upperCode] || {}), ...updates };
    safeSetJson(EDITED_OVERRIDES_KEY, overrides);
  },

  deleteMeeting(meetingCode: string): void {
    const upperCode = meetingCode.toUpperCase();
    // Remove from custom meetings
    const custom = this.getCustomMeetings();
    const filtered = custom.filter((m) => m.meetingCode.toUpperCase() !== upperCode);
    safeSetJson(CUSTOM_MEETINGS_KEY, filtered);

    // Add to deleted codes list
    const deleted = this.getDeletedCodes();
    if (!deleted.includes(upperCode)) {
      deleted.push(upperCode);
      safeSetJson(DELETED_CODES_KEY, deleted);
    }
  },

  getMergedMeetings(apiMeetings: MeetingSchedule[]): MeetingSchedule[] {
    const deletedSet = new Set(this.getDeletedCodes().map((c) => c.toUpperCase()));
    const overrides = this.getOverrides();
    const customMeetings = this.getCustomMeetings();

    const map = new Map<string, MeetingSchedule>();

    // Process API meetings
    for (const m of apiMeetings) {
      const code = m.meetingCode.toUpperCase();
      if (deletedSet.has(code)) continue;
      const override = overrides[code];
      const merged = override ? { ...m, ...override } : m;
      map.set(code, merged);
    }

    // Process Custom meetings
    for (const m of customMeetings) {
      const code = m.meetingCode.toUpperCase();
      if (deletedSet.has(code)) continue;
      const override = overrides[code];
      const merged = override ? { ...m, ...override } : m;
      map.set(code, merged);
    }

    // Convert map to sorted array
    const result = Array.from(map.values());
    result.sort((a, b) => {
      const tA = a.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0;
      const tB = b.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0;
      return tA - tB;
    });

    return result;
  },
};
