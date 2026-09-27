import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SubtitleMessage } from '../../types/subtitle';
import { X, MessageSquare, Zap, CheckCircle2, Sliders, Copy, Check } from 'lucide-react';
import { formatTimestamp } from '../../utils';

interface SubtitlePanelProps {
  history: SubtitleMessage[];
  isOpen: boolean;
  onClose: () => void;
}

export const SubtitlePanel: React.FC<SubtitlePanelProps> = ({ history, isOpen, onClose }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'actions'>('all');
  const [threshold, setThreshold] = useState<number>(0.80);
  const [copied, setCopied] = useState(false);

  // Filtered action items and decisions matching confidence threshold
  const taggedItems = useMemo(() => {
    return history.filter((item) => {
      const hasTags = item.tags && item.tags.length > 0;
      if (!hasTags) return false;
      const conf = item.confidence ?? 1.0;
      return conf >= threshold;
    });
  }, [history, threshold]);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isOpen, activeTab]);

  const handleCopyMinutes = async () => {
    if (taggedItems.length === 0) return;

    const lines = [
      '# Biên bản cuộc họp - Action Items & Decisions',
      `*Thời gian xuất: ${new Date().toLocaleString()}*`,
      `*Ngưỡng tin cậy Laya: ${Math.round(threshold * 100)}%*`,
      '',
      '## Danh sách việc cần làm (Action Items):',
    ];

    const actions = taggedItems.filter((i) => i.tags?.includes('action_item'));
    if (actions.length === 0) {
      lines.push('- *Không có đầu việc nào được ghi nhận.*');
    } else {
      actions.forEach((i, idx) => {
        lines.push(
          `${idx + 1}. **[${i.participantName}]** (${formatTimestamp(i.timestamp)}): ${i.originalText}` +
            (i.translatedText !== i.originalText ? ` *(Dịch: ${i.translatedText})*` : '')
        );
      });
    }

    lines.push('', '## Quyết định đã chốt (Decisions):');
    const decisions = taggedItems.filter((i) => i.tags?.includes('decision'));
    if (decisions.length === 0) {
      lines.push('- *Không có quyết định chính thức nào.*');
    } else {
      decisions.forEach((i, idx) => {
        lines.push(
          `${idx + 1}. **[${i.participantName}]** (${formatTimestamp(i.timestamp)}): ${i.originalText}` +
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

  if (!isOpen) return null;

  return (
    <div className="w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shadow-xl">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-sky-400" />
          <h3 className="font-semibold text-slate-100">Live Transcript</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition"
          aria-label="Close transcript panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-2 pt-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 text-xs font-medium rounded-t-lg transition border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'all'
              ? 'text-sky-400 border-sky-400 bg-slate-900/60'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <span>Tất cả</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
            {history.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`flex-1 py-2 text-xs font-medium rounded-t-lg transition border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'actions'
              ? 'text-amber-400 border-amber-400 bg-slate-900/60'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Việc & Quyết định</span>
          {taggedItems.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-semibold animate-pulse">
              {taggedItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Threshold and Export bar for Actions Tab */}
      {activeTab === 'actions' && (
        <div className="p-3 bg-slate-950/70 border-b border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1 font-medium text-slate-400">
              <Sliders className="w-3 h-3 text-sky-400" />
              Ngưỡng Laya ({Math.round(threshold * 100)}%)
            </span>
            <button
              onClick={handleCopyMinutes}
              disabled={taggedItems.length === 0}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Đã sao chép' : 'Xuất biên bản'}</span>
            </button>
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
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'all' ? (
          history.length === 0 ? (
            <div className="text-center text-slate-500 py-10 text-sm">
              Chưa có phụ đề nào. Khi có người nói, nội dung sẽ xuất hiện trực tiếp tại đây.
            </div>
          ) : (
            history.map((item, idx) => {
              const hasAction = item.tags?.includes('action_item');
              const hasDecision = item.tags?.includes('decision');

              return (
                <div
                  key={item.id || idx}
                  className={`p-3 rounded-xl border space-y-1.5 transition-all ${
                    hasAction
                      ? 'bg-amber-950/20 border-amber-500/30 ring-1 ring-amber-500/20'
                      : hasDecision
                      ? 'bg-emerald-950/20 border-emerald-500/30 ring-1 ring-emerald-500/20'
                      : 'bg-slate-800/50 border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-1">
                    <span className="font-medium text-sky-400">{item.participantName}</span>
                    <div className="flex items-center gap-1.5">
                      {hasAction && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Zap className="w-2.5 h-2.5" /> Action
                        </span>
                      )}
                      {hasDecision && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Decision
                        </span>
                      )}
                      <span>{formatTimestamp(item.timestamp)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 italic">{item.originalText}</p>
                  <p className="text-sm font-medium text-white">{item.translatedText}</p>
                </div>
              );
            })
          )
        ) : taggedItems.length === 0 ? (
          <div className="text-center text-slate-500 py-10 text-sm space-y-2">
            <Zap className="w-8 h-8 text-slate-600 mx-auto" />
            <p>Chưa phát hiện đầu việc hoặc quyết định nào đạt ngưỡng {Math.round(threshold * 100)}%.</p>
            <p className="text-xs text-slate-600">Thử kéo giảm thanh trượt để lọc nhạy hơn.</p>
          </div>
        ) : (
          taggedItems.map((item, idx) => {
            const hasAction = item.tags?.includes('action_item');
            const hasDecision = item.tags?.includes('decision');

            return (
              <div
                key={item.id || idx}
                className={`p-3 rounded-xl border space-y-2 shadow-sm ${
                  hasAction
                    ? 'bg-amber-950/25 border-amber-500/40'
                    : 'bg-emerald-950/25 border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{item.participantName}</span>
                  <div className="flex items-center gap-1">
                    {hasAction && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-500/40">
                        <Zap className="w-3 h-3 text-amber-400" /> Action Item (
                        {Math.round((item.confidence ?? 0) * 100)}%)
                      </span>
                    )}
                    {hasDecision && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Decision (
                        {Math.round((item.confidence ?? 0) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-200 font-medium">{item.originalText}</p>
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
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
