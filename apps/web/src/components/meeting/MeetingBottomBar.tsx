import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Users, Settings, Grid, Subtitles, Headphones, Hand, CircleDot, Tv2, MoreHorizontal, MessageSquare, Shapes, Shield, Languages, X, UserPlus, ListTodo, FileText, Sparkles, Info } from 'lucide-react';
import { LocalAudioTrack } from 'livekit-client';
import { ttsEngine } from '../../utils/speechSynthesis';
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { AudioDeviceMenu } from './AudioDeviceMenu';
import { VideoDeviceMenu } from './VideoDeviceMenu';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { SupportedLanguage } from '../../types/meeting';
import { ThemeToggle } from '../common/ThemeToggle';
import { MeetingControlButton } from './MeetingControlButton';

interface MeetingBottomBarProps {
  meetingCode: string;
  isMicOn: boolean;
  isSpeaking?: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  microphoneTrack?: LocalAudioTrack | null;
  isConnected?: boolean;
  isConnecting?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeaveRoom: () => void;
  onOpenPeoplePanel: () => void;
  onToggleSubtitlePanel: () => void;
  onOpenSettings: () => void;
  onOpenLanguage: () => void;
  onOpenMeetingInfo: () => void;
  onOpenActions: () => void;
  onOpenRecap: () => void;
  onOpenSubtitleHistory: () => void;
  onOpenLayoutMenu: () => void;
  onOpenCopilot?: () => void;
  isSubtitlePanelOpen: boolean;
  subtitleCount: number;
  numParticipants: number;
  isHandRaised: boolean;
  onToggleRaiseHand: () => void;
  onSendReaction?: (emoji: string) => void;
  isAudioBoothActive?: boolean;
  onToggleAudioBooth?: () => void;
  isRecordingEnabled?: boolean;
  isRecording?: boolean;
  onToggleRecording?: () => void;
  isFloatingSubtitleEnabled?: boolean;
  isFloatingSubtitleActive?: boolean;
  onToggleFloatingSubtitle?: () => void;
  spokenLanguage?: SupportedLanguage;
  targetLanguage?: SupportedLanguage;
  isPeoplePanelOpen?: boolean;
  activeSidePanel?: 'none' | 'people' | 'chat' | 'activities' | 'host_controls' | 'subtitles';
  onToggleChatPanel?: () => void;
  onToggleActivitiesPanel?: () => void;
  onToggleHostControlsPanel?: () => void;
  isHost?: boolean;
  isCaptionsActive?: boolean;
  pendingAdmissionsCount?: number;
  onPushToTalk?: (active: boolean) => void;
  unreadChatCount?: number;
  isMeetingInfoOpen?: boolean;
}

export const MeetingBottomBar: React.FC<MeetingBottomBarProps> = (props) => {
  const { isMicOn, isCameraOn, isConnected = true, isConnecting, onToggleMic, onToggleCamera, onToggleSubtitlePanel, onToggleRaiseHand, onPushToTalk } = props;
  const [menu, setMenu] = useState<'none' | 'more' | 'audio' | 'video'>('none');
  const [isTtsEnabled, setIsTtsEnabled] = useState(ttsEngine.options.enabled);
  const [capabilityNotice, setCapabilityNotice] = useState<string | null>(null);
  const { isFloatingSubtitleEnabled, isRecording = false } = props;
  useKeyboardShortcuts({ onToggleMic, onToggleCamera, onToggleCaptions: onToggleSubtitlePanel, onToggleRaiseHand, isMicOn, onPushToTalk });
  const action = (callback?: () => void) => () => { setMenu('none'); callback?.(); };
  const shareScreen = () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setCapabilityNotice('Trình duyệt này không hỗ trợ chia sẻ màn hình. Bạn vẫn xem được màn hình người khác. Hãy gửi tài liệu qua Chat hoặc mở cùng phòng trên máy tính để trình bày.');
      return;
    }
    setMenu('none');
    props.onToggleScreenShare();
  };
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(props.meetingCode);
      setCopyCodeSuccess(true);
      setTimeout(() => setCopyCodeSuccess(false), 2000);
    } catch {
      // clipboard write failed
    }
  };

  const control = (
    label: string,
    icon: React.ReactNode,
    callback: () => void,
    active = false,
    disabled = false,
    danger = false,
    badge?: number | string | null,
    titleHint?: string,
    speakingRing = false,
  ) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={callback}
      title={titleHint || label}
      className={`meeting-primary-control ${active ? 'is-active' : ''} ${danger ? 'is-danger' : ''} relative group ${
        speakingRing ? 'ring-2 ring-emerald-500 animate-pulse shadow-lg shadow-emerald-500/20 rounded-full' : ''
      }`}
    >
      <div className="relative inline-flex items-center justify-center">
        {icon}
        {badge !== undefined && badge !== null && Number(badge) > 0 && (
          <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-blue-600 text-white border border-[#111319] leading-tight">
            {badge}
          </span>
        )}
      </div>
      <span className="meeting-control-label">{label}</span>
    </button>
  );

  const menuAction = (label: string, icon: React.ReactNode, callback: () => void, active?: boolean, disabled = false) => (
    <button type="button" className="meeting-menu-action" aria-label={label} aria-pressed={active} disabled={disabled} onClick={callback}>
      <span className="shrink-0 text-sky-400">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {active && <span className="ml-auto text-sky-300 font-medium text-xs shrink-0">Đang bật</span>}
    </button>
  );

  return (
    <footer className="meeting-bottom-bar" aria-label="Điều khiển cuộc họp">
      <div className="meeting-toolbar">
        {/* Left: Meeting code badge (desktop) */}
        <div className="meeting-code flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            title={copyCodeSuccess ? 'Đã sao chép!' : 'Nhấp để sao chép mã phòng'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/80 text-xs font-mono font-semibold text-zinc-200 transition-colors cursor-pointer"
          >
            <span>{props.meetingCode}</span>
            <span className="text-[10px] text-zinc-400 font-sans">
              {copyCodeSuccess ? '✓ Đã sao chép' : 'Sao chép'}
            </span>
          </button>
          {isRecording && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-bold text-rose-300 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> REC
            </span>
          )}
        </div>

        {/* Center: Main call controls */}
        <div className="meeting-primary-controls">
          {control(
            isMicOn ? 'Tắt mic' : 'Bật mic',
            isMicOn ? (
              <span className="inline-flex items-center gap-1"><Mic /><span role="img" aria-label="Mức âm thanh microphone" className="flex items-end gap-0.5 h-4">{[1, 2, 3].map(index => <span key={index} className={`w-0.5 h-3 bg-emerald-400 rounded ${props.isSpeaking ? 'animate-bounce' : ''}`} />)}</span></span>
            ) : <MicOff />,
            onToggleMic,
            isMicOn,
            !isConnected,
            false,
            null,
            isMicOn
              ? (props.isSpeaking ? 'Đang phát hiện giọng nói — audio đang gửi lên AI' : 'Tắt microphone (Ctrl+D)')
              : 'Bật microphone (Ctrl+D)',
            Boolean(isMicOn && props.isSpeaking),
          )}
          {control(
            isCameraOn ? 'Tắt cam' : 'Bật cam',
            isCameraOn ? <Video /> : <VideoOff />,
            onToggleCamera,
            isCameraOn,
            !isConnected,
            false,
            null,
            isCameraOn ? 'Tắt camera (Ctrl+E)' : 'Bật camera (Ctrl+E)',
          )}
          {control('Phụ đề', <Subtitles />, onToggleSubtitlePanel, props.isCaptionsActive, false, false, null, 'Bật/Tắt phụ đề AI trực tiếp (C)')}
          {control('Ngôn ngữ', <Languages />, props.onOpenLanguage, false, false, false, null, 'Đổi ngôn ngữ nhận phụ đề & dịch thuật')}
          {control('Thêm', <MoreHorizontal />, () => setMenu('more'), menu === 'more', false, false, props.unreadChatCount || null, 'Tùy chọn khác')}
          {control('Rời', <PhoneOff />, props.onLeaveRoom, false, false, true, null, 'Rời phòng họp')}
        </div>

        {/* Right: Collaboration controls (desktop) */}
        <div className="meeting-desktop-controls">
          {control(
            'Mọi người',
            <Users />,
            props.onOpenPeoplePanel,
            props.isPeoplePanelOpen,
            false,
            false,
            props.numParticipants,
            `Danh sách người tham gia (${props.numParticipants})`,
          )}
          {props.onToggleChatPanel && control(
            'Chat',
            <MessageSquare />,
            props.onToggleChatPanel,
            props.activeSidePanel === 'chat',
            false,
            false,
            props.unreadChatCount,
            props.unreadChatCount ? `Tin nhắn cuộc họp (${props.unreadChatCount} chưa đọc)` : 'Tin nhắn cuộc họp',
          )}
          {control(
            'Action Items',
            <ListTodo />,
            props.onOpenActions,
            props.isSubtitlePanelOpen,
            false,
            false,
            props.subtitleCount || null,
            'Nhiệm vụ, Quyết định & Trợ lý AI cuộc họp',
          )}
          {control(
            'Chi tiết',
            <Info />,
            props.onOpenMeetingInfo,
            props.isMeetingInfoOpen,
            false,
            false,
            null,
            'Chi tiết cuộc họp & thông tin tham gia (I)',
          )}
        </div>
      </div>
      {!isConnected && <span className="sr-only" role="status">{isConnecting ? 'Đang kết nối phòng họp' : 'Phòng họp chưa kết nối'}</span>}
      {menu === 'more' && (
        <AdaptiveDialog label="Tùy chọn cuộc họp" onClose={() => setMenu('none')} className="meeting-more-dialog">
          <header className="flex items-center justify-between px-3 pb-2 border-b border-white/10">
            <h2 className="text-base font-semibold text-white">Tùy chọn cuộc họp</h2>
            <button type="button" aria-label="Đóng tùy chọn" className="icon-target text-zinc-400 hover:text-white" onClick={() => setMenu('none')}><X /></button>
          </header>
          {capabilityNotice && <p role="status" className="capability-notice">{capabilityNotice}</p>}

          <div className="px-2 pt-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-2 block mb-1">Cộng tác & Biên bản</span>
            <div className="meeting-menu-grid">
              {menuAction(`Mọi người (${props.numParticipants})`, <Users />, action(props.onOpenPeoplePanel))}
              {menuAction(`Chat${props.unreadChatCount ? ` (${props.unreadChatCount} mới)` : ''}`, <MessageSquare />, action(props.onToggleChatPanel))}
              {menuAction('Action Items', <ListTodo />, action(props.onOpenActions))}
              {props.onOpenCopilot && menuAction('Hỏi AI Copilot (Ctrl+K)', <Sparkles />, action(props.onOpenCopilot))}
              {menuAction('Tóm tắt', <FileText />, action(props.onOpenRecap))}
              {menuAction('Thông tin cuộc họp', <FileText />, action(props.onOpenMeetingInfo))}
              {menuAction('Mời người', <UserPlus />, action(props.onOpenPeoplePanel))}
              {menuAction('Lịch sử phụ đề & xuất', <Subtitles />, action(props.onOpenSubtitleHistory))}
            </div>
          </div>

          <div className="px-2 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-2 block mb-1">Thiết bị & Tính năng AI</span>
            <div className="meeting-menu-grid">
              <ThemeToggle showLabel />
              {menuAction(props.isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình', <Monitor />, shareScreen, props.isScreenSharing, !isConnected)}
              {menuAction('Microphone & loa', <Mic />, () => setMenu('audio'))}
              {menuAction('Chọn camera', <Video />, () => setMenu('video'))}
              {menuAction('Phiên dịch âm thanh (TTS)', <Headphones />, () => { const next = !isTtsEnabled; setIsTtsEnabled(next); ttsEngine.updateSettings({ enabled: next }); }, isTtsEnabled)}
              {props.onToggleAudioBooth && menuAction('Cabin phiên dịch (Audio Booth — Ducking -18dB)', <Headphones />, action(props.onToggleAudioBooth), props.isAudioBoothActive)}
              {menuAction(props.isHandRaised ? 'Hạ tay' : 'Giơ tay', <Hand />, action(onToggleRaiseHand), props.isHandRaised, !isConnected)}
              {props.isRecordingEnabled && props.onToggleRecording && menuAction(props.isRecording ? 'Dừng ghi hình cuộc họp' : 'Ghi hình cuộc họp', <CircleDot />, () => {
                if (!navigator.mediaDevices?.getDisplayMedia) setCapabilityNotice('Ghi hình cần quyền chia sẻ màn hình trên máy tính. Hãy mở cùng phòng trên PC; trên điện thoại bạn có thể xuất phụ đề và biên bản từ Trợ lý AI.');
                else action(props.onToggleRecording)();
              }, props.isRecording)}
              {isRecording && <MeetingControlButton label="Dừng ghi" icon={<CircleDot />} onClick={action(props.onToggleRecording)} danger={isRecording} />}
              {isFloatingSubtitleEnabled && props.onToggleFloatingSubtitle && menuAction('Phụ đề nổi (PiP)', <Tv2 />, action(props.onToggleFloatingSubtitle), props.isFloatingSubtitleActive)}
              {menuAction('Đổi bố cục hiển thị', <Grid />, action(props.onOpenLayoutMenu))}
              {menuAction('Cài đặt âm thanh & AI', <Settings />, action(props.onOpenSettings))}
              {props.onToggleActivitiesPanel && menuAction('Hoạt động', <Shapes />, action(props.onToggleActivitiesPanel))}
              {props.isHost && props.onToggleHostControlsPanel && menuAction(`Bộ điều khiển của người tổ chức${props.pendingAdmissionsCount ? ` (${props.pendingAdmissionsCount} chờ duyệt)` : ''}`, <Shield />, action(props.onToggleHostControlsPanel))}
            </div>
          </div>

          {props.onSendReaction && (
            <div className="px-3 pt-2 pb-1 border-t border-white/10 mt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Gửi biểu cảm</span>
              <div className="flex justify-around gap-1" aria-label="Biểu cảm">
                {['👍', '👏', '❤️', '🎉', '💡'].map(emoji => (
                  <button type="button" key={emoji} className="icon-target text-2xl hover:scale-125 transition-transform cursor-pointer" aria-label={`Gửi biểu cảm ${emoji}`} onClick={() => { props.onSendReaction?.(emoji); setMenu('none'); }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </AdaptiveDialog>
      )}
      <AudioDeviceMenu microphoneTrack={props.microphoneTrack} isOpen={menu === 'audio'} onClose={() => setMenu('none')} />
      <VideoDeviceMenu isOpen={menu === 'video'} onClose={() => setMenu('none')} />
    </footer>
  );
};
