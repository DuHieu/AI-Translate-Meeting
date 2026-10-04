import React from 'react';
import { Link } from 'react-router-dom';
import { LayaMeetLogo } from './LayaMeetLogo';
import { ShieldCheck, Activity, Heart } from 'lucide-react';

interface FooterProps {
  onOpenStatusModal?: () => void;
  onOpenPrivacyModal?: () => void;
  onOpenTermsModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenStatusModal,
  onOpenPrivacyModal,
  onOpenTermsModal,
}) => {
  return (
    <footer className="border-t border-zinc-200 dark:border-[#2e2e30] bg-[#fcfcfd] dark:bg-[#0c0c0d] transition-colors text-zinc-600 dark:text-zinc-400">
      {/* ── Main Multi-Column Links Section ──────────────────────── */}
      <div className="max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-start">
          {/* Col 1: Brand & Slogan (2 cols on md) */}
          <div className="col-span-2 space-y-4">
            <LayaMeetLogo size="md" showBadge={true} />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
              Nền tảng họp trực tuyến thông minh đa ngôn ngữ toàn cầu. Phá vỡ mọi rào cản giao tiếp: người tham gia tự do phát biểu tiếng mẹ đẻ và nhận phụ đề bản dịch tức thì theo đúng ngôn ngữ của riêng mình.
            </p>

            {/* Architecture Security Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#18181b] border border-zinc-200 dark:border-[#333336] text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero Raw Audio (RAM-only)</span>
            </div>

            {/* System Status Pill */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-zinc-600 dark:text-zinc-400 text-xs">Tất cả hệ thống: </span>
              <button
                type="button"
                onClick={onOpenStatusModal}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                Hoạt động bình thường
              </button>
            </div>
          </div>

          {/* Col 2: Sản phẩm */}
          <div className="space-y-3 text-xs">
            <div className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">
              Sản Phẩm
            </div>
            <ul className="space-y-2 text-zinc-500 dark:text-zinc-400">
              <li>
                <a href="#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  WebRTC Media Studio
                </a>
              </li>
              <li>
                <a href="#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Phụ đề Faster-Whisper
                </a>
              </li>
              <li>
                <a href="#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Dịch thuật Realtime Redis
                </a>
              </li>
              <li>
                <a href="#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Laya AI Action Items
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Bảng giá &amp; Gói cước
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Câu hỏi thường gặp (FAQ)
                </a>
              </li>
              <li>
                <Link to="/developers" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                  <span>Cổng Nhà Phát Triển (API)</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 border border-blue-500/20">Mới</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Giải pháp */}
          <div className="space-y-3 text-xs">
            <div className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">
              Giải Pháp
            </div>
            <ul className="space-y-2 text-zinc-500 dark:text-zinc-400">
              <li>
                <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Outsourcing Việt - Nhật
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Doanh nghiệp FDI Đa Quốc Gia
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Họp C-Level Bảo Mật Cao
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Triển khai On-Premise LAN
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Đào tạo Từ điển Chuyên ngành
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Pháp lý & Hỗ trợ */}
          <div className="space-y-3 text-xs">
            <div className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">
              Pháp Lý &amp; Hỗ Trợ
            </div>
            <ul className="space-y-2 text-zinc-500 dark:text-zinc-400">
              <li>
                <button
                  type="button"
                  onClick={onOpenPrivacyModal}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                >
                  Chính sách Quyền riêng tư
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenTermsModal}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                >
                  Điều khoản Dịch vụ (ToS)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenStatusModal}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer flex items-center gap-1"
                >
                  <Activity className="w-3 h-3 text-blue-500" />
                  <span>Trạng thái Hệ thống</span>
                </button>
              </li>
              <li>
                <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Liên hệ Kỹ thuật &amp; Báo giá
                </a>
              </li>
              <li>
                <Link to="/admin" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
                  <span>Quản trị &amp; Doanh thu</span>
                </Link>
              </li>
              <li>
                <span className="font-mono text-[10px] text-zinc-400">RFC 7807 Compliant</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Sub-footer Copyright Bar ────────────────────────────── */}
      <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-4 sm:py-5 px-4 sm:px-6 bg-zinc-100/50 dark:bg-[#080809]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-xs text-zinc-500 dark:text-zinc-500 text-center sm:text-left">
          <div>
            <span className="sm:hidden">© 2026 LayaMeet Platform</span>
            <span className="hidden sm:inline">© 2026 LayaMeet Platform (layameet.com). Bản quyền thuộc về Đội ngũ Kỹ thuật.</span>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-3 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="w-3 h-3 text-red-500 fill-red-500 shrink-0" />
              <span className="hidden md:inline">for Global Polyglot Teams (VN · JP · US · CN · TH · LA...)</span>
              <span className="hidden sm:inline md:hidden">for Global Teams</span>
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span className="font-mono">v2.4.0</span>
            <span className="hidden sm:inline font-mono text-[10px] text-zinc-400">(Stable)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
