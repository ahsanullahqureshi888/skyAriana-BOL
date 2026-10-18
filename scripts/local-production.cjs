const { spawn } = require('node:child_process')
const { mkdirSync } = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const mode = process.argv[2]
if (!['build', 'start'].includes(mode)) throw new Error('Expected build or start')
const env = { ...process.env }
if (mode === 'build') {
  // Keep build-time tracing away from unrelated Windows temporary folders.
  const temporaryDirectory = path.join(root, '.build-temp')
  mkdirSync(temporaryDirectory, { recursive: true })
  env.TEMP = temporaryDirectory
  env.TMP = temporaryDirectory
  env.SKY_NEXT_DIST_DIR = '.next-production'
  env.SKY_STANDALONE = '1'
} else if (mode === 'start') {
  env.SKY_NEXT_DIST_DIR = '.next-production'
}

const host = process.env.SERVER_HOST || (process.env.LAN_MODE === 'true' ? '0.0.0.0' : '127.0.0.1')
const port = process.env.SERVER_PORT || '3000'

const args = mode === 'build' ? ['build', '--webpack'] : ['start', '--hostname', host, '-p', port]
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), ...args, ...process.argv.slice(3)], {
  cwd: root, env, stdio: 'inherit', windowsHide: true,
})

child.on('error', (error) => { console.error(error); process.exitCode = 1 })
child.on('exit', (code) => { process.exitCode = code ?? 1 })
