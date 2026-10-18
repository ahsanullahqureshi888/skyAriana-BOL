const { spawnSync } = require('child_process');
const electronPath = require('electron');
const res = spawnSync(electronPath, ['scripts/debug-toolbar.cjs'], { stdio: 'inherit' });
process.exit(res.status || 0);
