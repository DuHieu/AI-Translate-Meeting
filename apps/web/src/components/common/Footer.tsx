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
      {/* ── Main Clean Footer Grid ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
          {/* Cột 1: Thương hiệu, Thông tin chủ sở hữu & Liên hệ (6 cột) */}
          <div className="md:col-span-6 space-y-2.5">
            <LayaMeetLogo size="md" />
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm leading-relaxed">
              {f.slogan}
            </p>

            <div className="pt-0.5 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                {language === 'ja' ? 'お問い合わせ:' : language === 'en' ? 'Support:' : 'Hỗ trợ:'}{' '}
                <a href="mailto:contact@layameet.com" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  contact@layameet.com
                </a>
              </span>
              <span>·</span>
              <Link to="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {language === 'ja' ? '法人導入相談' : language === 'en' ? 'Enterprise Contact' : 'Tư vấn triển khai'}
              </Link>
            </div>

            <div className="pt-1.5 flex items-center gap-2.5">
              <MoitBadge size="sm" />
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% RAM-Only</span>
              </div>
            </div>
          </div>

          {/* Cột 2 & 3: Song song 2 cột trên Mobile để cắt giảm 50% chiều dài trang */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:contents">
            {/* Cột 2: Sản phẩm (3 cột trên desktop) */}
            <div className="md:col-span-3 space-y-2">
              <div className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">
                {f.productCol}
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <li>
                  <Link to="/features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t.nav.features}
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t.nav.pricing}
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t.nav.faq}
                  </Link>
                </li>
                <li>
                  <Link to={guideLink} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {f.guides}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Cột 3: Chính sách bắt buộc Bộ Công Thương (3 cột trên desktop) */}
            <div className="md:col-span-3 space-y-2">
              <div className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">
                {language === 'ja' ? '法的ポリシー' : language === 'en' ? 'Legal & Policies' : 'Chính Sách & Quy Định'}
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <li>
                  <Link to="/payment-policy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {language === 'ja' ? '決済ポリシー' : language === 'en' ? 'Payment Policy' : 'Chính sách thanh toán'}
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {language === 'ja' ? 'プライバシー' : language === 'en' ? 'Privacy Policy' : 'Chính sách bảo mật'}
                  </Link>
                </li>
                <li>
                  <Link to="/terms-of-service" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {language === 'ja' ? '利用規約' : language === 'en' ? 'Terms of Service' : 'Điều khoản dịch vụ'}
                  </Link>
                </li>
                <li>
                  <Link to="/refund-policy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {language === 'ja' ? '返金ポリシー' : language === 'en' ? 'Refund Policy' : 'Khiếu nại & hoàn tiền'}
                  </Link>
                </li>
                <li>
                  <Link to="/delivery-policy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {language === 'ja' ? 'サービス提供' : language === 'en' ? 'Service Delivery' : 'Giao nhận dịch vụ'}
                  </Link>
                </li>
              </ul>
            </div>
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
