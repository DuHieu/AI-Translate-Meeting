import React from 'react';
import { Link } from 'react-router-dom';
import { LayaMeetLogo } from './LayaMeetLogo';
import { ShieldCheck, Activity, Heart } from 'lucide-react';
import { useLanguage } from '../../context/language-context-def';
import { BUSINESS_INFO } from '../../config/businessInfo';
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
    <footer data-content-footer="true" className="border-t border-zinc-200 dark:border-[#2e2e30] bg-[#fcfcfd] dark:bg-[#0c0c0d] transition-colors text-zinc-600 dark:text-zinc-400">
      {/* ── Main Multi-Column Links Section ──────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-start">
          {/* Col 1: Brand & Slogan (2 cols on md) */}
          <div className="col-span-2 space-y-4">
            <LayaMeetLogo size="md" showBadge={true} />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
              {f.slogan}
            </p>

            {/* Architecture Security Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#18181b] border border-zinc-200 dark:border-[#333336] text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{f.ramOnlyBadge}</span>
            </div>

            {/* System Status Pill */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-zinc-600 dark:text-zinc-400 text-xs">{f.allSystems}</span>
              <button
                type="button"
                onClick={onOpenStatusModal}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                {f.operational}
              </button>
            </div>
          </div>

          {/* Col 2: Sản phẩm */}
          <div className="space-y-3 text-xs">
            <div className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">
              {f.productCol}
            </div>
            <ul className="space-y-2 text-zinc-500 dark:text-zinc-400">
              <li>
                <a href="#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.mediaStudio}
                </a>
              </li>
              <li>
                <a href="#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.fasterWhisper}
                </a>
              </li>
              <li>
                <a href="#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.realtimeRedis}
                </a>
              </li>
              <li>
                <a href="#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.layaActionItems}
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.pricingPlans}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.faq}
                </a>
              </li>
              <li>
                <Link to="/developers" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                  <span>{f.devApi}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 border border-blue-500/20">{f.newBadge}</span>
                </Link>
              </li>
              <li>
                <Link to={guideLink} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.guides}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Giải pháp */}
          <div className="space-y-3 text-xs">
            <div className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">
              {f.solutionCol}
            </div>
            <ul className="space-y-2 text-zinc-500 dark:text-zinc-400">
              <li>
                <Link to="/hop-song-ngu-tieng-nhat" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.bilingualVnJp}
                </Link>
              </li>
              <li>
                <Link to="/hop-song-ngu-tieng-anh" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.bilingualVnEn}
                </Link>
              </li>
              <li>
                <Link to="/hop-song-ngu-tieng-trung" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.bilingualVnZh}
                </Link>
              </li>
              <li>
                <Link to="/hop-song-ngu-tieng-han" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.bilingualVnKo}
                </Link>
              </li>
              <li>
                <Link to="/so-sanh/layameet-vs-zoom" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.compareZoom}
                </Link>
              </li>
              <li>
                <Link to="/so-sanh/layameet-vs-google-meet" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.compareMeet}
                </Link>
              </li>
              <li>
                <Link to="/cam-nang/hop-song-ngu-viet-nhat-khong-can-phien-dich-vien" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.tipsVnJp}
                </Link>
              </li>
              <li>
                <Link to="/cam-nang/so-sanh-chi-tiet-layameet-vs-zoom-ai" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.reviewZoomAi}
                </Link>
              </li>
              <li>
                <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.cLevelSecurity}
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.onPremLan}
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.glossaryTraining}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Pháp lý & Chính Sách Bắt Buộc (Bộ Công Thương) */}
          <div className="space-y-3 text-xs">
            <div className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">
              {language === 'ja' ? '法的情報・ポリシー' : language === 'en' ? 'Legal & Policies' : 'Chính Sách & Pháp Lý'}
            </div>
            <ul className="space-y-2 text-zinc-500 dark:text-zinc-400">
              <li>
                <Link
                  to="/payment-policy"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium block"
                >
                  {language === 'ja' ? '決済ポリシー & 請求書' : language === 'en' ? 'Payment Policy & Invoicing' : 'Chính sách thanh toán'}
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy-policy"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium block"
                >
                  {language === 'ja' ? '個人情報保護方針' : language === 'en' ? 'Privacy Policy' : 'Chính sách bảo mật'}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-of-service"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium block"
                >
                  {language === 'ja' ? '利用規約' : language === 'en' ? 'Terms of Service' : 'Điều khoản dịch vụ'}
                </Link>
              </li>
              <li>
                <Link
                  to="/refund-policy"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium block"
                >
                  {language === 'ja' ? '返金・苦情解決ポリシー' : language === 'en' ? 'Dispute & Refund Policy' : 'Khiếu nại & Hoàn tiền'}
                </Link>
              </li>
              <li>
                <Link
                  to="/delivery-policy"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium block"
                >
                  {language === 'ja' ? 'サービス提供・有効化' : language === 'en' ? 'Digital Service Delivery' : 'Cung cấp & Giao nhận dịch vụ'}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('layameet:open-cookie-settings'))}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                >
                  {f.cookieSettings}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenStatusModal}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer flex items-center gap-1"
                >
                  <Activity className="w-3 h-3 text-blue-500" />
                  <span>{f.systemStatus}</span>
                </button>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {f.contactSales}
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
                  <span>{f.adminDashboard}</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Official Business Owner Information & MOIT Seal ── */}
        <div className="mt-10 pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="space-y-1.5 max-w-3xl leading-relaxed">
            <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              {BUSINESS_INFO.companyName}
            </div>
            <div>
              <strong>Người đại diện theo pháp luật:</strong> {BUSINESS_INFO.legalRepresentative} · <strong>Mã số doanh nghiệp:</strong> {BUSINESS_INFO.taxId} ({BUSINESS_INFO.taxIssuedPlace} cấp ngày {BUSINESS_INFO.taxIssuedDate})
            </div>
            <div>
              <strong>Trụ sở chính:</strong> {BUSINESS_INFO.address}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                <strong>Hotline / Zalo:</strong> <a href={`tel:${BUSINESS_INFO.hotline.replace(/\s+/g, '')}`} className="text-blue-600 dark:text-blue-400 hover:underline">{BUSINESS_INFO.hotline}</a>
              </span>
              <span>
                <strong>Email:</strong> <a href={`mailto:${BUSINESS_INFO.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">{BUSINESS_INFO.email}</a>
              </span>
              <span>
                <strong>Giờ làm việc:</strong> {BUSINESS_INFO.workingHours}
              </span>
            </div>
          </div>
          <div className="shrink-0">
            <MoitBadge />
          </div>
        </div>
      </div>

      {/* ── Sub-footer Copyright & Language Bar ─────────────────── */}
      <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-4 sm:py-5 px-4 sm:px-6 bg-zinc-100/50 dark:bg-[#080809]">
        <div className="max-w-7xl mx-auto space-y-2.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-xs text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <div>
                <span>{f.copyright}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Tiếng Việt</Link>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <Link to="/ja" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">日本語</Link>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <Link to="/en" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">English</Link>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <Link to="/en/guide" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">EN Guides</Link>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <Link to="/ja/guide" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">JP ガイド</Link>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <span>{f.madeWith}</span>
                <Heart className="w-3 h-3 text-red-500 fill-red-500 shrink-0" />
                <span className="hidden md:inline">{f.forPolyglotTeams}</span>
                <span className="hidden sm:inline md:hidden">for Global Teams</span>
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="font-mono">v2.4.0</span>
              <span className="hidden sm:inline font-mono text-[10px] text-zinc-400">(Stable)</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
