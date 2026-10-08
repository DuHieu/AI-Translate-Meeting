import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  Lock,
  Globe,
  Users,
  MessageSquare,
  Mic,
  Video,
  Monitor,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface HostControlsPanelProps {
  onClose: () => void;
  isHost: boolean;
  onOpenAdmission?: () => void;
  meetingCode: string;
}

export const HostControlsPanel: React.FC<HostControlsPanelProps> = ({
  onClose,
  isHost,
  onOpenAdmission,
  meetingCode: _meetingCode,
}) => {
  const [accessMode, setAccessMode] = useState<'open' | 'trusted' | 'restricted'>('trusted');
  const [allowShareScreen, setAllowShareScreen] = useState(true);
  const [allowSendChat, setAllowSendChat] = useState(true);
  const [allowTurnOnMic, setAllowTurnOnMic] = useState(true);
  const [allowTurnOnVideo, setAllowTurnOnVideo] = useState(true);
  const [allowActivities, setAllowActivities] = useState(true);
  const [allowThirdPartyAudio, setAllowThirdPartyAudio] = useState(false);

  return (
    <aside
      role="complementary"
      aria-label="Bộ điều khiển của người tổ chức"
      className="meeting-panel-content h-full min-h-0 w-full bg-[#18191a] text-zinc-100 md:border-l border-zinc-800 flex flex-col z-30 shrink-0 select-none overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-medium text-zinc-100">Bộ điều khiển của người tổ chức</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng điều khiển"
          className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 text-sm text-zinc-300">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Sử dụng các chế độ cài đặt dành cho người tổ chức này để kiểm soát cuộc họp của bạn. Chỉ người tổ chức có quyền truy cập các công cụ điều khiển này.
        </p>

        {/* Admission Waiting List Quick Link */}
        {onOpenAdmission && (
          <button
            type="button"
            onClick={onOpenAdmission}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 hover:bg-sky-900/40 text-sky-200 transition cursor-pointer text-xs"
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-sky-400" />
              <div className="text-left">
                <p className="font-semibold text-sky-100">Phòng chờ &amp; Duyệt người tham gia</p>
                <p className="text-[11px] text-sky-300/80">Quản lý các yêu cầu xin vào cuộc họp</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-sky-400" />
          </button>
        )}

        {/* Access Mode Section */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Quyền truy cập cuộc họp
          </p>

          <div className="space-y-2">
            {/* Open */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                accessMode === 'open'
                  ? 'bg-zinc-800/80 border-sky-500/60 text-white'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <input
                type="radio"
                name="accessMode"
                value="open"
                checked={accessMode === 'open'}
                onChange={() => setAccessMode('open')}
                className="mt-1 accent-sky-400 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-medium text-xs text-zinc-200">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mở</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Không ai cần phải xin tham gia. Mọi người có đường liên kết đều có thể vào phòng ngay.
                </p>
              </div>
            </label>

            {/* Trusted */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                accessMode === 'trusted'
                  ? 'bg-zinc-800/80 border-sky-500/60 text-white'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <input
                type="radio"
                name="accessMode"
                value="trusted"
                checked={accessMode === 'trusted'}
                onChange={() => setAccessMode('trusted')}
                className="mt-1 accent-sky-400 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-medium text-xs text-zinc-200">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  <span>Đáng tin cậy (Mặc định)</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Người được mời vào thẳng. Bất kỳ ai có đường liên kết đều có thể yêu cầu tham gia và cần được bạn phê duyệt.
                </p>
              </div>
            </label>

            {/* Restricted */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                accessMode === 'restricted'
                  ? 'bg-zinc-800/80 border-sky-500/60 text-white'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <input
                type="radio"
                name="accessMode"
                value="restricted"
                checked={accessMode === 'restricted'}
                onChange={() => setAccessMode('restricted')}
                className="mt-1 accent-sky-400 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-medium text-xs text-zinc-200">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hạn chế</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Chỉ những người được người tổ chức thêm trực tiếp mới có thể tham gia.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Meeting Activities & Permissions */}
        <div className="space-y-3 pt-2 border-t border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Hoạt động trong cuộc họp
          </p>
          <p className="text-[11px] text-zinc-400">
            Cho phép mọi người:
          </p>

          <div className="space-y-3">
            {/* Screen Share */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5 text-xs text-zinc-200">
                <Monitor className="w-4 h-4 text-zinc-400" />
                <span>Chia sẻ màn hình</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowShareScreen}
                aria-label="Cho phép chia sẻ màn hình"
                disabled={!isHost}
                onClick={() => setAllowShareScreen((v) => !v)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  allowShareScreen ? 'bg-sky-700' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    allowShareScreen ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5 text-xs text-zinc-200">
                <MessageSquare className="w-4 h-4 text-zinc-400" />
                <span>Gửi tin nhắn trò chuyện</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowSendChat}
                aria-label="Cho phép gửi tin nhắn trò chuyện"
                disabled={!isHost}
                onClick={() => setAllowSendChat((v) => !v)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  allowSendChat ? 'bg-sky-700' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    allowSendChat ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Mic */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5 text-xs text-zinc-200">
                <Mic className="w-4 h-4 text-zinc-400" />
                <span>Bật micrô</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowTurnOnMic}
                aria-label="Cho phép bật micrô"
                disabled={!isHost}
                onClick={() => setAllowTurnOnMic((v) => !v)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  allowTurnOnMic ? 'bg-sky-700' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    allowTurnOnMic ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Video */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5 text-xs text-zinc-200">
                <Video className="w-4 h-4 text-zinc-400" />
                <span>Bật video</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowTurnOnVideo}
                aria-label="Cho phép bật video"
                disabled={!isHost}
                onClick={() => setAllowTurnOnVideo((v) => !v)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  allowTurnOnVideo ? 'bg-sky-700' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    allowTurnOnVideo ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Collaborators activities */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5 text-xs text-zinc-200">
                <Sparkles className="w-4 h-4 text-zinc-400" />
                <div>
                  <p>Cho phép cộng tác viên chia sẻ các hoạt động bổ sung</p>
                  <p className="text-[10px] text-zinc-400">Khi tắt chế độ này, bạn chỉ có thể chia sẻ với người khác các hoạt động do người tổ chức bắt đầu</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowActivities}
                aria-label="Cho phép cộng tác viên chia sẻ hoạt động"
                disabled={!isHost}
                onClick={() => setAllowActivities((v) => !v)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ml-3 ${
                  allowActivities ? 'bg-sky-700' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    allowActivities ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Third party audio capture */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5 text-xs text-zinc-200">
                <Shield className="w-4 h-4 text-zinc-400" />
                <div>
                  <p>Cho phép ứng dụng bên thứ ba thu thập âm thanh và video</p>
                  <p className="text-[10px] text-zinc-400">Khi chế độ này tắt, các ứng dụng bên thứ ba không thể truy cập âm thanh và video</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowThirdPartyAudio}
                aria-label="Cho phép ứng dụng bên thứ ba thu thập âm thanh và video"
                disabled={!isHost}
                onClick={() => setAllowThirdPartyAudio((v) => !v)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ml-3 ${
                  allowThirdPartyAudio ? 'bg-sky-700' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    allowThirdPartyAudio ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
