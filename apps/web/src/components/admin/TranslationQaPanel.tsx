import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Download,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  LearnedPatternRecord,
  meetingApi,
  TranslationQaSample,
  TranslationQaSamplesResponse,
  TranslationQaSummaryResponse,
} from '../../api/meetingApi';
import { SUPPORTED_LANGUAGES_LIST } from '../../types/meeting';

interface TranslationQaPanelProps {
  adminKey: string;
  initialMeetingId?: string;
  onSummaryChange?: (summary: TranslationQaSummaryResponse) => void;
}

const EMPTY_FORM = {
  sourceLanguage: 'vi',
  targetLanguage: 'ja',
  sourceText: '',
  correctedTranslation: '',
  domain: 'general',
};

const ENGINE_LABELS: Record<string, string> = {
  google_gtx: 'GTX',
  mymemory: 'MyMemory',
  premium_ai: 'Pro AI',
  cache: 'Cache',
  learned_pattern: 'Pattern',
  glossary: 'Glossary',
  offline_pattern: 'Offline',
  tagged_fallback: 'Fallback',
};

function downloadJsonl(content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/x-ndjson;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `translation-training-${new Date().toISOString().slice(0, 10)}.jsonl`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function accuracyTone(value: number): string {
  if (value >= 90) return 'text-emerald-400';
  if (value >= 75) return 'text-amber-400';
  return 'text-red-400';
}

export const TranslationQaPanel: React.FC<TranslationQaPanelProps> = ({
  adminKey,
  initialMeetingId,
  onSummaryChange,
}) => {
  const [summary, setSummary] = useState<TranslationQaSummaryResponse | null>(null);
  const [data, setData] = useState<TranslationQaSamplesResponse>({ samples: [], learnedPatterns: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const [sampleCorrections, setSampleCorrections] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const [nextSummary, nextData] = await Promise.all([
        meetingApi.getAdminTranslationQaSummary(adminKey),
        meetingApi.getAdminTranslationQaSamples(adminKey, initialMeetingId),
      ]);
      setSummary(nextSummary);
      setData(nextData);
      onSummaryChange?.(nextSummary);
      setSampleCorrections(
        Object.fromEntries(
          nextData.samples.map((sample) => [
            sample.id,
            sample.correctedTranslation || sample.machineTranslation,
          ]),
        ),
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không tải được dữ liệu đánh giá dịch.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [adminKey, initialMeetingId, onSummaryChange]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleMeetings = useMemo(() => {
    if (!summary) return [];
    return initialMeetingId
      ? summary.meetings.filter((meeting) => meeting.meetingCode === initialMeetingId)
      : summary.meetings;
  }, [initialMeetingId, summary]);

  const updateTrainingMode = async () => {
    if (!summary) return;
    const nextValue = !summary.qaTrainingModeEnabled;
    setBusyAction('settings');
    try {
      await meetingApi.updateAdminTranslationQaSettings(adminKey, nextValue);
      const nextSummary = { ...summary, qaTrainingModeEnabled: nextValue };
      setSummary(nextSummary);
      onSummaryChange?.(nextSummary);
      setMessage({
        type: 'success',
        text: nextValue
          ? 'Đã bật thu thập mẫu opt-in với PII được che tự động.'
          : 'Đã tắt thu thập mẫu. Telemetry số vẫn tiếp tục, không lưu nội dung.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Không cập nhật được cài đặt.' });
    } finally {
      setBusyAction(null);
    }
  };

  const train = async (payload: {
    sampleId?: string;
    sourceLanguage: string;
    targetLanguage: string;
    sourceText: string;
    correctedTranslation: string;
    domain?: string;
  }) => {
    if (!payload.sourceText.trim() || !payload.correctedTranslation.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đủ câu nguồn và bản dịch đã xác minh.' });
      return;
    }
    setBusyAction(payload.sampleId || 'quick-train');
    try {
      await meetingApi.trainAdminTranslationPattern(adminKey, payload);
      setForm(EMPTY_FORM);
      setMessage({ type: 'success', text: 'Đã nạp Pattern Engine và Local Cache. Có hiệu lực ngay.' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Không train được mẫu dịch.' });
    } finally {
      setBusyAction(null);
    }
  };

  const trainSample = (sample: TranslationQaSample) => train({
    sampleId: sample.id,
    sourceLanguage: sample.sourceLanguage,
    targetLanguage: sample.targetLanguage,
    sourceText: sample.source,
    correctedTranslation: sampleCorrections[sample.id] || sample.machineTranslation,
    domain: sample.domain,
  });

  const removePattern = async (pattern: LearnedPatternRecord) => {
    setBusyAction(pattern.id);
    try {
      await meetingApi.deleteAdminTranslationPattern(adminKey, {
        sourceLanguage: pattern.sourceLanguage,
        targetLanguage: pattern.targetLanguage,
        sourceText: pattern.sourceText,
      });
      setMessage({ type: 'success', text: 'Đã xóa pattern lỗi thời.' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Không xóa được pattern.' });
    } finally {
      setBusyAction(null);
    }
  };

  const exportDataset = async () => {
    setBusyAction('export');
    try {
      downloadJsonl(await meetingApi.exportAdminTranslationDataset(adminKey));
      setMessage({ type: 'success', text: 'Đã xuất dataset JSONL.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Không xuất được dataset.' });
    } finally {
      setBusyAction(null);
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-10 text-center text-sm text-zinc-400" aria-busy="true">
        <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin text-blue-400" />
        Đang tải đánh giá chất lượng dịch…
      </div>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="translation-qa-title">
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <h2 id="translation-qa-title" className="text-sm font-bold text-white">Privacy &amp; PII Guard</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-300">
                Mặc định chỉ lưu telemetry số trong RAM. QA Training Mode là opt-in; Tự động che PII:
                {' '}[PHONE], [EMAIL], [NUMBER], [AMOUNT].
              </p>
              {initialMeetingId && <p className="mt-1 text-xs font-semibold text-sky-400">Đang lọc phòng: {initialMeetingId}</p>}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={summary?.qaTrainingModeEnabled ?? false}
            aria-label="QA Training Mode"
            disabled={busyAction === 'settings'}
            onClick={updateTrainingMode}
            className={`inline-flex min-w-48 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
              summary?.qaTrainingModeEnabled
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-700 bg-zinc-900 text-zinc-300'
            }`}
          >
            <span>QA Training Mode</span>
            <span className={`h-5 w-9 rounded-full p-0.5 ${summary?.qaTrainingModeEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition ${summary?.qaTrainingModeEnabled ? 'translate-x-4' : ''}`} />
            </span>
          </button>
        </div>
      </div>

      {message && (
        <div role="status" className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
          message.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ['Overall Accuracy', `${summary?.avgAccuracyPct.toFixed(1) ?? '0.0'}%`],
          ['Evaluated Utterances', String(summary?.totalSegments ?? 0)],
          ['Learned Patterns <1ms', String(summary?.learnedPatternsCount ?? 0)],
          ['Cache Hit Rate', `${summary?.cacheHitRatePct.toFixed(1) ?? '0.0'}%`],
          ['Avg Latency', `${summary?.avgLatencyMs.toFixed(0) ?? '0'} ms`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
            <div className="mt-1 font-mono text-xl font-black text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><BrainCircuit className="h-4 w-4 text-sky-400" /> Độ chính xác theo phòng</h3>
          <button type="button" onClick={() => void loadData()} disabled={isLoading} className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:text-white disabled:opacity-50" aria-label="Làm mới đánh giá dịch">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-zinc-950/50 text-zinc-400">
              <tr><th className="px-4 py-3">Room Code</th><th className="px-4 py-3">Utterances</th><th className="px-4 py-3">Accuracy</th><th className="px-4 py-3">STT Confidence</th><th className="px-4 py-3">Latency</th><th className="px-4 py-3">Engines</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {visibleMeetings.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Chưa có câu dịch final để đánh giá.</td></tr>
              ) : visibleMeetings.map((meeting) => (
                <tr key={meeting.meetingCode}>
                  <td className="px-4 py-3 font-mono font-bold text-sky-400">{meeting.meetingCode}</td>
                  <td className="px-4 py-3 text-zinc-300">{meeting.totalSegments}</td>
                  <td className="px-4 py-3">
                    <div className={`font-bold ${accuracyTone(meeting.avgAccuracyPct)}`}>{meeting.avgAccuracyPct.toFixed(1)}%</div>
                    <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${meeting.avgAccuracyPct}%` }} /></div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{meeting.avgSttConfidencePct.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-zinc-300">{meeting.avgLatencyMs.toFixed(0)} ms</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{Object.entries(meeting.engineBreakdown).map(([engine, count]) => <span key={engine} className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">{ENGINE_LABELS[engine] || engine} · {count}</span>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4"
          onSubmit={(event) => { event.preventDefault(); void train(form); }}
        >
          <h3 className="text-sm font-bold text-white">Thêm phrase đã xác minh</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-zinc-400">
              Ngôn ngữ nguồn
              <select
                value={form.sourceLanguage}
                onChange={(event) => setForm({ ...form, sourceLanguage: event.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 outline-none focus:border-blue-500"
              >
                {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName}) [{lang.code.toUpperCase()}]
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-400">
              Ngôn ngữ đích
              <select
                value={form.targetLanguage}
                onChange={(event) => setForm({ ...form, targetLanguage: event.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 outline-none focus:border-blue-500"
              >
                {SUPPORTED_LANGUAGES_LIST.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName}) [{lang.code.toUpperCase()}]
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs text-zinc-400">Câu nguồn<textarea value={form.sourceText} onChange={(event) => setForm({ ...form, sourceText: event.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200" /></label>
          <label className="block text-xs text-zinc-400">Bản dịch đã xác minh<textarea value={form.correctedTranslation} onChange={(event) => setForm({ ...form, correctedTranslation: event.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200" /></label>
          <button type="submit" disabled={busyAction === 'quick-train'} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50">Duyệt &amp; Nạp Engine (&lt;1ms)</button>
        </form>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
          <div className="border-b border-zinc-800 p-4"><h3 className="text-sm font-bold text-white">Queue mẫu đã che PII ({data.samples.length})</h3></div>
          <div className="max-h-[430px] divide-y divide-zinc-800 overflow-y-auto">
            {data.samples.length === 0 ? <div className="p-8 text-center text-xs text-zinc-500">Chưa có mẫu opt-in.</div> : data.samples.map((sample) => (
              <div key={sample.id} className="space-y-2 p-4 text-xs">
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-sky-400">{sample.sourceLanguage} → {sample.targetLanguage}</span><span className="text-zinc-500">{sample.accuracyScore.toFixed(1)}% · {sample.provider}</span></div>
                <p className="rounded bg-zinc-950/70 p-2 text-zinc-300">{sample.source}</p>
                <label className="block text-zinc-400">Bản dịch duyệt<input value={sampleCorrections[sample.id] ?? ''} onChange={(event) => setSampleCorrections({ ...sampleCorrections, [sample.id]: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200" /></label>
                <button type="button" disabled={busyAction === sample.id || sample.status === 'trained'} onClick={() => void trainSample(sample)} className="rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white hover:bg-emerald-500 disabled:opacity-50">{sample.status === 'trained' ? 'Đã train' : 'Duyệt & Train (<1ms)'}</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h3 className="text-sm font-bold text-white">Learned Patterns đang hoạt động ({data.learnedPatterns.length})</h3>
          <button type="button" onClick={() => void exportDataset()} disabled={busyAction === 'export'} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"><Download className="h-4 w-4" /> Xuất Dataset JSONL</button>
        </div>
        <div className="divide-y divide-zinc-800/70">
          {data.learnedPatterns.length === 0 ? <div className="p-8 text-center text-xs text-zinc-500">Chưa có learned pattern.</div> : data.learnedPatterns.map((pattern) => (
            <div key={pattern.id} className="grid gap-3 p-4 text-xs md:grid-cols-[100px_1fr_1fr_auto] md:items-center">
              <span className="font-mono font-bold text-sky-400">{pattern.sourceLanguage} → {pattern.targetLanguage}</span>
              <span className="text-zinc-300">{pattern.sourceText}</span>
              <span className="text-emerald-300">{pattern.translation}</span>
              <button type="button" onClick={() => void removePattern(pattern)} disabled={busyAction === pattern.id} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" aria-label={`Xóa pattern ${pattern.sourceText}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
