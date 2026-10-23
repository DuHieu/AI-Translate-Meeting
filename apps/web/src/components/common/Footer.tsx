import React from 'react';
import { Link } from 'react-router-dom';
import { LayaMeetLogo } from './LayaMeetLogo';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/language-context-def';
import { PAYMENT_ENABLED } from '../../config/featureFlags';

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
    <footer
      data-content-footer="true"
      className="border-t border-zinc-200 dark:border-[#1E2025] bg-[#FAF9F6] dark:bg-[#0D0E11] text-zinc-600 dark:text-zinc-400 text-xs font-sans"
    >
      {/* ── Architectural Hairline Footer ────────────────────────── */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10 space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-zinc-200/80 dark:border-[#1E2025]">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <LayaMeetLogo size="md" />
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-[#17191D] border border-zinc-200 dark:border-[#262930] text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                <span>100% RAM-Only</span>
              </div>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-md leading-relaxed">
              {f.slogan}
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <Link to="/features" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
              {t.nav.features}
            </Link>
            {PAYMENT_ENABLED && (
              <Link to="/pricing" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
                {t.nav.pricing}
              </Link>
            )}
            <Link to="/faq" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
              {t.nav.faq}
            </Link>
            <Link to={guideLink} className="hover:text-zinc-950 dark:hover:text-white transition-colors">
              {f.guides}
            </Link>
            <Link to="/contact" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
              {language === 'ja' ? '法人導入相談' : language === 'en' ? 'Enterprise Contact' : 'Tư vấn triển khai'}
            </Link>
            <a href="mailto:contact@layameet.com" className="text-blue-600 dark:text-blue-400 hover:underline font-mono">
              contact@layameet.com
            </a>
          </nav>
        </div>

        {/* Legal & Compliance Links */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-zinc-500 dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <Link to="/privacy-policy" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              {language === 'ja' ? 'プライバシーポリシー' : language === 'en' ? 'Privacy Policy' : 'Chính sách bảo mật'}
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <Link to="/terms-of-service" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              {language === 'ja' ? '利用規約' : language === 'en' ? 'Terms of Service' : 'Điều khoản dịch vụ'}
            </Link>
            {PAYMENT_ENABLED && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <Link to="/payment-policy" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                  {language === 'ja' ? '決済ポリシー' : language === 'en' ? 'Payment Policy' : 'Chính sách thanh toán'}
                </Link>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <Link to="/refund-policy" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                  {language === 'ja' ? '返金ポリシー' : language === 'en' ? 'Refund Policy' : 'Khiếu nại & hoàn tiền'}
                </Link>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <Link to="/delivery-policy" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                  {language === 'ja' ? 'サービス提供' : language === 'en' ? 'Service Delivery' : 'Giao nhận dịch vụ'}
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/" className="hover:text-zinc-900 dark:hover:text-zinc-200">Tiếng Việt</Link>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <Link to="/en" className="hover:text-zinc-900 dark:hover:text-zinc-200">English</Link>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <Link to="/ja" className="hover:text-zinc-900 dark:hover:text-zinc-200">日本語</Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <button
              type="button"
              onClick={onOpenStatusModal}
              className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{f.operational}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-footer */}
      <div className="border-t border-zinc-200/80 dark:border-[#1E2025] py-3.5 px-5 sm:px-8 lg:px-12 bg-zinc-100/50 dark:bg-[#090A0C]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-500">
          <div>
            © {new Date().getFullYear()} LayaMeet AI Technologies. All rights reserved.
          </div>
          <div className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
            WASAPI Audio Loopback · Sherpa-ONNX &amp; Faster-Whisper Runtime
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
