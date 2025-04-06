import axios from 'axios'
import { getSettings } from './settings'
import * as dotenv from 'dotenv'
import type { AIRequestParams } from '../types'

// 加载环境变量
dotenv.config()

// 获取单个 AI 回复
async function getSingleResponse(apiKey: string, systemPrompt: string, userText: string): Promise<string> {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userText
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

  if (!response.data || !response.data.choices || !response.data.choices[0]) {
    throw new Error('API 响应格式错误')
  }

  const choice = response.data.choices[0]
  if (typeof choice === 'string') {
    return choice.trim()
  } else if (choice.message && choice.message.content) {
    return choice.message.content.trim()
  } else {
    throw new Error('无效的回复格式')
  }
}

// 获取 AI 回复
export async function getAIResponse(params: AIRequestParams): Promise<string[]> {
  try {
    // 获取设置
    const settings = await getSettings()
    const apiKey = settings.apiKey || process.env.DEEPSEEK_API_KEY

    if (!apiKey) {
      throw new Error('请先设置 API Key')
    }

    // 获取人设提示词
    const persona = params.persona
    const systemPrompt = persona && settings.prompts[persona]
      ? settings.prompts[persona]
      : '你是一个高情商的AI助手，擅长提供简短、得体、自然的回复，像真人对话一样。每次回复不超过50字。'

    // 获取3个不同的回复
    const responses: string[] = []
    const numResponses = 3
    const promises = []

    for (let i = 0; i < numResponses; i++) {
      // 为每个请求添加一些随机性，以获得不同的回复
      const modifiedPrompt = `${systemPrompt}\n请生成第 ${i + 1} 个独特的回复。`
      promises.push(getSingleResponse(apiKey, modifiedPrompt, params.text))
    }

    // 并行请求以提高速度
    const results = await Promise.all(promises)
    responses.push(...results)

    // 过滤掉空回复
    const validResponses = responses.filter(reply => reply)

    if (validResponses.length === 0) {
      throw new Error('未能生成有效回复')
    }

    return validResponses
  } catch (error) {
    console.error('获取 AI 回复失败:', error)
    if (axios.isAxiosError(error) && error.response) {
      console.error('API 错误详情:', error.response.data)
      throw new Error(`API 请求失败: ${error.response.data.error?.message || error.message}`)
    }
    throw error
  }
} 