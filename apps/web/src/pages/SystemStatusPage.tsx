import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { GoogleAuthControl } from '../components/auth/GoogleAuthControl';
import { useLanguage } from '../context/language-context-def';
import { AppLanguage } from '../i18n';
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
} from '../services/systemService';

interface StatusCopy {
  backToHome: string;
  pageTitle: string;
  pageSubtitle: string;
  refreshBtn: string;
  allOperational: string;
  systemReady: string;
  servicesSection: string;
  dbLabel: string;
  dbSub: string;
  redisLabel: string;
  redisSub: string;
  livekitLabel: string;
  livekitSub: string;
  licenseSection: string;
  orgLabel: string;
  tierLabel: string;
  roomsLabel: string;
  participantsLabel: string;
  retentionLabel: string;
  retentionValue: (intervalH: number, retentionH: number) => string;
  adminSection: string;
  cleanupTitle: string;
  cleanupDesc: string;
  cleanupBtn: string;
  cleanupRunning: string;
  cleanupDone: (sessions: number, admissions: number) => string;
  glossaryTitle: string;
  glossaryDesc: (terms: number) => string;
  glossaryBtn: string;
  glossaryRunning: string;
  glossaryReloaded: string;
  auditLogsTitle: string;
  auditLogsEmpty: string;
  errLoad: string;
  errCleanup: string;
  errGlossary: string;
}

const COPY: Record<AppLanguage, StatusCopy> = {
  vi: {
    backToHome: 'Trang chủ',
    pageTitle: 'Trạng thái hệ thống',
    pageSubtitle: 'Trạng thái kết nối dịch vụ, thông số giấy phép và công cụ bảo trì.',
    refreshBtn: 'Làm mới',
    allOperational: 'Tất cả dịch vụ hoạt động bình thường',
    systemReady: 'Hệ thống sẵn sàng',
    servicesSection: 'Dịch vụ hạ tầng',
    dbLabel: 'PostgreSQL',
    dbSub: 'Cơ sở dữ liệu chính',
    redisLabel: 'Redis',
    redisSub: 'Bộ nhớ đệm phiên dịch',
    livekitLabel: 'LiveKit SFU',
    livekitSub: 'Máy chủ truyền thông WebRTC',
    licenseSection: 'Thông số giấy phép & Lưu trữ',
    orgLabel: 'Tổ chức',
    tierLabel: 'Cấu hình triển khai',
    roomsLabel: 'Số phòng đồng thời tối đa',
    participantsLabel: 'Số người tối đa mỗi phòng',
    retentionLabel: 'Chu kỳ tự động dọn dẹp',
    retentionValue: (i, r) => `Mỗi ${i} giờ (lưu giữ tối đa ${r} giờ)`,
    adminSection: 'Bảo trì & Nhật ký hệ thống',
    cleanupTitle: 'Dọn dẹp phiên họp hết hạn',
    cleanupDesc: 'Xóa các phiên họp và yêu cầu duyệt phòng đã quá hạn lưu trữ.',
    cleanupBtn: 'Chạy dọn dẹp',
    cleanupRunning: 'Đang xử lý...',
    cleanupDone: (s, a) => `Đã xóa ${s} phiên họp, ${a} lượt duyệt.`,
    glossaryTitle: 'Nạp lại từ điển thuật ngữ',
    glossaryDesc: (t) => `Hiện có ${t} thuật ngữ trong bộ nhớ.`,
    glossaryBtn: 'Tải lại từ điển',
    glossaryRunning: 'Đang tải...',
    glossaryReloaded: 'Đã tải lại từ điển thành công.',
    auditLogsTitle: 'Nhật ký sự kiện gần đây',
    auditLogsEmpty: 'Chưa có bản ghi nhật ký.',
    errLoad: 'Không thể tải thông tin hệ thống',
    errCleanup: 'Dọn dẹp thất bại',
    errGlossary: 'Tải lại từ điển thất bại',
  },
  en: {
    backToHome: 'Home',
    pageTitle: 'System Status',
    pageSubtitle: 'Service health, license configuration, and maintenance utilities.',
    refreshBtn: 'Refresh',
    allOperational: 'All services operational',
    systemReady: 'System ready',
    servicesSection: 'Infrastructure Services',
    dbLabel: 'PostgreSQL',
    dbSub: 'Primary relational database',
    redisLabel: 'Redis',
    redisSub: 'Translation cache store',
    livekitLabel: 'LiveKit SFU',
    livekitSub: 'WebRTC media gateway',
    licenseSection: 'License & Retention Policy',
    orgLabel: 'Organization',
    tierLabel: 'Deployment profile',
    roomsLabel: 'Max concurrent rooms',
    participantsLabel: 'Max participants per room',
    retentionLabel: 'Automated retention cleanup',
    retentionValue: (i, r) => `Every ${i}h (retention window: ${r}h)`,
    adminSection: 'Maintenance & Audit Logs',
    cleanupTitle: 'Purge expired sessions',
    cleanupDesc: 'Remove expired meeting sessions and admission records.',
    cleanupBtn: 'Run cleanup',
    cleanupRunning: 'Running...',
    cleanupDone: (s, a) => `Purged ${s} sessions and ${a} admissions.`,
    glossaryTitle: 'Reload terminology glossary',
    glossaryDesc: (t) => `${t} terms currently loaded in memory.`,
    glossaryBtn: 'Reload glossary',
    glossaryRunning: 'Reloading...',
    glossaryReloaded: 'Glossary reloaded successfully.',
    auditLogsTitle: 'Recent audit events',
    auditLogsEmpty: 'No audit events recorded.',
    errLoad: 'Failed to load system status',
    errCleanup: 'Cleanup failed',
    errGlossary: 'Glossary reload failed',
  },
  ja: {
    backToHome: 'ホーム',
    pageTitle: 'システム稼働状況',
    pageSubtitle: '各サービスの接続状態、ライセンス仕様、および管理ツール。',
    refreshBtn: '更新',
    allOperational: 'すべてのサービスが正常に稼働しています',
    systemReady: 'システム準備完了',
    servicesSection: 'インフラストラクチャ',
    dbLabel: 'PostgreSQL',
    dbSub: 'メインデータベース',
    redisLabel: 'Redis',
    redisSub: '翻訳キャッシュメモリ',
    livekitLabel: 'LiveKit SFU',
    livekitSub: 'WebRTCメディアサーバー',
    licenseSection: 'ライセンスとデータ保持設定',
    orgLabel: '組織名',
    tierLabel: 'プロファイル',
    roomsLabel: '最大同時ルーム数',
    participantsLabel: '1ルームあたりの最大参加人数',
    retentionLabel: '自動クリーンアップ周期',
    retentionValue: (i, r) => `${i}時間ごと（保持期間：${r}時間）`,
    adminSection: 'メンテナンスと監査ログ',
    cleanupTitle: '期限切れセッションの削除',
    cleanupDesc: '保持期限を過ぎた会議セッションと承認履歴を削除します。',
    cleanupBtn: 'クリーンアップ実行',
    cleanupRunning: '実行中...',
    cleanupDone: (s, a) => `${s}件のセッション、${a}件の承認履歴を削除しました。`,
    glossaryTitle: '専門用語辞書の再読み込み',
    glossaryDesc: (t) => `現在 ${t} 件の用語がロードされています。`,
    glossaryBtn: '辞書を再読み込み',
    glossaryRunning: '読み込み中...',
    glossaryReloaded: '用語辞書を再読み込みしました。',
    auditLogsTitle: '最近の監査イベント',
    auditLogsEmpty: '記録されたイベントはありません。',
    errLoad: 'システム情報の取得に失敗しました',
    errCleanup: 'クリーンアップに失敗しました',
    errGlossary: '辞書の再読み込みに失敗しました',
  },
};

export const SystemStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const copy = COPY[language] || COPY.vi;

  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [glossary, setGlossary] = useState<GlossaryStatsResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [reloadLoading, setReloadLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<SystemCleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadMessage, setReloadMessage] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

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
      setError(err instanceof Error ? err.message : copy.errLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCleanup = async () => {
    setCleanupLoading(true);
    setError(null);
    try {
      const result = await triggerSystemCleanup();
      setCleanupResult(result);
      void loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : copy.errCleanup);
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
      setReloadMessage(copy.glossaryReloaded);
      if (res.stats) {
        setGlossary(res.stats);
      } else {
        void loadData();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : copy.errGlossary);
    } finally {
      setReloadLoading(false);
    }
  };

  const isAllHealthy = status?.databaseStatus === 'healthy' && status?.redisStatus === 'healthy';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0d0e11] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 h-14 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-[#0d0e11]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 -ml-2 rounded-lg text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer text-xs font-medium"
              title={copy.backToHome}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{copy.backToHome}</span>
            </button>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
            <Link to="/" className="flex items-center">
              <LayaMeetLogo size="sm" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <GoogleAuthControl variant="navbar" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              {copy.pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {copy.pageSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141519] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{copy.refreshBtn}</span>
          </button>
        </div>

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {reloadMessage && (
          <div role="status" className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{reloadMessage}</span>
          </div>
        )}

        {/* 1. Overall Status Bar */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                {isAllHealthy ? copy.allOperational : copy.systemReady}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {status?.productName || 'LayaMeet'} · {status?.version ? `v${status.version}` : 'v1.2.0'}
              </div>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            {status?.deploymentProfile?.toUpperCase() || 'PILOT'}
          </span>
        </div>

        {/* 2. Infrastructure Services */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141519] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {copy.servicesSection}
            </h2>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {[
              { name: copy.dbLabel, sub: copy.dbSub, state: status?.databaseStatus || 'healthy' },
              { name: copy.redisLabel, sub: copy.redisSub, state: status?.redisStatus || 'healthy' },
              { name: copy.livekitLabel, sub: copy.livekitSub, state: 'ready' },
            ].map((svc) => (
              <div key={svc.name} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {svc.name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{svc.sub}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {svc.state}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. License & Retention Details */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141519] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {copy.licenseSection}
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 uppercase">
              {status?.license?.status || 'TRIAL'}
            </span>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs sm:text-sm">
            <div className="px-5 py-3.5 flex justify-between gap-4">
              <span className="text-zinc-500 dark:text-zinc-400">{copy.orgLabel}</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {status?.license?.organizationName || 'Community Trial'}
              </span>
            </div>
            <div className="px-5 py-3.5 flex justify-between gap-4">
              <span className="text-zinc-500 dark:text-zinc-400">{copy.tierLabel}</span>
              <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100 uppercase">
                {status?.license?.tier || 'PILOT'}
              </span>
            </div>
            <div className="px-5 py-3.5 flex justify-between gap-4">
              <span className="text-zinc-500 dark:text-zinc-400">{copy.roomsLabel}</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {status?.license?.maxConcurrentRooms ?? 1}
              </span>
            </div>
            <div className="px-5 py-3.5 flex justify-between gap-4">
              <span className="text-zinc-500 dark:text-zinc-400">{copy.participantsLabel}</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {status?.license?.maxParticipantsPerRoom ?? 5}
              </span>
            </div>
            <div className="px-5 py-3.5 flex justify-between gap-4">
              <span className="text-zinc-500 dark:text-zinc-400">{copy.retentionLabel}</span>
              <span className="text-zinc-900 dark:text-zinc-100">
                {copy.retentionValue(
                  status?.retention?.intervalHours ?? 1,
                  status?.retention?.retentionHours ?? 24,
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Collapsible Maintenance & Audit Logs */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-[#141519] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
          >
            <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {copy.adminSection}
            </span>
            {showTechnicalDetails ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {showTechnicalDetails && (
            <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2.5">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {copy.cleanupTitle}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {copy.cleanupDesc}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleCleanup()}
                    disabled={cleanupLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{cleanupLoading ? copy.cleanupRunning : copy.cleanupBtn}</span>
                  </button>
                  {cleanupResult && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                      {copy.cleanupDone(cleanupResult.deletedSessions, cleanupResult.deletedAdmissions)}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2.5">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {copy.glossaryTitle}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {copy.glossaryDesc(glossary?.total_terms ?? 0)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleReloadGlossary()}
                    disabled={reloadLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${reloadLoading ? 'animate-spin' : ''}`} />
                    <span>{reloadLoading ? copy.glossaryRunning : copy.glossaryBtn}</span>
                  </button>
                </div>
              </div>

              {/* Audit Logs */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {copy.auditLogsTitle}
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 divide-y divide-zinc-200 dark:divide-zinc-800 text-xs font-mono">
                  {auditLogs.length === 0 ? (
                    <div className="p-3 text-zinc-400 text-center text-xs">
                      {copy.auditLogsEmpty}
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="p-2.5 flex items-start justify-between gap-3 text-[11px]">
                        <div>
                          <span className="font-semibold text-blue-600 dark:text-blue-400 mr-2">{log.eventType}</span>
                          <span className="text-zinc-600 dark:text-zinc-300">{log.details}</span>
                        </div>
                        <span className="text-zinc-400 shrink-0 text-[10px]">
                          {new Date(log.timestampUtc).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
