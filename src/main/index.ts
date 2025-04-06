import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, shell, clipboard } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { Message, Conversation, AIRequestParams, StoredSettings } from '../types'
import { getAIResponse } from './ai'
import { getSettings, saveSettings } from './settings'
import { update } from './update'

let mainWindow: BrowserWindow | null = null
let popupWindow: BrowserWindow | null = null
let tray: Tray | null = null
let registeredShortcut: string | null = null

// 创建托盘
function createTray() {
  // 创建托盘图标
  const trayIcon = nativeImage.createFromPath(icon)
  tray = new Tray(trayIcon)

  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
        }
      }
    },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])

  // 设置托盘提示文字
  tray.setToolTip('WeChat Assistant')
  
  // 设置托盘菜单
  tray.setContextMenu(contextMenu)

  // 点击托盘图标时显示主窗口
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })
}

// 创建弹出窗口
function createPopupWindow(): void {
  if (popupWindow) {
    // 如果窗口已存在，显示并发送剪贴板内容
    popupWindow.show()
    const clipboardText = clipboard.readText()
    if (clipboardText) {
      popupWindow.webContents.send('selected-text', clipboardText)
      // 发送自动生成事件
      popupWindow.webContents.send('auto-generate')
    }
    return
  }

  popupWindow = new BrowserWindow({
    width: 500,
    height: 500,
    frame: false,
    show: false,
    alwaysOnTop: true,
    resizable: false,
    useContentSize: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    popupWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/#/popup`)
  } else {
    popupWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/popup'
    })
  }

  // 窗口准备好时发送剪贴板内容
  popupWindow.webContents.on('did-finish-load', () => {
    const clipboardText = clipboard.readText()
    if (clipboardText) {
      popupWindow.webContents.send('selected-text', clipboardText)
      // 发送自动生成事件
      popupWindow.webContents.send('auto-generate')
    }
  })

  popupWindow.on('blur', () => {
    popupWindow?.hide()
  })
}

// 注册快捷键
async function registerShortcut(): Promise<void> {
  try {
    // 获取设置中的快捷键
    const settings = await getSettings()
    const shortcut = settings.shortcut || 'F6'

    // 如果已注册的快捷键与新快捷键不同，先注销旧快捷键
    if (registeredShortcut && registeredShortcut !== shortcut) {
      globalShortcut.unregister(registeredShortcut)
    }

    // 注册新快捷键
    const success = globalShortcut.register(shortcut, () => {
      if (!popupWindow) {
        createPopupWindow()
      } else {
        // 如果窗口已存在，先获取剪贴板内容
        const clipboardText = clipboard.readText()
        
        // 重新加载页面
        if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
          popupWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/#/popup`)
        } else {
          popupWindow.loadFile(join(__dirname, '../renderer/index.html'), {
            hash: '/popup'
          })
        }

        // 页面加载完成后显示窗口并发送剪贴板内容
        popupWindow.webContents.once('did-finish-load', () => {
          popupWindow?.show()
          if (clipboardText) {
            popupWindow?.webContents.send('selected-text', clipboardText)
            // 发送自动生成事件
            popupWindow?.webContents.send('auto-generate')
          }
        })
      }
    })

    if (success) {
      console.log('快捷键注册成功:', shortcut)
      registeredShortcut = shortcut
    } else {
      console.error('快捷键注册失败:', shortcut)
    }
  } catch (error) {
    console.error('注册快捷键时出错:', error)
  }
}

// 创建主窗口
function createWindow(): void {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false, // 默认不显示窗口
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    // mainWindow.show() // 注释掉这行，使窗口默认不显示
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 应用初始化
app.whenReady().then(() => {
  // 设置应用程序名称
  electronApp.setAppUserModelId('com.electron')

  // 默认创建窗口但不显示
  createWindow()
  
  // 创建托盘
  createTray()
  
  // 注册快捷键
  registerShortcut()
  
  // 隐藏 dock 栏图标 (仅 macOS)
  if (process.platform === 'darwin') {
    app.dock.hide()
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 应用关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 注销快捷键
app.on('will-quit', () => {
  if (registeredShortcut) {
    globalShortcut.unregister(registeredShortcut)
  }
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
    const responses = await getAIResponse(params)
    
    // 添加第一个 AI 回复到对话历史
    if (responses.length > 0) {
      messages.push({
        role: 'assistant',
        content: responses[0]
      })
    }

    // 更新对话时间
    if (conversation) {
      conversation.lastUpdated = Date.now()
    }

    // 只返回回复数组
    return responses
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

// 检查更新
ipcMain.handle('check-for-updates', async () => {
  return update()
})

// 调整窗口大小
ipcMain.on('resize-window', (_, { width, height }) => {
  if (popupWindow) {
    // 限制最小和最大尺寸
    const newWidth = Math.min(Math.max(width, 400), 600)
    const newHeight = Math.min(Math.max(height + 16, 300), 800) // 添加一些额外空间

    // 获取当前窗口位置
    const [currentX, currentY] = popupWindow.getPosition()
    const [currentWidth, currentHeight] = popupWindow.getSize()

    // 计算新的位置，保持窗口中心点不变
    const newX = currentX - Math.floor((newWidth - currentWidth) / 2)
    const newY = currentY - Math.floor((newHeight - currentHeight) / 2)

    // 设置新的位置和大小
    popupWindow.setBounds({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    }, true) // true 表示使用动画效果
  }
})
