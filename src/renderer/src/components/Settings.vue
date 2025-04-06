<template>
  <div class="settings">
    <div class="window-controls">
      <div class="drag-area"></div>
      <div class="control-buttons">
        <el-button 
          type="text" 
          class="minimize-btn"
          @click="minimizeWindow"
        >
          <el-icon><Minus /></el-icon>
        </el-button>
        <el-button 
          type="text" 
          class="close-btn"
          @click="closeWindow"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="settings-header">
      <h2>设置</h2>
      <p class="settings-desc">配置你的AI助手</p>
    </div>
    
    <el-form :model="settings" label-width="120px" class="settings-form">
      <div class="settings-section">
        <h3 class="section-title">基础设置</h3>
        <el-form-item label="DeepSeek API Key">
          <el-input 
            v-model="settings.apiKey" 
            type="password" 
            show-password 
            class="api-key-input"
            placeholder="请输入你的 DeepSeek API Key"
          />
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
      
      <div class="settings-section">
        <div class="section-header">
          <h3 class="section-title">预设人设</h3>
          <el-button @click="resetPrompts" type="primary" link>恢复默认</el-button>
        </div>
        
        <div class="prompts-grid">
          <div v-for="[role, prompt] in Object.entries(settings.prompts || defaultPrompts)" 
               :key="role" 
               class="prompt-card">
            <div class="prompt-header">
              <span class="role-name">{{ role }}</span>
            </div>
            <el-input
              v-model="settings.prompts![role]"
              :placeholder="defaultPrompts[role]"
              type="textarea"
              :rows="4"
              class="prompt-input"
            />
          </div>
        </div>
      </div>
      
      <div class="settings-footer">
        <el-button type="primary" @click="saveSettings" size="large">保存设置</el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Minus, Close } from '@element-plus/icons-vue'
import type { Settings, StoredSettings } from '@/types'

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

const settings = ref<Settings>({
  apiKey: DEFAULT_API_KEY,
  prompts: { ...defaultPrompts },
  shortcut: DEFAULT_SHORTCUT
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

// 加载设置
const loadSettings = async () => {
  try {
    const savedSettings = await window.electronAPI.getSettings()
    console.log('加载到的设置:', savedSettings)
    
    if (savedSettings?.settings) {
      settings.value = {
        apiKey: savedSettings.settings.apiKey || DEFAULT_API_KEY,
        prompts: savedSettings.settings.prompts || { ...defaultPrompts },
        shortcut: savedSettings.settings.shortcut || DEFAULT_SHORTCUT
      }
      displayShortcut.value = settings.value.shortcut
    } else {
      // 如果没有保存的设置，使用默认值
      settings.value = {
        apiKey: DEFAULT_API_KEY,
        prompts: { ...defaultPrompts },
        shortcut: DEFAULT_SHORTCUT
      }
      displayShortcut.value = DEFAULT_SHORTCUT
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    // 使用默认设置
    settings.value = {
      apiKey: DEFAULT_API_KEY,
      prompts: { ...defaultPrompts },
      shortcut: DEFAULT_SHORTCUT
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
    // 验证设置
    if (!settings.value.shortcut) {
      throw new Error('快捷键不能为空')
    }
    if (!settings.value.apiKey) {
      throw new Error('API Key不能为空')
    }

    // 创建要保存的设置对象
    const settingsToSave: StoredSettings = {
      settings: {
        apiKey: settings.value.apiKey,
        prompts: settings.value.prompts || {},
        shortcut: settings.value.shortcut
      }
    }
    
    // 确保 prompts 是一个普通对象
    if (settingsToSave.settings.prompts instanceof Object) {
      settingsToSave.settings.prompts = { ...settingsToSave.settings.prompts }
    }
    
    console.log('准备保存的设置:', JSON.stringify(settingsToSave))
    await window.electronAPI.saveSettings(settingsToSave)
    
    ElMessage({
      message: '设置已保存，新的快捷键已生效',
      type: 'success',
      duration: 2000,
      showClose: true
    })
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage({
      message: error instanceof Error ? error.message : '保存设置失败，请重试',
      type: 'error',
      duration: 3000,
      showClose: true
    })
  }
}

// 恢复默认人设
const resetPrompts = () => {
  settings.value.prompts = { ...defaultPrompts }
  ElMessage.success('已恢复默认人设')
}

// 窗口控制
const minimizeWindow = () => {
  window.electron.ipcRenderer.send('window-control', 'minimize')
}

const closeWindow = () => {
  window.electron.ipcRenderer.send('window-control', 'hide')
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
/* 修改窗口控制样式 */
.window-controls {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  border-radius: 8px 8px 0 0;
  z-index: 1000;
  -webkit-app-region: drag; /* 整个标题栏可拖拽 */
}

.drag-area {
  flex: 1;
  height: 100%;
}

.control-buttons {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag; /* 控制按钮不可拖拽 */
}

.minimize-btn,
.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  margin: 0;
  padding: 0;
  -webkit-app-region: no-drag; /* 按钮不可拖拽 */
}

.minimize-btn:hover {
  background-color: var(--el-color-info-light-9);
}

.close-btn:hover {
  background-color: var(--el-color-danger);
  color: white;
}

/* 修改主容器样式 */
.settings {
  padding: 52px 30px 30px;  /* 增加顶部内边距以适应标题栏 */
  max-width: 1200px;
  margin: 0 auto;
  height: 100vh;
  overflow-y: auto;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

/* 确保表单区域不可拖拽 */
.settings-form {
  -webkit-app-region: no-drag;
}

.settings-header {
  margin-bottom: 30px;
  text-align: center;
}

.settings-header h2 {
  font-size: 28px;
  color: var(--el-text-color-primary);
  margin: 0;
}

.settings-desc {
  color: var(--el-text-color-secondary);
  margin: 8px 0 0;
}

.settings-section {
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  color: var(--el-text-color-primary);
  margin: 0 0 20px;
}

.shortcut-input {
  max-width: 300px;
}

.api-key-input {
  max-width: 400px;
}

.shortcut-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
  transition: all 0.3s ease;
}

.shortcut-tip.recording {
  color: var(--el-color-primary);
  font-weight: 500;
}

.prompts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.prompt-card {
  background: var(--el-bg-color-page);
  border-radius: 6px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
}

.prompt-header {
  margin-bottom: 12px;
}

.role-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.prompt-input {
  width: 100%;
}

.settings-footer {
  margin-top: 30px;
  text-align: center;
}
</style> 