export interface Settings {
  apiKey?: string
  prompts?: Record<string, string>
  shortcut?: string
}

export interface Window {
  electronAPI: {
    getAIResponse: (text: string, persona: string) => Promise<string>
    getSettings: () => Promise<Settings>
    saveSettings: (settings: Settings) => Promise<void>
    onSelectedText: (callback: (text: string) => void) => () => void
    closePopup: () => void
  }
} 