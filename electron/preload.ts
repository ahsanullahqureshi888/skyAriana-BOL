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
})
