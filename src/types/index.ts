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
  prompts: {
    [key: string]: string
  }
  shortcut: string
  conversations: string[]
  autoGenerate: boolean
  autoGenerateShortcut: string
  systemPrompt: string
  autoLaunch?: boolean
}

// AI 请求参数类型
export interface AIRequestParams {
  text: string
  prompt: string
  systemPrompt?: string
}

// 渲染进程API类型
export interface ElectronAPI {
  // AI 响应相关
  getAIResponse: (params: AIRequestParams) => Promise<string[]>
  
  // 设置相关
  getSettings: () => Promise<StoredSettings>
  saveSettings: (settings: StoredSettings) => Promise<boolean>
  
  // 自动启动相关
  getAutoLaunch: () => Promise<boolean>
  setAutoLaunch: (enable: boolean) => Promise<boolean>
  
  // 窗口控制
  windowMin: () => void
  windowMax: () => void
  windowClose: () => void
  
  // 开发者工具
  toggleDevTools: () => Promise<void>
  
  // 其他功能
  onTextSelected: (callback: (text: string) => void) => void
  onAutoGenerate: (callback: (text: string) => void) => void
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