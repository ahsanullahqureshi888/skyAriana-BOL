const { spawnSync } = require('child_process');
const electronPath = require('electron');

console.log(`Starting Electron runner using binary at: ${electronPath}`);
const res = spawnSync(electronPath, ['scripts/run-e2e-suite.cjs'], { stdio: 'inherit' });
process.exit(res.status || 0);
