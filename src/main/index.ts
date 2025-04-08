import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, shell, clipboard } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { Message, Conversation, AIRequestParams, StoredSettings } from '../types'
import { getAIResponse } from './ai'
import { getSettings, saveSettings, exportSettings, importSettings } from './settings'
import { checkForUpdates } from './update'

// 在 macOS 上，在应用启动前就隐藏 dock 图标
if (process.platform === 'darwin') {
  app.dock.hide()
}

// 获取 preload 脚本的路径
const preload = join(__dirname, '../preload/index.js')

let tray: Tray | null = null
let popupWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null

// 判断是否为开发环境
const isDevelopment = process.env.NODE_ENV === 'development'

// 保存当前注册的快捷键
let currentMainShortcut: string | null = null
let currentAutoGenerateShortcut: string | null = null

// 显示设置窗口
function showSettingsWindow() {

 
  if (!settingsWindow || settingsWindow.isDestroyed()) {
    createSettingsWindow()
  } else {
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore()
    }
    settingsWindow.show()
    settingsWindow.focus()
  }
}

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
        showSettingsWindow()
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
          popupWindow.show()
          const clipboardText = clipboard.readText()
          console.log('读取到的剪贴板内容:', clipboardText)
          if (clipboardText) {
            console.log('准备发送剪贴板内容到渲染进程')
            popupWindow.webContents.send('text-selected', clipboardText)
            popupWindow.webContents.send('auto-generate')
          }
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
  tray.setToolTip('ChatMate')
  
  // macOS 和 Windows 的托盘行为不同
  if (process.platform === 'darwin') {
    // macOS: 左键点击显示设置窗口
    tray.on('click', () => {
      showSettingsWindow()
    })
    
    // 右键点击显示菜单
    tray.on('right-click', () => {
      tray?.popUpContextMenu(contextMenu)
    })
  } else {
    // Windows: 左键点击显示设置窗口，右键显示菜单
    tray.on('click', () => {
      showSettingsWindow()
    })
    
    // 设置右键菜单
    tray.setContextMenu(contextMenu)
  }
}

// 检查快捷键是否已被注册
const isShortcutRegistered = (shortcut: string): boolean => {
  try {
    // 尝试注册快捷键
    const success = globalShortcut.register(shortcut, () => {})
    // 如果注册成功，立即注销
    if (success) {
      globalShortcut.unregister(shortcut)
      return false
    }
    return true
  } catch (error) {
    console.error('检查快捷键时出错:', error)
    return true
  }
}

// 注册快捷键
const registerShortcuts = async () => {
  try {
    // 获取设置
    const settings = await getSettings()
    if (!settings) {
      console.error('无法获取设置，快捷键注册失败')
      return false
    }

    // 注销所有现有快捷键
    globalShortcut.unregisterAll()
    let mainShortcutRegistered = false
    let autoGenerateShortcutRegistered = false

    // 注册主快捷键
    if (settings.shortcut) {
      // 如果快捷键发生变化，注销旧的快捷键
      if (currentMainShortcut && currentMainShortcut !== settings.shortcut) {
        globalShortcut.unregister(currentMainShortcut)
        console.log('注销旧的主快捷键:', currentMainShortcut)
      }

      // 检查快捷键是否被系统占用
      if (isShortcutRegistered(settings.shortcut)) {
        console.error('快捷键已被系统占用:', settings.shortcut)
      } else {
        const registered = globalShortcut.register(settings.shortcut, () => {
          // 如果窗口不存在或已被销毁，创建新窗口
          if (!popupWindow || popupWindow.isDestroyed()) {
            createPopupWindow()
          } else {
            // 如果窗口存在但隐藏，显示窗口并发送剪贴板内容
            popupWindow.show()
            const clipboardText = clipboard.readText()
            console.log('读取到的剪贴板内容:', clipboardText)
            if (clipboardText) {
              console.log('准备发送剪贴板内容到渲染进程')
              popupWindow.webContents.send('text-selected', clipboardText)
              if (settings.autoGenerate) {
                popupWindow.webContents.send('auto-generate')
              }
            }
          }
        })

        if (!registered) {
          console.error('快捷键注册失败:', settings.shortcut)
        } else {
          mainShortcutRegistered = true
          currentMainShortcut = settings.shortcut
          console.log('主快捷键注册成功:', settings.shortcut)
        }
      }
    } else {
      // 如果没有设置主快捷键，注销之前的快捷键
      if (currentMainShortcut) {
        globalShortcut.unregister(currentMainShortcut)
        currentMainShortcut = null
        console.log('注销旧的主快捷键，因为没有新的快捷键设置')
      }
    }

    

    // 如果两个快捷键都注册失败，返回 false
    if (settings.shortcut && !mainShortcutRegistered) {
      console.error('主快捷键注册失败')
      return false
    }
  

    return true
  } catch (error) {
    console.error('注册快捷键失败:', error)
    // 发生错误时注销所有快捷键
    globalShortcut.unregisterAll()
    currentMainShortcut = null
    currentAutoGenerateShortcut = null
    return false
  }
}

// 创建弹出窗口
function createPopupWindow(): void {
  // 如果窗口已存在且未被销毁，直接显示
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.show()
    const clipboardText = clipboard.readText()
    console.log('读取到的剪贴板内容:', clipboardText)
    if (clipboardText) {
      console.log('准备发送剪贴板内容到渲染进程')
      popupWindow.webContents.send('text-selected', clipboardText)
    }
    return
  }

  // 创建新窗口
  popupWindow = new BrowserWindow({
    width: 400,
    height: 600,
    frame: false,
    show: false,
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    useContentSize: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true
    }
  })

  // 处理窗口移动
  ipcMain.on('move-window', (_, { deltaX, deltaY }) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      const [x, y] = popupWindow.getPosition()
      popupWindow.setPosition(x + deltaX, y + deltaY)
    }
  })

  // 加载页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    popupWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/#/popup`)
  } else {
    popupWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/popup'
    })
  }

  // 页面加载完成后的处理
  popupWindow.webContents.on('did-finish-load', () => {
    if (!popupWindow || popupWindow.isDestroyed()) return
    
    // 先显示窗口
    popupWindow.show()
    
    // 然后检查剪贴板
    const clipboardText = clipboard.readText()
    console.log('页面加载完成，读取到的剪贴板内容:', clipboardText)
    if (clipboardText) {
      console.log('准备发送剪贴板内容到渲染进程')
      popupWindow.webContents.send('text-selected', clipboardText)
    }
  })

  // 窗口失去焦点时隐藏
  popupWindow.on('blur', () => {
    if (!popupWindow || popupWindow.isDestroyed()) return
    popupWindow.hide()
  })

  // 窗口关闭时清空引用
  popupWindow.on('closed', () => {
    popupWindow = null
  })
}

// 创建主窗口
function createWindow(): void {
  // 不再需要创建主窗口
}

// 应用初始化
app.whenReady().then(async () => {
  // 设置应用程序名称
  electronApp.setAppUserModelId('com.electron')

  // 在 macOS 上设置 dock 图标（但保持隐藏状态）
  if (process.platform === 'darwin') {
    const dockIcon = nativeImage.createFromPath(icon).resize({ width: 128, height: 128 })
    app.dock.setIcon(dockIcon)
  }

  // 确保清理所有已注册的快捷键
  globalShortcut.unregisterAll()
  currentMainShortcut = null
  currentAutoGenerateShortcut = null
  
  // 创建托盘
  createTray()
  
  // 注册快捷键
  const registered = await registerShortcuts()
  if (!registered) {
    console.error('初始化快捷键注册失败')
  }
  
  // 注册开发者工具快捷键
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools()
    }
  })
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      showSettingsWindow()
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
  if (popupWindow) {
    globalShortcut.unregister(popupWindow.webContents.getTitle())
  }
  globalShortcut.unregisterAll()
})

// 处理 IPC 事件
let conversation: Conversation | null = null
let messages: Message[] = []

// 获取 AI 回复
ipcMain.handle('get-ai-response', async (_, params: AIRequestParams) => {
  const { text } = params

  // 创建新对话
  conversation = {
    id: Date.now().toString(),
    title: text.slice(0, 50),
    messages: [],
    lastUpdated: Date.now()
  }
  messages = conversation.messages

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
ipcMain.handle('get-settings', () => {
  return getSettings()
})

// 保存设置
ipcMain.handle('save-settings', async (_, settings: StoredSettings) => {
  try {
    // 保存当前快捷键状态
    const oldMainShortcut = currentMainShortcut
    const oldAutoGenerateShortcut = currentAutoGenerateShortcut
    
    // 注销所有现有快捷键
    globalShortcut.unregisterAll()
    
    // 清除当前快捷键记录
    currentMainShortcut = null
    currentAutoGenerateShortcut = null
    
    // 保存设置
    await saveSettings(settings)
    
    // 重新注册快捷键
    const registered = await registerShortcuts()
    if (!registered) {
      // 如果注册失败，尝试恢复旧的快捷键
      if (oldMainShortcut) {
        globalShortcut.register(oldMainShortcut, () => {
          if (!popupWindow || popupWindow.isDestroyed()) {
            createPopupWindow()
          } else {
            const clipboardText = clipboard.readText()
            console.log('读取到的剪贴板内容:', clipboardText)
            if (clipboardText) {
              console.log('准备发送剪贴板内容到渲染进程')
              popupWindow.show()
              popupWindow.webContents.send('text-selected', clipboardText)
              if (settings.autoGenerate) {
                popupWindow.webContents.send('auto-generate')
              }
            }
          }
        })
        currentMainShortcut = oldMainShortcut
      }
      
      if (oldAutoGenerateShortcut) {
        globalShortcut.register(oldAutoGenerateShortcut, () => {
          if (!popupWindow || popupWindow.isDestroyed()) {
            createPopupWindow()
          } else {
            popupWindow.show()
            popupWindow.webContents.send('auto-generate')
          }
        })
        currentAutoGenerateShortcut = oldAutoGenerateShortcut
      }
      
      throw new Error('快捷键注册失败')
    }
    
    return true
  } catch (error) {
    console.error('保存设置失败:', error)
    return false
  }
})

// 导出设置
ipcMain.handle('export-settings', async () => {
  return await exportSettings()
})

// 导入设置
ipcMain.handle('import-settings', async (_, mode: 'merge' | 'replace') => {
  return await importSettings(mode)
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
ipcMain.on('resize-window', (_, { deltaX, deltaY }) => {
  if (popupWindow) {
    // 获取当前窗口位置和大小
    const [currentX, currentY] = popupWindow.getPosition()
    
    // 设置新的位置，保持大小不变
    popupWindow.setBounds({
      x: currentX + deltaX,
      y: currentY + deltaY,
      width: 400,
      height: 600
    }, true) // true 表示使用动画效果
  }
})

// 检查快捷键是否可用
ipcMain.handle('check-shortcut-available', async (_event, shortcut: string) => {
  try {
    // 检查是否已经注册了这个快捷键
    const isRegistered = globalShortcut.isRegistered(shortcut)
    return !isRegistered
  } catch (error) {
    console.error('检查快捷键时出错:', error)
    return false
  }
})

// 清空剪贴板
ipcMain.on('clear-clipboard', () => {
  clipboard.writeText('')
})

function createSettingsWindow() {
  // 创建设置窗口
  settingsWindow = new BrowserWindow({
    width: 900,
    height: 680,
    show: false,
    frame: false,
    resizable: true,
    webPreferences: {
      preload,
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: true,
      devTools: true // 添加开发者工具支持
    }
  })

  // 在 macOS 上，显示窗口时显示 dock 图标
  if (process.platform === 'darwin') {
    app.dock.show()
  }

  settingsWindow.on('ready-to-show', () => {
    settingsWindow?.show()
    // 在开发环境下自动打开开发者工具
    if (isDevelopment) {
      settingsWindow?.webContents.openDevTools()
    }
  })

  // 监听窗口关闭事件
  settingsWindow.on('closed', () => {
    settingsWindow = null
    // 在 macOS 上，关闭窗口时隐藏 dock 图标
    if (process.platform === 'darwin') {
      app.dock.hide()
    }
  })

  // 添加窗口控制事件处理
  ipcMain.on('window-min', () => {
    settingsWindow?.minimize()
  })

  ipcMain.on('window-max', () => {
    if (settingsWindow?.isMaximized()) {
      settingsWindow?.restore()
    } else {
      settingsWindow?.maximize()
    }
  })

  ipcMain.on('window-close', () => {
    settingsWindow?.close()
  })

  // 加载页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
