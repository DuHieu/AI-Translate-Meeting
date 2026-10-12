import { copyText } from '../../utils/clipboard';
import React, { useState } from 'react';
import { Participant } from 'livekit-client';
import {
  X,
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  BellRing,
  UserPlus,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Link2,
  Search,
  Hand,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import {
  AdmissionRequest,
  getLanguageOption,
  SpeakerDynamicsStats,
  SupportedLanguage,
} from '../../types/meeting';
import { CountryFlag } from '../common/CountryFlag';

interface ParticipantsPanelProps {
  participants: Participant[];
  raisedHands: Map<string, number>;
  onClose: () => void;
  participantLanguages?: Record<string, SupportedLanguage | string>;
  isHost?: boolean;
  meetingCode?: string;
  hostToken?: string;
  pendingAdmissions?: AdmissionRequest[];
  onDecideAdmission?: (admissionId: string, decision: 'approved' | 'rejected') => Promise<void> | void;
  onApproveAllAdmissions?: () => Promise<void> | void;
  onMuteAll?: () => void;
  speakerDynamics?: SpeakerDynamicsStats;
}

const ParticipantRow: React.FC<{
  participant: Participant;
  isHandRaised: boolean;
  spokenLanguage?: SupportedLanguage | string;
}> = ({
  participant,
  isHandRaised,
  spokenLanguage,
}) => {
  const name = participant.name || participant.identity;
  const isAudioMuted = !participant.isMicrophoneEnabled;
  const isVideoMuted = !participant.isCameraEnabled;
  const langOption = spokenLanguage ? getLanguageOption(spokenLanguage) : null;

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#181b26] border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs shrink-0">
          {name.charAt(0).toUpperCase()}
          {langOption && (
            <span
              title={`Ngôn ngữ nói: ${langOption.nativeName}`}
              className="absolute -bottom-1 -right-1 leading-none shadow-xs"
            >
              <CountryFlag code={langOption.code} size="xs" />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-zinc-100 flex items-center gap-1.5">
            <span className="truncate max-w-[155px] sm:max-w-[190px]">{name}</span>
            {isHandRaised && (
              <span role="img" aria-label="Đã giơ tay" title="Đã giơ tay" className="inline-flex items-center text-amber-400">
                <Hand className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            )}
            {participant.isLocal && (
              <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[9px] font-semibold rounded shrink-0">
                Bạn
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-zinc-400 shrink-0">
        {isAudioMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
        {isVideoMuted ? <VideoOff className="w-4 h-4 text-red-400" /> : <Video className="w-4 h-4 text-emerald-400" />}
      </div>
    </div>
  );
};

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  participants,
  raisedHands,
  onClose,
  participantLanguages,
  isHost = false,
  meetingCode,
  hostToken,
  pendingAdmissions: externalPendingAdmissions,
  onDecideAdmission,
  onApproveAllAdmissions,
  onMuteAll,
  speakerDynamics,
}) => {
  const [internalPendingAdmissions, setInternalPendingAdmissions] = useState<AdmissionRequest[]>([]);
  const [isWaitingGroupOpen, setIsWaitingGroupOpen] = useState(true);
  const [isInCallGroupOpen, setIsInCallGroupOpen] = useState(true);
  const [isDynamicsOpen, setIsDynamicsOpen] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [muteAllFeedback, setMuteAllFeedback] = useState(false);

  const pendingAdmissions = externalPendingAdmissions ?? internalPendingAdmissions;

  React.useEffect(() => {
    if (externalPendingAdmissions !== undefined) return;
    if (!isHost || !hostToken || !meetingCode) return;

    let isMounted = true;
    const fetchAdmissions = async () => {
      try {
        const { meetingApi } = await import('../../api/meetingApi');
        const list = await meetingApi.getAdmissions(meetingCode, hostToken);
        if (isMounted) {
          setInternalPendingAdmissions(list.filter((req) => req.status === 'pending'));
        }
      } catch {
        // ignore polling error
      }
    };

    fetchAdmissions();
    const interval = setInterval(fetchAdmissions, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [externalPendingAdmissions, isHost, hostToken, meetingCode]);

  const handleDecide = async (admissionId: string, decision: 'approved' | 'rejected') => {
    if (onDecideAdmission) {
      await onDecideAdmission(admissionId, decision);
      return;
    }
    if (!meetingCode || !hostToken) return;
    try {
      const { meetingApi } = await import('../../api/meetingApi');
      await meetingApi.decideAdmission(meetingCode, admissionId, hostToken, decision);
      setInternalPendingAdmissions((prev) => prev.filter((req) => req.admissionId !== admissionId));
    } catch (e) {
      console.error('Failed to decide admission', e);
    }
  };

  const handleApproveAll = async () => {
    if (onApproveAllAdmissions) {
      await onApproveAllAdmissions();
      return;
    }
    for (const req of pendingAdmissions) {
      await handleDecide(req.admissionId, 'approved');
    }
  };

  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const handleCopyInviteLink = async () => {
    if (!meetingCode) return;
    const inviteUrl = `${window.location.origin}/meeting/${meetingCode.toUpperCase()}`;
    const copied = await copyText(inviteUrl);
    setCopiedLink(copied);
    setCopyNotice(copied ? null : 'Không thể sao chép tự động. Nhấn giữ đường dẫn bên dưới để sao chép hoặc gửi qua ứng dụng khác.');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyRoomCode = async () => {
    if (!meetingCode) return;
    const copied = await copyText(meetingCode.toUpperCase());
    setCopiedCode(copied);
    setCopyNotice(copied ? null : 'Không thể sao chép tự động. Nhấn giữ mã phòng để sao chép.');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const sortedParticipants = [...participants].sort((left, right) => {
    const leftRaisedAt = raisedHands.get(left.identity);
    const rightRaisedAt = raisedHands.get(right.identity);
    if (leftRaisedAt !== undefined && rightRaisedAt !== undefined) {
      return leftRaisedAt - rightRaisedAt;
    }
    if (leftRaisedAt !== undefined) return -1;
    if (rightRaisedAt !== undefined) return 1;
    return 0;
  });

  return (
    <aside className="meeting-panel-content h-full min-h-0 w-full bg-[#13151f] md:border-l border-white/10 p-4 flex flex-col z-30 shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
        <div className="flex items-center gap-2 font-semibold text-zinc-100 text-sm">
          <Users className="w-4 h-4 text-blue-400" />
          <span>Mọi người</span>
          {pendingAdmissions.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 animate-pulse">
              <BellRing className="w-3 h-3" />
              <span>{pendingAdmissions.length} chờ duyệt</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-[#1b1e2b] hover:bg-[#25293a] text-zinc-400 hover:text-zinc-100 border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Đóng danh sách"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Google Meet / Zoom Style Quick Invite Card (No Token Required) */}
      {meetingCode && (
        <div className="mb-3 p-2.5 rounded-2xl bg-[#181b26] border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">Đã sao chép liên kết mời!</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Sao chép liên kết mời</span>
                </>
              )}
            </button>
          </div>
          <label htmlFor="meeting-invite-link" className="sr-only">Đường dẫn mời</label>
          <input id="meeting-invite-link" readOnly value={`${window.location.origin}/meeting/${meetingCode.toUpperCase()}`} className="w-full rounded-lg border border-white/10 bg-[#12141d] px-2.5 py-1 text-[11px] font-mono text-zinc-300 outline-none" onFocus={event => event.currentTarget.select()} />
          {copyNotice && <p role="status" className="text-xs text-amber-200">{copyNotice}</p>}
          <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5 truncate">
              <Link2 className="w-3 h-3 text-zinc-500 shrink-0" />
              <span>Mã phòng:</span>
              <strong className="font-mono text-zinc-200 tracking-wider">{meetingCode.toUpperCase()}</strong>
            </span>
            <button
              type="button"
              onClick={handleCopyRoomCode}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:text-sky-300 transition cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Đã chép mã</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Sao chép mã</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Search Filter Box (Google Meet / Zoom standard) */}
      <div className="relative mb-2.5">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm người tham gia..."
          className="w-full bg-[#18191e] border border-[#2c2e38] text-xs text-zinc-200 placeholder-zinc-500 rounded-xl pl-8 pr-3 py-2 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition shadow-2xs"
        />
      </div>

      {/* Host Mute All Button (Google Meet & Zoom signature action) */}
      {isHost && onMuteAll && (
        <button
          type="button"
          onClick={() => {
            onMuteAll();
            setMuteAllFeedback(true);
            setTimeout(() => setMuteAllFeedback(false), 2000);
          }}
          className={`w-full mb-2.5 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
            muteAllFeedback
              ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
              : 'bg-red-600/15 hover:bg-red-600/25 border-red-500/30 text-red-300 hover:text-red-200'
          }`}
          title="Tắt tiếng microphone của tất cả người tham gia trong phòng"
        >
          <MicOff className="w-3.5 h-3.5" />
          <span>{muteAllFeedback ? 'Đã gửi yêu cầu tắt tiếng tất cả!' : 'Tắt tiếng tất cả'}</span>
        </button>
      )}

      {/* Scrollable Container with Separate Groups */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* ── GROUP 1: ĐANG CHỜ DUYỆT (Waiting Room Group) ─────────────── */}
        {isHost && pendingAdmissions.length > 0 && (
          <div
            data-testid="waiting-room-group"
            className="rounded-2xl bg-amber-500/[0.07] border border-amber-500/35 overflow-hidden"
          >
            {/* Group Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
              <button
                type="button"
                onClick={() => setIsWaitingGroupOpen((v) => !v)}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span>Đang chờ duyệt ({pendingAdmissions.length})</span>
                {isWaitingGroupOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-amber-300/80" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-amber-300/80" />
                )}
              </button>

              {pendingAdmissions.length > 1 && (
                <button
                  type="button"
                  onClick={handleApproveAll}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition cursor-pointer"
                >
                  Chấp nhận tất cả
                </button>
              )}
            </div>

            {/* Group Body */}
            {isWaitingGroupOpen && (
              <div className="p-2.5 space-y-2 max-h-52 overflow-y-auto">
                {pendingAdmissions.map((req) => (
                  <div
                    key={req.admissionId}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#1b1c22] border border-amber-500/25 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                        {(req.displayName || '?').charAt(0).toUpperCase()}
                        <span className="absolute -bottom-1 -right-1 leading-none">
                          <CountryFlag code={req.spokenLanguage || 'vi'} size="xs" />
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate max-w-[115px]">
                          {req.displayName}
                        </p>
                        <p className="text-[10px] text-amber-300/80">Muốn tham gia phòng</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDecide(req.admissionId, 'rejected')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-600/50 text-[11px] font-medium transition cursor-pointer"
                        title="Từ chối"
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecide(req.admissionId, 'approved')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition cursor-pointer shadow-xs"
                      >
                        Chấp nhận
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── GROUP 2: TRONG CUỘC HỌP (Active Participants Group) ─────── */}
        <div
          data-testid="in-meeting-group"
          className="rounded-2xl bg-[#151619] border border-[#2a2a2e] overflow-hidden"
        >
          {/* Group Header */}
          <button
            type="button"
            onClick={() => setIsInCallGroupOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#191a1f] border-b border-[#26272b] text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Trong cuộc họp ({participants.length})</span>
            </span>
            {isInCallGroupOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>

          {/* Group Body */}
          {isInCallGroupOpen && (
            <div className="p-2.5 space-y-2">
              {(() => {
                const filtered = sortedParticipants.filter((p) => {
                  if (!searchQuery.trim()) return true;
                  const name = (p.name || p.identity).toLowerCase();
                  return name.includes(searchQuery.toLowerCase().trim());
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-6 text-center text-xs text-zinc-500 italic">
                      Không tìm thấy người tham gia phù hợp
                    </div>
                  );
                }

                return filtered.map((p) => (
                  <ParticipantRow
                    key={p.sid || p.identity}
                    participant={p}
                    isHandRaised={raisedHands.has(p.identity)}
                    spokenLanguage={
                      participantLanguages?.[p.identity] ||
                      participantLanguages?.[p.sid] ||
                      (p.name ? participantLanguages?.[p.name] : undefined)
                    }
                  />
                ));
              })()}
            </div>
          )}
        </div>

        {/* ── GROUP 3: PHÂN BỔ THỜI GIAN PHÁT BIỂU (Speaker Dynamics) ─────── */}
        {speakerDynamics && speakerDynamics.speakers.length > 0 && (
          <div
            data-testid="speaker-dynamics-group"
            className="rounded-2xl bg-[#151619] border border-[#2a2a2e] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setIsDynamicsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#191a1f] border-b border-[#26272b] text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                <span>Phân bổ phát biểu ({speakerDynamics.speakers.length})</span>
              </span>
              {isDynamicsOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </button>

            {isDynamicsOpen && (
              <div className="p-3 space-y-3">
                {/* Monologue Warning */}
                {speakerDynamics.monologueWarning && (
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] leading-snug">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>{speakerDynamics.monologueWarning}</span>
                  </div>
                )}

                {/* Stacked Progress Bar */}
                <div
                  role="img"
                  aria-label="Biểu đồ phân bổ thời lượng phát biểu"
                  className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden flex"
                >
                  {speakerDynamics.speakers.map((s, idx) => {
                    const colors = [
                      'bg-sky-500',
                      'bg-indigo-500',
                      'bg-emerald-500',
                      'bg-amber-500',
                      'bg-rose-500',
                      'bg-purple-500',
                    ];
                    const color = colors[idx % colors.length];
                    return (
                      <div
                        key={s.participantName}
                        style={{ width: `${s.percentage}%` }}
                        title={`${s.participantName}: ${s.percentage}%`}
                        className={`h-full ${color} border-r border-zinc-900 last:border-r-0`}
                      />
                    );
                  })}
                </div>

                {/* Speaker Breakdown List */}
                <div className="space-y-2">
                  {speakerDynamics.speakers.map((s, idx) => {
                    const colors = [
                      'text-sky-400',
                      'text-indigo-400',
                      'text-emerald-400',
                      'text-amber-400',
                      'text-rose-400',
                      'text-purple-400',
                    ];
                    const barColors = [
                      'bg-sky-500',
                      'bg-indigo-500',
                      'bg-emerald-500',
                      'bg-amber-500',
                      'bg-rose-500',
                      'bg-purple-500',
                    ];
                    const color = colors[idx % colors.length];
                    const barColor = barColors[idx % barColors.length];

                    return (
                      <div key={s.participantName} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`font-medium truncate max-w-[170px] ${color}`}>
                            {s.participantName}
                          </span>
                          <span className="text-zinc-400 font-mono text-[10px]">
                            {s.percentage}% ({s.turnCount} lượt)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${s.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

