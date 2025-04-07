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

// 设置类型
export interface Prompt {
  title: string
  content: string
  isDefault: boolean
}

export interface StoredSettings {
  prompts: Record<string, Prompt>
  shortcut: string
  conversations: Conversation[]
  models: Record<string, Model>
  autoGenerate: boolean
  systemPrompt: string
  autoLaunch?: boolean
}

// AI 请求参数类型
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

// AI 响应类型
export interface ModelResponse {
  modelId: string
  content?: string
  error?: string
}

// 渲染进程API类型
export interface ElectronAPI {
  // AI 响应相关
  getAIResponse: (params: AIRequestParams) => Promise<ModelResponse[]>
  
  // 设置相关
  getSettings: () => Promise<StoredSettings>
  saveSettings: (settings: StoredSettings) => Promise<boolean>
  
  // 自动启动相关
  getAutoLaunch: () => Promise<boolean>
  setAutoLaunch: (enabled: boolean) => Promise<boolean>
  
  // 窗口控制
  windowMin: () => void
  windowMax: () => void
  windowClose: () => void
  
  // 开发者工具
  toggleDevTools: () => Promise<void>
  
  // 更新相关
  checkForUpdates: () => Promise<{ hasUpdate: boolean; latestVersion: string; releaseNotes?: string }>
  
  // 快捷键检查
  checkShortcutAvailable: (shortcut: string) => Promise<boolean>
  
  // 其他功能
  onTextSelected: (callback: (text: string) => void) => () => void
  onAutoGenerate: (callback: () => void) => () => void
  closePopup: () => void
  moveWindow: (deltaX: number, deltaY: number) => void
  
  // 导出设置
  exportSettings: () => Promise<{ success: boolean; message: string }>
  
  // 导入设置
  importSettings: (mode: 'merge' | 'replace') => Promise<{ success: boolean; message: string }>
  
  // 清空剪贴板
  clearClipboard: () => void
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