#!/usr/bin/env node

/**
 * Laya Meet AI Automated Blog & SEO Content Engine
 * 
 * Capabilities:
 *  - Curated strategic SEO topic blueprints targeting high-intent keywords (VN-ZH, VN-KO, VN-EN, Security, IT).
 *  - Automated synchronization:
 *      1. Updates `apps/web/src/data/blogPosts.ts`
 *      2. Updates `apps/web/scripts/prerender.mjs`
 *      3. Updates `apps/web/public/sitemap.xml`
 *      4. Updates `apps/web/public/llms.txt`
 *      5. Builds static HTML with rich BlogPosting & FAQPage schemas
 *      6. Triggers IndexNow API ping to notify search engine bots within seconds
 * 
 * Usage:
 *   node scripts/ai_blog_engine.mjs --list
 *   node scripts/ai_blog_engine.mjs --auto
 *   node scripts/ai_blog_engine.mjs --publish <slug>
 */

import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const WEB_DIR = path.join(ROOT_DIR, 'apps', 'web');

const BLOG_POSTS_PATH = path.join(WEB_DIR, 'src', 'data', 'blogPosts.ts');
const PRERENDER_PATH = path.join(WEB_DIR, 'scripts', 'prerender.mjs');
const SITEMAP_PATH = path.join(WEB_DIR, 'public', 'sitemap.xml');
const LLMS_PATH = path.join(WEB_DIR, 'public', 'llms.txt');

const INDEXNOW_KEY = '4d98a2e15bc34f77a83d6904fb3158c9';
const TODAY = new Date().toISOString().split('T')[0];

// ==============================================================================
// 📚 STRATEGIC BLOG TOPIC BLUEPRINTS (HIGH-INTENT SEO ARSENAL)
// ==============================================================================
const TOPIC_BLUEPRINTS = [
  {
    slug: 'dam-phan-hop-video-xuo-ng-trung-quoc-khong-biet-tieng-trung',
    title: 'Bí Quyết Đàm Phán & Họp Trực Tuyến Với Xưởng Sản Xuất Trung Quốc (1688 / Taobao) Cho Doanh Nghiệp Không Biết Tiếng Trung',
    seoTitle: 'Họp Video Với Xưởng Trung Quốc Khi Không Biết Tiếng | Laya Meet',
    description: 'Hướng dẫn chi tiết cách chủ shop và doanh nghiệp xuất nhập khẩu họp video trực tiếp với xưởng Trung Quốc, đàm phán giá cả và kiểm tra mẫu qua phụ đề dịch song ngữ tức thì <350ms.',
    canonicalUrl: 'https://layameet.com/cam-nang/dam-phan-hop-video-xuo-ng-trung-quoc-khong-biet-tieng-trung',
    author: 'Laya Meet Cross-Border Commerce Team',
    authorRole: 'Nhóm Giải Pháp Thương Mại Đa Quốc Gia',
    date: TODAY,
    readTime: '6 phút đọc',
    category: 'Thương Mại & Đàm Phán Quốc Tế',
    tags: ['Họp Tiếng Trung', 'Nhập Hàng 1688', 'Đàm Phán Xưởng Trung Quốc', 'Dịch Song Ngữ Trực Tiếp', 'Laya Meet'],
    lang: 'vi',
    excerpt: 'Làm thế nào để đàm phán tận gốc với chủ xưởng Quảng Châu, Chiết Giang mà không cần thông qua đơn vị trung gian phiên dịch đắt đỏ? Công nghệ AI dịch phụ đề trực tiếp đang thay đổi cuộc chơi.',
    keyTakeaways: [
      'Giao tiếp video call trực tiếp giúp kiểm tra mẫu thực tế (QC mẫu) nhanh hơn 5 lần so với nhắn tin WeChat.',
      'Sử dụng phụ đề song ngữ Việt - Trung tức thì (<350ms) giúp xóa bỏ rào cản từ ngữ chuyên ngành sản xuất, vải vóc, linh kiện.',
      'Bảo mật 100% RAM-Only ngăn ngừa rò rỉ mẫu thiết kế độc quyền và hợp đồng đàm phán giá mật.',
      'Tự động xuất biên bản họp tóm tắt các thỏa thuận về số lượng MOQ, đơn giá và thời gian giao hàng.'
    ],
    faqs: [
      {
        question: 'Tôi không biết một chữ tiếng Trung nào, có thể tự họp với xưởng được không?',
        answer: 'Hoàn toàn được. Bạn nói tiếng Việt bình thường, Laya Meet sẽ hiển thị phụ đề dịch tiếng Trung giản thể tức thì trên màn hình chủ xưởng, và ngược lại khi họ nói tiếng Trung bạn sẽ đọc được tiếng Việt ngay lập tức.'
      },
      {
        question: 'Dịch thuật có hiểu được các thuật ngữ chuyên ngành sản xuất hoặc vật liệu không?',
        answer: 'Laya Meet sử dụng mô hình Whisper và hệ thống từ điển chuyên sâu ngành thương mại, hiểu chính xác các thuật ngữ như MOQ, FOB, CIF, dung sai kỹ thuật, thông số bao bì.'
      },
      {
        question: 'Chủ xưởng bên Trung Quốc có cần cài đặt phần mềm phức tạp không?',
        answer: 'Không cần. Chủ xưởng chỉ cần nhấp vào liên kết phòng họp trên trình duyệt web bất kỳ (Chrome, Edge, Safari) trên máy tính hoặc điện thoại là có thể tham gia ngay lập tức.'
      }
    ],
    sections: [
      {
        heading: '1. Rào cản lớn nhất khi làm việc trực tiếp với xưởng Trung Quốc',
        paragraphs: [
          'Đối với các nhà bán hàng và doanh nghiệp nhập khẩu Việt Nam, việc làm việc qua trung gian hay nhắn tin dịch tự động qua WeChat thường dẫn đến nhiều sai sót nghiêm trọng: hiểu nhầm chất liệu, sai lệch kích thước kỹ thuật, hoặc bị đội giá thành sản phẩm.',
          'Khi đàm phán qua video call trực tiếp, bạn có thể yêu cầu đối tác quay cận cảnh đường may, linh kiện, bao bì và quy trình đóng gói ngay tại xưởng sản xuất, từ đó tiết kiệm hàng tuần chờ đợi gửi mẫu thử.'
        ],
        callout: {
          type: 'tip',
          title: 'Lời khuyên từ chuyên gia nhập hàng',
          text: 'Một cuộc gọi video 15 phút với chủ xưởng có giá trị bằng 3 ngày chat qua lại. Bạn sẽ đánh giá được quy mô nhà xưởng thật hay chỉ là công ty thương mại trung gian (Trading Company).'
        }
      },
      {
        heading: '2. Cách tổ chức cuộc họp song ngữ Việt - Trung với Laya Meet',
        paragraphs: [
          'Với nền tảng họp trực tuyến Laya Meet (https://layameet.com/hop-song-ngu-tieng-trung), bạn chỉ cần tạo một phòng họp trực tuyến và gửi mã phòng cho đối tác Trung Quốc. Trong phòng họp, bạn chọn ngôn ngữ nói là Tiếng Việt và ngôn ngữ hiển thị là Tiếng Trung.',
          'Hệ thống AI nhận dạng giọng nói Faster-Whisper và ma trận dịch thuật Any-to-Any sẽ stream phụ đề hai chiều với độ trễ siêu thấp dưới 350ms, giúp cuộc đàm phán diễn ra mượt mà như có phiên dịch viên cao cấp ngồi cạnh.'
        ],
        table: {
          headers: ['Tiêu Chí', 'Chat Dịch WeChat', 'Thuê Phiên Dịch Viên', 'Laya Meet AI'],
          rows: [
            ['Tốc độ phản hồi', 'Chậm (3 - 10 phút)', 'Phải chờ dịch từng câu', 'Tức thì (<350ms)'],
            ['Chi phí', 'Miễn phí', '1.500.000 - 3.000.000đ/buổi', 'Miễn phí / Gói Pro giá rẻ'],
            ['Bảo mật mẫu mã', 'Trung bình', 'Phụ thuộc cá nhân', '100% RAM-Only (Không lưu audio)'],
            ['Xác thực trực quan', 'Chỉ gửi ảnh tĩnh', 'Khó kết hợp video', 'Video WebRTC độ trễ siêu thấp']
          ]
        }
      },
      {
        heading: '3. Bảo vệ bí mật kinh doanh và mẫu mã độc quyền',
        paragraphs: [
          'Nhiều doanh nghiệp e ngại việc sử dụng các nền tảng họp thông thường vì sợ file ghi âm hoặc hình ảnh mẫu mã bị lưu trữ trên đám mây và rò rỉ cho đối thủ cạnh tranh.',
          'Laya Meet cam kết kiến trúc 100% RAM-Only: toàn bộ luồng âm thanh và phụ đề chỉ tồn tại trong bộ nhớ RAM trong khoảnh khắc tính toán và được giải phóng ngay lập tức, không bao giờ lưu trữ file âm thanh xuống ổ đĩa vật lý.'
        ]
      }
    ]
  },
  {
    slug: 'hop-song-ngu-viet-han-van-hoa-va-giai-phap-dich-thoi-gian-thuc',
    title: 'Văn Hóa Họp Doanh Nghiệp Hàn Quốc & Giải Pháp Dịch Phụ Đề Trực Tiếp Việt - Hàn Thời Gian Thực',
    seoTitle: 'Họp Song Ngữ Việt - Hàn: Văn Hóa & Công Cụ Dịch Tức Thì | Laya Meet',
    description: 'Khám phá văn hóa họp trực tuyến với đối tác Hàn Quốc (Ppalli-ppalli, kính ngữ, chuẩn bị tài liệu) và cách công nghệ phụ đề AI Việt - Hàn của Laya Meet giúp nâng tầm hợp tác kinh doanh.',
    canonicalUrl: 'https://layameet.com/cam-nang/hop-song-ngu-viet-han-van-hoa-va-giai-phap-dich-thoi-gian-thuc',
    author: 'Laya Meet Korea Business Unit',
    authorRole: 'Chuyên Gia Văn Hóa & Công Nghệ Doanh Nghiệp Hàn Quốc',
    date: TODAY,
    readTime: '6 phút đọc',
    category: 'Hợp Tác Quốc Tế & Văn Hóa Doanh Nghiệp',
    tags: ['Họp Tiếng Hàn', 'Doanh Nghiệp Hàn Quốc', 'Văn Hóa Ppalli-ppalli', 'Dịch Việt Hàn', 'Laya Meet'],
    lang: 'vi',
    excerpt: 'Làm việc với các đối tác Hàn Quốc đòi hỏi tốc độ ra quyết định thần tốc và sự tôn trọng lễ nghi kính ngữ khắt khe. Công nghệ dịch thời gian thực đang giúp các doanh nghiệp Việt Nam ghi điểm tuyệt đối.',
    keyTakeaways: [
      'Hiểu rõ văn hóa "Ppalli-ppalli" (Nhanh lên, nhanh lên): Đối tác Hàn Quốc đánh giá cực cao phản hồi tức thì và không làm gián đoạn luồng trao đổi.',
      'Sự phân biệt kính ngữ (Jondaetmal) trong giao tiếp thương mại Hàn Quốc được AI của Laya Meet chuẩn hóa tự động.',
      'Độ trễ <350ms giúp loại bỏ thời gian chết của phiên dịch nối tiếp, rút ngắn 50% thời lượng cuộc họp.',
      'Hỗ trợ ghi nhận Action Items tự động giúp gửi biên bản họp chuẩn chỉ ngay sau khi kết thúc buổi làm việc.'
    ],
    faqs: [
      {
        question: 'Mô hình AI của Laya Meet có xử lý được kính ngữ trang trọng trong tiếng Hàn không?',
        answer: 'Có. Laya Meet được tinh chỉnh ngữ nghĩa thương mại Hàn Quốc, tự động áp dụng thể kính ngữ lịch sự (Hasipsio-che / Haeyo-che) phù hợp với ngữ cảnh đàm phán đối tác và cuộc họp cấp cao.'
      },
      {
        question: 'Cuộc họp có người Việt, người Hàn và đối tác nói tiếng Anh cùng tham gia được không?',
        answer: 'Hoàn toàn được nhờ ma trận Any-to-Any đa ngôn ngữ. Người Việt nói tiếng Việt, người Hàn nói tiếng Hàn, chuyên gia nói tiếng Anh; mỗi người tự chọn ngôn ngữ phụ đề riêng trên màn hình của mình.'
      }
    ],
    sections: [
      {
        heading: '1. Tốc độ và kính ngữ: Hai yếu tố quyết định thành bại khi làm việc với đối tác Hàn',
        paragraphs: [
          'Hàn Quốc là một trong những nhà đầu tư FDI lớn nhất tại Việt Nam. Tuy nhiên, nhiều doanh nghiệp Việt Nam gặp khó khăn trong việc xây dựng lòng tin với các quản lý Hàn Quốc do rào cản ngôn ngữ và sự khác biệt về nhịp độ làm việc.',
          'Người Hàn Quốc rất coi trọng văn hóa "Ppalli-ppalli" (nhanh chóng, dứt khoát). Nếu mỗi câu nói phải dừng lại chờ phiên dịch viên dịch sang tiếng Hàn rồi mới dịch ngược lại, cuộc họp sẽ bị kéo dài gấp đôi và dễ làm mất kiên nhẫn của các lãnh đạo cấp cao.'
        ],
        callout: {
          type: 'info',
          title: 'Điểm chạm văn hóa quan trọng',
          text: 'Trong các tập đoàn Hàn Quốc (Chaebol cũng như SME), việc gửi biên bản họp kèm việc cần làm (Action Items) ngay trong ngày sau cuộc họp là tiêu chí đánh giá sự chuyên nghiệp hàng đầu.'
        }
      },
      {
        heading: '2. Nâng tầm cuộc họp với Laya Meet Việt - Hàn',
        paragraphs: [
          'Trang họp chuyên biệt https://layameet.com/hop-song-ngu-tieng-han được thiết kế riêng cho các doanh nghiệp liên doanh, công ty gia công phần mềm và nhà máy sản xuất hợp tác với đối tác Hàn Quốc.',
          'Nhờ cơ chế dịch trực tiếp song song (simultaneous live streaming), cả hai bên có thể tương tác tự nhiên bằng tiếng mẹ đẻ với phụ đề dịch hiển thị liên tục dưới 350ms, tạo cảm giác thân thiện và thấu hiểu sâu sắc.'
        ]
      }
    ]
  },
  {
    slug: 'bi-quyet-hop-tieng-anh-cho-ky-su-it-tu-tin-trao-doi-voi-khach-quoc-te',
    title: 'Bí Quyết Tham Gia Cuộc Họp Tiếng Anh Cho Kỹ Sư Phần Mềm: Tự Tin Trình Bày & Không Sợ Nghe Nhầm Accent',
    seoTitle: 'Bí Quyết Họp Tiếng Anh Cho Kỹ Sư IT: Dịch Phụ Đề Tức Thì | Laya Meet',
    description: 'Kinh nghiệm thực chiến cho Dev, QA, PM khi họp Daily Scrum hoặc Sprint Review tiếng Anh với khách hàng Mỹ, Singapore, Ấn Độ. Khắc phục nỗi sợ accent lạ bằng phụ đề AI song ngữ.',
    canonicalUrl: 'https://layameet.com/cam-nang/bi-quyet-hop-tieng-anh-cho-ky-su-it-tu-tin-trao-doi-voi-khach-quoc-te',
    author: 'Laya Meet Tech Leadership Community',
    authorRole: 'Cộng Đồng Kỹ Sư Phần Mềm Quốc Tế',
    date: TODAY,
    readTime: '5 phút đọc',
    category: 'Kỹ Năng Kỹ Sư & Agile',
    tags: ['Họp Tiếng Anh', 'Kỹ Sư IT', 'Daily Scrum', 'Khách Hàng Quốc Tế', 'Laya Meet'],
    lang: 'vi',
    excerpt: 'Nhiều lập trình viên Việt Nam code rất giỏi nhưng lại toát mồ hôi mỗi khi đến giờ Daily Standup tiếng Anh với khách hàng nước ngoài vì nghe không kịp accent. Dưới đây là giải pháp đột phá.',
    keyTakeaways: [
      'Nghe không kịp accent Ấn Độ, Singapore hoặc tiếng lóng kỹ thuật là nỗi sợ phổ biến nhất của các lập trình viên.',
      'Phụ đề song ngữ thời gian thực (Dual Subtitles) hiển thị đồng thời cả tiếng Anh gốc và tiếng Việt giúp đối chiếu nghĩa tức thì.',
      'Tính năng trích xuất việc cần làm (Action Items) tự động ghi nhận các bug, task cần fix trong buổi họp mà không sợ sót.',
      'Tự tin phát biểu tiếng Việt khi cần trình bày giải pháp kỹ thuật phức tạp với phụ đề dịch sang tiếng Anh chuẩn xác cho đối tác.'
    ],
    faqs: [
      {
        question: 'Laya Meet có nhận diện được accent tiếng Anh của người Ấn Độ hoặc Singapore không?',
        answer: 'Có. Mô hình Faster-Whisper được huấn luyện trên hàng trăm ngàn giờ dữ liệu giọng nói đa accent toàn cầu, giúp nhận diện chính xác kể cả các giọng đặc trưng như Indian English hay Singlish.'
      },
      {
        question: 'Tôi có thể vừa xem phụ đề tiếng Anh vừa xem tiếng Việt không?',
        answer: 'Hoàn toàn được. Laya Meet cung cấp chế độ phụ đề song ngữ kép (Dual Subtitle View) giúp bạn vừa rèn luyện khả năng nghe tiếng Anh vừa nắm chắc 100% nội dung qua tiếng Việt.'
      }
    ],
    sections: [
      {
        heading: '1. Nỗi sợ vô hình của lập trình viên trong các buổi họp Daily Standup',
        paragraphs: [
          'Trong thời đại làm việc từ xa (Remote work), việc hợp tác với các đồng nghiệp và khách hàng quốc tế đã trở thành tiêu chuẩn. Tuy nhiên, rào cản nghe nói tiếng Anh vẫn là nguyên nhân hàng đầu khiến nhiều kỹ sư giỏi ngần ngại nhận các dự án nước ngoài có mức lương cao.',
          'Các buổi họp Daily Scrum thường diễn ra với tốc độ rất nhanh, mọi người nói nhanh và dùng nhiều thuật ngữ chuyên môn. Nếu nghe sót một yêu cầu (requirement), hậu quả có thể là hàng tuần code sai hướng.'
        ]
      },
      {
        heading: '2. "Trợ lý phiên dịch" tàng hình ngay trên màn hình phòng họp',
        paragraphs: [
          'Bằng cách sử dụng Laya Meet (https://layameet.com/hop-song-ngu-tieng-anh), bạn không còn phải lo lắng về việc nghe sót thông tin. Mọi lời nói của các thành viên đều được chuyển thành văn bản tức thì với độ trễ <350ms.',
          'Cuối buổi họp, toàn bộ quyết định kỹ thuật và các đầu việc được giao sẽ được Laya Sidecar AI tổng hợp sẵn thành biên bản họp Markdown rõ ràng, giúp bạn tự tin hoàn thành công việc xuất sắc.'
        ]
      }
    ]
  }
];

// ==============================================================================
// 🛠️ HELPER FUNCTIONS
// ==============================================================================
async function getExistingSlugs() {
  const content = await readFile(BLOG_POSTS_PATH, 'utf-8');
  const matches = [...content.matchAll(/["']?slug["']?:\s*['"]([^'"]+)['"]/g)];
  return new Set(matches.map(m => m[1]));
}

async function publishTopic(blueprint) {
  console.log(`\n🚀 [AI Blog Engine] Bắt đầu xuất bản bài viết: "${blueprint.title}"...`);
  console.log(`   Slug: ${blueprint.slug}`);

  // 1. Update apps/web/src/data/blogPosts.ts
  console.log('   ✍️ 1. Cập nhật data bài viết: apps/web/src/data/blogPosts.ts...');
  let blogFile = await readFile(BLOG_POSTS_PATH, 'utf-8');
  
  if (blogFile.includes(`slug: '${blueprint.slug}'`)) {
    console.log('   ⚠️ Bài viết đã tồn tại trong blogPosts.ts, bỏ qua bước ghi đè.');
  } else {
    // Format JSON object as TypeScript code
    const serializedObject = JSON.stringify(blueprint, null, 2);
    // Insert at the beginning of BLOG_POSTS array
    const targetAnchor = 'export const BLOG_POSTS: BlogPost[] = [';
    const replacement = `${targetAnchor}\n  ${serializedObject},`;
    blogFile = blogFile.replace(targetAnchor, replacement);
    await writeFile(BLOG_POSTS_PATH, blogFile, 'utf-8');
    console.log('   ✅ Đã chèn bài viết vào blogPosts.ts thành công.');
  }

  // 2. Update apps/web/scripts/prerender.mjs
  console.log('   ⚡ 2. Cập nhật danh sách Pre-render: apps/web/scripts/prerender.mjs...');
  let prerenderFile = await readFile(PRERENDER_PATH, 'utf-8');
  const prerenderRoute = `cam-nang/${blueprint.slug}`;

  if (!prerenderFile.includes(`route: '${prerenderRoute}'`)) {
    const prerenderEntry = {
      route: prerenderRoute,
      lang: 'vi',
      title: `${blueprint.seoTitle}`,
      headline: blueprint.title,
      description: blueprint.description,
      canonical: blueprint.canonicalUrl,
      datePublished: blueprint.date,
      author: blueprint.author,
      category: blueprint.category,
      keywords: blueprint.tags.join(', '),
      keyTakeaways: blueprint.keyTakeaways || [],
      faqs: (blueprint.faqs || []).map(f => ({ q: f.question, a: f.answer }))
    };

    const prerenderStr = JSON.stringify(prerenderEntry, null, 2);
    const prerenderAnchor = 'const BLOG_ARTICLES = [';
    prerenderFile = prerenderFile.replace(prerenderAnchor, `${prerenderAnchor}\n  ${prerenderStr},`);
    await writeFile(PRERENDER_PATH, prerenderFile, 'utf-8');
    console.log('   ✅ Đã cập nhật prerender.mjs.');
  } else {
    console.log('   ℹ️ Route đã có trong prerender.mjs.');
  }

  // 3. Update apps/web/public/sitemap.xml
  console.log('   🗺️ 3. Cập nhật sitemap.xml...');
  let sitemapFile = await readFile(SITEMAP_PATH, 'utf-8');
  const urlEntry = `  <url>\n    <loc>${blueprint.canonicalUrl}</loc>\n    <lastmod>${blueprint.date}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;

  if (!sitemapFile.includes(blueprint.canonicalUrl)) {
    sitemapFile = sitemapFile.replace('</urlset>', `${urlEntry}</urlset>`);
    await writeFile(SITEMAP_PATH, sitemapFile, 'utf-8');
    console.log('   ✅ Đã thêm URL vào sitemap.xml.');
  } else {
    console.log('   ℹ️ URL đã tồn tại trong sitemap.xml.');
  }

  // 4. Update apps/web/public/llms.txt
  console.log('   🤖 4. Cập nhật tài liệu AI Search: apps/web/public/llms.txt...');
  let llmsFile = await readFile(LLMS_PATH, 'utf-8');
  const llmsLine = `- [${blueprint.title}](${blueprint.canonicalUrl}): ${blueprint.description.slice(0, 120)}...`;

  if (!llmsFile.includes(blueprint.canonicalUrl)) {
    llmsFile = llmsFile.replace('## Key Pages & Resources', `## Key Pages & Resources\n${llmsLine}`);
    await writeFile(LLMS_PATH, llmsFile, 'utf-8');
    console.log('   ✅ Đã ghi danh mục vào llms.txt.');
  }

  // 5. Trigger Web Build & Prerender
  console.log('   🔨 5. Chạy lệnh build và pre-render HTML tĩnh...');
  try {
    execSync('npm run build', { cwd: WEB_DIR, stdio: 'inherit' });
    console.log('   ✅ Đã build và sinh HTML tĩnh thành công.');
  } catch (err) {
    console.error('   ❌ Lỗi khi build web:', err.message);
    throw err;
  }

  // 6. Ping IndexNow
  console.log('   📡 6. Gửi tín hiệu IndexNow tới các công cụ tìm kiếm...');
  try {
    const payload = {
      host: 'layameet.com',
      key: INDEXNOW_KEY,
      keyLocation: `https://layameet.com/${INDEXNOW_KEY}.txt`,
      urlList: [
        blueprint.canonicalUrl,
        'https://layameet.com/cam-nang',
        'https://layameet.com/sitemap.xml',
        'https://layameet.com/llms.txt'
      ]
    };

    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload)
    });

    console.log(`   ✅ Kết quả IndexNow: HTTP ${res.status} (Search engines đã tiếp nhận tức thì!)`);
  } catch (err) {
    console.warn(`   ⚠️ Không thể kết nối IndexNow: ${err.message}`);
  }

  console.log(`\n✨ XUẤT BẢN THÀNH CÔNG BÀI VIẾT: ${blueprint.title}`);
  console.log(`🌐 URL Trực Tiếp: ${blueprint.canonicalUrl}\n`);
}

// ==============================================================================
// 🏁 CLI COMMAND DISPATCHER
// ==============================================================================
async function main() {
  const args = process.argv.slice(2);
  const existingSlugs = await getExistingSlugs();

  if (args.includes('--list')) {
    console.log('======================================================================');
    console.log('📚 KHO CHỦ ĐỀ BÀI VIẾT SEO CHIẾN LƯỢC CHO LAYAMEET');
    console.log('======================================================================');
    TOPIC_BLUEPRINTS.forEach((tp, idx) => {
      const isPublished = existingSlugs.has(tp.slug);
      const statusIcon = isPublished ? '✅ [Đã xuất bản]' : '⏳ [Sẵn sàng xuất bản]';
      console.log(`${idx + 1}. ${statusIcon} ${tp.title}`);
      console.log(`   Slug: ${tp.slug} | Chuyên mục: ${tp.category}`);
    });
    console.log('======================================================================');
    return;
  }

  if (args.includes('--auto')) {
    const nextTopic = TOPIC_BLUEPRINTS.find(tp => !existingSlugs.has(tp.slug));
    if (!nextTopic) {
      console.log('🎉 Tất cả các chủ đề trong kho chiến lược đều đã được xuất bản!');
      return;
    }
    console.log(`🎯 Tự động chọn chủ đề tiếp theo: "${nextTopic.title}"`);
    await publishTopic(nextTopic);
    return;
  }

  const publishArgIdx = args.indexOf('--publish');
  if (publishArgIdx !== -1 && args[publishArgIdx + 1]) {
    const targetSlug = args[publishArgIdx + 1];
    const targetTopic = TOPIC_BLUEPRINTS.find(tp => tp.slug === targetSlug);
    if (!targetTopic) {
      console.error(`❌ Không tìm thấy chủ đề với slug: "${targetSlug}"`);
      process.exit(1);
    }
    await publishTopic(targetTopic);
    return;
  }

  console.log('Sử dụng:');
  console.log('  node scripts/ai_blog_engine.mjs --list             (Xem danh sách chủ đề)');
  console.log('  node scripts/ai_blog_engine.mjs --auto             (Tự động xuất bản bài tiếp theo)');
  console.log('  node scripts/ai_blog_engine.mjs --publish <slug>   (Xuất bản bài chỉ định)');
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
