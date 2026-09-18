const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "..")
const stage = path.join(root, ".desktop-package")
fs.rmSync(stage, { recursive: true, force: true })
fs.mkdirSync(stage, { recursive: true })
fs.cpSync(path.join(root, "dist-electron"), path.join(stage, "dist-electron"), { recursive: true })
fs.copyFileSync(path.join(root, "LICENSE"), path.join(stage, "LICENSE"))

const packageJson = {
  name: "sky-ariana-bol",
  productName: "Sky Ariana BOL",
  version: "5.1.0",
  description: "Sky Ariana logistics, Bill of Lading, documents, invoicing, and ledger desktop workspace",
  author: "AHSANULLAH QURESHI",
  copyright: "Copyright © AHSANULLAH QURESHI",
  main: "dist-electron/main.js",
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
      { from: "../.next-production/static", to: "app-server/.next-production/static" },
      { from: "../public", to: "app-server/public", filter: ["**/*", "!uploads/**/*", "!test-ledger.pdf"] },
      { from: "../public/icon-512x512.png", to: "app-icon.png" },
      { from: "..", to: "seed-data", filter: [".local-*.json", ".bol-counter", ".invoice-counter"] },
    ],
    win: { target: ["dir"], signAndEditExecutable: false },
  },
}

fs.writeFileSync(path.join(stage, "package.json"), JSON.stringify(packageJson, null, 2))
