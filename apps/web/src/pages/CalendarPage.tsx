import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  CalendarCheck,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { PublicPageShell } from '../components/common/PublicPageShell';
import { CountryFlag } from '../components/common/CountryFlag';
import { ScheduleMeetingModal } from '../components/home/ScheduleMeetingModal';
import { meetingApi } from '../api/meetingApi';
import { useAuth } from '../context/auth-context-def';
import { useLanguage } from '../context/language-context-def';
import { AppLanguage } from '../i18n';
import { MeetingSchedule } from '../types/meeting';
import { copyText } from '../utils/clipboard';

interface CalendarPageProps {
  forcedLanguage?: AppLanguage;
}

const CALENDAR_COPY = {
  vi: {
    breadcrumb: 'Lịch cuộc họp',
    pageTitle: 'Lịch Cuộc Họp Trực Tuyến & Lên Lịch AI | Laya Meet',
    pageHeading: 'Lịch Cuộc Họp',
    pageSubtitle: 'Quản lý toàn bộ lịch họp trực tuyến, phòng thảo luận song ngữ và đồng bộ hóa với Google Calendar / .ics.',
    today: 'Hôm nay',
    scheduleNew: 'Đặt lịch mới',
    emptyTitle: 'Chưa có cuộc họp nào được lên lịch',
    emptyDesc: 'Lên lịch họp trước để đối tác và đồng nghiệp nhận thư mời kèm đường dẫn phòng họp tiện lợi.',
    joinNow: 'Vào phòng',
    copyLink: 'Sao chép link',
    copiedLink: 'Đã sao chép!',
    downloadIcs: 'Tải .ics',
    googleCalendar: 'Google Calendar',
    allUpcoming: 'Tất cả cuộc họp sắp tới',
    loadingText: 'Đang tải lịch cuộc họp...',
    metaDesc: 'Quản lý lịch họp song ngữ AI độ trễ cực thấp với Laya Meet. Tự động đồng bộ Google Calendar và .ics.',
    upcomingBadge: 'Lịch trình sắp tới',
    meetingUnit: 'cuộc họp',
    weekdays: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  },
  en: {
    breadcrumb: 'Meeting Calendar',
    pageTitle: 'Online Meeting Calendar & AI Scheduling | Laya Meet',
    pageHeading: 'Meeting Calendar',
    pageSubtitle: 'Manage all scheduled online meetings, bilingual rooms, and sync seamlessly with Google Calendar or .ics.',
    today: 'Today',
    scheduleNew: 'Schedule Meeting',
    emptyTitle: 'No scheduled meetings found',
    emptyDesc: 'Schedule a meeting ahead of time and share the invite link with your colleagues or clients.',
    joinNow: 'Join Room',
    copyLink: 'Copy Link',
    copiedLink: 'Copied!',
    downloadIcs: 'Download .ics',
    googleCalendar: 'Google Calendar',
    allUpcoming: 'All Upcoming Meetings',
    loadingText: 'Loading scheduled meetings...',
    metaDesc: 'Manage low-latency bilingual AI meetings with Laya Meet. Seamless sync with Google Calendar and .ics.',
    upcomingBadge: 'Upcoming Schedule',
    meetingUnit: 'meetings',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
  ja: {
    breadcrumb: '会議カレンダー',
    pageTitle: '会議カレンダー & AIスケジュール管理 | Laya Meet',
    pageHeading: '会議カレンダー',
    pageSubtitle: '予約済みの多言語オンライン会議を一覧管理し、Googleカレンダーや.ics形式で簡単に共有できます。',
    today: '今日',
    scheduleNew: '新規予約',
    emptyTitle: '予約された会議はありません',
    emptyDesc: '事前に会議を予約して、参加者に招待リンクやカレンダー登録URLを共有しましょう。',
    joinNow: '入室する',
    copyLink: 'リンクをコピー',
    copiedLink: 'コピー済み!',
    downloadIcs: '.icsダウンロード',
    googleCalendar: 'Googleカレンダー',
    allUpcoming: '今後のすべての会議',
    loadingText: '会議スケジュールを読み込み中...',
    metaDesc: 'Laya MeetのAIリアルタイム多言語会議スケジュール管理。Googleカレンダー連携と.icsエクスポート対応。',
    upcomingBadge: 'スケジュール一覧',
    meetingUnit: '件の会議',
    weekdays: ['日', '月', '火', '水', '木', '金', '土'],
  },
};

export const CalendarPage: React.FC<CalendarPageProps> = ({ forcedLanguage }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const currentLang = forcedLanguage || language;
  const copy = CALENDAR_COPY[currentLang] || CALENDAR_COPY.vi;

  const [meetings, setMeetings] = useState<MeetingSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Selected date for interactive calendar day filtering (null = all upcoming)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const effectiveEmail =
    user?.email?.trim() || localStorage.getItem('layameet:last-user-email') || undefined;

  useEffect(() => {
    document.title = copy.pageTitle;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', copy.metaDesc);
    }
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', 'https://layameet.com/calendar');
    }
  }, [copy]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    meetingApi
      .getUpcomingScheduledMeetings(effectiveEmail)
      .then((items) => {
        if (!cancelled) setMeetings(items);
      })
      .catch(() => {
        if (!cancelled) setMeetings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveEmail, refreshKey]);

  // Calendar day calculation helpers
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  // Map dates with scheduled meetings
  const meetingDateSet = useMemo(() => {
    const set = new Set<string>();
    meetings.forEach((m) => {
      if (m.scheduledStartAt) {
        const d = new Date(m.scheduledStartAt);
        set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }
    });
    return set;
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    if (!selectedDate) return meetings;
    const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
    return meetings.filter((m) => {
      if (!m.scheduledStartAt) return false;
      const d = new Date(m.scheduledStartAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === key;
    });
  }, [meetings, selectedDate]);

  const handleCopyLink = async (code: string) => {
    const inviteUrl = `${window.location.origin}/prejoin/${code.toUpperCase()}`;
    if (!(await copyText(inviteUrl))) {
      window.prompt('Sao chép đường dẫn mời', inviteUrl);
      return;
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthLabel = currentMonth.toLocaleDateString(
    currentLang === 'ja' ? 'ja-JP' : currentLang === 'en' ? 'en-US' : 'vi-VN',
    { month: 'long', year: 'numeric' },
  );

  const getGoogleCalendarUrl = (m: MeetingSchedule): string => {
    const title = encodeURIComponent(m.name || 'LayaMeet AI Meeting');
    const details = encodeURIComponent(
      `Cuộc họp LayaMeet song ngữ AI\nPhòng họp: ${window.location.origin}/prejoin/${m.meetingCode}\nMô tả: ${m.agenda || 'Không có mô tả'}`,
    );
    const location = encodeURIComponent(`${window.location.origin}/meeting/${m.meetingCode}`);

    let dates = '';
    if (m.scheduledStartAt) {
      const start = new Date(m.scheduledStartAt);
      const durationMin = m.scheduledEndAt
        ? Math.max(15, Math.round((new Date(m.scheduledEndAt).getTime() - start.getTime()) / 60000))
        : 45;
      const end = new Date(start.getTime() + durationMin * 60 * 1000);
      const formatIsoUtc = (d: Date) =>
        d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      dates = `&dates=${formatIsoUtc(start)}/${formatIsoUtc(end)}`;
    }

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}${dates}`;
  };

  return (
    <PublicPageShell
      forcedLanguage={forcedLanguage}
      activeDrawerId="calendar"
      breadcrumbs={[
        {
          label: copy.breadcrumb,
          current: true,
        },
      ]}
    >
      <div className="w-full max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        {/* ── Page Header & Call to Action ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-[#272832]/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{copy.upcomingBadge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
              {copy.pageHeading}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
              {copy.pageSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{copy.scheduleNew}</span>
            </button>
          </div>
        </div>

        {/* ── Two-Column Spacious Workspace: Calendar Matrix + Scheduled Cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Left Column: Interactive Month Calendar & Filters ── */}
          <div className="lg:col-span-5 xl:col-span-4 rounded-3xl bg-white/70 dark:bg-[#141519]/70 border border-zinc-200/80 dark:border-[#262832]/80 p-5 sm:p-6 shadow-sm backdrop-blur-md space-y-5">
            {/* Month Switcher Header */}
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 capitalize">
                {monthLabel}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label={currentLang === 'ja' ? '前の月' : currentLang === 'en' ? 'Previous month' : 'Tháng trước'}
                  className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMonth(new Date());
                    setSelectedDate(new Date());
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  {copy.today}
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label={currentLang === 'ja' ? '次の月' : currentLang === 'en' ? 'Next month' : 'Tháng sau'}
                  className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Names Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {copy.weekdays.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Monthly Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} className="h-10" />;
                }
                const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                const hasMeetings = meetingDateSet.has(dateKey);
                const isSelected =
                  selectedDate &&
                  date.getFullYear() === selectedDate.getFullYear() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getDate() === selectedDate.getDate();

                const isToday = new Date().toDateString() === date.toDateString();

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`relative h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : isToday
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <span>{date.getDate()}</span>
                    {hasMeetings && !isSelected && (
                      <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filter Toggle All Upcoming vs Selected Day */}
            <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold border transition text-center cursor-pointer ${
                  selectedDate === null
                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 dark:text-blue-300 font-bold'
                    : 'bg-zinc-50 dark:bg-[#1a1b22] border-zinc-200 dark:border-[#2e303c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {copy.allUpcoming} ({meetings.length})
              </button>
            </div>
          </div>

          {/* ── Right Column: Scheduled Meetings List ── */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {selectedDate
                    ? selectedDate.toLocaleDateString(
                        currentLang === 'ja' ? 'ja-JP' : currentLang === 'en' ? 'en-US' : 'vi-VN',
                        { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' },
                      )
                    : copy.allUpcoming}
                </span>
              </h2>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {filteredMeetings.length} {copy.meetingUnit}
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center rounded-3xl bg-white/60 dark:bg-[#141519]/60 border border-zinc-200/80 dark:border-[#262832]/80 text-zinc-500 text-sm">
                <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p>{copy.loadingText}</p>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-200 dark:border-[#282a35] rounded-3xl bg-white/40 dark:bg-[#141519]/40">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <CalendarIcon className="w-7 h-7 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {copy.emptyTitle}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6 leading-relaxed">
                  {copy.emptyDesc}
                </p>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{copy.scheduleNew}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredMeetings.map((m) => {
                  const startTime = m.scheduledStartAt
                    ? new Date(m.scheduledStartAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--';

                  const dateStr = m.scheduledStartAt
                    ? new Date(m.scheduledStartAt).toLocaleDateString([], {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '';

                  return (
                    <div
                      key={m.meetingId}
                      className="p-5 rounded-2xl bg-white dark:bg-[#15161b] border border-zinc-200/90 dark:border-[#272832] hover:border-blue-500/40 shadow-xs transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                            {m.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{startTime}</span>
                            </span>
                            <span>•</span>
                            <span>{dateStr}</span>
                            {m.scheduledStartAt && m.scheduledEndAt && (
                              <>
                                <span>•</span>
                                <span>
                                  {Math.max(
                                    15,
                                    Math.round(
                                      (new Date(m.scheduledEndAt).getTime() -
                                        new Date(m.scheduledStartAt).getTime()) /
                                        60000,
                                    ),
                                  )}{' '}
                                  phút
                                </span>
                              </>
                            )}
                          </div>
                          {m.agenda && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2 italic">
                              {m.agenda}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            <CountryFlag code={m.defaultSpokenLanguage || 'vi'} size="xs" />
                            <span className="text-[10px] text-zinc-400">⇄</span>
                            <CountryFlag code={m.defaultTargetLanguage || 'ja'} size="xs" />
                          </div>
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            {m.meetingCode}
                          </span>
                        </div>
                      </div>

                      {/* Actions Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-white/[0.06]">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(m.meetingCode)}
                            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                          >
                            {copiedCode === m.meetingCode ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500">{copy.copiedLink}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copy.copyLink}</span>
                              </>
                            )}
                          </button>

                          <a
                            href={getGoogleCalendarUrl(m)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>{copy.googleCalendar}</span>
                          </a>

                          <a
                            href={meetingApi.getCalendarIcsUrl(m.meetingCode)}
                            download
                            title={copy.downloadIcs}
                            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition"
                          >
                            <CalendarCheck className="w-4 h-4" />
                          </a>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate(`/prejoin/${m.meetingCode}`)}
                          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <span>{copy.joinNow}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Meeting Modal Dialog */}
      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        language={currentLang}
        onClose={() => setIsScheduleModalOpen(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </PublicPageShell>
  );
};
