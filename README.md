# ChatMate (对话助手)

一个基于 Electron + Vue3 + TypeScript 开发的智能对话助手，帮助你在各类社交平台和即时通讯工具中快速生成合适的回复内容。无论是微信、QQ、钉钉、企业微信还是其他社交平台，都能帮你轻松应对各种对话场景。

## 功能特点

- 🚀 快捷键呼出回复窗口
- 💬 智能生成多个回复选项
- 👥 支持自定义人设和提示词
- 🎨 现代化 UI 界面
- 🔄 自动检查更新
- 💾 本地保存会话历史
- 🌈 支持自定义系统提示词
- 🌐 支持所有主流社交平台
- 🔒 隐私安全，所有数据本地存储
- 🖥️ 支持自动启动
- ⚡ 支持自动生成回复

## 技术栈

- Electron
- Vue 3
- TypeScript
- Element Plus
- DeepSeek API
- electron-store
- electron-builder

## 开发环境要求

- Node.js >= 18
- npm >= 8

## 安装

```bash
# 克隆项目
git clone https://github.com/Xiaotian-star/ChatMate.git

# 进入项目目录
cd ChatMate

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
```

## 环境变量配置

在开始开发之前，你需要配置以下环境变量：

1. 复制 `.env.example` 文件并重命名为 `.env`
2. 在 `.env` 文件中填写以下配置：

```env
# GitHub API Token - 用于检查更新
GITHUB_TOKEN=your_github_token

# DeepSeek API Key - 用于 AI 对话
DEEPSEEK_API_KEY=your_deepseek_api_key

# 其他环境变量
NODE_ENV=development
```

注意：不要将包含敏感信息的 `.env` 文件提交到版本控制系统中。

## 开发

```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run typecheck

# 代码格式化
npm run format

# 代码检查
npm run lint
```

## 构建

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 配置说明

### 基础设置

- **DeepSeek API Key**: 用于调用 AI 接口生成回复
- **快捷键**: 默认为 F6，可自定义设置
- **自动启动**: 可设置开机自动启动
- **自动生成**: 可设置是否自动生成回复
- **系统提示词**: 可自定义全局系统提示词

### 预设人设

默认提供"智能助手"人设，你可以：
- 添加自定义人设
- 编辑人设名称和提示词
- 删除不需要的人设

## 使用说明

1. 设置 DeepSeek API Key
2. 选择需要回复的文本
3. 按下快捷键(默认 F6)呼出回复窗口
4. 选择合适的人设
5. 获取 AI 生成的多个回复选项
6. 点击复制想要使用的回复内容

### 自动生成模式

1. 在设置中开启自动生成
2. 设置自动生成快捷键（可选）
3. 选择文本后按下快捷键
4. 系统会自动生成回复并复制到剪贴板

## 项目结构

```
ChatMate/
├── src/
│   ├── main/           # Electron 主进程
│   ├── preload/        # 预加载脚本
│   ├── renderer/       # Vue 渲染进程
│   └── types/          # TypeScript 类型定义
├── resources/          # 资源文件
└── electron-builder.json5  # 构建配置
```

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证

[MIT License](LICENSE)

## 更新日志

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
