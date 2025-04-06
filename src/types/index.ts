// 基础设置类型
export interface Settings {
  apiKey: string
  prompts: Record<string, string>
  shortcut: string
}

// 存储设置类型
export interface StoredSettings {
  settings: Settings
}

// AI响应参数类型
export interface AIRequestParams {
  text: string
  persona: string
}

// 窗口控制命令类型
export type WindowCommand = 'minimize' | 'hide' | 'close-popup' 