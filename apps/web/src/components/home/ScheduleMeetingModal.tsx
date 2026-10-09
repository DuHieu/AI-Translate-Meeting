import { AdaptiveDialog } from '../common/AdaptiveDialog';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  Check,
  Clipboard,
  Clock3,
  ExternalLink,
  Globe,
  Loader2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { meetingApi } from '../../api/meetingApi';
import { useAuth } from '../../context/auth-context-def';
import { AppLanguage } from '../../i18n';
import { CreateMeetingResponse, SupportedLanguage, SUPPORTED_LANGUAGES_LIST } from '../../types/meeting';
import { admissionStorage } from '../../utils/admissionStorage';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  language: AppLanguage;
  onClose: () => void;
  onCreated?: () => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

const COPY: Record<
  AppLanguage,
  {
    title: string;
    defaultMeetingName: string;
    titleLabel: string;
    titlePlaceholder: string;
    startLabel: string;
    durationLabel: string;
    minutesUnit: string;
    agendaLabel: string;
    agendaPlaceholder: string;
    spokenLangLabel: string;
    targetLangLabel: string;
    autoDetect: string;
    submit: string;
    creating: string;
    success: string;
    close: string;
    linkLabel: string;
    copyBtn: string;
    copiedBtn: string;
    icsBtn: string;
    openRoom: string;
  }
> = {
  vi: {
    title: 'Đặt lịch cuộc họp',
    defaultMeetingName: 'Cuộc họp LayaMeet',
    titleLabel: 'Tiêu đề cuộc họp',
    titlePlaceholder: 'Ví dụ: Họp tuần Vietnam – Japan',
    startLabel: 'Thời gian bắt đầu',
    durationLabel: 'Thời lượng',
    minutesUnit: 'phút',
    agendaLabel: 'Nội dung / Ghi chú (tùy chọn)',
    agendaPlaceholder: 'Ghi chú ngắn gọn cho người tham gia...',
    spokenLangLabel: 'Ngôn ngữ phát biểu chính',
    targetLangLabel: 'Ngôn ngữ phụ đề mặc định',
    autoDetect: 'Tự động nhận diện (AI Auto)',
    submit: 'Tạo lịch họp',
    creating: 'Đang tạo...',
    success: 'Đã tạo lịch họp',
    close: 'Đóng',
    linkLabel: 'Đường liên kết tham gia',
    copyBtn: 'Sao chép',
    copiedBtn: 'Đã chép',
    icsBtn: 'Tải lịch (.ics)',
    openRoom: 'Mở phòng chuẩn bị',
  },
  en: {
    title: 'Schedule a meeting',
    defaultMeetingName: 'LayaMeet Meeting',
    titleLabel: 'Meeting title',
    titlePlaceholder: 'e.g. Vietnam – Japan Weekly Sync (optional)',
    startLabel: 'Start date & time',
    durationLabel: 'Duration',
    minutesUnit: 'min',
    agendaLabel: 'Notes / Agenda (optional)',
    agendaPlaceholder: 'Short note or agenda for attendees...',
    spokenLangLabel: 'Primary spoken language',
    targetLangLabel: 'Default subtitle language',
    autoDetect: 'Auto Detect (AI Auto)',
    submit: 'Schedule meeting',
    creating: 'Scheduling...',
    success: 'Meeting scheduled',
    close: 'Close',
    linkLabel: 'Meeting invite link',
    copyBtn: 'Copy',
    copiedBtn: 'Copied',
    icsBtn: 'Download .ics',
    openRoom: 'Open meeting lobby',
  },
  ja: {
    title: '会議を予約',
    defaultMeetingName: 'LayaMeet 会議',
    titleLabel: '会議のタイトル',
    titlePlaceholder: '例: ベトナム・日本 定例ミーティング（省略可）',
    startLabel: '開始日時',
    durationLabel: '所要時間',
    minutesUnit: '分',
    agendaLabel: 'メモ・アジェンダ（任意）',
    agendaPlaceholder: '参加者向けの簡単なメモ...',
    spokenLangLabel: '主要発言言語',
    targetLangLabel: 'デフォルト字幕言語',
    autoDetect: '自動認識 (AI Auto)',
    submit: '会議を予約',
    creating: '作成中...',
    success: '会議を予約しました',
    close: '閉じる',
    linkLabel: '招待リンク',
    copyBtn: 'コピー',
    copiedBtn: 'コピー済み',
    icsBtn: '.icsをダウンロード',
    openRoom: '準備画面を開く',
  },
};

function getNextHourValue(): string {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return toDateTimeLocal(date);
}

function toDateTimeLocal(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function zonedDateTimeToIso(value: string, timeZone: string): string {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const desiredWallTime = Date.UTC(year, month - 1, day, hour, minute);

  if (timeZone === 'UTC') return new Date(desiredWallTime).toISOString();

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    let candidate = desiredWallTime;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const parts = Object.fromEntries(
        formatter
          .formatToParts(new Date(candidate))
          .filter((part) => part.type !== 'literal')
          .map((part) => [part.type, Number(part.value)]),
      );
      const representedWallTime = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
      );
      candidate += desiredWallTime - representedWallTime;
    }
    return new Date(candidate).toISOString();
  } catch {
    return new Date(value).toISOString();
  }
}

function toGoogleCalendarDate(value: string): string {
  return new Date(value).toISOString().replace(/[-:]|\.\d{3}/g, '');
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  language,
  onClose,
  onCreated,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const titleRef = useRef<HTMLInputElement>(null);
  const browserTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
    [],
  );
  const copy = COPY[language] || COPY.vi;

  const [name, setName] = useState('');
  const [scheduledStartAt, setScheduledStartAt] = useState(getNextHourValue);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [defaultSpokenLanguage, setDefaultSpokenLanguage] = useState<SupportedLanguage | 'auto'>('auto');
  const [defaultTargetLanguage, setDefaultTargetLanguage] = useState<SupportedLanguage>('vi');
  const [agenda, setAgenda] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateMeetingResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    setName('');
    setScheduledStartAt(getNextHourValue());
    setDurationMinutes(45);
    setDefaultSpokenLanguage('auto');
    setDefaultTargetLanguage('vi');
    setAgenda('');
    setError(null);
    setCreated(null);
    setCopied(false);
    const focusTimer = window.setTimeout(() => titleRef.current?.focus(), 50);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const finalName = name.trim() || copy.defaultMeetingName;
    const effectiveEmail = user?.email?.trim() || localStorage.getItem('layameet:last-user-email') || null;
    if (user?.email) {
      localStorage.setItem('layameet:last-user-email', user.email.trim());
    }
    try {
      const res = await meetingApi.createMeeting(finalName, {
        scheduledStartAt: zonedDateTimeToIso(scheduledStartAt, browserTimezone),
        durationMinutes,
        timezone: browserTimezone,
        agenda: agenda.trim() || undefined,
        defaultSpokenLanguage,
        defaultTargetLanguage,
        domainGlossary: 'general',
        hostEmail: effectiveEmail,
      });
      admissionStorage.saveHostToken(res.meetingCode, res.hostToken);
      setCreated(res);
      onCreated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tạo lịch họp.');
    } finally {
      setLoading(false);
    }
  };

  const prejoinLink = created
    ? `${window.location.origin}/prejoin/${created.meetingCode}`
    : '';
  const startIso = created
    ? created.scheduledStartAt || zonedDateTimeToIso(scheduledStartAt, browserTimezone)
    : '';
  const endIso = created
    ? created.scheduledEndAt
      || new Date(Date.parse(startIso) + durationMinutes * 60_000).toISOString()
    : '';
  const googleCalendarUrl = created
    ? `https://calendar.google.com/calendar/render?${new URLSearchParams({
        action: 'TEMPLATE',
        text: created.name,
        dates: `${toGoogleCalendarDate(startIso)}/${toGoogleCalendarDate(endIso)}`,
        details: `${agenda.trim() || 'LayaMeet AI Meeting'}\n\nTham gia: ${prejoinLink}`,
        location: prejoinLink,
        ctz: browserTimezone,
      }).toString()}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prejoinLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Không thể sao chép tự động. Vui lòng sao chép đường dẫn thủ công.');
    }
  };

  return (
    <AdaptiveDialog label="Đặt lịch cuộc họp" onClose={onClose} className="schedule-dialog">
      <div
        className="max-h-[calc(var(--app-height)-52px)] w-full max-w-none overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-[#15161a]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white/95 px-5 py-3.5 backdrop-blur dark:border-zinc-800 dark:bg-[#15161a]/95">
          <h2 id="schedule-meeting-title" className="text-base font-bold text-zinc-950 dark:text-white">
            {created ? copy.success : copy.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {created ? (
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{created.name}</p>
                <p className="mt-0.5 text-xs opacity-80">
                  {new Date(startIso).toLocaleString()} · {durationMinutes} {copy.minutesUnit}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="scheduled-prejoin-link" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {copy.linkLabel}
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="scheduled-prejoin-link"
                  value={prejoinLink}
                  readOnly
                  className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Clipboard className="h-3.5 w-3.5" />}
                  {copied ? copy.copiedBtn : copy.copyBtn}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href={meetingApi.getCalendarIcsUrl(created.meetingCode)}
                download
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 px-3 py-2.5 text-xs font-semibold text-zinc-800 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-100"
              >
                <CalendarCheck className="h-4 w-4" />
                {copy.icsBtn}
              </a>
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 px-3 py-2.5 text-xs font-semibold text-zinc-800 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-100"
              >
                <CalendarPlus className="h-4 w-4" />
                Google Calendar
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/prejoin/${created.meetingCode}`)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-500 cursor-pointer"
            >
              {copy.openRoom}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div>
              <label htmlFor="schedule-name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {copy.titleLabel}
              </label>
              <input
                ref={titleRef}
                id="schedule-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                placeholder={copy.titlePlaceholder}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="schedule-start" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <Clock3 className="h-3.5 w-3.5" /> {copy.startLabel}
                </label>
                <input
                  id="schedule-start"
                  type="datetime-local"
                  value={scheduledStartAt}
                  min={toDateTimeLocal(new Date())}
                  onChange={(event) => setScheduledStartAt(event.target.value)}
                  required
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="schedule-duration" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {copy.durationLabel}
                </label>
                <select
                  id="schedule-duration"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(Number(event.target.value))}
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                >
                  {DURATION_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value} {copy.minutesUnit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language Controls (Spoken & Target Subtitle) */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="schedule-spoken-lang" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <Globe className="h-3.5 w-3.5 text-blue-500" /> {copy.spokenLangLabel}
                </label>
                <select
                  id="schedule-spoken-lang"
                  value={defaultSpokenLanguage}
                  onChange={(event) => setDefaultSpokenLanguage(event.target.value as SupportedLanguage | 'auto')}
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white cursor-pointer"
                >
                  <option value="auto">{copy.autoDetect}</option>
                  {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="schedule-target-lang" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <Globe className="h-3.5 w-3.5 text-indigo-500" /> {copy.targetLangLabel}
                </label>
                <select
                  id="schedule-target-lang"
                  value={defaultTargetLanguage}
                  onChange={(event) => setDefaultTargetLanguage(event.target.value as SupportedLanguage)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="schedule-agenda" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {copy.agendaLabel}
              </label>
              <textarea
                id="schedule-agenda"
                value={agenda}
                onChange={(event) => setAgenda(event.target.value)}
                maxLength={2000}
                rows={2}
                placeholder={copy.agendaPlaceholder}
                className="mt-1.5 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              >
                {copy.close}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
                {loading ? copy.creating : copy.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdaptiveDialog>
  );
};

