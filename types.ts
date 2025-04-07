// 消息接口
export interface Message {
  role: 'user' | 'assistant'
  content: string
}

// 会话接口
export interface Conversation {
  id: string
  title: string
  messages: Message[]
  lastUpdated: number
}

// 提示词接口
export interface Prompt {
  title: string
  content: string
  isDefault?: boolean
}

// 模型配置接口
export interface Model {
  id: string
  name: string
  type: string
  apiKey: string
  baseUrl: string
  proxy: string
  isActive: boolean
}

// 存储设置接口
export interface StoredSettings {
  apiKey: string
  prompts: Record<string, Prompt>
  shortcut: string
  conversations: Conversation[]
  models: Record<string, Model>
  autoGenerate: boolean
  systemPrompt: string
  autoLaunch?: boolean
}

// 主进程 API 接口
export interface ElectronAPI {
  getSettings: () => Promise<StoredSettings>
  saveSettings: (settings: StoredSettings) => Promise<boolean>
  onTextSelected: (callback: (text: string) => void) => () => void
  closePopup: () => void
  moveWindow: (deltaX: number, deltaY: number) => void
  getAutoLaunch: () => Promise<boolean>
  clearClipboard: () => void
  onAutoGenerate: (callback: () => void) => () => void
  getAIResponse: (params: {
    text: string
    persona: string
    signal: AbortSignal
  }) => Promise<string[]>
} 