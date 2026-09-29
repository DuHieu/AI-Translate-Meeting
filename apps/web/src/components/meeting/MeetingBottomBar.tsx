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
} from 'lucide-react';
import { LocalAudioTrack } from 'livekit-client';
import { MeetingControlButton } from './MeetingControlButton';
import { AudioDeviceMenu } from './AudioDeviceMenu';
import { VideoDeviceMenu } from './VideoDeviceMenu';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface MeetingBottomBarProps {
  meetingCode: string;
  isMicOn: boolean;
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
}

export const MeetingBottomBar: React.FC<MeetingBottomBarProps> = ({
  meetingCode,
  isMicOn,
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
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const [isVideoMenuOpen, setIsVideoMenuOpen] = useState(false);

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
    <footer className="h-20 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-4 md:px-6 flex items-center justify-between z-20 shrink-0 select-none relative">
      <div className="hidden sm:flex items-center gap-3 text-slate-400 font-mono text-xs">
        <span className="font-semibold text-slate-300">{currentTime}</span>
        <span className="text-slate-600">|</span>
        <span className="uppercase text-slate-300 font-bold">{meetingCode}</span>
      </div>

      <div className="flex items-center gap-2.5 md:gap-3 mx-auto sm:mx-0">
        {/* Microphone Split Control (Google Meet / Zoom style) */}
        <div className={`relative flex items-center ${mediaDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div
            className="flex items-center rounded-2xl bg-slate-900 border border-slate-700/80 overflow-hidden shadow-lg"
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
              className={`p-3 md:px-4 md:py-3 flex items-center justify-center transition ${mediaDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                isMicOn
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {isMicOn ? <Mic className="w-5 h-5 text-emerald-400" /> : <MicOff className="w-5 h-5 text-white" />}
            </button>

            <button
              type="button"
              disabled={mediaDisabled}
              onClick={() => {
                setIsAudioMenuOpen((prev) => !prev);
                setIsVideoMenuOpen(false);
              }}
              title="Cài đặt Microphone & Loa"
              className={`px-1.5 py-3.5 flex items-center justify-center transition border-l border-slate-700/80 ${mediaDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                isAudioMenuOpen
                  ? 'bg-sky-600 text-white'
                  : isMicOn
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                  : 'bg-red-700 hover:bg-red-600 text-red-200 hover:text-white'
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

        {/* Camera Split Control (Google Meet / Zoom style) */}
        <div className={`relative flex items-center ${mediaDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center rounded-2xl bg-slate-900 border border-slate-700/80 overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={onToggleCamera}
              disabled={mediaDisabled}
              title={
                mediaDisabled
                  ? (isConnecting ? 'Đang kết nối...' : 'Phòng họp chưa kết nối')
                  : isCameraOn ? 'Tắt camera (Ctrl+E)' : 'Bật camera (Ctrl+E)'
              }
              className={`p-3 md:px-4 md:py-3 flex items-center justify-center transition ${mediaDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                isCameraOn
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {isCameraOn ? <Video className="w-5 h-5 text-sky-400" /> : <VideoOff className="w-5 h-5 text-white" />}
            </button>

            <button
              type="button"
              disabled={mediaDisabled}
              onClick={() => {
                setIsVideoMenuOpen((prev) => !prev);
                setIsAudioMenuOpen(false);
              }}
              title="Chọn Camera"
              className={`px-1.5 py-3.5 flex items-center justify-center transition border-l border-slate-700/80 ${mediaDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                isVideoMenuOpen
                  ? 'bg-sky-600 text-white'
                  : isCameraOn
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                  : 'bg-red-700 hover:bg-red-600 text-red-200 hover:text-white'
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

        <MeetingControlButton
          icon={<Subtitles className={`w-5 h-5 ${isSubtitlePanelOpen ? 'text-white' : 'text-sky-400'}`} />}
          label="Live Subtitles"
          tooltip={subtitleCount > 0 ? `Open live transcript (${subtitleCount})` : 'Open live transcript'}
          onClick={onToggleSubtitlePanel}
          active={isSubtitlePanelOpen}
        />

        <MeetingControlButton
          icon={isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          label="Share Screen"
          tooltip={isScreenSharing ? 'Stop presenting' : 'Present / Share screen'}
          onClick={onToggleScreenShare}
          active={isScreenSharing}
        />

        <MeetingControlButton
          icon={<Grid className="w-5 h-5" />}
          label="Change Layout"
          tooltip="Change meeting layout"
          onClick={onOpenLayoutMenu}
        />

        <MeetingControlButton
          icon={<PhoneOff className="w-5 h-5" />}
          label="Leave Meeting"
          tooltip="Leave call"
          onClick={onLeaveRoom}
          danger
        />
      </div>

      <div className="hidden sm:flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenPeoplePanel}
          title="Show participants list"
          className="px-3 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
        >
          <Users className="w-4 h-4 text-sky-400" />
          <span>{numParticipants}</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title="Audio & Video settings"
          className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center justify-center transition cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
