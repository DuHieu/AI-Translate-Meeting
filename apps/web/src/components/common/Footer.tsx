import React from 'react';
import { Link } from 'react-router-dom';
import { LayaMeetLogo } from './LayaMeetLogo';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/language-context-def';
import { MoitBadge } from './MoitBadge';

interface FooterProps {
  onOpenStatusModal?: () => void;
  onOpenPrivacyModal?: () => void;
  onOpenTermsModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenStatusModal,
  onOpenPrivacyModal: _onOpenPrivacyModal,
  onOpenTermsModal: _onOpenTermsModal,
}) => {
  const { t, language } = useLanguage();
  const f = t.footer;

  const guideLink = language === 'en' ? '/en/guide' : language === 'ja' ? '/ja/guide' : '/cam-nang';

  return (
    <footer data-content-footer="true" className="border-t border-zinc-200 dark:border-[#222328] bg-white dark:bg-[#0b0b0d] text-zinc-600 dark:text-zinc-400 text-xs">
      {/* ── Main Minimalist Footer ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        {/* Top Row: Brand & Product Navigation */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-900">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <LayaMeetLogo size="md" />
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% RAM-Only</span>
              </div>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-md leading-relaxed">
              {f.slogan}
            </p>
          </div>

          {/* Clean Horizontal Links */}
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <Link to="/features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t.nav.features}
            </Link>
            <Link to="/pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t.nav.pricing}
            </Link>
            <Link to="/faq" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t.nav.faq}
            </Link>
            <Link to={guideLink} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {f.guides}
            </Link>
            <Link to="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {language === 'ja' ? '法人導入相談' : language === 'en' ? 'Enterprise Contact' : 'Tư vấn triển khai'}
            </Link>
            <a href="mailto:contact@layameet.com" className="text-blue-600 dark:hover:underline">
              contact@layameet.com
            </a>
          </nav>
        </div>

        {/* Middle Row: Mandatory Policies & Compliance */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-zinc-500 dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Link to="/privacy-policy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {language === 'ja' ? 'プライバシーポリシー' : language === 'en' ? 'Privacy Policy' : 'Chính sách bảo mật'}
            </Link>
            <span>·</span>
            <Link to="/terms-of-service" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {language === 'ja' ? '利用規約' : language === 'en' ? 'Terms of Service' : 'Điều khoản dịch vụ'}
            </Link>
            <span>·</span>
            <Link to="/payment-policy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {language === 'ja' ? '決済ポリシー' : language === 'en' ? 'Payment Policy' : 'Chính sách thanh toán'}
            </Link>
            <span>·</span>
            <Link to="/refund-policy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {language === 'ja' ? '返金ポリシー' : language === 'en' ? 'Refund Policy' : 'Khiếu nại & hoàn tiền'}
            </Link>
            <span>·</span>
            <Link to="/delivery-policy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {language === 'ja' ? 'サービス提供' : language === 'en' ? 'Service Delivery' : 'Giao nhận dịch vụ'}
            </Link>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <MoitBadge size="sm" />
          </div>
        </div>
      </div>

      {/* ── Sub-footer: 1 dòng tinh gọn, mỏng nhẹ ─────────────────── */}
      <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-3 px-4 sm:px-6 bg-zinc-50/70 dark:bg-[#070708]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
          <div>
            © {new Date().getFullYear()} LayaMeet. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400">Tiếng Việt</Link>
            <span>·</span>
            <Link to="/en" className="hover:text-blue-600 dark:hover:text-blue-400">English</Link>
            <span>·</span>
            <Link to="/ja" className="hover:text-blue-600 dark:hover:text-blue-400">日本語</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <button
              type="button"
              onClick={onOpenStatusModal}
              className="inline-flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{f.operational}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
