import { AdaptiveDialog } from '../common/AdaptiveDialog';
import React from 'react';
import { useMediaDeviceSelect } from '@livekit/components-react';
import { Video, Check } from 'lucide-react';

interface VideoDeviceMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VideoDeviceMenu: React.FC<VideoDeviceMenuProps> = ({ isOpen, onClose }) => {
  const { devices: videoDevices, activeDeviceId: activeVideoId, setActiveMediaDevice: setActiveVideo } =
    useMediaDeviceSelect({ kind: 'videoinput', requestPermissions: true });

  if (!isOpen) return null;

  return (
    <AdaptiveDialog label="Chọn camera" onClose={onClose} className="meeting-device-dialog">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-sky-400" /> Chọn Camera
          </span>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {videoDevices.length > 0 ? (
            videoDevices.map((d) => {
              const isSelected = d.deviceId === activeVideoId || (!activeVideoId && videoDevices[0]?.deviceId === d.deviceId);
              return (
                <button
                  key={d.deviceId}
                  type="button"
                  onClick={async () => {
                    console.log('[Telemetry] Selected Camera:', { deviceId: d.deviceId, label: d.label });
                    await setActiveVideo(d.deviceId);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600/20 text-sky-300 font-medium border border-sky-500/30'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="truncate pr-2">{d.label || `Camera (${d.deviceId.slice(0, 6)})`}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="text-xs text-slate-500 italic p-2">Đang tìm thiết bị camera...</div>
          )}
        </div>
      </div>
    </AdaptiveDialog>
  );
};
