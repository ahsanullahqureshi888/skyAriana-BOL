import { app, BrowserWindow, Menu, nativeImage, shell } from "electron"
import { spawn, type ChildProcess } from "node:child_process"
import { createServer } from "node:net"
import { mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import { registerIpcHandlers } from "./ipc/register-ipc"
import { atomicWriteFile } from "./services/atomic-file"
import { initializeDataDirectory } from "./services/data"

const PRODUCT_NAME = "Sky Ariana BOL"
const DEVELOPER_NAME = "AHSANULLAH QURESHI"
let mainWindow: BrowserWindow | null = null
let applicationServer: ChildProcess | null = null
let applicationUrl = ""

type WindowState = { width: number; height: number; x?: number; y?: number; maximized?: boolean }

function handleSquirrelEvent(): boolean {
  const event = process.argv[1]
  if (!event?.startsWith("--squirrel-")) return false
  const updateExecutable = path.resolve(path.dirname(process.execPath), "..", "Update.exe")
  const executableName = path.basename(process.execPath)
  if (["--squirrel-install", "--squirrel-updated"].includes(event)) {
    spawn(updateExecutable, ["--createShortcut", executableName], { detached: true, windowsHide: true }).unref()
  } else if (event === "--squirrel-uninstall") {
    spawn(updateExecutable, ["--removeShortcut", executableName], { detached: true, windowsHide: true }).unref()
  }
  setTimeout(() => app.quit(), 1000)
  return true
}

async function reservePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      const port = typeof address === "object" && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

async function waitForServer(url: string): Promise<void> {
  const expiresAt = Date.now() + 45_000
  while (Date.now() < expiresAt) {
    try {
      const response = await fetch(url, { redirect: "manual" })
      if (response.status < 500) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error("The bundled application server did not start in time")
}

async function startApplicationServer(dataDirectory: string): Promise<string> {
  const developmentUrl = process.env.ELECTRON_START_URL
  if (!app.isPackaged) {
    applicationUrl = developmentUrl || "http://127.0.0.1:3001"
    await waitForServer(applicationUrl)
    return applicationUrl
  }
  const port = await reservePort()
  const serverRoot = path.join(process.resourcesPath, "app-server")
  const serverEntry = path.join(serverRoot, "server.js")
  applicationUrl = `http://127.0.0.1:${port}`
  applicationServer = spawn(process.execPath, [serverEntry], {
    cwd: serverRoot,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      SKY_DATA_DIR: dataDirectory,
      SKY_DESKTOP: "1",
    },
  })
  applicationServer.once("error", (error) => console.error("Bundled server failed:", error))
  await waitForServer(applicationUrl)
  return applicationUrl
}

async function readWindowState(filePath: string): Promise<WindowState> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as WindowState
  } catch {
    return { width: 1440, height: 900 }
  }
}

function buildApplicationMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: "File", submenu: [
      { label: "New", accelerator: "CmdOrCtrl+N", click: () => mainWindow?.webContents.send("menu:new") },
      { label: "Open", accelerator: "CmdOrCtrl+O", click: () => mainWindow?.webContents.send("menu:open") },
      { label: "Save", accelerator: "CmdOrCtrl+S", click: () => mainWindow?.webContents.send("menu:save") },
      { label: "Export PDF", click: () => mainWindow?.webContents.send("menu:export-pdf") },
      { label: "Print", accelerator: "CmdOrCtrl+P", click: () => mainWindow?.webContents.print({ printBackground: true }) },
      { type: "separator" }, { role: "quit", label: "Exit" },
    ] },
    { label: "Edit", submenu: [
      { role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
    ] },
    { label: "View", submenu: [
      { role: "reload" }, { role: "zoomIn" }, { role: "zoomOut" }, { role: "resetZoom" }, { type: "separator" }, { role: "togglefullscreen" },
    ] },
    { label: "Help", submenu: [{
      label: "About",
      click: () => void app.showAboutPanel(),
    }] },
  ])
}

async function createMainWindow(): Promise<void> {
  const userData = app.getPath("userData")
  const dataDirectory = path.join(userData, "data")
  const statePath = path.join(userData, "window-state.json")
  await mkdir(userData, { recursive: true })
  const seedDirectory = app.isPackaged ? path.join(process.resourcesPath, "seed-data") : process.cwd()
  await initializeDataDirectory(dataDirectory, seedDirectory)
  process.env.SKY_DATA_DIR = dataDirectory
  const state = await readWindowState(statePath)
  const icon = nativeImage.createFromPath(
    app.isPackaged ? path.join(process.resourcesPath, "app-icon.png") : path.join(process.cwd(), "public", "icon-512x512.png"),
  )
  mainWindow = new BrowserWindow({
    title: PRODUCT_NAME,
    width: Math.max(1100, state.width), height: Math.max(700, state.height), x: state.x, y: state.y,
    minWidth: 1024, minHeight: 680, show: false, backgroundColor: "#eaf2ff", icon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })
  if (state.maximized) mainWindow.maximize()
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("blob:") || url.startsWith(applicationUrl)) return { action: "allow" }
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: "deny" }
  })
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(applicationUrl)) {
      event.preventDefault()
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    }
  })
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  mainWindow.once("ready-to-show", () => mainWindow?.show())
  mainWindow.on("close", () => {
    if (!mainWindow) return
    const bounds = mainWindow.getNormalBounds()
    void atomicWriteFile(statePath, JSON.stringify({ ...bounds, maximized: mainWindow.isMaximized() }, null, 2))
  })
  mainWindow.on("closed", () => { mainWindow = null })
  await mainWindow.loadURL(await startApplicationServer(dataDirectory))
}

if (handleSquirrelEvent()) {
  // The installer owns startup while shortcuts or an uninstall are being processed.
} else if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.setName(PRODUCT_NAME)
  app.setAboutPanelOptions({
    applicationName: PRODUCT_NAME,
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: `Copyright © ${DEVELOPER_NAME}`,
    authors: [DEVELOPER_NAME],
    website: "https://skyariana.com",
  })
  app.on("second-instance", () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus() }
  })
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(buildApplicationMenu())
    registerIpcHandlers({ getWindow: () => mainWindow, dataDirectory: path.join(app.getPath("userData"), "data") })
    await createMainWindow()
  }).catch((error) => { console.error(error); dialogError(error) })
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) void createMainWindow() })
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit() })
  app.on("before-quit", () => { applicationServer?.kill(); applicationServer = null })
}

function dialogError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  void import("electron").then(({ dialog }) => dialog.showErrorBox(`${PRODUCT_NAME} could not start`, message))
}
