import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Settings, StoredSettings, AIRequestParams, WindowCommand } from '../types'

// 扩展 Window 接口
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send(channel: 'window-control', command: WindowCommand): void
      }
    }
    electronAPI: {
      getSettings: () => Promise<StoredSettings>
      saveSettings: (settings: StoredSettings) => Promise<boolean>
      onTextSelected: (callback: (text: string) => void) => () => void
      removeTextSelectedListener: (callback: (text: string) => void) => void
      getAIResponse: (params: AIRequestParams) => Promise<string>
    }
  }
}

// 自定义 API
const api = {
  // 获取 AI 回复
  getAIResponse: (params: { text: string; persona: string }): Promise<string[]> => {
    return ipcRenderer.invoke('get-ai-response', params)
  },

  // 获取设置
  getSettings: (): Promise<{ settings: Settings }> => {
    return ipcRenderer.invoke('get-settings')
  },

  // 保存设置
  saveSettings: (settings: { settings: Settings }): Promise<boolean> => {
    return ipcRenderer.invoke('save-settings', settings)
  },

  // 监听选中文本事件
  onTextSelected: (callback: (text: string) => void) => {
    const handler = (_: any, text: string) => callback(text)
    ipcRenderer.on('text-selected', handler)
    return () => {
      ipcRenderer.removeListener('text-selected', handler)
    }
  },

  // 关闭弹窗
  closePopup: () => {
    ipcRenderer.send('close-popup')
  },

  // 移动窗口
  moveWindow: (deltaX: number, deltaY: number) => {
    ipcRenderer.send('move-window', { deltaX, deltaY })
  }
}

// 使用上下文桥接暴露 API
contextBridge.exposeInMainWorld('electronAPI', api)

// 导出 API 类型
export type ElectronAPI = typeof api
