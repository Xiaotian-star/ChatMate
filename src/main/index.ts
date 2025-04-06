import { app, shell, BrowserWindow, Tray, Menu, globalShortcut, clipboard, screen, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { Settings, StoredSettings } from '../types'
import Store from 'electron-store'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// 创建配置存储实例
const store = new Store({
  name: 'settings', // 配置文件名称
  defaults: {
    settings: {
      apiKey: process.env.DEEPSEEK_API_KEY || '', // 从环境变量获取 API Key
      prompts: {
        '职场精英': '你是一位职场人士，用简短专业的口吻回复，不超过50字。',
        '暖心朋友': '你是一位知心朋友，用简短温暖的口吻回复，像朋友聊天一样，不超过50字。',
        '情感专家': '你是一位情感顾问，用简短贴心的方式回复，像日常对话一样，不超过50字。'
      },
      shortcut: 'F6'
    }
  },
  serialize: (value: unknown) => {
    try {
      return JSON.stringify(value, null, 2)
    } catch (error) {
      console.error('序列化设置失败:', error)
      return '{}'
    }
  },
  deserialize: (value: string) => {
    try {
      return JSON.parse(value)
    } catch (error) {
      console.error('反序列化设置失败:', error)
      return {}
    }
  }
})

// 全局变量
let tray: Tray | null = null
let popupWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null
let currentShortcut: string | null = null

// 创建弹出窗口
function createPopupWindow() {
  // 获取主显示器
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  // 设置窗口大小
  const windowWidth = 400  // 调整宽度
  const windowHeight = 500 // 调整高度

  // 计算窗口位置，使其居中
  const x = Math.floor((width - windowWidth) / 2)
  const y = Math.floor((height - windowHeight) / 2)

  popupWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    frame: false,
    show: false,
    alwaysOnTop: true,
    transparent: true,
    backgroundColor: '#00000000', // 设置透明背景
    hasShadow: false, // 去掉阴影
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    popupWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/#/popup`)
  } else {
    popupWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'popup' })
  }
}

// 显示弹出窗口
async function showPopup(text?: string) {
  if (!popupWindow) {
    createPopupWindow()
    
    // 等待窗口加载完成
    if (popupWindow) {
      await new Promise<void>((resolve) => {
        popupWindow!.webContents.once('did-finish-load', () => {
          resolve()
        })
      })
    }
  }
  
  // 显示窗口
  popupWindow?.show()
  
  // 如果有文本，发送到渲染进程
  if (text && popupWindow) {
    popupWindow.webContents.send('text-selected', text)
  }
}

// 创建主窗口
function createWindow(): void {
  // 如果窗口已存在，则显示并返回
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false, // 默认不显示
    frame: false, // 无边框窗口
    transparent: true, // 透明背景
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    // 初始启动时不显示窗口
  })

  mainWindow.on('close', (event) => {
    // 点击关闭按钮时隐藏窗口而不是退出应用
    if (process.platform !== 'darwin') {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 切换窗口显示状态
function toggleWindow(): void {
  if (!mainWindow) {
    createWindow()
    return
  }
  
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

// 创建托盘
function createTray(): void {
  // 创建适合托盘大小的图标
  const trayIcon = nativeImage.createFromPath(icon)
  const resizedIcon = trayIcon.resize({
    width: 16,
    height: 16
  })
  
  tray = new Tray(resizedIcon)
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '显示/隐藏', 
      click: toggleWindow
    },
    { type: 'separator' },
    { 
      label: '退出', 
      click: () => {
        mainWindow?.destroy() // 确保窗口被销毁
        app.quit()
      } 
    }
  ])
  
  // 设置托盘图标提示
  tray.setToolTip('高情商回复助手')
  
  // 设置托盘菜单
  tray.setContextMenu(contextMenu)
  
  // 添加双击事件
  tray.on('double-click', toggleWindow)
}

let aiClient: { apiKey: string } | null = null

// 初始化 AI 客户端
async function initAIClient(apiKey: string) {
  try {
    aiClient = { apiKey }
    console.log('AI客户端初始化成功')
    return true
  } catch (error) {
    console.error('AI客户端初始化失败:', error)
    return false
  }
}

// 处理 AI 请求
async function handleAIRequest(text: string, persona: string): Promise<string[]> {
  try {
    const settings = store.get('settings')
    const apiKey = process.env.DEEPSEEK_API_KEY || settings?.apiKey
    if (!apiKey) {
      throw new Error('请先设置 API Key')
    }

    // 如果客户端未初始化或初始化失败，重试初始化
    if (!aiClient) {
      const initSuccess = await initAIClient(apiKey)
      if (!initSuccess) {
        throw new Error('AI客户端初始化失败')
      }
    }

    if (!aiClient) {
      throw new Error('AI客户端未初始化')
    }

    const prompt = settings?.prompts?.[persona] || ''
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: `${prompt} 请生成3个不同的简短回复，每个回复都要简短自然，像真人对话一样。用---分隔每个回复。` },
          { role: 'user', content: text }
        ],
        model: 'deepseek-chat',
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || '请求失败')
    }

    const completion = await response.json()
    if (!completion.choices?.[0]?.message?.content) {
      throw new Error('AI响应格式错误')
    }

    // 将回复按分隔符分割成数组
    const replies = completion.choices[0].message.content
      .split('---')
      .map(reply => reply.trim())
      .filter(reply => reply.length > 0)

    return replies
  } catch (error) {
    console.error('AI请求失败:', error)
    throw error
  }
}

// 获取文本内容
async function getSelectedText(): Promise<string> {
  try {
    // 先尝试获取选中文本
    const selectedText = clipboard.readText('selection').trim()
    console.log('选中的文本:', selectedText)
    
    if (selectedText) {
      return selectedText
    }

    // 如果没有选中文本，则获取剪贴板内容
    const clipboardText = clipboard.readText().trim()
    console.log('剪贴板文本:', clipboardText)
    
    if (clipboardText) {
      return clipboardText
    }

    console.log('没有找到文本')
    return ''
  } catch (error) {
    console.error('获取文本失败:', error)
    return ''
  }
}

// 注册全局快捷键
function registerGlobalShortcut() {
  try {
    // 先注销所有快捷键
    globalShortcut.unregisterAll()
    
    // 注册新的快捷键
    const shortcut = store.get('settings')?.shortcut || 'F6'
    console.log('注册快捷键:', shortcut)
    
    const registered = globalShortcut.register(shortcut, async () => {
      console.log('快捷键被触发')
      const text = await getSelectedText()
      console.log('获取到的文本:', text)
      
      if (text) {
        // 先获取文本，再显示窗口并发送文本
        await showPopup(text)
      } else {
        console.log('没有找到文本，不显示弹窗')
      }
    })

    if (registered) {
      console.log('快捷键注册成功:', shortcut)
      currentShortcut = shortcut
    } else {
      console.error('快捷键注册失败:', shortcut)
    }
  } catch (error) {
    console.error('注册快捷键失败:', error)
  }
}

// 注册快捷键
function registerShortcut(shortcut: string): void {
  try {
    console.log('开始注册新快捷键:', shortcut)
    
    // 如果已经注册了快捷键，先注销它
    if (currentShortcut) {
      console.log('注销旧快捷键:', currentShortcut)
      globalShortcut.unregister(currentShortcut)
    }

    // 注册新的快捷键
    const success = globalShortcut.register(shortcut, async () => {
      console.log('新快捷键被触发')
      const text = await getSelectedText()
      console.log('获取到的文本:', text)
      
      if (text) {
        // 先获取文本，再显示窗口并发送文本
        await showPopup(text)
      } else {
        console.log('没有找到文本，不显示弹窗')
      }
    })

    if (success) {
      currentShortcut = shortcut
      console.log('新快捷键注册成功:', shortcut)
    } else {
      console.error('新快捷键注册失败:', shortcut)
    }
  } catch (error) {
    console.error('注册新快捷键失败:', error)
  }
}

// 主进程初始化
app.whenReady().then(async () => {
  // 隐藏 dock 栏图标
  if (process.platform === 'darwin') {
    app.dock.hide()
  }

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 初始化设置和 AI 客户端
  try {
    const settings = store.get('settings')
    if (!settings) {
      // 如果没有设置，使用默认值
      const defaultSettings = {
        apiKey: process.env.DEEPSEEK_API_KEY || '', // 从环境变量获取 API Key
        prompts: {
          '职场精英': '你是一位职场人士，用简短专业的口吻回复，不超过50字。',
          '暖心朋友': '你是一位知心朋友，用简短温暖的口吻回复，像朋友聊天一样，不超过50字。',
          '情感专家': '你是一位情感顾问，用简短贴心的方式回复，像日常对话一样，不超过50字。'
        },
        shortcut: 'F6'
      }
      store.set('settings', defaultSettings)
      await initAIClient(defaultSettings.apiKey)
    } else {
      // 优先使用环境变量中的 API Key
      const apiKey = process.env.DEEPSEEK_API_KEY || settings.apiKey
      await initAIClient(apiKey)
    }
  } catch (error) {
    console.error('初始化设置失败:', error)
  }

  // 注册 IPC 处理程序
  ipcMain.handle('get-ai-response', async (_, params: { text: string; persona: string }) => {
    try {
      return await handleAIRequest(params.text, params.persona)
    } catch (error) {
      console.error('AI响应错误:', error)
      throw error
    }
  })

  ipcMain.handle('get-settings', () => {
    try {
      const settings = store.get('settings')
      console.log('获取设置:', settings)
      // 返回时优先使用环境变量中的 API Key
      return {
        settings: {
          ...settings,
          apiKey: process.env.DEEPSEEK_API_KEY || settings?.apiKey || ''
        }
      }
    } catch (error) {
      console.error('获取设置失败:', error)
      return {
        settings: {
          apiKey: process.env.DEEPSEEK_API_KEY || '', // 使用环境变量
          prompts: {},
          shortcut: 'F6'
        }
      }
    }
  })

  ipcMain.handle('save-settings', (_, settings: StoredSettings) => {
    try {
      // 保存时，如果环境变量中有 API Key，则使用环境变量中的值
      const settingsToSave = {
        ...settings.settings,
        apiKey: process.env.DEEPSEEK_API_KEY || settings.settings.apiKey
      }
      store.set('settings', settingsToSave)
      console.log('保存设置成功:', settingsToSave)
      
      // 更新快捷键
      if (settingsToSave.shortcut) {
        registerShortcut(settingsToSave.shortcut)
      }
      
      // 如果有API Key，初始化AI客户端
      if (settingsToSave.apiKey) {
        initAIClient(settingsToSave.apiKey)
      }
      
      return true
    } catch (error) {
      console.error('保存设置失败:', error)
      throw error
    }
  })

  // 添加窗口控制处理
  ipcMain.on('window-control', (_, command) => {
    switch (command) {
      case 'minimize':
        mainWindow?.minimize()
        break
      case 'hide':
        mainWindow?.hide()
        break
    }
  })

  // 处理窗口移动
  ipcMain.on('move-window', (_, { deltaX, deltaY }) => {
    if (popupWindow) {
      const [x, y] = popupWindow.getPosition()
      popupWindow.setPosition(x + deltaX, y + deltaY)
    }
  })

  ipcMain.on('close-popup', () => {
    if (popupWindow) {
      popupWindow.close()
      popupWindow = null
    }
  })

  createWindow()
  createTray()
  registerGlobalShortcut()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
