<!-- 单个模型的回复组件 -->
<template>
  <div class="model-reply">
    <div class="model-header" @click="toggleCollapse">
      <div class="model-info">
        <span class="model-name">{{ model.name }}</span>
        <!-- <span class="model-type">{{ model.type }}</span> -->
      </div>
      <div class="header-right">
        <div v-if="loading" class="loading-indicator">
          <div class="loading-spinner"></div>
          <span>{{ loadingText }}</span>
        </div>
        <div v-else-if="error" class="error-badge">
          {{ error }}
        </div>
        <div class="collapse-icon" :class="{ collapsed: isCollapsed }">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </div>
      </div>
    </div>

    <div 
      v-show="!isCollapsed" 
      class="replies-list"
      :class="{ 'has-replies': replies.length > 0 }"
    >
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
        <div class="reply-text">{{ reply }}</div>
        <div class="copy-tip">{{ copiedIndex === index ? '已复制!' : '点击复制' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Model, ModelResponse } from '../../../../types'

// 组件属性
const props = defineProps<{
  model: Model
  text: string
  persona: string
}>()

// 添加事件发射器
const emit = defineEmits(['select-reply'])

// 组件状态
const loading = ref(false)
const error = ref('')
const replies = ref<string[]>([])
const copiedIndex = ref(-1)
const selectedIndex = ref(-1)
const loadingText = ref('生成回复中...')
const isCollapsed = ref(false)

// 切换折叠状态
function toggleCollapse() {
  if (!loading.value) {
    isCollapsed.value = !isCollapsed.value
  }
}

// 获取回复
async function getReply() {
  if (!props.text.trim()) return
  
  // 展开折叠状态
  isCollapsed.value = false
  
  loading.value = true
  error.value = ''
  replies.value = []
  copiedIndex.value = -1
  
  try {
    const modelSpecificConfig = getModelSpecificConfig(props.model.type)
    // 获取全局设置
    const globalSettings = await window.electronAPI.getSettings()
    const systemPrompt = globalSettings?.systemPrompt || ''
    
    const requestParams = {
      text: props.text,
      persona: props.persona,
      modelId: props.model.id,
      modelConfig: {
        type: props.model.type,
        apiKey: props.model.apiKey,
        baseUrl: props.model.baseUrl || getDefaultBaseUrl(props.model.type),
        proxy: props.model.proxy,
        ...modelSpecificConfig,
        // 组合系统提示词: 全局系统提示词 + 模型特定提示词 + 人设提示词
        systemPrompt: [
          systemPrompt,
          // modelSpecificConfig.systemPrompt,
          props.persona
        ].filter(Boolean).join('\n\n')
      }
    }
    
    const responses: ModelResponse[] = await window.electronAPI.getAIResponse(requestParams)
    
    // 检查是否有错误响应
    const errorResponse = responses.find(response => response.error)
    if (errorResponse) {
      error.value = errorResponse.error || '获取回复失败'
      return
    }

    // 提取有效的回复内容
    const validContents = responses
      .filter(response => response.content)
      .map(response => response.content!)
    
    if (validContents.length > 0) {
      replies.value = validContents
    } else {
      error.value = '未能生成有效回复'
    }
  } catch (err) {
    console.error('获取回复失败:', err)
    error.value = err instanceof Error ? err.message : '获取回复失败'
  } finally {
    loading.value = false
  }
}

// 获取模型默认的 Base URL
function getDefaultBaseUrl(modelType: string): string {
  switch (modelType) {
    case 'deepseek-chat':
      return 'https://api.deepseek.com/v1'
    case 'gpt-3.5-turbo':
    case 'gpt-4':
      return 'https://api.openai.com/v1'
    case 'claude':
      return 'https://api.anthropic.com/v1'
    default:
      return ''
  }
}

// 获取模型特定的配置
function getModelSpecificConfig(modelType: string): Record<string, any> {
  switch (modelType) {
    case 'deepseek-chat':
      return {
        model: 'deepseek-chat',
        temperature: 0.7,
        max_tokens: 2000,
        systemPrompt: '你是 Deepseek AI助手，一个由 Deepseek 开发的AI模型。'
      }
    case 'gpt-3.5-turbo':
      return {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 2000,
        systemPrompt: '你是 ChatGPT，一个由 OpenAI 开发的 GPT-3.5 Turbo 模型。请以 ChatGPT 的身份回答问题。'
      }
    case 'gpt-4':
      return {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2000,
        systemPrompt: '你是 GPT-4，一个由 OpenAI 开发的最新一代 AI 模型。请以 GPT-4 的身份回答问题。'
      }
    case 'claude':
      return {
        model: 'claude-3-opus-20240229',
        temperature: 0.7,
        max_tokens: 2000,
        systemPrompt: '你是 Claude，一个由 Anthropic 开发的 AI 助手。请以 Claude 的身份回答问题。'
      }
    default:
      return {}
  }
}

// 选择回复并复制到剪贴板
async function selectReply(reply: string, index: number) {
  selectedIndex.value = index
  // 发射选择回复事件
  emit('select-reply', reply, index, props.model.id)
  
  navigator.clipboard.writeText(reply).then(() => {
    copiedIndex.value = index
    setTimeout(() => {
      copiedIndex.value = -1
    }, 2000)
  })
}

// 暴露方法给父组件
defineExpose({
  getReply
})
</script>

<style scoped>
.model-reply {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.model-header:hover {
  background: #f0f0f0;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-name {
  font-weight: 500;
  color: #1890ff;
}

.model-type {
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 12px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-badge {
  color: #ff4d4f;
  font-size: 12px;
  background: #fff2f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.collapse-icon {
  color: #999;
  transition: transform 0.3s;
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}

.replies-list {
  padding: 16px;
  transition: max-height 0.3s ease-out, padding 0.3s ease-out;
  overflow: hidden;
}

.replies-list:not(.has-replies) {
  padding: 0;
}

.reply-item {
  position: relative;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
  border: 1px solid transparent;
}

.reply-item:last-child {
  margin-bottom: 0;
}

.reply-item:hover {
  background: #e6f7ff;
  border-color: #1890ff;
}

.reply-item.selected {
  background: #e6f7ff;
  border-color: #1890ff;
}

.reply-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  word-break: break-all;
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 