import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Users,
  ExternalLink,
  Search,
  FileText,
  Copy,
  Check,
  Sparkles,
  Video,
  Calendar,
} from 'lucide-react';
import { PublicPageShell } from '../components/common/PublicPageShell';
import { meetingApi } from '../api/meetingApi';
import { meetingStorage } from '../utils/meetingStorage';
import { MeetingHistoryItemDto } from '../types/meeting';
import { useAuth } from '../context/auth-context-def';
import { useLanguage } from '../context/language-context-def';
import { AppLanguage } from '../i18n';
import { copyText } from '../utils/clipboard';

interface HistoryPageProps {
  forcedLanguage?: AppLanguage;
}

interface HistoryCopy {
  breadcrumb: string;
  pageTitle: string;
  pageHeading: string;
  pageSubtitle: string;
  searchInput: string;
  totalMeetings: string;
  withMinutes: string;
  viewMinutes: string;
  rejoinRoom: string;
  copyCode: string;
  copied: string;
  emptyTitle: string;
  emptyDesc: string;
  startMeeting: string;
  loadingText: string;
  filterAll: string;
  filterWithMinutes: string;
  metaDesc: string;
  badgeHistory: string;
  participants: string;
}

const HISTORY_COPY: Record<string, HistoryCopy> = {
  vi: {
    breadcrumb: 'Lịch sử cuộc họp',
    pageTitle: 'Lịch Sử Cuộc Họp & Biên Bản AI | Laya Meet',
    pageHeading: 'Lịch Sử Cuộc Họp',
    pageSubtitle: 'Xem lại danh sách cuộc họp đã tham gia, truy cập phụ đề song ngữ và biên bản họp trích xuất bằng AI.',
    searchInput: 'Tìm kiếm theo tên phòng, mã cuộc họp hoặc nội dung tóm tắt...',
    totalMeetings: 'Tổng cuộc họp',
    withMinutes: 'Có biên bản AI',
    viewMinutes: 'Xem biên bản họp',
    rejoinRoom: 'Vào lại phòng',
    copyCode: 'Sao chép mã',
    copied: 'Đã sao chép!',
    emptyTitle: 'Chưa có lịch sử cuộc họp nào',
    emptyDesc: 'Các cuộc họp bạn tham gia kèm phụ đề song ngữ, tóm tắt và biên bản họp AI sẽ được tự động lưu trữ tại đây.',
    startMeeting: 'Bắt đầu cuộc họp mới',
    loadingText: 'Đang tải lịch sử cuộc họp...',
    filterAll: 'Tất cả cuộc họp',
    filterWithMinutes: 'Chỉ có biên bản AI',
    metaDesc: 'Tra cứu lịch sử cuộc họp trực tuyến song ngữ và tải biên bản họp AI với Laya Meet.',
    badgeHistory: 'Lịch sử lưu trữ',
    participants: 'người tham gia',
  },
  en: {
    breadcrumb: 'Meeting History',
    pageTitle: 'Meeting History & AI Minutes Recap | Laya Meet',
    pageHeading: 'Meeting History',
    pageSubtitle: 'Review past meetings, access full bilingual subtitles, and view AI-generated meeting minutes and action items.',
    searchInput: 'Search by room title, meeting code, or summary text...',
    totalMeetings: 'Total Meetings',
    withMinutes: 'With AI Minutes',
    viewMinutes: 'View Minutes',
    rejoinRoom: 'Rejoin Room',
    copyCode: 'Copy Code',
    copied: 'Copied!',
    emptyTitle: 'No meeting history yet',
    emptyDesc: 'Meetings you attend along with live bilingual subtitles, key decisions, and AI recaps will automatically appear here.',
    startMeeting: 'Start a New Meeting',
    loadingText: 'Loading meeting history...',
    filterAll: 'All Meetings',
    filterWithMinutes: 'With AI Minutes Only',
    metaDesc: 'Search past bilingual AI video meetings and download minutes recaps with Laya Meet.',
    badgeHistory: 'Archived History',
    participants: 'participants',
  },
  ja: {
    breadcrumb: '会議履歴',
    pageTitle: '会議履歴 & AI議事録アーカイブ | Laya Meet',
    pageHeading: '会議履歴',
    pageSubtitle: '過去に参加したオンライン会議の履歴、多言語字幕ログ、AI要約議事録を確認・エクスポートできます。',
    searchInput: '会議名、ルームコード、要約テキストで検索...',
    totalMeetings: '合計会議数',
    withMinutes: 'AI議事録あり',
    viewMinutes: '議事録を見る',
    rejoinRoom: '再入室する',
    copyCode: 'コードをコピー',
    copied: 'コピー済み!',
    emptyTitle: '会議履歴はまだありません',
    emptyDesc: '参加した会議の多言語字幕、決定事項、AI自動作成の議事録はここに自動的に保存されます。',
    startMeeting: '新しい会議を開始',
    loadingText: '会議履歴を読み込み中...',
    filterAll: 'すべての会議',
    filterWithMinutes: 'AI議事録ありのみ',
    metaDesc: 'Laya Meet AI多言語オンライン会議の履歴一覧と議事録アーカイブ。',
    badgeHistory: '履歴アーカイブ',
    participants: '名参加',
  },
};

export const HistoryPage: React.FC<HistoryPageProps> = ({ forcedLanguage }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const currentLang = forcedLanguage || language;
  const copy = HISTORY_COPY[currentLang] || HISTORY_COPY.vi;

  const [history, setHistory] = useState<MeetingHistoryItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMinutesOnly, setFilterMinutesOnly] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const effectiveEmail =
    user?.email?.trim() || localStorage.getItem('layameet:last-user-email') || undefined;

  useEffect(() => {
    document.title = copy.pageTitle;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', copy.metaDesc);
    }
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', 'https://layameet.com/history');
    }
  }, [copy]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchHistory = async () => {
      try {
        const local = meetingStorage.getLocalHistory();
        let cloud: MeetingHistoryItemDto[] = [];
        try {
          cloud = await meetingApi.getMeetingHistory(effectiveEmail);
        } catch (err) {
          console.warn('Could not fetch cloud history', err);
        }

        const mergedMap = new Map<string, MeetingHistoryItemDto>();
        local.forEach((item) => mergedMap.set(item.meetingCode, item));
        cloud.forEach((item) => mergedMap.set(item.meetingCode, item));

        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        if (!cancelled) {
          setHistory(merged);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [effectiveEmail]);

  const handleCopyCode = async (code: string) => {
    if (await copyText(code)) {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (filterMinutesOnly && !item.hasMinutes) {
        return false;
      }
      if (!searchQuery.trim()) {
        return true;
      }
      const query = searchQuery.toLowerCase();
      const nameMatch = (item.name || '').toLowerCase().includes(query);
      const codeMatch = (item.meetingCode || '').toLowerCase().includes(query);
      const titleMatch = (item.title || '').toLowerCase().includes(query);
      const summaryMatch = (item.summaryExcerpt || '').toLowerCase().includes(query);
      return nameMatch || codeMatch || titleMatch || summaryMatch;
    });
  }, [history, filterMinutesOnly, searchQuery]);

  const statsWithMinutes = useMemo(() => {
    return history.filter((item) => item.hasMinutes).length;
  }, [history]);

  return (
    <PublicPageShell
      forcedLanguage={forcedLanguage}
      activeDrawerId="history"
      breadcrumbs={[
        {
          label: copy.breadcrumb,
          current: true,
        },
      ]}
    >
      <div className="w-full max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        {/* ── Page Header & Stats ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-200/80 dark:border-[#272832]/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{copy.badgeHistory}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
              {copy.pageHeading}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
              {copy.pageSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#15161b]/70 border border-zinc-200/80 dark:border-[#262832]/80 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">{copy.totalMeetings}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-white">{history.length}</div>
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#15161b]/70 border border-zinc-200/80 dark:border-[#262832]/80 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">{copy.withMinutes}</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{statsWithMinutes}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Search & Filter Toolbar ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={copy.searchInput}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#15161b] border border-zinc-200 dark:border-[#2a2c36] text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterMinutesOnly(false)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                !filterMinutesOnly
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#15161b] border border-zinc-200 dark:border-[#2a2c36] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {copy.filterAll}
            </button>
            <button
              type="button"
              onClick={() => setFilterMinutesOnly(true)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                filterMinutesOnly
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#15161b] border border-zinc-200 dark:border-[#2a2c36] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{copy.filterWithMinutes}</span>
            </button>
          </div>
        </div>

        {/* ── Meeting History List ── */}
        {loading ? (
          <div className="p-16 text-center rounded-3xl bg-white/60 dark:bg-[#141519]/60 border border-zinc-200/80 dark:border-[#262832]/80 text-zinc-500 text-sm">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p>{copy.loadingText}</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-14 text-center border-2 border-dashed border-zinc-200 dark:border-[#282a35] rounded-3xl bg-white/40 dark:bg-[#141519]/40">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <Clock className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
              {copy.emptyTitle}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6 leading-relaxed">
              {copy.emptyDesc}
            </p>
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition cursor-pointer shadow-sm"
            >
              {copy.startMeeting}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHistory.map((item) => {
              const formattedDate = new Date(item.createdAt).toLocaleString(
                currentLang === 'ja' ? 'ja-JP' : currentLang === 'en' ? 'en-US' : 'vi-VN',
                {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                },
              );

              return (
                <div
                  key={item.meetingCode}
                  className="p-5 rounded-2xl bg-white dark:bg-[#15161b] border border-zinc-200/90 dark:border-[#272832] hover:border-blue-500/40 shadow-xs transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.name || `Cuộc họp ${item.meetingCode}`}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formattedDate}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>{item.participantCount || 0} {copy.participants}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/80">
                          {item.meetingCode}
                        </span>
                      </div>
                    </div>

                    {item.title && (
                      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {item.title}
                      </div>
                    )}

                    {item.summaryExcerpt && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/60">
                        {item.summaryExcerpt}
                      </p>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(item.meetingCode)}
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                        title={copy.copyCode}
                      >
                        {copiedCode === item.meetingCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500">{copy.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copy.copyCode}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/meeting/${item.meetingCode}`)}
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>{copy.rejoinRoom}</span>
                      </button>
                    </div>

                    {item.hasMinutes && (
                      <button
                        type="button"
                        onClick={() => navigate(`/recap/${item.meetingCode}`)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{copy.viewMinutes}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PublicPageShell>
  );
};
