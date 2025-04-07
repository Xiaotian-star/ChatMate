import { contextBridge, ipcRenderer } from 'electron'
import type { AIRequestParams, StoredSettings, UpdateInfo, ElectronAPI } from '../types'
import { electronAPI } from '@electron-toolkit/preload'

// 扩展 Window 接口
declare global {
  interface Window {
    electron: {
      process: {
        versions: {
          app: string
        }
      }
      ipcRenderer: typeof ipcRenderer
    }
    electronAPI: {
      getAIResponse: (params: AIRequestParams) => Promise<string[]>
      getSettings: () => Promise<StoredSettings>
      saveSettings: (settings: StoredSettings) => Promise<boolean>
      onTextSelected: (callback: (text: string) => void) => () => void
      onAutoGenerate: (callback: () => void) => () => void
      closePopup: () => void
      moveWindow: (deltaX: number, deltaY: number) => void
      checkForUpdates: () => Promise<UpdateInfo>
      windowMin: () => void
      windowMax: () => void
      windowClose: () => void
    }
  }
}

// 导出自定义 API
const api: ElectronAPI = {
  // AI 响应相关
  getAIResponse: (params: AIRequestParams) => ipcRenderer.invoke('get-ai-response', params),
  
  // 设置相关
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: StoredSettings) => ipcRenderer.invoke('save-settings', settings),
  
  // 自动启动相关
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),
  
  // 窗口控制
  windowMin: () => ipcRenderer.send('window-min'),
  windowMax: () => ipcRenderer.send('window-max'),
  windowClose: () => ipcRenderer.send('window-close'),
  
  // 开发者工具
  toggleDevTools: () => ipcRenderer.invoke('toggle-devtools'),
  
  // 更新相关
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // 快捷键检查
  checkShortcutAvailable: (shortcut: string) => ipcRenderer.invoke('check-shortcut-available', shortcut),
  
  // 其他功能
  onTextSelected: (callback: (text: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, text: string) => callback(text)
    ipcRenderer.on('text-selected', handler)
    return () => ipcRenderer.removeListener('text-selected', handler)
  },
  onAutoGenerate: (callback: () => void) => {
    const handler = (_: Electron.IpcRendererEvent) => callback()
    ipcRenderer.on('auto-generate', handler)
    return () => ipcRenderer.removeListener('auto-generate', handler)
  },
  closePopup: () => ipcRenderer.send('close-popup'),
  moveWindow: (deltaX: number, deltaY: number) => {
    // 发送调整大小的消息
    ipcRenderer.send('resize-window', { deltaX, deltaY })
  },
  
  // 导出设置
  exportSettings: () => ipcRenderer.invoke('export-settings'),
  
  // 导入设置
  importSettings: (mode: 'merge' | 'replace') => ipcRenderer.invoke('import-settings', mode)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.electronAPI = api
}
