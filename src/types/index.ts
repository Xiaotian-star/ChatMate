// 消息类型
export interface Message {
  role: string
  content: string
}

// 会话类型
export interface Conversation {
  id: string
  title: string
  messages: Array<{
    role: string
    content: string
  }>
  lastUpdated: number
}

// 设置类型
export interface Settings {
  apiKey: string
  prompts: {
    [key: string]: string
  }
  shortcut: string
  conversations: Conversation[]
}

// 存储的设置类型
export interface StoredSettings {
  settings: Settings
}

// AI请求参数类型
export interface AIRequestParams {
  text: string
  persona: string
  conversationId?: string
}

// 窗口命令类型
export type WindowCommand = 'minimize' | 'hide' | 'close-popup'

// 渲染进程API类型
export interface ElectronAPI {
  getAIResponse: (params: AIRequestParams) => Promise<string[]>
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<boolean>
  onTextSelected: (callback: (text: string) => void) => () => void
  closePopup: () => void
  moveWindow: (deltaX: number, deltaY: number) => void
}

// 更新信息类型
export interface UpdateInfo {
  hasUpdate: boolean
  version?: string
} 