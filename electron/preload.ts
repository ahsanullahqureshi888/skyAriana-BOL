import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("skyDesktop", {
  platform: process.platform,
  selectFiles: (multiple = false) => ipcRenderer.invoke("dialog:open-files", { multiple }),
  selectFolder: () => ipcRenderer.invoke("dialog:open-folder"),
  saveFile: (defaultName: string, bytes: number[]) => ipcRenderer.invoke("file:save", { defaultName, bytes }),
  openFile: (filePath: string) => ipcRenderer.invoke("file:open", filePath),
  revealFile: (filePath: string) => ipcRenderer.invoke("file:reveal", filePath),
  print: () => ipcRenderer.invoke("print:page"),
  exportPageToPdf: (defaultName: string) => ipcRenderer.invoke("print:pdf", defaultName),
  exportBackup: () => ipcRenderer.invoke("backup:export"),
  restoreBackup: () => ipcRenderer.invoke("backup:restore"),
  windowAction: (action: "minimize" | "maximize" | "close" | "fullscreen") => ipcRenderer.invoke("window:action", action),
  // Phase 7 Network Bridge
  getNetworkStatus: () => ipcRenderer.invoke("network:get-status"),
  getNetworkConfig: () => ipcRenderer.invoke("network:get-config"),
  saveNetworkConfig: (config: any) => ipcRenderer.invoke("network:save-config", config),
  testServerConnection: (url: string) => ipcRenderer.invoke("network:test-connection", url),
  switchNetworkMode: (mode: "local" | "server", serverConfig?: any) => ipcRenderer.invoke("network:switch-mode", { mode, serverConfig }),
})

// Native Desktop Menu Event Bridge
ipcRenderer.on("menu:new", () => {
  window.dispatchEvent(new CustomEvent("skybol:navigate-view", { detail: { view: "bol" } }))
  window.dispatchEvent(new CustomEvent("skybol:create-new-bol"))
})
ipcRenderer.on("menu:open", () => {
  window.dispatchEvent(new CustomEvent("skybol:navigate-view", { detail: { view: "bol" } }))
  window.dispatchEvent(new CustomEvent("skybol:editor-action", { detail: { action: "saved-documents", tab: "saved-documents" } }))
})
ipcRenderer.on("menu:save", () => {
  window.dispatchEvent(new CustomEvent("skybol:editor-action", { detail: { action: "save" } }))
})
ipcRenderer.on("menu:export-pdf", () => {
  window.dispatchEvent(new CustomEvent("skybol:editor-action", { detail: { action: "download" } }))
})

