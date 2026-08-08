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
} from 'lucide-react';
import { MeetingControlButton } from './MeetingControlButton';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface MeetingBottomBarProps {
  meetingCode: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeaveRoom: () => void;
  onOpenPeoplePanel: () => void;
  onOpenSettings: () => void;
  onOpenLayoutMenu: () => void;
  numParticipants: number;
}

export const MeetingBottomBar: React.FC<MeetingBottomBarProps> = ({
  meetingCode,
  isMicOn,
  isCameraOn,
  isScreenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onLeaveRoom,
  onOpenPeoplePanel,
  onOpenSettings,
  onOpenLayoutMenu,
  numParticipants,
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [showCaptionsToast, setShowCaptionsToast] = useState(false);

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

  // Register keyboard shortcuts: Ctrl+D (Mic), Ctrl+E (Camera)
  useKeyboardShortcuts({
    onToggleMic,
    onToggleCamera,
  });

  const handleCaptionsClick = () => {
    setShowCaptionsToast(true);
    setTimeout(() => setShowCaptionsToast(false), 3000);
  };

  return (
    <footer className="h-20 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-4 md:px-6 flex items-center justify-between z-20 shrink-0 select-none relative">
      {/* Toast for Captions Placeholder */}
      {showCaptionsToast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-sky-950 border border-sky-500/40 text-sky-200 text-xs px-4 py-2 rounded-xl shadow-2xl animate-fade-in font-medium z-50">
          ✨ Live Translation Subtitles coming soon in Phase 1 Step 7!
        </div>
      )}

      {/* Left: Time & Code */}
      <div className="hidden sm:flex items-center gap-3 text-slate-400 font-mono text-xs">
        <span className="font-semibold text-slate-300">{currentTime}</span>
        <span className="text-slate-600">|</span>
        <span className="uppercase text-slate-300 font-bold">{meetingCode}</span>
      </div>

      {/* Center: Main Primary Controls */}
      <div className="flex items-center gap-2.5 md:gap-3 mx-auto sm:mx-0">
        <MeetingControlButton
          icon={isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          label="Toggle Microphone"
          tooltip={isMicOn ? 'Turn off mic (Ctrl+D)' : 'Turn on mic (Ctrl+D)'}
          onClick={onToggleMic}
          danger={!isMicOn}
        />

        <MeetingControlButton
          icon={isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          label="Toggle Camera"
          tooltip={isCameraOn ? 'Turn off camera (Ctrl+E)' : 'Turn on camera (Ctrl+E)'}
          onClick={onToggleCamera}
          danger={!isCameraOn}
        />

        <MeetingControlButton
          icon={<Subtitles className="w-5 h-5 text-sky-400" />}
          label="Live Subtitles"
          tooltip="Live Translation Subtitles (Coming soon)"
          onClick={handleCaptionsClick}
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

      {/* Right: Drawer Toggles */}
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
