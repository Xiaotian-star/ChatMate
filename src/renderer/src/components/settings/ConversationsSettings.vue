<template>
  <div class="settings-section">
    <div class="section-header">
      <h2 class="section-title">会话管理</h2>
      <div class="section-actions">
        <el-button type="danger" @click="clearAllConversations">
          <el-icon><Delete /></el-icon>
          清空所有会话
        </el-button>
      </div>
    </div>

    <!-- 会话列表 -->
    <div class="conversations-list" v-if="hasConversations">
      <el-timeline>
        <!-- 默认会话 -->
        <el-timeline-item
          timestamp="默认会话"
          placement="top"
        >
          <el-card class="conversation-card default-session">
            <template #header>
              <div class="conversation-header">
                <span class="conversation-title">默认会话</span>
                <div class="conversation-actions">
                  <el-button 
                    type="primary" 
                    link 
                    @click="viewDefaultConversation"
                  >
                    <el-icon><View /></el-icon>
                  </el-button>
                  <el-button 
                    type="danger" 
                    link 
                    @click="clearDefaultConversation"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </template>
            <div class="conversation-messages">
              <div 
                v-for="(message, index) in defaultMessages.slice(0, 2)" 
                :key="index"
                class="message-preview"
              >
                <span class="message-role">{{ formatRole(message.role) }}:</span>
                <span class="message-content">{{ truncateText(message.content, 100) }}</span>
              </div>
              <div v-if="defaultMessages.length > 2" class="more-messages">
                还有 {{ defaultMessages.length - 2 }} 条消息...
              </div>
            </div>
          </el-card>
        </el-timeline-item>

        <!-- 其他会话 -->
        <el-timeline-item
          v-for="conversation in sortedConversations"
          :key="conversation.id"
          :timestamp="formatTime(conversation.lastUpdated)"
          placement="top"
        >
          <el-card class="conversation-card">
            <template #header>
              <div class="conversation-header">
                <span class="conversation-title">{{ conversation.title || '未命名会话' }}</span>
                <div class="conversation-actions">
                  <el-button 
                    type="primary" 
                    link 
                    @click="viewConversation(conversation)"
                  >
                    <el-icon><View /></el-icon>
                  </el-button>
                  <el-button 
                    type="danger" 
                    link 
                    @click="deleteConversation(conversation.id)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </template>
            <div class="conversation-messages">
              <div 
                v-for="(message, index) in conversation.messages.slice(0, 2)" 
                :key="index"
                class="message-preview"
              >
                <span class="message-role">{{ formatRole(message.role) }}:</span>
                <span class="message-content">{{ truncateText(message.content, 100) }}</span>
              </div>
              <div v-if="conversation.messages.length > 2" class="more-messages">
                还有 {{ conversation.messages.length - 2 }} 条消息...
              </div>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </div>

    <!-- 空状态 -->
    <el-empty
      v-else
      description="暂无会话记录"
    />

    <!-- 会话详情弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentConversation?.title || '未命名会话'"
      width="60%"
      class="conversation-dialog"
    >
      <div class="conversation-detail">
        <div 
          v-for="(message, index) in currentConversation?.messages" 
          :key="index"
          class="message-item"
          :class="message.role"
        >
          <div class="message-header">
            <span class="message-role">{{ formatRole(message.role) }}</span>
          </div>
          <div class="message-content">{{ message.content }}</div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Delete, View } from '@element-plus/icons-vue'
import type { StoredSettings, Conversation } from '../../../../types'

const props = defineProps<{
  settings: StoredSettings
}>()

const emit = defineEmits(['update:settings'])

// 添加自动刷新间隔
let refreshInterval: NodeJS.Timeout | null = null

// 刷新会话数据
const refreshConversations = async () => {
  try {
    const currentSettings = await window.electronAPI.getSettings()
    if (JSON.stringify(currentSettings.conversations) !== JSON.stringify(props.settings.conversations)) {
      console.log('检测到会话数据变化，更新显示')
      emit('update:settings', currentSettings)
    }
  } catch (err) {
    console.error('刷新会话数据失败:', err)
  }
}

// 组件挂载时启动自动刷新
onMounted(() => {
  // 每3秒刷新一次会话数据
  refreshInterval = setInterval(refreshConversations, 3000)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// 默认会话数据
const defaultMessages = computed(() => {
  const defaultSession = props.settings.conversations?.find(conv => conv.id === 'default')
  return defaultSession?.messages || []
})

// 计算是否有会话
const hasConversations = computed(() => {
  return defaultMessages.value.length > 0 || (props.settings.conversations?.length || 0) > 0
})

// 按最后更新时间排序的会话列表（排除默认会话）
const sortedConversations = computed(() => {
  return [...(props.settings.conversations || [])]
    .filter(conv => conv.id !== 'default')
    .sort((a, b) => b.lastUpdated - a.lastUpdated)
})

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化角色名称
const formatRole = (role: string) => {
  const roleMap: Record<string, string> = {
    'user': '用户',
    'assistant': 'AI',
    'system': '系统'
  }
  return roleMap[role] || role
}

// 截断文本
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// 删除单个会话
const deleteConversation = async (id: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个会话吗？此操作不可恢复。',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const newConversations = props.settings.conversations?.filter(conv => conv.id !== id) || []
    emit('update:settings', { ...props.settings, conversations: newConversations })
    ElMessage.success('删除成功')
  } catch {
    // 用户取消删除
  }
}

// 会话详情相关
const dialogVisible = ref(false)
const currentConversation = ref<Conversation | null>(null)
const isViewingDefault = ref(false)

// 查看会话详情
const viewConversation = (conversation: Conversation) => {
  currentConversation.value = conversation
  dialogVisible.value = true
}

// 查看默认会话
const viewDefaultConversation = () => {
  const defaultSession = props.settings.conversations?.find(conv => conv.id === 'default')
  if (defaultSession) {
    currentConversation.value = defaultSession
    isViewingDefault.value = true
    dialogVisible.value = true
  }
}

// 清空默认会话
const clearDefaultConversation = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空默认会话吗？此操作不可恢复。',
      '清空确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const newConversations = props.settings.conversations?.map(conv => {
      if (conv.id === 'default') {
        return { ...conv, messages: [] }
      }
      return conv
    }) || []
    
    emit('update:settings', { ...props.settings, conversations: newConversations })
    ElMessage.success('默认会话已清空')
  } catch {
    // 用户取消操作
  }
}

// 清空所有会话
const clearAllConversations = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有会话记录吗？此操作不可恢复。',
      '清空确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 保留默认会话，但清空其消息
    const defaultSession = props.settings.conversations?.find(conv => conv.id === 'default')
    const newConversations = defaultSession 
      ? [{ ...defaultSession, messages: [] }]
      : [{ id: 'default', title: '默认会话', messages: [], lastUpdated: Date.now() }]
    
    emit('update:settings', { ...props.settings, conversations: newConversations })
    ElMessage.success('已清空所有会话')
  } catch {
    // 用户取消清空
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

.conversations-list {
  margin-top: 20px;
}

.conversation-card {
  margin-bottom: 16px;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conversation-title {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.conversation-actions {
  display: flex;
  gap: 8px;
}

.conversation-messages {
  font-size: 14px;
}

.message-preview {
  margin-bottom: 8px;
  color: var(--el-text-color-regular);
}

.message-role {
  font-weight: 500;
  margin-right: 8px;
  color: var(--el-text-color-primary);
}

.message-content {
  color: var(--el-text-color-secondary);
}

.more-messages {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}

/* 会话详情样式 */
.conversation-dialog :deep(.el-dialog__body) {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.conversation-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  padding: 12px;
  border-radius: 8px;
  background: var(--el-bg-color-page);
}

.message-item.user {
  background: var(--el-color-primary-light-9);
  margin-left: 24px;
}

.message-item.assistant {
  background: var(--el-bg-color);
  margin-right: 24px;
}

.message-item.system {
  background: var(--el-color-info-light-9);
  margin: 0 12px;
  font-style: italic;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-role {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.message-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.message-content {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.default-session {
  border: 1px solid var(--el-color-primary-light-5);
  background-color: var(--el-color-primary-light-9);
}

.default-session .conversation-title {
  color: var(--el-color-primary);
  font-weight: 600;
}

.default-session .message-preview {
  background-color: var(--el-color-primary-light-8);
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 8px;
}
</style> 