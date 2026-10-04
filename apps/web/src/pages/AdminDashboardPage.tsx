import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  DollarSign,
  Users,
  Video,
  Send,
  RefreshCw,
  LogOut,
  Building,
  CheckCircle2,
  Clock,
  Bell,
  ArrowLeft,
  KeyRound,
  Server,
  Activity,
  Cpu,
  AlertTriangle,
  Sliders,
  HardDrive,
  Zap,
  Copy,
  Check,
  ExternalLink,
  XCircle,
  Search,
} from 'lucide-react';
import {
  meetingApi,
  AdminMetricsResponse,
  PaymentOrderResponse,
  EnterpriseLeadRecord,
  InfraMetricsResponse,
  AdminMeetingDto,
  AdminMeetingListResponse,
} from '../api/meetingApi';

export const AdminDashboardPage: React.FC = () => {
  const [adminKey, setAdminKey] = useState<string>(() => {
    return sessionStorage.getItem('layameet_admin_key') || '';
  });
  const [keyInput, setKeyInput] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
  const [orders, setOrders] = useState<PaymentOrderResponse[]>([]);
  const [leads, setLeads] = useState<EnterpriseLeadRecord[]>([]);
  const [infraMetrics, setInfraMetrics] = useState<InfraMetricsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'meetings' | 'orders' | 'leads' | 'notifications' | 'infra'>('meetings');

  const [meetingsData, setMeetingsData] = useState<AdminMeetingListResponse | null>(null);
  const [meetingsStatusFilter, setMeetingsStatusFilter] = useState<'all' | 'active' | 'ended'>('all');
  const [meetingsSearch, setMeetingsSearch] = useState<string>('');
  const [isMeetingsLoading, setIsMeetingsLoading] = useState<boolean>(false);
  const [closingCode, setClosingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [closeConfirmMeeting, setCloseConfirmMeeting] = useState<AdminMeetingDto | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInfraLoading, setIsInfraLoading] = useState<boolean>(false);
  const [autoRefreshInfra, setAutoRefreshInfra] = useState<boolean>(true);
  const [targetCcu, setTargetCcu] = useState<number>(50);

  const [testNotificationResult, setTestNotificationResult] = useState<{
    status: 'idle' | 'sending' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const [testAlertResult, setTestAlertResult] = useState<{
    status: 'idle' | 'sending' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const loadMeetingsData = useCallback(async (key: string, status?: 'all' | 'active' | 'ended', search?: string) => {
    if (!key) return;
    setIsMeetingsLoading(true);
    try {
      const data = await meetingApi.getAdminMeetings(key, status, search);
      setMeetingsData(data);
    } catch (err) {
      console.warn('Failed to load admin meetings:', err);
    } finally {
      setIsMeetingsLoading(false);
    }
  }, []);

  const loadInfraData = useCallback(async (key: string) => {
    if (!key) return;
    setIsInfraLoading(true);
    try {
      const data = await meetingApi.getAdminInfraMetrics(key);
      setInfraMetrics(data);
    } catch (err) {
      console.warn('Failed to load infra metrics:', err);
    } finally {
      setIsInfraLoading(false);
    }
  }, []);

  const loadDashboardData = useCallback(async (key: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const [m, o, l, infra, rooms] = await Promise.all([
        meetingApi.getAdminMetrics(key),
        meetingApi.getAdminOrders(key),
        meetingApi.getAdminLeads(key),
        meetingApi.getAdminInfraMetrics(key).catch(() => null),
        meetingApi.getAdminMeetings(key, meetingsStatusFilter, meetingsSearch).catch(() => null),
      ]);
      setMetrics(m);
      setOrders(o);
      setLeads(l);
      if (infra) setInfraMetrics(infra);
      if (rooms) setMeetingsData(rooms);
      setIsAuthenticated(true);
      sessionStorage.setItem('layameet_admin_key', key);
    } catch (err) {
      console.error('Failed to authenticate or load admin data:', err);
      setIsAuthenticated(false);
      setAuthError('Mã khóa quản trị (X-Admin-Key) không chính xác.');
      sessionStorage.removeItem('layameet_admin_key');
    } finally {
      setIsLoading(false);
    }
  }, [meetingsStatusFilter, meetingsSearch]);

  const handleCloseMeeting = async (meetingCode: string) => {
    if (!adminKey) return;
    setClosingCode(meetingCode);
    setActionMessage(null);
    try {
      const res = await meetingApi.closeAdminMeeting(adminKey, meetingCode);
      setActionMessage({ type: 'success', text: res.message });
      setCloseConfirmMeeting(null);
      await Promise.all([
        loadMeetingsData(adminKey, meetingsStatusFilter, meetingsSearch),
        meetingApi.getAdminMetrics(adminKey).then((m) => setMetrics(m)).catch(() => {}),
        meetingApi.getAdminInfraMetrics(adminKey).then((inf) => setInfraMetrics(inf)).catch(() => {}),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đóng phòng họp. Vui lòng thử lại.';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setClosingCode(null);
    }
  };

  const handleCopyCode = (code: string) => {
    const url = `${window.location.origin}/rooms/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  useEffect(() => {
    if (adminKey) {
      loadDashboardData(adminKey);
    }
  }, [adminKey, loadDashboardData]);

  // Auto-refresh infra metrics every 10s if viewing infra tab
  useEffect(() => {
    if (!isAuthenticated || !adminKey || activeTab !== 'infra' || !autoRefreshInfra) return;
    const interval = setInterval(() => {
      loadInfraData(adminKey);
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, adminKey, activeTab, autoRefreshInfra, loadInfraData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setAdminKey(keyInput.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('layameet_admin_key');
    setAdminKey('');
    setIsAuthenticated(false);
    setMetrics(null);
    setOrders([]);
    setLeads([]);
    setInfraMetrics(null);
  };

  const handleTestNotification = async () => {
    if (!adminKey) return;
    setTestNotificationResult({ status: 'sending' });
    try {
      const res = await meetingApi.testAdminNotification(adminKey);
      setTestNotificationResult({
        status: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch (err) {
      setTestNotificationResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Lỗi khi gửi thông báo thử nghiệm.',
      });
    }
  };

  const handleTestAlert = async (severity: 'warning' | 'critical') => {
    if (!adminKey) return;
    setTestAlertResult({ status: 'sending' });
    try {
      const res = await meetingApi.testAdminAlert(adminKey, severity);
      setTestAlertResult({
        status: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch (err) {
      setTestAlertResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Lỗi khi gửi cảnh báo thử nghiệm.',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  // If not authenticated, render login gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-center text-xl font-bold text-white">Quản Trị LayaMeet</h1>
          <p className="mt-1 text-center text-xs text-zinc-400">
            Vui lòng nhập Admin Secret Key để truy cập dữ liệu doanh thu &amp; khách hàng.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Admin Secret Key (X-Admin-Key)
              </label>
              <input
                type="password"
                required
                placeholder="layameet-admin-secret-2026"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-zinc-700 bg-zinc-950 text-white placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {authError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition cursor-pointer shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              <span>{isLoading ? 'Đang xác thực...' : 'Đăng Nhập Quản Trị'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại trang chủ</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </a>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              LM
            </div>
            <span className="font-bold text-sm text-white">ViMeet Admin Console</span>
            <span className="rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold px-2 py-0.5">
              Live Production
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadDashboardData(adminKey)}
            disabled={isLoading}
            title="Làm mới dữ liệu"
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Revenue */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold">Tổng Doanh Thu VietQR</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {formatCurrency(metrics?.totalRevenueVnd ?? 0)}
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">{metrics?.paidOrders ?? 0}</span> đơn đã thanh toán thành công
            </div>
          </div>

          {/* Card 2: Orders */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold">Tổng Đơn Hàng Tạo Ra</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {metrics?.totalOrders ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500">
              Tỷ lệ hoàn tất: {metrics && metrics.totalOrders > 0 ? Math.round((metrics.paidOrders / metrics.totalOrders) * 100) : 0}%
            </div>
          </div>

          {/* Card 3: Active Rooms */}
          <div
            onClick={() => {
              setActiveTab('meetings');
              if (adminKey) loadMeetingsData(adminKey, meetingsStatusFilter, meetingsSearch);
            }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm space-y-2 cursor-pointer hover:border-violet-500/50 hover:bg-violet-950/20 transition group"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold group-hover:text-violet-300 transition">Phòng Họp Đang Chạy</span>
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 transition">
                <Video className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono flex items-center gap-2">
              <span>{metrics?.activeMeetings ?? 0}</span>
              {(metrics?.activeMeetings ?? 0) > 0 && (
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              )}
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center justify-between">
              <span>WebRTC SFU LiveKit Cluster</span>
              <span className="text-violet-400 font-medium group-hover:underline">Quản lý &rarr;</span>
            </div>
          </div>

          {/* Card 4: Enterprise Leads */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold">Lead Khách Hàng On-Prem</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Building className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {metrics?.totalLeads ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500">
              {leads.length} liên hệ chờ tư vấn giải pháp
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-zinc-800 gap-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('meetings');
              if (adminKey) loadMeetingsData(adminKey, meetingsStatusFilter, meetingsSearch);
            }}
            className={`pb-3 font-semibold text-xs sm:text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'meetings'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Video className="h-4 w-4" />
            <span>Phòng Họp ({meetingsData?.totalCount ?? metrics?.activeMeetings ?? 0})</span>
            {meetingsData && meetingsData.activeCount > 0 ? (
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-1.5 py-0.2">
                {meetingsData.activeCount} live
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`pb-3 font-semibold text-xs sm:text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>Giao Dịch VietQR ({orders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`pb-3 font-semibold text-xs sm:text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'leads'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Khách Hàng Doanh Nghiệp ({leads.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 font-semibold text-xs sm:text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Thông Báo Telegram &amp; Webhook</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('infra');
              if (adminKey) loadInfraData(adminKey);
            }}
            className={`pb-3 font-semibold text-xs sm:text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'infra'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Server className="h-4 w-4" />
            <span>Hạ Tầng &amp; Cảnh Báo Sớm</span>
            {infraMetrics && (
              <span
                className={`h-2 w-2 rounded-full ${
                  infraMetrics.systemStatus === 'critical'
                    ? 'bg-red-500 animate-ping'
                    : infraMetrics.systemStatus === 'warning'
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
            )}
          </button>
        </div>

        {/* Action Message Toast */}
        {actionMessage && (
          <div
            className={`rounded-xl p-3 text-xs flex items-center justify-between border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/40 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Tab 0: Meetings Management */}
        {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-400" />
                    <span>Quản Lý Phòng Họp Đang Chạy &amp; Lịch Sử</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Hệ thống tự động đóng phòng nhàn rỗi (idle) khi không có người sử dụng. Admin có thể đóng cưỡng chế bất kỳ phòng nào.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (adminKey) loadMeetingsData(adminKey, meetingsStatusFilter, meetingsSearch);
                    }}
                    disabled={isMeetingsLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isMeetingsLoading ? 'animate-spin text-blue-400' : ''}`} />
                    <span>Làm mới</span>
                  </button>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="p-4 bg-zinc-950/40 border-b border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    value={meetingsSearch}
                    onChange={(e) => {
                      setMeetingsSearch(e.target.value);
                      if (adminKey) loadMeetingsData(adminKey, meetingsStatusFilter, e.target.value);
                    }}
                    placeholder="Tìm theo mã phòng hoặc tên..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setMeetingsStatusFilter('all');
                      if (adminKey) loadMeetingsData(adminKey, 'all', meetingsSearch);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      meetingsStatusFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Tất cả ({meetingsData?.totalCount ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMeetingsStatusFilter('active');
                      if (adminKey) loadMeetingsData(adminKey, 'active', meetingsSearch);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      meetingsStatusFilter === 'active'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Đang chạy ({meetingsData?.activeCount ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMeetingsStatusFilter('ended');
                      if (adminKey) loadMeetingsData(adminKey, 'ended', meetingsSearch);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      meetingsStatusFilter === 'ended'
                        ? 'bg-zinc-700 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Đã kết thúc ({meetingsData?.endedCount ?? 0})
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {!meetingsData || meetingsData.meetings.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs space-y-1">
                    <p>Không có phòng họp nào phù hợp với điều kiện tìm kiếm.</p>
                    <p className="text-[11px] text-zinc-600">Hệ thống tự động dọn dẹp các phòng họp rỗng không có người sử dụng.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/70 border-b border-zinc-800 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Mã Phòng</th>
                        <th className="px-4 py-3 font-semibold">Tên Cuộc Họp</th>
                        <th className="px-4 py-3 font-semibold">Trạng Thái</th>
                        <th className="px-4 py-3 font-semibold">Người Tham Gia</th>
                        <th className="px-4 py-3 font-semibold">Thời Điểm Tạo</th>
                        <th className="px-4 py-3 font-semibold">Thời Lượng</th>
                        <th className="px-4 py-3 font-semibold text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {meetingsData.meetings.map((m) => (
                        <tr key={m.id} className="hover:bg-zinc-800/30 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-sky-400">
                              <span>{m.meetingCode}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(m.meetingCode)}
                                title="Sao chép link phòng họp"
                                className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition cursor-pointer"
                              >
                                {copiedCode === m.meetingCode ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-zinc-200">
                            {m.name}
                          </td>
                          <td className="px-4 py-3">
                            {m.isActive ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                                <span>Đang hoạt động</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-2.5 py-0.5 text-[11px] font-semibold">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Đã kết thúc</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {m.isActive ? (
                              m.activeParticipantsCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20 px-2 py-0.5 text-[11px] font-medium">
                                  <Users className="h-3 w-3" />
                                  <span>{m.activeParticipantsCount} đang họp</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-400/80 border border-amber-500/20 px-2 py-0.5 text-[11px]">
                                  <span>0 người (Trống)</span>
                                </span>
                              )
                            ) : (
                              <span className="text-zinc-500 text-[11px]">
                                Tổng {m.totalParticipantsCount} người
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">
                            {new Date(m.createdAtUtc).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {m.durationMinutes < 60
                              ? `${Math.round(m.durationMinutes)} phút`
                              : `${Math.floor(m.durationMinutes / 60)}h ${Math.round(m.durationMinutes % 60)}m`}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {m.isActive ? (
                                <>
                                  <a
                                    href={`/rooms/${m.meetingCode}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-semibold transition"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <span>Vào xem</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => setCloseConfirmMeeting(m)}
                                    disabled={closingCode === m.meetingCode}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                                  >
                                    {closingCode === m.meetingCode ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                    <span>Đóng phòng</span>
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-zinc-500 italic">
                                  {m.endedAtUtc
                                    ? `Đóng lúc ${new Date(m.endedAtUtc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                                    : 'Đã đóng'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Orders Table */}
        {activeTab === 'orders' && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Lịch Sử Giao Dịch &amp; Đơn Hàng</h2>
              <span className="text-xs text-zinc-400">Tự động đối soát realtime</span>
            </div>
            <div className="overflow-x-auto">
              {orders.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  Chưa có giao dịch nào được ghi nhận.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/70 border-b border-zinc-800 text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Mã Đơn</th>
                      <th className="px-4 py-3 font-semibold">Gói Dịch Vụ</th>
                      <th className="px-4 py-3 font-semibold">Số Tiền</th>
                      <th className="px-4 py-3 font-semibold">Trạng Thái</th>
                      <th className="px-4 py-3 font-semibold">Ngân Hàng</th>
                      <th className="px-4 py-3 font-semibold">Thời Gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {orders.map((o) => (
                      <tr key={o.orderCode} className="hover:bg-zinc-800/30 transition">
                        <td className="px-4 py-3 font-mono font-bold text-sky-400">
                          {o.orderCode}
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-200">
                          {o.planName}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-white">
                          {formatCurrency(o.amount)}
                        </td>
                        <td className="px-4 py-3">
                          {o.status.toLowerCase() === 'paid' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold">
                              <CheckCircle2 className="h-3 w-3" /> Đã thanh toán
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold">
                              <Clock className="h-3 w-3" /> Đang chờ
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {o.bankId} · {o.accountNumber}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 font-mono">
                          {new Date(o.createdAt).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Enterprise Leads Table */}
        {activeTab === 'leads' && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Danh Sách Yêu Cầu Tư Vấn Doanh Nghiệp</h2>
              <span className="text-xs text-zinc-400">B2B On-Premise &amp; Private VPS</span>
            </div>
            <div className="overflow-x-auto">
              {leads.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  Chưa có form liên hệ nào được gửi từ website.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/70 border-b border-zinc-800 text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Khách Hàng</th>
                      <th className="px-4 py-3 font-semibold">Công Ty / Tổ Chức</th>
                      <th className="px-4 py-3 font-semibold">Quy Mô</th>
                      <th className="px-4 py-3 font-semibold">Ngôn Ngữ</th>
                      <th className="px-4 py-3 font-semibold">Mô Hình</th>
                      <th className="px-4 py-3 font-semibold">Ghi Chú</th>
                      <th className="px-4 py-3 font-semibold">Thời Gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {leads.map((l) => (
                      <tr key={l.id} className="hover:bg-zinc-800/30 transition">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{l.fullName}</div>
                          <a
                            href={`mailto:${l.email}`}
                            className="text-blue-400 hover:underline text-[11px] font-mono"
                          >
                            {l.email}
                          </a>
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-200">
                          {l.company || '—'}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {l.teamSize || '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-300">
                          {l.languagePair || 'VI-JA'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-300">
                            {l.deploymentModel || 'on-premise'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 max-w-xs truncate" title={l.notes}>
                          {l.notes || '—'}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 font-mono">
                          {new Date(l.submittedAtUtc).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Notifications Configuration */}
        {activeTab === 'notifications' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-400" />
                <span>Trạng Thái Cấu Hình Dispatcher</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Hệ thống tự động thông báo ngay lập tức vào Telegram hoặc hệ thống CRM Webhook khi có khách hàng hoàn tất thanh toán VietQR hoặc gửi form tư vấn Enterprise.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950">
                  <div>
                    <div className="text-xs font-semibold text-white">Telegram Sales Bot</div>
                    <div className="text-[11px] text-zinc-500">TELEGRAM_BOT_TOKEN &amp; TELEGRAM_CHAT_ID</div>
                  </div>
                  {metrics?.telegramConfigured ? (
                    <span className="rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold px-2.5 py-0.5 border border-emerald-500/20">
                      Đã kết nối
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-800 text-zinc-400 text-xs font-semibold px-2.5 py-0.5">
                      Chưa cấu hình
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950">
                  <div>
                    <div className="text-xs font-semibold text-white">CRM Webhook Endpoint</div>
                    <div className="text-[11px] text-zinc-500">Notification:WebhookUrl hoặc ENTERPRISE_LEAD_WEBHOOK_URL</div>
                  </div>
                  {metrics?.webhookConfigured ? (
                    <span className="rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold px-2.5 py-0.5 border border-emerald-500/20">
                      Đã kết nối
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-800 text-zinc-400 text-xs font-semibold px-2.5 py-0.5">
                      Chưa cấu hình
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-400" />
                <span>Kiểm Tra Thông Báo Thử Nghiệm (Test Ping)</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Bấm nút bên dưới để gửi tin nhắn thử nghiệm tới các kênh thông báo đã cấu hình để đảm bảo nhân viên kinh doanh nhận được tin nhắn tức thì.
              </p>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testNotificationResult.status === 'sending'}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {testNotificationResult.status === 'sending'
                      ? 'Đang gửi thông báo thử...'
                      : 'Gửi Thông Báo Thử Nghiệm Ngay'}
                  </span>
                </button>
              </div>

              {testNotificationResult.status === 'success' && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{testNotificationResult.message}</span>
                </div>
              )}

              {testNotificationResult.status === 'error' && (
                <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-400 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{testNotificationResult.message}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Infrastructure & Early Warning System */}
        {activeTab === 'infra' && (
          <div className="space-y-6">
            {/* Top Bar: System Status & Controls */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">Sức Khỏe Hạ Tầng LayaMeet</h2>
                    {infraMetrics?.systemStatus === 'critical' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                        NGUY CƠ QUÁ TẢI (CRITICAL)
                      </span>
                    ) : infraMetrics?.systemStatus === 'warning' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        CẢNH BÁO SỚM (WARNING)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        HOẠT ĐỘNG ỔN ĐỊNH (NORMAL)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Tự động đo đạc tải tiến trình, dung lượng phòng họp và trạng thái dịch vụ nền tảng.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRefreshInfra}
                    onChange={(e) => setAutoRefreshInfra(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Tự động cập nhật (10s)</span>
                </label>
                <button
                  type="button"
                  onClick={() => adminKey && loadInfraData(adminKey)}
                  disabled={isInfraLoading}
                  className="px-3 py-1.5 rounded-xl border border-zinc-700 hover:border-zinc-600 bg-zinc-800/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isInfraLoading ? 'animate-spin' : ''}`} />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            {/* Active Alerts Banner if any */}
            {infraMetrics?.activeAlerts && infraMetrics.activeAlerts.length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Phát Hiện Dấu Hiệu Quá Tải Cần Lưu Ý ({infraMetrics.activeAlerts.length})</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-amber-200/90 pl-1">
                  {infraMetrics.activeAlerts.map((alert, idx) => (
                    <li key={idx}>{alert}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Live Vitals Grid (4 Metrics) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Vitals 1: Process Memory */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-semibold">RAM Tiến Trình (.NET &amp; API)</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <Cpu className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {infraMetrics?.processMemoryMb ?? 0} <span className="text-sm font-normal text-zinc-400">MB</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (infraMetrics?.processMemoryMb ?? 0) >= 2000
                          ? 'bg-red-500'
                          : (infraMetrics?.processMemoryMb ?? 0) >= 1200
                          ? 'bg-amber-400'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round(((infraMetrics?.processMemoryMb ?? 0) / 2500) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-zinc-500 flex justify-between">
                    <span>GC Heap: {infraMetrics?.gcAllocatedMb ?? 0} MB</span>
                    <span>Ngưỡng &lt; 1,500 MB</span>
                  </div>
                </div>
              </div>

              {/* Vitals 2: Room Capacity */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-semibold">Dung Lượng Phòng Họp</span>
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                    <Video className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {infraMetrics?.activeRooms ?? 0} <span className="text-sm font-normal text-zinc-400">/ {infraMetrics?.maxConcurrentRooms ?? 25}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (infraMetrics?.roomCapacityPercent ?? 0) >= 90
                          ? 'bg-red-500'
                          : (infraMetrics?.roomCapacityPercent ?? 0) >= 70
                          ? 'bg-amber-400'
                          : 'bg-violet-500'
                      }`}
                      style={{ width: `${Math.min(100, infraMetrics?.roomCapacityPercent ?? 0)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-zinc-500 flex justify-between">
                    <span>Tải: {infraMetrics?.roomCapacityPercent ?? 0}%</span>
                    <span>{infraMetrics?.activeParticipants ?? 0} người đang họp</span>
                  </div>
                </div>
              </div>

              {/* Vitals 3: PostgreSQL Database */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-semibold">PostgreSQL Database</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <HardDrive className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black capitalize text-emerald-400 font-mono">
                  {infraMetrics?.databaseStatus ?? 'healthy'}
                </div>
                <div className="text-[11px] text-zinc-500">
                  PostgreSQL 16 Alpine • Pool sẵn sàng
                </div>
              </div>

              {/* Vitals 4: Redis Distributed Cache */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-semibold">Redis Cache &amp; STT Buffer</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Zap className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono flex items-baseline gap-2">
                  <span className="capitalize text-emerald-400">{infraMetrics?.redisStatus ?? 'healthy'}</span>
                  {infraMetrics?.redisLatencyMs != null && (
                    <span className="text-xs font-normal text-zinc-400">({infraMetrics.redisLatencyMs} ms)</span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-500">
                  Bộ nhớ đệm dịch thuật &amp; Rate limiting
                </div>
              </div>
            </div>

            {/* Health Indicators Breakdown */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="h-4 w-4 text-blue-400" />
                  <span>Trạng Thái Chi Tiết Từng Thành Phần Hạ Tầng</span>
                </h3>
                <span className="text-xs text-zinc-400">Cập nhật lúc: {infraMetrics ? new Date(infraMetrics.timestampUtc).toLocaleTimeString('vi-VN') : '--'}</span>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {infraMetrics?.indicators.map((ind, i) => (
                  <div key={i} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          ind.status === 'critical'
                            ? 'bg-red-500 animate-pulse'
                            : ind.status === 'warning'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                      />
                      <div>
                        <div className="font-semibold text-white">{ind.component}</div>
                        <div className="text-zinc-400 text-[11px] mt-0.5">{ind.message}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {ind.value != null && (
                        <span className="font-mono text-zinc-300 font-semibold">
                          {ind.value} {ind.unit ?? ''}
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ind.status === 'critical'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : ind.status === 'warning'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {ind.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Capacity & Scale Calculator */}
            <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950 p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-blue-400" />
                    <span>Bộ Tính Toán &amp; Quy Hoạch Nâng Cấp VPS (Capacity Calculator)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Kéo thanh trượt số người họp đồng thời (CCU) để hệ thống tự động tính toán cấu hình máy chủ và chi phí thuê VPS tối ưu.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[25, 50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetCcu(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        targetCcu === preset
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {preset} CCU
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider Row */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-semibold">Số Người Họp Đồng Thời Mục Tiêu:</span>
                  <span className="font-mono text-xl font-black text-blue-400">{targetCcu} <span className="text-xs text-zinc-400 font-normal">người (CCU)</span></span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={targetCcu}
                  onChange={(e) => setTargetCcu(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>10 CCU (Nhóm nhỏ)</span>
                  <span>100 CCU (Công ty vừa)</span>
                  <span>500 CCU (Hội thảo lớn)</span>
                </div>
              </div>

              {/* Calculated Results Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                {/* 1. vCPU Cores */}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-1">
                  <div className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Cấu Hình vCPU</div>
                  <div className="text-lg font-black text-white font-mono">
                    {targetCcu <= 25
                      ? '2 - 4 vCPU'
                      : targetCcu <= 75
                      ? '8 vCPU'
                      : targetCcu <= 150
                      ? '16 vCPU'
                      : '32+ vCPU'}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Faster-whisper int8 đa luồng
                  </div>
                </div>

                {/* 2. RAM GB */}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-1">
                  <div className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Bộ Nhớ RAM</div>
                  <div className="text-lg font-black text-white font-mono">
                    {targetCcu <= 25
                      ? '4 - 8 GB'
                      : targetCcu <= 75
                      ? '16 GB'
                      : targetCcu <= 150
                      ? '32 GB'
                      : '64+ GB'}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    RAM-only (Zero raw audio storage)
                  </div>
                </div>

                {/* 3. Bandwidth */}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-1">
                  <div className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Băng Thông Mạng</div>
                  <div className="text-lg font-black text-white font-mono">
                    ~{Math.round(targetCcu * 0.8)} <span className="text-xs text-zinc-400 font-normal">Mbps</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    WebRTC SFU Outbound stream
                  </div>
                </div>

                {/* 4. Estimated Hosting Cost */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4 space-y-1">
                  <div className="text-[11px] text-blue-400 uppercase font-semibold tracking-wider">Ước Tính Chi Phí VPS</div>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    ${targetCcu <= 25 ? 15 : targetCcu <= 75 ? 45 : targetCcu <= 150 ? 150 : targetCcu <= 300 ? 350 : 700} <span className="text-xs text-zinc-400 font-normal">/ tháng</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    ~{formatCurrency((targetCcu <= 25 ? 15 : targetCcu <= 75 ? 45 : targetCcu <= 150 ? 150 : targetCcu <= 300 ? 350 : 700) * 25500)} / tháng
                  </div>
                </div>
              </div>

              {/* Recommendation Callout */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-300 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Khuyến Nghị Lựa Chọn Hạ Tầng Cho Mức {targetCcu} CCU:</span>
                </div>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  {targetCcu <= 25 &&
                    'VPS cơ bản (Hetzner CX22 / DigitalOcean 4GB). Đủ tải mượt mà cho 3–6 phòng họp nhỏ hoàn toàn bằng CPU mà không cần GPU.'}
                  {targetCcu > 25 && targetCcu <= 75 &&
                    'VPS tiêu chuẩn (Hetzner CCX23 / OVH Advance-1). Tối ưu cho doanh nghiệp vừa 10–20 phòng họp đồng thời, giữ độ trễ phụ đề dưới 350ms.'}
                  {targetCcu > 75 && targetCcu <= 150 &&
                    'Dedicated Server hoặc VPS GPU (RunPod / Lambda Labs / AWS g4dn.xlarge). Khuyến nghị thêm 1 card GPU Nvidia T4 để tránh quá tải CPU khi dịch đa luồng.'}
                  {targetCcu > 150 &&
                    'Kiến trúc phân tán Multi-node (Tách riêng LiveKit SFU node và AI Worker node có GPU A10G/L4). Đảm bảo khả năng chịu lỗi cao và co giãn theo lưu lượng.'}
                </p>
              </div>
            </div>

            {/* Early Warning Alert Testing Console */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Send className="h-5 w-5 text-amber-400" />
                    <span>Kiểm Thử Luồng Cảnh Báo Sớm Tránh Sập Server (Alert Console)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Gửi tín hiệu cảnh báo khẩn tới bot Telegram để xác thực quản trị viên nhận được cảnh báo trước khi xảy ra sự cố.
                  </p>
                </div>
                <div>
                  {infraMetrics?.telegramConfigured ? (
                    <span className="rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold px-3 py-1 border border-emerald-500/20">
                      Telegram Đã Kết Nối
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-800 text-zinc-400 text-xs font-semibold px-3 py-1">
                      Telegram Chưa Cấu Hình
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleTestAlert('warning')}
                  disabled={testAlertResult.status === 'sending'}
                  className="py-2.5 px-4 rounded-xl bg-amber-600/80 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-amber-600/20"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    {testAlertResult.status === 'sending'
                      ? 'Đang gửi tín hiệu...'
                      : 'Bắn Thử Cảnh Báo Mức WARNING ⚠️'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTestAlert('critical')}
                  disabled={testAlertResult.status === 'sending'}
                  className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-red-600/20"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>
                    {testAlertResult.status === 'sending'
                      ? 'Đang gửi tín hiệu...'
                      : 'Bắn Thử Cảnh Báo Mức CRITICAL 🚨'}
                  </span>
                </button>
              </div>

              {testAlertResult.status === 'success' && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{testAlertResult.message}</span>
                </div>
              )}

              {testAlertResult.status === 'error' && (
                <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-400 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{testAlertResult.message}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close Room Confirmation Modal */}
        {closeConfirmMeeting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/20">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Xác Nhận Đóng Phòng Họp</h3>
                  <p className="text-xs text-zinc-400">Hành động này sẽ ngắt kết nối mọi thành viên</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Bạn có chắc chắn muốn đóng phòng họp <span className="font-semibold text-white">"{closeConfirmMeeting.name}"</span> (Mã: <span className="font-mono font-bold text-sky-400">{closeConfirmMeeting.meetingCode}</span>)?
              </p>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-[11px] text-zinc-400 space-y-1">
                <div>• Tất cả kết nối WebRTC &amp; WebSocket của phòng sẽ lập tức bị hủy.</div>
                <div>• Phiên làm việc của người tham gia sẽ bị thu hồi.</div>
                <div>• Tài nguyên CPU &amp; RAM phục vụ nhận dạng giọng nói sẽ được giải phóng.</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCloseConfirmMeeting(null)}
                  disabled={closingCode === closeConfirmMeeting.meetingCode}
                  className="px-4 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleCloseMeeting(closeConfirmMeeting.meetingCode)}
                  disabled={closingCode === closeConfirmMeeting.meetingCode}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-semibold text-white transition cursor-pointer shadow-md shadow-red-600/20 flex items-center gap-2"
                >
                  {closingCode === closeConfirmMeeting.meetingCode ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  <span>Đồng Ý Đóng Phòng</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
