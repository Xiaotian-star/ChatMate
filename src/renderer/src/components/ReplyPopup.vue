<template>
  <div class="popup-container">
    <div class="popup-header" @mousedown="startDrag">
      <div class="header-actions">
        <button class="session-btn" @click="showSessions = !showSessions">
          {{ getCurrentSessionName() }}
        </button>
        <button class="close-btn" @click="closePopup">×</button>
      </div>
    </div>

    <div class="content">
      <!-- 会话列表 -->
      <div v-if="showSessions" class="sessions">
        <div class="session-list">
          <div 
            class="session-item"
            :class="{ active: currentSessionId === 'default' }"
            @click="selectSession('default')"
          >
            <div class="session-title">默认会话</div>
          </div>
          <div 
            v-for="session in customSessions" 
            :key="session.id"
            :class="['session-item', { active: session.id === currentSessionId }]"
            @click="selectSession(session.id)"
          >
            <div class="session-title">{{ session.title }}</div>
            <div class="session-time">{{ formatTime(session.lastUpdated) }}</div>
            <div class="session-context" v-if="session.messages?.length">
              <div class="context-item" v-for="(msg, idx) in session.messages.slice(-2)" :key="idx">
                <div class="context-role">{{ msg.role === 'user' ? '我' : 'AI' }}:</div>
                <div class="context-content">{{ msg.content }}</div>
              </div>
            </div>
            <button 
              class="delete-btn" 
              @click.stop="deleteSession(session.id)"
              v-if="session.id !== 'default'"
            >
              ×
            </button>
          </div>
          <div class="session-item new" @click="createNewSession" v-if="sessions.length < 10">
            <input 
              v-if="isCreatingSession"
              ref="sessionNameInput"
              v-model="newSessionName"
              @keydown.enter="confirmNewSession"
              @blur="cancelNewSession"
              @keydown.esc="cancelNewSession"
              placeholder="输入会话名称后回车"
              class="session-name-input"
            />
            <template v-else>
              + 新建会话
            </template>
          </div>
        </div>
      </div>

      <div class="input-area">
        <textarea 
          v-model="selectedText"
          placeholder="请输入或粘贴需要回复的内容..."
          @keydown="handleKeyDown"
          rows="4"
        ></textarea>
      </div>

      <div class="reply-options">
        <div class="buttons">
          <button 
            v-for="option in replyOptions" 
            :key="option"
            :class="{ active: selectedPersona === option }"
            @click="selectPersona(option)"
          >
            {{ option }}
          </button>
        </div>
        <div class="input-actions">
          <span class="tip">提示: Ctrl + Enter 快速生成回复</span>
          <button 
            class="generate-btn" 
            @click="getReply"
            :disabled="!selectedText.trim()"
          >
            生成回复
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">生成回复中...</div>
      </div>
      
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      
      <div v-else-if="replies.length > 0" class="replies">
        <div 
          v-for="(reply, index) in replies" 
          :key="index"
          class="reply-item"
          :class="{ 
            selected: selectedIndex === index,
            copied: copiedIndex === index 
          }"
          @click="selectReply(reply, index)"
        >
          <div class="reply-number">{{ index + 1 }}</div>
          <div class="reply-text">{{ reply }}</div>
          <div class="copy-tip">{{ copiedIndex === index ? '已复制!' : '点击复制' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import type { Conversation, ElectronAPI } from '../../../types'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

const selectedText = ref('')
const selectedPersona = ref('职场精英')
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

const replyOptions = ['职场精英', '暖心朋友', '情感专家']

// 计算属性：自定义会话列表（排除默认会话）
const customSessions = computed(() => {
  return sessions.value.filter(session => session.id !== 'default')
})

// 获取当前会话名称
function getCurrentSessionName() {
  if (currentSessionId.value === 'default') {
    return '默认会话'
  }
  const session = sessions.value.find(s => s.id === currentSessionId.value)
  return session ? session.title : '新会话'
}

// 加载设置和会话
async function loadSettings() {
  try {
    const settings = await window.electronAPI.getSettings()
    if (settings) {
      sessions.value = settings.conversations || []
      // 确保默认会话存在
      if (!sessions.value.find(s => s.id === 'default')) {
        sessions.value.push({
          id: 'default',
          title: '默认会话',
          messages: [],
          lastUpdated: Date.now()
        })
      }
    }
  } catch (err) {
    console.error('加载设置失败:', err)
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
function confirmNewSession() {
  if (newSessionName.value.trim() && sessions.value.length < 10) {
    const sessionId = Date.now().toString(36)
    const newSession = {
      id: sessionId,
      title: newSessionName.value.trim(),
      messages: [],
      lastUpdated: Date.now()
    }
    sessions.value.push(newSession)
    currentSessionId.value = sessionId
    showSessions.value = false
    isCreatingSession.value = false
    
    // 保存设置
    window.electronAPI.getSettings()
      .then(settings => {
        return window.electronAPI.saveSettings({
          ...settings,
          conversations: sessions.value
        })
      })
      .catch(err => {
        console.error('保存设置失败:', err)
        error.value = '创建会话失败'
      })
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
  await loadSettings()
  const cleanup = window.electronAPI.onTextSelected((text: string) => {
    console.log('收到选中的文本:', text)
    selectedText.value = text || ''
  })

  const cleanupAutoGenerate = window.electronAPI.onAutoGenerate(() => {
    if (selectedText.value.trim()) {
      getReply()
    }
  })

  onUnmounted(() => {
    cleanup()
    cleanupAutoGenerate()
  })
})

// 选择回复风格
async function selectPersona(persona: string) {
  selectedPersona.value = persona
  await getReply()
}

// 获取回复
async function getReply() {
  if (!selectedText.value.trim()) return
  
  loading.value = true
  error.value = ''
  replies.value = []
  copiedIndex.value = -1
  
  try {
    const response = await window.electronAPI.getAIResponse({
      text: selectedText.value,
      conversationId: currentSessionId.value,
      persona: selectedPersona.value
    })
    
    // 确保 response 是数组
    if (Array.isArray(response)) {
      replies.value = response
    } else {
      console.error('回复格式错误:', response)
      error.value = '回复格式错误'
    }
  } catch (err) {
    console.error('获取回复失败:', err)
    error.value = err instanceof Error ? err.message : '获取回复失败'
  } finally {
    loading.value = false
  }
}

// 选择回复并复制到剪贴板
async function selectReply(reply: string, index: number) {
  selectedIndex.value = index
  navigator.clipboard.writeText(reply).then(() => {
    copiedIndex.value = index
    setTimeout(() => {
      copiedIndex.value = -1
    }, 2000)
  })
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
  
  const deltaX = e.clientX - startX
  const deltaY = e.clientY - startY
  
  startX = e.clientX
  startY = e.clientY

  window.electronAPI.moveWindow(deltaX, deltaY)
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
    const settings = await window.electronAPI.getSettings()
    await window.electronAPI.saveSettings({
      ...settings,
      conversations: sessions.value
    })
  } catch (err) {
    console.error('删除会话失败:', err)
    error.value = '删除会话失败'
  }
}

// 添加键盘事件处理函数
function handleKeyDown(e: KeyboardEvent) {
  // 检查是否按下 Ctrl+Enter
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault() // 阻止默认行为
    if (selectedText.value.trim()) {
      getReply()
    }
  }
}
</script>

<style>
.popup-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 16px;
  width: 500px;
  height: 500px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 16px;
  cursor: move;
  user-select: none;
  -webkit-app-region: drag;
  padding: 4px;
}

.header-actions {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.session-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  color: #666;
}

.session-btn:hover {
  background: #f5f5f5;
}

.popup-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.sessions {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  max-height: 300px;
  overflow-y: auto;
}

.session-list {
  padding: 8px;
}

.session-item {
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
  background: #f5f5f5;
  position: relative;
}

.session-item:hover {
  background: #e6f7ff;
}

.session-item.active {
  background: #1890ff;
  color: white;
}

.session-item.new {
  background: #f0f0f0;
  text-align: center;
  color: #666;
}

.session-name-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.session-name-input:focus {
  border-color: #1890ff;
}

.session-title {
  font-size: 14px;
  margin-bottom: 4px;
}

.session-time {
  font-size: 12px;
  color: #999;
}

.session-context {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  border-top: 1px solid #eee;
  padding-top: 8px;
}

.context-item {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.context-role {
  flex-shrink: 0;
  color: #1890ff;
}

.context-content {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.input-area {
  flex-shrink: 0;
  margin-bottom: 16px;
}

textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  height: 100px;
  background: #f9f9f9;
}

textarea:focus {
  outline: none;
  border-color: #1890ff;
  background: white;
}

.reply-options {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.buttons button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.buttons button.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tip {
  font-size: 12px;
  color: #999;
}

.generate-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  background: #1890ff;
  color: white;
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

.loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

.loading-text {
  font-size: 14px;
  color: #666;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  margin: 16px 0;
  padding: 12px 16px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 14px;
  line-height: 1.5;
}

.replies {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 8px;
}

.reply-item {
  position: relative;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  gap: 12px;
}

.reply-item:hover {
  background: #e6f7ff;
  border-color: #1890ff;
}

.reply-item.selected {
  background: #e6f7ff;
  border-color: #1890ff;
}

.reply-number {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: #1890ff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.reply-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.copy-tip {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.reply-item:hover .copy-tip {
  opacity: 1;
}

.reply-item.copied .copy-tip {
  opacity: 1;
  background: #52c41a;
  color: white;
}

.delete-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #ff4d4f;
}

.session-item.active .delete-btn {
  color: white;
}

.session-item.active .delete-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}
</style> 