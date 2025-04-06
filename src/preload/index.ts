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
    }
  }
}

// 导出 electronAPI 给渲染进程使用
const api = {
  // 获取AI回复
  getAIResponse: (params: AIRequestParams) => {
    return ipcRenderer.invoke('get-ai-response', params)
  },

  // 获取设置
  getSettings: () => {
    return ipcRenderer.invoke('get-settings')
  },

  // 保存设置
  saveSettings: (settings: StoredSettings) => {
    return ipcRenderer.invoke('save-settings', settings)
  },

  // 监听文本选择事件
  onTextSelected: (callback: (text: string) => void) => {
    const handler = (_: unknown, text: string) => callback(text)
    ipcRenderer.on('selected-text', handler)
    return () => {
      ipcRenderer.removeListener('selected-text', handler)
    }
  },

  // 监听自动生成事件
  onAutoGenerate: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('auto-generate', handler)
    return () => {
      ipcRenderer.removeListener('auto-generate', handler)
    }
  },

  // 关闭弹窗
  closePopup: () => {
    ipcRenderer.send('close-popup')
  },

  // 移动窗口
  moveWindow: (deltaX: number, deltaY: number) => {
    ipcRenderer.send('move-window', { deltaX, deltaY })
  },

  // 检查更新
  checkForUpdates: (): Promise<UpdateInfo> => {
    return ipcRenderer.invoke('check-for-updates')
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
