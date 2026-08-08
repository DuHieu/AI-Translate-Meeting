import React, { useEffect, useState } from 'react';
import { X, Mic, Video, Settings as SettingsIcon } from 'lucide-react';
import { useRoomContext } from '@livekit/components-react';

interface MeetingSettingsDialogProps {
  onClose: () => void;
}

export const MeetingSettingsDialog: React.FC<MeetingSettingsDialogProps> = ({ onClose }) => {
  const room = useRoomContext();
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'general'>('audio');

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');

  useEffect(() => {
    async function loadDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((d) => d.kind === 'audioinput');
        const cams = devices.filter((d) => d.kind === 'videoinput');

        setAudioDevices(mics);
        setVideoDevices(cams);

        if (mics.length > 0) setSelectedAudioId(mics[0].deviceId);
        if (cams.length > 0) setSelectedVideoId(cams[0].deviceId);
      } catch (e) {
        console.error('Failed to enumerate media devices', e);
      }
    }
    loadDevices();
  }, []);

  const handleAudioChange = async (deviceId: string) => {
    setSelectedAudioId(deviceId);
    if (room) {
      try {
        await room.switchActiveDevice('audioinput', deviceId);
      } catch (e) {
        console.error('Failed to switch microphone device', e);
      }
    }
  };

  const handleVideoChange = async (deviceId: string) => {
    setSelectedVideoId(deviceId);
    if (room) {
      try {
        await room.switchActiveDevice('videoinput', deviceId);
      } catch (e) {
        console.error('Failed to switch camera device', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-lg">
            <SettingsIcon className="w-5 h-5 text-sky-400" />
            <span>Settings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`pb-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === 'audio' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400'
            }`}
          >
            <Mic className="w-4 h-4" /> Audio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`pb-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === 'video' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400'
            }`}
          >
            <Video className="w-4 h-4" /> Video
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'audio' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Microphone</label>
              <select
                value={selectedAudioId}
                onChange={(e) => handleAudioChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-sky-500"
              >
                {audioDevices.length > 0 ? (
                  audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))
                ) : (
                  <option value="">Default Microphone</option>
                )}
              </select>
            </div>
          )}

          {activeTab === 'video' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Camera</label>
              <select
                value={selectedVideoId}
                onChange={(e) => handleVideoChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-sky-500"
              >
                {videoDevices.length > 0 ? (
                  videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))
                ) : (
                  <option value="">Default Camera</option>
                )}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
