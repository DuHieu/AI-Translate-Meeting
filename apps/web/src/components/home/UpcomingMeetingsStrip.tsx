import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BellRing, Calendar, CalendarPlus, Clock3, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { meetingApi } from '../../api/meetingApi';
import { useAuth } from '../../context/auth-context-def';
import { useLanguage } from '../../context/language-context-def';
import { AppLanguage } from '../../i18n';
import { MeetingSchedule } from '../../types/meeting';
import { CountryFlag } from '../common/CountryFlag';

interface UpcomingMeetingsStripProps {
  refreshKey?: number;
  onOpenCalendar?: () => void;
}

const COPY: Record<AppLanguage, {
  heading: string;
  attendees: string;
  open: string;
  soon: string;
  minutes: (value: number) => string;
  hours: (value: number) => string;
  reminder: (name: string, minutes: number) => string;
  calendar: string;
  enter: string;
  viewAllCalendar: string;
}> = {
  vi: {
    heading: 'Cuộc họp sắp tới',
    attendees: 'tham gia',
    open: 'Đang mở',
    soon: 'Sắp diễn ra',
    minutes: (value) => `Còn ${value} phút`,
    hours: (value) => `Còn ${value} giờ`,
    reminder: (name, minutes) => `${name} sẽ bắt đầu sau ${minutes} phút.`,
    calendar: 'Tải lịch nhắc',
    enter: 'Vào phòng / RSVP',
    viewAllCalendar: 'Xem lịch',
  },
  en: {
    heading: 'Upcoming meetings',
    attendees: 'going',
    open: 'Open now',
    soon: 'Starting soon',
    minutes: (value) => `In ${value} min`,
    hours: (value) => `In ${value} hr`,
    reminder: (name, minutes) => `${name} starts in ${minutes} minutes.`,
    calendar: 'Add reminder',
    enter: 'Enter / RSVP',
    viewAllCalendar: 'View calendar',
  },
  ja: {
    heading: '今後の会議',
    attendees: '参加予定',
    open: '開催中',
    soon: 'まもなく開始',
    minutes: (value) => `あと${value}分`,
    hours: (value) => `あと${value}時間`,
    reminder: (name, minutes) => `${name} は${minutes}分後に始まります。`,
    calendar: '予定を追加',
    enter: '入室 / RSVP',
    viewAllCalendar: 'カレンダーを表示',
  },
  ko: {
    heading: '예정된 회의',
    attendees: '참석 예정',
    open: '진행 중',
    soon: '곧 시작',
    minutes: (value) => `${value}분 후`,
    hours: (value) => `${value}시간 후`,
    reminder: (name, minutes) => `${name} 회의가 ${minutes}분 후에 시작됩니다.`,
    calendar: '일정 추가',
    enter: '입장 / RSVP',
    viewAllCalendar: '전체 일정 보기',
  },
  zh: {
    heading: '近期即将开始的会议',
    attendees: '人参加',
    open: '进行中',
    soon: '即将开始',
    minutes: (value) => `还有 ${value} 分钟`,
    hours: (value) => `还有 ${value} 小时`,
    reminder: (name, minutes) => `${name} 将在 ${minutes} 分钟后开始。`,
    calendar: '添加到日历',
    enter: '进入房间 / RSVP',
    viewAllCalendar: '查看会议日程',
  },
  fr: {
    heading: 'Réunions à venir',
    attendees: 'participants',
    open: 'En cours',
    soon: 'Démarre bientôt',
    minutes: (value) => `Dans ${value} min`,
    hours: (value) => `Dans ${value} h`,
    reminder: (name, minutes) => `${name} commence dans ${minutes} minutes.`,
    calendar: 'Ajouter au calendrier',
    enter: 'Entrer / RSVP',
    viewAllCalendar: 'Voir le calendrier',
  },
  de: {
    heading: 'Kommende Meetings',
    attendees: 'Teilnehmer',
    open: 'Jetzt geöffnet',
    soon: 'Beginnt gleich',
    minutes: (value) => `In ${value} Min.`,
    hours: (value) => `In ${value} Std.`,
    reminder: (name, minutes) => `${name} beginnt in ${minutes} Minuten.`,
    calendar: 'Termin merken',
    enter: 'Beitreten / RSVP',
    viewAllCalendar: 'Kalender ansehen',
  },
  es: {
    heading: 'Próximas reuniones',
    attendees: 'participantes',
    open: 'En curso',
    soon: 'Comienza pronto',
    minutes: (value) => `En ${value} min`,
    hours: (value) => `En ${value} h`,
    reminder: (name, minutes) => `${name} comienza en ${minutes} minutos.`,
    calendar: 'Guardar recordatorio',
    enter: 'Entrar / RSVP',
    viewAllCalendar: 'Ver calendario',
  },
};

function getCountdownLabel(
  meeting: MeetingSchedule,
  now: number,
  copy: (typeof COPY)[AppLanguage],
): string {
  const startsAt = meeting.scheduledStartAt ? Date.parse(meeting.scheduledStartAt) : Number.NaN;
  if (!Number.isFinite(startsAt) || startsAt <= now) return copy.open;

  const minutes = Math.max(1, Math.ceil((startsAt - now) / 60_000));
  if (minutes <= 5) return copy.soon;
  if (minutes < 60) return copy.minutes(minutes);
  return copy.hours(Math.ceil(minutes / 60));
}

export const UpcomingMeetingsStrip: React.FC<UpcomingMeetingsStripProps> = ({
  refreshKey = 0,
  onOpenCalendar,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const copy = COPY[language] || COPY.vi;
  const [meetings, setMeetings] = useState<MeetingSchedule[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const emailToQuery = user?.email?.trim() || localStorage.getItem('layameet:last-user-email') || undefined;
    meetingApi
      .getUpcomingScheduledMeetings(emailToQuery)
      .then((items) => {
        if (!cancelled) setMeetings(items);
      })
      .catch(() => {
        if (!cancelled) setMeetings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.email, refreshKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const reminder = useMemo(() => meetings.find((meeting) => {
    if (!meeting.scheduledStartAt) return false;
    const difference = Date.parse(meeting.scheduledStartAt) - now;
    return difference > 0 && difference <= 15 * 60_000;
  }), [meetings, now]);

  useEffect(() => {
    if (!reminder || !reminder.scheduledStartAt || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    const key = `layameet:schedule-notified:${reminder.meetingCode}:${reminder.scheduledStartAt}`;
    if (sessionStorage.getItem(key)) return;

    const minutes = Math.max(1, Math.ceil((Date.parse(reminder.scheduledStartAt) - now) / 60_000));
    try {
      new Notification('LayaMeet', { body: copy.reminder(reminder.name, minutes) });
      sessionStorage.setItem(key, '1');
    } catch {
      // The in-app reminder remains visible if the browser blocks system notifications.
    }
  }, [copy, now, reminder]);

  if (meetings.length === 0) return null;

  const locale = language === 'ja' ? 'ja-JP' : language === 'en' ? 'en-US' : 'vi-VN';

  return (
    <section className="space-y-2.5 pt-1" aria-labelledby="upcoming-meetings-title">
      {reminder?.scheduledStartAt && (
        <button
          type="button"
          onClick={() => navigate(`/meeting/${reminder.meetingCode}`)}
          className="w-full rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900 shadow-xs transition-colors hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/45 dark:text-amber-200 dark:hover:bg-amber-950/70"
        >
          <span className="flex items-center gap-2 font-semibold">
            <BellRing className="h-4 w-4 shrink-0" />
            <span>
              {copy.reminder(
                reminder.name,
                Math.max(1, Math.ceil((Date.parse(reminder.scheduledStartAt) - now) / 60_000)),
              )}
            </span>
          </span>
        </button>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2
          id="upcoming-meetings-title"
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400"
        >
          <Clock3 className="h-3.5 w-3.5" />
          {copy.heading}
        </h2>
        {onOpenCalendar && (
          <button
            type="button"
            onClick={onOpenCalendar}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{copy.viewAllCalendar}</span>
          </button>
        )}
      </div>

      <div className="flex snap-x gap-3 overflow-x-auto pb-1" role="list">
        {meetings.map((meeting) => (
          <article
            key={meeting.meetingId}
            role="listitem"
            className="min-w-[270px] max-w-[320px] snap-start rounded-xl border border-zinc-200 bg-white/90 p-3.5 shadow-xs dark:border-zinc-800 dark:bg-[#17181c]/95"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-950 dark:text-white">
                  {meeting.name}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {meeting.scheduledStartAt
                    ? new Date(meeting.scheduledStartAt).toLocaleString(locale, {
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : meeting.timezone}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                {getCountdownLabel(meeting, now, copy)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-300">
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                {meeting.meetingCode}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                <Users className="h-3 w-3" />
                {meeting.goingCount} {copy.attendees}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium">
                <CountryFlag code={meeting.defaultSpokenLanguage || 'vi'} size="xs" />
                <span className="text-[9px] text-zinc-400">⇄</span>
                <CountryFlag code={meeting.defaultTargetLanguage || 'ja'} size="xs" />
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <a
                href={meetingApi.getCalendarIcsUrl(meeting.meetingCode)}
                download
                title={copy.calendar}
                aria-label={`${copy.calendar}: ${meeting.name}`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-300"
              >
                <CalendarPlus className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => navigate(`/prejoin/${meeting.meetingCode}`)}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
              >
                {copy.enter}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
