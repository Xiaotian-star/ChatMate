import axios from 'axios'
import { getSettings } from './settings'

// 获取 AI 回复
export async function getAIResponse(text: string): Promise<string> {
  try {
    // 获取设置
    const settings = await getSettings()
    const apiKey = settings.apiKey

    if (!apiKey) {
      throw new Error('请先设置 API Key')
    }

    // 发送请求到 DeepSeek API
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个高情商的AI助手，擅长提供简短、得体、自然的回复，像真人对话一样。每次回复不超过50字。'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.7,
        n: 1,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )

    // 返回 AI 回复
    return response.data.choices[0].message.content.trim()
  } catch (error) {
    console.error('获取 AI 回复失败:', error)
    throw error
  }
} 