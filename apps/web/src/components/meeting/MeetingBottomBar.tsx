import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Users,
  Settings,
  Grid,
  Subtitles,
  ChevronUp,
  Smile,
  Headphones,
  Hand,
  HandMetal,
  CircleDot,
  Tv2,
} from 'lucide-react';
import { LocalAudioTrack } from 'livekit-client';
import { MeetingControlButton } from './MeetingControlButton';
import { AudioDeviceMenu } from './AudioDeviceMenu';
import { VideoDeviceMenu } from './VideoDeviceMenu';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface MeetingBottomBarProps {
  meetingCode: string;
  isMicOn: boolean;
  isSpeaking?: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  microphoneTrack?: LocalAudioTrack | null;
  /** Room fully connected — mic/cam/screen controls are enabled */
  isConnected?: boolean;
  /** Room is connecting or reconnecting — show subtle hint on buttons */
  isConnecting?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeaveRoom: () => void;
  onOpenPeoplePanel: () => void;
  onToggleSubtitlePanel: () => void;
  onOpenSettings: () => void;
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
}

export const MeetingBottomBar: React.FC<MeetingBottomBarProps> = ({
  meetingCode,
  isMicOn,
  isSpeaking = false,
  isCameraOn,
  isScreenSharing,
  microphoneTrack,
  isConnected = true,
  isConnecting = false,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onLeaveRoom,
  onOpenPeoplePanel,
  onToggleSubtitlePanel,
  onOpenSettings,
  onOpenLayoutMenu,
  isSubtitlePanelOpen,
  subtitleCount,
  numParticipants,
  isHandRaised,
  onToggleRaiseHand,
  onSendReaction,
  isAudioBoothActive = false,
  onToggleAudioBooth,
  isRecordingEnabled = false,
  isRecording = false,
  onToggleRecording,
  isFloatingSubtitleEnabled = false,
  isFloatingSubtitleActive = false,
  onToggleFloatingSubtitle,
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const [isVideoMenuOpen, setIsVideoMenuOpen] = useState(false);
  const [isReactionMenuOpen, setIsReactionMenuOpen] = useState(false);

  // Buttons disabled while room is not connected to prevent NegotiationError loops
  const mediaDisabled = !isConnected;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useKeyboardShortcuts({
    onToggleMic,
    onToggleCamera,
  });

  return (
    // Slate Pro bottom bar: fixed edge-to-edge footer with solid surface and top border
    <footer className="fixed bottom-0 left-0 right-0 h-14 z-30 select-none pointer-events-auto bg-[#0f0f10] dark:bg-[#0f0f10] bg-white border-t border-[#2e2e30] dark:border-[#2e2e30] border-zinc-200 transition-colors">
      <div className="h-full px-3 md:px-4 flex items-center justify-between max-w-screen-xl mx-auto">

        {/* Left: Meeting info (desktop) */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500 text-zinc-600 font-mono">
          <span className="text-zinc-300 dark:text-zinc-300 text-zinc-800 font-medium">{currentTime}</span>
          <span className="text-[#3a3a3d] dark:text-[#3a3a3d] text-zinc-300">|</span>
          <span className="text-zinc-400 dark:text-zinc-400 text-zinc-700 uppercase tracking-wider">{meetingCode}</span>
        </div>

        {/* Center: Primary media controls */}
        <div className="flex items-center gap-1.5 md:gap-2 mx-auto lg:mx-0">

          {/* Microphone split control */}
          <div className={`relative flex items-center ${mediaDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div
              className="flex items-center rounded-xl border border-[#3a3a3d] dark:border-[#3a3a3d] border-zinc-300 overflow-hidden bg-[#222224] dark:bg-[#222224] bg-zinc-100"
              title={mediaDisabled ? (isConnecting ? 'Đang kết nối phòng họp...' : 'Phòng họp chưa kết nối') : undefined}
            >
              <button
                type="button"
                onClick={onToggleMic}
                disabled={mediaDisabled}
                title={
                  mediaDisabled
                    ? (isConnecting ? 'Đang kết nối...' : 'Phòng họp chưa kết nối')
                    : isMicOn ? 'Tắt microphone (Ctrl+D)' : 'Bật microphone (Ctrl+D)'
                }
                className={`px-3 py-2.5 flex items-center justify-center transition-colors cursor-pointer ${
                  isMicOn
                    ? 'text-zinc-300 dark:text-zinc-300 text-zinc-700 hover:bg-[#2a2a2c] dark:hover:bg-[#2a2a2c] hover:bg-zinc-200 hover:text-zinc-100 dark:hover:text-zinc-100 hover:text-zinc-900'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {isMicOn ? (
                  <>
                    <Mic className="w-[18px] h-[18px]" />
                    <div
                      role="img"
                      aria-label="Mức âm thanh microphone"
                      title={isSpeaking ? 'Microphone đang nhận giọng nói' : 'Microphone đang bật'}
                      className="ml-1 flex h-4 items-end gap-0.5"
                    >
                      <span
                        className={`w-0.5 rounded-full bg-emerald-400 ${
                          isSpeaking ? 'h-2 animate-bounce [animation-delay:-0.3s]' : 'h-1'
                        }`}
                      />
                      <span
                        className={`w-0.5 rounded-full bg-emerald-400 ${
                          isSpeaking ? 'h-3 animate-bounce [animation-delay:-0.15s]' : 'h-2'
                        }`}
                      />
                      <span
                        className={`w-0.5 rounded-full bg-emerald-400 ${
                          isSpeaking ? 'h-1.5 animate-bounce' : 'h-1'
                        }`}
                      />
                    </div>
                  </>
                ) : (
                  <MicOff className="w-[18px] h-[18px]" />
                )}
              </button>

              <button
                type="button"
                disabled={mediaDisabled}
                onClick={() => {
                  setIsAudioMenuOpen((prev) => !prev);
                  setIsVideoMenuOpen(false);
                }}
                title="Cài đặt Microphone & Loa"
                className={`px-1.5 py-2.5 flex items-center justify-center transition-colors border-l border-[#3a3a3d] cursor-pointer ${
                  isAudioMenuOpen
                    ? 'bg-blue-600 text-white'
                    : isMicOn
                    ? 'text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a2c]'
                    : 'bg-red-700 text-red-200 hover:bg-red-600'
                }`}
              >
                <ChevronUp className={`w-3.5 h-3.5 transition-transform ${isAudioMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <AudioDeviceMenu
              microphoneTrack={microphoneTrack}
              isOpen={isAudioMenuOpen}
              onClose={() => setIsAudioMenuOpen(false)}
            />
          </div>

          {/* Camera split control */}
          <div className={`relative flex items-center ${mediaDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center rounded-xl border border-[#3a3a3d] overflow-hidden bg-[#222224]">
              <button
                type="button"
                onClick={onToggleCamera}
                disabled={mediaDisabled}
                title={
                  mediaDisabled
                    ? (isConnecting ? 'Đang kết nối...' : 'Phòng họp chưa kết nối')
                    : isCameraOn ? 'Tắt camera (Ctrl+E)' : 'Bật camera (Ctrl+E)'
                }
                className={`px-3 py-2.5 flex items-center justify-center transition-colors cursor-pointer ${
                  isCameraOn
                    ? 'text-zinc-300 hover:bg-[#2a2a2c] hover:text-zinc-100'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {isCameraOn ? <Video className="w-[18px] h-[18px]" /> : <VideoOff className="w-[18px] h-[18px]" />}
              </button>

              <button
                type="button"
                disabled={mediaDisabled}
                onClick={() => {
                  setIsVideoMenuOpen((prev) => !prev);
                  setIsAudioMenuOpen(false);
                }}
                title="Chọn Camera"
                className={`px-1.5 py-2.5 flex items-center justify-center transition-colors border-l border-[#3a3a3d] cursor-pointer ${
                  isVideoMenuOpen
                    ? 'bg-blue-600 text-white'
                    : isCameraOn
                    ? 'text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a2c]'
                    : 'bg-red-700 text-red-200 hover:bg-red-600'
                }`}
              >
                <ChevronUp className={`w-3.5 h-3.5 transition-transform ${isVideoMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <VideoDeviceMenu
              isOpen={isVideoMenuOpen}
              onClose={() => setIsVideoMenuOpen(false)}
            />
          </div>

          {/* Separator */}
          <div className="hidden sm:block w-px h-6 bg-[#2e2e30] mx-0.5" />

          {/* Subtitle toggle */}
          <MeetingControlButton
            icon={<Subtitles className="w-[18px] h-[18px]" />}
            label="Live Subtitles"
            tooltip={subtitleCount > 0 ? `Mở phụ đề (${subtitleCount})` : 'Mở phụ đề'}
            onClick={onToggleSubtitlePanel}
            active={isSubtitlePanelOpen}
          />

          {isFloatingSubtitleEnabled && onToggleFloatingSubtitle && (
            <MeetingControlButton
              icon={<Tv2 className="w-[18px] h-[18px]" />}
              label="Phụ đề nổi"
              tooltip={isFloatingSubtitleActive ? 'Thu nhỏ phụ đề nổi' : 'Mở phụ đề nổi'}
              onClick={onToggleFloatingSubtitle}
              active={isFloatingSubtitleActive}
            />
          )}

          {/* Audio Booth (Cabin Phiên Dịch) toggle */}
          {onToggleAudioBooth && (
            <MeetingControlButton
              icon={<Headphones className="w-[18px] h-[18px]" />}
              label="Audio Booth"
              tooltip={
                isAudioBoothActive
                  ? 'Tắt cabin phiên dịch giọng nói (Audio Booth)'
                  : 'Bật cabin phiên dịch giọng nói (Audio Booth - Ducking -18dB)'
              }
              onClick={onToggleAudioBooth}
              active={isAudioBoothActive}
            />
          )}

          {/* Local meeting recording */}
          {isRecordingEnabled && onToggleRecording && (
            <MeetingControlButton
              icon={<CircleDot className={`w-[18px] h-[18px] ${isRecording ? 'animate-pulse' : ''}`} />}
              label={isRecording ? 'Dừng ghi' : 'Ghi hình'}
              tooltip={isRecording ? 'Dừng ghi hình cuộc họp' : 'Ghi video và phụ đề cuộc họp'}
              onClick={onToggleRecording}
              danger={isRecording}
            />
          )}

          {/* Raise hand */}
          <MeetingControlButton
            icon={isHandRaised
              ? <HandMetal className="w-[18px] h-[18px]" />
              : <Hand className="w-[18px] h-[18px]" />}
            label={isHandRaised ? 'Hạ tay' : 'Giơ tay'}
            tooltip={isHandRaised ? 'Hạ tay' : 'Giơ tay'}
            onClick={onToggleRaiseHand}
            active={isHandRaised}
            disabled={mediaDisabled}
          />

          {/* Screen share — hidden on small mobile */}
          <div className="hidden sm:block">
            <MeetingControlButton
              icon={isScreenSharing ? <MonitorOff className="w-[18px] h-[18px]" /> : <Monitor className="w-[18px] h-[18px]" />}
              label="Share Screen"
              tooltip={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
              onClick={onToggleScreenShare}
              active={isScreenSharing}
            />
          </div>

          {/* Layout — hidden on small mobile */}
          <div className="hidden md:block">
            <MeetingControlButton
              icon={<Grid className="w-[18px] h-[18px]" />}
              label="Change Layout"
              tooltip="Đổi bố cục"
              onClick={onOpenLayoutMenu}
            />
          </div>

          {/* Reactions */}
          {onSendReaction && (
            <div className="relative flex items-center">
              <MeetingControlButton
                icon={<Smile className="w-[18px] h-[18px]" />}
                label="Reactions"
                tooltip="Gửi biểu cảm"
                onClick={() => setIsReactionMenuOpen((prev) => !prev)}
                active={isReactionMenuOpen}
              />

              {isReactionMenuOpen && (
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#1a1a1b] border border-[#3a3a3d] rounded-xl p-2 shadow-xl flex items-center gap-1 z-50">
                  {['👍', '👏', '❤️', '🎉', '💡'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onSendReaction(emoji);
                        setIsReactionMenuOpen(false);
                      }}
                      aria-label={`Gửi biểu cảm ${emoji}`}
                      className="p-1.5 hover:bg-[#2a2a2c] rounded-lg text-xl transition-colors cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Leave Meeting on Mobile (danger red) */}
          <div className="sm:hidden ml-1">
            <MeetingControlButton
              icon={<PhoneOff className="w-[18px] h-[18px]" />}
              label="Leave Meeting"
              tooltip="Rời cuộc họp"
              onClick={onLeaveRoom}
              danger
            />
          </div>
        </div>

        {/* Right: Secondary controls (desktop & tablet) */}
        <div className="hidden sm:flex items-center gap-1.5">
          {/* Participants count */}
          <button
            type="button"
            onClick={onOpenPeoplePanel}
            title="Danh sách người tham gia"
            className="flex px-3 py-2 rounded-xl bg-[#222224] hover:bg-[#2a2a2c] text-zinc-300 border border-[#3a3a3d] text-xs font-medium items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>{numParticipants}</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Cài đặt âm thanh & hình ảnh"
            className="w-10 h-10 rounded-xl bg-[#222224] hover:bg-[#2a2a2c] text-zinc-300 border border-[#3a3a3d] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Leave — danger red */}
          <MeetingControlButton
            icon={<PhoneOff className="w-[18px] h-[18px]" />}
            label="Leave Meeting"
            tooltip="Rời cuộc họp"
            onClick={onLeaveRoom}
            danger
          />
        </div>
      </div>
    </footer>
  );
};
