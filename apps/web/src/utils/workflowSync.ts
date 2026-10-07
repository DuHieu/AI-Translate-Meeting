import type { MeetingActionItem } from '../types/meeting';
import type { ActionSyncPlatform } from './userSettings';

export interface WorkflowSyncInput {
  meetingCode: string;
  title: string;
  decisions: string[];
  actionItems: MeetingActionItem[];
}

export interface WorkflowSyncResult {
  mode: 'webhook' | 'clipboard';
  message: string;
}

function formatSummary(input: WorkflowSyncInput): string {
  const decisions = input.decisions.length
    ? input.decisions.map((item) => `- ${item}`).join('\n')
    : '- Chưa có quyết định.';
  const actions = input.actionItems.length
    ? input.actionItems.map((item) => {
        const metadata = [item.owner, item.deadline, item.priority].filter(Boolean).join(' · ');
        return `- [ ] ${item.task}${metadata ? ` (${metadata})` : ''}`;
      }).join('\n')
    : '- Chưa có action item.';
  return `Meeting ${input.meetingCode}: ${input.title}\n\nDecisions\n${decisions}\n\nAction items\n${actions}`;
}

export function buildWorkflowPayload(
  platform: ActionSyncPlatform,
  input: WorkflowSyncInput,
): unknown {
  const summary = formatSummary(input);
  switch (platform) {
    case 'slack':
      return {
        text: `LayaMeet recap · ${input.meetingCode}`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: `Meeting recap · ${input.meetingCode}` } },
          { type: 'section', text: { type: 'mrkdwn', text: summary } },
        ],
      };
    case 'trello':
      return {
        name: `LayaMeet actions · ${input.meetingCode}`,
        desc: summary,
        labels: ['LayaMeet', 'Meeting follow-up'],
        checklist: input.actionItems.map((item) => ({
          name: item.task,
          checked: false,
          owner: item.owner ?? null,
          due: item.deadline ?? null,
        })),
      };
    case 'jira':
      return {
        issues: input.actionItems.map((item) => ({
          fields: {
            summary: item.task,
            description: `${summary}\n\nOwner: ${item.owner || 'Unassigned'}\nDeadline: ${item.deadline || 'Not set'}`,
            issuetype: { name: 'Task' },
            labels: ['layameet', `meeting-${input.meetingCode.toLowerCase()}`],
            priority: item.priority ? { name: item.priority } : undefined,
          },
        })),
        decisions: input.decisions,
      };
    case 'custom':
      return {
        event: 'layameet.meeting_actions.ready',
        version: '1.0',
        meetingCode: input.meetingCode,
        title: input.title,
        decisions: input.decisions,
        actionItems: input.actionItems,
      };
  }
}

function validateWebhookUrl(value: string): string {
  if (value.length > 2048) throw new Error('Webhook URL quá dài.');
  const parsed = new URL(value);
  const isLocalHttp = parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('Webhook phải dùng HTTPS (HTTP chỉ được phép trên localhost).');
  }
  return parsed.toString();
}

async function copyPayload(payload: unknown): Promise<void> {
  if (!navigator.clipboard) throw new Error('Trình duyệt không hỗ trợ sao chép payload.');
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
}

export async function syncMeetingActions(
  platform: ActionSyncPlatform,
  input: WorkflowSyncInput,
  webhookUrl: string,
): Promise<WorkflowSyncResult> {
  const payload = buildWorkflowPayload(platform, input);
  const trimmedWebhook = webhookUrl.trim();

  if (trimmedWebhook) {
    const url = validateWebhookUrl(trimmedWebhook);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { mode: 'webhook', message: `Đã đồng bộ action items sang ${platform}.` };
    } catch {
      await copyPayload(payload);
      return {
        mode: 'clipboard',
        message: 'Webhook chưa nhận được dữ liệu (có thể do CORS). Payload đã được sao chép để gửi thủ công.',
      };
    }
  }

  await copyPayload(payload);
  return {
    mode: 'clipboard',
    message: `Đã đóng gói và sao chép payload ${platform}. Dán vào automation hoặc API connector của bạn.`,
  };
}
