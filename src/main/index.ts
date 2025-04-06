import { app, shell, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { Message, Conversation, AIRequestParams, StoredSettings } from '../types'
import { getAIResponse } from './ai'
import { getSettings, saveSettings } from './settings'
import { update } from './update'

let mainWindow: BrowserWindow | null = null
let popupWindow: BrowserWindow | null = null

// 创建弹出窗口
function createPopupWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  // 加载页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/popup.html`)
  } else {
    window.loadFile(join(__dirname, '../renderer/popup.html'))
  }

  // 失去焦点时关闭
  window.on('blur', () => {
    window.close()
  })

  // 关闭时清理引用
  window.on('closed', () => {
    popupWindow = null
  })

  return window
}

// 创建主窗口
function createWindow(): void {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 加载页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 应用准备就绪时
app.whenReady().then(() => {
  // 设置应用名称
  electronApp.setAppUserModelId('com.electron')

  // 默认开启硬件加速
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 创建主窗口
  createWindow()

  // 注册快捷键
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    if (popupWindow) {
      popupWindow.close()
    }
    popupWindow = createPopupWindow()
    popupWindow.show()
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 注销所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// 处理 IPC 事件
let conversation: Conversation | null = null
let messages: Message[] = []

// 获取 AI 回复
ipcMain.handle('get-ai-response', async (_, params: AIRequestParams) => {
  const { text, conversationId } = params

  // 查找现有对话
  if (conversationId) {
    conversation = conversation?.id === conversationId ? conversation : null
  } else {
    conversation = null
  }

  // 如果没有现有对话，创建新对话
  if (!conversation) {
    conversation = {
      id: Date.now().toString(),
      title: text.slice(0, 50),
      messages: [],
      lastUpdated: Date.now()
    }
    messages = conversation.messages
  }

  // 添加用户消息
  messages.push({
    role: 'user',
    content: text
  })

  try {
    // 获取 AI 回复
    const response = await getAIResponse(text)
    
    // 添加 AI 回复
    messages.push({
      role: 'assistant',
      content: response
    })

    // 更新对话时间
    if (conversation) {
      conversation.lastUpdated = Date.now()
      return [conversation.id, response]
    }

    return ['default', response]
  } catch (error) {
    console.error('获取 AI 回复失败:', error)
    throw error
  }
})

// 获取设置
ipcMain.handle('get-settings', async () => {
  return getSettings()
})

// 保存设置
ipcMain.handle('save-settings', async (_, settings: StoredSettings) => {
  return saveSettings(settings)
})

// 关闭弹窗
ipcMain.on('close-popup', () => {
  if (popupWindow) {
    popupWindow.close()
  }
})

// 移动窗口
ipcMain.on('move-window', (_, { deltaX, deltaY }) => {
  if (popupWindow) {
    const [x, y] = popupWindow.getPosition()
    popupWindow.setPosition(x + deltaX, y + deltaY)
  }
})

// 检查更新
ipcMain.handle('check-for-updates', async () => {
  return update()
})
