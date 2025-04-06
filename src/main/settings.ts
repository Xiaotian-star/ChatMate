import Store from 'electron-store'
import type { StoredSettings } from '../types'

// 默认设置
const DEFAULT_SETTINGS: StoredSettings = {
  apiKey: '',
  prompts: {
    '职场精英': '你是一位职场人士，用简短专业的口吻回复，不超过50字。',
    '暖心朋友': '你是一位知心朋友，用简短温暖的口吻回复，像朋友聊天一样，不超过50字。',
    '情感专家': '你是一位情感顾问，用简短贴心的方式回复，像日常对话一样，不超过50字。'
  },
  shortcut: 'F6',
  conversations: []
}

// 创建配置存储实例
const store = new Store<{ settings: StoredSettings }>({
  name: 'settings',
  defaults: {
    settings: DEFAULT_SETTINGS
  }
})

// 获取设置
export function getSettings(): StoredSettings {
  try {
    return store.get('settings')
  } catch (error) {
    console.error('获取设置失败:', error)
    return DEFAULT_SETTINGS
  }
}

// 保存设置
export function saveSettings(settings: StoredSettings): boolean {
  try {
    store.set('settings', settings)
    return true
  } catch (error) {
    console.error('保存设置失败:', error)
    return false
  }
} 