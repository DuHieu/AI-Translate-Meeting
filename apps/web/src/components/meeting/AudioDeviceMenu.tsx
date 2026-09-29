import React, { useState } from 'react';
import { useMediaDeviceSelect, useTrackVolume } from '@livekit/components-react';
import { LocalAudioTrack } from 'livekit-client';
import { Mic, Volume2, Check, BellRing } from 'lucide-react';

interface AudioDeviceMenuProps {
  microphoneTrack?: LocalAudioTrack | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AudioDeviceMenu: React.FC<AudioDeviceMenuProps> = ({ microphoneTrack, isOpen, onClose }) => {
  const { devices: micDevices, activeDeviceId: activeMicId, setActiveMediaDevice: setActiveMic } =
    useMediaDeviceSelect({ kind: 'audioinput', requestPermissions: true });

  const { devices: speakerDevices, activeDeviceId: activeSpeakerId, setActiveMediaDevice: setActiveSpeaker } =
    useMediaDeviceSelect({ kind: 'audiooutput', requestPermissions: false });

  const volume = useTrackVolume(microphoneTrack ?? undefined);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);

  if (!isOpen) return null;

  // Synthesize a pleasant meeting audio chime using Web Audio API (no external file needed)
  const handleTestSpeaker = () => {
    try {
      setIsPlayingTestSound(true);
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + idx * 0.12);
        osc.stop(audioCtx.currentTime + idx * 0.12 + 0.36);
      });
      setTimeout(() => {
        setIsPlayingTestSound(false);
      }, 700);
    } catch (e) {
      console.warn('Audio test failed', e);
      setIsPlayingTestSound(false);
    }
  };

  return (
    <>
      {/* Invisible backdrop to dismiss menu on click outside */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 z-40 bg-slate-900 border border-slate-700/90 rounded-2xl p-4 shadow-2xl w-80 max-w-[90vw] space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-150 text-slate-100">
        {/* Microphone Section */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-sky-400" /> Microphone
            </span>
          </div>

          {/* Real-time Voice Level Meter */}
          <div className="mb-2 bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">Input:</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-75 rounded-full"
                style={{ width: `${Math.min(100, Math.round(volume * 250))}%` }}
              />
            </div>
          </div>

          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {micDevices.length > 0 ? (
              micDevices.map((d) => {
                const isSelected = d.deviceId === activeMicId || (!activeMicId && micDevices[0]?.deviceId === d.deviceId);
                return (
                  <button
                    key={d.deviceId}
                    type="button"
                    onClick={async () => {
                      console.log('[Telemetry] Selected Microphone:', { deviceId: d.deviceId, label: d.label });
                      await setActiveMic(d.deviceId);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600/20 text-sky-300 font-medium border border-sky-500/30'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="truncate pr-2">{d.label || `Microphone (${d.deviceId.slice(0, 6)})`}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="text-xs text-slate-500 italic p-2">Đang tìm thiết bị microphone...</div>
            )}
          </div>
        </div>

        {/* Speaker Section */}
        <div className="border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-sky-400" /> Loa / Đầu ra âm thanh
            </span>
          </div>

          <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
            {speakerDevices.length > 0 ? (
              speakerDevices.map((d) => {
                const isSelected = d.deviceId === activeSpeakerId || (!activeSpeakerId && speakerDevices[0]?.deviceId === d.deviceId);
                return (
                  <button
                    key={d.deviceId}
                    type="button"
                    onClick={async () => {
                      await setActiveSpeaker(d.deviceId);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600/20 text-sky-300 font-medium border border-sky-500/30'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="truncate pr-2">{d.label || `Loa (${d.deviceId.slice(0, 6)})`}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="text-xs text-slate-500 italic p-1.5">Mặc định hệ điều hành</div>
            )}
          </div>

          <button
            type="button"
            onClick={handleTestSpeaker}
            disabled={isPlayingTestSound}
            className="w-full mt-2.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition border border-slate-700 cursor-pointer disabled:opacity-50"
          >
            <BellRing className={`w-3.5 h-3.5 ${isPlayingTestSound ? 'text-amber-400 animate-bounce' : 'text-sky-400'}`} />
            <span>{isPlayingTestSound ? 'Đang phát âm thanh mẫu...' : 'Kiểm tra loa (Test sound)'}</span>
          </button>
        </div>
      </div>
    </>
  );
};
