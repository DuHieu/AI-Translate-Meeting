// infra/cloudflare/worker-maintenance-fallback.js
// Cloudflare Worker: Zero-Downtime Maintenance Fallback for layameet.com
// Free Tier: 100,000 requests/day - 0ms overhead

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LayaMeet - Hệ thống đang bảo trì / System Maintenance</title>
  <meta name="description" content="LayaMeet - Nền tảng họp trực tuyến song ngữ AI đang trong quá trình bảo trì hoặc nâng cấp hệ thống.">
  <style>
    :root {
      --bg: #090a0f;
      --card-bg: rgba(18, 20, 29, 0.85);
      --border: rgba(255, 255, 255, 0.1);
      --primary: #3b82f6;
      --primary-glow: rgba(59, 130, 246, 0.35);
      --accent: #06b6d4;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(circle at 50% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 60%),
        radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.08) 0%, transparent 50%);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      position: relative;
    }
    .grid-pattern {
      position: absolute; inset: 0;
      background-image: linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 40px 40px; pointer-events: none;
    }
    .lang-switcher {
      position: absolute; top: 1.5rem; right: 1.5rem; display: flex; gap: 0.35rem;
      background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(12px); border: 1px solid var(--border);
      padding: 0.25rem; border-radius: 9999px; z-index: 20;
    }
    .lang-btn {
      background: transparent; border: none; color: var(--text-muted);
      padding: 0.35rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .lang-btn.active { background: rgba(255, 255, 255, 0.15); color: #fff; }
    .card {
      position: relative; background: var(--card-bg); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--border); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px var(--primary-glow);
      border-radius: 1.75rem; max-width: 580px; width: 100%; padding: 2.75rem 2.25rem; text-align: center; z-index: 10;
    }
    .brand-badge {
      display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.4rem 1rem;
      background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 9999px;
      color: #60a5fa; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; margin-bottom: 2rem;
    }
    .brand-dot { width: 7px; height: 7px; border-radius: 50%; background: #60a5fa; box-shadow: 0 0 8px #60a5fa; }
    .icon-wrapper {
      width: 76px; height: 76px; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center;
      background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 1.25rem; color: #fbbf24;
    }
    h1 { font-size: 1.6rem; font-weight: 700; color: #fff; margin-bottom: 0.85rem; line-height: 1.3; }
    p.desc { font-size: 0.95rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 2rem; }
    .status-panel { background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 1rem; padding: 1.25rem; margin-bottom: 2rem; text-align: left; }
    .status-row { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.75rem; }
    .status-row:last-child { margin-bottom: 0; }
    .badge-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.25rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .progress-bar-bg { width: 100%; height: 4px; background: rgba(255, 255, 255, 0.08); border-radius: 9999px; overflow: hidden; margin-top: 0.5rem; }
    .progress-bar-fill { height: 100%; width: 100%; background: linear-gradient(90deg, var(--primary), var(--accent)); transition: width 1s linear; }
    .btn-group { display: flex; gap: 0.85rem; justify-content: center; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 0.85rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); }
    .btn-primary:hover { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .btn-secondary { background: rgba(255, 255, 255, 0.05); color: var(--text-muted); border: 1px solid var(--border); }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
    footer { margin-top: 2rem; font-size: 0.8rem; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="grid-pattern"></div>
  <div class="lang-switcher">
    <button class="lang-btn active" onclick="setLang('vi')">VI</button>
    <button class="lang-btn" onclick="setLang('en')">EN</button>
    <button class="lang-btn" onclick="setLang('ja')">JA</button>
  </div>
  <div class="card">
    <div class="brand-badge"><div class="brand-dot"></div><span>LayaMeet Platform</span></div>
    <div class="icon-wrapper">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    </div>
    <h1 id="title">Hệ Thống Đang Bảo Trì Hoặc Khởi Động Lại</h1>
    <p class="desc" id="desc">Máy chủ dịch vụ đang được cập nhật hoặc tự động nạp lại dữ liệu. Quá trình này thường diễn ra trong vài phút. Vui lòng giữ nguyên tab, hệ thống sẽ tự động kết nối lại khi sẵn sàng.</p>
    <div class="status-panel">
      <div class="status-row"><span>Tên miền:</span><span style="font-family: monospace; color: #38bdf8;">layameet.com</span></div>
      <div class="status-row"><span>Trạng thái:</span><span class="badge-amber" id="txt-status">Máy chủ đang khởi động lại...</span></div>
      <div style="margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px dashed rgba(255,255,255,0.08);">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
          <span>Tự động kết nối lại sau:</span><span id="countdown" style="font-weight: 700; color: #fff;">15s</span>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" id="progress-fill"></div></div>
      </div>
    </div>
    <div class="btn-group">
      <button class="btn btn-primary" onclick="window.location.reload()">Thử lại ngay</button>
      <a href="mailto:support@layameet.com" class="btn btn-secondary">Hỗ trợ kỹ thuật</a>
    </div>
  </div>
  <footer>&copy; 2026 LayaMeet. All rights reserved.</footer>
  <script>
    const tDict = {
      vi: { title: "Hệ Thống Đang Bảo Trì Hoặc Khởi Động Lại", desc: "Máy chủ dịch vụ đang được cập nhật hoặc tự động nạp lại dữ liệu. Quá trình này thường diễn ra trong vài phút. Vui lòng giữ nguyên tab, hệ thống sẽ tự động kết nối lại khi sẵn sàng.", st: "Máy chủ đang khởi động lại..." },
      en: { title: "System Maintenance or Restart in Progress", desc: "The meeting service is undergoing scheduled maintenance or system reload. Please keep this tab open; you will be reconnected automatically once online.", st: "Origin server restarting..." },
      ja: { title: "システムメンテナンスまたは再起動中", desc: "現在、サービスの定期保守または再起動を実行しております。この画面のままお待ちいただければ、復旧時に自動的に再接続されます。", st: "サーバー再起動中..." }
    };
    function setLang(l) {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase() === l));
      const t = tDict[l] || tDict.vi;
      document.getElementById('title').textContent = t.title;
      document.getElementById('desc').textContent = t.desc;
      document.getElementById('txt-status').textContent = t.st;
    }
    let s = 15;
    setInterval(() => {
      s--;
      document.getElementById('countdown').textContent = s + 's';
      document.getElementById('progress-fill').style.width = (s / 15 * 100) + '%';
      if (s <= 0) { s = 15; window.location.reload(); }
    }, 1000);
  </script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    try {
      const response = await fetch(request);
      // Catch origin down errors (502, 503, 521, 522, 523, 524)
      if ([502, 503, 521, 522, 523, 524].includes(response.status)) {
        return new Response(MAINTENANCE_HTML, {
          status: 503,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Retry-After': '15',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
      }
      return response;
    } catch (err) {
      return new Response(MAINTENANCE_HTML, {
        status: 503,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Retry-After': '15',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    }
  }
};
