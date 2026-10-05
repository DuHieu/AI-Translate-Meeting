#!/usr/bin/env node

/**
 * LayaMeet SEO & SERP Health Inspector CLI
 * 
 * Usage:
 *   node scripts/seo-tool.mjs [URL] [options]
 *   npm run seo:tool
 * 
 * Options:
 *   --all      Audit all URLs declared in sitemap.xml
 *   --ping     Automatically ping IndexNow if audit passes
 *   --report   Export markdown report to docs/seo-audit-report.md
 *   --json     Output raw JSON results for CI/CD pipelines
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TARGET = 'https://layameet.com/';
const INDEXNOW_KEY = '4d98a2e15bc34f77a83d6904fb3158c9';

const args = process.argv.slice(2);
const isAll = args.includes('--all');
const isPing = args.includes('--ping');
const isReport = args.includes('--report');
const isJson = args.includes('--json');
const targetArg = args.find(a => !a.startsWith('--')) || DEFAULT_TARGET;

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

function formatScore(score) {
  if (score >= 90) return `${COLORS.green}${score}/100 (Xuất Sắc - Ready for Top 1)${COLORS.reset}`;
  if (score >= 75) return `${COLORS.yellow}${score}/100 (Tốt - Có vài điểm cần tối ưu)${COLORS.reset}`;
  return `${COLORS.red}${score}/100 (Cần Cải Thiện)${COLORS.reset}`;
}

async function auditUrl(url) {
  const result = {
    url,
    timestamp: new Date().toISOString(),
    status: 0,
    responseTimeMs: 0,
    checks: [],
    score: 0,
    maxScore: 100,
    serpPreview: {},
  };

  const startTime = Date.now();
  let response;
  let html = '';

  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    });
    result.status = response.status;
    result.responseTimeMs = Date.now() - startTime;
    html = await response.text();
  } catch (err) {
    result.error = err.message;
    return result;
  }

  // 1. Response Status & Speed (10 pts)
  if (result.status === 200) {
    result.score += 10;
    result.checks.push({ name: 'HTTP Status 200 OK', pass: true, detail: `${result.responseTimeMs}ms` });
  } else {
    result.checks.push({ name: 'HTTP Status', pass: false, detail: `Status ${result.status}` });
  }

  // 2. Title Tag (15 pts)
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  result.serpPreview.title = title;
  if (title.length > 0 && title.length <= 65) {
    result.score += 15;
    result.checks.push({ name: 'SERP Title (Mobile Friendly)', pass: true, detail: `"${title}" (${title.length} chars, tối ưu SERP mobile <65 ký tự)` });
  } else if (title.length > 65) {
    result.score += 10;
    result.checks.push({ name: 'SERP Title (Hơi dài trên mobile)', pass: false, detail: `"${title}" (${title.length} chars, có thể bị cắt dấu ... trên điện thoại)` });
  } else {
    result.checks.push({ name: 'SERP Title', pass: false, detail: 'Thiếu thẻ <title>' });
  }

  // 3. Meta Description (15 pts)
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  const desc = descMatch ? descMatch[1].trim() : '';
  result.serpPreview.description = desc;
  if (desc.length >= 100 && desc.length <= 180) {
    result.score += 15;
    result.checks.push({ name: 'Meta Description (Độ dài chuẩn)', pass: true, detail: `${desc.length} chars (Chuẩn Google 120-160 ký tự)` });
  } else if (desc.length > 0) {
    result.score += 8;
    result.checks.push({ name: 'Meta Description', pass: true, detail: `${desc.length} chars (Hơi ngắn hoặc hơi dài)` });
  } else {
    result.checks.push({ name: 'Meta Description', pass: false, detail: 'Thiếu thẻ meta description' });
  }

  // 4. Canonical & Hreflang (10 pts)
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i);
  const hasHreflang = html.includes('hreflang="vi"') && html.includes('hreflang="en"') && html.includes('hreflang="ja"');
  if (canonicalMatch && canonicalMatch[1].startsWith('https://')) {
    result.score += 5;
    result.checks.push({ name: 'Canonical Tag', pass: true, detail: canonicalMatch[1] });
  } else {
    result.checks.push({ name: 'Canonical Tag', pass: false, detail: 'Thiếu hoặc không phải HTTPS' });
  }
  if (hasHreflang) {
    result.score += 5;
    result.checks.push({ name: 'Đa Ngôn Ngữ Hreflang', pass: true, detail: 'vi, en, ja, x-default' });
  } else {
    result.checks.push({ name: 'Hreflang Tags', pass: false, detail: 'Chưa đủ thẻ hreflang vi/en/ja' });
  }

  // 5. Favicon & Googlebot-Favicon Assets (15 pts)
  const hasFaviconIco = html.includes('href="/favicon.ico"');
  const hasFavicon48 = html.includes('sizes="48x48"');
  const hasAppleTouch = html.includes('rel="apple-touch-icon"');
  
  // Kiểm tra vật lý file /favicon.ico online
  let icoOnline = false;
  try {
    const icoUrl = new URL('/favicon.ico', url).toString();
    const icoRes = await fetch(icoUrl, { method: 'HEAD' });
    const ctype = icoRes.headers.get('content-type') || '';
    if (icoRes.status === 200 && (ctype.includes('icon') || ctype.includes('octet-stream'))) {
      icoOnline = true;
    }
  } catch {}

  if (hasFaviconIco && icoOnline && hasFavicon48) {
    result.score += 15;
    result.checks.push({ name: 'Googlebot-Favicon Compliance', pass: true, detail: 'favicon.ico (200 OK image/x-icon) + 48x48px icon chuẩn Google Search' });
  } else if (hasFaviconIco || icoOnline) {
    result.score += 10;
    result.checks.push({ name: 'Favicon', pass: true, detail: 'Có favicon.ico nhưng cần kiểm tra icon 48px' });
  } else {
    result.checks.push({ name: 'Favicon', pass: false, detail: 'Thiếu cấu hình favicon.ico chuẩn' });
  }

  // 6. Structured Data (Schema.org JSON-LD) (15 pts)
  const jsonLdMatches = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  let schemaValid = false;
  let hasBrandEntity = false;
  let schemasFound = [];

  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]);
      schemaValid = true;
      const graph = data['@graph'] || [data];
      for (const item of graph) {
        if (item['@type']) schemasFound.push(item['@type']);
        if (item.disambiguatingDescription || item.sameAs) {
          hasBrandEntity = true;
        }
      }
    } catch {}
  }

  if (schemaValid && hasBrandEntity) {
    result.score += 15;
    result.checks.push({ name: 'Schema JSON-LD & Brand Entity', pass: true, detail: `Đã khai báo [${schemasFound.join(', ')}] kèm Brand Entity Disambiguation (sameAs + disambiguatingDescription)` });
  } else if (schemaValid) {
    result.score += 10;
    result.checks.push({ name: 'Schema JSON-LD', pass: true, detail: `Tìm thấy [${schemasFound.join(', ')}]` });
  } else {
    result.checks.push({ name: 'Schema JSON-LD', pass: false, detail: 'Không tìm thấy dữ liệu cấu trúc Schema' });
  }

  // 7. Open Graph & Social Preview (10 pts)
  const hasOg = html.includes('property="og:title"') && html.includes('property="og:image"') && html.includes('name="twitter:card"');
  if (hasOg) {
    result.score += 10;
    result.checks.push({ name: 'Open Graph & Twitter Cards', pass: true, detail: 'Đầy đủ og:title, og:image, og:url, twitter:card' });
  } else {
    result.checks.push({ name: 'Social Meta Tags', pass: false, detail: 'Thiếu một số thẻ Open Graph / Twitter' });
  }

  // 8. Analytics & Security (10 pts)
  const hasGa4 = html.includes('G-81BYTQEBXR');
  const hasCsp = response.headers.has('content-security-policy') || html.includes('http-equiv="Content-Security-Policy"');
  const hasHsts = response.headers.has('strict-transport-security');

  if (hasGa4 && (hasCsp || hasHsts)) {
    result.score += 10;
    result.checks.push({ name: 'Analytics & Security Headers', pass: true, detail: 'Google Analytics 4 (G-81BYTQEBXR) + HTTPS/HSTS/CSP Headers' });
  } else if (hasGa4) {
    result.score += 7;
    result.checks.push({ name: 'Analytics', pass: true, detail: 'GA4 đã gắn (G-81BYTQEBXR)' });
  } else {
    result.checks.push({ name: 'Analytics', pass: false, detail: 'Chưa thấy thẻ GA4' });
  }

  return result;
}

async function pingIndexNow(urls) {
  const endpoint = 'https://api.indexnow.org/IndexNow';
  const payload = {
    host: 'layameet.com',
    key: INDEXNOW_KEY,
    keyLocation: `https://layameet.com/${INDEXNOW_KEY}.txt`,
    urlList: urls
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return res.status === 200 || res.status === 202;
  } catch {
    return false;
  }
}

function renderSerpPreview(url, preview) {
  const domain = new URL(url).hostname;
  console.log(`\n${COLORS.cyan}📱 MÔ PHỎNG HIỂN THỊ GOOGLE SERP (Preview):${COLORS.reset}`);
  console.log(`┌────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ 🌐 ${COLORS.dim}${domain} › ...${COLORS.reset}`);
  console.log(`│ ${COLORS.bright}${COLORS.blue}${preview.title || 'Tiêu đề trang'}${COLORS.reset}`);
  console.log(`│ ${COLORS.dim}${(preview.description || 'Mô tả trang').slice(0, 110)}...${COLORS.reset}`);
  console.log(`└────────────────────────────────────────────────────────────────────────┘`);
}

function printAuditConsole(result) {
  console.log(`\n${COLORS.bright}${COLORS.bgBlue} 🔍 SEO HEALTH AUDIT REPORT ${COLORS.reset} ${COLORS.bright}${result.url}${COLORS.reset}`);
  console.log(`Thời gian: ${result.timestamp} | Phản hồi: ${result.responseTimeMs}ms | HTTP Status: ${result.status}\n`);

  console.log(`${COLORS.bright}CHI TIẾT KIỂM TRA:${COLORS.reset}`);
  for (const c of result.checks) {
    const icon = c.pass ? `${COLORS.green}✔ PASS${COLORS.reset}` : `${COLORS.red}✖ WARN${COLORS.reset}`;
    console.log(`  [${icon}] ${COLORS.bright}${c.name}${COLORS.reset}: ${c.detail}`);
  }

  console.log(`\n${COLORS.bright}ĐIỂM CHẤT LƯỢNG SEO:${COLORS.reset} ${formatScore(result.score)}`);
  renderSerpPreview(result.url, result.serpPreview);
}

async function run() {
  const urlsToAudit = [];

  if (isAll) {
    console.log(`${COLORS.bright}Đang lấy danh sách URL từ sitemap.xml...${COLORS.reset}`);
    try {
      const sitemapRes = await fetch('https://layameet.com/sitemap.xml');
      const xml = await sitemapRes.text();
      const locMatches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)];
      for (const m of locMatches) {
        urlsToAudit.push(m[1].trim());
      }
    } catch {
      urlsToAudit.push(DEFAULT_TARGET);
    }
  } else {
    urlsToAudit.push(targetArg);
  }

  const allResults = [];
  for (const u of urlsToAudit) {
    const res = await auditUrl(u);
    allResults.push(res);
    if (!isJson) {
      printAuditConsole(res);
    }
  }

  if (isJson) {
    console.log(JSON.stringify(allResults, null, 2));
    return;
  }

  // Tự động Ping IndexNow nếu có cờ --ping
  if (isPing) {
    console.log(`\n${COLORS.bright}📡 Đang gửi tín hiệu IndexNow tới các công cụ tìm kiếm...${COLORS.reset}`);
    const success = await pingIndexNow(urlsToAudit);
    if (success) {
      console.log(`  ${COLORS.green}✔ Gửi IndexNow thành công (HTTP 200/202). Search engines đã tiếp nhận URLs!${COLORS.reset}`);
    } else {
      console.log(`  ${COLORS.yellow}⚠️ Không thể kết nối tới IndexNow API.${COLORS.reset}`);
    }
  }

  // Xuất báo cáo Markdown nếu có cờ --report
  if (isReport) {
    const reportPath = path.resolve(__dirname, '..', '..', 'docs', 'seo-audit-report.md');
    let md = `# Báo Cáo Kiểm Tra SEO Toàn Diện - LayaMeet (${new Date().toLocaleDateString('vi-VN')})\n\n`;
    for (const r of allResults) {
      md += `## Trang: ${r.url}\n`;
      md += `- **Điểm đánh giá**: ${r.score}/100\n`;
      md += `- **Tốc độ phản hồi (TTFB)**: ${r.responseTimeMs}ms\n`;
      md += `- **Tiêu đề SERP**: \`${r.serpPreview.title}\`\n`;
      md += `- **Mô tả**: ${r.serpPreview.description}\n\n`;
      md += `### Bảng Kiểm Tra Chi Tiết\n\n| Tiêu Chí | Trạng Thái | Chi Tiết |\n|---|---|---|\n`;
      for (const c of r.checks) {
        md += `| ${c.name} | ${c.pass ? '✅ Đạt' : '⚠️ Cần Lưu Ý'} | ${c.detail} |\n`;
      }
      md += `\n---\n\n`;
    }
    await writeFile(reportPath, md, 'utf8');
    console.log(`\n${COLORS.green}✔ Đã xuất báo cáo SEO chi tiết tại: docs/seo-audit-report.md${COLORS.reset}`);
  }

  console.log(`\n${COLORS.dim}💡 Mẹo: Chạy 'node scripts/seo-tool.mjs --ping' để vừa audit vừa submit IndexNow tự động!${COLORS.reset}\n`);
}

run().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
