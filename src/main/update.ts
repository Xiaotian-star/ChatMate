import { app, shell, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import * as dotenv from 'dotenv'
import type { UpdateInfo } from '../types'

// 加载环境变量
dotenv.config()

// 配置自动更新
autoUpdater.logger = console // 设置日志输出
autoUpdater.autoDownload = false // 不自动下载，等待用户确认
autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装
autoUpdater.forceDevUpdateConfig = true // 强制开发环境也检查更新

// 检查更新
export async function checkForUpdates(): Promise<UpdateInfo> {
  return new Promise((resolve, reject) => {
    try {
      console.log('开始检查更新，当前版本:', app.getVersion())
      
      // 监听更新检查结果
      autoUpdater.on('error', (error) => {
        console.error('更新检查失败:', error)
        console.error('错误详情:', error.stack)
        dialog.showMessageBox({
          type: 'error',
          title: '更新检查失败',
          message: '检查更新失败，请稍后重试',
          detail: error.message,
          buttons: ['确定']
        })
        reject(error)
      })

      autoUpdater.on('checking-for-update', () => {
        console.log('正在检查更新...')
      })

      autoUpdater.on('update-available', async (info) => {
        console.log('发现新版本:', info)
        const { response } = await dialog.showMessageBox({
          type: 'info',
          title: '发现新版本',
          message: `发现新版本 ${info.version}`,
          detail: `当前版本: ${app.getVersion()}\n新版本: ${info.version}\n\n更新说明:\n${info.releaseNotes || '暂无更新说明'}`,
          buttons: ['立即更新', '稍后提醒'],
          defaultId: 0
        })

        if (response === 0) {
          console.log('用户选择立即更新')
          autoUpdater.downloadUpdate()
          resolve({
            hasUpdate: true,
            currentVersion: app.getVersion(),
            latestVersion: info.version,
            releaseNotes: info.releaseNotes?.toString() || '暂无更新说明',
            downloadUrl: '',
            publishedAt: info.releaseDate || new Date().toISOString()
          })
        } else {
          console.log('用户选择稍后更新')
          resolve({
            hasUpdate: true,
            currentVersion: app.getVersion(),
            latestVersion: info.version,
            releaseNotes: info.releaseNotes?.toString() || '暂无更新说明',
            downloadUrl: '',
            publishedAt: info.releaseDate || new Date().toISOString()
          })
        }
      })

      autoUpdater.on('update-not-available', (info) => {
        console.log('当前已是最新版本')
        dialog.showMessageBox({
          type: 'info',
          title: '检查更新',
          message: '当前已是最新版本',
          buttons: ['确定']
        })
        resolve({
          hasUpdate: false,
          currentVersion: app.getVersion(),
          latestVersion: info.version,
          releaseNotes: '',
          downloadUrl: '',
          publishedAt: new Date().toISOString()
        })
      })

      autoUpdater.on('download-progress', (progressObj) => {
        console.log('下载进度:', progressObj)
      })

      autoUpdater.on('update-downloaded', async (info) => {
        console.log('更新已下载:', info)
        const { response } = await dialog.showMessageBox({
          type: 'info',
          title: '更新已下载',
          message: '更新已下载完成',
          detail: '是否立即安装更新并重启应用？',
          buttons: ['立即安装', '稍后安装'],
          defaultId: 0
        })

        if (response === 0) {
          console.log('用户选择立即安装')
          autoUpdater.quitAndInstall(false, true)
        } else {
          console.log('用户选择稍后安装')
        }
      })

      // 开始检查更新
      console.log('调用 checkForUpdates...')
      autoUpdater.checkForUpdates()

    } catch (error) {
      console.error('更新检查失败:', error)
      reject(error)
    }
  })
} 