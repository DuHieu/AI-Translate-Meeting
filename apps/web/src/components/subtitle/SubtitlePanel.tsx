import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Download,
  FileCheck,
  FileDown,
  FileText,
  HelpCircle,
  ListTodo,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Send,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { ChatMessage, SidecarPreferences, SupportedLanguage, SUPPORTED_LANGUAGES_LIST } from '../../types/meeting';
import { CountryFlag } from '../common/CountryFlag';
import { SubtitleMessage } from '../../types/subtitle';
import { formatTimestamp } from '../../utils';
import { generateMeetingRecap, GeneratedRecap } from '../../utils/aiRecapEngine';
import { getCustomSkills, MeetingRecapSkill } from '../../utils/recapSkillManager';
import { LiveSubtitleView } from './LiveSubtitleView';
import type { BrandingConfigDto } from '../../api/meetingApi';
import { exportBrandedMeetingPdf } from '../../utils/brandedPdfExport';
import { WorkflowSyncPanel } from '../meeting/WorkflowSyncPanel';
import { MinutesQaPanel } from '../meeting/MinutesQaPanel';
import { MeetingLinkPreviewCard } from '../meeting/MeetingLinkPreviewCard';
import { extractLinksFromText } from '../../utils/linkUnfurl';
import { toMeetingTranscript } from '../../utils/meetingMinutes';

type SidecarTab = 'all' | 'actions' | 'recap' | 'chat';

interface SubtitlePanelProps {
  history: SubtitleMessage[];
  getExportHistory: () => SubtitleMessage[];
  isOpen: boolean;
  onClose: () => void;
  chatMessages?: ChatMessage[];
  onSendChatMessage?: (text: string, attachment?: ChatMessage['attachment']) => void;
  currentUserId?: string;
  meetingCode?: string;
  initialTab?: SidecarTab;
  preferences: SidecarPreferences;
  onPreferencesChange: (preferences: SidecarPreferences) => void;
  targetLanguage: SupportedLanguage;
  onTargetLanguageChange: (language: SupportedLanguage) => void;
  isUpdatingLanguage?: boolean;
  languageError?: string | null;
  branding: BrandingConfigDto;
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatSrtTimestamp(isoString: string, offsetSeconds: number): string {
  const parsed = new Date(isoString);
  const time = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  time.setSeconds(time.getSeconds() + offsetSeconds);
  return `${String(time.getUTCHours()).padStart(2, '0')}:${String(time.getUTCMinutes()).padStart(2, '0')}:${String(time.getUTCSeconds()).padStart(2, '0')},${String(time.getUTCMilliseconds()).padStart(3, '0')}`;
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export const SubtitlePanel: React.FC<SubtitlePanelProps> = ({
  history,
  getExportHistory,
  isOpen,
  onClose,
  chatMessages = [],
  onSendChatMessage,
  currentUserId,
  meetingCode,
  initialTab = 'all',
  preferences,
  onPreferencesChange,
  targetLanguage,
  onTargetLanguageChange,
  isUpdatingLanguage = false,
  languageError,
  branding,
}) => {
  const [activeTab, setActiveTab] = useState<SidecarTab>(initialTab);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<ChatMessage['attachment']>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recapResult, setRecapResult] = useState<GeneratedRecap | null>(null);
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);
  const [chimeEnabled, setChimeEnabled] = useState(
    () => localStorage.getItem('ai-action-chime-enabled') !== 'false',
  );

  // Custom skills state: only non-builtin custom skills from company
  const [customSkills, setCustomSkills] = useState<MeetingRecapSkill[]>(() => getCustomSkills());
  const [selectedSkillId, setSelectedSkillId] = useState<string>('default');

  // Laya Intelligence tag filter in actions tab
  const [actionFilter, setActionFilter] = useState<'all' | 'decision' | 'action_item' | 'critical_risk' | 'question'>('all');

  const taggedItems = useMemo(
    () => history.filter((item) => item.isFinal && item.tags && item.tags.length > 0),
    [history],
  );
  const minutesTranscript = useMemo(() => toMeetingTranscript(history), [history]);

  const filteredTaggedItems = useMemo(() => {
    if (actionFilter === 'all') return taggedItems;
    return taggedItems.filter((item) => item.tags?.includes(actionFilter));
  }, [taggedItems, actionFilter]);

  const tabs = useMemo(() => {
    const available: Array<{ id: SidecarTab; label: string; icon?: React.ReactNode }> = [
      { id: 'all', label: 'Phụ đề' },
    ];
    if (preferences.showActions) available.push({ id: 'actions', label: 'Việc làm', icon: <Zap className="h-3 w-3" /> });
    if (preferences.showRecap) available.push({ id: 'recap', label: 'Tóm tắt', icon: <Sparkles className="h-3 w-3" /> });
    if (preferences.showChat) available.push({ id: 'chat', label: 'Tin nhắn', icon: <MessageCircle className="h-3 w-3" /> });
    return available;
  }, [preferences.showActions, preferences.showChat, preferences.showRecap]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) setActiveTab('all');
  }, [activeTab, tabs]);

  useEffect(() => {
    if (activeTab === 'recap') {
      setCustomSkills(getCustomSkills());
    }
  }, [activeTab]);

  const exportHistory = () => getExportHistory().filter((item) => item.isFinal);

  const handleDownloadTranscript = () => {
    const items = exportHistory();
    if (items.length === 0) return;
    const lines = items.map((item) => {
      const speaker = item.participantName || 'Người phát biểu';
      return `[${formatTimestamp(item.timestamp)}] ${speaker}\n${item.translatedText}${
        item.originalText && item.originalText !== item.translatedText ? `\nGốc: ${item.originalText}` : ''
      }`;
    });
    downloadFile(lines.join('\n\n'), `transcript-${meetingCode || 'meeting'}.txt`);
    setIsExportMenuOpen(false);
  };

  const handleExportSrt = () => {
    const items = exportHistory();
    if (items.length === 0) return;
    const lines = items.map((item, index) => {
      const start = formatSrtTimestamp(item.timestamp, 0);
      const end = formatSrtTimestamp(item.timestamp, 2);
      const speaker = item.participantName ? `${item.participantName}: ` : '';
      return `${index + 1}\n${start} --> ${end}\n${speaker}${item.translatedText}\n`;
    });
    downloadFile(lines.join('\n'), `subtitles-${meetingCode || 'meeting'}.srt`);
    setIsExportMenuOpen(false);
  };

  const handleGenerateRecap = () => {
    setIsGeneratingRecap(true);
    window.setTimeout(() => {
      const recap = generateMeetingRecap(
        history.filter((item) => item.isFinal),
        taggedItems,
        selectedSkillId
      );
      setRecapResult(recap);
      setIsGeneratingRecap(false);
    }, 250);
  };

  const handleDownloadMinutesMarkdown = () => {
    if (!recapResult) return;
    const content = [
      `# ${branding.brandName} — Biên Bản Cuộc Họp - ${meetingCode || branding.brandName}`,
      `_${branding.copyrightText}_`,
      '',
      `*Thời gian tạo: ${recapResult.generatedAt} | Kỹ năng: ${recapResult.activeSkillName || 'Executive MoM'}*`,
      '',
      '## 1. Tóm Tắt Điều Hành',
      ...recapResult.executiveHighlights.map((h) => `- ${h}`),
      '',
      ...(recapResult.decisions && recapResult.decisions.length > 0 ? [
        '## 2. Quyết Định Then Chốt',
        ...recapResult.decisions.map((d) => `- [x] ${d}`),
        '',
      ] : []),
      ...(recapResult.actionItems && recapResult.actionItems.length > 0 ? [
        '## 3. Phân Công Nhiệm Vụ (Action Items)',
        ...recapResult.actionItems.map((a) => `- [ ] **${a.task}** ${a.owner ? `(Phụ trách: ${a.owner})` : ''} ${a.deadline ? `[Hạn chót: ${a.deadline}]` : ''} [${a.priority || 'Medium'}]`),
        '',
      ] : []),
      '## 4. Trọng Tâm Thảo Luận',
      ...recapResult.topics.map((t) => `### ${t.title} (${t.category} - ${t.utteranceCount} câu)\n${t.samplePoints.map((p) => `> ${p}`).join('\n')}`),
      '',
      ...(recapResult.blockersAndRisks && recapResult.blockersAndRisks.length > 0 ? [
        '## 5. Điểm Nghẽn & Rủi Ro Cần Theo Dõi',
        ...recapResult.blockersAndRisks.map((b) => `- ⚠️ ${b}`),
        '',
      ] : []),
      '## 6. Thống Kê Tham Gia',
      ...recapResult.speakerStats.map((s) => `- **${s.name}**: ${s.percentage}% (${s.utteranceCount} phát biểu, ~${s.wordCount} từ)`),
    ].join('\n');

    downloadFile(content, `bien-ban-hop-${meetingCode || 'mom'}.md`);
  };

  const handleDownloadMinutesDirect = () => {
    let recap = recapResult;
    if (!recap) {
      recap = generateMeetingRecap(
        history.filter((item) => item.isFinal),
        taggedItems,
        selectedSkillId
      );
      setRecapResult(recap);
    }

    const content = [
      `# ${branding.brandName} — Biên Bản Cuộc Họp - ${meetingCode || branding.brandName}`,
      `_${branding.copyrightText}_`,
      '',
      `*Thời gian tạo: ${recap.generatedAt} | Kỹ năng: ${recap.activeSkillName || 'Executive MoM'}*`,
      '',
      '## 1. Tóm Tắt Điều Hành',
      ...recap.executiveHighlights.map((h) => `- ${h}`),
      '',
      ...(recap.decisions && recap.decisions.length > 0 ? [
        '## 2. Quyết Định Then Chốt',
        ...recap.decisions.map((d) => `- [x] ${d}`),
        '',
      ] : []),
      ...(recap.actionItems && recap.actionItems.length > 0 ? [
        '## 3. Phân Công Nhiệm Vụ (Action Items)',
        ...recap.actionItems.map((a) => `- [ ] **${a.task}** ${a.owner ? `(Phụ trách: ${a.owner})` : ''} ${a.deadline ? `[Hạn chót: ${a.deadline}]` : ''} [${a.priority || 'Medium'}]`),
        '',
      ] : []),
      '## 4. Trọng Tâm Thảo Luận',
      ...recap.topics.map((t) => `### ${t.title} (${t.category} - ${t.utteranceCount} câu)\n${t.samplePoints.map((p) => `> ${p}`).join('\n')}`),
      '',
      ...(recap.blockersAndRisks && recap.blockersAndRisks.length > 0 ? [
        '## 5. Điểm Nghẽn & Rủi Ro Cần Theo Dõi',
        ...recap.blockersAndRisks.map((b) => `- ⚠️ ${b}`),
        '',
      ] : []),
      '## 6. Thống Kê Tham Gia',
      ...recap.speakerStats.map((s) => `- **${s.name}**: ${s.percentage}% (${s.utteranceCount} phát biểu, ~${s.wordCount} từ)`),
    ].join('\n');

    downloadFile(content, `bien-ban-hop-${meetingCode || 'mom'}.md`);
    setIsExportMenuOpen(false);
  };

  const handleExportMinutesPdf = async () => {
    let recap = recapResult;
    if (!recap) {
      recap = generateMeetingRecap(
        history.filter((item) => item.isFinal),
        taggedItems,
        selectedSkillId,
      );
      setRecapResult(recap);
    }

    await exportBrandedMeetingPdf({
      meetingCode: meetingCode || 'meeting',
      title: `${branding.brandName} — Biên bản cuộc họp ${meetingCode || ''}`.trim(),
      createdAt: new Date().toISOString(),
      executiveHighlights: recap.executiveHighlights,
      decisions: recap.decisions,
      actionItems: recap.actionItems,
    }, branding);
    setIsExportMenuOpen(false);
  };

  const toggleChime = () => {
    const next = !chimeEnabled;
    setChimeEnabled(next);
    localStorage.setItem('ai-action-chime-enabled', String(next));
  };

  useEffect(() => {
    if (preferences.fileSharing) return;
    setPendingAttachment(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [preferences.fileSharing]);

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPendingAttachment({
      name: file.name,
      size: file.size,
      summaryTranslation: 'AI đang xử lý bản dịch tóm tắt cho tài liệu này.',
    });
  };

  const clearPendingAttachment = () => {
    setPendingAttachment(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendChat = (event: React.FormEvent) => {
    event.preventDefault();
    const value = chatInput.trim();
    if ((!value && !pendingAttachment) || !onSendChatMessage) return;
    onSendChatMessage(value, pendingAttachment);
    setChatInput('');
    clearPendingAttachment();
  };

  if (!isOpen) return null;

  return (
    <aside className="meeting-panel-content min-h-0 h-full flex w-full flex-col bg-slate-950" aria-label="Trợ lý cuộc họp AI">
      <header className="border-b border-slate-800 px-3 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-zinc-100">Phụ đề trực tiếp</h2>
            <p className="text-[11px] text-zinc-400">Tự động theo dõi nội dung mới nhất</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng bảng phụ đề" className="rounded-lg p-2 text-zinc-400 transition hover:bg-slate-800 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="sr-only" htmlFor="sidecar-target-language">Ngôn ngữ phụ đề</label>
          <div className="min-w-0 flex-1 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 focus-within:border-sky-500">
            <CountryFlag code={targetLanguage} size="xs" />
            <select
              id="sidecar-target-language"
              value={targetLanguage}
              disabled={isUpdatingLanguage}
              onChange={(event) => onTargetLanguageChange(event.target.value as SupportedLanguage)}
              className="min-w-0 flex-1 bg-transparent text-xs text-zinc-200 outline-none disabled:opacity-60 cursor-pointer"
            >
              {SUPPORTED_LANGUAGES_LIST.map((language) => (
                <option key={language.code} value={language.code} className="bg-slate-900 text-zinc-100">
                  {language.nativeName} ({language.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            aria-pressed={preferences.showOriginal}
            onClick={() => onPreferencesChange({ ...preferences, showOriginal: !preferences.showOriginal })}
            className={`rounded-lg border px-2.5 py-2 text-xs transition ${preferences.showOriginal ? 'border-sky-500/60 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-900 text-zinc-400 hover:text-zinc-200'}`}
          >
            Gốc
          </button>
          <div className="relative">
            <button type="button" aria-label="Tùy chọn tải xuống" aria-expanded={isExportMenuOpen} onClick={() => setIsExportMenuOpen((current) => !current)} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-zinc-400 transition hover:bg-slate-800 hover:text-zinc-100">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {isExportMenuOpen && (
              <div className="absolute right-0 top-10 z-10 w-52 rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-xl">
                <button type="button" onClick={handleDownloadMinutesDirect} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-sky-300 hover:bg-slate-800"><FileCheck className="h-3.5 w-3.5 text-sky-400" /> Xuất biên bản họp (.md)</button>
                <button type="button" onClick={() => void handleExportMinutesPdf()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-sky-300 hover:bg-slate-800"><FileDown className="h-3.5 w-3.5 text-sky-400" /> Xuất biên bản PDF (.pdf)</button>
                <button type="button" onClick={handleDownloadTranscript} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-slate-800"><Download className="h-3.5 w-3.5" /> Tải transcript (.txt)</button>
                <button type="button" onClick={handleExportSrt} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-slate-800"><FileText className="h-3.5 w-3.5" /> Tải phụ đề (.srt)</button>
              </div>
            )}
          </div>
        </div>
        {languageError && <p role="alert" className="mt-2 text-xs text-red-400">{languageError}</p>}
      </header>

      {tabs.length > 1 && (
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 px-2 py-1.5" aria-label="Nội dung sidecar">
          {tabs.map((tab) => (
            <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition ${activeTab === tab.id ? 'bg-sky-500/15 text-sky-300' : 'text-zinc-400 hover:bg-slate-800 hover:text-zinc-300'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>
      )}

      {activeTab === 'all' && <LiveSubtitleView history={history} showOriginal={preferences.showOriginal} />}

      {activeTab === 'actions' && preferences.showActions && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-zinc-400">{taggedItems.length} mục đã nhận diện</span>
            <button type="button" onClick={toggleChime} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-slate-800">
              {chimeEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />} Âm báo
            </button>
          </div>

          {/* Laya filter pills */}
          {taggedItems.length > 0 && (
            <div className="mb-3 flex gap-1 overflow-x-auto pb-1 text-[11px]">
              <button
                type="button"
                onClick={() => setActionFilter('all')}
                className={`rounded-lg px-2 py-1 transition whitespace-nowrap ${actionFilter === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-300'}`}
              >
                Tất cả ({taggedItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('decision')}
                className={`rounded-lg px-2 py-1 transition whitespace-nowrap ${actionFilter === 'decision' ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-zinc-400 hover:text-zinc-300'}`}
              >
                Quyết định
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('action_item')}
                className={`rounded-lg px-2 py-1 transition whitespace-nowrap ${actionFilter === 'action_item' ? 'bg-amber-500/20 text-amber-300 font-medium' : 'text-zinc-400 hover:text-zinc-300'}`}
              >
                Việc làm
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('critical_risk')}
                className={`rounded-lg px-2 py-1 transition whitespace-nowrap ${actionFilter === 'critical_risk' ? 'bg-rose-500/20 text-rose-300 font-medium' : 'text-zinc-400 hover:text-zinc-300'}`}
              >
                Rủi ro
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('question')}
                className={`rounded-lg px-2 py-1 transition whitespace-nowrap ${actionFilter === 'question' ? 'bg-sky-500/20 text-sky-300 font-medium' : 'text-zinc-400 hover:text-zinc-300'}`}
              >
                Câu hỏi
              </button>
            </div>
          )}

          <div className="space-y-2">
            {filteredTaggedItems.map((item) => {
              const isRisk = item.tags?.includes('critical_risk');
              const isQuestion = item.tags?.includes('question');
              const isDecision = item.tags?.includes('decision');
              const isAction = item.tags?.includes('action_item');

              return (
                <article
                  key={item.id}
                  className={`rounded-xl border p-3 transition-all ${
                    isRisk
                      ? 'border-rose-500/30 bg-rose-500/10'
                      : isQuestion
                      ? 'border-blue-500/30 bg-blue-500/10'
                      : isDecision
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-zinc-800 bg-zinc-900/60'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium">
                      {isRisk && (
                        <span className="flex items-center gap-1 text-rose-400 font-semibold">
                          <AlertTriangle className="h-3.5 w-3.5" /> Rủi ro khẩn cấp
                        </span>
                      )}
                      {isQuestion && !isRisk && (
                        <span className="flex items-center gap-1 text-sky-400">
                          <HelpCircle className="h-3.5 w-3.5" /> Câu hỏi mở
                        </span>
                      )}
                      {isDecision && !isRisk && !isQuestion && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Quyết định
                        </span>
                      )}
                      {isAction && !isDecision && !isRisk && !isQuestion && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Zap className="h-3.5 w-3.5" /> Việc cần làm
                        </span>
                      )}
                    </div>
                    {item.participantName && (
                      <span className="text-[10px] text-zinc-400">{item.participantName}</span>
                    )}
                  </div>
                  <p className="text-sm leading-5 text-zinc-200">{item.translatedText || item.originalText}</p>
                </article>
              );
            })}
            {filteredTaggedItems.length === 0 && (
              <p className="py-12 text-center text-sm text-zinc-400">Không có mục nào phù hợp bộ lọc.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'recap' && preferences.showRecap && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Custom Skills Selector (Hidden when only default standard skill exists) */}
          {customSkills.length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
              <span className="text-xs text-zinc-400 whitespace-nowrap">Kỹ năng:</span>
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className="min-w-0 flex-1 truncate rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-sky-300 outline-none focus:border-sky-500"
              >
                <option value="default">Mặc định (Chuẩn điều hành MoM)</option>
                {customSkills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name} {skill.targetDepartment ? `(${skill.targetDepartment})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerateRecap}
            disabled={history.length === 0 || isGeneratingRecap}
            className="w-full rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-40"
          >
            {isGeneratingRecap ? 'Đang tạo tóm tắt…' : 'Tạo tóm tắt cuộc họp'}
          </button>

          {recapResult && (
            <div className="space-y-3 text-sm text-zinc-300">
              {/* Header with active skill badge & export */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-medium text-sky-400">
                  {recapResult.activeSkillName || 'Chuẩn Điều Hành'}
                </span>
                <button
                  type="button"
                  onClick={handleDownloadMinutesMarkdown}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-slate-800 hover:text-zinc-200 transition"
                  title="Tải biên bản họp định dạng Markdown"
                >
                  <FileCheck className="h-3.5 w-3.5 text-emerald-400" /> Tải biên bản (.md)
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportMinutesPdf()}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-slate-800 hover:text-zinc-200 transition"
                  title="Xuất biên bản PDF có thương hiệu"
                >
                  <FileDown className="h-3.5 w-3.5 text-sky-400" /> Xuất biên bản PDF
                </button>
              </div>

              {/* 1. Executive Highlights */}
              <section className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <h3 className="mb-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">Điểm chính</h3>
                {recapResult.executiveHighlights.map((highlight) => (
                  <p key={highlight} className="mb-1 leading-5 text-xs text-zinc-300">• {highlight}</p>
                ))}
              </section>

              {/* 2. Key Decisions (if any) */}
              {recapResult.decisions && recapResult.decisions.length > 0 && (
                <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Quyết Định Đã Chốt</span>
                  </div>
                  <div className="space-y-1.5">
                    {recapResult.decisions.map((decision) => (
                      <p key={decision} className="text-xs text-emerald-100/90 leading-relaxed">
                        ✓ {decision}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              {/* 3. Action Items (if any) */}
              {recapResult.actionItems && recapResult.actionItems.length > 0 && (
                <section className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    <ListTodo className="h-3.5 w-3.5" />
                    <span>Phân Công Nhiệm Vụ</span>
                  </div>
                  <div className="space-y-2">
                    {recapResult.actionItems.map((action, idx) => (
                      <div key={idx} className="rounded-lg bg-slate-950 border border-amber-500/20 p-2 text-xs">
                        <p className="font-medium text-amber-100">{action.task}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-zinc-400">
                          {action.owner && <span>Phụ trách: <strong className="text-zinc-200">{action.owner}</strong></span>}
                          {action.deadline && <span>Hạn: <strong className="text-amber-300">{action.deadline}</strong></span>}
                          {action.priority && (
                            <span className={`px-1.5 py-0.2 rounded ${action.priority === 'High' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-700 text-zinc-300'}`}>
                              {action.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <WorkflowSyncPanel
                meetingCode={meetingCode || 'meeting'}
                title={`${branding.brandName} — Meeting recap`}
                decisions={recapResult.decisions}
                actionItems={recapResult.actionItems}
              />

              <MinutesQaPanel
                transcript={minutesTranscript}
                recap={{
                  executiveHighlights: recapResult.executiveHighlights,
                  decisions: recapResult.decisions,
                  actionItems: recapResult.actionItems,
                  blockersAndRisks: recapResult.blockersAndRisks,
                }}
              />

              {/* 4. Discussion Topics */}
              <section className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <h3 className="mb-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">Chủ đề</h3>
                <div className="space-y-1.5">
                  {recapResult.topics.map((topic) => (
                    <div key={topic.id} className="text-xs">
                      <p className="font-medium text-zinc-200">{topic.title} · <span className="text-zinc-400">{topic.utteranceCount} câu</span></p>
                      {topic.samplePoints && topic.samplePoints.length > 0 && (
                        <p className="mt-0.5 text-[11px] text-zinc-400 italic line-clamp-1">"{topic.samplePoints[0]}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* 5. Blockers & Risks (if any) */}
              {recapResult.blockersAndRisks && recapResult.blockersAndRisks.length > 0 && (
                <section className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-rose-400 uppercase tracking-wider">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Điểm Nghẽn & Rủi Ro</span>
                  </div>
                  <div className="space-y-1">
                    {recapResult.blockersAndRisks.map((blocker, idx) => (
                      <p key={idx} className="text-xs text-rose-200/90 leading-relaxed">
                        • {blocker}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              {/* 6. Speaker Participation */}
              <section className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <h3 className="mb-2 text-xs font-semibold text-violet-400 uppercase tracking-wider">Người phát biểu</h3>
                <div className="space-y-2">
                  {recapResult.speakerStats.map((speaker) => (
                    <div key={speaker.name} className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-300">{speaker.name}</span>
                        <span className="text-zinc-400 font-mono">{speaker.percentage}% ({speaker.utteranceCount} câu)</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${speaker.percentage}%`, backgroundColor: speaker.accentColor }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {activeTab === 'chat' && preferences.showChat && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {chatMessages.map((message) => {
              const isMe = message.senderId === currentUserId;
              const links = message.text ? extractLinksFromText(message.text) : [];
              return (
                <div key={message.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="mb-1 px-1 text-[10px] text-zinc-400">{message.senderName}</span>
                  <div className={`max-w-[90%] space-y-2 rounded-xl px-3 py-2 text-xs leading-5 ${isMe ? 'bg-sky-600 text-white' : 'bg-slate-800 text-zinc-200'}`}>
                    {message.text && <p className="break-words">{message.text}</p>}
                    {links.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        {links.map((link) => (
                          <MeetingLinkPreviewCard
                            key={link.url}
                            url={link.url}
                            meetingCode={link.meetingCode || meetingCode}
                            meetingTitle={`Cuộc họp song ngữ ${branding.brandName}`}
                            compact
                            interactive
                          />
                        ))}
                      </div>
                    )}
                    {message.attachment && (
                      <>
                        <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${isMe ? 'border-sky-400/40 bg-sky-700/50' : 'border-slate-700 bg-slate-900'}`}>
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{message.attachment.name}</span>
                            <span className={`block text-[10px] ${isMe ? 'text-sky-100' : 'text-zinc-400'}`}>{formatFileSize(message.attachment.size)}</span>
                          </span>
                        </div>
                        {message.attachment.summaryTranslation && (
                          <div className={`rounded-lg border px-2.5 py-2 ${isMe ? 'border-sky-400/40 bg-sky-700/50' : 'border-sky-500/30 bg-sky-950/40'}`}>
                            <span className={`mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${isMe ? 'text-sky-100' : 'text-sky-400'}`}>
                              <Sparkles className="h-3 w-3" /> Tóm tắt dịch AI
                            </span>
                            <p>{message.attachment.summaryTranslation}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {onSendChatMessage && (
            <form onSubmit={handleSendChat} className="border-t border-slate-800 p-3">
              {pendingAttachment && (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-sky-500/30 bg-sky-950/40 px-2.5 py-2 text-xs text-zinc-300">
                  <span className="min-w-0 truncate"><Paperclip className="mr-1.5 inline h-3.5 w-3.5" />{pendingAttachment.name}</span>
                  <button type="button" onClick={clearPendingAttachment} aria-label="Bỏ tệp đính kèm" className="shrink-0 rounded p-1 text-zinc-400 hover:bg-slate-800 hover:text-zinc-200"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
              <div className="flex gap-2">
                {preferences.fileSharing && (
                  <>
                    <input ref={fileInputRef} type="file" accept=".pdf,.txt,image/*" onChange={handleFileSelected} className="hidden" aria-label="Chọn tệp đính kèm" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Đính kèm tệp" className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-zinc-400 transition hover:border-sky-500/40 hover:text-sky-300"><Paperclip className="h-4 w-4" /></button>
                  </>
                )}
                <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} aria-label="Tin nhắn" placeholder="Nhập tin nhắn…" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-sky-500" />
                <button type="submit" disabled={!chatInput.trim() && !pendingAttachment} aria-label="Gửi tin nhắn" className="rounded-xl bg-sky-600 p-2.5 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
              </div>
            </form>
          )}
        </div>
      )}
    </aside>
  );
};
