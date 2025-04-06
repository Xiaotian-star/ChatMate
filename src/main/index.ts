import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, shell, clipboard } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { Message, Conversation, AIRequestParams, StoredSettings } from '../types'
import { getAIResponse } from './ai'
import { getSettings, saveSettings } from './settings'
import { update, checkForUpdates } from './update'

let mainWindow: BrowserWindow | null = null
let popupWindow: BrowserWindow | null = null
let tray: Tray | null = null
let registeredShortcut: string | null = null

// 判断是否为开发环境
const isDevelopment = process.env.NODE_ENV === 'development'

// 创建托盘
function createTray() {
  // 创建托盘图标
  const trayIcon = nativeImage.createFromPath(icon)
  // 调整图标大小为 16x16 (Windows) 或 18x18 (macOS)
  const iconSize = process.platform === 'darwin' ? 18 : 16
  const resizedIcon = trayIcon.resize({ width: iconSize, height: iconSize })
  
  tray = new Tray(resizedIcon)

  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开设置',
      click: () => {
        showMainWindow()
      }
    },
    {
      type: 'separator'
    },
    {
      label: '快速回复',
      click: () => {
        if (!popupWindow) {
          createPopupWindow()
        } else {
          const clipboardText = clipboard.readText()
          if (clipboardText) {
            popupWindow.webContents.send('selected-text', clipboardText)
            popupWindow.webContents.send('auto-generate')
          }
          popupWindow.show()
        }
      }
    },
    {
      type: 'separator'
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
  
  // macOS 和 Windows 的托盘行为不同
  if (process.platform === 'darwin') {
    // macOS: 左键点击显示设置窗口
    tray.on('click', () => {
      showMainWindow()
    })
    
    // 右键点击显示菜单
    tray.on('right-click', () => {
      tray?.popUpContextMenu(contextMenu)
    })
  } else {
    // Windows: 左键点击显示设置窗口，右键显示菜单
    tray.on('click', () => {
      showMainWindow()
    })
    
    // 设置右键菜单
    tray.setContextMenu(contextMenu)
  }
}

// 显示主窗口
function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
  }
  
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
  }
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
    width: 600,
    height: 600,
    frame: false,
    show: false,
    alwaysOnTop: true,
    resizable: false,
    useContentSize: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true // 确保开发者工具可用
    }
  })

  // 打开开发者工具
  if (is.dev) {
    popupWindow.webContents.openDevTools()
  }

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
    show: false,
    frame: false, // 无边框
    transparent: true, // 透明背景
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true // 确保开发者工具可用
    }
  })

  mainWindow.on('ready-to-show', () => {
    // mainWindow.show() // 注释掉这行，使窗口默认不显示
    // 根据环境决定是否打开开发者工具
    if (isDevelopment) {
      mainWindow.webContents.openDevTools()
      // 注册开发者工具快捷键
      globalShortcut.register('CommandOrControl+Shift+I', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.toggleDevTools()
        }
      })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 添加窗口控制事件处理
  ipcMain.on('window-min', () => {
    mainWindow?.minimize()
  })

  ipcMain.on('window-max', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.restore()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.on('window-close', () => {
    mainWindow?.hide() // 点击关闭时隐藏窗口而不是退出应用
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 注册 IPC 事件处理
  ipcMain.handle('toggle-devtools', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.toggleDevTools()
    }
  })
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
  
  // 注册开发者工具快捷键
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools()
    }
  })
  
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

// 应用退出时注销快捷键
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
  try {
    const settings = await getSettings()
    return settings
  } catch (error) {
    console.error('获取设置时出错:', error)
    throw error
  }
})

// 保存设置
ipcMain.handle('save-settings', async (_, settings: StoredSettings) => {
  try {
    const success = await saveSettings(settings)
    return success
  } catch (error) {
    console.error('保存设置时出错:', error)
    throw error
  }
})

// 自动启动相关
ipcMain.handle('get-auto-launch', async () => {
  try {
    const settings = await getSettings()
    return settings.autoLaunch || false
  } catch (error) {
    console.error('获取自动启动设置失败:', error)
    return false
  }
})

ipcMain.handle('set-auto-launch', async (_, enable: boolean) => {
  try {
    const settings = await getSettings()
    const updatedSettings = {
      ...settings,
      autoLaunch: enable
    }
    const success = await saveSettings(updatedSettings)
    
    if (success) {
      // 根据操作系统设置自动启动
      if (process.platform === 'darwin') {
        app.setLoginItemSettings({
          openAtLogin: enable,
          openAsHidden: true
        })
      } else if (process.platform === 'win32') {
        app.setLoginItemSettings({
          openAtLogin: enable,
          path: process.execPath
        })
      }
    }
    
    return success
  } catch (error) {
    console.error('设置自动启动失败:', error)
    return false
  }
})

// 关闭弹窗
ipcMain.on('close-popup', () => {
  if (popupWindow) {
    popupWindow.close()
  }
})

// 检查更新
ipcMain.handle('check-for-updates', async () => {
  try {
    return await checkForUpdates()
  } catch (error) {
    console.error('检查更新失败:', error)
    throw error
  }
})

// 调整窗口大小
ipcMain.on('resize-window', (_, { width, height }) => {
  if (popupWindow) {
    // 设置固定大小
    const fixedWidth = 600
    const fixedHeight = 600

    // 获取当前窗口位置
    const [currentX, currentY] = popupWindow.getPosition()

    // 设置新的位置和大小
    popupWindow.setBounds({
      x: currentX,
      y: currentY,
      width: fixedWidth,
      height: fixedHeight
    }, true) // true 表示使用动画效果
  }
})
