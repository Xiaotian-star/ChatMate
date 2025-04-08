<template>
  <div class="popup-container">
    <!-- 顶部导航栏 -->
    <div class="popup-header" @mousedown="startDrag">
      <div class="header-left">
        <div class="session-selector" @click="showSessions = !showSessions">
          <svg class="session-icon" viewBox="0 0 24 24" width="16" height="16">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="currentColor"/>
          </svg>
          <span class="session-name">{{ getCurrentSessionName() }}</span>
          <svg 
            class="arrow-icon" 
            :class="{ 'is-open': showSessions }"
            viewBox="0 0 24 24" 
            width="16" 
            height="16"
          >
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor"/>
          </svg>
        </div>
      </div>
      <div class="header-right">
        <button class="close-btn" @click="closePopup">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="content">
      <!-- 会话列表下拉面板 -->
      <Transition 
        enter-active-class="animate-dropdown-enter" 
        leave-active-class="animate-dropdown-leave"
      >
        <div v-if="showSessions" class="sessions-dropdown">
          <div class="sessions-list">
            <div 
              class="session-item default"
              :class="{ active: currentSessionId === 'default' }"
              @click="selectSession('default')"
            >
              <div class="session-info">
                <svg class="default-icon" viewBox="0 0 24 24" width="16" height="16">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z" fill="currentColor"/>
                </svg>
                <span class="session-title">默认会话</span>
              </div>
            </div>
            
            <div 
              v-for="session in customSessions" 
              :key="session.id"
              class="session-item"
              :class="{ active: session.id === currentSessionId }"
              @click="selectSession(session.id)"
            >
              <div class="session-info">
                <span class="session-title">{{ session.title }}</span>
                <span class="session-time">{{ formatTime(session.lastUpdated) }}</span>
              </div>
              <button 
                class="delete-session-btn" 
                @click.stop="deleteSession(session.id)"
                v-if="session.id !== 'default'"
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                </svg>
              </button>
            </div>

            <div class="session-item new" @click="createNewSession" v-if="sessions.length < 10">
              <div class="new-session-content">
                <svg class="add-icon" viewBox="0 0 24 24" width="16" height="16">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                </svg>
                <span>新建会话</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 主要内容区域 -->
      <div class="main-content">
        <!-- 输入区域 -->
        <div class="input-section">
          <div class="input-area">
            <textarea 
              v-model="selectedText"
              placeholder="请输入或粘贴需要回复的内容..."
              @keydown="handleKeyDown"
              rows="4"
            ></textarea>
          </div>
          
          <div class="control-panel">
            <div class="left-controls">
              <select 
                v-model="selectedPersona"
                class="persona-select"
              >
                <option value="">选择回复风格...</option>
                <option 
                  v-for="[key, prompt] in Object.entries(settings?.prompts || {})"
                  :key="key"
                  :value="prompt.title"
                >
                  {{ prompt.title }}
                </option>
              </select>
              <!-- <span class="tip">提示: Enter 快速生成回复</span> -->
            </div>
            <button 
              class="generate-btn" 
              @click="getReply"
              :disabled="!selectedText.trim() || !activeModels.length"
            >
              生成回复
            </button>
          </div>
        </div>

        <!-- 回复区域 -->
        <div class="reply-section">
          <!-- 多模型回复区域 -->
          <div class="models-replies" v-if="activeModels.length > 0">
            <ModelReply
              v-for="(model, index) in activeModels"
              :key="model.id"
              :model="model"
              :text="selectedText"
              :persona="selectedPersona"
              ref="modelReplies"
              @select-reply="handleReplySelect"
            />
          </div>
          <div v-else class="no-models-tip">
            <svg class="warning-icon" viewBox="0 0 24 24" width="24" height="24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
            </svg>
            <span>请在设置中启用至少一个模型</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import type { Conversation, StoredSettings, ElectronAPI, Model } from '../../../types'
import ModelReply from './reply/ModelReply.vue'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

const selectedText = ref('')
const selectedPersona = ref('智能助手')
const loading = ref(false)
const error = ref('')
const replies = ref<string[]>([])
const copiedIndex = ref(-1)
const selectedIndex = ref(-1)
const showSessions = ref(false)
const sessions = ref<Conversation[]>([])
const currentSessionId = ref('default')
const isCreatingSession = ref(false)
const newSessionName = ref('')
const sessionNameInput = ref<HTMLInputElement | null>(null)
const settings = ref<StoredSettings | null>(null)
const loadingText = ref('生成回复中...')

// 计算属性：自定义会话列表（排除默认会话）
const customSessions = computed(() => {
  return sessions.value.filter(session => session.id !== 'default')
})

// 新增：计算已启用的模型列表
const activeModels = computed(() => {
  if (!settings.value?.models) return []
  return Object.values(settings.value.models).filter(model => model.isActive)
})

// 模型回复组件引用
const modelReplies = ref<InstanceType<typeof ModelReply>[]>([])

// 获取当前会话名称
function getCurrentSessionName() {
  if (currentSessionId.value === 'default') {
    return '默认会话'
  }
  const session = sessions.value.find(s => s.id === currentSessionId.value)
  return session ? session.title : '新会话'
}

// 加载设置
async function loadSettings() {
  try {
    const savedSettings = await window.electronAPI.getSettings()
    if (savedSettings) {
      settings.value = savedSettings
      // 加载保存的会话数据
      if (Array.isArray(savedSettings.conversations)) {
        // 确保默认会话存在
        const hasDefaultSession = savedSettings.conversations.some(s => s.id === 'default')
        if (!hasDefaultSession) {
          savedSettings.conversations.push({
            id: 'default',
            title: '默认会话',
            messages: [],
            lastUpdated: Date.now()
          })
          await window.electronAPI.saveSettings(savedSettings)
        }
        sessions.value = savedSettings.conversations
        console.log('已加载保存的会话:', sessions.value)
      } else {
        // 如果没有会话数据，创建默认会话
        sessions.value = [{
          id: 'default',
          title: '默认会话',
          messages: [],
          lastUpdated: Date.now()
        }]
        // 保存初始化的会话数据
        await window.electronAPI.saveSettings({
          ...savedSettings,
          conversations: sessions.value
        })
        console.log('创建了默认会话')
      }
      
      // 如果当前选中的人设不在设置中，选择第一个可用的人设
      const availablePersonas = Object.values(savedSettings.prompts).map(p => p.title)
      if (!availablePersonas.includes(selectedPersona.value) && availablePersonas.length > 0) {
        selectedPersona.value = availablePersonas[0]
      }
    }
  } catch (err) {
    console.error('加载设置失败:', err)
    error.value = '加载设置失败'
  }
}

// 创建新会话
function createNewSession() {
  isCreatingSession.value = true
  newSessionName.value = ''
  nextTick(() => {
    sessionNameInput.value?.focus()
  })
}

// 确认创建新会话
async function confirmNewSession() {
  try {
    if (!newSessionName.value.trim()) {
      error.value = '会话名称不能为空'
      return
    }
    
    if (sessions.value.length >= 10) {
      error.value = '最多只能创建10个会话'
      return
    }

    console.log('开始创建新会话...')
    const sessionId = Date.now().toString(36)
    const newSession = {
      id: sessionId,
      title: newSessionName.value.trim(),
      messages: [],
      lastUpdated: Date.now()
    }
    
    console.log('新会话数据:', newSession)
    sessions.value = [...sessions.value, newSession]
    currentSessionId.value = sessionId
    
    console.log('正在获取当前设置...')
    const currentSettings = await window.electronAPI.getSettings()
    console.log('当前设置:', currentSettings)
    
    // 创建一个只包含可序列化数据的设置对象
    const settingsToSave = {
      ...currentSettings,
      conversations: sessions.value.map(session => ({
        id: String(session.id),
        title: String(session.title),
        messages: (session.messages || []).map(msg => ({
          role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
          content: String(msg.content)
        })),
        lastUpdated: Number(session.lastUpdated)
      }))
    }
    
    console.log('正在保存更新后的设置...', settingsToSave)
    const success = await window.electronAPI.saveSettings(settingsToSave)
    
    if (success) {
      console.log('会话创建成功')
      showSessions.value = false
      isCreatingSession.value = false
      error.value = ''
      newSessionName.value = ''
    } else {
      console.error('保存设置返回失败')
      error.value = '创建会话失败：无法保存设置'
      // 回滚会话创建
      sessions.value = sessions.value.filter(s => s.id !== sessionId)
      currentSessionId.value = 'default'
    }
  } catch (err) {
    console.error('创建会话时出错:', err)
    error.value = '创建会话失败：' + (err instanceof Error ? err.message : '未知错误')
    // 确保回滚任何可能的更改
    await loadSettings()
  }
}

// 取消创建新会话
function cancelNewSession() {
  isCreatingSession.value = false
  newSessionName.value = ''
}

// 选择会话
function selectSession(sessionId: string) {
  currentSessionId.value = sessionId
  showSessions.value = false
}

// 格式化时间
function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// 监听选中文本事件
onMounted(async () => {
  console.log('组件挂载，开始加载设置...')
  await loadSettings()
  console.log('设置加载完成')
  
  // 监听选中文本事件
  console.log('开始注册文本选中事件监听器...')
  const cleanup = window.electronAPI.onTextSelected((text: string) => {
    console.log('渲染进程收到选中的文本:', text)
    console.log('准备更新 selectedText...')
    selectedText.value = text || ''
    console.log('selectedText 更新完成:', selectedText.value)
    // 如果有文本内容，自动生成回复
    if (text) {
      getReply()
    }
  })
  console.log('文本选中事件监听器注册完成')

  // 监听自动生成事件
  const cleanupAutoGenerate = window.electronAPI.onAutoGenerate(() => {
    console.log('收到自动生成事件')
    if (selectedText.value.trim()) {
      getReply()
    }
  })

  // 定期检查设置更新
  const settingsInterval = setInterval(async () => {
    await loadSettings()
  }, 5000)

  onUnmounted(() => {
    console.log('组件卸载，清理事件监听器...')
    cleanup()
    cleanupAutoGenerate()
    clearInterval(settingsInterval)
  })
})

// 选择回复风格
async function selectPersona(persona: string) {
  selectedPersona.value = persona
  if (selectedText.value.trim()) {
    await getReply()
  }
}

// 获取回复
async function getReply() {
  if (!selectedText.value.trim() || !settings.value) return
  
  const prompt = Object.values(settings.value.prompts).find(p => p.title === selectedPersona.value)
  if (!prompt) {
    error.value = '未找到选中的人设'
    return
  }

  // 并发获取所有启用的模型的回复
  modelReplies.value.forEach(modelReply => {
    modelReply.getReply()
  })
}

// 保存对话到当前会话
async function saveToCurrentSession(userMessage: string, aiResponses: { modelId: string, response: string }[]) {
  try {
    let currentSession = sessions.value.find(s => s.id === currentSessionId.value)
    
    if (!currentSession) {
      currentSession = sessions.value.find(s => s.id === 'default')
      if (!currentSession) {
        currentSession = {
          id: 'default',
          title: '默认会话',
          messages: [],
          lastUpdated: Date.now()
        }
        sessions.value.push(currentSession)
      }
      currentSessionId.value = 'default'
    }

    if (!currentSession.messages) {
      currentSession.messages = []
    }
    
    // 添加用户消息
    currentSession.messages.push({ role: 'user', content: userMessage })
    
    // 添加每个模型的回复
    aiResponses.forEach(({ modelId, response }) => {
      const model = settings.value?.models[modelId]
      currentSession!.messages.push({
        role: 'assistant',
        content: `[${model?.name || 'AI'}] ${response}`
      })
    })
    
    currentSession.lastUpdated = Date.now()

    // 保存更新后的设置
    const currentSettings = await window.electronAPI.getSettings()
    const settingsToSave = {
      ...currentSettings,
      conversations: sessions.value.map(session => ({
        id: String(session.id),
        title: String(session.title),
        messages: (session.messages || []).map(msg => ({
          role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
          content: String(msg.content)
        })),
        lastUpdated: Number(session.lastUpdated)
      }))
    }

    await window.electronAPI.saveSettings(settingsToSave)
  } catch (err) {
    console.error('保存对话失败:', err)
    error.value = '保存对话失败'
  }
}

// 处理回复选择
async function handleReplySelect(reply: string, index: number, modelId: string) {
  selectedIndex.value = index
  
  // 保存对话到当前会话
  await saveToCurrentSession(selectedText.value, [{
    modelId: modelId,
    response: reply
  }])
  
  // 清空原始剪贴板内容
  selectedText.value = ''
  // 通知主进程清空剪贴板
  window.electronAPI.clearClipboard()
}

// 关闭弹窗
function closePopup() {
  window.electronAPI.closePopup()
}

// 窗口拖动相关
let isDragging = false
let startX = 0
let startY = 0

function startDrag(e: MouseEvent) {
  isDragging = true
  startX = e.clientX
  startY = e.clientY
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (!isDragging) return
  
  // 只发送移动事件，不处理大小调整
  window.electronAPI.moveWindow(e.clientX - startX, e.clientY - startY)
  
  startX = e.clientX
  startY = e.clientY
}

function stopDrag() {
  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

// 删除会话
async function deleteSession(sessionId: string) {
  if (sessionId === 'default') return
  
  sessions.value = sessions.value.filter(s => s.id !== sessionId)
  if (currentSessionId.value === sessionId) {
    currentSessionId.value = 'default'
  }
  
  try {
    const currentSettings = await window.electronAPI.getSettings()
    // 创建一个只包含可序列化数据的设置对象
    const settingsToSave = {
      ...currentSettings,
      conversations: sessions.value.map(session => ({
        id: String(session.id),
        title: String(session.title),
        messages: (session.messages || []).map(msg => ({
          role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
          content: String(msg.content)
        })),
        lastUpdated: Number(session.lastUpdated)
      }))
    }
    
    await window.electronAPI.saveSettings(settingsToSave)
  } catch (err) {
    console.error('删除会话失败:', err)
    error.value = '删除会话失败'
  }
}

// 添加键盘事件处理函数
function handleKeyDown(e: KeyboardEvent) {
  // 如果是在输入框中按下 Enter 键（非组合键）
  if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
    e.preventDefault() // 阻止默认行为
    if (selectedText.value.trim()) {
      getReply()
    }
  }
}
</script>

<style scoped>
.popup-container {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  -webkit-app-region: drag;
}

.header-left {
  -webkit-app-region: no-drag;
}

.header-right {
  -webkit-app-region: no-drag;
}

.session-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 160px;
}

.session-selector:hover {
  background: #e6f7ff;
}

.session-icon {
  color: #1890ff;
  flex-shrink: 0;
}

.session-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.arrow-icon {
  color: #999;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.arrow-icon.is-open {
  transform: rotate(180deg);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  border-radius: 6px;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

.sessions-dropdown {
  position: absolute;
  top: 0px;
  left: 0px;
  min-width: 240px;
  max-width: 320px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  transform-origin: top left;
  will-change: transform, opacity;
}

.sessions-list {
  padding: 8px;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.session-item:hover {
  background: #f5f5f5;
}

.session-item.active {
  background: #e6f7ff;
  border-color: #1890ff;
}

.session-item.default {
  background: #fafafa;
}

.session-item.default:hover {
  background: #f0f7ff;
}

.session-item.default.active {
  background: #e6f7ff;
  border-color: #1890ff;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.default-icon {
  color: #1890ff;
  flex-shrink: 0;
}

.session-title {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.session-time {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.delete-session-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  border-radius: 4px;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0;
  padding: 0;
}

.session-item:hover .delete-session-btn {
  opacity: 1;
}

.delete-session-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #ff4d4f;
}

.session-item.new {
  color: #1890ff;
  justify-content: center;
  margin-top: 8px;
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.new-session-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-icon {
  color: currentColor;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  overflow: hidden;
}

.input-section {
  flex-shrink: 0;
  min-height: 160px;
  display: flex;
  flex-direction: column;
}

.input-area {
  margin-bottom: 12px;
  flex: 1;
  display: flex;
}

textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  transition: all 0.2s;
  background: #fff;
  min-height: 100px;
  flex: 1;
}

textarea:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.control-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.left-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.persona-select {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  background: #fff;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
  min-width: 160px;
}

.persona-select:hover {
  border-color: #40a9ff;
}

.persona-select:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.tip {
  font-size: 12px;
  color: #999;
}

.generate-btn {
  padding: 8px 24px;
  border: none;
  border-radius: 6px;
  background: #1890ff;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn:hover {
  background: #40a9ff;
}

.generate-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.reply-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.models-replies {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

.no-models-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  background: #fafafa;
  border-radius: 8px;
  color: #999;
}

.warning-icon {
  color: #faad14;
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}

/* 下拉面板动画 */
.animate-dropdown-enter {
  animation: dropdown-in 0.2s ease-out;
  transform-origin: top left;
}

.animate-dropdown-leave {
  animation: dropdown-out 0.2s ease-in;
  transform-origin: top left;
}

@keyframes dropdown-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes dropdown-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
}
</style> 