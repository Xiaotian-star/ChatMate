// 消息类型
export interface Message {
  role: 'user' | 'assistant'
  content: string
}

// 对话类型
export interface Conversation {
  id: string
  title: string
  messages: Message[]
  lastUpdated: number
}

// 模型配置接口
export interface Model {
  id: string
  name: string
  type: string
  apiKey: string
  baseUrl?: string
  proxy?: string
  isActive: boolean
}

// 提示词接口
export interface Prompt {
  title: string
  content: string
  isDefault: boolean
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
  copyToClipboard: (text: string) => Promise<boolean>
  onAutoGenerate: (callback: () => void) => () => void
  getAIResponse: (params: {
    text: string
    persona: string
    signal: AbortSignal
  }) => Promise<string[]>
}

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

export interface AIRequestParams {
  text: string
  persona: string
  modelId: string
  modelConfig: {
    type: string
    apiKey: string
    baseUrl?: string
    proxy?: string
    model?: string
    temperature?: number
    max_tokens?: number
    systemPrompt?: string
    // 其他可能的模型特定参数
    [key: string]: any
  }
} 