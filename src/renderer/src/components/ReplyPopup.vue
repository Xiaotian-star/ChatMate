<template>
  <div class="popup-container">
    <div class="popup-header" @mousedown="startDrag">
      <h2>高情商回复助手</h2>
      <button class="close-btn" @click="closePopup">×</button>
    </div>

    <div class="content">
      <div class="selected-text">
        <h3>选中的文本:</h3>
        <p>{{ selectedText }}</p>
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
      </div>

      <div v-if="loading" class="loading">
        生成回复中...
      </div>
      
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      
      <div v-else-if="replies.length > 0" class="replies">
        <div 
          v-for="(reply, index) in replies" 
          :key="index"
          class="reply-item"
          @click="selectReply(reply, index)"
        >
          <div class="reply-text">{{ reply }}</div>
          <div class="copy-tip" v-if="copiedIndex === index">已复制!</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const selectedText = ref('')
const selectedPersona = ref('职场精英')
const loading = ref(false)
const error = ref('')
const replies = ref<string[]>([])
const copiedIndex = ref(-1)

const replyOptions = ['职场精英', '暖心朋友', '情感专家']

// 监听选中文本事件
onMounted(() => {
  window.electronAPI.onTextSelected((text: string) => {
    selectedText.value = text
    getReply()
  })
})

// 选择回复风格
async function selectPersona(persona: string) {
  selectedPersona.value = persona
  await getReply()
}

// 获取回复
async function getReply() {
  if (!selectedText.value) return
  
  loading.value = true
  error.value = ''
  replies.value = []
  copiedIndex.value = -1
  
  try {
    replies.value = await window.electronAPI.getAIResponse({
      text: selectedText.value,
      persona: selectedPersona.value
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '生成回复失败'
  } finally {
    loading.value = false
  }
}

// 选择回复并复制到剪贴板
async function selectReply(reply: string, index: number) {
  try {
    await navigator.clipboard.writeText(reply)
    copiedIndex.value = index
    setTimeout(() => {
      closePopup()
    }, 500) // 显示复制成功提示后关闭窗口
  } catch (err) {
    console.error('复制失败:', err)
    error.value = '复制失败，请手动复制'
  }
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
  
  // 添加事件监听
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (!isDragging) return
  
  const deltaX = e.clientX - startX
  const deltaY = e.clientY - startY
  
  // 发送消息给主进程移动窗口
  window.electronAPI.moveWindow(deltaX, deltaY)
  
  startX = e.clientX
  startY = e.clientY
}

function stopDrag() {
  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 组件卸载时清理事件监听
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style>
.popup-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 16px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  cursor: move; /* 指示可拖动 */
  user-select: none; /* 防止文本选择 */
  -webkit-app-region: drag; /* 支持窗口拖动 */
}

.popup-header button {
  -webkit-app-region: no-drag; /* 按钮不参与拖动 */
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
  overflow-y: auto;
}

.selected-text {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.selected-text h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.selected-text p {
  margin: 0;
  font-size: 14px;
  color: #333;
  word-break: break-all;
}

.reply-options {
  margin-bottom: 16px;
}

.buttons {
  display: flex;
  gap: 8px;
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

.loading {
  text-align: center;
  color: #666;
  padding: 20px;
}

.error {
  color: #ff4d4f;
  padding: 12px;
  background: #fff2f0;
  border-radius: 6px;
}

.replies {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-item {
  position: relative;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.reply-item:hover {
  background: #e6f7ff;
}

.reply-text {
  word-break: break-all;
}

.copy-tip {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: #52c41a;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
</style> 