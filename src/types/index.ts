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

// 设置类型
export interface StoredSettings {
  apiKey: string
  prompts: Record<string, string>
  shortcut: string
  conversations: Conversation[]
}

// AI 请求参数类型
export interface AIRequestParams {
  text: string
  conversationId?: string
  persona?: string
}

// 渲染进程API类型
export interface ElectronAPI {
  getAIResponse: (params: AIRequestParams) => Promise<string[]>
  getSettings: () => Promise<StoredSettings>
  saveSettings: (settings: StoredSettings) => Promise<boolean>
  onTextSelected: (callback: (text: string) => void) => () => void
  onAutoGenerate: (callback: () => void) => () => void
  closePopup: () => void
  moveWindow: (deltaX: number, deltaY: number) => void
  checkForUpdates: () => Promise<UpdateInfo>
}

// 更新信息类型
export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseNotes: string
  downloadUrl: string
  publishedAt: string
} 