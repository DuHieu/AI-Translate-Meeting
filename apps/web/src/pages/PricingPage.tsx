import React, { useEffect } from 'react';
import { PublicPageShell } from '../components/common/PublicPageShell';
import { PricingSection } from '../components/home/PricingSection';
import { useLanguage } from '../context/language-context-def';
import { AppLanguage } from '../i18n';

interface PricingPageProps {
  forcedLanguage?: AppLanguage;
}

const PRICING_PAGE_COPY: Record<string, { breadcrumb: string; pageTitle: string; metaDesc: string }> = {
  vi: {
    breadcrumb: 'Bảng giá & Gói dịch vụ',
    pageTitle: 'Bảng Giá & Gói Dịch Vụ AI | Laya Meet',
    metaDesc: 'Bảng giá dịch vụ họp trực tuyến song ngữ AI Laya Meet. Đăng ký gói Cá nhân hoặc Doanh nghiệp với nhận dạng giọng nói <350ms và bảo mật RAM-Only.',
  },
  en: {
    breadcrumb: 'Pricing & Plans',
    pageTitle: 'Pricing & AI Meeting Plans | Laya Meet',
    metaDesc: 'Explore flexible pricing plans for Laya Meet real-time AI bilingual meetings. Subtitle translation <350ms, enterprise custom glossaries, and 100% RAM-only security.',
  },
  ja: {
    breadcrumb: '料金プラン',
    pageTitle: '料金プラン & AI機能 | Laya Meet',
    metaDesc: 'Laya Meet AI多言語オンライン会議の料金プラン。超低遅延リアルタイム字幕翻訳（350ms未満）、完全RAM-onlyセキュリティ、企業専用辞書。',
  },
};

export const PricingPage: React.FC<PricingPageProps> = ({ forcedLanguage }) => {
  const { language } = useLanguage();
  const currentLang = forcedLanguage || language;
  const copy = PRICING_PAGE_COPY[currentLang] || PRICING_PAGE_COPY.vi;

  useEffect(() => {
    document.title = copy.pageTitle;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', copy.metaDesc);
    }
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', `https://layameet.com/pricing`);
    }
  }, [copy]);

  return (
    <PublicPageShell
      forcedLanguage={forcedLanguage}
      activeDrawerId="pricing"
      breadcrumbs={[
        {
          label: copy.breadcrumb,
          current: true,
        },
      ]}
    >
      <div className="w-full pb-16">
        <PricingSection />
      </div>
    </PublicPageShell>
  );
};

export default PricingPage;
