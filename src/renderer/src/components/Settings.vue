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
          default-active="general"
          class="settings-menu"
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
                开启后，系统启动时会自动启动 WeChat Assistant
              </div>
            </el-form-item>

            <el-form-item label="快捷键">
              <el-input 
                v-model="displayShortcut" 
                placeholder="点击输入快捷键" 
                readonly 
                class="shortcut-input"
                @keydown.stop="recordShortcut"
                @keyup.stop="finishRecording"
                @focus="startRecording"
                @blur="stopRecording"
              >
                <template #append>
                  <el-button @click="resetShortcut" type="primary" link>重置</el-button>
                </template>
              </el-input>
              <div class="shortcut-tip" :class="{ 'recording': isRecording }">
                {{ shortcutTip }}
              </div>
            </el-form-item>
          </div>

          <!-- 预设人设 -->
          <div class="settings-section">
            <div class="section-header">
              <h2 class="section-title">预设人设</h2>
              <el-button type="primary" link @click="resetPrompts">
                <el-icon><Refresh /></el-icon>
                恢复默认
              </el-button>
            </div>
            
            <div class="prompts-grid">
              <el-card
                v-for="[role] in Object.entries(settings.prompts || defaultPrompts)"
                :key="role"
                class="prompt-card"
                shadow="hover"
              >
                <template #header>
                  <div class="prompt-header">
                    <span class="role-name">{{ role }}</span>
                  </div>
                </template>
                <el-input
                  v-model="settings.prompts![role]"
                  :placeholder="defaultPrompts[role]"
                  type="textarea"
                  :rows="4"
                  class="prompt-input"
                />
              </el-card>
            </div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
  Close
} from '@element-plus/icons-vue'
import type { StoredSettings, ElectronAPI } from '../../../types'
import type { IpcRenderer } from 'electron'

declare global {
  interface Window {
    electronAPI: ElectronAPI
    electron: {
      process: {
        versions: {
          app: string
        }
      }
      ipcRenderer: IpcRenderer
    }
  }
}

// 预设的人设模板
const defaultPrompts: Record<string, string> = {
  '职场精英': '你现在是一位经验丰富的职场精英，擅长处理各种职场关系。请用专业、得体但不失温度的语言回复以下内容。注意措辞要准确、积极向上、富有建设性，同时也要体现出对他人的尊重和理解。',
  
  '情感专家': '你现在是一位富有同理心的情感咨询师，擅长处理各种人际关系。请用温和、理解、富有同理心的方式回复以下内容。注意语言要温暖、富有支持性，同时也要给出建设性的建议。',
  
  '外交官': '你现在是一位资深外交官，擅长处理敏感话题和冲突情况。请用圆润、委婉但不失立场的方式回复以下内容。注意措辞要得体、富有技巧，既要表达诉求，也要照顾各方感受。',
  
  '智者': '你现在是一位睿智的长者，擅长给出富有哲理的建议。请用平和、富有智慧的方式回复以下内容。注意语言要有深度、富有启发性，同时也要易于理解和接受。',
  
  '知心朋友': '你现在是一位知心好友，擅长倾听和开导。请用轻松、亲切的语气回复以下内容。注意语言要自然、真诚，像朋友间的对话一样温暖和真实。',
  
  '幽默达人': '你现在是一位幽默风趣的达人，擅长用轻松愉快的方式化解尴尬。请用诙谐、机智但不失分寸的方式回复以下内容。注意把握幽默的度，既要有趣，也要得体。'
}

// 修改默认快捷键
const DEFAULT_SHORTCUT = 'F6'
const DEFAULT_API_KEY = 'sk-b7d7735f91c64ebd9f8dd6b791ebcafb'

const settings = ref<StoredSettings>({
  apiKey: DEFAULT_API_KEY,
  prompts: { ...defaultPrompts },
  shortcut: DEFAULT_SHORTCUT,
  conversations: [],
  autoGenerate: false,
  autoGenerateShortcut: 'CommandOrControl+G',
  systemPrompt: '',
  autoLaunch: false
})

// 快捷键录制相关
const isRecording = ref(false)
const pressedKeys = ref<Set<string>>(new Set())
const displayShortcut = ref('')

// 快捷键提示文字
const shortcutTip = computed(() => {
  if (isRecording.value) {
    return '请按下快捷键组合...'
  }
  return '点击输入框设置快捷键。支持单键(如 F1)或组合键(如 Ctrl+Shift+A)'
})

// 开始录制
const startRecording = () => {
  isRecording.value = true
  pressedKeys.value.clear()
  displayShortcut.value = ''
}

// 停止录制
const stopRecording = () => {
  isRecording.value = false
  if (displayShortcut.value) {
    settings.value.shortcut = displayShortcut.value
  }
}

// 记录快捷键
const recordShortcut = (e: KeyboardEvent) => {
  e.preventDefault()
  
  // 特殊键映射
  const keyMap: Record<string, string> = {
    'Control': 'Ctrl',
    'Meta': 'Command',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    ' ': 'Space'
  }

  // 获取按键名称
  let key = e.key
  if (key in keyMap) {
    key = keyMap[key]
  } else if (key.length === 1) {
    key = key.toUpperCase()
  }

  // 添加到已按下的键集合
  pressedKeys.value.add(key)

  // 更新显示的快捷键
  const keys = Array.from(pressedKeys.value)
  if (keys.length > 0) {
    displayShortcut.value = keys.join('+')
  }
}

// 结束单次按键记录
const finishRecording = () => {
  pressedKeys.value.clear()
}

// 重置快捷键
const resetShortcut = () => {
  settings.value.shortcut = DEFAULT_SHORTCUT
  displayShortcut.value = DEFAULT_SHORTCUT
  ElMessage.success('已重置为默认快捷键')
}

// 版本和更新相关
const currentVersion = ref(window.electron?.process?.versions?.app || '1.0.0')
const checkingUpdate = ref(false)

// 检查更新
async function checkUpdate() {
  try {
    checkingUpdate.value = true
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
    ElMessage.error('检查更新失败')
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
        apiKey: savedSettings.apiKey || DEFAULT_API_KEY,
        prompts: savedSettings.prompts || { ...defaultPrompts },
        shortcut: savedSettings.shortcut || DEFAULT_SHORTCUT,
        conversations: savedSettings.conversations || [],
        autoGenerate: savedSettings.autoGenerate || false,
        autoGenerateShortcut: savedSettings.autoGenerateShortcut || 'CommandOrControl+G',
        systemPrompt: savedSettings.systemPrompt || '',
        autoLaunch: autoLaunch
      }
      displayShortcut.value = settings.value.shortcut
    } else {
      // 如果没有保存的设置，使用默认值
      settings.value = {
        apiKey: DEFAULT_API_KEY,
        prompts: { ...defaultPrompts },
        shortcut: DEFAULT_SHORTCUT,
        conversations: [],
        autoGenerate: false,
        autoGenerateShortcut: 'CommandOrControl+G',
        systemPrompt: '',
        autoLaunch: autoLaunch
      }
      displayShortcut.value = DEFAULT_SHORTCUT
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    // 使用默认设置
    settings.value = {
      apiKey: DEFAULT_API_KEY,
      prompts: { ...defaultPrompts },
      shortcut: DEFAULT_SHORTCUT,
      conversations: [],
      autoGenerate: false,
      autoGenerateShortcut: 'CommandOrControl+G',
      systemPrompt: '',
      autoLaunch: false
    }
    displayShortcut.value = DEFAULT_SHORTCUT
    
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
      prompts: { ...settings.value.prompts },
      shortcut: settings.value.shortcut,
      conversations: settings.value.conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        messages: conv.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        lastUpdated: conv.lastUpdated
      })),
      autoGenerate: settings.value.autoGenerate,
      autoGenerateShortcut: settings.value.autoGenerateShortcut,
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
  } catch (error) {
    console.error('保存设置时出错:', error)
    ElMessage.error('保存设置时出错')
  }
}

// 重置提示词
const resetPrompts = () => {
  settings.value.prompts = { ...defaultPrompts }
  ElMessage.success('已恢复默认提示词')
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

// 组件挂载时加载设置
onMounted(async () => {
  await loadSettings()
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

.api-key-input {
  max-width: 500px;
}

.shortcut-input {
  max-width: 300px;
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

.shortcut-tip.recording {
  color: var(--el-color-primary);
  font-weight: 500;
}

.prompts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.prompt-card {
  background: var(--el-bg-color);
}

.prompt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.role-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.settings-footer {
  margin-top: 32px;
  text-align: center;
  padding: 16px;
  background: var(--el-bg-color-overlay);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
}
</style> 