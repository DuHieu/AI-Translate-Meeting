import React from 'react';
import { isOpsSubdomain } from '../../utils/subdomain';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

/**
 * AdminRouteGuard:
 * Isolates the administrative console behind dedicated subdomains (Phương án 2).
 * On the public domain (layameet.com), any access to /admin renders a standard 404 page,
 * completely hiding the admin panel and login prompt from public bots, crawlers, and attackers.
 * Only visitors reaching the app via an authorized ops subdomain (e.g. ops.layameet.com)
 * are permitted to view the Admin Dashboard.
 */
export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const isAllowedHost = isOpsSubdomain();

  if (!isAllowedHost) {
    return (
      <div className="min-h-screen bg-[#0f0f10] text-zinc-200 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/70 text-zinc-400">
            <span className="text-xl font-bold font-mono">404</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100 mb-2">Trang không tồn tại</h1>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Đường dẫn bạn yêu cầu không tồn tại hoặc đã được chuyển sang địa chỉ khác.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            Quay lại trang chủ
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
