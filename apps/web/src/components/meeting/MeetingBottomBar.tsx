import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Users, Settings, Grid, Subtitles, Headphones, Hand, CircleDot, Tv2, MoreHorizontal, MessageSquare, Shapes, Shield, Languages, X, UserPlus, ListTodo, FileText } from 'lucide-react';
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
  const control = (label: string, icon: React.ReactNode, callback: () => void, active = false, disabled = false, danger = false) => (
    <button type="button" aria-label={label} aria-pressed={active} disabled={disabled} onClick={callback} className={`meeting-primary-control ${active ? 'is-active' : ''} ${danger ? 'is-danger' : ''}`}>
      {icon}<span>{label}</span>
    </button>
  );
  const menuAction = (label: string, icon: React.ReactNode, callback: () => void, active?: boolean, disabled = false) => (
    <button type="button" className="meeting-menu-action" aria-label={label} aria-pressed={active} disabled={disabled} onClick={callback}>{icon}<span>{label}</span>{active && <span className="ml-auto text-sky-300">Đang bật</span>}</button>
  );
  return (
    <footer className="meeting-bottom-bar" aria-label="Điều khiển cuộc họp">
      <div className="meeting-toolbar">
        <span className="meeting-code">{props.meetingCode}</span>
        <div className="meeting-primary-controls">
          {control(isMicOn ? 'Tắt mic' : 'Bật mic', isMicOn ? (
            <span className="inline-flex items-center gap-1"><Mic /><span role="img" aria-label="Mức âm thanh microphone" className="flex items-end gap-0.5 h-4">{[1, 2, 3].map(index => <span key={index} className={`w-0.5 h-3 bg-emerald-400 rounded ${props.isSpeaking ? 'animate-bounce' : ''}`} />)}</span></span>
          ) : <MicOff />, onToggleMic, isMicOn, !isConnected)}
          {control(isCameraOn ? 'Tắt cam' : 'Bật cam', isCameraOn ? <Video /> : <VideoOff />, onToggleCamera, isCameraOn, !isConnected)}
          {control('Phụ đề', <Subtitles />, onToggleSubtitlePanel, props.isCaptionsActive)}
          {control('Ngôn ngữ', <Languages />, props.onOpenLanguage)}
          {control('Thêm', <MoreHorizontal />, () => setMenu('more'), menu === 'more')}
          {control('Rời', <PhoneOff />, props.onLeaveRoom, false, false, true)}
        </div>
        <div className="meeting-desktop-controls">
          {control('Mọi người', <Users />, props.onOpenPeoplePanel, props.isPeoplePanelOpen)}
          {props.onToggleChatPanel && control('Chat', <MessageSquare />, props.onToggleChatPanel, props.activeSidePanel === 'chat')}
          {control('Action Items', <ListTodo />, props.onOpenActions)}
        </div>
      </div>
      {!isConnected && <span className="sr-only" role="status">{isConnecting ? 'Đang kết nối phòng họp' : 'Phòng họp chưa kết nối'}</span>}
      {menu === 'more' && (
        <AdaptiveDialog label="Tùy chọn cuộc họp" onClose={() => setMenu('none')} className="meeting-more-dialog">
          <header className="flex items-center justify-between px-3 pb-2">
            <h2 className="text-lg font-semibold">Tùy chọn cuộc họp</h2>
            <button type="button" aria-label="Đóng tùy chọn" className="icon-target" onClick={() => setMenu('none')}><X /></button>
          </header>
          {capabilityNotice && <p role="status" className="capability-notice">{capabilityNotice}</p>}
          <div className="meeting-menu-grid">
            {menuAction(`Mọi người (${props.numParticipants})`, <Users />, action(props.onOpenPeoplePanel))}
            {menuAction(`Chat${props.unreadChatCount ? ` (${props.unreadChatCount} mới)` : ''}`, <MessageSquare />, action(props.onToggleChatPanel))}
            {menuAction('Action Items', <ListTodo />, action(props.onOpenActions))}
            {menuAction('Tóm tắt', <FileText />, action(props.onOpenRecap))}
            {menuAction('Thông tin cuộc họp', <FileText />, action(props.onOpenMeetingInfo))}
            {menuAction('Mời người', <UserPlus />, action(props.onOpenPeoplePanel))}
            {menuAction('Lịch sử phụ đề & xuất', <Subtitles />, action(props.onOpenSubtitleHistory))}
          </div>
          <div className="meeting-menu-list">
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
          {props.onSendReaction && <div className="flex justify-around gap-1 px-3 pt-3" aria-label="Biểu cảm">
            {['👍', '👏', '❤️', '🎉', '💡'].map(emoji => <button type="button" key={emoji} className="icon-target text-2xl" aria-label={`Gửi biểu cảm ${emoji}`} onClick={() => { props.onSendReaction?.(emoji); setMenu('none'); }}>{emoji}</button>)}
          </div>}
        </AdaptiveDialog>
      )}
      <AudioDeviceMenu microphoneTrack={props.microphoneTrack} isOpen={menu === 'audio'} onClose={() => setMenu('none')} />
      <VideoDeviceMenu isOpen={menu === 'video'} onClose={() => setMenu('none')} />
    </footer>
  );
};
