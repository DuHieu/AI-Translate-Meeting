import React, { useState } from 'react';
import { Send, Workflow } from 'lucide-react';
import type { MeetingActionItem } from '../../types/meeting';
import {
  getUserSettings,
  saveUserSettings,
  type ActionSyncPlatform,
} from '../../utils/userSettings';
import { syncMeetingActions } from '../../utils/workflowSync';

interface WorkflowSyncPanelProps {
  meetingCode: string;
  title: string;
  decisions: string[];
  actionItems: MeetingActionItem[];
  className?: string;
}

const PLATFORM_LABELS: Record<ActionSyncPlatform, string> = {
  slack: 'Slack',
  trello: 'Trello',
  jira: 'Jira',
  custom: 'Custom Webhook',
};

export const WorkflowSyncPanel: React.FC<WorkflowSyncPanelProps> = ({
  meetingCode,
  title,
  decisions,
  actionItems,
  className = '',
}) => {
  const initialSettings = getUserSettings();
  const [platform, setPlatform] = useState<ActionSyncPlatform>(initialSettings.actionSyncPlatform);
  const [webhookUrl, setWebhookUrl] = useState(initialSettings.actionSyncWebhookUrl);
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const handlePlatformChange = (next: ActionSyncPlatform) => {
    setPlatform(next);
    saveUserSettings({ actionSyncPlatform: next });
    setStatus(null);
  };

  const handleWebhookChange = (value: string) => {
    setWebhookUrl(value);
    saveUserSettings({ actionSyncWebhookUrl: value });
    setStatus(null);
  };

  const handleSync = async () => {
    if (actionItems.length === 0 && decisions.length === 0) {
      setStatus({ kind: 'error', message: 'Chưa có quyết định hoặc action item để đồng bộ.' });
      return;
    }
    setIsSyncing(true);
    setStatus(null);
    try {
      const result = await syncMeetingActions(platform, {
        meetingCode,
        title,
        decisions,
        actionItems,
      }, webhookUrl);
      setStatus({ kind: 'success', message: result.message });
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Không thể đồng bộ action items.' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className={`rounded-xl border border-violet-500/20 bg-violet-950/15 p-4 ${className}`} aria-labelledby={`workflow-sync-${meetingCode}`}>
      <div className="flex items-center gap-2">
        <Workflow className="h-4 w-4 text-violet-400" aria-hidden="true" />
        <h3 id={`workflow-sync-${meetingCode}`} className="text-sm font-semibold text-violet-200">Đồng bộ 1-Click (Slack / Trello / Jira)</h3>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[140px_1fr_auto]">
        <label className="sr-only" htmlFor={`workflow-platform-${meetingCode}`}>Nền tảng đích</label>
        <select
          id={`workflow-platform-${meetingCode}`}
          value={platform}
          onChange={(event) => handlePlatformChange(event.target.value as ActionSyncPlatform)}
          className="min-h-10 rounded-lg border border-white/10 bg-black/30 px-2.5 text-xs text-zinc-200 outline-none focus:border-violet-500"
        >
          {(Object.entries(PLATFORM_LABELS) as Array<[ActionSyncPlatform, string]>).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`workflow-webhook-${meetingCode}`}>Webhook URL tùy chọn</label>
        <input
          id={`workflow-webhook-${meetingCode}`}
          type="url"
          inputMode="url"
          maxLength={2048}
          value={webhookUrl}
          onChange={(event) => handleWebhookChange(event.target.value)}
          placeholder="Webhook URL HTTPS (tùy chọn)"
          className="min-h-10 min-w-0 rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-violet-500"
        />
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={isSyncing}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" /> {isSyncing ? 'Đang gửi…' : 'Đồng bộ'}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">Không có webhook? LayaMeet sẽ sao chép payload chuẩn để bạn dán vào connector. URL webhook được lưu trên trình duyệt này.</p>
      {status && <p role={status.kind === 'error' ? 'alert' : 'status'} className={`mt-2 text-xs ${status.kind === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>{status.message}</p>}
    </section>
  );
};
