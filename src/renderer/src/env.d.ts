/// <reference types="vite/client" />

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

interface Window {
  electronAPI: {
    getAIResponse: (text: string, persona: string) => Promise<string>
    getSettings: () => Promise<Settings>
    saveSettings: (settings: Settings) => Promise<void>
    onSelectedText: (callback: (text: string) => void) => () => void
  }
}
