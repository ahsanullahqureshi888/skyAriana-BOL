export {}

declare global {
  interface Window {
    skyDesktop?: {
      exportPageToPdf?: (fileName: string) => Promise<string | null>
      openFile?: (filePath: string) => void
      getNetworkStatus?: () => Promise<any>
      getNetworkConfig?: () => Promise<any>
      testServerConnection?: (url: string) => Promise<any>
      switchNetworkMode?: (mode: string, config: any) => Promise<any>
      [key: string]: any
    }
  }
}
