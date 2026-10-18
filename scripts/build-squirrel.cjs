const path = require("node:path")
const { rmSync } = require("node:fs")
const installer = require("electron-winstaller")
const rootPackage = require("../package.json")

const root = path.resolve(__dirname, "..")
const packageRoot = process.env.SKY_PACKAGE_ROOT || root
const outputDirectory = path.join(packageRoot, "release", "installer")
rmSync(outputDirectory, { recursive: true, force: true })

installer.createWindowsInstaller({
  appDirectory: path.join(packageRoot, "release-desktop", "win-unpacked"),
  outputDirectory,
  authors: "AHSANULLAH QURESHI",
  owners: "AHSANULLAH QURESHI",
  description: "Sky Ariana logistics, Bill of Lading, documents, invoicing, and ledger desktop workspace",
  title: "Sky Ariana BOL v5.1pro",
  name: "SkyArianaBOL",
  version: rootPackage.version,
  exe: "Sky Ariana BOL.exe",
  setupExe: "Sky-Ariana-BOL-v5.1pro-Setup.exe",
  setupIcon: path.join(packageRoot, "public", "app-icon.ico"),
  noMsi: true,
}).then(
  () => console.log(`Installer created in ${outputDirectory}`),
  (error) => { console.error(error); process.exitCode = 1 },
)
