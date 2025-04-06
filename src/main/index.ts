import { app, shell, BrowserWindow, Tray, Menu, globalShortcut, clipboard, screen, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { Settings, StoredSettings, AIRequestParams, UpdateInfo } from '../types'
import Store from 'electron-store'
import * as dotenv from 'dotenv'
import axios from 'axios'

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
      shortcut: 'F6',
      conversations: []
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
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 当窗口失去焦点时自动关闭
  popupWindow.on('blur', () => {
    if (popupWindow) {
      popupWindow.close()
      popupWindow = null
    }
  })

  // 窗口关闭时清理引用
  popupWindow.on('closed', () => {
    popupWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    popupWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/#/popup`)
  } else {
    popupWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'popup' })
  }
}

// 显示弹出窗口
async function showPopup() {
  if (popupWindow) {
    popupWindow.show()
    return
  }

  createPopupWindow()
  
  // 等待窗口加载完成
  await new Promise<void>((resolve) => {
    popupWindow!.webContents.once('did-finish-load', () => {
      resolve()
    })
  })

  popupWindow?.show()
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

// 处理AI请求
async function handleAIRequest(params: AIRequestParams): Promise<string[]> {
  const settings = store.get('settings') as Settings
  let conversation = null

  // 如果提供了会话ID，查找或创建会话
  if (params.conversationId) {
    conversation = settings.conversations?.find(c => c.id === params.conversationId)
    if (!conversation) {
      conversation = {
        id: params.conversationId,
        title: params.text.slice(0, 30) + '...',
        messages: [],
        lastUpdated: Date.now()
      }
      settings.conversations = settings.conversations || []
      settings.conversations.push(conversation)
    }
  }

  // 构建消息历史
  const messages = []
  
  // 添加系统提示
  const prompt = settings.prompts?.[params.persona] || '你是一个高情商的AI助手，擅长提供简短、得体、自然的回复，像真人对话一样。每次回复不超过50字。'
  messages.push({
    role: 'system',
    content: prompt
  })

  // 添加历史消息（最近5条）
  if (conversation?.messages) {
    const recentMessages = conversation.messages.slice(-5)
    messages.push(...recentMessages)
  }

  // 添加当前用户消息
  messages.push({
    role: 'user',
    content: params.text
  })

  try {
    // 获取API密钥，优先使用环境变量
    const apiKey = process.env.DEEPSEEK_API_KEY || settings.apiKey
    if (!apiKey) {
      throw new Error('请先设置 API Key')
    }

    // 使用不同的温度值生成多个回复
    const temperatures = [0.5, 0.7, 0.9]
    const replies: string[] = []

    // 并行发送多个请求
    const requests = temperatures.map(temp => 
      fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: temp,
          n: 1,
          stream: false
        })
      }).then(async response => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error?.message || `API请求失败: ${response.status}`)
        }
        return response.json()
      }).then(data => data.choices[0].message.content.trim())
    )

    // 等待所有请求完成
    const results = await Promise.all(requests)
    replies.push(...results)

    // 如果是会话模式，保存对话历史
    if (conversation) {
      conversation.messages.push({
        role: 'user',
        content: params.text
      })
      conversation.messages.push({
        role: 'assistant',
        content: replies[0] // 保存第一个回复作为历史记录
      })
      conversation.lastUpdated = Date.now()
      store.set('settings', settings)
    }

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
      
      try {
        // 获取选中的文本
        const text = await getSelectedText()
        console.log('获取到的文本:', text || '没有找到文本')
        
        // 无论是否有文本都显示弹窗
        await showPopup()
        
        // 如果有文本，发送给渲染进程并触发自动生成
        if (text) {
          popupWindow?.webContents.send('selected-text', text)
          // 延迟一小段时间后触发自动生成
          setTimeout(() => {
            popupWindow?.webContents.send('auto-generate')
          }, 200)
        }
      } catch (err) {
        console.error('获取选中文本失败:', err)
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

// 检查更新函数
async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    // 从 package.json 获取当前版本
    const currentVersion = app.getVersion()
    
    // 从 GitHub API 获取所有版本信息
    const response = await axios.get('https://api.github.com/repos/nightmare117/wechat-assistant/releases')
    
    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      return {
        hasUpdate: false
      }
    }
    
    // 获取最新版本
    const latestRelease = response.data[0]
    const latestVersion = latestRelease.tag_name.replace('v', '')
    
    // 比较版本号
    const hasUpdate = latestVersion > currentVersion
    
    return {
      hasUpdate,
      version: hasUpdate ? latestVersion : undefined
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    throw new Error('检查更新失败')
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
        shortcut: 'F6',
        conversations: []
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
  ipcMain.handle('get-ai-response', async (_event, params: AIRequestParams) => {
    return handleAIRequest(params)
  })

  ipcMain.handle('get-settings', () => {
    return store.get('settings')
  })

  ipcMain.handle('save-settings', (_event, settings: Settings) => {
    store.set('settings', settings)
    return true
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

  // 添加检查更新处理
  ipcMain.handle('check-for-updates', async () => {
    return checkForUpdates()
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
