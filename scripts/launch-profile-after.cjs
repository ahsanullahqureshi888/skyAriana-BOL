const { spawn } = require('child_process');
const electronPath = require('electron');
const path = require('path');

const scriptPath = path.resolve(__dirname, 'profile-after.cjs');
const child = spawn(electronPath, [scriptPath], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

child.on('close', (code) => {
  console.log(`\nProfile AFTER process exited with code ${code}`);
  process.exit(code);
});
