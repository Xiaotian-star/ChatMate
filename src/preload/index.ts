import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { Settings, AIRequestParams, StoredSettings } from '../types'

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
      checkForUpdates: () => Promise<{ hasUpdate: boolean, version?: string }>
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
    const handler = (event: IpcRendererEvent, text: string) => callback(text)
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
  checkForUpdates: () => {
    return ipcRenderer.invoke('check-for-updates')
  }
}

// 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', api)
