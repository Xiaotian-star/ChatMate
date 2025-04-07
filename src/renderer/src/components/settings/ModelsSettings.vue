<!-- 模型管理组件 -->
<template>
  <div class="models-settings">
    <div class="section-header">
      <h2>模型管理</h2>
      <el-button type="primary" @click="showAddModelDialog">
        <el-icon><Plus /></el-icon>
        添加模型
      </el-button>
    </div>

    <!-- 模型列表 -->
    <div class="models-list">
      <el-empty v-if="!modelsList.length" description="暂无模型配置" />
      <el-card v-else v-for="model in modelsList" :key="model.id" class="model-card">
        <template #header>
          <div class="model-header">
            <span class="model-name">{{ model.name }}</span>
            <div class="model-actions">
              <el-switch
                :model-value="model.isActive"
                @update:model-value="(val: boolean) => toggleModel(model, val)"
                :title="model.isActive ? '已启用' : '已禁用'"
              />
              <el-button-group>
                <el-button type="primary" @click="editModel(model)" link>
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button type="danger" @click="deleteModel(model)" link>
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-button-group>
            </div>
          </div>
        </template>
        <div class="model-info">
          <div class="info-item">
            <span class="label">模型类型:</span>
            <span class="value">{{ model.type }}</span>
          </div>
          <div class="info-item">
            <span class="label">API Key:</span>
            <span class="value">{{ maskApiKey(model.apiKey) }}</span>
          </div>
          <div class="info-item">
            <span class="label">Base URL:</span>
            <span class="value">{{ model.baseUrl || '默认' }}</span>
          </div>
          <div class="info-item">
            <span class="label">代理设置:</span>
            <span class="value">{{ model.proxy || '无' }}</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 添加/编辑模型对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑模型' : '添加模型'"
      width="500px"
    >
      <el-form
        ref="modelFormRef"
        :model="modelForm"
        :rules="modelRules"
        label-width="100px"
      >
        <el-form-item label="模型类型" prop="type">
          <el-select 
            v-model="modelForm.type" 
            placeholder="请选择模型类型" 
            style="width: 100%"
            @change="handleModelTypeChange"
          >
            <el-option label="Deepseek" value="deepseek-chat" />
            <el-option label="GPT-3.5" value="gpt-3.5-turbo" />
            <el-option label="GPT-4" value="gpt-4" />
            <el-option label="Claude" value="claude" />
          </el-select>
        </el-form-item>
        <el-form-item label="API Key" prop="apiKey">
          <el-input
            v-model="modelForm.apiKey"
            type="password"
            placeholder="请输入 API Key"
            show-password
          />
        </el-form-item>
        <el-form-item label="Base URL" prop="baseUrl">
          <el-input
            v-model="modelForm.baseUrl"
            placeholder="可选,用于自定义 API 地址"
          />
        </el-form-item>
        <el-form-item label="代理设置" prop="proxy">
          <el-input
            v-model="modelForm.proxy"
            placeholder="可选,示例: http://127.0.0.1:7890"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitModelForm">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { Model, StoredSettings } from '../../types/index'

const props = defineProps<{
  settings: StoredSettings
}>()

const emit = defineEmits(['update:settings'])

// 计算属性获取模型列表
const modelsList = computed<Model[]>(() => {
  // 如果没有任何模型配置，创建默认的 Deepseek 模型
  if (!props.settings.models || Object.keys(props.settings.models).length === 0) {
    const defaultModel: Model = {
      id: 'default',
      name: 'Deepseek Chat',
      type: 'deepseek-chat',
      apiKey: 'sk-b7d7735f91c64ebd9f8dd6b791ebcafb',
      baseUrl: 'https://api.deepseek.com/v1',
      proxy: '',
      isActive: true
    }
    
    // 更新设置
    emit('update:settings', {
      ...props.settings,
      models: {
        default: defaultModel
      }
    })
    
    return [defaultModel]
  }
  return Object.values(props.settings.models)
})

// 计算当前启用的模型数量
const activeModelsCount = computed(() => {
  return modelsList.value.filter(model => model.isActive).length
})

// 表单相关
const dialogVisible = ref(false)
const isEditing = ref(false)
const modelFormRef = ref<FormInstance>()
const modelForm = ref<Model>({
  id: '',
  name: '',
  type: 'deepseek-chat',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  proxy: '',
  isActive: true
})

// 模型类型到显示名称的映射
const MODEL_TYPE_NAMES: Record<string, string> = {
  'deepseek-chat': 'Deepseek',
  'gpt-3.5-turbo': 'GPT-3.5',
  'gpt-4': 'GPT-4',
  'claude': 'Claude'
}

// 表单验证规则
const modelRules: FormRules = {
  type: [
    { required: true, message: '请选择模型类型', trigger: 'change' }
  ],
  apiKey: [
    { required: true, message: '请输入 API Key', trigger: 'blur' }
  ]
}

// 处理模型类型变更
const handleModelTypeChange = (type: string) => {
  modelForm.value.name = MODEL_TYPE_NAMES[type] || type
}

// 显示添加模型对话框
const showAddModelDialog = () => {
  isEditing.value = false
  modelForm.value = {
    id: '',
    name: '',
    type: 'deepseek-chat',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    proxy: '',
    isActive: true
  }
  // 设置初始名称
  handleModelTypeChange(modelForm.value.type)
  dialogVisible.value = true
}

// 编辑模型
const editModel = (model: Model) => {
  isEditing.value = true
  modelForm.value = { ...model }
  dialogVisible.value = true
}

// 删除模型
const deleteModel = async (model: Model) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该模型吗？删除后无法恢复。',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const newModels = { ...props.settings.models }
    delete newModels[model.id]
    
    emit('update:settings', {
      ...props.settings,
      models: newModels
    })
    
    ElMessage.success('删除成功')
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除模型失败:', err)
      ElMessage.error('删除失败')
    }
  }
}

// 切换模型状态
const toggleModel = async (model: Model, newValue: boolean) => {
  // 如果要关闭模型,且当前只有一个模型启用,阻止操作
  if (!newValue && activeModelsCount.value <= 1) {
    ElMessage.warning('至少需要保持一个模型处于启用状态')
    return
  }
  
  const newModels = {
    ...props.settings.models,
    [model.id]: {
      ...model,
      isActive: newValue
    }
  }
  
  emit('update:settings', {
    ...props.settings,
    models: newModels
  })
}

// 提交表单
const submitModelForm = async () => {
  if (!modelFormRef.value) return
  
  await modelFormRef.value.validate(async (valid) => {
    if (valid) {
      const modelId = isEditing.value ? modelForm.value.id : Date.now().toString()
      const newModels = {
        ...props.settings.models,
        [modelId]: {
          ...modelForm.value,
          id: modelId
        }
      }
      
      emit('update:settings', {
        ...props.settings,
        models: newModels
      })
      
      dialogVisible.value = false
      ElMessage.success(isEditing.value ? '更新成功' : '添加成功')
    }
  })
}

// 工具函数：遮罩 API Key
const maskApiKey = (apiKey: string) => {
  if (!apiKey) return ''
  return apiKey.slice(0, 3) + '*'.repeat(apiKey.length - 6) + apiKey.slice(-3)
}
</script>

<style scoped>
.models-settings {
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.models-list {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.model-card {
  border-radius: 8px;
  transition: all 0.3s;
}

.model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.model-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  gap: 8px;
  font-size: 14px;
}

.info-item .label {
  color: var(--el-text-color-secondary);
  width: 80px;
  flex-shrink: 0;
}

.info-item .value {
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style> 