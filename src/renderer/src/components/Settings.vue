<template>
  <div class="settings-container">
    <!-- 标题栏 -->
    <TitleBar />

    <div class="main-content">
      <!-- 侧边栏 -->
      <Sidebar
        :active-menu="activeMenu"
        @menu-select="handleMenuSelect"
      />

      <!-- 主要内容区域 -->
      <div class="content">
        <el-form :model="settings" label-position="top" class="settings-form">
          <!-- 基础设置 -->
          <GeneralSettings
            v-if="activeMenu === 'general'"
            v-model:settings="settings"
            @save-settings="saveSettings"
          />

          <!-- 预设人设 -->
          <PromptsSettings
            v-if="activeMenu === 'prompts'"
            v-model:settings="settings"
          />

          <!-- 高级设置 -->
          <AdvancedSettings
            v-if="activeMenu === 'advanced'"
            v-model:settings="settings"
          />

          <!-- 关于 -->
          <AboutSection
            v-if="activeMenu === 'about'"
          />

          <!-- 保存按钮 -->
          <div class="settings-footer" v-if="activeMenu !== 'about'">
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
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import type { StoredSettings, Prompt, Conversation, Message } from '../../../types'

// 导入子组件
import TitleBar from './settings/TitleBar.vue'
import Sidebar from './settings/Sidebar.vue'
import GeneralSettings from './settings/GeneralSettings.vue'
import PromptsSettings from './settings/PromptsSettings.vue'
import AdvancedSettings from './settings/AdvancedSettings.vue'
import AboutSection from './settings/AboutSection.vue'

// 默认快捷键
const DEFAULT_SHORTCUT = 'F6'
const DEFAULT_API_KEY = 'sk-b7d7735f91c64ebd9f8dd6b791ebcafb'

// 设置数据
const settings = ref<StoredSettings>({
  apiKey: '',
  prompts: {},
  shortcut: '',
  conversations: [],
  autoGenerate: false,
  systemPrompt: '',
  autoLaunch: false
})

// 当前激活的菜单项
const activeMenu = ref('general')

// 处理菜单选择
const handleMenuSelect = (index: string) => {
  activeMenu.value = index
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
        prompts: {},
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
      prompts: {},
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
    // 创建一个新的对象，只包含需要保存的基本数据
    const settingsToSave = {
      apiKey: settings.value.apiKey || '',
      shortcut: settings.value.shortcut || '',
      autoGenerate: !!settings.value.autoGenerate,
      systemPrompt: settings.value.systemPrompt || '',
      autoLaunch: !!settings.value.autoLaunch,
      // 确保 prompts 只包含必要的字段
      prompts: Object.entries(settings.value.prompts || {}).reduce((acc, [key, prompt]) => {
        acc[key] = {
          title: String((prompt as Prompt).title || ''),
          content: String((prompt as Prompt).content || ''),
          isDefault: !!(prompt as Prompt).isDefault
        }
        return acc
      }, {} as Record<string, Prompt>),
      // 确保 conversations 是一个简单的数组，只包含基本数据
      conversations: (settings.value.conversations || []).map((conv: Conversation) => ({
        id: String(conv.id || ''),
        title: String(conv.title || ''),
        messages: (conv.messages || []).map((msg: Message) => ({
          role: String(msg.role || ''),
          content: String(msg.content || '')
        })),
        lastUpdated: Number(conv.lastUpdated || Date.now())
      }))
    }

    // 先尝试序列化，确保数据可以被正确转换
    const serializedData = JSON.stringify(settingsToSave)
    const parsedData = JSON.parse(serializedData)

    console.log('正在保存设置:', serializedData)
    const success = await window.electronAPI.saveSettings(parsedData)
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

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
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