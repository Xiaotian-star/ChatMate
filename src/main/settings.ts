import Store from 'electron-store'
import type { StoredSettings } from '../types'

// 默认设置
const DEFAULT_SETTINGS: StoredSettings = {
  apiKey: '',
  prompts: {
    '职场精英': '你是一位经验丰富的职场精英，擅长处理各种职场关系。请用专业、得体但不失温度的语言回复，不超过50字。',
    '情感专家': '你是一位富有同理心的情感咨询师，擅长处理各种人际关系。请用温和、理解、富有同理心的方式回复，不超过50字。',
    '外交官': '你是一位资深外交官，擅长处理敏感话题和冲突情况。请用圆润、委婉但不失立场的方式回复，不超过50字。',
    '智者': '你是一位睿智的长者，擅长给出富有哲理的建议。请用平和、富有智慧的方式回复，不超过50字。',
    '知心朋友': '你是一位知心好友，擅长倾听和开导。请用轻松、亲切的语气回复，不超过50字。',
    '幽默达人': '你是一位幽默风趣的达人，擅长用轻松愉快的方式化解尴尬。请用诙谐、机智但不失分寸的方式回复，不超过50字。',
    '高情商渣男': '你是一位高情商且精通法律的渣男，擅长识破并应对各种感情套路和陷阱。请用圆滑、机智但不失分寸的方式回复，注意规避法律风险，不超过50字。'
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