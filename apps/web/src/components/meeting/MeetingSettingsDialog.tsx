import { AdaptiveDialog } from '../common/AdaptiveDialog';
import React, { useCallback, useEffect, useState } from 'react';
import { X, Mic, Video, Sparkles, BookOpen, Plus, Trash2, Download, Upload, Check, Languages, Volume2, Key, Sliders, RefreshCw, Headphones } from 'lucide-react';
import { useRoomContext } from '@livekit/components-react';
import { meetingApi } from '../../api/meetingApi';
import type { TranslationUsageResponse } from '../../api/meetingApi';
import { SidecarPreferences } from '../../types/meeting';
import {
  getCustomSkills,
  saveCustomSkill,
  deleteCustomSkill,
  importCustomSkillsFromJson,
  exportCustomSkillsToJson,
  MeetingRecapSkill,
} from '../../utils/recapSkillManager';
import {
  getUserSettings,
  saveUserSettings,
  UserMeetingSettings,
  SubtitleDisplayMode,
  SubtitleFontSize,
  SubtitleBgOpacity,
  VadSensitivity,
  GlossaryDomain,
  ByokProvider,
  TranslationTier,
  AudioBoothVoiceGender,
} from '../../utils/userSettings';

interface MeetingSettingsDialogProps {
  onClose: () => void;
  meetingId: string;
  meetingCode: string;
  sidecarPreferences: SidecarPreferences;
  onSidecarPreferencesChange: (preferences: SidecarPreferences) => void;
}

export const MeetingSettingsDialog: React.FC<MeetingSettingsDialogProps> = ({
  onClose,
  meetingId,
  meetingCode,
  sidecarPreferences,
  onSidecarPreferencesChange,
}) => {
  const room = useRoomContext();
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'subtitles' | 'sidecar' | 'skills'>('audio');
  const [userSettings, setUserSettings] = useState<UserMeetingSettings>(() => getUserSettings());
  const [glossaryTerm, setGlossaryTerm] = useState('');
  const [glossaryTranslation, setGlossaryTranslation] = useState('');
  const [isGlossarySyncing, setIsGlossarySyncing] = useState(false);
  const [glossaryStatus, setGlossaryStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [translationUsage, setTranslationUsage] = useState<TranslationUsageResponse | null>(null);
  const [isTranslationUsageLoading, setIsTranslationUsageLoading] = useState(false);
  const [translationUsageError, setTranslationUsageError] = useState<string | null>(null);

  const handleUpdateSetting = <K extends keyof UserMeetingSettings>(key: K, value: UserMeetingSettings[K]) => {
    const updated = saveUserSettings({ [key]: value });
    setUserSettings(updated);
  };

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');

  // Custom skills management state (standard skill is strictly hidden by getCustomSkills)
  const [customSkills, setCustomSkills] = useState<MeetingRecapSkill[]>(() => getCustomSkills());
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDepartment, setNewSkillDepartment] = useState('');
  const [newSkillDescription, setNewSkillDescription] = useState('');
  const [newSkillKeywords, setNewSkillKeywords] = useState('');
  const [jsonImportText, setJsonImportText] = useState('');
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const usageTier = userSettings.byokEnabled ? 'byok' : userSettings.translationTier;
  const loadTranslationUsage = useCallback(async () => {
    setIsTranslationUsageLoading(true);
    setTranslationUsageError(null);
    try {
      const usage = await meetingApi.getTranslationUsage(meetingId, usageTier);
      setTranslationUsage(usage);
    } catch (error) {
      setTranslationUsageError(
        error instanceof Error ? error.message : 'Không thể tải hạn mức dịch thuật.',
      );
    } finally {
      setIsTranslationUsageLoading(false);
    }
  }, [meetingId, usageTier]);

  useEffect(() => {
    if (activeTab === 'subtitles') {
      void loadTranslationUsage();
    }
  }, [activeTab, loadTranslationUsage]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoomGlossary() {
      setIsGlossarySyncing(true);
      setGlossaryStatus(null);
      try {
        const response = await meetingApi.getRoomGlossary(meetingCode);
        if (cancelled) return;
        const merged = { ...getUserSettings().customGlossary, ...response.terms };
        const updated = saveUserSettings({ customGlossary: merged });
        setUserSettings(updated);
      } catch (error) {
        if (!cancelled) {
          setGlossaryStatus({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Không thể tải từ điển của phòng họp.',
          });
        }
      } finally {
        if (!cancelled) setIsGlossarySyncing(false);
      }
    }

    void loadRoomGlossary();
    return () => {
      cancelled = true;
    };
  }, [meetingCode]);

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

  const handleCreateCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const keywords = newSkillKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    saveCustomSkill({
      name: newSkillName.trim(),
      description: newSkillDescription.trim() || 'Kỹ năng tóm tắt tùy biến cho công ty',
      targetDepartment: newSkillDepartment.trim() || 'Nội bộ',
      customKeywords: keywords,
      sections: [],
    });

    setCustomSkills(getCustomSkills());
    setNewSkillName('');
    setNewSkillDepartment('');
    setNewSkillDescription('');
    setNewSkillKeywords('');
    setIsAddingSkill(false);
  };

  const handleDeleteSkill = (id: string) => {
    deleteCustomSkill(id);
    setCustomSkills(getCustomSkills());
  };

  const handleExportJson = () => {
    const json = exportCustomSkillsToJson();
    navigator.clipboard?.writeText(json);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleImportJson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonImportText.trim()) return;
    const res = importCustomSkillsFromJson(jsonImportText);
    if (res.success) {
      setCustomSkills(getCustomSkills());
      setJsonImportText('');
      setShowJsonImport(false);
    } else {
      alert(`Lỗi nhập JSON: ${res.error || 'Định dạng không hợp lệ'}`);
    }
  };

  const handleAddGlossaryTerm = (event: React.FormEvent) => {
    event.preventDefault();
    const term = glossaryTerm.trim();
    const translation = glossaryTranslation.trim();
    if (!term || !translation) return;

    const updated = saveUserSettings({
      customGlossary: { ...userSettings.customGlossary, [term]: translation },
    });
    setUserSettings(updated);
    setGlossaryTerm('');
    setGlossaryTranslation('');
    setGlossaryStatus(null);
  };

  const handleRemoveGlossaryTerm = (term: string) => {
    const nextTerms = { ...userSettings.customGlossary };
    delete nextTerms[term];
    setUserSettings(saveUserSettings({ customGlossary: nextTerms }));
    setGlossaryStatus(null);
  };

  const handleSyncGlossary = async () => {
    setIsGlossarySyncing(true);
    setGlossaryStatus(null);
    try {
      const response = await meetingApi.updateRoomGlossary(meetingCode, userSettings.customGlossary);
      setUserSettings(saveUserSettings({ customGlossary: response.terms }));
      setGlossaryStatus({ kind: 'success', message: `Đã đồng bộ ${Object.keys(response.terms).length} thuật ngữ với phòng ${meetingCode}.` });
    } catch (error) {
      setGlossaryStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Không thể đồng bộ từ điển.',
      });
    } finally {
      setIsGlossarySyncing(false);
    }
  };

  return (
    <AdaptiveDialog label="Cài đặt cuộc họp" onClose={onClose} className="meeting-settings-dialog">
      <div className="bg-[#181a20] border border-[#2b2e36] rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2b2e36] px-5 sm:px-6 py-3.5 sm:py-4 shrink-0 bg-[#1e2027]">
          <h2 className="text-base sm:text-lg font-semibold text-zinc-100">Cài đặt cuộc họp</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cài đặt"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#2a2d36] hover:bg-[#343844] text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Responsive Layout: Mobile Horizontal Tabs | Desktop 2-Column Sidebar */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-[#181a20]">
          {/* Navigation */}
          <nav className="w-full md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-[#2b2e36] p-1.5 sm:p-2 md:p-3 flex md:flex-col justify-between md:justify-start gap-1 md:space-y-1 overflow-x-auto md:overflow-x-visible no-scrollbar bg-[#14151a]">
            <button
              type="button"
              aria-pressed={activeTab === 'audio'}
              onClick={() => setActiveTab('audio')}
              className={`shrink-0 md:w-full flex items-center justify-center md:justify-start gap-1.5 md:gap-3 px-2.5 sm:px-3.5 py-2 md:py-2.5 rounded-xl text-[11px] sm:text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'audio'
                  ? 'bg-sky-700 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:bg-[#20222a] hover:text-zinc-200'
              }`}
            >
              <Mic className="hidden sm:inline-block w-4 h-4 shrink-0" />
              <span>Âm thanh</span>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'video'}
              onClick={() => setActiveTab('video')}
              className={`shrink-0 md:w-full flex items-center justify-center md:justify-start gap-1.5 md:gap-3 px-2.5 sm:px-3.5 py-2 md:py-2.5 rounded-xl text-[11px] sm:text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'video'
                  ? 'bg-sky-700 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:bg-[#20222a] hover:text-zinc-200'
              }`}
            >
              <Video className="hidden sm:inline-block w-4 h-4 shrink-0" />
              <span>Video</span>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'subtitles'}
              onClick={() => setActiveTab('subtitles')}
              className={`shrink-0 md:w-full flex items-center justify-center md:justify-start gap-1.5 md:gap-3 px-2.5 sm:px-3.5 py-2 md:py-2.5 rounded-xl text-[11px] sm:text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'subtitles'
                  ? 'bg-sky-700 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:bg-[#20222a] hover:text-zinc-200'
              }`}
            >
              <Languages className="hidden sm:inline-block w-4 h-4 shrink-0" />
              <span>Phụ đề</span>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'sidecar'}
              onClick={() => setActiveTab('sidecar')}
              className={`shrink-0 md:w-full flex items-center justify-center md:justify-start gap-1.5 md:gap-3 px-2.5 sm:px-3.5 py-2 md:py-2.5 rounded-xl text-[11px] sm:text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'sidecar'
                  ? 'bg-sky-700 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:bg-[#20222a] hover:text-zinc-200'
              }`}
            >
              <Sparkles className="hidden sm:inline-block w-4 h-4 shrink-0" />
              <span>Tiện ích</span>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'skills'}
              onClick={() => setActiveTab('skills')}
              className={`shrink-0 md:w-full flex items-center justify-center md:justify-start gap-1.5 md:gap-3 px-2.5 sm:px-3.5 py-2 md:py-2.5 rounded-xl text-[11px] sm:text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'skills'
                  ? 'bg-sky-700 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:bg-[#20222a] hover:text-zinc-200'
              }`}
            >
              <BookOpen className="hidden sm:inline-block w-4 h-4 shrink-0" />
              <span>Kỹ năng AI</span>
            </button>
          </nav>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5">
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">Microphone</label>
                <select aria-label="Microphone"
                  value={selectedAudioId}
                  onChange={(e) => handleAudioChange(e.target.value)}
                  className="w-full bg-[#252830] border border-[#353842] text-zinc-100 text-sm rounded-xl p-3 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
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

              {/* VAD Sensitivity */}
              <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">Độ nhạy Micro &amp; Lọc tiếng ồn (VAD)</p>
                      <p className="text-xs text-zinc-400">Điều chỉnh ngưỡng nhận diện giọng nói và lọc tạp âm nền</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
                  {(['low', 'medium', 'high'] as VadSensitivity[]).map((level) => {
                    const label = level === 'low' ? 'Nhẹ (Nhạy)' : level === 'medium' ? 'Tiêu chuẩn' : 'Mạnh (Lọc)';
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleUpdateSetting('vadSensitivity', level)}
                        className={`py-2 px-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition cursor-pointer text-center whitespace-nowrap ${
                          userSettings.vadSensitivity === level
                            ? 'bg-sky-700 text-white font-semibold border border-sky-500 shadow-xs'
                            : 'bg-[#2a2d35] text-zinc-300 hover:bg-[#343842] border border-[#383b44]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audio Ducking */}
              <div className="flex items-center justify-between rounded-xl border border-[#2c2f37] bg-[#1f2127] p-4">
                <div className="flex items-center gap-2.5 pr-2">
                  <Volume2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">Tự động giảm âm nền (Audio Ducking)</p>
                    <p className="text-xs text-zinc-400">Tự động hạ âm lượng video/media khi có người phát biểu</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Tự động giảm âm nền"
                  aria-pressed={userSettings.audioDuckingEnabled}
                  onClick={() => handleUpdateSetting('audioDuckingEnabled', !userSettings.audioDuckingEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ml-2 ${
                    userSettings.audioDuckingEnabled ? 'bg-sky-700' : 'bg-[#2e313b]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      userSettings.audioDuckingEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Audio Cabin Voice & Speed Settings */}
              <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Headphones className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">Cabin Phiên dịch (Audio Booth)</p>
                    <p className="text-xs text-zinc-400">Tùy chỉnh giọng đọc TTS và tốc độ phiên dịch âm thanh trực tiếp</p>
                  </div>
                </div>

                {/* Voice Gender Selection */}
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Giới tính giọng đọc</label>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {([
                      { id: 'auto', label: 'Tự động' },
                      { id: 'male', label: 'Giọng Nam' },
                      { id: 'female', label: 'Giọng Nữ' },
                    ] as const).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleUpdateSetting('audioBoothVoiceGender', id as AudioBoothVoiceGender)}
                        className={`py-2 px-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition cursor-pointer text-center whitespace-nowrap ${
                          (userSettings.audioBoothVoiceGender || 'auto') === id
                            ? 'bg-sky-700 text-white font-semibold border border-sky-500 shadow-xs'
                            : 'bg-[#2a2d35] text-zinc-300 hover:bg-[#343842] border border-[#383b44]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed Multiplier Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-zinc-400">Tốc độ đọc giọng nói</label>
                    <span className="text-[11px] font-semibold text-sky-400 font-mono">
                      {(userSettings.audioBoothSpeedRate || 1.0).toFixed(1)}x
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {[
                      { rate: 0.8, label: '0.8x (Chậm)' },
                      { rate: 1.0, label: '1.0x (Chuẩn)' },
                      { rate: 1.2, label: '1.2x (Khá)' },
                      { rate: 1.4, label: '1.4x (Nhanh)' },
                    ].map(({ rate, label }) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleUpdateSetting('audioBoothSpeedRate', rate)}
                        className={`py-2 px-1 rounded-lg text-[11px] font-medium transition cursor-pointer text-center whitespace-nowrap ${
                          (userSettings.audioBoothSpeedRate || 1.0) === rate
                            ? 'bg-sky-700 text-white font-semibold border border-sky-500 shadow-xs'
                            : 'bg-[#2a2d35] text-zinc-300 hover:bg-[#343842] border border-[#383b44]'
                        }`}
                      >
                        <span className="sm:hidden">{rate.toFixed(1)}x</span>
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subtitles' && (
            <div className="space-y-4">
              {/* Interim Real-time Subtitle Stream Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5">
                <div className="pr-2">
                  <p className="text-sm font-semibold text-zinc-100">Hiển thị phụ đề thời gian thực (Interim Stream)</p>
                  <p className="text-xs text-zinc-400">Hiển thị chữ mờ ngay khi đang nói (độ trễ ~350ms), tự động chốt nét khi dứt câu</p>
                </div>
                <button
                  type="button"
                  aria-label="Hiển thị phụ đề thời gian thực"
                  aria-pressed={userSettings.showInterimSubtitles}
                  onClick={() => handleUpdateSetting('showInterimSubtitles', !userSettings.showInterimSubtitles)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ml-2 ${
                    userSettings.showInterimSubtitles ? 'bg-sky-700' : 'bg-[#2e313b]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      userSettings.showInterimSubtitles ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Subtitle Display Mode */}
              <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5 space-y-2.5">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Chế độ hiển thị phụ đề</p>
                  <p className="text-xs text-zinc-400">Tùy biến hiển thị câu nói gốc và bản dịch thời gian thực</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
                  {([
                    ['bilingual', 'Song ngữ'],
                    ['translation_only', 'Chỉ dịch'],
                    ['original_only', 'Chỉ câu gốc'],
                  ] as [SubtitleDisplayMode, string][]).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleUpdateSetting('subtitleDisplayMode', mode)}
                      className={`py-2 px-1 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition cursor-pointer text-center whitespace-nowrap ${
                        userSettings.subtitleDisplayMode === mode
                          ? 'bg-sky-700 text-white font-semibold border border-sky-500 shadow-xs'
                          : 'bg-[#2a2d35] text-zinc-300 hover:bg-[#343842] border border-[#383b44]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtitle Font Size */}
              <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5 space-y-2.5">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Kích thước chữ phụ đề</p>
                  <p className="text-xs text-zinc-400">Tối ưu cho người cận thị hoặc màn hình thuyết trình lớn</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-1">
                  {([
                    ['sm', 'Nhỏ (14px)'],
                    ['md', 'Vừa (18px)'],
                    ['lg', 'Lớn (22px)'],
                    ['xl', 'Rất lớn (26px)'],
                  ] as [SubtitleFontSize, string][]).map(([size, label]) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleUpdateSetting('subtitleFontSize', size)}
                      className={`py-2 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium transition cursor-pointer text-center whitespace-nowrap ${
                        userSettings.subtitleFontSize === size
                          ? 'bg-sky-700 text-white font-semibold border border-sky-500 shadow-xs'
                          : 'bg-[#2a2d35] text-zinc-300 hover:bg-[#343842] border border-[#383b44]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtitle Background Opacity */}
              <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5 space-y-2.5">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Độ mờ nền phụ đề</p>
                  <p className="text-xs text-zinc-400">Đảm bảo độ tương phản rõ nét trên các nền video phức tạp</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
                  {([
                    ['light', 'Mờ (50%)'],
                    ['medium', 'Chuẩn (80%)'],
                    ['heavy', 'Đậm (95%)'],
                  ] as [SubtitleBgOpacity, string][]).map(([opacity, label]) => (
                    <button
                      key={opacity}
                      type="button"
                      onClick={() => handleUpdateSetting('subtitleBgOpacity', opacity)}
                      className={`py-2 px-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition cursor-pointer text-center whitespace-nowrap ${
                        userSettings.subtitleBgOpacity === opacity
                          ? 'bg-sky-700 text-white font-semibold border border-sky-500 shadow-xs'
                          : 'bg-[#2a2d35] text-zinc-300 hover:bg-[#343842] border border-[#383b44]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Glossary Domain */}
              <fieldset className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5 space-y-3">
                <div>
                  <legend className="text-sm font-semibold text-zinc-200">Engine dịch thuật</legend>
                  <p className="text-xs text-zinc-400">Chọn tốc độ tiêu chuẩn hoặc bản dịch ngữ cảnh cao cấp.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    ['standard', 'Tiêu chuẩn', 'Multi-Engine Fast: Google GTX + Auto-Failover'],
                    ['pro', 'Cao cấp - Gói Pro', 'API AI cao cấp của hệ thống / BYOK'],
                  ] as [TranslationTier, string, string][]).map(([tier, label, description]) => (
                    <label
                      key={tier}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                        userSettings.translationTier === tier
                          ? 'border-sky-500 bg-[#162738] text-white shadow-xs'
                          : 'border-[#383b44] bg-[#252831] hover:border-[#4c515e]'
                      }`}
                    >
                      <span className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="translation-tier"
                          value={tier}
                          checked={userSettings.translationTier === tier}
                          onChange={() => handleUpdateSetting('translationTier', tier)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            userSettings.translationTier === tier
                              ? 'border-sky-400 bg-sky-500'
                              : 'border-zinc-500 bg-[#1e2026]'
                          }`}
                        >
                          {userSettings.translationTier === tier && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <span>
                          <span className="block text-xs font-semibold text-zinc-200">{label}</span>
                          <span className="mt-1 block text-[11px] leading-4 text-zinc-400">{description}</span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <section
                className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5 space-y-3"
                aria-labelledby="translation-usage-title"
                aria-live="polite"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 id="translation-usage-title" className="text-sm font-semibold text-zinc-200">
                      Hạn mức dịch thuật AI
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Theo dõi token Pro/BYOK của riêng cuộc họp này.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadTranslationUsage()}
                    disabled={isTranslationUsageLoading}
                    aria-label="Làm mới hạn mức dịch thuật"
                    className="rounded-lg border border-[#383b44] bg-[#2a2d35] p-2 text-zinc-300 transition hover:bg-[#343842] hover:text-white disabled:cursor-wait disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isTranslationUsageLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {translationUsageError ? (
                  <p role="alert" className="text-xs text-rose-300">{translationUsageError}</p>
                ) : isTranslationUsageLoading && !translationUsage ? (
                  <div className="h-12 animate-pulse rounded-lg bg-[#2a2d35]" aria-label="Đang tải hạn mức" />
                ) : translationUsage && translationUsage.tier !== 'standard' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase text-sky-400">{translationUsage.tier}</span>
                      <span className="tabular-nums text-zinc-300">
                        {translationUsage.total_tokens_used.toLocaleString()} / {translationUsage.quota.toLocaleString()} token
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Mức sử dụng token dịch thuật"
                      aria-valuemin={0}
                      aria-valuemax={translationUsage.quota}
                      aria-valuenow={Math.min(translationUsage.total_tokens_used, translationUsage.quota)}
                      className="h-2 overflow-hidden rounded-full bg-[#2a2d35]"
                    >
                      <div
                        className={`h-full rounded-full transition-all ${translationUsage.is_quota_exceeded ? 'bg-amber-400' : 'bg-sky-500'}`}
                        style={{
                          width: `${translationUsage.quota > 0
                            ? Math.min(100, (translationUsage.total_tokens_used / translationUsage.quota) * 100)
                            : 0}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-zinc-400">
                      Còn lại {translationUsage.remaining_quota.toLocaleString()} token
                    </p>
                    {translationUsage.downgraded && (
                      <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-950/40 px-2.5 py-2 text-xs text-amber-200">
                        Đã chuyển sang engine miễn phí để phụ đề không bị gián đoạn.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">
                    Engine tiêu chuẩn không sử dụng hạn mức token Pro.
                  </p>
                )}
              </section>

              {/* Glossary Domain */}
              <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5 space-y-2.5">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Từ điển thuật ngữ chuyên ngành</p>
                  <p className="text-xs text-zinc-400">Ưu tiên dịch chuẩn các từ viết tắt và thuật ngữ riêng</p>
                </div>
                <select aria-label="Chuyên ngành"
                  value={userSettings.glossaryDomain}
                  onChange={(e) => handleUpdateSetting('glossaryDomain', e.target.value as GlossaryDomain)}
                  className="w-full bg-[#2a2d35] border border-[#383b44] text-zinc-100 text-xs rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                >
                  <option value="general">Tổng quát (Hội thoại đời sống &amp; chung)</option>
                  <option value="it">Công nghệ thông tin (IT / Phần mềm / Cloud / DevOps)</option>
                  <option value="business">Kinh doanh &amp; Tài chính (Fintech / Hợp đồng / Kế toán)</option>
                </select>
              </div>

              <section className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5 space-y-3" aria-labelledby="custom-glossary-title">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 id="custom-glossary-title" className="text-sm font-semibold text-zinc-200">Từ điển thuật ngữ riêng</h3>
                    <p className="text-xs text-zinc-400">Khóa bản dịch chuẩn cho tên sản phẩm, chữ viết tắt và thuật ngữ nội bộ.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSyncGlossary()}
                    disabled={isGlossarySyncing}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 transition disabled:cursor-wait disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isGlossarySyncing ? 'animate-spin' : ''}`} />
                    Đồng bộ
                  </button>
                </div>

                <form onSubmit={handleAddGlossaryTerm} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <label htmlFor="glossary-source-term" className="sr-only">Thuật ngữ gốc</label>
                    <input
                      id="glossary-source-term"
                      value={glossaryTerm}
                      maxLength={200}
                      onChange={(event) => setGlossaryTerm(event.target.value)}
                      placeholder="EBITDA"
                      className="w-full rounded-lg border border-[#383b44] bg-[#14151a] px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="glossary-standard-translation" className="sr-only">Bản dịch chuẩn</label>
                    <input
                      id="glossary-standard-translation"
                      value={glossaryTranslation}
                      maxLength={500}
                      onChange={(event) => setGlossaryTranslation(event.target.value)}
                      placeholder="Lợi nhuận trước thuế và lãi vay"
                      className="w-full rounded-lg border border-[#383b44] bg-[#14151a] px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-sky-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!glossaryTerm.trim() || !glossaryTranslation.trim()}
                    className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-sky-500 bg-[#162738] px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-[#1e344d] transition disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm
                  </button>
                </form>

                <div className="max-h-40 space-y-1.5 overflow-y-auto" aria-label="Danh sách thuật ngữ riêng">
                  {Object.entries(userSettings.customGlossary).map(([term, translation]) => (
                    <div key={term} className="flex items-center gap-2 rounded-lg border border-[#2c2f37] bg-[#14151a] px-2.5 py-2 text-xs">
                      <span className="min-w-0 flex-1 truncate font-medium text-zinc-200">{term}</span>
                      <span aria-hidden="true" className="text-zinc-400">→</span>
                      <span className="min-w-0 flex-[2] truncate text-zinc-400">{translation}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveGlossaryTerm(term)}
                        aria-label={`Xóa thuật ngữ ${term}`}
                        className="rounded-md p-1 text-zinc-400 hover:bg-rose-500/15 hover:text-rose-300 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {Object.keys(userSettings.customGlossary).length === 0 && (
                    <p className="rounded-lg border border-dashed border-[#383b44] px-3 py-4 text-center text-xs text-zinc-400">Chưa có thuật ngữ riêng.</p>
                  )}
                </div>

                {glossaryStatus && (
                  <p role={glossaryStatus.kind === 'error' ? 'alert' : 'status'} className={`text-xs ${glossaryStatus.kind === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {glossaryStatus.message}
                  </p>
                )}
              </section>

              {/* BYOK (Bring Your Own Key) */}
              <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">Tùy chọn API cá nhân (BYOK)</p>
                      <p className="text-xs text-zinc-400">Sử dụng API Key riêng cho các mô hình dịch chuyên sâu</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={userSettings.byokEnabled}
                    aria-label="Bật tùy chọn API cá nhân (BYOK)"
                    onClick={() => handleUpdateSetting('byokEnabled', !userSettings.byokEnabled)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      userSettings.byokEnabled ? 'bg-amber-500' : 'bg-[#2a2d35]'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        userSettings.byokEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] leading-4 text-sky-400">
                  Nếu bạn dùng Gói Pro mà không nhập Key riêng, hệ thống sẽ tự động sử dụng API AI cao cấp của LayaMeet Pro.
                </p>

                {userSettings.byokEnabled && (
                  <div className="space-y-2 pt-2 border-t border-[#2c2f37]">
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ['openai', 'OpenAI', 'GPT-4o'],
                        ['groq', 'Groq', '⚡ ~200ms'],
                        ['deepseek', 'DeepSeek', '💰 Rẻ 10x'],
                        ['qwen', 'Qwen-MT', '🌏 Vi/Ja/Zh'],
                        ['gemini', 'Gemini', 'Flash 2.0'],
                        ['deepl', 'DeepL', 'MT Chuẩn'],
                      ] as [ByokProvider, string, string][]).map(([prov, name, badge]) => (
                        <button
                          key={prov}
                          type="button"
                          onClick={() => handleUpdateSetting('byokProvider', prov)}
                          className={`py-2 px-2 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                            userSettings.byokProvider === prov
                              ? 'bg-amber-600 text-white font-semibold border border-amber-500 shadow-xs'
                              : 'bg-[#2a2d35] text-zinc-300 hover:bg-[#343842] border border-[#383b44]'
                          }`}
                        >
                          <div className="font-semibold">{name}</div>
                          <div className="text-[10px] text-amber-300 mt-0.5">{badge}</div>
                        </button>
                      ))}
                    </div>
                    <input
                      type="password"
                      placeholder="Nhập API Key cá nhân của bạn..."
                      value={userSettings.byokApiKey}
                      onChange={(e) => handleUpdateSetting('byokApiKey', e.target.value)}
                      className="w-full bg-[#14151a] border border-[#383b44] text-zinc-100 text-xs rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <p className="text-[11px] text-zinc-400">
                      * Key được bảo mật trên bộ nhớ trình duyệt client của bạn, không lưu trữ trên máy chủ công khai.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5 space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-300">Camera thiết bị</label>
              <select aria-label="Camera thiết bị"
                value={selectedVideoId}
                onChange={(e) => handleVideoChange(e.target.value)}
                className="w-full bg-[#2a2d35] border border-[#383b44] text-zinc-100 text-xs rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500 font-medium"
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

          {activeTab === 'sidecar' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-[#2c2f37] bg-[#1f2127] px-3.5 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Phụ đề luôn bật</p>
                  <p className="text-xs text-zinc-400">Tính năng cốt lõi của cuộc họp</p>
                </div>
                <span className="rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">Bật</span>
              </div>
              {([
                ['showOriginal', 'Hiện câu gốc', 'Hiển thị thêm nội dung trước khi dịch'],
                ['showActions', 'Việc làm & quyết định', 'Mở tab phân tích của Laya'],
                ['showRecap', 'Tóm tắt AI', 'Mở tab tổng hợp cuộc họp'],
                ['showChat', 'Tin nhắn', 'Mở tab chat trong sidecar'],
                ['fileSharing', 'Chia sẻ tệp & tài liệu', 'Cho phép đính kèm tệp và dịch nhanh trong chat'],
                ['meetingRecording', 'Ghi hình cuộc họp', 'Cho phép ghi lại video và phụ đề để xuất sau cuộc họp'],
                ['e2eeEnabled', 'Mã hóa đầu cuối (E2EE)', 'Bảo vệ âm thanh & hình ảnh bằng khóa mã hóa riêng tư giữa các đầu cuối'],
                ['floatingSubtitleWidget', 'Cửa sổ phụ đề nổi (PiP)', 'Cho phép mở phụ đề nổi để xem khi dùng Google Meet hoặc Zoom'],
                ['audioBooth', 'Audio Booth', 'Đọc bản dịch bằng giọng máy'],
              ] as Array<[keyof SidecarPreferences, string, string]>).map(([key, label, description]) => (
                <label key={key} className="flex min-h-[52px] cursor-pointer items-center justify-between rounded-xl border border-[#2c2f37] bg-[#1f2127] px-3.5 py-3 hover:bg-[#252831] transition">
                  <span className="pr-4">
                    <span className="block text-sm font-semibold text-zinc-200">{label}</span>
                    <span className="block text-xs text-zinc-400">{description}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={sidecarPreferences[key]}
                    onChange={(event) => onSidecarPreferencesChange({
                      ...sidecarPreferences,
                      [key]: event.target.checked,
                    })}
                    className="sr-only"
                  />
                  <div
                    aria-hidden="true"
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      sidecarPreferences[key] ? 'bg-sky-700' : 'bg-[#2a2d35]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                        sidecarPreferences[key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </label>
              ))}
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-zinc-200 min-w-0 truncate">Kỹ năng Tóm tắt Doanh nghiệp</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      title="Sao chép JSON các kỹ năng của công ty"
                      className="rounded-lg border border-[#383b44] bg-[#2a2d35] p-1.5 text-xs text-zinc-300 hover:text-white hover:bg-[#343842] transition"
                    >
                      {copyFeedback ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Download className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowJsonImport((v) => !v)}
                      title="Nhập kỹ năng từ JSON"
                      className="rounded-lg border border-[#383b44] bg-[#2a2d35] p-1.5 text-xs text-zinc-300 hover:text-white hover:bg-[#343842] transition"
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingSkill((v) => !v)}
                      className="inline-flex items-center gap-1 rounded-lg bg-sky-700 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 transition whitespace-nowrap shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" /> Thêm kỹ năng
                    </button>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Bổ sung các kỹ năng tóm tắt riêng cho từng phòng ban. Chuẩn tóm tắt điều hành thông minh nhất luôn chạy ngầm làm mặc định mà không cần cấu hình.
                </p>
              </div>

              {showJsonImport && (
                <form onSubmit={handleImportJson} className="rounded-xl border border-sky-500/40 bg-[#172332] p-3.5 space-y-2.5">
                  <label className="block text-xs font-semibold text-sky-300">Dán mã JSON kỹ năng công ty:</label>
                  <textarea
                    rows={4}
                    value={jsonImportText}
                    onChange={(e) => setJsonImportText(e.target.value)}
                    placeholder='[{"name": "Scrum Daily", "targetDepartment": "Kỹ thuật", ...}]'
                    className="w-full rounded-lg border border-[#383b44] bg-[#14151a] p-2.5 text-xs font-mono text-zinc-200 outline-none focus:border-sky-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowJsonImport(false)}
                      className="rounded-lg border border-[#383b44] bg-[#2a2d35] px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-[#343842]"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-sky-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-800"
                    >
                      Xác nhận nhập
                    </button>
                  </div>
                </form>
              )}

              {isAddingSkill && (
                <form onSubmit={handleCreateCustomSkill} className="rounded-xl border border-[#2c2f37] bg-[#1a1c22] p-3.5 space-y-3">
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Tạo Kỹ Năng Tóm Tắt Mới</h4>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Tên kỹ năng *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Daily Standup, Review Hợp Đồng, Báo Cáo Sprint"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      className="w-full rounded-lg border border-[#383b44] bg-[#14151a] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Phòng ban / Nhóm</label>
                      <input
                        type="text"
                        placeholder="VD: Kỹ Thuật, Kinh Doanh, Ban Giám Đốc"
                        value={newSkillDepartment}
                        onChange={(e) => setNewSkillDepartment(e.target.value)}
                        className="w-full rounded-lg border border-[#383b44] bg-[#14151a] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Từ khóa nghiệp vụ riêng (phẩy)</label>
                      <input
                        type="text"
                        placeholder="VD: sprint, blocker, pr, release, bug"
                        value={newSkillKeywords}
                        onChange={(e) => setNewSkillKeywords(e.target.value)}
                        className="w-full rounded-lg border border-[#383b44] bg-[#14151a] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Mô tả mục tiêu</label>
                    <input
                      type="text"
                      placeholder="VD: Tập trung trích xuất blocker và phân công cho dev"
                      value={newSkillDescription}
                      onChange={(e) => setNewSkillDescription(e.target.value)}
                      className="w-full rounded-lg border border-[#383b44] bg-[#14151a] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingSkill(false)}
                      className="rounded-lg border border-[#383b44] bg-[#2a2d35] px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-[#343842]"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-sky-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-800"
                    >
                      Lưu kỹ năng
                    </button>
                  </div>
                </form>
              )}

              {/* Custom Skills List (Skill chuẩn ngầm định KHÔNG hiển thị ở đây) */}
              <div className="space-y-2">
                {customSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between rounded-xl border border-[#2c2f37] bg-[#1f2127] p-3 hover:border-[#383b44] transition"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-zinc-200 truncate">{skill.name}</span>
                        {skill.targetDepartment && (
                          <span className="rounded-full bg-sky-950/60 border border-sky-500/40 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                            {skill.targetDepartment}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1">{skill.description}</p>
                      {skill.customKeywords && skill.customKeywords.length > 0 && (
                        <p className="mt-1 text-[11px] text-zinc-400 truncate">
                          Từ khóa: {skill.customKeywords.join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSkill(skill.id)}
                      title="Xóa kỹ năng này"
                      className="rounded-lg p-2 text-zinc-400 hover:bg-rose-500/15 hover:text-rose-300 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {customSkills.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[#383b44] p-6 text-center space-y-2">
                    <p className="text-xs font-semibold text-zinc-300">
                      Chưa có kỹ năng tùy biến nào cho công ty
                    </p>
                    <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                      Hệ thống đang tự động sử dụng chuẩn tóm tắt điều hành (Executive MoM) thông minh nhất làm mặc định ngầm. Bạn có thể bấm <span className="text-sky-400 font-medium">+ Thêm kỹ năng</span> để cấu hình tiêu chí riêng.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </AdaptiveDialog>
  );
};
