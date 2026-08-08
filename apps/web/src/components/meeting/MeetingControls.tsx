import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, Settings, PhoneOff } from 'lucide-react';

interface MeetingControlsProps {
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
  isSubtitleOpen: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleSubtitle: () => void;
  onOpenSettings: () => void;
  onLeave: () => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isMicOn,
  isCamOn,
  isScreenSharing,
  isSubtitleOpen,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleSubtitle,
  onOpenSettings,
  onLeave,
}) => {
  return (
    <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-3 px-4 z-30">
      <button
        onClick={onToggleMic}
        className={`p-3 rounded-full transition ${
          isMicOn ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-red-600/90 text-white hover:bg-red-600'
        }`}
        title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
      >
        {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>

      <button
        onClick={onToggleCam}
        className={`p-3 rounded-full transition ${
          isCamOn ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-red-600/90 text-white hover:bg-red-600'
        }`}
        title={isCamOn ? 'Turn Off Camera' : 'Turn On Camera'}
      >
        {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </button>

      <button
        onClick={onToggleScreenShare}
        className={`p-3 rounded-full transition ${
          isScreenSharing ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
        }`}
        title="Share Screen"
      >
        <Monitor className="w-5 h-5" />
      </button>

      <button
        onClick={onToggleSubtitle}
        className={`p-3 rounded-full transition ${
          isSubtitleOpen ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
        }`}
        title="Toggle Subtitle Panel"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      <button
        onClick={onOpenSettings}
        className="p-3 rounded-full bg-slate-800 text-slate-100 hover:bg-slate-700 transition"
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      <button
        onClick={onLeave}
        className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition ml-4"
        title="Leave Meeting"
      >
        <PhoneOff className="w-5 h-5" />
      </button>
    </div>
  );
};
