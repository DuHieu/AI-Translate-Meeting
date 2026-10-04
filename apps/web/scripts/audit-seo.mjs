import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const indexHtmlPath = path.join(webRoot, 'index.html');
const robotsTxtPath = path.join(webRoot, 'public', 'robots.txt');
const sitemapXmlPath = path.join(webRoot, 'public', 'sitemap.xml');

let errors = [];
let warnings = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function warn(condition, message) {
  if (!condition) {
    warnings.push(message);
  }
}

async function runSeoAudit() {
  console.log('🔍 Running Automated SEO & Performance Audit...\n');

  // 1. Audit index.html
  const html = await readFile(indexHtmlPath, 'utf8');

  // Title check
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  assert(titleMatch && titleMatch[1].trim().length > 0, 'Missing <title> tag in index.html');
  if (titleMatch) {
    const titleLen = titleMatch[1].trim().length;
    warn(titleLen <= 70, `Title is ${titleLen} characters (recommended <= 70 chars)`);
    console.log(`  ✓ Title tag: "${titleMatch[1].trim()}" (${titleLen} chars)`);
  }

  // Meta description check
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  assert(descMatch && descMatch[1].trim().length > 0, 'Missing <meta name="description"> in index.html');
  if (descMatch) {
    const descLen = descMatch[1].trim().length;
    warn(descLen >= 50 && descLen <= 200, `Description is ${descLen} characters (recommended 100-160 chars)`);
    console.log(`  ✓ Meta description: ${descLen} chars`);
  }

  // Canonical link check
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i);
  assert(canonicalMatch && canonicalMatch[1].startsWith('https://'), 'Missing or non-HTTPS <link rel="canonical"> in index.html');
  if (canonicalMatch) {
    console.log(`  ✓ Canonical URL: ${canonicalMatch[1]}`);
  }

  // Robots meta tag
  const robotsMatch = html.match(/<meta\s+name=["']robots["']\s+content=["'](.*?)["']/i);
  assert(robotsMatch, 'Missing <meta name="robots"> tag in index.html');
  if (robotsMatch) {
    console.log(`  ✓ Robots tag: ${robotsMatch[1]}`);
  }

  // Open Graph tags
  assert(html.includes('property="og:title"'), 'Missing og:title');
  assert(html.includes('property="og:description"'), 'Missing og:description');
  assert(html.includes('property="og:image"'), 'Missing og:image');
  assert(html.includes('property="og:url"'), 'Missing og:url');
  console.log('  ✓ Open Graph tags verified');

  // Twitter Cards
  assert(html.includes('name="twitter:card"'), 'Missing twitter:card');
  assert(html.includes('name="twitter:title"'), 'Missing twitter:title');
  assert(html.includes('name="twitter:image"'), 'Missing twitter:image');
  console.log('  ✓ Twitter Card tags verified');

  // JSON-LD Structured Data
  const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
  assert(jsonLdMatch, 'Missing JSON-LD structured data script');
  if (jsonLdMatch) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      assert(parsed['@context'] === 'https://schema.org', 'JSON-LD @context must be https://schema.org');
      console.log('  ✓ JSON-LD Schema.org structured data validated');
    } catch (e) {
      errors.push(`Invalid JSON-LD syntax: ${e.message}`);
    }
  }

  // 2. Audit robots.txt
  const robots = await readFile(robotsTxtPath, 'utf8');
  assert(robots.includes('User-agent: *'), 'robots.txt must define User-agent: *');
  assert(robots.includes('Disallow: /meeting/'), 'robots.txt must protect private meeting endpoints (Disallow: /meeting/)');
  assert(robots.includes('Sitemap: https://'), 'robots.txt must specify HTTPS Sitemap URL');
  console.log('  ✓ robots.txt verified');

  // 3. Audit sitemap.xml
  const sitemap = await readFile(sitemapXmlPath, 'utf8');
  assert(sitemap.includes('<urlset'), 'sitemap.xml must have valid <urlset> root element');
  assert(sitemap.includes('<loc>https://'), 'sitemap.xml must have at least one HTTPS <loc>');
  console.log('  ✓ sitemap.xml verified');

  // Summary
  console.log('\n--- AUDIT SUMMARY ---');
  if (warnings.length > 0) {
    console.warn(`⚠️ Warnings (${warnings.length}):`);
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.error(`❌ Errors (${errors.length}):`);
    errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  } else {
    console.log('✅ ALL SEO & METADATA AUDITS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runSeoAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
