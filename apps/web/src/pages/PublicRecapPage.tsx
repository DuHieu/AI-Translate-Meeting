import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Copy, FileDown, FileText, ListTodo, Play, Share2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  DEFAULT_BRANDING_CONFIG,
  meetingApi,
  type BrandingConfigDto,
} from '../api/meetingApi';
import type { MeetingMinutesResponse } from '../types/meeting';
import { parseTranscriptFromMarkdown } from '../utils/meetingMinutes';
import { exportBrandedMeetingPdf } from '../utils/brandedPdfExport';
import { MinutesQaPanel } from '../components/meeting/MinutesQaPanel';
import { InteractiveMeetingReplay } from '../components/meeting/InteractiveMeetingReplay';

export const PublicRecapPage: React.FC = () => {
  const { meetingCode = '' } = useParams<{ meetingCode: string }>();
  const normalizedCode = meetingCode.trim().toUpperCase();
  const [minutes, setMinutes] = useState<MeetingMinutesResponse | null>(null);
  const [branding, setBranding] = useState<BrandingConfigDto>(DEFAULT_BRANDING_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'minutes' | 'replay'>('minutes');

  useEffect(() => {
    let cancelled = false;
    document.title = normalizedCode ? `Recap ${normalizedCode} | LayaMeet` : 'Meeting recap | LayaMeet';

    async function loadRecap() {
      setIsLoading(true);
      setError(null);
      const [minutesResult, brandingResult] = await Promise.allSettled([
        meetingApi.getMeetingMinutes(normalizedCode),
        meetingApi.getBrandingConfig(),
      ]);
      if (cancelled) return;

      if (brandingResult.status === 'fulfilled') setBranding(brandingResult.value);
      if (minutesResult.status === 'fulfilled') {
        setMinutes(minutesResult.value);
      } else {
        setError(minutesResult.reason instanceof Error
          ? minutesResult.reason.message
          : 'Không tìm thấy biên bản cuộc họp.');
      }
      setIsLoading(false);
    }

    if (normalizedCode) void loadRecap();
    else {
      setError('Mã cuộc họp không hợp lệ.');
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [normalizedCode]);

  const transcript = useMemo(
    () => minutes?.transcript ?? parseTranscriptFromMarkdown(minutes?.markdownContent ?? ''),
    [minutes],
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus('Đã sao chép link chia sẻ.');
    } catch {
      setCopyStatus('Không thể sao chép link.');
    }
  };

  const handlePdfExport = async () => {
    if (!minutes) return;
    try {
      await exportBrandedMeetingPdf({
        meetingCode: normalizedCode,
        title: minutes.title,
        createdAt: minutes.createdAt,
        executiveHighlights: minutes.summary.split('\n').filter(Boolean),
        decisions: minutes.decisions,
        actionItems: minutes.actionItems,
      }, branding);
      setCopyStatus('Đã mở bản in. Chọn “Save as PDF” để lưu file .pdf.');
    } catch (pdfError) {
      setCopyStatus(pdfError instanceof Error ? pdfError.message : 'Không thể xuất PDF.');
    }
  };

  if (isLoading) {
    return (
      <main className="flex content-page min-h-dvh items-center justify-center bg-zinc-950 text-zinc-300" aria-busy="true">
        <p className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">Đang tải biên bản cuộc họp…</p>
      </main>
    );
  }

  if (error || !minutes) {
    return (
      <main className="flex content-page min-h-dvh items-center justify-center bg-zinc-950 p-6 text-zinc-300">
        <section className="w-full max-w-md min-w-0 break-words rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
          <h1 className="text-xl font-semibold text-white">Chưa thể mở recap</h1>
          <p role="alert" className="mt-2 break-words text-sm text-rose-300">{error}</p>
          <Link to="/" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">
            <ArrowLeft className="h-4 w-4" /> Về trang chủ
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="content-page min-h-dvh bg-zinc-950 text-zinc-200">
      <header className="border-b border-zinc-800 bg-zinc-950/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="text-sm font-semibold text-sky-400">{branding.brandName}</Link>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => void handlePdfExport()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-sky-500">
              <FileDown className="h-4 w-4" /> Xuất biên bản PDF (.pdf)
            </button>
            <button type="button" onClick={handleCopyLink} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-sky-500">
              <Copy className="h-4 w-4" /> Sao chép link chia sẻ
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Public meeting recap · {normalizedCode}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{minutes.title}</h1>
          <p className="mt-2 break-words text-sm text-zinc-400">{new Date(minutes.createdAt).toLocaleString('vi-VN')}</p>
          {copyStatus && <p role="status" className="mt-2 break-words text-sm text-emerald-400">{copyStatus}</p>}
        </section>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('minutes')}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'minutes'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Biên bản & Quyết định</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('replay')}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'replay'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800'
            }`}
          >
            <Play className="h-4 w-4" />
            <span>Xem lại tương tác (Replay)</span>
          </button>
        </div>

        {activeTab === 'replay' ? (
          <div className="space-y-6">
            <InteractiveMeetingReplay meetingCode={normalizedCode} transcript={transcript} />
            <MinutesQaPanel
              transcript={transcript}
              recap={{
                executiveHighlights: minutes.summary.split('\n').filter(Boolean),
                decisions: minutes.decisions,
                actionItems: minutes.actionItems,
              }}
            />
          </div>
        ) : (
          <div className="space-y-5">
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-sky-300">Executive highlights</h2>
              <div className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">{minutes.summary}</div>
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Decisions</h2>
                {minutes.decisions.length ? (
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">{minutes.decisions.map((decision) => <li key={decision}>• {decision}</li>)}</ul>
                ) : <p className="mt-3 text-sm text-zinc-400">Chưa có quyết định được ghi nhận.</p>}
              </section>

              <section className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-300"><ListTodo className="h-4 w-4" /> Action items</h2>
                {minutes.actionItems.length ? (
                  <ul className="mt-3 space-y-3">{minutes.actionItems.map((item, index) => (
                    <li key={`${item.task}-${index}`} className="rounded-lg bg-black/20 p-3 text-sm">
                      <p className="font-medium text-zinc-100">{item.task}</p>
                      <p className="mt-1 text-xs text-zinc-400">Owner: {item.owner || 'Chưa gán'} · Deadline: {item.deadline || 'Chưa đặt'} · Priority: {item.priority || 'Medium'}</p>
                    </li>
                  ))}</ul>
                ) : <p className="mt-3 text-sm text-zinc-400">Chưa có action item được ghi nhận.</p>}
              </section>
            </div>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h2 className="text-sm font-semibold text-zinc-100">Nội dung chi tiết</h2>
              {transcript.length ? (
                <ol className="mt-3 space-y-3">{transcript.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-sky-500/40 pl-3 text-sm">
                    <p className="text-xs text-zinc-400">[{new Date(entry.timestamp).toLocaleTimeString('vi-VN')}] {entry.participantName}</p>
                    <p className="mt-1 leading-6 text-zinc-300">{entry.translatedText || entry.originalText}</p>
                  </li>
                ))}</ol>
              ) : (
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-zinc-400">{minutes.markdownContent}</pre>
              )}
            </section>

            <MinutesQaPanel
              transcript={transcript}
              recap={{
                executiveHighlights: minutes.summary.split('\n').filter(Boolean),
                decisions: minutes.decisions,
                actionItems: minutes.actionItems,
              }}
            />
          </div>
        )}

        <section className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-6 text-center">
          <Share2 className="mx-auto h-6 w-6 text-sky-400" />
          <h2 className="mt-3 text-xl font-semibold text-white">Tổ chức cuộc họp song ngữ miễn phí với LayaMeet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">Phụ đề trực tiếp, dịch AI và biên bản hành động trong cùng một không gian họp.</p>
          <Link to="/" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400">Bắt đầu miễn phí</Link>
        </section>
      </div>
    </main>
  );
};
