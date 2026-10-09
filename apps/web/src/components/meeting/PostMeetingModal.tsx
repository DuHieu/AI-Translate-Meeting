import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Copy, Download, FileDown, ListTodo, LogOut, Sparkles, Video, X } from 'lucide-react';
import { meetingApi, setCachedMeetingMinutes } from '../../api/meetingApi';
import type { BrandingConfigDto } from '../../api/meetingApi';
import type { SaveMeetingMinutesRequest } from '../../types/meeting';
import type { GeneratedRecap } from '../../utils/aiRecapEngine';
import type { SubtitleMessage } from '../../types/subtitle';
import { buildTranscriptMarkdown, toMeetingTranscript } from '../../utils/meetingMinutes';
import { exportBrandedMeetingPdf } from '../../utils/brandedPdfExport';
import { meetingStorage } from '../../utils/meetingStorage';
import { WorkflowSyncPanel } from './WorkflowSyncPanel';

interface PostMeetingModalProps {
  isOpen: boolean;
  meetingCode: string;
  recap: GeneratedRecap;
  history: SubtitleMessage[];
  branding: BrandingConfigDto;
  recordingDownloadUrl?: string | null;
  onClose: () => void;
  onLeaveRoom: () => void;
}

function buildMarkdown(
  meetingCode: string,
  recap: GeneratedRecap,
  branding: BrandingConfigDto,
  history: SubtitleMessage[],
): string {
  const actions = recap.actionItems.length
    ? recap.actionItems.map((item) => {
        const details = [
          item.owner ? `Owner: ${item.owner}` : '',
          item.deadline ? `Deadline: ${item.deadline}` : '',
          item.priority ? `Priority: ${item.priority}` : '',
        ].filter(Boolean).join(' · ');
        return `- [ ] ${item.task}${details ? ` (${details})` : ''}`;
      })
    : ['- Không có action item.'];

  const transcript = toMeetingTranscript(history);
  return [
    `# ${branding.brandName} — Biên bản cuộc họp ${meetingCode}`,
    '',
    `_${branding.copyrightText}_`,
    '',
    `> ${branding.slogan}`,
    '',
    '## Executive highlights',
    ...recap.executiveHighlights.map((item) => `- ${item}`),
    '',
    '## Decisions',
    ...(recap.decisions.length ? recap.decisions.map((item) => `- ${item}`) : ['- Chưa có quyết định được ghi nhận.']),
    '',
    '## Action items',
    ...actions,
    ...buildTranscriptMarkdown(transcript),
    '',
    '---',
    '_Biên bản cuộc họp được tổng hợp & dịch tự động bởi [LayaMeet AI](https://layameet.com) — Nền tảng họp trực tuyến xóa bỏ rào cản ngôn ngữ._',
  ].join('\n');
}

export const PostMeetingModal: React.FC<PostMeetingModalProps> = ({
  isOpen,
  meetingCode,
  recap,
  history,
  branding,
  recordingDownloadUrl,
  onClose,
  onLeaveRoom,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const _getPublicRecapUrl = () => new URL(`/recap/${encodeURIComponent(meetingCode)}`, window.location.origin).toString();

  const markdownContent = useMemo(
    () => buildMarkdown(meetingCode, recap, branding, history),
    [branding, history, meetingCode, recap],
  );

  const savePayload = useMemo<SaveMeetingMinutesRequest>(() => ({
    title: `${branding.brandName} — Biên bản cuộc họp ${meetingCode}`,
    summary: recap.executiveHighlights.join('\n'),
    markdownContent,
    decisions: recap.decisions,
    actionItems: recap.actionItems,
    transcript: toMeetingTranscript(history),
  }), [branding.brandName, history, markdownContent, meetingCode, recap.actionItems, recap.decisions, recap.executiveHighlights]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    setStatus(null);

    const now = new Date().toISOString();
    setCachedMeetingMinutes(meetingCode, {
      id: `local-${meetingCode.toUpperCase()}`,
      meetingCode: meetingCode.toUpperCase(),
      title: savePayload.title,
      summary: savePayload.summary,
      markdownContent: savePayload.markdownContent,
      decisions: savePayload.decisions ?? [],
      actionItems: savePayload.actionItems ?? [],
      createdAt: now,
      transcript: savePayload.transcript,
    });

    meetingStorage.addLocalHistory({
      meetingId: '',
      meetingCode: meetingCode.toUpperCase(),
      name: `Cuộc họp ${meetingCode.toUpperCase()}`,
      createdAt: now,
      endedAt: now,
      hasMinutes: true,
      title: savePayload.title,
      summaryExcerpt: savePayload.summary.split('\n')[0]?.substring(0, 100) || '',
      participantCount: 0,
    });

    meetingApi.saveMeetingMinutes(meetingCode, savePayload).catch(err => {
      console.error('Failed to save meeting minutes to cloud:', err);
    });

    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, meetingCode, onClose, savePayload]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setStatus({ kind: 'success', message: 'Đã sao chép biên bản tóm tắt vào clipboard.' });
    } catch {
      setStatus({ kind: 'error', message: 'Không thể sao chép. Hãy thử tải file.' });
    }
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `meeting-minutes-${meetingCode.toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus({ kind: 'success', message: 'Đã tải file Markdown (.md).' });
    meetingApi.saveMeetingMinutes(meetingCode, savePayload).catch(() => {});
  };

  const handlePdfExport = async () => {
    try {
      await exportBrandedMeetingPdf({
        meetingCode,
        title: savePayload.title,
        createdAt: new Date().toISOString(),
        executiveHighlights: recap.executiveHighlights,
        decisions: recap.decisions,
        actionItems: recap.actionItems,
      }, branding);
      setStatus({ kind: 'success', message: 'Đã mở giao diện in. Chọn “Save as PDF” để lưu file.' });
      meetingApi.saveMeetingMinutes(meetingCode, savePayload).catch(() => {});
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Không thể xuất PDF.' });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm sm:p-6">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-meeting-title"
        className="post-meeting-dialog flex max-h-[calc(var(--app-height,100dvh)-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#3c4043] bg-[#202124] text-[#e8eaed] shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#3c4043] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8ab4f8]/15 text-[#8ab4f8]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="post-meeting-title" className="text-base font-semibold text-white">
                Biên bản cuộc họp
              </h2>
              <p className="text-xs text-[#9aa0a6]">
                Phòng: <span className="font-mono font-medium text-zinc-300">{meetingCode.toUpperCase()}</span> · {branding.brandName}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-2 text-[#9aa0a6] hover:bg-[#3c4043] hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#8ab4f8]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* Recording Banner (if present) */}
          {recordingDownloadUrl && (
            <div className="flex items-center justify-between rounded-xl border border-[#3c4043] bg-[#303134] px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
                  <Video className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white">Bản ghi cuộc họp đã sẵn sàng</p>
                  <p className="text-[11px] text-[#9aa0a6] truncate">Video định dạng WebM có thể tải về thiết bị</p>
                </div>
              </div>
              <a
                href={recordingDownloadUrl}
                download={`meeting-recording-${meetingCode.toLowerCase()}.webm`}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#3c4043] hover:bg-[#5f6368] text-xs font-medium text-white px-3.5 py-1.5 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Tải video
              </a>
            </div>
          )}

          {/* Executive Highlights */}
          <section className="rounded-xl border border-[#3c4043] bg-[#282a2d] p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8ab4f8]">
              Điểm chính cuộc họp
            </h3>
            {recap.executiveHighlights.length > 0 ? (
              <ul className="space-y-1.5 text-sm text-[#bdc1c6] leading-relaxed">
                {recap.executiveHighlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#8ab4f8] mt-1 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#9aa0a6]">Cuộc họp không có ghi chú nổi bật.</p>
            )}
          </section>

          {/* Decisions & Action items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Decisions */}
            <section className="rounded-xl border border-[#3c4043] bg-[#282a2d] p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-[#81c995]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#81c995]">
                  Quyết định ({recap.decisions.length})
                </h3>
              </div>
              {recap.decisions.length > 0 ? (
                <ul className="space-y-2 text-sm text-[#bdc1c6]">
                  {recap.decisions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm">
                      <span className="text-[#81c995] shrink-0 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#9aa0a6]">Chưa ghi nhận quyết định nào.</p>
              )}
            </section>

            {/* Action Items */}
            <section className="rounded-xl border border-[#3c4043] bg-[#282a2d] p-4">
              <div className="flex items-center gap-2 mb-2">
                <ListTodo className="h-4 w-4 text-[#fdd663]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#fdd663]">
                  Việc cần làm ({recap.actionItems.length})
                </h3>
              </div>
              {recap.actionItems.length > 0 ? (
                <ul className="space-y-2.5 text-sm text-[#bdc1c6]">
                  {recap.actionItems.map((item, idx) => (
                    <li key={idx} className="rounded-lg bg-[#202124] p-2.5 border border-[#3c4043]">
                      <p className="text-xs sm:text-sm font-medium text-white">{item.task}</p>
                      {(item.owner || item.deadline || item.priority) && (
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-[#9aa0a6]">
                          {item.owner && <span className="rounded bg-[#303134] px-1.5 py-0.5">{item.owner}</span>}
                          {item.deadline && <span className="rounded bg-[#303134] px-1.5 py-0.5">{item.deadline}</span>}
                          {item.priority && <span className="rounded bg-[#303134] px-1.5 py-0.5">{item.priority}</span>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#9aa0a6]">Chưa có việc cần làm được giao.</p>
              )}
            </section>
          </div>

          {/* Advanced Integrations (Discreet and Collapsed by default) */}
          <details className="rounded-xl border border-[#3c4043]/60 bg-[#282a2d]/30 p-3 text-xs text-[#9aa0a6]">
            <summary className="cursor-pointer select-none font-medium hover:text-[#e8eaed] transition-colors">
              Tùy chọn đồng bộ nâng cao (Slack / Trello)
            </summary>
            <div className="mt-3 pt-3 border-t border-[#3c4043]/60">
              <WorkflowSyncPanel
                meetingCode={meetingCode}
                title={savePayload.title}
                decisions={recap.decisions}
                actionItems={recap.actionItems}
              />
            </div>
          </details>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#3c4043] bg-[#202124] px-6 py-4">
          {status && (
            <p
              role={status.kind === 'error' ? 'alert' : 'status'}
              className={`mb-3 text-xs ${status.kind === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}
            >
              {status.message}
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            {/* Left export tools */}
            <div className="grid grid-cols-[1fr_1fr_auto] sm:flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#5f6368] px-2.5 sm:px-3.5 py-2 sm:py-1.5 text-xs sm:text-sm font-medium text-zinc-200 hover:bg-[#303134] hover:text-white transition-colors whitespace-nowrap"
              >
                <Copy className="h-3.5 w-3.5 text-[#8ab4f8] shrink-0" />
                <span className="sm:hidden">Sao chép</span>
                <span className="hidden sm:inline">Sao chép tóm tắt</span>
              </button>
              <button
                type="button"
                onClick={() => void handlePdfExport()}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#5f6368] px-2.5 sm:px-3.5 py-2 sm:py-1.5 text-xs sm:text-sm font-medium text-zinc-200 hover:bg-[#303134] hover:text-white transition-colors whitespace-nowrap"
              >
                <FileDown className="h-3.5 w-3.5 text-[#8ab4f8] shrink-0" />
                <span className="sm:hidden">Xuất PDF</span>
                <span className="hidden sm:inline">Xuất biên bản PDF</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-[#3c4043] px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-[#9aa0a6] hover:bg-[#303134] hover:text-zinc-200 transition-colors whitespace-nowrap"
                title="Tải biên bản định dạng Markdown"
              >
                <Download className="h-3.5 w-3.5 shrink-0" /> .MD
              </button>
            </div>

            {/* Right actions */}
            <div className="grid grid-cols-2 sm:flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#3c4043] sm:border-transparent px-4 py-2 text-xs sm:text-sm font-medium text-[#9aa0a6] hover:bg-[#303134] hover:text-white transition-colors text-center"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={onLeaveRoom}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#b91c1c] px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#991b1b] shadow-sm transition-colors whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" /> Rời cuộc họp
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
