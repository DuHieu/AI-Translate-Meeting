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
} from 'lucide-react';
import {
  meetingApi,
  AdminMetricsResponse,
  PaymentOrderResponse,
  EnterpriseLeadRecord,
} from '../api/meetingApi';

export const AdminDashboardPage: React.FC = () => {
  const [adminKey, setAdminKey] = useState<string>(() => {
    return sessionStorage.getItem('vimeet_admin_key') || '';
  });
  const [keyInput, setKeyInput] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
  const [orders, setOrders] = useState<PaymentOrderResponse[]>([]);
  const [leads, setLeads] = useState<EnterpriseLeadRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'leads' | 'notifications'>('orders');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testNotificationResult, setTestNotificationResult] = useState<{
    status: 'idle' | 'sending' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const loadDashboardData = useCallback(async (key: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const [m, o, l] = await Promise.all([
        meetingApi.getAdminMetrics(key),
        meetingApi.getAdminOrders(key),
        meetingApi.getAdminLeads(key),
      ]);
      setMetrics(m);
      setOrders(o);
      setLeads(l);
      setIsAuthenticated(true);
      sessionStorage.setItem('vimeet_admin_key', key);
    } catch (err) {
      console.error('Failed to authenticate or load admin data:', err);
      setIsAuthenticated(false);
      setAuthError('Mã khóa quản trị (X-Admin-Key) không chính xác.');
      sessionStorage.removeItem('vimeet_admin_key');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminKey) {
      loadDashboardData(adminKey);
    }
  }, [adminKey, loadDashboardData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setAdminKey(keyInput.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('vimeet_admin_key');
    setAdminKey('');
    setIsAuthenticated(false);
    setMetrics(null);
    setOrders([]);
    setLeads([]);
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
          <h1 className="text-center text-xl font-bold text-white">Quản Trị ViMeet</h1>
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
                placeholder="vimeet-admin-secret-2026"
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
              VM
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
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold">Phòng Họp Đang Chạy</span>
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                <Video className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {metrics?.activeMeetings ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500">
              WebRTC SFU LiveKit Cluster
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
        </div>

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
      </main>
    </div>
  );
};
