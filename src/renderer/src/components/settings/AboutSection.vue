<template>
  <div class="settings-section">
    <h2 class="section-title">关于</h2>
    <p>ChatMate 是一个基于 AI 的智能对话助手，帮助你更高效地处理各类社交平台的消息。</p>
    <p>当前版本：v{{ version }}</p>
    <p>
      <el-button type="primary" link @click="checkUpdate" :loading="checkingUpdate">
        检查更新
      </el-button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const version = ref(window.electron?.process?.versions?.app || '1.0.0')
const checkingUpdate = ref(false)

// 检查更新
async function checkUpdate() {
  try {
    checkingUpdate.value = true
    if (!window.electronAPI.checkForUpdates) {
      throw new Error('更新检查功能未实现')
    }
    
    const updateInfo = await window.electronAPI.checkForUpdates()
    
    if (updateInfo.hasUpdate) {
      ElMessage({
        message: `发现新版本 ${updateInfo.latestVersion}，请前往下载页面更新`,
        type: 'success',
        duration: 5000,
        showClose: true
      })
    } else {
      ElMessage({
        message: '当前已是最新版本',
        type: 'info',
        duration: 3000
      })
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '检查更新失败')
  } finally {
    checkingUpdate.value = false
  }
}
</script>

<style scoped>
.settings-section {
  background: var(--el-bg-color-overlay);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--el-box-shadow-light);
}

.section-title {
  font-size: 20px;
  color: var(--el-text-color-primary);
  margin: 0 0 24px;
  font-weight: 600;
}

p {
  margin: 12px 0;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}
</style> 