const fs = require("node:fs")
const path = require("node:path")
const rootPackage = require("../package.json")

const root = path.resolve(__dirname, "..")
const stage = path.join(root, ".desktop-package")
fs.rmSync(stage, { recursive: true, force: true })
fs.mkdirSync(stage, { recursive: true })
fs.cpSync(path.join(root, "dist-electron"), path.join(stage, "dist-electron"), { recursive: true })
fs.copyFileSync(path.join(root, "LICENSE"), path.join(stage, "LICENSE"))

const packageJson = {
  name: rootPackage.name,
  productName: rootPackage.productName,
  version: rootPackage.version,
  description: rootPackage.description,
  author: rootPackage.author,
  copyright: rootPackage.copyright,
  main: rootPackage.main,
  build: {
    appId: "com.skyariana.bol",
    productName: "Sky Ariana BOL",
    asar: true,
    electronVersion: "39.8.10",
    npmRebuild: false,
    electronDist: "../node_modules/electron/dist",
    directories: { output: "../release-desktop" },
    files: ["dist-electron/**/*", "package.json", "LICENSE"],
    extraResources: [
      { from: "../.next-production/standalone", to: "app-server" },
      { from: "../.next-production/standalone/node_modules", to: "app-server/node_modules" },
      { from: "../.next-production/static", to: "app-server/.next-production/static" },
      { from: "../public", to: "app-server/public", filter: ["**/*", "!uploads/**/*", "!test-ledger.pdf"] },
      { from: "../public/icon-512x512.png", to: "app-icon.png" },
      { from: "../seed-data", to: "seed-data", filter: [".local-*.json", ".bol-counter", ".invoice-counter"] },
      ...(fs.existsSync(path.join(root, "resources", "backend")) ? [{ from: "../resources/backend", to: "backend" }] : []),
    ],
    win: { target: ["dir"], signAndEditExecutable: false },
  },
}

fs.writeFileSync(path.join(stage, "package.json"), JSON.stringify(packageJson, null, 2))
