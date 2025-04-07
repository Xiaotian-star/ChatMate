<template>
  <div class="title-bar">
    <div class="title">
      <el-icon><Setting /></el-icon>
      ChatMate 设置
    </div>
    <div class="window-controls">
      <el-tooltip content="最小化" placement="bottom" :hide-after="1000">
        <button class="control-btn minimize" @click="minimize">
          <el-icon><Minus /></el-icon>
        </button>
      </el-tooltip>
      <el-tooltip content="最大化" placement="bottom" :hide-after="1000">
        <button class="control-btn maximize" @click="toggleMaximize">
          <el-icon><FullScreen /></el-icon>
        </button>
      </el-tooltip>
      <el-tooltip content="关闭" placement="bottom" :hide-after="1000">
        <button class="control-btn close" @click="closeWindow">
          <el-icon><Close /></el-icon>
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Setting, Minus, FullScreen, Close } from '@element-plus/icons-vue'

// 窗口控制函数
const minimize = () => {
  window.electronAPI.windowMin()
}

const toggleMaximize = () => {
  window.electronAPI.windowMax()
}

const closeWindow = () => {
  window.electronAPI.windowClose()
}
</script>

<style scoped>
.title-bar {
  height: 40px;
  background: var(--el-color-primary-light-9);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--el-border-color-light);
}

.title {
  font-size: 14px;
  color: var(--el-text-color-primary);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.window-controls {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  color: var(--el-text-color-secondary);
}

.control-btn:hover {
  background: var(--el-color-primary-light-8);
}

.control-btn.close:hover {
  background: var(--el-color-danger);
  color: white;
}
</style> 