import { app } from 'electron'
import { join } from 'path'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import type { StoredSettings } from '../types'

// 创建一个用于记录错误的简单日志函数
function logError(error: unknown, context: string) {
  const timestamp = new Date().toISOString()
  const errorMessage = error instanceof Error ? error.message : String(error)
  const logMessage = `[${timestamp}] ${context}: ${errorMessage}\n`
  
  try {
    const logPath = join(app.getPath('userData'), 'logs')
    if (!existsSync(logPath)) {
      mkdirSync(logPath, { recursive: true })
    }
    const logFile = join(logPath, 'settings-error.log')
    writeFileSync(logFile, logMessage, { flag: 'a' })
  } catch (e) {
    // 如果连日志都无法写入，我们只能忽略这个错误
  }
}

// 默认设置
const defaultSettings: StoredSettings = {
  apiKey: '',
  prompts: {
    '职场精英': '你现在是一位经验丰富的职场精英，擅长处理各种职场关系。请用专业、得体但不失温度的语言回复以下内容。注意措辞要准确、积极向上、富有建设性，同时也要体现出对他人的尊重和理解。',
    '情感专家': '你现在是一位富有同理心的情感咨询师，擅长处理各种人际关系。请用温和、理解、富有同理心的方式回复以下内容。注意语言要温暖、富有支持性，同时也要给出建设性的建议。',
    '暖心朋友': '你现在是一位知心好友，擅长倾听和开导。请用轻松、亲切的语气回复以下内容。注意语言要自然、真诚，像朋友间的对话一样温暖和真实。'
  },
  shortcut: 'F6',
  conversations: [],
  autoGenerate: false,
  autoGenerateShortcut: 'CommandOrControl+G',
  systemPrompt: ''
}

// 使用 JSON 文件直接存储设置
const settingsPath = join(app.getPath('userData'), 'settings.json')

// 获取设置
export async function getSettings(): Promise<StoredSettings> {
  try {
    // 确保设置文件存在
    if (!existsSync(settingsPath)) {
      writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8')
      return defaultSettings
    }

    // 读取设置文件
    const fileContent = await import('fs/promises').then(fs => 
      fs.readFile(settingsPath, 'utf8')
    )
    const settings = JSON.parse(fileContent)

    // 合并默认设置
    return {
      ...defaultSettings,
      ...settings
    }
  } catch (error) {
    logError(error, 'Failed to get settings')
    return defaultSettings
  }
}

// 保存设置
export async function saveSettings(settings: StoredSettings): Promise<boolean> {
  try {
    // 验证设置对象
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings object')
    }

    // 确保所有必需的字段都存在
    const validatedSettings: StoredSettings = {
      ...defaultSettings,
      ...settings
    }

    // 尝试序列化设置以验证其有效性
    const settingsJson = JSON.stringify(validatedSettings, null, 2)

    // 确保目录存在
    const settingsDir = join(app.getPath('userData'))
    if (!existsSync(settingsDir)) {
      mkdirSync(settingsDir, { recursive: true })
    }

    // 保存设置
    await import('fs/promises').then(fs => 
      fs.writeFile(settingsPath, settingsJson, 'utf8')
    )

    return true
  } catch (error) {
    logError(error, 'Failed to save settings')
    return false
  }
} 