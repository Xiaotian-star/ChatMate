import { contextBridge, ipcRenderer } from 'electron'
import type { AIRequestParams, StoredSettings, UpdateInfo } from '../types'
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
const api = {
  // AI 响应相关
  getAIResponse: (params: AIRequestParams) => ipcRenderer.invoke('get-ai-response', params),
  
  // 设置相关
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: StoredSettings) => ipcRenderer.invoke('save-settings', settings),
  
  // 自动启动相关
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enable: boolean) => ipcRenderer.invoke('set-auto-launch', enable),
  
  // 窗口控制
  windowMin: () => ipcRenderer.send('window-min'),
  windowMax: () => ipcRenderer.send('window-max'),
  windowClose: () => ipcRenderer.send('window-close'),
  
  // 开发者工具
  toggleDevTools: () => ipcRenderer.invoke('toggle-devtools'),
  
  // 其他功能
  onTextSelected: (callback: (text: string) => void) => {
    ipcRenderer.on('text-selected', (_, text) => callback(text))
  },
  onAutoGenerate: (callback: (text: string) => void) => {
    ipcRenderer.on('auto-generate', (_, text) => callback(text))
  }
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
