/// <reference types="vite/client" />

import type { ElectronAPI } from '../../types'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Settings {
  apiKey?: string
  prompts?: Record<string, string>
}

declare global {
  interface Window {
    electron: {
      process: {
        versions: {
          app: string
        }
      }
      ipcRenderer: Electron.IpcRenderer
    }
    electronAPI: ElectronAPI
  }
}

export {}
