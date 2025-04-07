import type { ElectronAPI } from '../../types'

declare global {
  interface Window {
    electron: {
      process: {
        versions: {
          app: string
        }
      }
    }
    electronAPI: ElectronAPI
  }
}

export {} 