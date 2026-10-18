/**
 * AQ COMPANIES - Automated Release Pipeline
 * Phase 8: Windows EXE Packaging + Installer + Release Validation
 */

const { execSync, spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")
const crypto = require("node:crypto")

const rootDir = path.resolve(__dirname, "..")
const releaseDir = path.join(rootDir, "release")
const backendExe = path.join(rootDir, "resources", "backend", "aq-backend.exe")
const nextProductionDir = path.join(rootDir, ".next-production")

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function computeSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath)
  const hashSum = crypto.createHash("sha256")
  hashSum.update(fileBuffer)
  return hashSum.digest("hex")
}

console.log("=================================================================")
console.log("       AQ COMPANIES - WINDOWS RELEASE BUILD PIPELINE")
console.log("       Phase 8: Installer & Distribution Packaging")
console.log("=================================================================")

const startTime = Date.now()

const skipFrontend = process.argv.includes("--skip-frontend")
const skipBackend = process.argv.includes("--skip-backend")

// Step 1: Validate or Build Standalone Python Backend
console.log("\n[1/5] Checking Standalone Python Backend (aq-backend.exe)...")
if (!fs.existsSync(backendExe) || (!skipBackend && process.argv.includes("--rebuild-backend"))) {
  console.log("  -> Compiling backend via PyInstaller...")
  const buildBackendScript = path.join(__dirname, "build-backend.cjs")
  execSync(`node "${buildBackendScript}"`, { cwd: rootDir, stdio: "inherit" })
}

if (!fs.existsSync(backendExe)) {
  console.error("FATAL: aq-backend.exe could not be found or built.")
  process.exit(1)
}
const backendStats = fs.statSync(backendExe)
console.log(`  -> Verified aq-backend.exe (${formatBytes(backendStats.size)})`)

// Step 2: Build Next.js Production Frontend
console.log("\n[2/5] Checking / Building Next.js Standalone Frontend...")
const standaloneServer = path.join(nextProductionDir, "standalone", "server.js")
if (!fs.existsSync(standaloneServer) || !skipFrontend) {
  const localProdScript = path.join(__dirname, "local-production.cjs")
  execSync(`node "${localProdScript}" build`, { cwd: rootDir, stdio: "inherit" })
}

if (!fs.existsSync(standaloneServer)) {
  console.error("FATAL: Next.js standalone server.js was not generated.")
  process.exit(1)
}
console.log("  -> Standalone Next.js server and static assets verified.")

// Step 3: Build Electron Main & Preload Scripts
console.log("\n[3/5] Compiling Electron TypeScript...")
execSync('node node_modules/typescript/bin/tsc -p tsconfig.electron.json', { cwd: rootDir, stdio: "inherit" })
const distMain = path.join(rootDir, "dist-electron", "main.js")
if (!fs.existsSync(distMain)) {
  console.error("FATAL: Electron compilation failed. dist-electron/main.js not found.")
  process.exit(1)
}
console.log("  -> Electron main and preload scripts compiled successfully.")

// Step 4: Package Windows NSIS Installer via electron-builder
console.log("\n[4/5] Synchronizing Desktop Data & Packaging Windows NSIS Installer via electron-builder...")
const syncScript = path.join(__dirname, "sync-desktop-data.cjs")
if (fs.existsSync(syncScript)) {
  execSync(`node "${syncScript}"`, { cwd: rootDir, stdio: "inherit" })
}
const electronBuilderBin = path.join(rootDir, "node_modules", "electron-builder", "cli.js")
execSync(`node "${electronBuilderBin}" --win nsis --x64`, {
  cwd: rootDir,
  stdio: "inherit",
  env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: "false" }
})

// Step 5: Validate Installer and Generate SHA-256 Checksum
console.log("\n[5/5] Generating Checksums and Validating Release Artifacts...")
let installerFile = path.join(releaseDir, "AQ-COMPANIES-Setup.exe")
if (!fs.existsSync(installerFile)) {
  // Check for versioned filename
  const files = fs.readdirSync(releaseDir)
  const candidate = files.find(f => f.startsWith("AQ-COMPANIES-Setup") && f.endsWith(".exe"))
  if (candidate) {
    installerFile = path.join(releaseDir, candidate)
  } else {
    console.error("FATAL: Release installer was not found in release/ directory.")
    process.exit(1)
  }
}

const installerStats = fs.statSync(installerFile)
const installerHash = computeSha256(installerFile)
const sha256File = `${installerFile}.sha256`
fs.writeFileSync(sha256File, `${installerHash} *${path.basename(installerFile)}\n`, "utf8")

const duration = ((Date.now() - startTime) / 1000).toFixed(1)

console.log("\n=================================================================")
console.log("               RELEASE BUILD COMPLETED SUCCESSFULLY")
console.log("=================================================================")
console.log(`Product:              AQ COMPANIES - Logistics & BOL Management`)
console.log(`Installer:            ${path.basename(installerFile)}`)
console.log(`Path:                 ${installerFile}`)
console.log(`Size:                 ${formatBytes(installerStats.size)} (${installerStats.size.toLocaleString()} bytes)`)
console.log(`SHA-256 Checksum:     ${installerHash}`)
console.log(`Checksum File:        ${path.basename(sha256File)}`)
console.log(`Build Duration:       ${duration}s`)
console.log("=================================================================\n")
