// The desktop bundle must not embed the public installers served by the website.
require('fs').rmSync(require('path').join(__dirname, '../web/dist/downloads'), { recursive: true, force: true });
