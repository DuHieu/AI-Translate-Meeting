import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  BUILT_IN_KNOWLEDGE_BASE,
  FactCheckEvent,
  KnowledgeItem,
} from '../../utils/factCheckEngine';
import { formatTimestamp } from '../../utils';

interface FactCheckPanelProps {
  events: FactCheckEvent[];
  onClose: () => void;
  onSendToChat?: (text: string) => void;
  onClearEvents?: () => void;
}

export const FactCheckPanel: React.FC<FactCheckPanelProps> = ({
  events,
  onClose,
  onSendToChat,
  onClearEvents,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'discrepancies' | 'knowledge_base'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const discrepancyCount = useMemo(
    () => events.filter((e) => e.status === 'DISCREPANCY').length,
    [events],
  );

  const verifiedCount = useMemo(
    () => events.filter((e) => e.status === 'VERIFIED').length,
    [events],
  );

  // Filtered timeline events
  const filteredEvents = useMemo(() => {
    let list = events;
    if (activeTab === 'discrepancies') {
      list = list.filter((e) => e.status === 'DISCREPANCY');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.subject.toLowerCase().includes(q) ||
          e.spokenClaim.toLowerCase().includes(q) ||
          e.participantName.toLowerCase().includes(q) ||
          e.explanation.toLowerCase().includes(q),
      );
    }
    return list;
  }, [events, activeTab, searchQuery]);

  // Filtered knowledge base items
  const filteredKbItems = useMemo(() => {
    let list = BUILT_IN_KNOWLEDGE_BASE;
    if (selectedCategory !== 'all') {
      list = list.filter((item) => item.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.subject.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.officialValue.toLowerCase().includes(q),
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  const handleShareToChat = (item: KnowledgeItem) => {
    if (!onSendToChat) return;
    const msg = `[Laya Fact-Check] Thông số chính thức: ${item.subject}\n• Giá trị chuẩn: ${item.officialValue}\n• Nguồn: ${item.source}`;
    onSendToChat(msg);
  };

  return (
    <aside
      role="complementary"
      aria-label="Bảng xác minh AI và cơ sở tri thức"
      className="meeting-panel-content h-full min-h-0 w-full bg-[#13151f] text-zinc-100 md:border-l border-white/10 flex flex-col z-30 shrink-0 select-none overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Xác minh AI &amp; Tri thức</h2>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span className="text-emerald-400 font-medium">{verifiedCount} chuẩn</span>
              <span>•</span>
              <span className="text-amber-400 font-medium">{discrepancyCount} cảnh báo</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng xác minh"
          className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-zinc-800 px-4 text-xs shrink-0">
        <button
          type="button"
          aria-pressed={activeTab === 'timeline'}
          onClick={() => setActiveTab('timeline')}
          className={`py-2.5 font-medium transition relative cursor-pointer mr-5 ${
            activeTab === 'timeline'
              ? 'text-sky-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Dòng sự kiện ({events.length})
          {activeTab === 'timeline' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-sky-400 rounded-full" />
          )}
        </button>

        <button
          type="button"
          aria-pressed={activeTab === 'discrepancies'}
          onClick={() => setActiveTab('discrepancies')}
          className={`py-2.5 font-medium transition relative cursor-pointer mr-5 flex items-center gap-1.5 ${
            activeTab === 'discrepancies'
              ? 'text-amber-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Sai lệch ({discrepancyCount})
          {discrepancyCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
          {activeTab === 'discrepancies' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>

        <button
          type="button"
          aria-pressed={activeTab === 'knowledge_base'}
          onClick={() => setActiveTab('knowledge_base')}
          className={`py-2.5 font-medium transition relative cursor-pointer ${
            activeTab === 'knowledge_base'
              ? 'text-sky-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Kho Tri Thức
          {activeTab === 'knowledge_base' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-sky-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-zinc-800/80 bg-[#161822] shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder={
              activeTab === 'knowledge_base'
                ? 'Tìm kiếm quy định, SLA, chính sách hoàn tiền...'
                : 'Tìm kiếm người phát biểu, thông số đã kiểm chứng...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#14151b] border border-zinc-800 text-xs text-white placeholder-zinc-500 rounded-xl pl-8 pr-3 py-2 outline-none focus:border-sky-500 transition"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {activeTab === 'knowledge_base' ? (
          /* Tab: Kho Tri Thức Chuẩn Doanh Nghiệp */
          <div className="space-y-3">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                ['all', 'Tất cả'],
                ['sla', 'SLA'],
                ['policy', 'Chính sách'],
                ['pricing', 'Biểu phí'],
                ['security', 'Bảo mật'],
                ['tech_spec', 'Kỹ thuật'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedCategory(key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                    selectedCategory === key
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {filteredKbItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
                <BookOpen className="w-7 h-7 text-zinc-600 mx-auto" />
                <p>Không tìm thấy tiêu chuẩn nào khớp với từ khóa.</p>
              </div>
            ) : (
              filteredKbItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2 hover:border-zinc-700 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {item.category.toUpperCase()}
                        </span>
                        <h3 className="text-xs font-semibold text-white truncate">
                          {item.subject}
                        </h3>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                        {item.summary}
                      </p>
                    </div>

                    {onSendToChat && (
                      <button
                        type="button"
                        onClick={() => handleShareToChat(item)}
                        title="Chia sẻ vào chat phòng"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-sky-600 text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="p-2 rounded-lg bg-zinc-950/70 border border-zinc-800 text-[11px] space-y-1">
                    <div className="text-[10px] uppercase font-bold text-sky-400">
                      Giá trị chuẩn doanh nghiệp:
                    </div>
                    <div className="text-zinc-200 font-medium">
                      {item.officialValue}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                    <span className="truncate max-w-[220px]">{item.source}</span>
                    <span className="flex items-center gap-0.5 text-sky-400">
                      <ExternalLink className="w-3 h-3" />
                      Tài liệu chuẩn
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Tab: Dòng Sự Kiện / Cảnh Báo Sai Lệch */
          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
                <HelpCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="font-medium text-zinc-300">
                  {activeTab === 'discrepancies'
                    ? 'Không có sai lệch nào được ghi nhận'
                    : 'Chưa có thông số nào được đối soát'}
                </p>
                <p className="text-[11px] max-w-xs mx-auto leading-relaxed">
                  Khi người tham gia phát biểu về SLA, hoàn tiền, thời lượng, hay bảo mật, Laya AI sẽ tự động đối chiếu tại đây.
                </p>
              </div>
            ) : (
              filteredEvents.map((ev) => {
                const isDiscrepancy = ev.status === 'DISCREPANCY';
                return (
                  <div
                    key={ev.id}
                    className={`rounded-2xl border p-3.5 space-y-2.5 transition shadow-sm ${
                      isDiscrepancy
                        ? 'bg-amber-950/20 border-amber-500/40 text-amber-100'
                        : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isDiscrepancy ? (
                          <div className="p-1 rounded-md bg-amber-500/20 text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="text-xs font-bold text-white truncate">
                          {ev.subject}
                        </span>
                      </div>

                      <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                        {formatTimestamp(ev.timestamp)}
                      </span>
                    </div>

                    {/* Speaker quote */}
                    <div className="text-[11px] bg-black/40 rounded-xl p-2.5 border border-white/5 space-y-1">
                      <div className="text-[10px] text-zinc-400 font-medium">
                        Phát biểu bởi <span className="text-white font-semibold">{ev.participantName}</span>:
                      </div>
                      <p className="italic text-zinc-200 leading-snug">
                        "{ev.spokenText}"
                      </p>
                    </div>

                    {/* Comparison Box */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800">
                        <span className="text-zinc-400 block mb-0.5">Người nói đề cập:</span>
                        <span
                          className={`font-bold ${
                            isDiscrepancy ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {ev.spokenClaim}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800">
                        <span className="text-zinc-400 block mb-0.5">Tiêu chuẩn công ty:</span>
                        <span className="font-bold text-sky-300 line-clamp-1">
                          {ev.officialValue}
                        </span>
                      </div>
                    </div>

                    {/* Explanation */}
                    <p className="text-[11px] leading-snug text-zinc-300">
                      {ev.explanation}
                    </p>

                    {/* Source Footer */}
                    <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="truncate max-w-[200px]">{ev.source}</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full ${
                          isDiscrepancy
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {isDiscrepancy ? 'MÂU THUẪN' : 'CHUẨN XÁC'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {events.length > 0 && onClearEvents && (
        <div className="p-2.5 border-t border-zinc-800 bg-[#14151e] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-400">
            {events.length} lượt đối soát trong phiên họp
          </span>
          <button
            type="button"
            onClick={onClearEvents}
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-rose-400 transition cursor-pointer p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa lịch sử</span>
          </button>
        </div>
      )}
    </aside>
  );
};
