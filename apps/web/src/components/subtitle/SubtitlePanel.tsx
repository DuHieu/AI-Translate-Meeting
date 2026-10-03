import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SubtitleMessage } from '../../types/subtitle';
import { ChatMessage } from '../../types/meeting';
import {
  X,
  Zap,
  CheckCircle2,
  Sliders,
  Copy,
  Check,
  Send,
  Mic,
  Download,
  Search,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
  FileText,
  FileCode,
  MessageCircle,
  Volume2,
  Bell,
  BellOff,
  RefreshCw,
  ChevronDown,
  Headphones,
} from 'lucide-react';
import { formatTimestamp } from '../../utils';
import { generateMeetingRecap, GeneratedRecap } from '../../utils/aiRecapEngine';
import { speakText, stopSpeech } from '../../utils/speechAndAudio';

interface SubtitlePanelProps {
  history: SubtitleMessage[];
  isOpen: boolean;
  onClose: () => void;
  onSendSpeechText?: (text: string) => void;
  chatMessages?: ChatMessage[];
  onSendChatMessage?: (text: string) => void;
  currentUserId?: string;
  meetingCode?: string;
  initialTab?: 'all' | 'actions' | 'recap' | 'chat';
  isAudioBoothEnabled?: boolean;
  onToggleAudioBooth?: () => void;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatSrtTimestamp(isoString: string, offsetSec: number): string {
  const d = new Date(isoString);
  const time = isNaN(d.getTime()) ? new Date() : d;
  time.setSeconds(time.getSeconds() + offsetSec);
  const hours = String(time.getUTCHours()).padStart(2, '0');
  const minutes = String(time.getUTCMinutes()).padStart(2, '0');
  const seconds = String(time.getUTCSeconds()).padStart(2, '0');
  const ms = String(time.getUTCMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds},${ms}`;
}

export const SubtitlePanel: React.FC<SubtitlePanelProps> = ({
  history,
  isOpen,
  onClose,
  onSendSpeechText,
  chatMessages = [],
  onSendChatMessage,
  currentUserId,
  meetingCode,
  initialTab = 'all',
  isAudioBoothEnabled,
  onToggleAudioBooth,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'actions' | 'recap' | 'chat'>(initialTab);
  const [threshold, setThreshold] = useState<number>(0.80);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Smart auto-scroll state
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [newSubtitlesCount, setNewSubtitlesCount] = useState(0);
  const prevHistoryLenRef = useRef(history.length);

  // Audio speech replay & sound chime states
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [chimeEnabled, setChimeEnabled] = useState<boolean>(() => {
    return localStorage.getItem('ai-action-chime-enabled') !== 'false';
  });

  // AI Meeting Executive Recap state
  const [recapResult, setRecapResult] = useState<GeneratedRecap | null>(null);
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);

  // Interactive checklist states: completed tasks & dismissed items
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});
  const [dismissedItemIds, setDismissedItemIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const toggleChime = () => {
    const next = !chimeEnabled;
    setChimeEnabled(next);
    localStorage.setItem('ai-action-chime-enabled', String(next));
  };

  const handleTimelineScroll = () => {
    const el = timelineContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 60;
    if (isAtBottom) {
      setUserScrolledUp(false);
      setNewSubtitlesCount(0);
    } else {
      setUserScrolledUp(true);
    }
  };

  const scrollToLatest = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUserScrolledUp(false);
    setNewSubtitlesCount(0);
  };

  const handlePlayAudio = (id: string, text: string) => {
    if (playingAudioId === id) {
      stopSpeech();
      setPlayingAudioId(null);
    } else {
      speakText(
        text,
        undefined,
        () => setPlayingAudioId(id),
        () => setPlayingAudioId(null)
      );
    }
  };

  const toggleTaskCompleted = (id: string) => {
    setCompletedTaskIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const dismissItem = (id: string) => {
    setDismissedItemIds((prev) => ({ ...prev, [id]: true }));
  };

  // Filtered action items and decisions matching confidence threshold and not dismissed
  const taggedItems = useMemo(() => {
    return history.filter((item) => {
      const itemId = item.id || `${item.participantId}-${item.timestamp}`;
      if (dismissedItemIds[itemId]) return false;
      const hasTags = item.tags && item.tags.length > 0;
      if (!hasTags) return false;
      const conf = item.confidence ?? 1.0;
      return conf >= threshold;
    });
  }, [history, threshold, dismissedItemIds]);

  // Filtered history when user is searching
  const displayedHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase().trim();
    return history.filter((item) => {
      const orig = item.originalText.toLowerCase();
      const trans = item.translatedText.toLowerCase();
      const speaker = (item.participantName || '').toLowerCase();
      return orig.includes(q) || trans.includes(q) || speaker.includes(q);
    });
  }, [history, searchQuery]);

  useEffect(() => {
    if (isOpen && activeTab === 'all' && !searchQuery.trim()) {
      if (userScrolledUp) {
        if (history.length > prevHistoryLenRef.current) {
          setNewSubtitlesCount((prev) => prev + (history.length - prevHistoryLenRef.current));
        }
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        setNewSubtitlesCount(0);
      }
    } else if (isOpen && activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevHistoryLenRef.current = history.length;
  }, [history, chatMessages, isOpen, activeTab, searchQuery, userScrolledUp]);

  const handleGenerateRecap = () => {
    if (history.length === 0) return;
    setIsGeneratingRecap(true);
    setTimeout(() => {
      const recap = generateMeetingRecap(history, taggedItems);
      setRecapResult(recap);
      setIsGeneratingRecap(false);
    }, 350);
  };

  const handleCopyMinutes = async () => {
    if (taggedItems.length === 0 && history.length === 0) return;

    const recap = recapResult || generateMeetingRecap(history, taggedItems);

    const lines = [
      '# ViMeet (vimeet.vn) - Biên bản cuộc họp thông minh',
      `*Thời gian xuất: ${new Date().toLocaleString()}*`,
      `*Phòng họp: ${meetingCode || 'ViMeet'}*`,
      `*Ngưỡng tin cậy Laya: ${Math.round(threshold * 100)}%*`,
      '',
      '## 1. Tóm tắt điều hành (Executive Highlights):',
    ];

    recap.executiveHighlights.forEach((hl) => lines.push(`- ${hl}`));

    if (recap.topics.length > 0) {
      lines.push('', '## 2. Các chủ đề thảo luận chính (Key Topics):');
      recap.topics.forEach((t) => {
        lines.push(`- **${t.title}** *(${t.category} - ${t.utteranceCount} câu phát biểu)*`);
        t.samplePoints.forEach((sp) => lines.push(`  * ${sp}`));
      });
    }

    lines.push('', '## 3. Danh sách việc cần làm (Action Items):');
    const actions = taggedItems.filter((i) => i.tags?.includes('action_item'));
    if (actions.length === 0) {
      lines.push('- *Không có đầu việc nào được ghi nhận.*');
    } else {
      actions.forEach((i, idx) => {
        const itemId = i.id || `${i.participantId}-${i.timestamp}`;
        const isDone = Boolean(completedTaskIds[itemId]);
        const checkMark = isDone ? '[x]' : '[ ]';
        lines.push(
          `${checkMark} ${idx + 1}. **[${i.participantName}]** (${formatTimestamp(i.timestamp)}): ${i.originalText}` +
            (i.translatedText !== i.originalText ? ` *(Dịch: ${i.translatedText})*` : '')
        );
      });
    }

    lines.push('', '## 4. Quyết định đã chốt (Decisions):');
    const decisions = taggedItems.filter((i) => i.tags?.includes('decision'));
    if (decisions.length === 0) {
      lines.push('- *Không có quyết định chính thức nào.*');
    } else {
      decisions.forEach((i, idx) => {
        lines.push(
          `- [x] ${idx + 1}. **[${i.participantName}]** (${formatTimestamp(i.timestamp)}): ${i.originalText}` +
            (i.translatedText !== i.originalText ? ` *(Dịch: ${i.translatedText})*` : '')
        );
      });
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  };

  const handleCopySnippet = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (e) {
      console.error('Failed to copy snippet', e);
    }
  };

  const handleDownloadTranscript = () => {
    if (history.length === 0) return;
    const lines = history.map((item) => {
      const time = formatTimestamp(item.timestamp);
      const speaker = item.participantName || 'Speaker';
      const tags = item.tags && item.tags.length > 0 ? ` [${item.tags.join(', ')}]` : '';
      return `[${time}] ${speaker}${tags}:\n  Gốc: ${item.originalText}\n  Dịch: ${item.translatedText}\n`;
    });
    const header = [
      '=====================================================',
      '          ViMeet (vimeet.vn) - BIÊN BẢN PHỤ ĐỀ       ',
      `  Thời gian xuất: ${new Date().toLocaleString()}`,
      `  Phòng họp: ${meetingCode || 'ViMeet'}`,
      `  Tổng số câu thoại: ${history.length}`,
      '=====================================================',
      '',
    ];
    downloadFile(header.join('\n') + lines.join('\n'), `transcript-${meetingCode || 'vimeet'}.txt`, 'text/plain;charset=utf-8');
  };

  const handleExportSrt = () => {
    if (history.length === 0) return;
    const blocks = history.map((item, idx) => {
      const start = formatSrtTimestamp(item.timestamp, 0);
      const end = formatSrtTimestamp(item.timestamp, 3);
      const speaker = item.participantName || 'Speaker';
      const original = item.originalText && item.originalText !== item.translatedText ? `\n${item.originalText}` : '';
      return `${idx + 1}\n${start} --> ${end}\n[${speaker}] ${item.translatedText}${original}\n`;
    });
    downloadFile(blocks.join('\n'), `subtitles-${meetingCode || 'vimeet'}.srt`, 'text/plain;charset=utf-8');
  };

  const handleExportWord = () => {
    if (history.length === 0) return;
    const actions = taggedItems.filter((i) => i.tags?.includes('action_item'));
    const decisions = taggedItems.filter((i) => i.tags?.includes('decision'));
    const recap = recapResult || generateMeetingRecap(history, taggedItems);

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Biên Bản Cuộc Họp - ${meetingCode || 'ViMeet'}</title>
        <style>
          body { font-family: 'Segoe UI', Calibri, sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; padding: 24px; }
          h1 { color: #0284c7; font-size: 18pt; border-bottom: 2px solid #0284c7; padding-bottom: 6px; }
          h2 { color: #0369a1; font-size: 14pt; margin-top: 18px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
          .task-done { text-decoration: line-through; color: #64748b; }
          .meta { color: #64748b; font-size: 10pt; margin-bottom: 16px; }
          .bubble { background: #f8fafc; border-left: 3px solid #0284c7; padding: 8px 12px; margin-bottom: 8px; }
          .highlight-card { background: #f0fdf4; border-left: 3px solid #10b981; padding: 10px 14px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <h1>BIÊN BẢN CUỘC HỌP THÔNG MINH (AI MEETING MINUTES)</h1>
        <p class="meta"><b>Phòng họp:</b> ${meetingCode || 'N/A'} | <b>Thời gian xuất:</b> ${new Date().toLocaleString()}</p>
        
        <h2>1. Tóm tắt điều hành (Executive Highlights)</h2>
        <div class="highlight-card">
          <ul>
            ${recap.executiveHighlights.map((h) => `<li>${h}</li>`).join('')}
          </ul>
        </div>

        <h2>2. Phân bổ thời lượng nói (Speaker Participation)</h2>
        <ul>
          ${recap.speakerStats.map((s) => `<li><b>${s.name}</b>: ${s.percentage}% (${s.utteranceCount} câu, ~${s.wordCount} từ)</li>`).join('')}
        </ul>

        <h2>3. Các chủ đề thảo luận chính (Key Topics)</h2>
        ${recap.topics.map((t) => `
          <div style="margin-bottom: 10px;">
            <b>${t.title}</b> <span style="color:#64748b;font-size:10pt;">[${t.category} - ${t.utteranceCount} câu]</span>
            <ul>${t.samplePoints.map((sp) => `<li><i>${sp}</i></li>`).join('')}</ul>
          </div>
        `).join('')}

        <h2>4. Quyết định đã chốt (Decisions)</h2>
        ${
          decisions.length === 0
            ? '<p><i>Không có quyết định chính thức nào được ghi nhận.</i></p>'
            : decisions
                .map(
                  (d, i) =>
                    `<p><b>${i + 1}. [${d.participantName}]</b>: ${d.originalText} <i>(Dịch: ${d.translatedText})</i></p>`
                )
                .join('')
        }

        <h2>5. Danh sách việc cần làm (Action Items)</h2>
        ${
          actions.length === 0
            ? '<p><i>Không có nhiệm vụ nào được phân công.</i></p>'
            : actions
                .map((a, i) => {
                  const itemId = a.id || `${a.participantId}-${a.timestamp}`;
                  const isDone = Boolean(completedTaskIds[itemId]);
                  return `<p class="${isDone ? 'task-done' : ''}"><b>[${isDone ? 'ĐÃ XONG' : 'ĐANG CHỜ'}] ${i + 1}. [${a.participantName}]</b>: ${a.originalText} <i>(Dịch: ${a.translatedText})</i></p>`;
                })
                .join('')
        }

        <h2>6. Lịch sử hội thoại đầy đủ (Full Transcript)</h2>
        ${history
          .map(
            (h) =>
              `<div class="bubble"><b>[${formatTimestamp(h.timestamp)}] ${h.participantName}:</b> ${h.translatedText}<br/><span style="color:#64748b;font-size:9pt;">Nguyên văn: ${h.originalText}</span></div>`
          )
          .join('')}
      </body>
      </html>
    `;
    downloadFile(html, `bien-ban-hop-${meetingCode || 'meeting'}.doc`, 'application/msword;charset=utf-8');
  };

  const handleSendSpeech = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !onSendSpeechText) return;
    onSendSpeechText(inputText.trim());
    setInputText('');
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !onSendChatMessage) return;
    onSendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const handleQuickChip = (text: string) => {
    if (!onSendSpeechText) return;
    onSendSpeechText(text);
  };

  const highlightMatches = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-sky-500/30 text-sky-200 rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Executive summary metrics
  const uniqueSpeakers = useMemo(() => {
    return Array.from(new Set(history.map((h) => h.participantName || 'Speaker')));
  }, [history]);

  const actionItemsCount = taggedItems.filter((i) => i.tags?.includes('action_item')).length;
  const decisionsCount = taggedItems.filter((i) => i.tags?.includes('decision')).length;

  if (!isOpen) return null;

  return (
    <div className="w-80 md:w-96 bg-[#111112] border-l border-[#2e2e30] flex flex-col h-full z-20">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-[#2e2e30] flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-semibold text-zinc-100 text-sm leading-none">Trợ lý cuộc họp AI</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Meeting Intelligence & Sidecar</p>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-[#222224] transition-colors cursor-pointer"
          aria-label="Đóng panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#2e2e30] shrink-0">
        {(
          [
            { id: 'all', label: 'Phụ đề', count: history.length },
            { id: 'actions', label: 'Việc làm', count: taggedItems.length || null },
            { id: 'recap', label: 'Tóm tắt', count: null, badge: 'AI' },
            { id: 'chat', label: 'Tin nhắn', count: chatMessages.length || null },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as 'all' | 'actions' | 'recap' | 'chat')}
            className={`flex-1 py-2.5 text-[11px] font-medium flex flex-col items-center gap-0.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-blue-500 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>{tab.label}</span>
            {'badge' in tab && tab.badge ? (
              <span className="text-[9px] px-1.5 rounded bg-blue-600/20 text-blue-400 font-mono">
                {tab.badge}
              </span>
            ) : tab.count != null && tab.count > 0 ? (
              <span className="text-[9px] px-1.5 rounded bg-[#2a2a2c] text-zinc-400 font-mono">
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab 1: Live Transcript View */}
      {activeTab === 'all' && (
        <>
          {history.length > 0 && (
            <div className="px-3 pt-2 pb-1 bg-slate-950/60 border-b border-white/5 space-y-1.5">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm từ khóa trong lời thoại..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-8 pr-7 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                <span>
                  {searchQuery ? `Tìm thấy ${displayedHistory.length} câu` : `Tổng cộng: ${history.length} câu`}
                </span>
                <div className="flex items-center gap-1">
                  {onToggleAudioBooth && (
                    <button
                      type="button"
                      onClick={onToggleAudioBooth}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition cursor-pointer ${
                        isAudioBoothEnabled
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-transparent'
                      }`}
                      title={isAudioBoothEnabled ? 'Tắt Audio Booth dịch giọng nói' : 'Bật Audio Booth dịch giọng nói (Zero-server-cost TTS)'}
                    >
                      <Headphones className="w-3 h-3 text-sky-400" />
                      <span>{isAudioBoothEnabled ? 'Booth Bật' : 'Booth'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleExportSrt}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                    title="Xuất file phụ đề video (.srt)"
                  >
                    <FileCode className="w-3 h-3 text-emerald-400" />
                    <span>.SRT</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTranscript}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 transition cursor-pointer"
                    title="Tải toàn bộ phụ đề về máy (.txt)"
                  >
                    <Download className="w-3 h-3 text-sky-400" />
                    <span>.TXT</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 relative min-h-0 flex flex-col">
            <div
              ref={timelineContainerRef}
              onScroll={handleTimelineScroll}
              className="flex-1 overflow-y-auto p-3.5 space-y-2.5"
            >
              {displayedHistory.length === 0 ? (
                <div className="text-center text-slate-500 py-10 text-sm space-y-2">
                  <Mic className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>{searchQuery ? 'Không tìm thấy câu nào phù hợp.' : 'Chưa có phụ đề nào.'}</p>
                  <p className="text-xs text-slate-600">
                    {searchQuery ? 'Thử tìm từ khóa khác.' : 'Bật Microphone hoặc nhập câu nói thử nghiệm bên dưới.'}
                  </p>
                </div>
              ) : (
                displayedHistory.map((item, idx) => {
                  const itemId = item.id || `${item.participantId}-${item.timestamp}-${idx}`;
                  const hasAction = item.tags?.includes('action_item');
                  const hasDecision = item.tags?.includes('decision');

                  return (
                    <div
                      key={itemId}
                      className={`group relative p-3 rounded-2xl border space-y-1.5 transition-all ${
                        hasAction
                          ? 'bg-amber-950/20 border-amber-500/30 ring-1 ring-amber-500/10'
                          : hasDecision
                          ? 'bg-emerald-950/20 border-emerald-500/30 ring-1 ring-emerald-500/10'
                          : 'bg-slate-900/60 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.speakerSequence !== undefined && (
                            <span
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/10 font-semibold"
                              title={`Lượt nói #${item.speakerSequence}`}
                            >
                              #{item.speakerSequence}
                            </span>
                          )}
                          <span className="font-semibold text-sky-400">{item.participantName}</span>
                          {(item.sourceLanguage || item.targetLanguage) && (
                            <span
                              className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-sky-950/60 text-sky-300 border border-sky-800/40"
                              title="Cặp ngôn ngữ gốc → đích"
                            >
                              {(item.sourceLanguage || 'VI').toUpperCase()} → {(item.targetLanguage || 'JA').toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {hasAction && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Zap className="w-2.5 h-2.5" /> Action
                            </span>
                          )}
                          {hasDecision && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Decision
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">{formatTimestamp(item.timestamp)}</span>
                          <button
                            type="button"
                            onClick={() => handlePlayAudio(itemId, item.translatedText || item.originalText)}
                            title={playingAudioId === itemId ? 'Dừng phát âm' : 'Nghe phát âm lời thoại'}
                            className={`p-0.5 rounded transition cursor-pointer ${
                              playingAudioId === itemId
                                ? 'text-sky-300 animate-pulse'
                                : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopySnippet(item.translatedText, itemId)}
                            title="Sao chép câu dịch"
                            className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
                          >
                            {copiedId === itemId ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                      {item.originalText && item.originalText !== item.translatedText && (
                        <p className="text-xs text-slate-400 italic">
                          {highlightMatches(item.originalText, searchQuery)}
                        </p>
                      )}
                      <p className="text-sm font-medium text-slate-100">
                        {highlightMatches(item.translatedText, searchQuery)}
                      </p>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Smart Scroll: "Cuộn xuống mới nhất" floating button */}
            {userScrolledUp && !searchQuery.trim() && (
              <button
                type="button"
                onClick={scrollToLatest}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 transition border border-sky-400/40 z-20 cursor-pointer animate-bounce"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Cuộn xuống mới nhất{newSubtitlesCount > 0 ? ` (+${newSubtitlesCount})` : ''}</span>
              </button>
            )}
          </div>

          {/* Speech Test & Simulation Bar */}
          {onSendSpeechText && (
            <div className="p-3 border-t border-white/10 bg-slate-950/80 space-y-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickChip('Anh Nam nhớ cập nhật báo cáo kỹ thuật trước 5h chiều nhé.')}
                  className="px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap transition cursor-pointer"
                >
                  ⚡ Mẫu việc cần làm
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickChip('Chúng ta thống nhất chốt phương án B cho kiến trúc hệ thống.')}
                  className="px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap transition cursor-pointer"
                >
                  🎯 Mẫu quyết định
                </button>
              </div>

              <form onSubmit={handleSendSpeech} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Thử câu nói hoặc phát biểu..."
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-sm cursor-pointer"
                  title="Phát câu nói"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Actions & Decisions Interactive Checklist */}
      {activeTab === 'actions' && (
        <>
          <div className="p-3 bg-slate-950/70 border-b border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                Ngưỡng Laya ({Math.round(threshold * 100)}%)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleChime}
                  title={chimeEnabled ? 'Tắt âm báo việc mới' : 'Bật âm báo việc mới'}
                  className={`p-1.5 rounded-xl border text-xs transition cursor-pointer ${
                    chimeEnabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-500 border-white/5 hover:text-slate-300'
                  }`}
                >
                  {chimeEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyMinutes}
                  disabled={taggedItems.length === 0}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium transition cursor-pointer ${
                    copied
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Đã chép biên bản' : 'Sao chép biên bản'}</span>
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {taggedItems.length === 0 ? (
              <div className="text-center text-slate-500 py-10 text-sm space-y-2">
                <Zap className="w-8 h-8 text-slate-600 mx-auto" />
                <p>Chưa phát hiện đầu việc hoặc quyết định nào đạt ngưỡng {Math.round(threshold * 100)}%.</p>
                <p className="text-xs text-slate-600">Thử kéo giảm thanh trượt hoặc thử mẫu giao việc bên dưới.</p>
              </div>
            ) : (
              taggedItems.map((item, idx) => {
                const itemId = item.id || `${item.participantId}-${item.timestamp}-${idx}`;
                const hasAction = item.tags?.includes('action_item');
                const hasDecision = item.tags?.includes('decision');
                const isDone = Boolean(completedTaskIds[itemId]);

                return (
                  <div
                    key={itemId}
                    className={`relative p-3.5 rounded-2xl border space-y-2 shadow-sm transition-all ${
                      isDone
                        ? 'bg-slate-900/40 border-slate-800 opacity-60'
                        : hasAction
                        ? 'bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/10'
                        : 'bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {hasAction && (
                          <button
                            type="button"
                            onClick={() => toggleTaskCompleted(itemId)}
                            className="text-amber-400 hover:text-amber-300 transition cursor-pointer"
                            title={isDone ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu đã hoàn thành'}
                          >
                            {isDone ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-amber-400" />
                            )}
                          </button>
                        )}
                        <span className="font-semibold text-white">{item.participantName}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {hasAction && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30">
                            <Zap className="w-3 h-3 text-amber-400" /> Action (
                            {Math.round((item.confidence ?? 0) * 100)}%)
                          </span>
                        )}
                        {hasDecision && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Decision (
                            {Math.round((item.confidence ?? 0) * 100)}%)
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(itemId, item.translatedText || item.originalText)}
                          title={playingAudioId === itemId ? 'Dừng phát âm' : 'Nghe phát âm lời thoại'}
                          className={`p-0.5 rounded transition cursor-pointer ${
                            playingAudioId === itemId
                              ? 'text-sky-300 animate-pulse'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissItem(itemId)}
                          className="text-slate-500 hover:text-red-400 transition p-0.5 cursor-pointer"
                          title="Bỏ qua mục này (nhận diện sai)"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className={`text-xs text-slate-200 font-medium ${isDone ? 'line-through text-slate-400' : ''}`}>
                      {item.originalText}
                    </p>
                    {item.translatedText !== item.originalText && (
                      <p className="text-xs text-slate-400 italic">Dịch: {item.translatedText}</p>
                    )}
                    <div className="text-[10px] text-slate-500 text-right">
                      {formatTimestamp(item.timestamp)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Tab 3: AI Executive Recap & Export Hub */}
      {activeTab === 'recap' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* AI Generator CTA Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-emerald-950/30 border border-emerald-500/20 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Meeting Intelligence
              </span>
              {recapResult && (
                <span className="text-[10px] text-slate-400">
                  Cập nhật: {recapResult.generatedAt}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tự động tổng hợp các quyết định, phân tích chủ đề thảo luận và đo lường thời lượng phát biểu của từng thành viên.
            </p>

            <button
              type="button"
              onClick={handleGenerateRecap}
              disabled={isGeneratingRecap || history.length === 0}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer disabled:opacity-40"
            >
              {isGeneratingRecap ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tổng hợp dữ liệu cuộc họp...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{recapResult ? 'Làm mới tóm tắt bằng AI' : 'Tạo tóm tắt biên bản bằng AI'}</span>
                </>
              )}
            </button>
          </div>

          {/* Render Generated AI Recap Details if available */}
          {recapResult && (
            <>
              {/* 1. Executive Highlights */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-2.5 shadow-sm">
                <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Điểm cốt lõi đã thảo luận (Executive Highlights)
                </span>
                <ul className="space-y-2 text-xs text-slate-200">
                  {recapResult.executiveHighlights.map((hl, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 2. Speaker Participation Bar */}
              {recapResult.speakerStats.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">Thời lượng phát biểu (Talk Time):</span>
                    <span className="text-[10px] text-slate-400">{history.length} câu</span>
                  </div>

                  {/* Multi-segment stacked bar */}
                  <div className="h-2.5 w-full rounded-full bg-slate-800 flex overflow-hidden">
                    {recapResult.speakerStats.map((s, idx) => (
                      <div
                        key={idx}
                        style={{ width: `${s.percentage}%`, backgroundColor: s.accentColor }}
                        title={`${s.name}: ${s.percentage}%`}
                        className="h-full transition-all duration-500"
                      />
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    {recapResult.speakerStats.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/40">
                        <div className="flex items-center gap-1.5 truncate mr-1">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.accentColor }} />
                          <span className="truncate text-slate-300 font-medium">{s.name}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[10px] shrink-0">{s.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Discussion Topics */}
              {recapResult.topics.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3 shadow-sm">
                  <span className="text-xs font-semibold text-slate-200">Chủ đề thảo luận chính:</span>
                  <div className="space-y-2.5">
                    {recapResult.topics.map((t) => (
                      <div key={t.id} className="p-3 rounded-xl bg-slate-800/50 border border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="text-xs font-semibold text-sky-300">{t.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                            {t.category} ({t.utteranceCount} câu)
                          </span>
                        </div>
                        <div className="space-y-1">
                          {t.samplePoints.map((sp, i) => (
                            <p key={i} className="text-[11px] text-slate-300 italic truncate">
                              "{sp}"
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Tổng quan buổi họp (Executive Overview)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Mã: {meetingCode || 'N/A'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                <div className="text-lg font-bold text-slate-100">{uniqueSpeakers.length}</div>
                <div className="text-[10px] text-slate-400">Người họp</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                <div className="text-lg font-bold text-amber-400">{actionItemsCount}</div>
                <div className="text-[10px] text-slate-400">Nhiệm vụ</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                <div className="text-lg font-bold text-emerald-400">{decisionsCount}</div>
                <div className="text-[10px] text-slate-400">Quyết định</div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-300">Thành viên phát biểu:</span>
              <div className="flex flex-wrap gap-1.5">
                {uniqueSpeakers.map((name, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-sky-500/20"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Export Menu */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <span className="text-xs font-semibold text-slate-200">Xuất báo cáo & Tài liệu:</span>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={handleExportWord}
                disabled={history.length === 0}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-medium flex items-center justify-between transition cursor-pointer disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>Biên bản cuộc họp Word (.doc)</span>
                </span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={handleCopyMinutes}
                disabled={taggedItems.length === 0}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-medium flex items-center justify-between transition cursor-pointer disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Sao chép Markdown (Slack/Teams)</span>
                </span>
                <span className="text-[10px] text-amber-400 font-mono">MD</span>
              </button>

              <button
                type="button"
                onClick={handleExportSrt}
                disabled={history.length === 0}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-medium flex items-center justify-between transition cursor-pointer disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span>Phụ đề Video song ngữ (.srt)</span>
                </span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: In-Meeting Real-time Bilingual Chat */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {chatMessages.length === 0 ? (
              <div className="text-center text-slate-500 py-12 text-sm space-y-2">
                <MessageCircle className="w-8 h-8 text-slate-600 mx-auto" />
                <p>Chưa có tin nhắn nào trong phòng họp.</p>
                <p className="text-xs text-slate-600">Gửi lời nhắn đầu tiên để cùng thảo luận.</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col space-y-0.5 ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1">
                      <span className="font-semibold text-slate-300">{msg.senderName}</span>
                      <span>•</span>
                      <span>{formatTimestamp(msg.timestamp)}</span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        isMe
                          ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white rounded-tr-sm shadow-md shadow-cyan-600/20'
                          : 'bg-white/[0.06] text-slate-100 rounded-tl-sm border border-white/10 shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Form */}
          {onSendChatMessage && (
            <form onSubmit={handleSendChat} className="p-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400/50 transition"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-md shadow-cyan-500/20 cursor-pointer"
                title="Gửi tin nhắn"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
