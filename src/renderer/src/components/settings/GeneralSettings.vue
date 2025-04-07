<template>
  <div class="settings-section">
    <h2 class="section-title">基础设置</h2>
    
    <el-form-item label="DeepSeek API Key">
      <el-input 
        v-model="settings.apiKey" 
        type="password" 
        show-password 
        class="api-key-input"
        placeholder="请输入你的 DeepSeek API Key"
      >
        <template #append>
          <el-tooltip content="API Key 用于访问 DeepSeek 的服务" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </template>
      </el-input>
    </el-form-item>

    <el-form-item label="开机自启">
      <el-switch
        v-model="settings.autoLaunch"
        @change="handleAutoLaunchChange"
        active-text="开启"
        inactive-text="关闭"
      />
      <div class="setting-tip">
        开启后，系统启动时会自动启动 ChatMate
      </div>
    </el-form-item>

    <el-form-item label="快捷键">
      <div class="shortcut-settings">
        <div class="shortcut-item">
          <div class="shortcut-label">
            <span>快捷键</span>
            <el-tooltip content="用于打开主窗口的快捷键" placement="top">
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
          <div class="shortcut-input">
            <el-input
              v-model="settings.shortcut"
              :placeholder="isRecording ? '请按下快捷键组合...' : '点击开始录制'"
              :readonly="true"
              :class="{ 'is-recording': isRecording, 'is-invalid': !shortcutStatus.main.isValid }"
              @click="startRecording"
              @keydown.stop="recordShortcut"
              @keyup.stop="stopRecording"
            >
              <template #append>
                <el-button @click="resetShortcut">重置</el-button>
              </template>
            </el-input>
            <div v-if="!shortcutStatus.main.isValid" class="error-message">
              {{ shortcutStatus.main.message }}
            </div>
            <div class="shortcut-status" :class="{ 'error': !shortcutStatus.main.isValid }">
              <el-icon :class="{ 'success': shortcutStatus.main.isValid, 'error': !shortcutStatus.main.isValid }">
                <CircleCheckFilled v-if="shortcutStatus.main.isValid" />
                <CircleCloseFilled v-else />
              </el-icon>
              {{ shortcutStatus.main.message || '当前快捷键可用' }}
            </div>
          </div>
        </div>
      </div>
    </el-form-item>

    <el-form-item label="配置管理">
      <div class="config-actions">
        <el-button type="primary" @click="exportConfig">导出配置</el-button>
        <el-button type="success" @click="showImportDialog">导入配置</el-button>
      </div>
      <div class="setting-tip">
        导出配置可以备份你的设置，导入配置可以恢复或合并之前的设置
      </div>
    </el-form-item>
  </div>

  <!-- 导入配置对话框 -->
  <el-dialog
    v-model="importDialogVisible"
    title="导入配置"
    width="30%"
  >
    <div class="import-options">
      <el-radio-group v-model="importMode">
        <el-radio label="merge">合并配置</el-radio>
        <el-radio label="replace">替换配置</el-radio>
      </el-radio-group>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="importConfig">确认导入</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { QuestionFilled, CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import type { StoredSettings } from '../../../../types'

const props = defineProps<{
  settings: StoredSettings
}>()

const emit = defineEmits(['update:settings', 'save-settings'])

// 快捷键录制相关
const isRecording = ref(false)
const pressedKeys = ref<Set<string>>(new Set())

// 快捷键状态
interface ShortcutStatus {
  main: {
    isValid: boolean
    message: string
  }
}

const shortcutStatus = ref<ShortcutStatus>({
  main: {
    isValid: true,
    message: ''
  }
})

// 检查快捷键是否冲突
const checkShortcutConflict = async (shortcut: string, type: 'main') => {
  if (!shortcut) {
    shortcutStatus.value[type].isValid = false
    shortcutStatus.value[type].message = '请输入快捷键'
    return true
  }

  try {
    const isAvailable = await window.electronAPI.checkShortcutAvailable(shortcut)
    if (!isAvailable) {
      shortcutStatus.value[type].isValid = false
      shortcutStatus.value[type].message = '快捷键已被系统占用'
      return true
    }

    shortcutStatus.value[type].isValid = true
    shortcutStatus.value[type].message = ''
    return false
  } catch (error) {
    console.error('检查快捷键时出错:', error)
    shortcutStatus.value[type].isValid = false
    shortcutStatus.value[type].message = '检查快捷键时出错'
    return true
  }
}

// 开始录制快捷键
const startRecording = () => {
  isRecording.value = true
  pressedKeys.value.clear()
}

// 停止录制快捷键
const stopRecording = async () => {
  isRecording.value = false
  if (pressedKeys.value.size > 0) {
    const shortcut = Array.from(pressedKeys.value).join('+')
    const hasConflict = await checkShortcutConflict(shortcut, 'main')
    if (!hasConflict) {
      emit('update:settings', { ...props.settings, shortcut })
      emit('save-settings')
    }
  }
  pressedKeys.value.clear()
}

// 记录快捷键
const recordShortcut = (e: KeyboardEvent) => {
  if (!isRecording.value) return
  
  e.preventDefault()
  const key = e.key.toUpperCase()
  if (!['CONTROL', 'META', 'ALT', 'SHIFT'].includes(key)) {
    pressedKeys.value.add(key)
    const shortcut = Array.from(pressedKeys.value).join('+')
    checkShortcutConflict(shortcut, 'main')
  }
}

// 重置快捷键
const resetShortcut = async () => {
  const DEFAULT_SHORTCUT = 'F6'
  const hasConflict = await checkShortcutConflict(DEFAULT_SHORTCUT, 'main')
  if (!hasConflict) {
    emit('update:settings', { ...props.settings, shortcut: DEFAULT_SHORTCUT })
    emit('save-settings')
    ElMessage.success('已重置为默认快捷键')
  }
}

// 自启动设置
const handleAutoLaunchChange = async (value: boolean) => {
  try {
    const success = await window.electronAPI.setAutoLaunch(value)
    if (!success) {
      emit('update:settings', { ...props.settings, autoLaunch: !value })
      ElMessage.error('设置自启动失败')
    }
  } catch (error) {
    console.error('设置自启动时出错:', error)
    emit('update:settings', { ...props.settings, autoLaunch: !value })
    ElMessage.error('设置自启动时出错')
  }
}

// 导入导出配置相关
const importDialogVisible = ref(false)
const importMode = ref<'merge' | 'replace'>('merge')

const exportConfig = async () => {
  try {
    const result = await window.electronAPI.exportSettings()
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    ElMessage.error('导出配置失败')
    console.error('导出配置失败:', error)
  }
}

const showImportDialog = () => {
  importDialogVisible.value = true
}

const importConfig = async () => {
  try {
    const result = await window.electronAPI.importSettings(importMode.value)
    if (result.success) {
      ElMessage.success(result.message)
      importDialogVisible.value = false
      emit('update:settings', await window.electronAPI.getSettings())
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    ElMessage.error('导入配置失败')
    console.error('导入配置失败:', error)
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

.api-key-input {
  max-width: 500px;
}

.shortcut-settings {
  margin: 20px 0;
}

.shortcut-item {
  margin-bottom: 20px;
}

.shortcut-label {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.shortcut-input {
  position: relative;
}

.error-message {
  color: var(--el-color-danger);
  font-size: 12px;
  margin-top: 4px;
}

.is-recording {
  background-color: var(--el-color-primary-light-9);
}

.is-invalid :deep(.el-input__inner) {
  border-color: var(--el-color-danger);
}

.setting-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.shortcut-status {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.shortcut-status.error {
  color: var(--el-color-danger);
}

.shortcut-status .el-icon {
  font-size: 14px;
}

.shortcut-status .el-icon.success {
  color: var(--el-color-success);
}

.shortcut-status .el-icon.error {
  color: var(--el-color-danger);
}

.config-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.import-options {
  margin: 20px 0;
}
</style> 