import { copyText } from '../utils/clipboard';
import React, { useEffect, useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Share2,
  Video,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  BookOpen,
  Sparkles,
  ListOrdered,
  HelpCircle,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { Footer } from '../components/common/Footer';
import { BLOG_POSTS, BlogPost } from '../data/blogPosts';

export const BlogPostPage: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  const lang = post?.lang || 'vi';

  const handleLanguageChange = (newLang: 'vi' | 'en' | 'ja') => {
    // Check if current post has an alternate translation
    if (post?.alternateUrls?.[newLang]) {
      const targetUrl = post.alternateUrls[newLang];
      try {
        const urlObj = new URL(targetUrl);
        navigate(urlObj.pathname);
        return;
      } catch {
        // fallback to standard listing
      }
    }
    // Fallback to guide listing of target language
    if (newLang === 'en') {
      navigate('/en/guide');
    } else if (newLang === 'ja') {
      navigate('/ja/guide');
    } else {
      navigate('/cam-nang');
    }
  };

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const uiTexts = {
    vi: {
      home: 'Trang chủ',
      guide: 'Cẩm nang',
      allGuides: 'Tất cả cẩm nang',
      back: 'Quay lại danh sách cẩm nang',
      share: 'Chia sẻ',
      shareSuccess: 'Đã sao chép liên kết bài viết!',
      meetNow: 'Họp ngay',
      keyTakeawaysTitle: 'Điểm Cốt Lõi (Key Takeaways)',
      tocTitle: 'Mục Lục Bài Viết',
      faqTitle: 'Câu Hỏi Thường Gặp (FAQ)',
      authorVerified: 'Chuyên gia Laya Meet • Kiểm duyệt chất lượng nội dung & bảo mật',
      relatedGuidesTitle: 'Bài Viết Liên Quan Khuyên Đọc',
      ctaTag: 'Thực Hành Ngay',
      ctaTitle: 'Sẵn sàng tổ chức cuộc họp song ngữ tiếp theo của bạn?',
      ctaDesc: 'Khởi tạo phòng họp miễn phí trên Laya Meet chỉ với 1 click. Tự do nói tiếng mẹ đẻ và xem bản dịch hiển thị tức thì.',
      ctaBtn: 'Bắt đầu cuộc họp ngay',
      listingPath: '/cam-nang',
    },
    en: {
      home: 'Home',
      guide: 'Guide',
      allGuides: 'All Guides',
      back: 'Back to Guides',
      share: 'Share',
      shareSuccess: 'Article link copied to clipboard!',
      meetNow: 'Start Meeting',
      keyTakeawaysTitle: 'Key Takeaways',
      tocTitle: 'Table of Contents',
      faqTitle: 'Frequently Asked Questions (FAQ)',
      authorVerified: 'Laya Meet Verified Expert • Content & Security Reviewed',
      relatedGuidesTitle: 'Recommended Related Guides',
      ctaTag: 'Try It Live',
      ctaTitle: 'Ready for your next real-time multilingual meeting?',
      ctaDesc: 'Start a free bilingual room on Laya Meet in 1 click. Speak freely in your native tongue and view instant translations.',
      ctaBtn: 'Start Free Meeting Now',
      listingPath: '/en/guide',
    },
    ja: {
      home: 'ホーム',
      guide: 'ガイド',
      allGuides: 'ガイド一覧',
      back: 'ガイド一覧に戻る',
      share: '共有',
      shareSuccess: 'リンクをクリップボードにコピーしました！',
      meetNow: '会議を開始',
      keyTakeawaysTitle: '重要ポイント（要約）',
      tocTitle: '目次',
      faqTitle: 'よくある質問（FAQ）',
      authorVerified: 'Laya Meet公認専門家 • セキュリティ＆技術検証済み',
      relatedGuidesTitle: 'おすすめの関連ガイド',
      ctaTag: '今すぐ体験',
      ctaTitle: '次世代の多言語オンライン会議を始めませんか？',
      ctaDesc: 'ワンクリックで無料ルームを作成。母国語でそのまま発言し、350ms未満のリアルタイム字幕翻訳を体験できます。',
      ctaBtn: '今すぐ無料で会議を開始',
      listingPath: '/ja/guide',
    },
  }[lang];

  useEffect(() => {
    if (!post) return;

    // Document Title & Core Meta
    document.title = post.seoTitle || `${post.title} | Laya Meet`;

    const setMeta = (attr: string, value: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${value}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, value);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('name', 'description', post.description);
    setMeta('name', 'keywords', post.tags.join(', '));
    setMeta('property', 'og:title', post.title);
    setMeta('property', 'og:description', post.description);
    setMeta('property', 'og:url', post.canonicalUrl);
    setMeta('property', 'og:type', 'article');
    setMeta('property', 'og:site_name', 'Laya Meet');
    setMeta('property', 'article:published_time', post.date);
    setMeta('property', 'article:author', post.author);
    setMeta('property', 'article:section', post.category);
    setMeta('name', 'twitter:title', post.title);
    setMeta('name', 'twitter:description', post.description);
    setMeta('name', 'twitter:card', 'summary_large_image');

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = post.canonicalUrl;

    // Dynamic Hreflang Tags
    const hreflangIds = 'blog-hreflangs';
    let hreflangContainer = document.getElementById(hreflangIds);
    if (!hreflangContainer) {
      hreflangContainer = document.createElement('div');
      hreflangContainer.id = hreflangIds;
      document.head.appendChild(hreflangContainer);
    }
    hreflangContainer.innerHTML = '';

    if (post.alternateUrls) {
      Object.entries(post.alternateUrls).forEach(([altLang, altUrl]) => {
        if (altUrl) {
          const link = document.createElement('link');
          link.rel = 'alternate';
          link.hreflang = altLang;
          link.href = altUrl;
          hreflangContainer?.appendChild(link);
        }
      });
    }

    // Dynamic Multi-Schema Graph (BlogPosting + BreadcrumbList + FAQPage)
    const scriptId = 'blog-post-schema';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const schemaGraph: any[] = [
      {
        '@type': 'BlogPosting',
        '@id': `${post.canonicalUrl}#article`,
        headline: post.title,
        description: post.description,
        url: post.canonicalUrl,
        datePublished: post.date,
        dateModified: post.date,
        inLanguage: lang === 'vi' ? 'vi-VN' : lang === 'ja' ? 'ja-JP' : 'en-US',
        keywords: post.tags.join(', '),
        articleSection: post.category,
        image: 'https://layameet.com/og-image.png',
        author: {
          '@type': 'Organization',
          name: post.author,
          url: 'https://layameet.com/'
        },
        publisher: {
          '@type': 'Organization',
          name: 'Laya Meet',
          url: 'https://layameet.com/',
          logo: {
            '@type': 'ImageObject',
            url: 'https://layameet.com/layameet-icon-192.png'
          }
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': post.canonicalUrl
        }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${post.canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: uiTexts.home,
            item: `https://layameet.com${lang === 'en' ? '/en' : lang === 'ja' ? '/ja' : '/'}`
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: uiTexts.guide,
            item: `https://layameet.com${uiTexts.listingPath}`
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: post.canonicalUrl
          }
        ]
      }
    ];

    if (post.faqs && post.faqs.length > 0) {
      schemaGraph.push({
        '@type': 'FAQPage',
        '@id': `${post.canonicalUrl}#faq`,
        mainEntity: post.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer
          }
        }))
      });
    }

    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': schemaGraph
    });

    window.scrollTo(0, 0);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
      const hEl = document.getElementById(hreflangIds);
      if (hEl) hEl.remove();
    };
  }, [post, lang, uiTexts.guide, uiTexts.home, uiTexts.listingPath]);

  if (!post) {
    return <Navigate to="/cam-nang" replace />;
  }

  const handleShare = async () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.description,
        url: post.canonicalUrl
      }).catch(() => {});
    } else {
      const success = await copyText(window.location.href);
      alert(success ? uiTexts.shareSuccess : `Không thể sao chép tự động. Đường dẫn: ${window.location.href}`);
    }
  };

  const homePath = lang === 'en' ? '/en' : lang === 'ja' ? '/ja' : '/';

  // Find related posts in the same language (excluding current)
  const relatedPosts: BlogPost[] = BLOG_POSTS
    .filter((p) => p.slug !== post.slug && (p.lang || 'vi') === lang)
    .slice(0, 2);

  return (
    <div className="content-page min-h-dvh bg-zinc-50 dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-[#222329] bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to={homePath} className="flex items-center gap-2.5">
            <LayaMeetLogo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to={uiTexts.listingPath}
              className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors inline-flex"
            >
              {uiTexts.allGuides}
            </Link>
            <LanguageSwitcher onSelect={handleLanguageChange} />
            <ThemeToggle />
            <Link
              to={homePath}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{uiTexts.meetNow}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Breadcrumb & Article Header ───────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-4 w-full">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-6">
          <Link to={homePath} className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
            {uiTexts.home}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <Link to={uiTexts.listingPath} className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
            {uiTexts.guide}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[200px] sm:max-w-none">
            {post.category}
          </span>
        </nav>

        {/* Back Link */}
        <Link
          to={uiTexts.listingPath}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{uiTexts.back}</span>
        </Link>

        {/* Article Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-zinc-950 dark:text-white tracking-tight leading-tight mb-4">
          {post.title}
        </h1>

        {/* Post Meta & Share */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-zinc-200 dark:border-[#222329] text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
              <User className="w-3.5 h-3.5 text-blue-500" />
              {post.author}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {post.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {post.readTime}
            </span>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-[#1a1a1d] hover:bg-zinc-200 dark:hover:bg-[#25252a] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{uiTexts.share}</span>
          </button>
        </div>
      </div>

      {/* ── Main Article Body ─────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-16 flex-1 w-full space-y-8">
        {/* Lead Excerpt */}
        <div className="p-5 sm:p-6 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border-l-4 border-l-blue-600 border border-zinc-200 dark:border-zinc-800 text-sm sm:text-base font-normal text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {post.excerpt}
        </div>

        {/* Key Takeaways Box (Google Featured Snippets Booster) */}
        {post.keyTakeaways && post.keyTakeaways.length > 0 && (
          <div className="p-5 sm:p-6 rounded-xl bg-amber-50/50 dark:bg-amber-500/10 border border-amber-500/25 space-y-3.5">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-sm sm:text-base">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{uiTexts.keyTakeawaysTitle}</span>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
              {post.keyTakeaways.map((item, kIdx) => (
                <li key={kIdx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Table of Contents (Mục Lục Nhảy Trực Tiếp) */}
        <div className="p-5 rounded-xl bg-zinc-100/80 dark:bg-[#141518] border border-zinc-200 dark:border-[#222329] space-y-3">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-xs sm:text-sm">
            <ListOrdered className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{uiTexts.tocTitle}</span>
          </div>
          <nav className="grid sm:grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            {post.sections.map((section, idx) => (
              <a
                key={idx}
                href={`#section-${idx + 1}`}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1 py-0.5 flex items-center gap-1.5"
              >
                <span className="text-zinc-400 text-[10px] font-mono">0{idx + 1}.</span>
                <span>{section.heading.replace(/^\d+\.\s*/, '')}</span>
              </a>
            ))}
          </nav>
        </div>

        {/* Content Sections */}
        <article className="space-y-12">
          {post.sections.map((section, idx) => (
            <section key={idx} id={`section-${idx + 1}`} className="space-y-4 scroll-mt-24">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
                {section.heading}
              </h2>

              {section.subheading && (
                <h3 className="text-base sm:text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                  {section.subheading}
                </h3>
              )}

              <div className="space-y-3.5 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {section.paragraphs.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>

              {/* Callout box */}
              {section.callout && (
                <div
                  className={`p-4 sm:p-5 rounded-xl border text-xs sm:text-sm space-y-1.5 my-4 ${
                    section.callout.type === 'tip'
                      ? 'bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-500/25 text-emerald-900 dark:text-emerald-200'
                      : section.callout.type === 'warning'
                      ? 'bg-amber-50/70 dark:bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-200'
                      : 'bg-blue-50/70 dark:bg-blue-500/10 border-blue-500/25 text-blue-900 dark:text-blue-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {section.callout.type === 'tip' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : section.callout.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                    <span>{section.callout.title}</span>
                  </div>
                  <p className="leading-relaxed">{section.callout.text}</p>
                </div>
              )}

              {/* Comparison Table */}
              {section.table && (
                <div className="overflow-x-auto my-6 rounded-2xl border border-zinc-200 dark:border-[#222329] shadow-xs">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead className="bg-zinc-100 dark:bg-[#1a1a1d] text-zinc-900 dark:text-zinc-100 font-semibold border-b border-zinc-200 dark:border-[#222329]">
                      <tr>
                        {section.table.headers.map((h, hIdx) => (
                          <th key={hIdx} className="p-3.5 sm:p-4">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-[#222329] bg-white dark:bg-[#121316]">
                      {section.table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-zinc-50 dark:hover:bg-[#18191e] transition-colors">
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className={`p-3.5 sm:p-4 ${
                                cIdx === 1
                                  ? 'font-semibold text-blue-600 dark:text-blue-400'
                                  : 'text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </article>

        {/* Interactive FAQs Section (Rich Snippets Accordion) */}
        {post.faqs && post.faqs.length > 0 && (
          <section className="pt-8 border-t border-zinc-200 dark:border-[#222329] space-y-4">
            <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-extrabold text-lg sm:text-xl">
              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <h2>{uiTexts.faqTitle}</h2>
            </div>
            <div className="space-y-3">
              {post.faqs.map((faq, fIdx) => {
                const isOpen = expandedFaq === fIdx;
                return (
                  <div
                    key={fIdx}
                    className="rounded-2xl border border-zinc-200 dark:border-[#222329] bg-white dark:bg-[#131417] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isOpen ? null : fIdx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-blue-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed border-t border-zinc-100 dark:border-[#1c1d22]">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* E-E-A-T Author & Privacy Verification Card */}
        <div className="p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-[#222329] bg-white dark:bg-[#131417] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-950 dark:text-white">
                {post.author}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {post.authorRole || uiTexts.authorVerified}
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 text-[11px] font-medium shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% RAM-Only Verified</span>
          </div>
        </div>

        {/* Recommended Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="pt-8 border-t border-zinc-200 dark:border-[#222329] space-y-4">
            <h3 className="font-bold text-base sm:text-lg text-zinc-950 dark:text-white">
              {uiTexts.relatedGuidesTitle}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {relatedPosts.map((rPost, rIdx) => {
                const rPath = `${uiTexts.listingPath}/${rPost.slug}`;
                return (
                  <Link
                    key={rIdx}
                    to={rPath}
                    className="p-5 rounded-2xl border border-zinc-200 dark:border-[#222329] bg-white dark:bg-[#131417] hover:border-blue-500/50 hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-1.5">
                        {rPost.category}
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {rPost.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-3 pt-3 border-t border-zinc-100 dark:border-[#1f2026]">
                      <Clock className="w-3 h-3" />
                      <span>{rPost.readTime}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Post Bottom CTA Card */}
        <div className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-center space-y-4 shadow-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{uiTexts.ctaTag}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold">
            {uiTexts.ctaTitle}
          </h3>
          <p className="text-xs sm:text-sm text-blue-100 max-w-lg mx-auto">
            {uiTexts.ctaDesc}
          </p>
          <div className="pt-2">
            <Link
              to={homePath}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>{uiTexts.ctaBtn}</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
