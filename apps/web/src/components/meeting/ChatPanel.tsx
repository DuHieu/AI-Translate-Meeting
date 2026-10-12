import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, FileText, Sparkles, Quote } from 'lucide-react';
import { ChatMessage } from '../../types/meeting';
import { formatTimestamp } from '../../utils';
import { MeetingLinkPreviewCard } from './MeetingLinkPreviewCard';
import { extractLinksFromText } from '../../utils/linkUnfurl';

interface ChatPanelProps {
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string, attachment?: ChatMessage['attachment']) => void;
  currentUserId?: string;
  isHost?: boolean;
}

interface ChatMessageRowProps {
  msg: ChatMessage;
  isMe: boolean;
}

const ChatMessageRow: React.FC<ChatMessageRowProps> = React.memo(({ msg, isMe }) => {
  const isAiBot = msg.isAiBot || msg.senderId.startsWith('laya-ai-cohost');
  const links = React.useMemo(() => extractLinksFromText(msg.text), [msg.text]);

  if (isAiBot) {
    return (
      <div className="space-y-1.5 animate-fadeIn">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
            <div className="p-1 rounded-md bg-sky-500/20 text-sky-300">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>{msg.senderName || 'Laya AI Co-Host'}</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20">
              AI BOT
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            {formatTimestamp(msg.timestamp)}
          </span>
        </div>

        <div className="bg-gradient-to-br from-sky-950/40 via-zinc-900/80 to-indigo-950/30 border border-sky-500/30 rounded-2xl p-3.5 text-xs text-sky-100 shadow-md break-words leading-relaxed space-y-2.5">
          <p className="whitespace-pre-wrap">{msg.text}</p>

          {msg.citationHighlights && msg.citationHighlights.length > 0 && (
            <div className="pt-2 border-t border-sky-500/20 space-y-1.5">
              <div className="flex items-center gap-1 text-[10px] font-medium text-sky-400/90 uppercase tracking-wide">
                <Quote className="w-3 h-3" />
                <span>Dẫn chứng trích xuất từ cuộc họp:</span>
              </div>
              {msg.citationHighlights.map((citation, idx) => (
                <div
                  key={`${msg.id}-cit-${idx}`}
                  className="text-[11px] text-zinc-300 bg-black/40 rounded-lg px-2.5 py-1.5 border border-sky-500/10 italic"
                >
                  "{citation}"
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-semibold ${isMe ? 'text-sky-400' : 'text-zinc-300'}`}>
          {isMe ? 'Bạn' : msg.senderName}
        </span>
        <span className="text-[10px] text-zinc-400 font-mono">
          {formatTimestamp(msg.timestamp)}
        </span>
      </div>

      <div className="bg-zinc-800/70 border border-zinc-700/50 rounded-2xl p-3 text-xs text-zinc-200 break-words leading-relaxed">
        {msg.text}

        {msg.attachment && (
          <div className="mt-2.5 p-2 rounded-xl bg-zinc-900/70 border border-zinc-700/60 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-200 truncate">{msg.attachment.name}</p>
              <p className="text-[10px] text-zinc-400">{(msg.attachment.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        )}

        {links.map((link, idx) => (
          <div key={`${msg.id}-link-${idx}-${link.url}`} className="mt-2">
            <MeetingLinkPreviewCard url={link.url} />
          </div>
        ))}
      </div>
    </div>
  );
});

ChatMessageRow.displayName = 'ChatMessageRow';

export const ChatPanel: React.FC<ChatPanelProps> = ({
  onClose,
  messages,
  onSendMessage,
  currentUserId,
  isHost = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [allowChat, setAllowChat] = useState(true);
  const [pendingAttachment, setPendingAttachment] = useState<ChatMessage['attachment']>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text && !pendingAttachment) return;
    if (!allowChat && !isHost) return;

    onSendMessage(text, pendingAttachment);
    setInputText('');
    setPendingAttachment(undefined);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingAttachment({
      name: file.name,
      size: file.size,
    });
    e.target.value = '';
  };

  return (
    <aside
      role="complementary"
      aria-label="Tin nhắn trong cuộc gọi"
      className="meeting-panel-content h-full min-h-0 w-full bg-[#13151f] text-zinc-100 md:border-l border-white/10 flex flex-col z-30 shrink-0 select-none overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-base font-medium text-zinc-100">Tin nhắn trong cuộc gọi</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng tin nhắn"
          className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Host Control: Allow participants to send messages */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60 bg-zinc-900/40">
        <span className="text-xs text-zinc-300 font-medium">Để mọi người gửi tin nhắn</span>
        <button
          type="button"
          role="switch"
          aria-label="Cho phép gửi tin nhắn"
          aria-checked={allowChat}
          disabled={!isHost}
          onClick={() => setAllowChat((prev) => !prev)}
          className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
            isHost ? 'cursor-pointer' : 'cursor-default opacity-70'
          } ${allowChat ? 'bg-sky-500' : 'bg-zinc-700'}`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              allowChat ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Info notice */}
      <div className="px-4 py-2 bg-zinc-900/30 text-[11px] text-zinc-400 leading-snug border-b border-zinc-800/40">
        Tin nhắn chỉ hiển thị với người trong cuộc gọi và tự xóa khi kết thúc.
      </div>

      {/* Messages stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        <p id="chat-attachment-help" className="text-[11px] text-zinc-500 leading-snug">Tệp đính kèm hiện chỉ gửi tên và kích thước. Hãy gửi liên kết tài liệu để chia sẻ nội dung.</p>
        {messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            Chưa có tin nhắn nào trong cuộc gọi này.
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageRow
              key={msg.id}
              msg={msg}
              isMe={msg.senderId === currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending attachment badge */}
      {pendingAttachment && (
        <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-sky-300">
          <div className="flex items-center gap-2 truncate">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="truncate">{pendingAttachment.name}</span>
          </div>
          <button
            type="button"
            aria-label="Bỏ tệp đính kèm"
            onClick={() => setPendingAttachment(undefined)}
            className="text-zinc-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* AI Co-Host Quick Actions */}
      <div
        role="region"
        aria-label="Gợi ý câu hỏi cho trợ lý AI"
        className="px-3.5 py-2 bg-[#161822] border-t border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar"
      >
        <span className="text-[10px] font-semibold text-sky-400 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 animate-pulse" />
          Hỏi @Laya:
        </span>
        {[
          '@Laya Tóm tắt 5 phút qua',
          '@Laya Quyết định đã chốt?',
          '@Laya Ai phụ trách task gì?',
        ].map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={!allowChat && !isHost}
            onClick={() => {
              setInputText(prompt);
              messageInputRef.current?.focus();
            }}
            className="px-2.5 py-1 rounded-full text-[11px] bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border border-sky-500/20 whitespace-nowrap transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message input */}
      <form onSubmit={handleSend} className="p-4 border-t border-zinc-800/80 bg-[#18191a]">
        <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-700/80 rounded-2xl px-3 py-2 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Đính kèm tệp tin"
            aria-label="Đính kèm tệp tin"
            aria-describedby="chat-attachment-help"
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg transition cursor-pointer"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            ref={messageInputRef}
            type="text"
            aria-label="Gửi tin nhắn"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!allowChat && !isHost}
            placeholder={
              !allowChat && !isHost
                ? 'Người tổ chức đã tắt tính năng gửi tin nhắn'
                : 'Gửi tin nhắn...'
            }
            className="flex-1 min-w-0 bg-transparent text-base text-zinc-100 placeholder-zinc-500 outline-none"
          />

          <button
            type="submit"
            aria-label="Gửi tin nhắn"
            disabled={(!inputText.trim() && !pendingAttachment) || (!allowChat && !isHost)}
            className="text-sky-400 hover:text-sky-300 disabled:opacity-30 disabled:hover:text-sky-400 p-1 rounded-lg transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </aside>
  );
};
