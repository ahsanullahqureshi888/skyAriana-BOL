import { app, BrowserWindow, Menu, nativeImage, shell } from "electron"
import { spawn, type ChildProcess } from "node:child_process"
import { createServer } from "node:net"
import { mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import { registerIpcHandlers } from "./ipc/register-ipc"
import { atomicWriteFile } from "./services/atomic-file"
import { initializeDataDirectory } from "./services/data"
import { backendManager } from "./backend-manager"

const PRODUCT_NAME = "AQ COMPANIES"
const PRODUCT_DESCRIPTION = "Logistics & BOL Management"
const DEVELOPER_NAME = "Ahsanullah Qureshi"
if (!app.isPackaged) {
  app.setName(`${PRODUCT_NAME} Dev`)
} else {
  app.setName(PRODUCT_NAME)
}
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
  const expiresAt = Date.now() + 60_000
  const cleanUrl = url.trim().replace(/\/+$/, "")
  const probeUrl = `${cleanUrl}/api/health`
  while (Date.now() < expiresAt) {
    try {
      const response = await fetch(probeUrl, {
        signal: AbortSignal.timeout(8000),
      })
      if (response.status < 500) {
        logMain(`Probe succeeded at ${probeUrl} with HTTP ${response.status}`)
        return
      }
    } catch (err: any) {
      logMain(`Probe failed at ${probeUrl}: ${err?.stack || err?.message || err}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error("The bundled application server did not start in time")
}

import { appendFileSync, mkdirSync } from "node:fs"

function logMain(message: string): void {
  try {
    const userData = app.getPath("userData")
    const logDir = path.join(userData, "data", "logs")
    mkdirSync(logDir, { recursive: true })
    appendFileSync(path.join(logDir, "main-process.log"), `[${new Date().toISOString()}] ${message}\n`)
  } catch {}
}

process.on("uncaughtException", (err) => {
  logMain(`[Uncaught Exception] ${err.stack || err.message}`)
})
process.on("unhandledRejection", (reason) => {
  logMain(`[Unhandled Rejection] ${reason}`)
})

async function startApplicationServer(dataDirectory: string): Promise<string> {
  const developmentUrl = process.env.ELECTRON_START_URL
  if (!app.isPackaged) {
    applicationUrl = (developmentUrl || "http://127.0.0.1:3001").trim()
    await waitForServer(applicationUrl)
    return applicationUrl
  }
  logMain(`Reserving port for bundled app server...`)
  const port = await reservePort()
  const serverRoot = path.join(process.resourcesPath, "app-server")
  const serverEntry = path.join(serverRoot, "server.js")
  applicationUrl = `http://127.0.0.1:${port}`
  logMain(`Spawning app server on ${applicationUrl} with ${serverEntry}`)
  applicationServer = spawn(process.execPath, [serverEntry], {
    cwd: serverRoot,
    windowsHide: true,
    stdio: "pipe",
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
  applicationServer.stdout?.on("data", (d) => logMain(`[AppServer] ${d.toString().trim()}`))
  applicationServer.stderr?.on("data", (d) => logMain(`[AppServer Error] ${d.toString().trim()}`))
  applicationServer.once("error", (error) => logMain(`[AppServer Failed to spawn] ${error.message}`))
  applicationServer.once("exit", (code) => logMain(`[AppServer Exited] code ${code}`))
  logMain(`Waiting for app server at ${applicationUrl}...`)
  await waitForServer(applicationUrl)
  logMain(`App server ready at ${applicationUrl}`)
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
  const isDev = !app.isPackaged
  const userData = app.getPath("userData")
  const dataDirectory = isDev ? path.join(process.cwd(), "data") : path.join(userData, "data")
  const statePath = path.join(userData, "window-state.json")
  await mkdir(userData, { recursive: true })
  await mkdir(dataDirectory, { recursive: true })
  const seedDirectory = app.isPackaged ? path.join(process.resourcesPath, "seed-data") : process.cwd()
  await initializeDataDirectory(dataDirectory, seedDirectory)
  process.env.SKY_DATA_DIR = dataDirectory
  void backendManager.start(dataDirectory).catch((err) => console.error("Python backend start warning:", err))
  const state = await readWindowState(statePath)
  const icon = nativeImage.createFromPath(
    app.isPackaged ? path.join(process.resourcesPath, "app-icon.png") : path.join(process.cwd(), "public", "icon-512x512.png"),
  )
  logMain(`Creating main window with dimensions ${state.width}x${state.height}...`)
  mainWindow = new BrowserWindow({
    title: PRODUCT_NAME,
    width: Math.max(1100, state.width), height: Math.max(700, state.height), x: state.x, y: state.y,
    minWidth: 1024, minHeight: 680, show: false, backgroundColor: "#020617", icon,
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
  mainWindow.once("ready-to-show", () => {
    logMain(`Main window ready-to-show triggered`)
    mainWindow?.show()
  })
  mainWindow.on("close", () => {
    if (!mainWindow) return
    const bounds = mainWindow.getNormalBounds()
    void atomicWriteFile(statePath, JSON.stringify({ ...bounds, maximized: mainWindow.isMaximized() }, null, 2))
  })
  mainWindow.on("closed", () => {
    logMain(`Main window closed event fired`)
    mainWindow = null
  })
  logMain(`Starting application server before loading URL...`)
  const targetUrl = await startApplicationServer(dataDirectory)
  logMain(`Loading application URL: ${targetUrl}`)
  await mainWindow.loadURL(targetUrl)
  logMain(`Main window URL load completed successfully`)
}

if (handleSquirrelEvent()) {
  // The installer owns startup while shortcuts or an uninstall are being processed.
} else if (!app.requestSingleInstanceLock()) {
  logMain(`Failed to acquire single instance lock. Another instance is already running. Quitting.`)
  app.quit()
} else {
  logMain(`Single instance lock acquired successfully. Initializing app...`)
  if (app.isPackaged) {
    app.setName(PRODUCT_NAME)
  }
  app.setAboutPanelOptions({
    applicationName: PRODUCT_NAME,
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: `Copyright © ${DEVELOPER_NAME}`,
    authors: [DEVELOPER_NAME],
    website: "https://skyariana.com",
  })
  app.on("second-instance", () => {
    logMain(`Second instance triggered; focusing existing window.`)
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })
  app.whenReady().then(async () => {
    logMain(`Electron app ready. Setting up menus and windows...`)
    Menu.setApplicationMenu(buildApplicationMenu())
    registerIpcHandlers({ getWindow: () => mainWindow, dataDirectory: path.join(app.getPath("userData"), "data") })
    await createMainWindow()
  }).catch((error) => {
    logMain(`[App Error on Startup] ${error instanceof Error ? (error.stack || error.message) : String(error)}`)
    console.error(error)
    dialogError(error)
  })
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) void createMainWindow() })
  app.on("window-all-closed", () => {
    logMain(`All windows closed. Platform: ${process.platform}`)
    if (process.platform !== "darwin") app.quit()
  })
  app.on("before-quit", () => {
    logMain(`App before-quit fired. Cleaning up backend and servers...`)
    void backendManager.stop().catch(console.error)
    applicationServer?.kill()
    applicationServer = null
  })
}

function dialogError(error: unknown): void {
  const message = error instanceof Error ? (error.stack || error.message) : String(error)
  logMain(`[dialogError] ${message}`)
  void import("electron").then(({ dialog }) => dialog.showErrorBox(`${PRODUCT_NAME} could not start`, message))
}
