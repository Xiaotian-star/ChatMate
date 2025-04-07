<template>
  <div class="sidebar">
    <div class="version-info">
      <img src="../../assets/logo.png" class="app-icon" alt="logo">
      <span class="version">v{{ version }}</span>
      <el-button 
        type="primary" 
        link
        :loading="checkingUpdate"
        @click="checkUpdate"
        size="small"
      >
        检查更新
      </el-button>
    </div>
    <el-menu
      v-model:default-active="activeMenu"
      class="settings-menu"
      @select="handleMenuSelect"
    >
      <el-menu-item index="general">
        <el-icon><Setting /></el-icon>
        <span>基础设置</span>
      </el-menu-item>
      <el-menu-item index="prompts">
        <el-icon><ChatDotRound /></el-icon>
        <span>预设人设</span>
      </el-menu-item>
      <el-menu-item index="conversations">
        <el-icon><ChatLineSquare /></el-icon>
        <span>会话管理</span>
      </el-menu-item>
      <el-menu-item index="advanced">
        <el-icon><Tools /></el-icon>
        <span>高级设置</span>
      </el-menu-item>
      <el-menu-item index="about">
        <el-icon><InfoFilled /></el-icon>
        <span>关于</span>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, ChatDotRound, Tools, InfoFilled, ChatLineSquare } from '@element-plus/icons-vue'

const version = ref(window.electron?.process?.versions?.app || '1.0.0')
const checkingUpdate = ref(false)
const activeMenu = ref('general')

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

// 菜单选择事件
const emit = defineEmits(['menu-select'])
const handleMenuSelect = (index: string) => {
  activeMenu.value = index
  emit('menu-select', index)
}
</script>

<style scoped>
.sidebar {
  width: 220px;
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.version-info {
  padding: 16px;
  text-align: center;
  border-bottom: 1px solid var(--el-border-color-light);
}

.app-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 8px;
}

.version {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: block;
  margin-bottom: 8px;
}

.settings-menu {
  flex: 1;
  border-right: none;
}
</style> 