import { AdaptiveDialog } from '../common/AdaptiveDialog';
import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Server,
  Database,
  Cpu,
  RefreshCw,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  BookOpen,
  Award,
} from 'lucide-react';
import {
  fetchSystemStatus,
  triggerSystemCleanup,
  fetchGlossaryStats,
  reloadGlossary,
  fetchAuditLogs,
  SystemStatusResponse,
  SystemCleanupResult,
  GlossaryStatsResponse,
  AuditEventRecord,
} from '../../services/systemService';

interface SystemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemStatusModal: React.FC<SystemStatusModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [glossary, setGlossary] = useState<GlossaryStatsResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [reloadLoading, setReloadLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<SystemCleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadMessage, setReloadMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sysStatus, glossStats, logs] = await Promise.all([
        fetchSystemStatus(),
        fetchGlossaryStats(),
        fetchAuditLogs(15),
      ]);
      setStatus(sysStatus);
      setGlossary(glossStats);
      setAuditLogs(logs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen]);

  const handleCleanup = async () => {
    setCleanupLoading(true);
    setError(null);
    try {
      const result = await triggerSystemCleanup();
      setCleanupResult(result);
      void loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dọn dẹp thất bại');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleReloadGlossary = async () => {
    setReloadLoading(true);
    setError(null);
    setReloadMessage(null);
    try {
      const res = await reloadGlossary();
      setReloadMessage('Đã tải lại từ điển dự án thành công!');
      if (res.stats) {
        setGlossary(res.stats);
      } else {
        void loadData();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Tải lại từ điển thất bại');
    } finally {
      setReloadLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AdaptiveDialog label="Trạng thái hệ thống" onClose={onClose} className="system-status-dialog">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Trạng thái hệ thống & Quyền kiểm soát dữ liệu
              </h2>
              <p className="text-xs text-slate-400">
                Self-Hosted Private Bilingual Workspace (On-Premise / VPS)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div tabIndex={0} role="region" aria-label="Chi tiết trạng thái hệ thống" className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
              <span>Đang kiểm tra kết nối hệ thống...</span>
            </div>
          ) : error && !status ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Lỗi truy vấn trạng thái</p>
                <p className="text-xs text-red-300 mt-1">{error}</p>
                <button
                  type="button"
                  onClick={loadData}
                  className="mt-3 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-medium rounded-lg transition"
                >
                  Thử lại
                </button>
              </div>
            </div>
          ) : status ? (
            <>
              {/* Product & Profile Badge */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400">Phiên bản & Hồ sơ triển khai</div>
                  <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                    {status.productName}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      v{status.version}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      status.deploymentProfile === 'business'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    Profile: {status.deploymentProfile}
                  </span>
                </div>
              </div>

              {/* Organization & Commercial License Info */}
              {status.license && (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      Giấy phép & Doanh nghiệp sở hữu
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        status.license.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : status.license.status === 'trial'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {status.license.status === 'active'
                        ? 'Bản quyền kích hoạt'
                        : status.license.status === 'trial'
                        ? 'Dùng thử (Trial)'
                        : 'Hết hạn / Không hợp lệ'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                    <div>
                      <div className="text-slate-100 font-semibold">{status.license.organizationName}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Gói:{' '}
                        <span className="font-semibold text-slate-200 uppercase">
                          {status.license.tier}
                        </span>
                        {status.license.daysRemaining !== null && status.license.daysRemaining !== undefined && (
                          <span className="ml-2 text-slate-400">
                            (Còn {status.license.daysRemaining} ngày)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span>Tối đa {status.license.maxConcurrentRooms} phòng đồng thời</span>
                      <span className="text-slate-600">•</span>
                      <span>{status.license.maxParticipantsPerRoom} người/phòng</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sizing & Capacity Hypothesis Note */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400">
                {status.deploymentProfile === 'pilot' ? (
                  <p>
                    <strong className="text-slate-200">Pilot Profile:</strong> Cấu hình 4 vCPU / 8 GB RAM, mô hình Whisper tiny (int8 CPU). Giả thuyết thiết kế: 1 phòng họp đồng thời, 3–5 người tham gia.
                  </p>
                ) : (
                  <p>
                    <strong className="text-slate-200">Business Profile:</strong> Cấu hình 8 vCPU / 16 GB RAM, mô hình Whisper small, Laya AI sidecar. Năng lực thực tế được kiểm chứng qua load-test trước khi tải lớn.
                  </p>
                )}
              </div>

              {/* Privacy & Zero-Audio Policy Contract */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Quy chuẩn quyền riêng tư & Dữ liệu
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200">Zero Raw Audio Policy</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Không lưu audio thô vào ổ đĩa. Audio chunk 350ms chỉ xử lý trong RAM rồi giải phóng.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200">Data Ownership</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Toàn bộ database PostgreSQL và cache Redis lưu trữ tại máy chủ riêng của doanh nghiệp.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200">Local STT Transcription</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Nhận dạng giọng nói faster-whisper chạy nội bộ container, không gửi audio ra SaaS ngoài.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200">Auto Retention Cleanup</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Tự động dọn dẹp bản ghi hết hạn mỗi {status.retention.intervalHours}h (ngưỡng lưu giữ: {status.retention.retentionHours}h).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infrastructure Services Health */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-sky-400" />
                  Trạng thái dịch vụ nền tảng
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300 font-medium">Postgres</span>
                    </div>
                    <span
                      className={`font-semibold capitalize ${
                        status.databaseStatus === 'healthy' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {status.databaseStatus}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300 font-medium">Redis</span>
                    </div>
                    <span
                      className={`font-semibold capitalize ${
                        status.redisStatus === 'healthy' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {status.redisStatus}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300 font-medium">LK TTL</span>
                    </div>
                    <span className="text-slate-200 font-semibold">
                      {status.security.liveKitTokenTtlMinutes}m
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300 font-medium">Host Auth</span>
                    </div>
                    <span
                      className={`font-semibold ${
                        status.security.requireHostAuthentication ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {status.security.requireHostAuthentication ? 'Bắt buộc' : 'Mở'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Domain Glossaries & Terminology */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    Từ điển thuật ngữ dự án Việt–Nhật
                  </div>
                  <button
                    type="button"
                    onClick={handleReloadGlossary}
                    disabled={reloadLoading}
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${reloadLoading ? 'animate-spin' : ''}`} />
                    <span>Tải lại từ điển</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-slate-300">
                      Các lĩnh vực hỗ trợ:{' '}
                      <span className="text-sky-400 font-medium">
                        {status.supportedGlossaryDomains.map((d) => d.toUpperCase()).join(', ')}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {glossary && glossary.total_terms !== undefined
                        ? `Đang nạp ${glossary.total_terms} thuật ngữ song ngữ chuyên ngành`
                        : 'Từ điển sẵn sàng nhận diện thực thể IT/Business'}
                    </div>
                  </div>
                </div>
                {reloadMessage && (
                  <p className="text-xs text-emerald-400 font-medium">{reloadMessage}</p>
                )}
              </div>

              {/* Audit Events Stream */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Nhật ký bảo mật & kiểm toán (Audit Events)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">Zero-PII / Tokens Redacted</span>
                </div>

                <div tabIndex={0} role="region" aria-label="Nhật ký sự kiện hệ thống" className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                  {auditLogs.length === 0 ? (
                    <p className="text-slate-500 text-[11px] italic py-1 px-1">Chưa ghi nhận sự kiện bảo mật nào trong phiên hiện tại.</p>
                  ) : (
                    auditLogs.map((evt) => (
                      <div key={evt.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/50 text-[11px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700/80 flex-shrink-0">
                            {evt.eventType}
                          </span>
                          <span className="text-slate-300 truncate" title={evt.details}>
                            {evt.details || 'Không có chi tiết'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 flex-shrink-0 font-mono">
                          {new Date(evt.timestampUtc).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Retention Trigger Button */}
              <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  {cleanupResult ? (
                    <span className="text-emerald-400">
                      ✓ Đã dọn dẹp {cleanupResult.deletedAdmissions} lượt cấp quyền và {cleanupResult.deletedSessions} phiên hết hạn.
                    </span>
                  ) : (
                    <span>Chính sách lưu trữ: Tự động xóa bản ghi quá {status.retention.retentionHours} giờ</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCleanup}
                  disabled={cleanupLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-2 border border-slate-700 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>{cleanupLoading ? 'Đang dọn dẹp...' : 'Dọn dẹp bản ghi hết hạn ngay'}</span>
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </AdaptiveDialog>
  );
};
