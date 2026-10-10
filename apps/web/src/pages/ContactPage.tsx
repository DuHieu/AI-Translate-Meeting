import React, { useEffect } from 'react';
import { PublicPageShell } from '../components/common/PublicPageShell';
import { ContactSection } from '../components/home/ContactSection';
import { useLanguage } from '../context/language-context-def';
import { AppLanguage } from '../i18n';

interface ContactPageProps {
  forcedLanguage?: AppLanguage;
}

const CONTACT_PAGE_COPY: Record<string, { breadcrumb: string; pageTitle: string; metaDesc: string }> = {
  vi: {
    breadcrumb: 'Tư vấn Doanh nghiệp & On-Premise',
    pageTitle: 'Tư Vấn Triển Khai On-Premise & Doanh Nghiệp | Laya Meet',
    metaDesc: 'Liên hệ tư vấn kiến trúc họp trực tuyến song ngữ AI On-Premise, đăng ký Demo 1-1 và giải pháp bảo mật dữ liệu RAM-Only cho doanh nghiệp.',
  },
  en: {
    breadcrumb: 'Enterprise On-Premise Consulting',
    pageTitle: 'Enterprise On-Premise & Pilot Consulting | Laya Meet',
    metaDesc: 'Contact the Laya Meet team for custom enterprise deployments, on-premise air-gapped installations, 1-on-1 demos, and SLA contracts.',
  },
  ja: {
    breadcrumb: '法人・オンプレミス導入相談',
    pageTitle: '法人オンプレミス導入相談 & デモ予約 | Laya Meet',
    metaDesc: 'Laya Meet法人向けオンプレミス導入相談・1対1デモのご予約。社内専用サーバーへの完全独立導入、NDA締結、SLA保証。',
  },
};

export const ContactPage: React.FC<ContactPageProps> = ({ forcedLanguage }) => {
  const { language } = useLanguage();
  const currentLang = forcedLanguage || language;
  const copy = CONTACT_PAGE_COPY[currentLang] || CONTACT_PAGE_COPY.vi;

  useEffect(() => {
    document.title = copy.pageTitle;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', copy.metaDesc);
    }
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', 'https://layameet.com/contact');
    }
  }, [copy]);

  return (
    <PublicPageShell
      forcedLanguage={forcedLanguage}
      activeDrawerId="contact"
      breadcrumbs={[
        {
          label: copy.breadcrumb,
          current: true,
        },
      ]}
    >
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <ContactSection />
      </div>
    </PublicPageShell>
  );
};

export default ContactPage;
