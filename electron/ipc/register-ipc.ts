import { BrowserWindow, dialog, ipcMain, shell, clipboard } from "electron"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { atomicWriteFile } from "../services/atomic-file"
import { createDataBackup, restoreDataBackup } from "../services/data"
import { backendManager, type ConnectionMode, type NetworkConfig } from "../backend-manager"

type SavePayload = { defaultName?: string; bytes: number[] }

function safeName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const cleaned = path.basename(value).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim()
  return cleaned || fallback
}

function bytesFrom(payload: SavePayload): Buffer {
  if (!payload || !Array.isArray(payload.bytes) || payload.bytes.length > 150_000_000) {
    throw new Error("Invalid or oversized file payload")
  }
  return Buffer.from(payload.bytes)
}

export function registerIpcHandlers(options: {
  getWindow: () => BrowserWindow | null
  dataDirectory: string
}): void {
  const { getWindow, dataDirectory } = options

  ipcMain.handle("dialog:open-files", async (_event, config?: { multiple?: boolean }) => {
    const options = {
      properties: config?.multiple ? ["openFile", "multiSelections"] : ["openFile"],
    } as Electron.OpenDialogOptions
    const owner = getWindow()
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    return result.canceled ? [] : result.filePaths
  })
  ipcMain.handle("dialog:open-folder", async () => {
    const options: Electron.OpenDialogOptions = { properties: ["openDirectory", "createDirectory"] }
    const owner = getWindow()
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle("file:save", async (_event, payload: SavePayload) => {
    const options: Electron.SaveDialogOptions = {
      defaultPath: safeName(payload?.defaultName, "Sky-Ariana-Export.bin"),
    }
    const owner = getWindow()
    const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    await atomicWriteFile(result.filePath, bytesFrom(payload))
    return result.filePath
  })
  ipcMain.handle("file:open", async (_event, filePath: unknown) => {
    if (typeof filePath !== "string" || !path.isAbsolute(filePath)) throw new Error("Invalid file path")
    return shell.openPath(filePath)
  })
  ipcMain.handle("file:reveal", async (_event, filePath: unknown) => {
    if (typeof filePath !== "string" || !path.isAbsolute(filePath)) throw new Error("Invalid file path")
    shell.showItemInFolder(filePath)
  })
  ipcMain.handle("print:page", async () => {
    const window = getWindow()
    if (!window) return false
    return new Promise<boolean>((resolve) => {
      window.webContents.print({ silent: false, printBackground: true }, (success) => resolve(success))
    })
  })
  ipcMain.handle("print:pdf", async (_event, defaultName?: unknown) => {
    const window = getWindow()
    if (!window) throw new Error("Application window is unavailable")
    const result = await dialog.showSaveDialog(window, {
      defaultPath: safeName(defaultName, "Sky-Ariana-Document.pdf"),
      filters: [{ name: "PDF document", extensions: ["pdf"] }],
    })
    if (result.canceled || !result.filePath) return null
    const pdf = await window.webContents.printToPDF({
      pageSize: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
    })
    await atomicWriteFile(result.filePath, pdf)
    return result.filePath
  })
  ipcMain.handle("backup:export", async () => {
    const nowStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const options: Electron.SaveDialogOptions = {
      defaultPath: `AQ_COMPANIES_FULL_BACKUP_${nowStr}_v5.2.0.json`,
      filters: [{ name: "AQ Companies backup", extensions: ["json"] }],
    }
    const owner = getWindow()
    const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    await atomicWriteFile(result.filePath, await createDataBackup(dataDirectory))
    return result.filePath
  })
  ipcMain.handle("backup:restore", async () => {
    const options: Electron.OpenDialogOptions = {
      properties: ["openFile"], filters: [{ name: "Sky Ariana backup", extensions: ["json"] }],
    }
    const owner = getWindow()
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return null
    return restoreDataBackup(dataDirectory, await readFile(result.filePaths[0], "utf8"))
  })
  ipcMain.handle("window:action", (_event, action: unknown) => {
    const window = getWindow()
    if (!window || typeof action !== "string") return
    if (action === "minimize") window.minimize()
    else if (action === "maximize") window.isMaximized() ? window.unmaximize() : window.maximize()
    else if (action === "close") window.close()
    else if (action === "fullscreen") window.setFullScreen(!window.isFullScreen())
  })

  // Phase 7: Multi-PC Office Network & Central Server IPC Handlers
  ipcMain.handle("network:get-status", async () => {
    return backendManager.getNetworkStatus()
  })

  ipcMain.handle("network:get-config", async () => {
    return backendManager.getNetworkConfig()
  })

  ipcMain.handle("network:save-config", async (_event, config: Partial<NetworkConfig>) => {
    return backendManager.saveNetworkConfig(config)
  })

  ipcMain.handle("network:test-connection", async (_event, url: string) => {
    return backendManager.testServerConnection(url)
  })

  ipcMain.handle("network:switch-mode", async (_event, payload: { mode: ConnectionMode; serverConfig?: Partial<NetworkConfig> }) => {
    return backendManager.switchMode(payload.mode, payload.serverConfig)
  })

  // Desktop Global Clipboard Bridge Handlers
  ipcMain.handle("clipboard:read-text", () => {
    try {
      return clipboard.readText()
    } catch {
      return ""
    }
  })

  ipcMain.handle("clipboard:write-text", (_event, text: unknown) => {
    try {
      if (typeof text === "string") {
        clipboard.writeText(text)
        return true
      }
      return false
    } catch {
      return false
    }
  })
}
