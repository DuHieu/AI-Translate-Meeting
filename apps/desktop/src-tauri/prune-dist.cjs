// The desktop bundle must not embed the public installers served by the website.
const fs = require('fs');
const path = require('path');
for (const rel of ['../web/dist/downloads', '../../web/dist/downloads']) {
  fs.rmSync(path.join(__dirname, rel), { recursive: true, force: true });
}
