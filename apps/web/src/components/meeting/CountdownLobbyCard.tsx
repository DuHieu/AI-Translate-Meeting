import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Loader2,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { meetingApi } from '../../api/meetingApi';
import { MeetingSchedule, SubmitRsvpRequest } from '../../types/meeting';
import { CountryFlag } from '../common/CountryFlag';

type RsvpStatus = SubmitRsvpRequest['status'];

interface CountdownLobbyCardProps {
  schedule: MeetingSchedule;
  displayName: string;
  email?: string | null;
  spokenLanguage: string;
  targetLanguage: string;
  hasPreApprovedPass: boolean;
  onPreApproved: (token: string) => void;
  onScheduleChange: (schedule: MeetingSchedule) => void;
}

function formatScheduledTime(schedule: MeetingSchedule): string | null {
  if (!schedule.scheduledStartAt) return null;
  try {
    return new Date(schedule.scheduledStartAt).toLocaleString('vi-VN', {
      timeZone: schedule.timezone || undefined,
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return new Date(schedule.scheduledStartAt).toLocaleString('vi-VN');
  }
}

function getCountdown(startsAt: string | null | undefined, now: number): string | null {
  if (!startsAt) return null;
  const difference = Date.parse(startsAt) - now;
  if (difference <= 0) return 'Đang mở';

  const totalSeconds = Math.ceil(difference / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [days > 0 ? `${days} ngày` : null, `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`]
    .filter(Boolean)
    .join(' · ');
}

export const CountdownLobbyCard: React.FC<CountdownLobbyCardProps> = ({
  schedule,
  displayName,
  email,
  spokenLanguage,
  targetLanguage,
  hasPreApprovedPass,
  onPreApproved,
  onScheduleChange,
}) => {
  const [now, setNow] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState<RsvpStatus | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RsvpStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = getCountdown(schedule.scheduledStartAt, now);
  const scheduledTime = useMemo(() => formatScheduledTime(schedule), [schedule]);
  const visibleAttendees = schedule.attendees.filter(
    (attendee) => attendee.status === 'going' || attendee.status === 'maybe',
  );

  const handleRsvp = async (status: RsvpStatus) => {
    if (!displayName.trim()) {
      setError('Vui lòng nhập Tên hiển thị trước khi RSVP.');
      return;
    }

    setSubmitting(status);
    setError(null);
    try {
      const response = await meetingApi.submitRsvp(schedule.meetingCode, {
        displayName: displayName.trim(),
        email: email?.trim() || null,
        status,
        spokenLanguage,
        targetLanguage,
      });
      setSelectedStatus(status);

      if ((status === 'going' || status === 'maybe') && response.preApprovedAdmissionToken) {
        onPreApproved(response.preApprovedAdmissionToken);
      }

      try {
        const refreshedSchedule = await meetingApi.getMeetingSchedule(schedule.meetingCode);
        onScheduleChange(refreshedSchedule);
      } catch {
        // RSVP and the admission pass are already valid; attendee refresh is best-effort.
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể gửi RSVP. Vui lòng thử lại.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <section
      aria-labelledby="countdown-lobby-title"
      className="mx-3.5 mt-3 overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-50/80 shadow-xs dark:border-zinc-800 dark:bg-[#14151a] md:mx-6"
    >
      <div className="grid gap-4 p-3.5 md:grid-cols-[1fr_auto] md:p-4">
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white dark:text-zinc-900">
              <CalendarClock className="h-3.5 w-3.5" /> Countdown Lobby
            </span>
            {countdown && (
              <span
                aria-live="polite"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200"
              >
                <Clock3 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                {countdown}
              </span>
            )}
          </div>

          <div>
            <h2 id="countdown-lobby-title" className="truncate text-sm font-bold text-zinc-950 dark:text-white">
              {schedule.name}
            </h2>
            {scheduledTime && (
              <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                {scheduledTime}
              </p>
            )}
          </div>

          {schedule.agenda && (
            <div className="rounded-lg border border-zinc-200/80 bg-white/80 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" /> Agenda / AI Context
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                {schedule.agenda}
              </p>
            </div>
          )}

          {visibleAttendees.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <Users className="h-3.5 w-3.5" />
                {schedule.goingCount} Going · {schedule.maybeCount} Maybe
              </p>
              <div className="flex flex-wrap gap-1.5">
                {visibleAttendees.map((attendee) => (
                  <span
                    key={attendee.rsvpId}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      attendee.status === 'going'
                        ? 'border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                    }`}
                  >
                    <CountryFlag code={attendee.spokenLanguage} size="xs" />
                    <span>{attendee.displayName}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-[220px] flex-col justify-center gap-2 md:max-w-[250px]">
          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Xác nhận tham dự</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 md:grid-cols-1">
            <button
              type="button"
              onClick={() => handleRsvp('going')}
              disabled={submitting !== null}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-2 text-[11px] font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
            >
              {submitting === 'going' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Tham gia (Going)
            </button>
            <button
              type="button"
              onClick={() => handleRsvp('maybe')}
              disabled={submitting !== null}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            >
              {submitting === 'maybe' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HelpCircle className="h-3.5 w-3.5" />}
              Có thể (Maybe)
            </button>
            <button
              type="button"
              onClick={() => handleRsvp('declined')}
              disabled={submitting !== null}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-[11px] font-bold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {submitting === 'declined' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Từ chối (Declined)
            </button>
          </div>

          {schedule.scheduledStartAt && (
            <a
              href={meetingApi.getCalendarIcsUrl(schedule.meetingCode)}
              download
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Tải Calendar Reminder (.ics)
            </a>
          )}

          {hasPreApprovedPass && (
            <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] font-semibold leading-relaxed text-emerald-800 dark:text-emerald-300">
              Đã xác nhận tham gia · Cấp vé vào thẳng phòng (Không cần chờ Host duyệt)
            </div>
          )}
          {!hasPreApprovedPass && selectedStatus && (
            <p role="status" className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              Đã ghi nhận RSVP: {selectedStatus}.
            </p>
          )}
          {error && (
            <p role="alert" className="text-[11px] font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
