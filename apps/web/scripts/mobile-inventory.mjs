import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('../..');
const out = path.join(root, 'output/playwright/mobile-20261008');
const source = process.argv.includes('--after') ? 'apps/web/src' : 'output/playwright/mobile-20261008/baseline-source';
const rows = [];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (/\.(tsx|ts)$/.test(file)) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (/<Route |<(button|input|select|textarea|Link)\b|onClick=|onSubmit=|onPointer|onMouse|onContextMenu|hidden (md|lg|sm):|md:hidden|getDisplayMedia|setSinkId|clipboard|PictureInPicture|wakeLock|visualViewport/.test(line)) {
          rows.push({ file: path.relative(root, file).replaceAll('\\', '/').replace(source, 'apps/web/src'), line: index + 1, code: line.trim() });
        }
      });
    }
  }
}
scan(path.join(root, source));
fs.mkdirSync(out, { recursive: true });
const stage = process.argv.includes('--after') ? 'after' : 'before';
fs.writeFileSync(path.join(out, `inventory-${stage}.json`), JSON.stringify(rows, null, 2));
fs.writeFileSync(path.join(out, `inventory-${stage}.md`), `# Kiểm kê nguồn ${stage}\n\nMỗi route, control, handler và dấu hiệu rủi ro có vị trí trong mã nguồn. Trạng thái chạy cần đối chiếu ma trận E2E.\n\n| File:dòng | Control / handler / rủi ro |\n|---|---|\n` + rows.map(r => `| ${r.file}:${r.line} | \`${r.code.replaceAll('|', '\\|').replaceAll('`', "'")}\` |`).join('\n'));
console.log(stage, rows.length, 'entries');
