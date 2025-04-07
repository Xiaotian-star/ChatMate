import axios from 'axios'
import { getSettings } from './settings'
import * as dotenv from 'dotenv'
import type { AIRequestParams } from '../types'

// 加载环境变量
dotenv.config()

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ModelResponse {
  modelId: string
  content?: string
  error?: string
}

// 获取单个 AI 回复
async function getSingleResponse(params: AIRequestParams, index: number): Promise<ModelResponse> {
  const { modelConfig, modelId, messageHistory = [] } = params
  const { type, apiKey, baseUrl, model } = modelConfig

  try {
    // 根据不同模型类型构建请求
    let requestData: any
    let requestUrl: string
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }

    // 构建系统提示词
    const systemPrompt = `${modelConfig.systemPrompt}\n请生成第 ${index + 1} 个独特的回复。`
    console.log(systemPrompt);
    
    // 构建完整的消息历史
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...messageHistory,
      { role: 'user', content: params.text }
    ]

    switch (type) {
      case 'deepseek-chat':
        requestUrl = `${baseUrl}/chat/completions`
        requestData = {
          model: model || 'deepseek-chat',
          messages,
          temperature: modelConfig.temperature || 0.7,
          max_tokens: modelConfig.max_tokens || 2000,
          n: 1,
          stream: false
        }
        break

      case 'gpt-3.5-turbo':
      case 'gpt-4':
        requestUrl = `${baseUrl}/chat/completions`
        requestData = {
          model: model || type,
          messages,
          temperature: modelConfig.temperature || 0.7,
          max_tokens: modelConfig.max_tokens || 2000,
          n: 1,
          stream: false
        }
        break

      case 'claude':
        requestUrl = `${baseUrl}/messages`
        requestData = {
          model: model || 'claude-3-opus-20240229',
          messages,
          temperature: modelConfig.temperature || 0.7,
          max_tokens: modelConfig.max_tokens || 2000
        }
        headers['anthropic-version'] = '2023-06-01'
        break

      default:
        return {
          modelId,
          error: `不支持的模型类型: ${type}`
        }
    }

    // 发送请求
    const response = await axios.post(requestUrl, requestData, { headers })

    // 解析不同模型的响应
    let content = ''
    switch (type) {
      case 'deepseek-chat':
      case 'gpt-3.5-turbo':
      case 'gpt-4':
        if (response.data?.choices?.[0]?.message?.content) {
          content = response.data.choices[0].message.content
        }
        break

      case 'claude':
        if (response.data?.content?.[0]?.text) {
          content = response.data.content[0].text
        }
        break
    }

    if (!content) {
      return {
        modelId,
        error: 'API 响应格式错误'
      }
    }

    return {
      modelId,
      content: content.trim()
    }
  } catch (error) {
    console.error(`模型 ${modelId} 请求失败:`, error)
    let errorMessage = '请求失败'
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        errorMessage = 'API Key 无效'
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message
      } else if (error.message) {
        errorMessage = error.message
      }
    }

    return {
      modelId,
      error: errorMessage
    }
  }
}

// 获取 AI 回复
export async function getAIResponse(params: AIRequestParams): Promise<ModelResponse[]> {
  try {
    if (!params.modelConfig.apiKey) {
      return [{
        modelId: params.modelId,
        error: '请先设置 API Key'
      }]
    }

    // 获取3个不同的回复
    const numResponses = 3
    const promises: Promise<ModelResponse>[] = []

    for (let i = 0; i < numResponses; i++) {
      promises.push(getSingleResponse(params, i))
    }

    // 并行请求以提高速度
    const results = await Promise.all(promises)

    // 过滤并处理结果
    const validResults = results.filter(result => result.content)
    
    if (validResults.length === 0) {
      // 如果所有请求都失败，返回第一个错误
      return [results[0]]
    }

    return validResults
  } catch (error) {
    console.error('获取 AI 回复失败:', error)
    return [{
      modelId: params.modelId,
      error: '获取回复失败'
    }]
  }
} 