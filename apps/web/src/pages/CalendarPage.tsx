import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  LayoutGrid,
  ListFilter,
  Search,
  Edit3,
} from 'lucide-react';
import { PublicPageShell } from '../components/common/PublicPageShell';
import { CountryFlag } from '../components/common/CountryFlag';
import { ScheduleMeetingModal } from '../components/home/ScheduleMeetingModal';
import { EditMeetingModal } from '../components/home/EditMeetingModal';
import { meetingApi } from '../api/meetingApi';
import { useAuth } from '../context/auth-context-def';
import { useLanguage } from '../context/language-context-def';
import { AppLanguage } from '../i18n';
import { MeetingSchedule } from '../types/meeting';
import { calendarScheduleStorage } from '../utils/calendarScheduleStorage';
import { copyText } from '../utils/clipboard';

interface CalendarPageProps {
  forcedLanguage?: AppLanguage;
}

type CalendarViewMode = 'grid' | 'list';

const CALENDAR_COPY = {
  vi: {
    breadcrumb: 'Lịch cuộc họp',
    pageTitle: 'Lịch Cuộc Họp Trực Tuyến & Lên Lịch AI | Laya Meet',
    pageHeading: 'Lịch Cuộc Họp',
    pageSubtitle: 'Quản lý và chỉnh sửa lịch họp trực tiếp trên giao diện lịch thông minh, đồng bộ Google Calendar & .ics.',
    today: 'Hôm nay',
    scheduleNew: 'Đặt lịch mới',
    emptyTitle: 'Chưa có cuộc họp nào được lên lịch',
    emptyDesc: 'Lên lịch họp trước để đối tác và đồng nghiệp nhận thư mời kèm đường dẫn phòng họp tiện lợi.',
    joinNow: 'Vào phòng',
    copyLink: 'Sao chép link',
    copiedLink: 'Đã sao chép!',
    downloadIcs: 'Tải .ics',
    googleCalendar: 'Google Calendar',
    allUpcoming: 'Tất cả cuộc họp',
    loadingText: 'Đang tải lịch cuộc họp...',
    metaDesc: 'Quản lý lịch họp song ngữ AI độ trễ cực thấp với Laya Meet. Chỉnh sửa trực tiếp trên lịch và tự động đồng bộ.',
    upcomingBadge: 'Lịch trình tương tác',
    meetingUnit: 'cuộc họp',
    weekdays: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    viewMonth: 'Lịch tháng',
    viewList: 'Lịch trình chi tiết',
    editMeeting: 'Chỉnh sửa',
    quickAdd: 'Đặt lịch',
    moreMeetings: (n: number) => `+${n} khác`,
    searchPlaceholder: 'Tìm kiếm cuộc họp theo tên hoặc mã phòng...',
    filterByDay: 'Lọc theo ngày đã chọn',
    showAll: 'Xem tất cả',
    clickToEditHint: 'Nhấp vào cuộc họp để chỉnh sửa trực tiếp',
  },
  en: {
    breadcrumb: 'Meeting Calendar',
    pageTitle: 'Online Meeting Calendar & AI Scheduling | Laya Meet',
    pageHeading: 'Meeting Calendar',
    pageSubtitle: 'Manage and edit scheduled meetings directly on the interactive full calendar, sync with Google Calendar & .ics.',
    today: 'Today',
    scheduleNew: 'Schedule Meeting',
    emptyTitle: 'No scheduled meetings found',
    emptyDesc: 'Schedule a meeting ahead of time and share the invite link with your colleagues or clients.',
    joinNow: 'Join Room',
    copyLink: 'Copy Link',
    copiedLink: 'Copied!',
    downloadIcs: 'Download .ics',
    googleCalendar: 'Google Calendar',
    allUpcoming: 'All Meetings',
    loadingText: 'Loading scheduled meetings...',
    metaDesc: 'Manage low-latency bilingual AI meetings with Laya Meet. Edit directly in-calendar and sync seamlessly.',
    upcomingBadge: 'Interactive Schedule',
    meetingUnit: 'meetings',
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    viewMonth: 'Month Grid',
    viewList: 'Schedule List',
    editMeeting: 'Edit',
    quickAdd: 'Add meeting',
    moreMeetings: (n: number) => `+${n} more`,
    searchPlaceholder: 'Search meetings by title or room code...',
    filterByDay: 'Filtered by selected day',
    showAll: 'Show All',
    clickToEditHint: 'Click any meeting to edit directly on calendar',
  },
  ja: {
    breadcrumb: '会議カレンダー',
    pageTitle: '会議カレンダー & AIスケジュール管理 | Laya Meet',
    pageHeading: '会議カレンダー',
    pageSubtitle: 'インタラクティブなカレンダー上で会議の日時や設定を直接編集し、Googleカレンダーや.icsで同期できます。',
    today: '今日',
    scheduleNew: '新規予約',
    emptyTitle: '予約された会議はありません',
    emptyDesc: '事前に会議を予約して、参加者に招待リンクやカレンダー登録URLを共有しましょう。',
    joinNow: '入室する',
    copyLink: 'リンクをコピー',
    copiedLink: 'コピー済み!',
    downloadIcs: '.icsダウンロード',
    googleCalendar: 'Googleカレンダー',
    allUpcoming: 'すべての会議',
    loadingText: '会議スケジュールを読み込み中...',
    metaDesc: 'Laya MeetのAIリアルタイム多言語会議スケジュール管理。カレンダー上で直接編集可能。',
    upcomingBadge: '対話型カレンダー',
    meetingUnit: '件の会議',
    weekdays: ['月', '火', '水', '木', '金', '土', '日'],
    viewMonth: '月表示',
    viewList: '一覧リスト',
    editMeeting: '編集',
    quickAdd: '追加',
    moreMeetings: (n: number) => `他${n}件`,
    searchPlaceholder: '会議名またはコードで検索...',
    filterByDay: '選択した日付で絞り込み',
    showAll: 'すべて表示',
    clickToEditHint: '会議をクリックして直接編集できます',
  },
  ko: {
    breadcrumb: '회의 캘린더',
    pageTitle: '회의 캘린더 & AI 일정 관리 | Laya Meet',
    pageHeading: '회의 캘린더',
    pageSubtitle: '캘린더에서 회의 일정을 직접 편집하고 Google 캘린더 및 .ics 파일과 간편하게 동기화하세요.',
    today: '오늘',
    scheduleNew: '새 회의 예약',
    emptyTitle: '예정된 회의가 없습니다',
    emptyDesc: '회의를 미리 예약하고 동료들에게 초대 링크를 공유하세요.',
    joinNow: '입장하기',
    copyLink: '링크 복사',
    copiedLink: '복사 완료!',
    downloadIcs: '.ics 다운로드',
    googleCalendar: 'Google 캘린더',
    allUpcoming: '전체 예정 회의',
    loadingText: '회의 일정을 불러오는 중...',
    metaDesc: 'Laya Meet AI 화상회의 일정 관리. 캘린더에서 직접 편집 및 동기화 지원.',
    upcomingBadge: '인터랙티브 일정',
    meetingUnit: '건의 회의',
    weekdays: ['월', '화', '수', '목', '금', '토', '일'],
    viewMonth: '월간 캘린더',
    viewList: '상세 일정 목록',
    editMeeting: '수정',
    quickAdd: '회의 추가',
    moreMeetings: (n: number) => `+${n}건 더보기`,
    searchPlaceholder: '회의 제목 또는 코드로 검색...',
    filterByDay: '선택한 날짜 필터링',
    showAll: '전체 보기',
    clickToEditHint: '회의를 클릭하여 바로 편집할 수 있습니다',
  },
  zh: {
    breadcrumb: '会议日程日历',
    pageTitle: '双语视频会议日历 & AI排程 | Laya Meet',
    pageHeading: '会议日程',
    pageSubtitle: '直接在月历网格上查看与编辑会议安排，轻松同步 Google 日历与 .ics 格式。',
    today: '今天',
    scheduleNew: '安排新会议',
    emptyTitle: '暂无已预约的会议',
    emptyDesc: '您可以提前预约会议，并将邀请链接分享给团队伙伴或客户。',
    joinNow: '进入房间',
    copyLink: '复制链接',
    copiedLink: '已复制!',
    downloadIcs: '下载 .ics',
    googleCalendar: 'Google 日历',
    allUpcoming: '所有会议',
    loadingText: '正在加载会议日程...',
    metaDesc: 'Laya Meet 低延迟双语会议日历。支持在日历上直接编辑并自动同步。',
    upcomingBadge: '交互式日历',
    meetingUnit: '场会议',
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    viewMonth: '月历网格',
    viewList: '详细列表',
    editMeeting: '编辑',
    quickAdd: '快捷添加',
    moreMeetings: (n: number) => `+${n} 个更多`,
    searchPlaceholder: '输入会议名称或代码进行搜索...',
    filterByDay: '按选中日期筛选',
    showAll: '查看全部',
    clickToEditHint: '点击会议卡片可直接编辑',
  },
  fr: {
    breadcrumb: 'Calendrier des réunions',
    pageTitle: 'Calendrier des réunions en ligne & IA | Laya Meet',
    pageHeading: 'Calendrier des réunions',
    pageSubtitle: 'Consultez et modifiez vos réunions directement sur la grille interactive, synchronisée avec Google Agenda & .ics.',
    today: 'Aujourd’hui',
    scheduleNew: 'Planifier',
    emptyTitle: 'Aucune réunion planifiée',
    emptyDesc: 'Planifiez une réunion à l’avance pour inviter vos collaborateurs.',
    joinNow: 'Rejoindre',
    copyLink: 'Copier le lien',
    copiedLink: 'Copié !',
    downloadIcs: 'Télécharger .ics',
    googleCalendar: 'Google Agenda',
    allUpcoming: 'Toutes les réunions',
    loadingText: 'Chargement des réunions...',
    metaDesc: 'Gestion de calendrier de réunions IA bilingues avec Laya Meet. Édition directe sur le calendrier.',
    upcomingBadge: 'Calendrier interactif',
    meetingUnit: 'réunions',
    weekdays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    viewMonth: 'Vue Mois',
    viewList: 'Vue Liste',
    editMeeting: 'Modifier',
    quickAdd: 'Ajouter',
    moreMeetings: (n: number) => `+${n} autres`,
    searchPlaceholder: 'Rechercher par titre ou code...',
    filterByDay: 'Filtré par date sélectionnée',
    showAll: 'Tout afficher',
    clickToEditHint: 'Cliquez sur une réunion pour la modifier',
  },
  de: {
    breadcrumb: 'Meeting-Kalender',
    pageTitle: 'Online-Meeting-Kalender & KI-Termine | Laya Meet',
    pageHeading: 'Meeting-Kalender',
    pageSubtitle: 'Bearbeiten Sie Termine direkt im interaktiven Monatskalender, nahtlos synchronisiert mit Google Kalender & .ics.',
    today: 'Heute',
    scheduleNew: 'Neu planen',
    emptyTitle: 'Keine geplanten Meetings',
    emptyDesc: 'Planen Sie vorab Meetings und teilen Sie Einladungslinks mit Kollegen.',
    joinNow: 'Beitreten',
    copyLink: 'Link kopieren',
    copiedLink: 'Kopiert!',
    downloadIcs: '.ics herunterladen',
    googleCalendar: 'Google Kalender',
    allUpcoming: 'Alle Meetings',
    loadingText: 'Lade Meetings...',
    metaDesc: 'Verwalten Sie zweisprachige KI-Meetings mit Laya Meet. Direkt im Kalender bearbeitbar.',
    upcomingBadge: 'Interaktiver Kalender',
    meetingUnit: 'Meetings',
    weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    viewMonth: 'Monatsansicht',
    viewList: 'Listenansicht',
    editMeeting: 'Bearbeiten',
    quickAdd: 'Hinzufügen',
    moreMeetings: (n: number) => `+${n} weitere`,
    searchPlaceholder: 'Nach Titel oder Code suchen...',
    filterByDay: 'Nach gewähltem Datum gefiltert',
    showAll: 'Alle anzeigen',
    clickToEditHint: 'Klicken Sie auf ein Meeting zum direkten Bearbeiten',
  },
  es: {
    breadcrumb: 'Calendario de reuniones',
    pageTitle: 'Calendario de reuniones en línea & IA | Laya Meet',
    pageHeading: 'Calendario de reuniones',
    pageSubtitle: 'Gestione y edite reuniones directamente en el calendario interactivo, sincronizado con Google Calendar & .ics.',
    today: 'Hoy',
    scheduleNew: 'Programar nueva',
    emptyTitle: 'No hay reuniones programadas',
    emptyDesc: 'Programe una reunión con antelación para compartir el enlace con su equipo.',
    joinNow: 'Unirse ahora',
    copyLink: 'Copiar enlace',
    copiedLink: '¡Copiado!',
    downloadIcs: 'Descargar .ics',
    googleCalendar: 'Google Calendar',
    allUpcoming: 'Todas las reuniones',
    loadingText: 'Cargando reuniones...',
    metaDesc: 'Gestión de calendario de reuniones bilingües con IA en Laya Meet. Edición directa en el calendario.',
    upcomingBadge: 'Calendario interactivo',
    meetingUnit: 'reuniones',
    weekdays: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    viewMonth: 'Vista mensual',
    viewList: 'Vista de lista',
    editMeeting: 'Editar',
    quickAdd: 'Agregar',
    moreMeetings: (n: number) => `+${n} más`,
    searchPlaceholder: 'Buscar por título o código de reunión...',
    filterByDay: 'Filtrado por día seleccionado',
    showAll: 'Mostrar todo',
    clickToEditHint: 'Haga clic en una reunión para editarla',
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

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleModalInitialDate, setScheduleModalInitialDate] = useState<Date | null>(null);
  const [selectedMeetingToEdit, setSelectedMeetingToEdit] = useState<MeetingSchedule | null>(null);

  // Calendar view mode (Grid or List)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('grid');

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Selected date for day filtering
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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

  // Load meetings and merge with client-side persistent storage
  const loadMeetings = useCallback(() => {
    setLoading(true);
    meetingApi
      .getUpcomingScheduledMeetings(effectiveEmail)
      .then((items) => {
        const merged = calendarScheduleStorage.getMergedMeetings(items);
        setMeetings(merged);
      })
      .catch(() => {
        const fallbackMerged = calendarScheduleStorage.getMergedMeetings([]);
        setMeetings(fallbackMerged);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [effectiveEmail]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  // Calendar day calculation helpers (Monday-first: 0=Mon ... 6=Sun)
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // In JS: getDay() returns 0 for Sunday, 1 for Monday...
    // We want Monday as index 0, Sunday as index 6
    const firstDaySundayBased = new Date(year, month, 1).getDay();
    const firstDayIndex = (firstDaySundayBased + 6) % 7; // 0 is Monday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  // Map meetings by date string key (YYYY-MM-DD)
  const meetingsByDateMap = useMemo(() => {
    const map = new Map<string, MeetingSchedule[]>();
    meetings.forEach((m) => {
      if (m.scheduledStartAt) {
        const d = new Date(m.scheduledStartAt);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(m);
      }
    });

    // Sort meetings within each day chronologically
    map.forEach((list) => {
      list.sort((a, b) => {
        const tA = a.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0;
        const tB = b.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0;
        return tA - tB;
      });
    });

    return map;
  }, [meetings]);

  // Filtered meetings list for List View or Day View
  const displayedMeetings = useMemo(() => {
    let result = meetings;

    if (selectedDate) {
      const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
      result = result.filter((m) => {
        if (!m.scheduledStartAt) return false;
        const d = new Date(m.scheduledStartAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === key;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.meetingCode && m.meetingCode.toLowerCase().includes(q)) ||
          (m.agenda && m.agenda.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [meetings, selectedDate, searchQuery]);

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

  const handleToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(null);
  };

  const monthLabel = currentMonth.toLocaleDateString(
    currentLang === 'ja'
      ? 'ja-JP'
      : currentLang === 'ko'
      ? 'ko-KR'
      : currentLang === 'zh'
      ? 'zh-CN'
      : currentLang === 'en'
      ? 'en-US'
      : currentLang === 'fr'
      ? 'fr-FR'
      : currentLang === 'de'
      ? 'de-DE'
      : currentLang === 'es'
      ? 'es-ES'
      : 'vi-VN',
    { month: 'long', year: 'numeric' },
  );

  const formatMeetingTime = (isoString?: string | null): string => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getGoogleCalendarUrl = (m: MeetingSchedule): string => {
    const title = encodeURIComponent(m.name || 'LayaMeet AI Meeting');
    const details = encodeURIComponent(
      `LayaMeet AI Bilingual Meeting\nRoom: ${window.location.origin}/prejoin/${m.meetingCode}\nNotes: ${m.agenda || 'No notes'}`,
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

  const openQuickAddForDate = (date: Date) => {
    setScheduleModalInitialDate(date);
    setIsScheduleModalOpen(true);
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
      <div className="w-full max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* ── Page Header Bar with Search & View Toggle ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-[#272832]/80">
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

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* View Mode Toggle: Grid vs List */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-[#1a1b22] border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#282a35] text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title={copy.viewMonth}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{copy.viewMonth}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-[#282a35] text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title={copy.viewList}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{copy.viewList}</span>
              </button>
            </div>

            {/* Quick Schedule Button */}
            <button
              type="button"
              onClick={() => {
                setScheduleModalInitialDate(null);
                setIsScheduleModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{copy.scheduleNew}</span>
            </button>
          </div>
        </div>

        {/* ── Toolbar: Month Navigator & Search Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-[#141519]/70 border border-zinc-200/80 dark:border-[#262832]/80 backdrop-blur-md shadow-2xs">
          {/* Month Switcher Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-[#1e1f28] p-0.5 border border-zinc-200/70 dark:border-zinc-800">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Tháng trước"
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer"
              >
                {copy.today}
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Tháng sau"
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 capitalize ml-2">
              {monthLabel}
            </span>
          </div>

          {/* Search bar & filter pills */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#1e1f28] border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition cursor-pointer shrink-0"
              >
                {copy.showAll}
              </button>
            )}
          </div>
        </div>

        {/* ── Main Workspace: Full Month Grid or Detailed List ── */}
        {viewMode === 'grid' ? (
          /* ── FULL-WIDTH INTERACTIVE EDITABLE CALENDAR GRID ── */
          <div className="rounded-3xl bg-white/80 dark:bg-[#141519]/80 border border-zinc-200/80 dark:border-[#262832]/80 p-4 sm:p-6 shadow-sm backdrop-blur-md space-y-4">
            {/* Weekday Names Header (Mon to Sun) */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-1 border-b border-zinc-100 dark:border-zinc-800/80">
              {copy.weekdays.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Monthly Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
              {calendarDays.map((date, idx) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[110px] sm:min-h-[135px] rounded-2xl bg-zinc-50/40 dark:bg-[#181920]/30 border border-transparent"
                    />
                  );
                }

                const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                const dayMeetings = meetingsByDateMap.get(dateKey) || [];
                const isToday = new Date().toDateString() === date.toDateString();
                const isSelected =
                  selectedDate &&
                  date.getFullYear() === selectedDate.getFullYear() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getDate() === selectedDate.getDate();

                return (
                  <div
                    key={dateKey}
                    onClick={() => openQuickAddForDate(date)}
                    className={`group relative min-h-[110px] sm:min-h-[135px] rounded-2xl p-2 sm:p-2.5 transition-all flex flex-col justify-between border cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-500 ring-2 ring-blue-500/20'
                        : isToday
                        ? 'bg-white dark:bg-[#181922] border-blue-500/50 shadow-xs'
                        : 'bg-white/60 dark:bg-[#171821]/60 hover:bg-white dark:hover:bg-[#1c1d27] border-zinc-200/70 dark:border-[#242632]'
                    }`}
                  >
                    {/* Day Cell Top Header: Date Number + Quick Add '+' Button */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center transition ${
                          isToday
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openQuickAddForDate(date);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 transition cursor-pointer"
                        title={copy.quickAdd}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Day Cell Events List (Meeting Chips) */}
                    <div className="mt-1.5 space-y-1.5 flex-1 overflow-hidden">
                      {dayMeetings.slice(0, 3).map((m) => (
                        <div
                          key={m.meetingCode}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMeetingToEdit(m);
                          }}
                          className="w-full text-left p-1.5 rounded-xl text-xs font-medium transition-all group/chip bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-500/20 dark:border-blue-800/60 shadow-2xs cursor-pointer overflow-hidden"
                          title={`${m.name} (${formatMeetingTime(m.scheduledStartAt)}) - ${copy.clickToEditHint}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold shrink-0">
                              {formatMeetingTime(m.scheduledStartAt)}
                            </span>
                            <div className="flex items-center gap-0.5 text-[10px] shrink-0 opacity-80 group-hover/chip:opacity-100">
                              <CountryFlag code={m.defaultSpokenLanguage || 'vi'} size="xs" />
                              <span className="text-zinc-400 text-[9px]">⇄</span>
                              <CountryFlag code={m.defaultTargetLanguage || 'en'} size="xs" />
                            </div>
                          </div>
                          <div className="text-zinc-900 dark:text-zinc-100 font-semibold truncate text-[11px] leading-tight flex items-center justify-between">
                            <span className="truncate">{m.name || 'LayaMeet'}</span>
                            <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover/chip:opacity-100 text-blue-500 shrink-0 ml-1" />
                          </div>
                        </div>
                      ))}

                      {dayMeetings.length > 3 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(date);
                            setViewMode('list');
                          }}
                          className="w-full text-center py-0.5 rounded-md text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition cursor-pointer"
                        >
                          {copy.moreMeetings(dayMeetings.length - 3)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── DETAILED SCHEDULE TIMELINE LIST VIEW ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {selectedDate
                    ? selectedDate.toLocaleDateString(
                        currentLang === 'ja'
                          ? 'ja-JP'
                          : currentLang === 'en'
                          ? 'en-US'
                          : 'vi-VN',
                        { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' },
                      )
                    : copy.allUpcoming}
                </span>
              </h2>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {displayedMeetings.length} {copy.meetingUnit}
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center rounded-3xl bg-white/60 dark:bg-[#141519]/60 border border-zinc-200/80 dark:border-[#262832]/80 text-zinc-500 text-sm">
                <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p>{copy.loadingText}</p>
              </div>
            ) : displayedMeetings.length === 0 ? (
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
                  onClick={() => {
                    setScheduleModalInitialDate(null);
                    setIsScheduleModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{copy.scheduleNew}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedMeetings.map((m) => {
                  const startTime = formatMeetingTime(m.scheduledStartAt);
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
                      key={m.meetingCode}
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
                            <CountryFlag code={m.defaultTargetLanguage || 'en'} size="xs" />
                          </div>
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            {m.meetingCode}
                          </span>
                        </div>
                      </div>

                      {/* Actions Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-white/[0.06]">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => setSelectedMeetingToEdit(m)}
                            className="px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{copy.editMeeting}</span>
                          </button>

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
        )}
      </div>

      {/* Schedule Meeting Modal Dialog */}
      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        initialDate={scheduleModalInitialDate}
        language={currentLang}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setScheduleModalInitialDate(null);
        }}
        onCreated={() => loadMeetings()}
      />

      {/* Direct In-Calendar Edit Meeting Modal Dialog */}
      <EditMeetingModal
        isOpen={Boolean(selectedMeetingToEdit)}
        meeting={selectedMeetingToEdit}
        language={currentLang}
        onClose={() => setSelectedMeetingToEdit(null)}
        onSaved={(updated) => {
          setMeetings((prev) =>
            prev.map((m) => (m.meetingCode === updated.meetingCode ? updated : m)),
          );
        }}
        onDeleted={(deletedCode) => {
          setMeetings((prev) =>
            prev.filter((m) => m.meetingCode.toUpperCase() !== deletedCode.toUpperCase()),
          );
        }}
      />
    </PublicPageShell>
  );
};
