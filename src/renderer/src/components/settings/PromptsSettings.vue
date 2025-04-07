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