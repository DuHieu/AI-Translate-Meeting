import React, { useEffect, useState } from 'react';
import { X, Mic, Video, Settings as SettingsIcon, Sparkles, BookOpen, Plus, Trash2, Download, Upload, Check } from 'lucide-react';
import { useRoomContext } from '@livekit/components-react';
import { SidecarPreferences } from '../../types/meeting';
import {
  getCustomSkills,
  saveCustomSkill,
  deleteCustomSkill,
  importCustomSkillsFromJson,
  exportCustomSkillsToJson,
  MeetingRecapSkill,
} from '../../utils/recapSkillManager';

interface MeetingSettingsDialogProps {
  onClose: () => void;
  sidecarPreferences: SidecarPreferences;
  onSidecarPreferencesChange: (preferences: SidecarPreferences) => void;
}

export const MeetingSettingsDialog: React.FC<MeetingSettingsDialogProps> = ({
  onClose,
  sidecarPreferences,
  onSidecarPreferencesChange,
}) => {
  const room = useRoomContext();
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'sidecar' | 'skills'>('audio');

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-lg">
            <SettingsIcon className="w-5 h-5 text-sky-400" />
            <span>Settings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cài đặt"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 gap-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`pb-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audio' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400'
            }`}
          >
            <Mic className="w-4 h-4" /> Audio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`pb-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'video' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400'
            }`}
          >
            <Video className="w-4 h-4" /> Video
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sidecar')}
            className={`pb-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sidecar' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Tiện ích
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            className={`pb-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'skills' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Kỹ năng AI
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
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

          {activeTab === 'sidecar' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">Phụ đề luôn bật</p>
                  <p className="text-xs text-slate-500">Tính năng cốt lõi của cuộc họp</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-400">Bật</span>
              </div>
              {([
                ['showOriginal', 'Hiện câu gốc', 'Hiển thị thêm nội dung trước khi dịch'],
                ['showActions', 'Việc làm & quyết định', 'Mở tab phân tích của Laya'],
                ['showRecap', 'Tóm tắt AI', 'Mở tab tổng hợp cuộc họp'],
                ['showChat', 'Tin nhắn', 'Mở tab chat trong sidecar'],
                ['audioBooth', 'Audio Booth', 'Đọc bản dịch bằng giọng máy'],
              ] as Array<[keyof SidecarPreferences, string, string]>).map(([key, label, description]) => (
                <label key={key} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-800 px-3 py-3 hover:bg-slate-800/40">
                  <span>
                    <span className="block text-sm text-slate-200">{label}</span>
                    <span className="block text-xs text-slate-500">{description}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={sidecarPreferences[key]}
                    onChange={(event) => onSidecarPreferencesChange({
                      ...sidecarPreferences,
                      [key]: event.target.checked,
                    })}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                  />
                </label>
              ))}
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-slate-200">Kỹ năng Tóm tắt Doanh nghiệp</h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      title="Sao chép JSON các kỹ năng của công ty"
                      className="rounded-lg border border-slate-700 p-1.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                    >
                      {copyFeedback ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Download className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowJsonImport((v) => !v)}
                      title="Nhập kỹ năng từ JSON"
                      className="rounded-lg border border-slate-700 p-1.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingSkill((v) => !v)}
                      className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-500 transition"
                    >
                      <Plus className="h-3.5 w-3.5" /> Thêm kỹ năng
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Bổ sung các kỹ năng tóm tắt riêng cho từng phòng ban. Chuẩn tóm tắt điều hành thông minh nhất luôn chạy ngầm làm mặc định mà không cần cấu hình.
                </p>
              </div>

              {showJsonImport && (
                <form onSubmit={handleImportJson} className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-3.5 space-y-2.5">
                  <label className="block text-xs font-medium text-sky-300">Dán mã JSON kỹ năng công ty:</label>
                  <textarea
                    rows={4}
                    value={jsonImportText}
                    onChange={(e) => setJsonImportText(e.target.value)}
                    placeholder='[{"name": "Scrum Daily", "targetDepartment": "Kỹ thuật", ...}]'
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs font-mono text-slate-200 outline-none focus:border-sky-400"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowJsonImport(false)}
                      className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
                    >
                      Xác nhận nhập
                    </button>
                  </div>
                </form>
              )}

              {isAddingSkill && (
                <form onSubmit={handleCreateCustomSkill} className="rounded-2xl border border-slate-700 bg-slate-800/80 p-3.5 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Tạo Kỹ Năng Tóm Tắt Mới</h4>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tên kỹ năng *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Daily Standup, Review Hợp Đồng, Báo Cáo Sprint"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Phòng ban / Nhóm</label>
                      <input
                        type="text"
                        placeholder="VD: Kỹ Thuật, Kinh Doanh, Ban Giám Đốc"
                        value={newSkillDepartment}
                        onChange={(e) => setNewSkillDepartment(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Từ khóa nghiệp vụ riêng (phẩy)</label>
                      <input
                        type="text"
                        placeholder="VD: sprint, blocker, pr, release, bug"
                        value={newSkillKeywords}
                        onChange={(e) => setNewSkillKeywords(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Mô tả mục tiêu</label>
                    <input
                      type="text"
                      placeholder="VD: Tập trung trích xuất blocker và phân công cho dev"
                      value={newSkillDescription}
                      onChange={(e) => setNewSkillDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingSkill(false)}
                      className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
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
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-850 p-3 hover:border-slate-700 transition"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-slate-200 truncate">{skill.name}</span>
                        {skill.targetDepartment && (
                          <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                            {skill.targetDepartment}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{skill.description}</p>
                      {skill.customKeywords && skill.customKeywords.length > 0 && (
                        <p className="mt-1 text-[11px] text-slate-500 truncate">
                          Từ khóa: {skill.customKeywords.join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSkill(skill.id)}
                      title="Xóa kỹ năng này"
                      className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {customSkills.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center space-y-2">
                    <p className="text-xs font-medium text-slate-300">
                      Chưa có kỹ năng tùy biến nào cho công ty
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
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
  );
};
