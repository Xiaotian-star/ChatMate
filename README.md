# ChatMate

一个基于 Electron + Vue3 + TypeScript 开发的智能对话助手，帮助你在各类社交平台和即时通讯工具中快速生成合适的回复内容。适用于所有主流社交平台和即时通讯工具，让你的沟通更加高效。

## 特性

- 🚀 快速响应：一键生成合适的回复内容
- 🎯 场景适配：针对不同的对话场景提供个性化回复
- 🎨 角色定制：支持自定义多个对话角色
- ⌨️ 快捷键支持：便捷的全局快捷键操作
- 🔄 会话管理：支持多会话切换和历史记录
- 🤖 多轮对话：支持上下文理解和连续对话
- 💾 历史记录：自动保存对话历史，随时回顾
- 🎈 轻量优雅：简洁的界面设计，流畅的使用体验
- 🔧 多模型支持：集成多个AI模型，灵活切换
- ⚙️ 高级设置：提供丰富的自定义配置选项

## 功能模块

### 对话功能
- 多模型并行对话
- 实时对话状态显示
- 快捷键触发对话
- 自动生成回复
- 会话历史管理

### 设置中心
- 模型配置
  - 支持多个AI模型
  - 自定义API参数
  - 模型开关控制
  - 自定义基础URL
  
- 通用设置
  - 快捷键配置
  - 自动启动
  - 界面主题
  - 语言设置

- 会话管理
  - 会话列表
  - 历史记录
  - 会话导入导出
  - 数据清理

- 提示词配置
  - 自定义角色设定
  - 系统提示词
  - 场景模板

- 高级设置
  - 代理配置
  - 调试模式
  - 性能优化
  - 日志管理

### 界面功能
- 简洁的弹窗界面
- 可拖拽窗口
- 会话切换动画
- 响应式布局
- 深色模式支持

## 开发

```bash
# 克隆项目
git clone https://github.com/Xiaotian-star/ChatMate.git

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建应用
npm run build
```

### 开发指南

#### 会话管理
ChatMate 支持完整的会话管理功能：
- 创建多个独立会话
- 自动保存对话历史
- 会话切换和删除
- 会话数据持久化存储
- 会话导入导出

#### 多轮对话
系统支持智能的多轮对话功能：
- 自动维护对话上下文
- 支持多个 AI 模型
- 支持自定义系统提示词
- 灵活的对话角色切换
- 并行对话处理

#### API 集成
支持多种 AI 模型的接入：
- DeepSeek Chat
- GPT-3.5/4
- Claude
- 支持自定义 API 配置
- 支持代理设置

## 许可证

[MIT](LICENSE)

## 更新日志

### v1.2.0
- 新增多轮对话支持
- 优化会话管理功能
- 支持多个 AI 模型集成
- 改进对话历史存储机制
- 优化用户界面交互
- 新增高级设置选项
- 新增深色模式支持
- 新增会话导入导出
- 新增代理配置功能
- 修复已知问题

### v1.1.0
- 新增自动启动功能
- 新增自动生成回复功能
- 优化人设管理，支持自定义人设
- 新增系统提示词配置
- 优化窗口管理和用户界面
- 修复已知问题

### v1.0.0
- 初始版本发布
- 支持快捷键呼出
- 多种预设人设
- 本地保存对话历史
- 自动检查更新功能

## 使用场景

- 💼 职场沟通：生成专业得体的工作回复
- 👨‍👩‍👧‍👦 亲友聊天：温暖贴心的日常对话
- 🤝 商务洽谈：圆润有礼的商务用语
- 💕 情感交流：富有同理心的情感回应
- 🎯 社群运营：活跃有趣的互动话题
- 📝 客户服务：专业规范的服务用语

## 技术文档

### 类型定义

```typescript
// 消息类型
interface Message {
  role: 'user' | 'assistant'
  content: string
}

// 会话类型
interface Conversation {
  id: string
  title: string
  messages: Message[]
  lastUpdated: number
}

// AI 请求参数
interface AIRequestParams {
  text: string
  persona: string
  modelId: string
  messageHistory?: Message[]  // 支持多轮对话的消息历史
  modelConfig: {
    type: string
    apiKey: string
    baseUrl?: string
    // ... 其他配置项
  }
}
```

### API 示例

```typescript
// 创建新会话
const session = {
  id: Date.now().toString(36),
  title: '新会话',
  messages: [],
  lastUpdated: Date.now()
}

// 发送带历史记录的请求
const response = await getAIResponse({
  text: '用户输入',
  persona: '智能助手',
  modelId: 'deepseek-chat',
  messageHistory: session.messages,
  modelConfig: {
    type: 'deepseek-chat',
    apiKey: 'your-api-key',
    baseUrl: 'https://api.deepseek.com'
  }
})
```
