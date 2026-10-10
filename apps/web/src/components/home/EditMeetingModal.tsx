import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Trash2,
  Save,
  X,
  ExternalLink,
  Copy,
  Check,
  Languages,
  CalendarCheck,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { AppLanguage } from '../../i18n';
import { MeetingSchedule, SUPPORTED_LANGUAGES_LIST } from '../../types/meeting';
import { calendarScheduleStorage } from '../../utils/calendarScheduleStorage';
import { copyText } from '../../utils/clipboard';

interface EditMeetingModalProps {
  isOpen: boolean;
  meeting: MeetingSchedule | null;
  language: AppLanguage;
  onClose: () => void;
  onSaved: (updatedMeeting: MeetingSchedule) => void;
  onDeleted: (meetingCode: string) => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const COPY: Record<
  string,
  {
    modalTitle: string;
    modalSubtitle: string;
    titleLabel: string;
    startLabel: string;
    durationLabel: string;
    minutesUnit: string;
    spokenLangLabel: string;
    targetLangLabel: string;
    agendaLabel: string;
    agendaPlaceholder: string;
    saveBtn: string;
    savingBtn: string;
    cancelBtn: string;
    deleteBtn: string;
    deleteConfirmTitle: string;
    deleteConfirmDesc: string;
    confirmDeleteBtn: string;
    keepBtn: string;
    joinNowBtn: string;
    copyLinkBtn: string;
    copiedLinkBtn: string;
    downloadIcs: string;
    googleCalendar: string;
    roomCode: string;
  }
> = {
  vi: {
    modalTitle: 'Chỉnh Sửa Cuộc Họp',
    modalSubtitle: 'Cập nhật thời gian, ngôn ngữ song ngữ hoặc thông tin phòng họp trực tiếp trên lịch.',
    titleLabel: 'Tiêu đề cuộc họp',
    startLabel: 'Thời gian bắt đầu',
    durationLabel: 'Thời lượng',
    minutesUnit: 'phút',
    spokenLangLabel: 'Ngôn ngữ phát biểu chính',
    targetLangLabel: 'Ngôn ngữ phụ đề nhận',
    agendaLabel: 'Nội dung / Ghi chú cuộc họp',
    agendaPlaceholder: 'Ghi chú chương trình nghị sự...',
    saveBtn: 'Lưu thay đổi',
    savingBtn: 'Đang lưu...',
    cancelBtn: 'Hủy bỏ',
    deleteBtn: 'Xóa cuộc họp',
    deleteConfirmTitle: 'Xác nhận xóa cuộc họp?',
    deleteConfirmDesc: 'Cuộc họp này sẽ bị gỡ khỏi lịch trình. Hành động này không thể hoàn tác.',
    confirmDeleteBtn: 'Xác nhận xóa',
    keepBtn: 'Giữ lại',
    joinNowBtn: 'Vào phòng họp',
    copyLinkBtn: 'Sao chép link',
    copiedLinkBtn: 'Đã sao chép!',
    downloadIcs: 'Tải .ics',
    googleCalendar: 'Google Calendar',
    roomCode: 'Mã phòng:',
  },
  en: {
    modalTitle: 'Edit Scheduled Meeting',
    modalSubtitle: 'Update meeting schedule, bilingual languages, or agenda directly on the calendar.',
    titleLabel: 'Meeting Title',
    startLabel: 'Start Date & Time',
    durationLabel: 'Duration',
    minutesUnit: 'min',
    spokenLangLabel: 'Primary Spoken Language',
    targetLangLabel: 'Default Subtitle Language',
    agendaLabel: 'Agenda & Meeting Notes',
    agendaPlaceholder: 'Agenda notes for attendees...',
    saveBtn: 'Save Changes',
    savingBtn: 'Saving...',
    cancelBtn: 'Cancel',
    deleteBtn: 'Delete Meeting',
    deleteConfirmTitle: 'Delete this scheduled meeting?',
    deleteConfirmDesc: 'This meeting will be removed from your calendar. This action cannot be undone.',
    confirmDeleteBtn: 'Confirm Delete',
    keepBtn: 'Keep Meeting',
    joinNowBtn: 'Join Room Now',
    copyLinkBtn: 'Copy Link',
    copiedLinkBtn: 'Copied!',
    downloadIcs: 'Download .ics',
    googleCalendar: 'Google Calendar',
    roomCode: 'Room Code:',
  },
  ja: {
    modalTitle: '会議の編集',
    modalSubtitle: 'カレンダー上で日時、二言語字幕設定、議題を直接変更できます。',
    titleLabel: '会議名',
    startLabel: '開始日時',
    durationLabel: '所要時間',
    minutesUnit: '分',
    spokenLangLabel: '主要発言言語',
    targetLangLabel: '字幕言語',
    agendaLabel: '議題・メモ',
    agendaPlaceholder: '会議のアジェンダやメモ...',
    saveBtn: '変更を保存',
    savingBtn: '保存中...',
    cancelBtn: 'キャンセル',
    deleteBtn: '会議を削除',
    deleteConfirmTitle: 'この会議を削除しますか？',
    deleteConfirmDesc: 'カレンダーからこの会議が削除されます。この操作は取り消せません。',
    confirmDeleteBtn: '削除する',
    keepBtn: 'キャンセル',
    joinNowBtn: '入室する',
    copyLinkBtn: 'リンクをコピー',
    copiedLinkBtn: 'コピー済み!',
    downloadIcs: '.icsダウンロード',
    googleCalendar: 'Googleカレンダー',
    roomCode: '会議コード:',
  },
  ko: {
    modalTitle: '회의 일정 수정',
    modalSubtitle: '캘린더에서 회의 일시, 언어 설정, 의제를 직접 수정할 수 있습니다.',
    titleLabel: '회의 제목',
    startLabel: '시작 일시',
    durationLabel: '소요 시간',
    minutesUnit: '분',
    spokenLangLabel: '주 발언 언어',
    targetLangLabel: '기본 자막 언어',
    agendaLabel: '회의 의제 및 메모',
    agendaPlaceholder: '참석자를 위한 안내 사항...',
    saveBtn: '변경 사항 저장',
    savingBtn: '저장 중...',
    cancelBtn: '취소',
    deleteBtn: '회의 삭제',
    deleteConfirmTitle: '이 회의를 삭제하시겠습니까?',
    deleteConfirmDesc: '캘린더에서 회의가 삭제되며 되돌릴 수 없습니다.',
    confirmDeleteBtn: '삭제 확인',
    keepBtn: '유지하기',
    joinNowBtn: '회의 입장',
    copyLinkBtn: '링크 복사',
    copiedLinkBtn: '복사 완료!',
    downloadIcs: '.ics 다운로드',
    googleCalendar: 'Google 캘린더',
    roomCode: '회의 코드:',
  },
  zh: {
    modalTitle: '编辑会议日程',
    modalSubtitle: '直接在日历上修改会议时间、双语同传语言与会议议程。',
    titleLabel: '会议名称',
    startLabel: '开始时间',
    durationLabel: '会议时长',
    minutesUnit: '分钟',
    spokenLangLabel: '主要发言语言',
    targetLangLabel: '接收字幕语言',
    agendaLabel: '会议议程与备注',
    agendaPlaceholder: '输入会议议程或参会须知...',
    saveBtn: '保存更改',
    savingBtn: '保存中...',
    cancelBtn: '取消',
    deleteBtn: '删除会议',
    deleteConfirmTitle: '确认删除该会议日程？',
    deleteConfirmDesc: '该会议将从日历中移除，操作无法撤销。',
    confirmDeleteBtn: '确认删除',
    keepBtn: '保留会议',
    joinNowBtn: '立即进入房间',
    copyLinkBtn: '复制邀请链接',
    copiedLinkBtn: '已复制!',
    downloadIcs: '下载 .ics',
    googleCalendar: 'Google 日历',
    roomCode: '会议代码:',
  },
  fr: {
    modalTitle: 'Modifier la réunion',
    modalSubtitle: 'Mettez à jour la date, les langues bilingues ou l’ordre du jour directement sur le calendrier.',
    titleLabel: 'Titre de la réunion',
    startLabel: 'Date et heure de début',
    durationLabel: 'Durée',
    minutesUnit: 'min',
    spokenLangLabel: 'Langue principale parlée',
    targetLangLabel: 'Langue des sous-titres',
    agendaLabel: 'Ordre du jour / Notes',
    agendaPlaceholder: 'Notes pour les participants...',
    saveBtn: 'Enregistrer',
    savingBtn: 'Enregistrement...',
    cancelBtn: 'Annuler',
    deleteBtn: 'Supprimer la réunion',
    deleteConfirmTitle: 'Supprimer cette réunion ?',
    deleteConfirmDesc: 'Cette réunion sera supprimée de votre calendrier. Action irréversible.',
    confirmDeleteBtn: 'Confirmer la suppression',
    keepBtn: 'Conserver',
    joinNowBtn: 'Rejoindre la salle',
    copyLinkBtn: 'Copier le lien',
    copiedLinkBtn: 'Copié !',
    downloadIcs: 'Télécharger .ics',
    googleCalendar: 'Google Agenda',
    roomCode: 'Code de réunion :',
  },
  de: {
    modalTitle: 'Meeting bearbeiten',
    modalSubtitle: 'Bearbeiten Sie Datum, zweisprachige Untertitel oder Agenda direkt im Kalender.',
    titleLabel: 'Meeting-Titel',
    startLabel: 'Startdatum & -uhrzeit',
    durationLabel: 'Dauer',
    minutesUnit: 'Min.',
    spokenLangLabel: 'Hauptsprache',
    targetLangLabel: 'Untertitelsprache',
    agendaLabel: 'Agenda / Notizen',
    agendaPlaceholder: 'Notizen für die Teilnehmer...',
    saveBtn: 'Änderungen speichern',
    savingBtn: 'Speichere...',
    cancelBtn: 'Abbrechen',
    deleteBtn: 'Meeting löschen',
    deleteConfirmTitle: 'Dieses Meeting löschen?',
    deleteConfirmDesc: 'Das Meeting wird aus dem Kalender entfernt. Dies kann nicht rückgängig gemacht werden.',
    confirmDeleteBtn: 'Löschen bestätigen',
    keepBtn: 'Behalten',
    joinNowBtn: 'Jetzt beitreten',
    copyLinkBtn: 'Link kopieren',
    copiedLinkBtn: 'Kopiert!',
    downloadIcs: '.ics herunterladen',
    googleCalendar: 'Google Kalender',
    roomCode: 'Meeting-Code:',
  },
  es: {
    modalTitle: 'Editar reunión',
    modalSubtitle: 'Actualice la fecha, idiomas bilingües o agenda directamente en el calendario.',
    titleLabel: 'Título de la reunión',
    startLabel: 'Fecha y hora de inicio',
    durationLabel: 'Duración',
    minutesUnit: 'min',
    spokenLangLabel: 'Idioma principal hablado',
    targetLangLabel: 'Idioma de subtítulos',
    agendaLabel: 'Agenda y notas',
    agendaPlaceholder: 'Notas para los participantes...',
    saveBtn: 'Guardar cambios',
    savingBtn: 'Guardando...',
    cancelBtn: 'Cancelar',
    deleteBtn: 'Eliminar reunión',
    deleteConfirmTitle: '¿Eliminar esta reunión?',
    deleteConfirmDesc: 'La reunión se eliminará de su calendario. Esta acción no se puede deshacer.',
    confirmDeleteBtn: 'Confirmar eliminación',
    keepBtn: 'Conservar',
    joinNowBtn: 'Entrar a la sala',
    copyLinkBtn: 'Copiar enlace',
    copiedLinkBtn: '¡Copiado!',
    downloadIcs: 'Descargar .ics',
    googleCalendar: 'Google Calendar',
    roomCode: 'Código de sala:',
  },
};

function toDateTimeLocal(isoString?: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export const EditMeetingModal: React.FC<EditMeetingModalProps> = ({
  isOpen,
  meeting,
  language,
  onClose,
  onSaved,
  onDeleted,
}) => {
  const navigate = useNavigate();
  const copy = COPY[language] || COPY.en || COPY.vi;

  const [name, setName] = useState('');
  const [startInput, setStartInput] = useState('');
  const [duration, setDuration] = useState(45);
  const [spokenLang, setSpokenLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('vi');
  const [agenda, setAgenda] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (meeting) {
      setName(meeting.name || '');
      setStartInput(toDateTimeLocal(meeting.scheduledStartAt));

      if (meeting.scheduledStartAt && meeting.scheduledEndAt) {
        const start = new Date(meeting.scheduledStartAt).getTime();
        const end = new Date(meeting.scheduledEndAt).getTime();
        const mins = Math.max(15, Math.round((end - start) / 60000));
        setDuration(mins);
      } else {
        setDuration(45);
      }

      setSpokenLang(meeting.defaultSpokenLanguage || 'auto');
      setTargetLang(meeting.defaultTargetLanguage || 'vi');
      setAgenda(meeting.agenda || '');
      setIsDeleting(false);
      setCopied(false);
    }
  }, [meeting, isOpen]);

  if (!isOpen || !meeting) return null;

  const handleCopyLink = async () => {
    const inviteUrl = `${window.location.origin}/prejoin/${meeting.meetingCode.toUpperCase()}`;
    await copyText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meeting) return;

    let newStartIso = meeting.scheduledStartAt;
    let newEndIso = meeting.scheduledEndAt;

    if (startInput) {
      const startDate = new Date(startInput);
      if (!isNaN(startDate.getTime())) {
        newStartIso = startDate.toISOString();
        const endDate = new Date(startDate.getTime() + duration * 60000);
        newEndIso = endDate.toISOString();
      }
    }

    const updated: MeetingSchedule = {
      ...meeting,
      name: name.trim() || meeting.name,
      scheduledStartAt: newStartIso,
      scheduledEndAt: newEndIso,
      defaultSpokenLanguage: spokenLang,
      defaultTargetLanguage: targetLang,
      agenda: agenda.trim() || null,
    };

    calendarScheduleStorage.updateMeeting(meeting.meetingCode, updated);
    onSaved(updated);
    onClose();
  };

  const handleDelete = () => {
    if (!meeting) return;
    calendarScheduleStorage.deleteMeeting(meeting.meetingCode);
    onDeleted(meeting.meetingCode);
    onClose();
  };

  const getGoogleCalendarUrl = (): string => {
    const title = encodeURIComponent(name || meeting.name || 'LayaMeet AI Meeting');
    const details = encodeURIComponent(
      `LayaMeet AI Bilingual Meeting\nRoom: ${window.location.origin}/prejoin/${meeting.meetingCode}\nNotes: ${agenda || 'No notes'}`,
    );
    const location = encodeURIComponent(`${window.location.origin}/meeting/${meeting.meetingCode}`);

    let dates = '';
    if (startInput) {
      const start = new Date(startInput);
      const end = new Date(start.getTime() + duration * 60 * 1000);
      const formatIsoUtc = (d: Date) =>
        d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      dates = `&dates=${formatIsoUtc(start)}/${formatIsoUtc(end)}`;
    }

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}${dates}`;
  };

  return (
    <AdaptiveDialog
      label={copy.modalTitle}
      onClose={onClose}
      className="max-w-2xl"
    >
      <div className="space-y-6 text-zinc-900 dark:text-zinc-100 p-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">{copy.modalTitle}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{copy.modalSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.cancelBtn}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Meeting Code & Quick Actions Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#1a1b22] border border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">{copy.roomCode}</span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold text-xs tracking-wider border border-blue-500/20">
              {meeting.meetingCode.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? copy.copiedLinkBtn : copy.copyLinkBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/prejoin/${meeting.meetingCode.toUpperCase()}`);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <span>{copy.joinNowBtn}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isDeleting ? (
          /* Confirmation before deletion */
          <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-600 dark:text-red-400">
                  {copy.deleteConfirmTitle}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {copy.deleteConfirmDesc}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                {copy.keepBtn}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition shadow-sm cursor-pointer"
              >
                {copy.confirmDeleteBtn}
              </button>
            </div>
          </div>
        ) : (
          /* Main Edit Form */
          <form onSubmit={handleSave} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                {copy.titleLabel}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1a1b22] border border-zinc-200 dark:border-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date Time & Duration Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>{copy.startLabel}</span>
                </label>
                <input
                  type="datetime-local"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a1b22] border border-zinc-200 dark:border-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>{copy.durationLabel}</span>
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a1b22] border border-zinc-200 dark:border-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} {copy.minutesUnit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language Selection Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-blue-500" />
                  <span>{copy.spokenLangLabel}</span>
                </label>
                <select
                  value={spokenLang}
                  onChange={(e) => setSpokenLang(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a1b22] border border-zinc-200 dark:border-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="auto">AI Auto (Tự động)</option>
                  {SUPPORTED_LANGUAGES_LIST.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name} ({l.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-blue-500" />
                  <span>{copy.targetLangLabel}</span>
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a1b22] border border-zinc-200 dark:border-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES_LIST.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name} ({l.nativeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Agenda Notes */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>{copy.agendaLabel}</span>
              </label>
              <textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder={copy.agendaPlaceholder}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1a1b22] border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Sync Links */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 font-medium transition"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>{copy.googleCalendar}</span>
              </a>
              <a
                href={`/api/meetings/${encodeURIComponent(meeting.meetingCode)}/calendar.ics`}
                download
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 font-medium transition"
              >
                <span>{copy.downloadIcs}</span>
              </a>
            </div>

            {/* Action Buttons Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setIsDeleting(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{copy.deleteBtn}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  {copy.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{copy.saveBtn}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </AdaptiveDialog>
  );
};
