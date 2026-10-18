/**
 * AQ COMPANIES — Production Python Backend Packaging Script
 * Invokes PyInstaller to compile FastAPI + Uvicorn + SQLAlchemy into standalone resources/backend/aq-backend.exe
 */

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const venvPyinstaller = process.platform === 'win32'
  ? path.join(root, '.venv', 'Scripts', 'pyinstaller.exe')
  : path.join(root, '.venv', 'bin', 'pyinstaller')

const specFile = path.join(root, 'backend', 'aq-backend.spec')
const targetExe = path.join(root, 'resources', 'backend', 'aq-backend.exe')

console.log('====================================================')
console.log('📦 AQ COMPANIES: COMPILING STANDALONE PYTHON BACKEND')
console.log('====================================================')

if (!fs.existsSync(venvPyinstaller)) {
  console.error(`[Error] PyInstaller not found at ${venvPyinstaller}`)
  console.error('Please ensure .venv has pyinstaller installed: .venv\\Scripts\\python.exe -m pip install pyinstaller')
  process.exit(1)
}

if (!fs.existsSync(specFile)) {
  console.error(`[Error] Spec file not found at ${specFile}`)
  process.exit(1)
}

console.log(`[PyInstaller] Using: ${venvPyinstaller}`)
console.log(`[PyInstaller] Spec:  ${specFile}`)

try {
  execFileSync(venvPyinstaller, [
    specFile,
    '--distpath', path.join(root, 'resources'),
    '--workpath', path.join(root, '.build-pyinstaller'),
    '--noconfirm',
  ], {
    cwd: root,
    stdio: 'inherit',
  })

  if (!fs.existsSync(targetExe)) {
    throw new Error(`Compiled backend executable was not found at expected location: ${targetExe}`)
  }

  const stat = fs.statSync(targetExe)
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2)

  console.log('----------------------------------------------------')
  console.log(`✅ SUCCESS: Standalone backend packaged successfully!`)
  console.log(`📍 Location: ${targetExe}`)
  console.log(`📏 Executable Size: ${sizeMb} MB`)
  console.log('----------------------------------------------------')
} catch (err) {
  console.error('[Error] Failed to package Python backend:', err.message)
  process.exit(1)
}
