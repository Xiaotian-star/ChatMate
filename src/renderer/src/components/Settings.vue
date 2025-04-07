<template>
  <div class="settings-container">
    <!-- 自定义标题栏 -->
    <div class="title-bar">
      <div class="title">
        <el-icon><Setting /></el-icon>
        WeChat Assistant 设置
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

    <div class="main-content">
      <!-- 侧边栏导航 -->
      <div class="sidebar">
        <div class="version-info">
          <img src="../assets/logo.png" class="app-icon" alt="logo">
          <span class="version">v{{ currentVersion }}</span>
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

      <!-- 主要内容区域 -->
      <div class="content">
        <el-form :model="settings" label-position="top" class="settings-form">
          <!-- 基础设置 -->
          <div v-show="activeMenu === 'general'" class="settings-section">
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
                开启后，系统启动时会自动启动 WeChat Assistant
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

            <!-- 添加导入导出按钮 -->
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

          <!-- 预设人设 -->
          <div v-show="activeMenu === 'prompts'" class="settings-section">
            <div class="section-header">
              <h2 class="section-title">预设人设</h2>
              <div class="section-actions">
                <el-button type="primary" @click="addNewPrompt">
                  <el-icon><Plus /></el-icon>
                  新增人设
                </el-button>
                <el-button type="primary" link @click="resetPrompts">
                  <el-icon><Refresh /></el-icon>
                  恢复默认
                </el-button>
              </div>
            </div>
            
            <div class="prompts-grid">
              <el-card
                v-for="[key, prompt] in Object.entries(settings.prompts)"
                :key="key"
                class="prompt-card"
                shadow="hover"
              >
                <template #header>
                  <div class="prompt-header">
                    <el-input
                      v-model="prompt.title"
                      class="prompt-title-input"
                      placeholder="输入人设名称"
                    />
                    <el-button
                      type="danger"
                      link
                      @click="deletePrompt(key)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </template>
                <el-input
                  v-model="prompt.content"
                  type="textarea"
                  :rows="4"
                  class="prompt-input"
                  placeholder="输入人设描述"
                />
              </el-card>
            </div>
          </div>

          <!-- 高级设置 -->
          <div v-show="activeMenu === 'advanced'" class="settings-section">
            <h2 class="section-title">高级设置</h2>
            <el-form-item label="自动生成">
              <el-switch
                v-model="settings.autoGenerate"
                active-text="开启"
                inactive-text="关闭"
              />
              <div class="setting-tip">
                开启后，选中文本时会自动生成回复
              </div>
            </el-form-item>

            <el-form-item label="系统提示词">
              <el-input
                v-model="settings.systemPrompt"
                type="textarea"
                :rows="4"
                placeholder="输入系统提示词，用于控制AI的整体行为"
              />
            </el-form-item>
          </div>

          <!-- 关于 -->
          <div v-show="activeMenu === 'about'" class="settings-section">
            <h2 class="section-title">关于</h2>
            <p>WeChat Assistant 是一个基于 AI 的微信消息助手，帮助你更高效地处理微信消息。</p>
            <p>当前版本：v{{ currentVersion }}</p>
            <p>
              <el-button type="primary" link @click="checkUpdate">
                检查更新
              </el-button>
            </p>
          </div>

          <!-- 保存按钮 -->
          <div class="settings-footer">
            <el-button type="primary" @click="saveSettings" size="large">
              <el-icon><Check /></el-icon>
              保存设置
            </el-button>
          </div>
        </el-form>
      </div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Setting,
  ChatDotRound,
  Tools,
  InfoFilled,
  QuestionFilled,
  Check,
  Refresh,
  Minus,
  FullScreen,
  Close,
  Plus,
  Delete,
  CircleCheckFilled,
  CircleCloseFilled
} from '@element-plus/icons-vue'
import type { StoredSettings, Prompt } from '../../../types'

// 预设的人设模板
const defaultPrompts: Record<string, Prompt> = {
  '职场精英': {
    title: '职场精英',
    content: '你现在是一位经验丰富的职场精英，擅长处理各种职场关系。请用专业、得体但不失温度的语言回复以下内容。注意措辞要准确、积极向上、富有建设性，同时也要体现出对他人的尊重和理解。',
    isDefault: true
  },
  '情感专家': {
    title: '情感专家',
    content: '你现在是一位富有同理心的情感咨询师，擅长处理各种人际关系。请用温和、理解、富有同理心的方式回复以下内容。注意语言要温暖、富有支持性，同时也要给出建设性的建议。',
    isDefault: true
  },
  '外交官': {
    title: '外交官',
    content: '你现在是一位资深外交官，擅长处理敏感话题和冲突情况。请用圆润、委婉但不失立场的方式回复以下内容。注意措辞要得体、富有技巧，既要表达诉求，也要照顾各方感受。',
    isDefault: true
  },
  '智者': {
    title: '智者',
    content: '你现在是一位睿智的长者，擅长给出富有哲理的建议。请用平和、富有智慧的方式回复以下内容。注意语言要有深度、富有启发性，同时也要易于理解和接受。',
    isDefault: true
  },
  '暖心朋友': {
    title: '暖心朋友',
    content: '你现在是一位知心好友，擅长倾听和开导。请用轻松、亲切的语气回复以下内容。注意语言要自然、真诚，像朋友间的对话一样温暖和真实。',
    isDefault: true
  },
  '幽默达人': {
    title: '幽默达人',
    content: '你现在是一位幽默风趣的达人，擅长用轻松愉快的方式化解尴尬。请用诙谐、机智但不失分寸的方式回复以下内容。注意把握幽默的度，既要有趣，也要得体。',
    isDefault: true
  }
}

// 修改默认快捷键
const DEFAULT_SHORTCUT = 'F6'
const DEFAULT_API_KEY = 'sk-b7d7735f91c64ebd9f8dd6b791ebcafb'

const settings = ref<StoredSettings>({
  apiKey: '',
  prompts: {},
  shortcut: '',
  conversations: [],
  autoGenerate: false,
  systemPrompt: '',
  autoLaunch: false
})

// 快捷键录制相关
const isRecording = ref(false)
const pressedKeys = ref<Set<string>>(new Set())

// 检查快捷键是否冲突
const checkShortcutConflict = async (shortcut: string, type: 'main') => {
  if (!shortcut) {
    shortcutStatus.value[type].isValid = false
    shortcutStatus.value[type].message = '请输入快捷键'
    return true
  }

  // 检查系统快捷键
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
      settings.value.shortcut = shortcut
      await saveSettings()
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
  const hasConflict = await checkShortcutConflict(DEFAULT_SHORTCUT, 'main')
  if (!hasConflict) {
    settings.value.shortcut = DEFAULT_SHORTCUT
    await saveSettings()
    ElMessage.success('已重置为默认快捷键')
  }
}

// 版本和更新相关
const currentVersion = ref(window.electron?.process?.versions?.app || '1.0.0')
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

// 加载设置
const loadSettings = async () => {
  try {
    const savedSettings = await window.electronAPI.getSettings()
    const autoLaunch = await window.electronAPI.getAutoLaunch()
    console.log('加载到的设置:', savedSettings)
    console.log('自启动状态:', autoLaunch)
    
    if (savedSettings) {
      settings.value = {
        ...savedSettings,
        autoLaunch
      }
    } else {
      // 如果没有保存的设置，使用默认值
      const defaultSettings = {
        apiKey: DEFAULT_API_KEY,
        prompts: { ...defaultPrompts },
        shortcut: DEFAULT_SHORTCUT,
        conversations: [],
        autoGenerate: false,
        systemPrompt: '',
        autoLaunch: autoLaunch
      }
      settings.value = defaultSettings
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    // 使用默认设置
    const defaultSettings = {
      apiKey: DEFAULT_API_KEY,
      prompts: { ...defaultPrompts },
      shortcut: DEFAULT_SHORTCUT,
      conversations: [],
      autoGenerate: false,
      systemPrompt: '',
      autoLaunch: false
    }
    settings.value = defaultSettings
    
    ElMessage({
      message: '加载设置失败，使用默认设置',
      type: 'warning',
      duration: 3000,
      showClose: true
    })
  }
}

// 保存设置
const saveSettings = async () => {
  try {
    // 创建一个只包含需要保存的数据的对象
    const settingsToSave = {
      apiKey: settings.value.apiKey,
      prompts: Object.entries(settings.value.prompts).reduce((acc, [key, prompt]) => {
        acc[key] = {
          title: prompt.title,
          content: prompt.content,
          isDefault: prompt.isDefault
        }
        return acc
      }, {} as Record<string, Prompt>),
      shortcut: settings.value.shortcut,
      conversations: settings.value.conversations || [], // 确保保存会话数据
      autoGenerate: settings.value.autoGenerate,
      systemPrompt: settings.value.systemPrompt,
      autoLaunch: settings.value.autoLaunch
    }

    console.log('正在保存设置:', JSON.stringify(settingsToSave))
    const success = await window.electronAPI.saveSettings(settingsToSave)
    if (success) {
      ElMessage.success('设置保存成功')
    } else {
      ElMessage.error('设置保存失败')
    }
    return success
  } catch (error) {
    console.error('保存设置时出错:', error)
    ElMessage.error('保存设置时出错')
    return false
  }
}

// 重置提示词
const resetPrompts = () => {
  settings.value.prompts = {
    '智能助手': {
      title: '智能助手',
      content: '你现在是一位专业、友善的智能助手，擅长处理各种类型的对话。请用得体、专业但不失温度的语言回复以下内容。注意措辞要准确、积极向上、富有建设性，同时也要体现出对他人的尊重和理解。',
      isDefault: true
    }
  }
  ElMessage.success('已恢复默认提示词')
}

// 添加新人设
const addNewPrompt = () => {
  const id = Date.now().toString()
  settings.value.prompts[id] = {
    title: '新人设',
    content: '',
    isDefault: false
  }
}

// 删除人设
const deletePrompt = (key: string) => {
  // 确保至少保留一个人设
  const promptCount = Object.keys(settings.value.prompts).length
  if (promptCount <= 1) {
    ElMessage.warning('至少需要保留一个人设')
    return
  }
  
  delete settings.value.prompts[key]
  ElMessage.success('删除成功')
}

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

// 在 script setup 中添加
const handleAutoLaunchChange = async (value: boolean) => {
  try {
    const success = await window.electronAPI.setAutoLaunch(value)
    if (!success) {
      settings.value.autoLaunch = !value // 恢复之前的状态
      ElMessage.error('设置自启动失败')
    }
  } catch (error) {
    console.error('设置自启动时出错:', error)
    settings.value.autoLaunch = !value // 恢复之前的状态
    ElMessage.error('设置自启动时出错')
  }
}

// 当前激活的菜单项
const activeMenu = ref('general')

// 处理菜单选择
const handleMenuSelect = (index: string) => {
  activeMenu.value = index
}

// 组件挂载时加载设置
onMounted(async () => {
  await loadSettings()
})

// 导入配置相关
const importDialogVisible = ref(false)
const importMode = ref<'merge' | 'replace'>('merge')

// 导出配置
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

// 显示导入对话框
const showImportDialog = () => {
  importDialogVisible.value = true
}

// 导入配置
const importConfig = async () => {
  try {
    const result = await window.electronAPI.importSettings(importMode.value)
    if (result.success) {
      ElMessage.success(result.message)
      importDialogVisible.value = false
      // 重新加载设置
      loadSettings()
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    ElMessage.error('导入配置失败')
    console.error('导入配置失败:', error)
  }
}

// 在 <script setup> 部分添加新的响应式变量
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
</script>

<style scoped>
.settings-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

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

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

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

.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.settings-section {
  background: var(--el-bg-color-overlay);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--el-box-shadow-light);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-size: 20px;
  color: var(--el-text-color-primary);
  margin: 0;
  font-weight: 600;
}

.section-actions {
  display: flex;
  gap: 12px;
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

.shortcut-tip {
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

.prompts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.prompt-card {
  background: var(--el-bg-color);
}

.prompt-card :deep(.el-card__header) {
  padding: 12px;
}

.prompt-card :deep(.el-card__body) {
  padding: 12px;
}

.prompt-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.prompt-title-input {
  flex: 1;
}

.settings-footer {
  margin-top: 32px;
  text-align: center;
  padding: 16px;
  background: var(--el-bg-color-overlay);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
}

.import-options {
  margin: 20px 0;
}

.config-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}
</style> 