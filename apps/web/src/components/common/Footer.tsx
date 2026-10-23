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
      className="border-t border-slate-300/80 dark:border-slate-800 bg-[#D8DEE6] dark:bg-[#0D1117] text-slate-600 dark:text-slate-400 text-xs font-sans"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7 space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-300/70 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <LayaMeetLogo size="sm" />
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-900/10 dark:bg-teal-950/50 border border-teal-700/20 dark:border-teal-800 text-[11px] font-medium text-[#0F766E] dark:text-teal-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400" />
              <span>100% RAM-Only</span>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <Link to="/features" className="hover:text-[#0F766E] dark:hover:text-teal-400 transition-colors">
              {t.nav.features}
            </Link>
            {PAYMENT_ENABLED && (
              <Link to="/pricing" className="hover:text-[#0F766E] dark:hover:text-teal-400 transition-colors">
                {t.nav.pricing}
              </Link>
            )}
            <Link to="/faq" className="hover:text-[#0F766E] dark:hover:text-teal-400 transition-colors">
              {t.nav.faq}
            </Link>
            <Link to={guideLink} className="hover:text-[#0F766E] dark:hover:text-teal-400 transition-colors">
              {f.guides}
            </Link>
            <Link to="/contact" className="hover:text-[#0F766E] dark:hover:text-teal-400 transition-colors">
              {language === 'ja' ? '法人相談' : language === 'en' ? 'Contact' : 'Liên hệ'}
            </Link>
            <a href="mailto:contact@layameet.com" className="text-[#0F766E] dark:text-teal-400 hover:underline font-mono">
              contact@layameet.com
            </a>
          </nav>
        </div>

        {/* Legal & Compliance Links */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <Link to="/privacy-policy" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              {language === 'ja' ? 'プライバシー' : language === 'en' ? 'Privacy' : 'Bảo mật'}
            </Link>
            <span className="text-slate-400 dark:text-slate-700">·</span>
            <Link to="/terms-of-service" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              {language === 'ja' ? '利用規約' : language === 'en' ? 'Terms' : 'Điều khoản'}
            </Link>
            {PAYMENT_ENABLED && (
              <>
                <span className="text-slate-400 dark:text-slate-700">·</span>
                <Link to="/payment-policy" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                  {language === 'ja' ? '決済' : language === 'en' ? 'Payment' : 'Thanh toán'}
                </Link>
                <span className="text-slate-400 dark:text-slate-700">·</span>
                <Link to="/refund-policy" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                  {language === 'ja' ? '返金' : language === 'en' ? 'Refund' : 'Hoàn tiền'}
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-3.5 text-[11px]">
            <Link to="/" className="hover:text-slate-900 dark:hover:text-slate-200">VI</Link>
            <span className="text-slate-400 dark:text-slate-700">·</span>
            <Link to="/en" className="hover:text-slate-900 dark:hover:text-slate-200">EN</Link>
            <span className="text-slate-400 dark:text-slate-700">·</span>
            <Link to="/ja" className="hover:text-slate-900 dark:hover:text-slate-200">JA</Link>
            <span className="text-slate-400 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={onOpenStatusModal}
              className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{f.operational}</span>
            </button>
            <span className="text-slate-400 dark:text-slate-700">|</span>
            <span>© {new Date().getFullYear()} LayaMeet</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
