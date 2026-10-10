import React, { useEffect } from 'react';
import { PublicPageShell } from '../components/common/PublicPageShell';
import { FAQSection } from '../components/home/FAQSection';
import { useLanguage } from '../context/language-context-def';
import { AppLanguage } from '../i18n';

interface FaqPageProps {
  forcedLanguage?: AppLanguage;
}

const FAQ_PAGE_COPY = {
  vi: {
    breadcrumb: 'Hỏi đáp (FAQ)',
    pageTitle: 'Câu Hỏi Thường Gặp & Giải Đáp Kỹ Thuật | Laya Meet',
    metaDesc: 'Giải đáp các thắc mắc thường gặp về nền tảng họp trực tuyến song ngữ AI Laya Meet: ma trận Any-to-Any, độ trễ dịch thuật <350ms, và bảo mật RAM-Only.',
  },
  en: {
    breadcrumb: 'FAQ',
    pageTitle: 'Frequently Asked Questions & Answers | Laya Meet',
    metaDesc: 'Answers to common questions about Laya Meet real-time AI bilingual meetings: Any-to-Any polyglot matrix, sub-350ms latency, and RAM-only security.',
  },
  ja: {
    breadcrumb: 'よくある質問 (FAQ)',
    pageTitle: 'よくある質問と技術仕様 | Laya Meet',
    metaDesc: 'Laya Meet AI多言語Web会議プラットフォームに関するよくある質問：リアルタイム字幕翻訳の仕組み、遅延350ms未満、完全RAM-onlyセキュリティ。',
  },
};

export const FaqPage: React.FC<FaqPageProps> = ({ forcedLanguage }) => {
  const { language } = useLanguage();
  const currentLang = forcedLanguage || language;
  const copy = FAQ_PAGE_COPY[currentLang] || FAQ_PAGE_COPY.vi;

  useEffect(() => {
    document.title = copy.pageTitle;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', copy.metaDesc);
    }
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', 'https://layameet.com/faq');
    }
  }, [copy]);

  return (
    <PublicPageShell
      forcedLanguage={forcedLanguage}
      activeDrawerId="faq"
      breadcrumbs={[
        {
          label: copy.breadcrumb,
          current: true,
        },
      ]}
    >
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <FAQSection />
      </div>
    </PublicPageShell>
  );
};

export default FaqPage;
