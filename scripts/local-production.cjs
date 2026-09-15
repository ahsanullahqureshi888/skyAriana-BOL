const { spawn } = require('node:child_process')
const { mkdirSync } = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const mode = process.argv[2]
if (!['build', 'start'].includes(mode)) throw new Error('Expected build or start')
const env = { ...process.env, SKY_NEXT_DIST_DIR: '.next-production' }
if (mode === 'build') {
  // Keep build-time tracing away from unrelated Windows temporary folders.
  const temporaryDirectory = path.join(root, '.build-temp')
  mkdirSync(temporaryDirectory, { recursive: true })
  env.TEMP = temporaryDirectory
  env.TMP = temporaryDirectory
}
const args = mode === 'build' ? ['build', '--webpack'] : ['start', '--hostname', '127.0.0.1']
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), ...args, ...process.argv.slice(3)], {
  cwd: root, env, stdio: 'inherit', windowsHide: true,
})
child.on('error', (error) => { console.error(error); process.exitCode = 1 })
child.on('exit', (code) => { process.exitCode = code ?? 1 })
