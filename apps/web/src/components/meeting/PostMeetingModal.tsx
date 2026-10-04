import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Copy, Download, ListTodo, LogOut, Save, X } from 'lucide-react';
import { meetingApi } from '../../api/meetingApi';
import type { BrandingConfigDto } from '../../api/meetingApi';
import type { SaveMeetingMinutesRequest } from '../../types/meeting';
import type { GeneratedRecap } from '../../utils/aiRecapEngine';

interface PostMeetingModalProps {
  isOpen: boolean;
  meetingCode: string;
  recap: GeneratedRecap;
  branding: BrandingConfigDto;
  onClose: () => void;
  onLeaveRoom: () => void;
}

function buildMarkdown(
  meetingCode: string,
  recap: GeneratedRecap,
  branding: BrandingConfigDto,
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
  ].join('\n');
}

export const PostMeetingModal: React.FC<PostMeetingModalProps> = ({
  isOpen,
  meetingCode,
  recap,
  branding,
  onClose,
  onLeaveRoom,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const markdownContent = useMemo(
    () => buildMarkdown(meetingCode, recap, branding),
    [branding, meetingCode, recap],
  );

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    setStatus(null);
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const savePayload: SaveMeetingMinutesRequest = {
    title: `${branding.brandName} — Biên bản cuộc họp ${meetingCode}`,
    summary: recap.executiveHighlights.join('\n'),
    markdownContent,
    decisions: recap.decisions,
    actionItems: recap.actionItems,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setStatus({ kind: 'success', message: 'Đã sao chép biên bản.' });
    } catch {
      setStatus({ kind: 'error', message: 'Không thể sao chép. Hãy thử tải file Markdown.' });
    }
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `meeting-minutes-${meetingCode.toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus({ kind: 'success', message: 'Đã tải biên bản Markdown.' });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      await meetingApi.saveMeetingMinutes(meetingCode, savePayload);
      setStatus({ kind: 'success', message: 'Đã lưu biên bản lên máy chủ.' });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Không thể lưu biên bản lên máy chủ.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-meeting-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-zinc-800 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              {branding.brandName} · Post-meeting recap
            </p>
            <h2 id="post-meeting-title" className="mt-1 text-xl font-semibold text-white">
              Biên bản cuộc họp {meetingCode}
            </h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng biên bản" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:p-6 lg:grid-cols-2">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold text-zinc-100">Executive highlights</h3>
            <ul className="space-y-2 text-sm leading-6 text-zinc-300">
              {recap.executiveHighlights.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </section>

          <section className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Decisions</h3>
            {recap.decisions.length ? (
              <ul className="space-y-2 text-sm text-zinc-300">{recap.decisions.map((item) => <li key={item}>• {item}</li>)}</ul>
            ) : <p className="text-sm text-zinc-500">Chưa có quyết định được ghi nhận.</p>}
          </section>

          <section className="rounded-xl border border-amber-900/70 bg-amber-950/20 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-300"><ListTodo className="h-4 w-4" /> Action items</h3>
            {recap.actionItems.length ? (
              <ul className="space-y-3 text-sm text-zinc-300">{recap.actionItems.map((item, index) => (
                <li key={`${item.task}-${index}`} className="rounded-lg bg-black/20 p-3">
                  <p className="font-medium text-zinc-100">{item.task}</p>
                  <p className="mt-1 text-xs text-zinc-500">{[item.owner, item.deadline, item.priority].filter(Boolean).join(' · ') || 'Chưa có người phụ trách/hạn chót'}</p>
                </li>
              ))}</ul>
            ) : <p className="text-sm text-zinc-500">Chưa có action item được ghi nhận.</p>}
          </section>
        </div>

        <footer className="border-t border-zinc-800 px-5 py-4 sm:px-6">
          {status && <p role={status.kind === 'error' ? 'alert' : 'status'} className={`mb-3 text-sm ${status.kind === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>{status.message}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleCopy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-sky-500"><Copy className="h-4 w-4" /> Sao chép</button>
            <button type="button" onClick={handleDownload} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-sky-500"><Download className="h-4 w-4" /> Tải Markdown</button>
            <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-sky-400"><Save className="h-4 w-4" /> {isSaving ? 'Đang lưu…' : 'Lưu lên máy chủ'}</button>
            <button type="button" onClick={onLeaveRoom} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400"><LogOut className="h-4 w-4" /> Rời cuộc họp</button>
          </div>
        </footer>
      </div>
    </div>
  );
};
