const { spawnSync } = require('child_process');
const electronPath = require('electron');

const res = spawnSync(electronPath, ['scripts/profile-before.cjs'], { stdio: 'inherit' });
process.exit(res.status || 0);
