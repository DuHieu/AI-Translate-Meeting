import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const templatePath = path.join(distDir, 'index.html');

const ROUTES = [
  {
    route: 'developers',
    title: 'Cổng Nhà Phát Triển & WebRTC API Documentation | layameet.com',
    description: 'Tài liệu tích hợp REST API, WebSocket Subtitle Streaming và WebRTC SDK cho nền tảng họp trực tuyến song ngữ AI LayaMeet.',
    canonical: 'https://layameet.com/developers',
    ogTitle: 'LayaMeet Developers API - Tích Hợp WebRTC & Subtitles Stream',
    ogDescription: 'Hướng dẫn kết nối WebSocket Audio Streaming, tạo phòng họp và trích xuất phụ đề dịch song ngữ thời gian thực.',
  },
  {
    route: 'hop-song-ngu-tieng-nhat',
    title: 'Họp Song Ngữ Tiếng Nhật AI - Dịch Trực Tiếp Việt - Nhật <350ms | LayaMeet',
    description: 'Phần mềm họp trực tuyến song ngữ Việt - Nhật thời gian thực. Tự do nói tiếng mẹ đẻ, phụ đề AI dịch hai chiều <350ms, tự động ghi biên bản họp cho kỹ sư BrSE và IT Comtor.',
    canonical: 'https://layameet.com/hop-song-ngu-tieng-nhat',
    ogTitle: 'Họp Song Ngữ Tiếng Nhật AI - Dịch Trực Tiếp Việt - Nhật Thời Gian Thực',
    ogDescription: 'Xóa bỏ rào cản ngôn ngữ với đối tác Nhật Bản. Phụ đề Faster-Whisper độ trễ <350ms, trích xuất Action Items tự động.',
  },
  {
    route: 'hop-song-ngu-tieng-anh',
    title: 'Họp Trực Tuyến Song Ngữ Tiếng Anh AI - Dịch Trực Tiếp Việt - Anh <350ms | LayaMeet',
    description: 'Nền tảng họp trực tuyến song ngữ tiếng Anh thời gian thực. Tự do nói tiếng Việt, đối tác nhận phụ đề tiếng Anh <350ms, bảo mật On-Premise RAM-only.',
    canonical: 'https://layameet.com/hop-song-ngu-tieng-anh',
    ogTitle: 'Họp Trực Tuyến Song Ngữ Tiếng Anh AI - Dịch Trực Tiếp Việt - Anh Real-Time',
    ogDescription: 'Tự tin đàm phán với đối tác quốc tế. Phụ đề tiếng Anh tức thì, không rào cản từ vựng, bảo mật 100% RAM-only.',
  },
  {
    route: 'so-sanh/layameet-vs-zoom',
    title: 'So Sánh LayaMeet vs Zoom: Nền Tảng Họp Song Ngữ AI <350ms, RAM-Only | LayaMeet',
    description: 'So sánh chi tiết LayaMeet vs Zoom Meetings. Đối chiếu tốc độ phụ đề dịch song ngữ (<350ms vs >2s), tính năng ghi biên bản họp tự động, bảo mật RAM-only và chi phí triển khai.',
    canonical: 'https://layameet.com/so-sanh/layameet-vs-zoom',
    ogTitle: 'So Sánh LayaMeet vs Zoom: Lựa Chọn Nào Tối Ưu Cho Cuộc Họp Đa Ngôn Ngữ?',
    ogDescription: 'Phân tích chi tiết độ trễ phụ đề dịch thuật, bảo mật RAM-only không lưu âm thanh và trích xuất Action Items tự động giữa LayaMeet và Zoom.',
  },
  {
    route: 'so-sanh/layameet-vs-google-meet',
    title: 'So Sánh LayaMeet vs Google Meet: Giải Pháp Họp Song Ngữ Tức Thì | LayaMeet',
    description: 'So sánh chi tiết LayaMeet vs Google Meet. Phụ đề dịch hai chiều thời gian thực tiếng Việt - Nhật - Anh <350ms, tự động trích xuất Action Items và bảo mật RAM-only.',
    canonical: 'https://layameet.com/so-sanh/layameet-vs-google-meet',
    ogTitle: 'So Sánh LayaMeet vs Google Meet: Đâu Là Công Cụ Họp Song Ngữ Tốt Hơn?',
    ogDescription: 'Đối chiếu tính năng phụ đề dịch song ngữ tức thì hai chiều, quyền riêng tư dữ liệu và biên bản cuộc họp giữa LayaMeet và Google Meet.',
  },
  {
    route: 'ja',
    lang: 'ja',
    title: 'LayaMeet - AI多言語オンライン会議＆リアルタイム字幕翻訳 | layameet.com',
    description: '超低遅延AI多言語Web会議プラットフォーム。ベトナム語・日本語・英語のリアルタイム双方向字幕翻訳（遅延350ms未満）、完全RAMメモリ処理（音声ファイル保存なし）、自動議事録・Action Items抽出。',
    canonical: 'https://layameet.com/ja',
    ogTitle: 'LayaMeet - AI多言語オンライン会議＆リアルタイム字幕翻訳',
    ogDescription: '母国語で、想いをそのままに。超低遅延リアルタイム字幕翻訳と完全RAM-onlyセキュリティの次世代会議システム。',
  },
  {
    route: 'en',
    lang: 'en',
    title: 'LayaMeet - Real-Time AI Bilingual Meeting & Live Subtitle Translation | layameet.com',
    description: 'Ultra-low latency AI multilingual video meeting platform. Real-time bilingual subtitle translation (<350ms), 100% RAM-only audio processing (zero file storage), and instant meeting minutes with Action Items.',
    canonical: 'https://layameet.com/en',
    ogTitle: 'LayaMeet - Real-Time AI Bilingual Meeting & Live Subtitles',
    ogDescription: 'Speak freely in your native language with instant bilingual subtitles (<350ms) and zero raw audio storage (RAM-only).',
  },
];

async function generatePrerenderPages() {
  console.log('⚡ Generating Static Pre-rendered HTML files for Crawlers & Social Bots...\n');
  const template = await readFile(templatePath, 'utf8');

  for (const page of ROUTES) {
    const targetDir = path.join(distDir, page.route);
    await mkdir(targetDir, { recursive: true });

    let html = template;

    // Replace HTML Lang if localized
    if (page.lang) {
      html = html.replace(/<html\s+lang=["'][^"']*["']/i, `<html lang="${page.lang}"`);
    }

    // Replace Title
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${page.title}</title>`);

    // Replace Meta Description
    html = html.replace(/<meta\s+name=["']description["']\s+content=["'][\s\S]*?["']/i, `<meta name="description" content="${page.description}"`);

    // Replace Canonical Link
    html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][\s\S]*?["']/i, `<link rel="canonical" href="${page.canonical}"`);

    // Replace Open Graph Meta Tags
    html = html.replace(/<meta\s+property=["']og:title["']\s+content=["'][\s\S]*?["']/i, `<meta property="og:title" content="${page.ogTitle}"`);
    html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'][\s\S]*?["']/i, `<meta property="og:description" content="${page.ogDescription}"`);
    html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'][\s\S]*?["']/i, `<meta property="og:url" content="${page.canonical}"`);

    // Replace Twitter Meta Tags
    html = html.replace(/<meta\s+name=["']twitter:title["']\s+content=["'][\s\S]*?["']/i, `<meta name="twitter:title" content="${page.ogTitle}"`);
    html = html.replace(/<meta\s+name=["']twitter:description["']\s+content=["'][\s\S]*?["']/i, `<meta name="twitter:description" content="${page.ogDescription}"`);

    const outputPath = path.join(targetDir, 'index.html');
    await writeFile(outputPath, html, 'utf8');
    console.log(`  ✓ Generated: dist/${page.route}/index.html (${page.title})`);
  }

  console.log('\n✅ All pre-rendered route files created successfully!\n');
}

generatePrerenderPages().catch((err) => {
  console.error('Prerender error:', err);
  process.exit(1);
});
