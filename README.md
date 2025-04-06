# WeChat Assistant (微信助手)

一个基于 Electron + Vue3 + TypeScript 开发的智能回复助手，帮助你快速生成合适的回复内容。

## 功能特点

- 🚀 快捷键呼出回复窗口
- 💬 智能生成多个回复选项
- 👥 多种预设人设(职场精英、情感专家等)
- 🎨 现代化 UI 界面
- 🔄 自动检查更新
- 💾 本地保存会话历史
- 🌈 支持自定义提示词

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
git clone https://github.com/your-username/wechat-assistant.git

# 进入项目目录
cd wechat-assistant

# 安装依赖
npm install
```

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
