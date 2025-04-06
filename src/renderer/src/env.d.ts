/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

import type { ElectronAPI } from '../../types'

interface Settings {
  apiKey?: string
  prompts?: Record<string, string>
}

interface Window {
  electronAPI: ElectronAPI
  electron: {
    process: {
      versions: {
        app: string
      }
    }
  }
}
