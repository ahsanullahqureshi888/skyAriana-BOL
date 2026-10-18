const { spawn } = require('child_process');
const electronPath = require('electron');
const path = require('path');

const scriptPath = path.resolve(__dirname, 'profile-production.cjs');
const child = spawn(electronPath, [scriptPath], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

child.on('close', (code) => {
  console.log(`\nProfile PRODUCTION process exited with code ${code}`);
  process.exit(code);
});
