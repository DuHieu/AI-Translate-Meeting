import React, { useState } from 'react';
import {
  X,
  Palette,
  CircleDot,
  Languages,
  Sparkles,
  Headphones,
  ChevronRight,
} from 'lucide-react';

interface ActivitiesPanelProps {
  onClose: () => void;
  onOpenSubtitles: () => void;
  onOpenMinutes: () => void;
  onToggleRecording?: () => void;
  isRecording?: boolean;
  onToggleAudioBooth?: () => void;
  isAudioBoothActive?: boolean;
  onOpenWhiteboard?: () => void;
}

export const ActivitiesPanel: React.FC<ActivitiesPanelProps> = ({
  onClose,
  onOpenSubtitles,
  onOpenMinutes,
  onToggleRecording,
  isRecording = false,
  onToggleAudioBooth,
  isAudioBoothActive = false,
  onOpenWhiteboard,
}) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'addons'>('tools');

  return (
    <aside
      role="complementary"
      aria-label="Công cụ và hoạt động cuộc họp"
      className="meeting-panel-content h-full min-h-0 w-full bg-[#13151f] text-zinc-100 md:border-l border-white/10 flex flex-col z-30 shrink-0 select-none overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-base font-medium text-zinc-100">Hoạt động</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng hoạt động"
          className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs: Công cụ | Tiện ích bổ sung */}
      <div className="flex items-center border-b border-zinc-800 px-5 text-sm">
        <button
          type="button"
          aria-pressed={activeTab === 'tools'}
          onClick={() => setActiveTab('tools')}
          className={`py-3 font-medium transition relative cursor-pointer mr-6 ${
            activeTab === 'tools'
              ? 'text-sky-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Công cụ
          {activeTab === 'tools' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-sky-400 rounded-full" />
          )}
        </button>
        <button
          type="button"
          aria-pressed={activeTab === 'addons'}
          onClick={() => setActiveTab('addons')}
          className={`py-3 font-medium transition relative cursor-pointer ${
            activeTab === 'addons'
              ? 'text-sky-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Tiện ích bổ sung
          {activeTab === 'addons' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-sky-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'tools' ? (
          <>
            {/* 1. Bảng trắng (Whiteboard) */}
            <button
              type="button"
              onClick={onOpenWhiteboard || (() => window.open('https://excalidraw.com', '_blank'))}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Palette className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-zinc-100 group-hover:text-white transition">Bảng trắng</h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-snug">Vẽ, phác thảo ý tưởng và ghi chú với mọi người</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 shrink-0 ml-2" />
            </button>

            {/* 2. Ghi lại cuộc họp (Recording) */}
            {onToggleRecording && (
              <button
                type="button"
                onClick={onToggleRecording}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                    <CircleDot className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-zinc-100 group-hover:text-white transition">Ghi lại cuộc họp</h3>
                      {isRecording && (
                        <span className="px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-bold">REC</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-snug">
                      {isRecording ? 'Đang ghi video & phụ đề. Nhấp để dừng.' : 'Lưu trữ video và phụ đề cuộc họp'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isRecording ? 'bg-red-500 text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                }`}>
                  {isRecording ? 'Dừng' : 'Bắt đầu'}
                </span>
              </button>
            )}

            {/* 3. Dịch lời nói & Phụ đề AI */}
            <button
              type="button"
              onClick={onOpenSubtitles}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                  <Languages className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-zinc-100 group-hover:text-white transition">Dịch lời nói &amp; Phụ đề AI</h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-snug">Phụ đề song ngữ trực tiếp, nhận dạng giọng nói</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 shrink-0 ml-2" />
            </button>

            {/* 4. Biên bản họp & Laya AI */}
            <button
              type="button"
              onClick={onOpenMinutes}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-zinc-100 group-hover:text-white transition">Biên bản họp &amp; Laya AI</h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-snug">Trích xuất Quyết định, Việc làm và Tóm tắt cuộc họp</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 shrink-0 ml-2" />
            </button>

            {/* 5. Cabin phiên dịch (Audio Booth) */}
            {onToggleAudioBooth && (
              <button
                type="button"
                onClick={onToggleAudioBooth}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-zinc-100 group-hover:text-white transition">Cabin phiên dịch tai nghe</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-snug">Đọc bản dịch trực tiếp (TTS) kèm ducking âm gốc</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isAudioBoothActive ? 'bg-emerald-500 text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                }`}>
                  {isAudioBoothActive ? 'Bật' : 'Tắt'}
                </span>
              </button>
            )}
          </>
        ) : (
          <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
            <Sparkles className="w-8 h-8 text-sky-400 mx-auto opacity-70" />
            <p className="font-medium text-zinc-300">Tiện ích bổ sung cho LayaMeet</p>
            <p>Kết nối Jira, Slack, Notion và Google Calendar tự động đồng bộ sau cuộc họp.</p>
          </div>
        )}
      </div>
    </aside>
  );
};
