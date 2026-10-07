import { copyText } from '../../utils/clipboard';
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Copy, Check, Info, UserCheck, UserX } from 'lucide-react';
import { meetingApi } from '../../api/meetingApi';
import { AdmissionRequest, InviteResponse } from '../../types/meeting';
import { MeetingLinkPreviewCard } from './MeetingLinkPreviewCard';
import { CountryFlag } from '../common/CountryFlag';

interface MeetingDetailsDialogProps {
  meetingCode: string;
  role: 'host' | 'participant';
  hostToken?: string;
  onClose: () => void;
}

export const MeetingDetailsDialog: React.FC<MeetingDetailsDialogProps> = ({
  meetingCode,
  role,
  hostToken,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [invite, setInvite] = useState<InviteResponse | null>(null);
  const [admissions, setAdmissions] = useState<AdmissionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/meeting/${meetingCode}`
    : `https://layameet.com/meeting/${meetingCode}`;

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const loadAdmissions = useCallback(async () => {
    if (role !== 'host' || !hostToken) return;
    try {
      setAdmissions(await meetingApi.getAdmissions(meetingCode, hostToken));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách chờ.');
    }
  }, [meetingCode, role, hostToken]);

  useEffect(() => {
    void loadAdmissions();
    const timer = window.setInterval(() => void loadAdmissions(), 4000);
    return () => window.clearInterval(timer);
  }, [loadAdmissions]);

  const handleCopy = async () => {
    if (!(await copyText(inviteUrl))) { setError(`Không thể sao chép tự động. Đường dẫn: ${inviteUrl}`); return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateInvite = async () => {
    if (!hostToken) return;
    setLoading(true);
    setError(null);
    try {
      setInvite(await meetingApi.createInvite(meetingCode, hostToken));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tạo invite.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!invite) return;
    if (!(await copyText(invite.token))) { setError('Không thể sao chép tự động. Hãy chọn invite hiển thị để sao chép.'); return; }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDecision = async (admissionId: string, decision: 'approved' | 'rejected') => {
    if (!hostToken) return;
    setError(null);
    try {
      await meetingApi.decideAdmission(meetingCode, admissionId, hostToken, decision);
      await loadAdmissions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật yêu cầu.');
    }
  };

  return (
    <AdaptiveDialog label="Thông tin cuộc họp và lời mời" onClose={onClose} className="meeting-details-dialog">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-lg">
            <Info className="w-5 h-5 text-sky-400" />
            <span id="meeting-details-title">Meeting Details</span>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            aria-label="Đóng thông tin phòng họp"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

          {role === 'host' && hostToken && (
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Admission control</div>
                  <div className="text-xs text-slate-400">Invite dùng một lần, hết hạn sau 15 phút.</div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateInvite}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white"
                >
                  {loading ? 'Đang tạo...' : 'Tạo invite'}
                </button>
              </div>

              {invite && (
                <div className="space-y-2">
                  <textarea
                    readOnly
                    value={invite.token}
                    rows={3}
                    aria-label="Invite token"
                    className="w-full resize-none bg-slate-950 border border-slate-700 rounded-xl p-2 text-[10px] text-slate-300 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                  >
                    {copied ? 'Đã sao chép invite' : 'Sao chép invite token'}
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">Đang chờ ({admissions.filter((item) => item.status === 'pending').length})</div>
                {admissions.filter((item) => item.status === 'pending').map((item) => (
                  <div key={item.admissionId} className="flex items-center gap-2 p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">{item.displayName}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <CountryFlag code={item.spokenLanguage || 'vi'} size="xs" />
                        <span>{item.spokenLanguage ? item.spokenLanguage.toUpperCase() : 'VI'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Phê duyệt ${item.displayName}`}
                      title="Phê duyệt"
                      onClick={() => void handleDecision(item.admissionId, 'approved')}
                      className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Từ chối ${item.displayName}`}
                      title="Từ chối"
                      onClick={() => void handleDecision(item.admissionId, 'rejected')}
                      className="p-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {admissions.every((item) => item.status !== 'pending') && (
                  <div className="text-xs text-slate-500 text-center py-2">Không có yêu cầu đang chờ.</div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
              {error}
            </div>
          )}

        <div className="space-y-3">
          <MeetingLinkPreviewCard
            url={inviteUrl}
            meetingCode={meetingCode}
            interactive={false}
          />

          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Đã sao chép đường dẫn tham gia</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Sao chép đường dẫn tham gia</span>
              </>
            )}
          </button>
        </div>
      </div>
    </AdaptiveDialog>
  );
};
