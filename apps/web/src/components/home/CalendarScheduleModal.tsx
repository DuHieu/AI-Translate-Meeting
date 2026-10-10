import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { copyText } from '../../utils/clipboard';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { meetingApi } from '../../api/meetingApi';
import { useAuth } from '../../context/auth-context-def';
import { useLanguage } from '../../context/language-context-def';
import { AppLanguage } from '../../i18n';
import { MeetingSchedule } from '../../types/meeting';
import { CountryFlag } from '../common/CountryFlag';

interface CalendarScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScheduleNew: () => void;
  refreshKey?: number;
}

const COPY: Record<
  AppLanguage,
  {
    title: string;
    subtitle: string;
    today: string;
    scheduleNew: string;
    emptyTitle: string;
    emptyDesc: string;
    joinNow: string;
    copyLink: string;
    copiedLink: string;
    downloadIcs: string;
    googleCalendar: string;
    attendees: string;
    close: string;
    allUpcoming: string;
  }
> = {
  vi: {
    title: 'Lịch cuộc họp',
    subtitle: 'Quản lý và xem toàn bộ lịch họp trực tuyến của bạn trên hệ thống.',
    today: 'Hôm nay',
    scheduleNew: 'Đặt lịch mới',
    emptyTitle: 'Chưa có cuộc họp nào được lên lịch',
    emptyDesc: 'Bạn có thể lên lịch họp trước để gửi lời mời cho đồng nghiệp hoặc đối tác.',
    joinNow: 'Vào phòng',
    copyLink: 'Sao chép link',
    copiedLink: 'Đã sao chép!',
    downloadIcs: 'Tải .ics',
    googleCalendar: 'Google Calendar',
    attendees: 'người tham gia',
    close: 'Đóng',
    allUpcoming: 'Tất cả cuộc họp sắp tới',
  },
  en: {
    title: 'Meeting Calendar',
    subtitle: 'Manage and view all your scheduled meetings directly in LayaMeet.',
    today: 'Today',
    scheduleNew: 'Schedule Meeting',
    emptyTitle: 'No scheduled meetings found',
    emptyDesc: 'Schedule a meeting in advance and share the invite link with your team.',
    joinNow: 'Join Room',
    copyLink: 'Copy Link',
    copiedLink: 'Copied!',
    downloadIcs: 'Download .ics',
    googleCalendar: 'Google Calendar',
    attendees: 'attendees',
    close: 'Close',
    allUpcoming: 'All Upcoming Meetings',
  },
  ja: {
    title: '会議カレンダー',
    subtitle: '予約されたオンライン会議のスケジュールを確認・管理できます。',
    today: '今日',
    scheduleNew: '新規予約',
    emptyTitle: '予約された会議はありません',
    emptyDesc: '事前に会議を予約して、参加者に招待リンクを共有できます。',
    joinNow: '入室する',
    copyLink: 'リンクをコピー',
    copiedLink: 'コピー済み!',
    downloadIcs: '.icsダウンロード',
    googleCalendar: 'Googleカレンダー',
    attendees: '名参加',
    close: '閉じる',
    allUpcoming: '今後のすべての会議',
  },
  ko: {
    title: '회의 캘린더',
    subtitle: '예약된 온라인 회의 일정을 확인하고 간편하게 관리하세요.',
    today: '오늘',
    scheduleNew: '새 회의 예약',
    emptyTitle: '예정된 회의가 없습니다',
    emptyDesc: '회의를 미리 예약하고 동료들에게 초대 링크를 공유하세요.',
    joinNow: '입장하기',
    copyLink: '링크 복사',
    copiedLink: '복사 완료!',
    downloadIcs: '.ics 다운로드',
    googleCalendar: 'Google 캘린더',
    attendees: '명 참석',
    close: '닫기',
    allUpcoming: '전체 예정 회의',
  },
  zh: {
    title: '会议日程',
    subtitle: '查看并管理所有已安排的线上双语会议日程。',
    today: '今天',
    scheduleNew: '安排新会议',
    emptyTitle: '暂无已预约的会议',
    emptyDesc: '您可以提前预约会议，并将邀请链接分享给团队伙伴或客户。',
    joinNow: '进入房间',
    copyLink: '复制链接',
    copiedLink: '已复制!',
    downloadIcs: '下载 .ics',
    googleCalendar: 'Google 日历',
    attendees: '人参会',
    close: '关闭',
    allUpcoming: '所有即将开始的会议',
  },
  fr: {
    title: 'Calendrier des réunions',
    subtitle: 'Gérez et consultez l’ensemble de vos réunions en ligne planifiées.',
    today: 'Aujourd’hui',
    scheduleNew: 'Planifier',
    emptyTitle: 'Aucune réunion planifiée',
    emptyDesc: 'Planifiez une réunion à l’avance pour inviter vos collaborateurs.',
    joinNow: 'Rejoindre',
    copyLink: 'Copier le lien',
    copiedLink: 'Copié !',
    downloadIcs: 'Télécharger .ics',
    googleCalendar: 'Google Agenda',
    attendees: 'participants',
    close: 'Fermer',
    allUpcoming: 'Toutes les réunions à venir',
  },
  de: {
    title: 'Meeting-Kalender',
    subtitle: 'Verwalten und überblicken Sie alle geplanten Online-Meetings.',
    today: 'Heute',
    scheduleNew: 'Neu planen',
    emptyTitle: 'Keine geplanten Meetings',
    emptyDesc: 'Planen Sie vorab Meetings und teilen Sie Einladungslinks mit Kollegen.',
    joinNow: 'Beitreten',
    copyLink: 'Link kopieren',
    copiedLink: 'Kopiert!',
    downloadIcs: '.ics herunterladen',
    googleCalendar: 'Google Kalender',
    attendees: 'Teilnehmer',
    close: 'Schließen',
    allUpcoming: 'Alle kommenden Meetings',
  },
  es: {
    title: 'Calendario de reuniones',
    subtitle: 'Consulte y gestione todas sus reuniones programadas en línea.',
    today: 'Hoy',
    scheduleNew: 'Programar nueva',
    emptyTitle: 'No hay reuniones programadas',
    emptyDesc: 'Programe una reunión con antelación para compartir el enlace con su equipo.',
    joinNow: 'Unirse ahora',
    copyLink: 'Copiar enlace',
    copiedLink: '¡Copiado!',
    downloadIcs: 'Descargar .ics',
    googleCalendar: 'Google Calendar',
    attendees: 'participantes',
    close: 'Cerrar',
    allUpcoming: 'Todas las próximas reuniones',
  },
};

export const CalendarScheduleModal: React.FC<CalendarScheduleModalProps> = ({
  isOpen,
  onClose,
  onOpenScheduleNew,
  refreshKey = 0,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const copy = COPY[language] || COPY.vi;

  const [meetings, setMeetings] = useState<MeetingSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Selected date for interactive calendar day filtering (null = all upcoming)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const effectiveEmail =
    user?.email?.trim() || localStorage.getItem('layameet:last-user-email') || undefined;

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, effectiveEmail, refreshKey]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Calendar day calculation helpers
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    // Lead padding
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Days in current month
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

  if (!isOpen) return null;

  const handleCopyLink = async (code: string) => {
    const inviteUrl = `${window.location.origin}/prejoin/${code.toUpperCase()}`;
    if (!(await copyText(inviteUrl))) { window.prompt('Sao chép đường dẫn mời', inviteUrl); return; }
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
    language === 'ja' ? 'ja-JP' : language === 'en' ? 'en-US' : 'vi-VN',
    { month: 'long', year: 'numeric' },
  );

  return (
    <AdaptiveDialog label="Lịch cuộc họp" onClose={onClose} className="calendar-dialog">
      <div
        className="w-full max-w-none max-h-[calc(var(--app-height)-52px)] flex flex-col bg-white dark:bg-[#141519] border border-zinc-200 dark:border-[#2a2c36] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 sm:py-4 border-b border-zinc-200 dark:border-[#262832] bg-zinc-50/80 dark:bg-[#181920]/80 backdrop-blur">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="calendar-modal-title" className="text-sm sm:text-lg font-bold text-zinc-950 dark:text-white truncate">
                {copy.title}
              </h2>
              <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenScheduleNew();
              }}
              className="px-3 sm:px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/25 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{copy.scheduleNew}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={copy.close}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Two-column Calendar Grid (Left: Interactive Calendar, Right: Scheduled Meeting List) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-0 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-[#262832]">
          {/* Left Column: Interactive Month Grid */}
          <div className="md:col-span-5 p-3 sm:p-5 space-y-2.5 sm:space-y-4 bg-zinc-50/50 dark:bg-[#121317]">
            {/* Month Switcher */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 capitalize">
                {monthLabel}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label={language === 'ja' ? '前の月' : language === 'en' ? 'Previous month' : 'Tháng trước'}
                  className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMonth(new Date());
                    setSelectedDate(new Date());
                  }}
                  className="px-2 py-1 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  {copy.today}
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label={language === 'ja' ? '次の月' : language === 'en' ? 'Next month' : 'Tháng sau'}
                  className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d) => (
                <div key={d} className="py-0.5 sm:py-1">{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} className="h-8 sm:h-9" />;
                }
                const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                const hasMeetings = meetingDateSet.has(dateKey);
                const isSelected =
                  selectedDate &&
                  date.getFullYear() === selectedDate.getFullYear() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getDate() === selectedDate.getDate();

                const isToday =
                  new Date().toDateString() === date.toDateString();

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`relative h-8 sm:h-9 rounded-xl flex items-center justify-center text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isToday
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-white/[0.08]'
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

            {/* Filter Toggle */}
            <div className="pt-1 sm:pt-2">
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border transition text-center cursor-pointer ${
                  selectedDate === null
                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 dark:text-blue-300'
                    : 'bg-white dark:bg-[#1a1b22] border-zinc-200 dark:border-[#2e303c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {copy.allUpcoming} ({meetings.length})
              </button>
            </div>
          </div>

          {/* Right Column: Scheduled Meetings List */}
          <div className="md:col-span-7 p-3.5 sm:p-5 flex flex-col min-h-[210px] sm:min-h-[300px]">
            <div className="flex items-center justify-between mb-2.5 sm:mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {selectedDate
                    ? selectedDate.toLocaleDateString(
                        language === 'ja' ? 'ja-JP' : language === 'en' ? 'en-US' : 'vi-VN',
                        { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' },
                      )
                    : copy.allUpcoming}
                </span>
              </h3>
              <span className="text-[11px] font-semibold text-zinc-400">
                {filteredMeetings.length} cuộc họp
              </span>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-8 sm:py-12 text-zinc-400 text-xs">
                <span>Đang tải lịch cuộc họp...</span>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center border-2 border-dashed border-zinc-200 dark:border-[#282a35] rounded-2xl my-auto">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-zinc-100 dark:bg-[#1d1f27] text-zinc-400 flex items-center justify-center mb-2.5 sm:mb-3">
                  <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                  {copy.emptyTitle}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mb-3.5 sm:mb-4">
                  {copy.emptyDesc}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenScheduleNew();
                  }}
                  className="px-4 py-2 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{copy.scheduleNew}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-1">
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
                      })
                    : '';

                  return (
                    <div
                      key={m.meetingId}
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#1a1b22] border border-zinc-200/90 dark:border-[#2a2c38] hover:border-blue-500/40 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                            {m.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {startTime}
                            </span>
                            <span>•</span>
                            <span>{dateStr}</span>
                            {m.agenda && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[140px] italic">{m.agenda}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                            <CountryFlag code={m.defaultSpokenLanguage || 'vi'} size="xs" />
                            <span className="text-[9px] text-zinc-400">⇄</span>
                            <CountryFlag code={m.defaultTargetLanguage || 'ja'} size="xs" />
                          </div>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            {m.meetingCode}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons row */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-200/60 dark:border-white/[0.06]">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(m.meetingCode)}
                            className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
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
                            href={meetingApi.getCalendarIcsUrl(m.meetingCode)}
                            download
                            title={copy.downloadIcs}
                            className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate(`/prejoin/${m.meetingCode}`);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-xs"
                        >
                          <span>{copy.joinNow}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
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
    </AdaptiveDialog>
  );
};
