import React, { useMemo } from 'react';
import { ExternalLink, Globe, Sparkles } from 'lucide-react';
import { LayaMeetLogo } from '../common/LayaMeetLogo';

interface MeetingLinkPreviewCardProps {
  url: string;
  meetingCode?: string;
  meetingTitle?: string;
  compact?: boolean;
  interactive?: boolean;
}

export const MeetingLinkPreviewCard: React.FC<MeetingLinkPreviewCardProps> = ({
  url,
  meetingCode,
  meetingTitle = 'Cuộc họp song ngữ LayaMeet',
  compact = false,
  interactive = true,
}) => {
  const parsed = useMemo(() => {
    try {
      const u = new URL(url);
      const roomMatch = u.pathname.match(/^\/(?:prejoin|join|meeting)\/([A-Za-z0-9_-]+)/i);
      const code = meetingCode || (roomMatch ? roomMatch[1].toUpperCase() : undefined);
      const isLaya =
        Boolean(code) ||
        (typeof window !== 'undefined' && u.origin === window.location.origin) ||
        /layameet|vimeet|localhost|trycloudflare|ngrok/i.test(u.hostname);
      return {
        hostname: u.hostname.replace(/^www\./i, ''),
        pathname: u.pathname,
        isLaya,
        code,
      };
    } catch {
      return {
        hostname: 'layameet.com',
        pathname: meetingCode ? `/prejoin/${meetingCode}` : '/',
        isLaya: Boolean(meetingCode),
        code: meetingCode,
      };
    }
  }, [url, meetingCode]);

  const cardContent = parsed.isLaya ? (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all ${
        compact
          ? 'border-sky-500/30 bg-slate-950/85 p-2.5 hover:border-sky-400/50'
          : 'border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950/80 p-3.5 hover:border-sky-500/50'
      }`}
    >
      {/* Left accent stripe like Slack/Telegram/Zalo rich unfurl */}
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 via-sky-400 to-indigo-500" />

      <div className="pl-2 flex items-start gap-3">
        {/* Brand Logo Box */}
        <div className="shrink-0 pt-0.5">
          <LayaMeetLogo size={compact ? 'sm' : 'md'} showWordmark={false} />
        </div>

        {/* Rich Unfurl Metadata */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-sky-400 flex items-center gap-1 truncate">
              <span>LayaMeet AI</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="font-mono text-slate-500 dark:text-slate-400 lowercase">{parsed.hostname}</span>
            </span>
            {parsed.code && (
              <span className="shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide">
                {parsed.code}
              </span>
            )}
          </div>

          <div className={`text-xs sm:text-sm font-bold truncate ${compact ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            {(() => {
              const safeTitle = (!meetingTitle || /vimeet|meeting/i.test(meetingTitle)) ? 'LayaMeet' : meetingTitle;
              return parsed.code ? `${safeTitle} - Phòng ${parsed.code}` : safeTitle;
            })()}
          </div>

          <p className={`text-[11px] leading-relaxed line-clamp-2 ${compact ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
            Phụ đề &amp; dịch thuật song ngữ AI trực tiếp (Việt · Nhật · Anh). Nhấn vào liên kết để tham gia ngay trên trình duyệt.
          </p>

          <div className="pt-0.5 flex items-center justify-between gap-2 text-[11px] text-blue-600 dark:text-sky-400 font-mono truncate">
            <span className="truncate">{url}</span>
            {interactive && <ExternalLink className="w-3 h-3 shrink-0 opacity-75 group-hover:opacity-100" />}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="group relative overflow-hidden rounded-xl border border-white/15 bg-slate-950/75 p-2.5 transition hover:border-sky-400/50">
      <div className="absolute inset-y-0 left-0 w-1 bg-slate-500" />
      <div className="pl-2 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sky-300">
          <Globe className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <span className="truncate">{parsed.hostname}</span>
            <Sparkles className="h-2.5 w-2.5 text-sky-400 shrink-0" />
          </div>
          <div className="truncate text-xs font-medium text-sky-300 group-hover:underline">
            {url}
          </div>
        </div>
        {interactive && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-sky-300" />}
      </div>
    </div>
  );

  if (!interactive) return cardContent;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block no-underline focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-xl"
    >
      {cardContent}
    </a>
  );
};
