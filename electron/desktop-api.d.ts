export {}

declare global {
  interface Window {
    skyDesktop?: {
      platform: string
      selectFiles(multiple?: boolean): Promise<string[]>
      selectFolder(): Promise<string | null>
      saveFile(defaultName: string, bytes: number[]): Promise<string | null>
      openFile(filePath: string): Promise<string>
      revealFile(filePath: string): Promise<void>
      print(): Promise<boolean>
      exportPageToPdf(defaultName: string): Promise<string | null>
      exportBackup(): Promise<string | null>
      restoreBackup(): Promise<number | null>
      windowAction(action: "minimize" | "maximize" | "close" | "fullscreen"): Promise<void>
    }
  }
}
