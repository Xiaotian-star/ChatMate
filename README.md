# ChatMate (对话助手)

一个基于 Electron + Vue3 + TypeScript 开发的智能对话助手，帮助你在各类社交平台和即时通讯工具中快速生成合适的回复内容。无论是微信、QQ、钉钉、企业微信还是其他社交平台，都能帮你轻松应对各种对话场景。

## 功能特点

- 🚀 快捷键呼出回复窗口
- 💬 智能生成多个回复选项
- 👥 多种预设人设(职场精英、情感专家等)
- 🎨 现代化 UI 界面
- 🔄 自动检查更新
- 💾 本地保存会话历史
- 🌈 支持自定义提示词
- 🌐 支持所有主流社交平台
- 🔒 隐私安全，所有数据本地存储

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
git clone https://github.com/your-username/chatmate.git

# 进入项目目录
cd chatmate

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

### 预设人设

- 职场精英: 专业、得体的职场回复
- 情感专家: 富有同理心的情感建议
- 外交官: 圆润、委婉的处理方式
- 智者: 富有哲理的建议
- 知心朋友: 轻松、亲切的对话
- 幽默达人: 诙谐、机智的回应

## 使用说明

1. 设置 DeepSeek API Key
2. 选择需要回复的文本
3. 按下快捷键(默认 F6)呼出回复窗口
4. 选择合适的人设
5. 获取 AI 生成的多个回复选项
6. 点击复制想要使用的回复内容

## 项目结构

```
wechat-assistant/
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
