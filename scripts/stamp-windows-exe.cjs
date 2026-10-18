const { execFileSync } = require("node:child_process")
const path = require("node:path")
const { version } = require("../package.json")

const root = path.resolve(__dirname, "..")
const rcedit = path.join(root, "node_modules", "electron-winstaller", "vendor", "rcedit.exe")
const executable = path.join(root, "release-desktop", "win-unpacked", "Sky Ariana BOL.exe")
const icon = path.join(root, "public", "app-icon.ico")

execFileSync(rcedit, [
  executable,
  "--set-icon", icon,
  "--set-file-version", `${version}.0`,
  "--set-product-version", `${version}.0`,
  "--set-version-string", "ProductName", "Sky Ariana BOL",
  "--set-version-string", "FileDescription", "Sky Ariana BOL v5.1pro Desktop Application",
  "--set-version-string", "CompanyName", "AHSANULLAH QURESHI",
  "--set-version-string", "LegalCopyright", "Copyright © AHSANULLAH QURESHI",
], { stdio: "inherit" })
