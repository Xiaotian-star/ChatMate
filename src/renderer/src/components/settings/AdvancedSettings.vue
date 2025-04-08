<template>
  <div class="settings-section">
    <h2 class="section-title">高级设置</h2>
    <el-form-item label="自动生成">
      <el-switch
        v-model="settings.autoGenerate"
        active-text="开启"
        inactive-text="关闭"
        @change="handleChange"
      />
      <!-- <div class="setting-tip">
        开启后，选中文本时会自动生成回复
      </div> -->
    </el-form-item>

    <el-form-item label="系统提示词">
      <el-input
        v-model="settings.systemPrompt"
        type="textarea"
        :rows="4"
        placeholder="输入系统提示词，用于控制AI的整体行为"
        @change="handleChange"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import type { StoredSettings } from '../../../../types'

const props = defineProps<{
  settings: StoredSettings
}>()

const emit = defineEmits(['update:settings'])

// 处理设置变更
const handleChange = () => {
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

.section-title {
  font-size: 20px;
  color: var(--el-text-color-primary);
  margin: 0 0 24px;
  font-weight: 600;
}

.setting-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
</style> 