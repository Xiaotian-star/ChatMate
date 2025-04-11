<template>
  <div class="settings-section">
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
              @change="handlePromptChange"
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
          @change="handlePromptChange"
        />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Plus, Refresh, Delete } from '@element-plus/icons-vue'
import type { StoredSettings, Prompt } from '../../../../types'

const props = defineProps<{
  settings: StoredSettings
}>()

const emit = defineEmits(['update:settings'])

// 预设的人设模板
const defaultPrompts: Record<string, Prompt> = {
  '高情商男友': {
      title: '高情商男友',
      content: '你现在是一位高情商的男友，擅长处理各种情感矛盾和复杂关系。请用温暖、体贴且富有智慧的语言回复以下内容。注意要展现出你的同理心、幽默感和解决问题的能力，同时保持真诚和风度。在对话中要体现出你的成熟稳重，能够巧妙化解矛盾，规避女生的试探风险，并维护健康的情感关系。',
      isDefault: true
    }
}

// 添加新人设
const addNewPrompt = () => {
  const id = Date.now().toString()
  const newPrompts = {
    ...props.settings.prompts,
    [id]: {
      title: '新人设',
      content: '',
      isDefault: false
    }
  }
  emit('update:settings', { ...props.settings, prompts: newPrompts })
}

// 删除人设
const deletePrompt = (key: string) => {
  // 确保至少保留一个人设
  const promptCount = Object.keys(props.settings.prompts).length
  if (promptCount <= 1) {
    ElMessage.warning('至少需要保留一个人设')
    return
  }
  
  const newPrompts = { ...props.settings.prompts }
  delete newPrompts[key]
  emit('update:settings', { ...props.settings, prompts: newPrompts })
  ElMessage.success('删除成功')
}

// 重置提示词
const resetPrompts = () => {
  emit('update:settings', { ...props.settings, prompts: { ...defaultPrompts } })
  ElMessage.success('已恢复默认提示词')
}

// 处理人设变更
const handlePromptChange = () => {
  emit('update:settings', { ...props.settings })
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
</style> 