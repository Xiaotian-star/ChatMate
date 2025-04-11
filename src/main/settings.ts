import { app, dialog } from 'electron'
import { join } from 'path'
import { writeFileSync, readFileSync, existsSync, mkdirSync, accessSync, constants } from 'fs'
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
    '高情商男友': {
      title: '高情商男友',
      content: '你现在是一位高情商的男友，擅长处理各种情感矛盾和复杂关系。请用温暖、体贴且富有智慧的语言回复以下内容。注意要展现出你的同理心、幽默感和解决问题的能力，同时保持真诚和风度。在对话中要体现出你的成熟稳重，能够巧妙化解矛盾，规避女生的试探风险，并维护健康的情感关系。',
      isDefault: true
    }
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

// 导出设置到文件
export async function exportSettings(): Promise<{ success: boolean; message: string }> {
  try {
    // 获取当前设置
    const settings = getSettings()
    
    // 打开保存对话框
    const { filePath } = await dialog.showSaveDialog({
      title: '导出设置',
      defaultPath: join(app.getPath('downloads'), 'chatmate-settings.json'),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (!filePath) {
      return { success: false, message: '未选择保存位置' }
    }

    // 导出设置
    writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8')
    return { success: true, message: '设置导出成功' }
  } catch (error) {
    console.error('导出设置失败:', error)
    return { success: false, message: `导出失败: ${error.message}` }
  }
}

// 从文件导入设置
export async function importSettings(mode: 'merge' | 'replace' = 'merge'): Promise<{ success: boolean; message: string }> {
  try {
    // 打开文件选择对话框
    const { filePaths } = await dialog.showOpenDialog({
      title: '导入设置',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (filePaths.length === 0) {
      return { success: false, message: '未选择文件' }
    }

    // 读取并解析文件
    const fileContent = readFileSync(filePaths[0], 'utf-8')
    const importedSettings = JSON.parse(fileContent) as StoredSettings

    // 验证设置格式
    if (!validateSettings(importedSettings)) {
      return { success: false, message: '无效的设置文件格式' }
    }

    // 根据模式处理设置
    if (mode === 'merge') {
      const currentSettings = getSettings()
      const mergedSettings = {
        ...currentSettings,
        ...importedSettings,
        prompts: [...currentSettings.prompts, ...importedSettings.prompts]
      }
      saveSettings(mergedSettings)
    } else {
      saveSettings(importedSettings)
    }

    return { success: true, message: '设置导入成功' }
  } catch (error) {
    console.error('导入设置失败:', error)
    return { success: false, message: `导入失败: ${error.message}` }
  }
}

// 验证设置格式
function validateSettings(settings: any): settings is StoredSettings {
  return (
    typeof settings === 'object' &&
    settings !== null &&
    Array.isArray(settings.prompts) &&
    settings.prompts.every(
      (prompt: any) =>
        typeof prompt === 'object' &&
        typeof prompt.title === 'string' &&
        typeof prompt.content === 'string'
    )
  )
} 