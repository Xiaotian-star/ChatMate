<template>
  <div class="settings-section">
    <h2 class="section-title">基础设置</h2>
    
    <el-form-item label="快捷键">
      <el-input
        v-model="settings.shortcut"
        placeholder="点击输入快捷键"
        readonly
        @keydown="handleKeyDown"
        @focus="handleFocus"
      />
      <!-- <div class="form-item-tip">
        设置呼出助手的快捷键，点击输入框后按下想要设置的按键组合
      </div> -->
    </el-form-item>

    <el-form-item label="开机自启">
      <el-switch
        v-model="settings.autoLaunch"
        @change="handleAutoLaunchChange"
      />
      <!-- <div class="form-item-tip">
        开启后，系统启动时会自动运行助手
      </div> -->
    </el-form-item>

    <el-form-item label="自动生成">
      <el-switch
        v-model="settings.autoGenerate"
      />
      <!-- <div class="form-item-tip">
        开启后，选中文本时会自动生成回复
      </div> -->
    </el-form-item>

    <el-form-item label="系统提示词">
      <el-input
        v-model="settings.systemPrompt"
        type="textarea"
        :rows="4"
        placeholder="设置系统级提示词，会添加到每次对话的开头"
      />
      <!-- <div class="form-item-tip">
        设置系统级提示词，将会添加到每次对话的开头
      </div> -->
    </el-form-item>

    <el-form-item label="配置管理">
      <div class="config-actions">
        <el-button type="primary" @click="exportConfig">导出配置</el-button>
        <el-button type="success" @click="showImportDialog">导入配置</el-button>
      </div>
      <!-- <div class="setting-tip">
        导出配置可以备份你的设置，导入配置可以恢复或合并之前的设置
      </div> -->
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
      ElMessage.error('设置自动启动失败')
      // 还原开关状态
      emit('update:settings', {
        ...props.settings,
        autoLaunch: !value
      })
    }
  } catch (error) {
    console.error('设置自动启动时出错:', error)
    ElMessage.error('设置自动启动时出错')
    // 还原开关状态
    emit('update:settings', {
      ...props.settings,
      autoLaunch: !value
    })
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

// 处理快捷键输入
const handleKeyDown = (e: KeyboardEvent) => {
  e.preventDefault()
  
  const keys = []
  if (e.ctrlKey) keys.push('Control')
  if (e.shiftKey) keys.push('Shift')
  if (e.altKey) keys.push('Alt')
  if (e.metaKey) keys.push('Command')
  
  // 添加主键（如果不是修饰键）
  const key = e.key
  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
    keys.push(key.toUpperCase())
  }
  
  if (keys.length > 0) {
    const shortcut = keys.join('+')
    emit('update:settings', {
      ...props.settings,
      shortcut
    })
  }
}

// 处理输入框聚焦
const handleFocus = (e: FocusEvent) => {
  const input = e.target as HTMLInputElement
  input.placeholder = '请按下快捷键组合'
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

.form-item-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
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