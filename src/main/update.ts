import { app, shell, dialog } from 'electron'
import axios from 'axios'
import type { UpdateInfo } from '../types'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// GitHub API 配置
const GITHUB_API_CONFIG = {
  headers: {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ChatMate-App'
  }
}

// 如果有 GitHub Token，添加到请求头中
if (process.env.GITHUB_TOKEN) {
  GITHUB_API_CONFIG.headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
}

// 版本比较函数
function compareVersions(v1: string, v2: string): number {
  // 移除版本号前的'v'前缀
  const version1 = v1.replace(/^v/, '')
  const version2 = v2.replace(/^v/, '')
  
  const parts1 = version1.split('.').map(Number)
  const parts2 = version2.split('.').map(Number)
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0
    
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  
  return 0
}

// 检查更新
export async function checkForUpdates(): Promise<{
  hasUpdate: boolean
  latestVersion: string
}> {
  try {
    // 获取当前版本号
    const currentVersion = app.getVersion()
    console.log('当前版本号:', currentVersion)

    // 从 GitHub 获取发布列表
    console.log('正在检查更新...')
    const { data: releases } = await axios.get(
      'https://api.github.com/repos/Xiaotian-star/ChatMate/releases',
      GITHUB_API_CONFIG
    )

    if (!releases || releases.length === 0) {
      console.log('未找到任何发布版本')
      return { hasUpdate: false, latestVersion: currentVersion }
    }

    // 获取最新的发布版本
    const latestRelease = releases[0]
    const latestVersion = latestRelease.tag_name?.replace(/^v/, '') || currentVersion

    // 比较版本号
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0
    console.log('版本比较:', { currentVersion, latestVersion, hasUpdate })

    return { hasUpdate, latestVersion }
  } catch (error) {
    console.error('检查更新失败:', error)
    throw error
  }
}

// 完整的更新检查流程
export async function update(): Promise<UpdateInfo> {
  try {
    // 检查 GitHub Token 是否存在
    if (!process.env.GITHUB_TOKEN) {
      console.warn('未设置 GITHUB_TOKEN 环境变量，可能会受到 API 访问限制')
    }

    // 获取当前版本号
    const currentVersion = app.getVersion()
    console.log('当前版本号:', currentVersion)
    
    // 从 GitHub 获取发布列表
    console.log('正在检查更新...')
    const { data: releases } = await axios.get(
      'https://api.github.com/repos/Xiaotian-star/ChatMate/releases',
      GITHUB_API_CONFIG
    )
    console.log('获取到发布列表:', releases)

    if (!releases || releases.length === 0) {
      throw new Error('未找到任何发布版本')
    }

    // 获取最新的发布
    const latestRelease = releases[0]
    console.log('最新发布信息:', latestRelease)

    // 检查是否有更新
    const latestVersion = latestRelease.tag_name?.replace(/^v/, '') || currentVersion
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

    const updateInfo: UpdateInfo = {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseNotes: latestRelease.body || '暂无更新说明',
      downloadUrl: latestRelease.html_url,
      publishedAt: latestRelease.published_at
    }
    console.log('更新信息:', updateInfo)

    // 如果有更新，显示对话框
    if (hasUpdate) {
      const { response } = await dialog.showMessageBox({
        type: 'info',
        title: '发现新版本',
        message: '发现新的更新',
        detail: `当前版本: ${updateInfo.currentVersion}\n最新版本: ${updateInfo.latestVersion}\n发布时间: ${new Date(updateInfo.publishedAt).toLocaleString()}\n\n更新说明:\n${updateInfo.releaseNotes}`,
        buttons: ['立即下载', '稍后提醒'],
        defaultId: 0
      })

      // 如果用户点击了立即下载
      if (response === 0) {
        console.log('用户选择立即下载，打开下载链接:', updateInfo.downloadUrl)
        await shell.openExternal(updateInfo.downloadUrl)
      } else {
        console.log('用户选择稍后提醒')
      }
    } else {
      await dialog.showMessageBox({
        type: 'info',
        title: '检查更新',
        message: '当前已是最新版本',
        buttons: ['确定']
      })
    }

    return updateInfo
  } catch (error) {
    console.error('检查更新失败:', error)
    await dialog.showMessageBox({
      type: 'error',
      title: '检查更新失败',
      message: '检查更新失败，请稍后重试',
      detail: error instanceof Error ? error.message : '未知错误',
      buttons: ['确定']
    })
    throw error
  }
} 