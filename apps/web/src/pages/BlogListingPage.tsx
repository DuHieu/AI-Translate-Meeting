import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  ArrowRight,
  Sparkles,
  Tag,
  Calendar,
  User,
  ShieldCheck,
  Video
} from 'lucide-react';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { Footer } from '../components/common/Footer';
import { BLOG_POSTS } from '../data/blogPosts';

export interface BlogListingPageProps {
  forcedLanguage?: 'vi' | 'en' | 'ja';
}

export const BlogListingPage: React.FC<BlogListingPageProps> = ({ forcedLanguage = 'vi' }) => {
  const navigate = useNavigate();
  const lang = forcedLanguage;

  const handleLanguageChange = (newLang: 'vi' | 'en' | 'ja') => {
    if (newLang === 'en') {
      navigate('/en/guide');
    } else if (newLang === 'ja') {
      navigate('/ja/guide');
    } else {
      navigate('/cam-nang');
    }
  };

  const contentMap = {
    vi: {
      pageTitle: 'Cẩm Nang & Hướng Dẫn Họp Trực Tuyến Song Ngữ AI | LayaMeet',
      pageDesc: 'Tổng hợp các bài viết chuyên sâu, cẩm nang tổ chức cuộc họp song ngữ Việt - Nhật, Việt - Anh và so sánh giải pháp họp trực tuyến AI thời gian thực.',
      badge: 'Cẩm Nang & Kiến Thức Chuyên Sâu',
      heading: 'Giải Pháp Họp Trực Tuyến & Dịch Thuật AI Song Ngữ',
      subheading: 'Khám phá các hướng dẫn thực tiễn, phân tích công nghệ Faster-Whisper và kinh nghiệm tối ưu hóa giao tiếp đa ngôn ngữ trong doanh nghiệp và dự án quốc tế.',
      readArticle: 'Đọc bài',
      createRoom: 'Tạo phòng họp',
      homePath: '/',
      articlePrefix: '/cam-nang/',
    },
    en: {
      pageTitle: 'Guides & Insights on Real-Time AI Meeting Translation | LayaMeet',
      pageDesc: 'Comprehensive guides, architectural deep dives, and comparisons on real-time multilingual meetings, Whisper AI, and WebRTC streaming.',
      badge: 'Guides & Engineering Insights',
      heading: 'Real-Time AI Multilingual Meeting Solutions',
      subheading: 'Discover practical guides, technical benchmarks, and strategies to eliminate language barriers across global engineering teams and remote boards.',
      readArticle: 'Read article',
      createRoom: 'Start Meeting',
      homePath: '/en',
      articlePrefix: '/en/guide/',
    },
    ja: {
      pageTitle: 'AI多言語オンライン会議・リアルタイム字幕翻訳ガイド | LayaMeet',
      pageDesc: '日越オフショア開発やグローバル商談における言葉の壁を解消する実践的ガイドと技術アーキテクチャ解説。',
      badge: 'ガイド＆技術解説',
      heading: 'リアルタイムAI多言語オンライン会議ソリューション',
      subheading: '遅延350ms未満の音声認識、完全RAMメモリ処理、自動議事録作成を活用した次世代の会議手法をご紹介します。',
      readArticle: '記事を読む',
      createRoom: '会議を開始',
      homePath: '/ja',
      articlePrefix: '/ja/guide/',
    },
  }[lang];

  useEffect(() => {
    document.title = contentMap.pageTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', contentMap.pageDesc);
    }
    window.scrollTo(0, 0);
  }, [contentMap]);

  // Filter posts based on current language
  const filteredPosts = BLOG_POSTS.filter((p) => (p.lang || 'vi') === lang);

  return (
    <div className="content-page min-h-dvh bg-zinc-50 dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* ── Top Navigation ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-[#222329] bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to={contentMap.homePath} className="flex items-center gap-2.5">
            <LayaMeetLogo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/developers"
              className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors inline-flex"
            >
              Developers API
            </Link>
            <LanguageSwitcher onSelect={handleLanguageChange} />
            <ThemeToggle />
            <Link
              to={contentMap.homePath}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{contentMap.createRoom}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Banner ───────────────────────────────────────────── */}
      <section className="relative py-14 md:py-20 border-b border-zinc-200 dark:border-[#222329] bg-gradient-to-b from-blue-50/50 via-zinc-50 to-zinc-50 dark:from-blue-950/10 dark:via-[#0c0c0e] dark:to-[#0c0c0e]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{contentMap.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            {contentMap.heading}
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            {contentMap.subheading}
          </p>
        </div>
      </section>

      {/* ── Main Articles Grid ────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 flex-1 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredPosts.map((post) => (
            <article
              key={post.slug}
              className="group flex flex-col justify-between p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-[#222329] bg-white dark:bg-[#14151a] shadow-xs hover:border-blue-500/40 hover:shadow-lg dark:hover:border-blue-500/30 transition-all duration-200"
            >
              <div className="space-y-4">
                {/* Category & Read Time */}
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[11px]">
                    <Sparkles className="w-3 h-3" />
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  <Link to={`${contentMap.articlePrefix}${post.slug}`}>{post.title}</Link>
                </h2>

                {/* Excerpt */}
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {post.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-[#1e1f26] text-[11px] font-medium text-zinc-600 dark:text-zinc-400"
                    >
                      <Tag className="w-2.5 h-2.5 text-zinc-400" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Meta & Link */}
              <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-[#222329] flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {post.author}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {post.date}
                  </span>
                </div>

                <Link
                  to={`${contentMap.articlePrefix}${post.slug}`}
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform"
                >
                  <span>{contentMap.readArticle}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Banner CTA Box */}
        <div className="mt-16 p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center sm:text-left max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? '100% RAM-only Privacy' : lang === 'ja' ? '完全RAMメモリ処理（高セキュリティ）' : 'Bảo mật 100% RAM-only'}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold">
              {lang === 'en'
                ? 'Experience Real-Time AI Bilingual Meetings Today'
                : lang === 'ja'
                ? '今すぐAIリアルタイム多言語会議を無料体験'
                : 'Trải nghiệm họp song ngữ AI tức thì ngay bây giờ'}
            </h3>
            <p className="text-xs sm:text-sm text-blue-100">
              {lang === 'en'
                ? 'Zero installation, no account needed. Start a meeting and invite international peers in 5 seconds.'
                : lang === 'ja'
                ? 'インストール不要・登録不要。5秒でルームを作成し海外クライアントを招待可能。'
                : 'Không cần cài đặt, không cần đăng ký tài khoản. Tạo phòng họp và mời đối tác quốc tế tham gia chỉ trong 5 giây.'}
            </p>
          </div>
          <Link
            to={contentMap.homePath}
            className="px-6 py-3.5 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm shadow-md transition-all shrink-0 cursor-pointer"
          >
            {contentMap.createRoom}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};
