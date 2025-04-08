import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatMistralAI } from '@langchain/mistralai'
import { ChatOllama } from '@langchain/ollama'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import type { AIRequestParams, ModelResponse } from '../../types'

// 模型工厂类，用于创建不同类型的模型实例
class ModelFactory {
  // 创建模型实例
  static createModel(params: AIRequestParams): BaseChatModel {
    const { modelConfig } = params
    const { type, apiKey, baseUrl } = modelConfig

    switch (type) {
      case 'deepseek-chat':
        // 由于 Deepseek 暂时没有官方 LangChain 支持，我们继续使用 OpenAI 格式
        return new ChatOpenAI({
          openAIApiKey: apiKey,
          configuration: baseUrl ? {
            baseURL: baseUrl
          } : undefined,
          modelName: modelConfig.model || 'deepseek-chat',
          temperature: modelConfig.temperature || 0.7,
          maxTokens: modelConfig.max_tokens || 2000
        })

      case 'gpt-3.5-turbo':
      case 'gpt-4':
        return new ChatOpenAI({
          openAIApiKey: apiKey,
          configuration: baseUrl ? {
            baseURL: baseUrl
          } : undefined,
          modelName: modelConfig.model || type,
          temperature: modelConfig.temperature || 0.7,
          maxTokens: modelConfig.max_tokens || 2000
        })

      case 'azure-openai':
        if (!baseUrl) {
          throw new Error('Azure OpenAI 需要提供端点地址')
        }
        return new ChatOpenAI({
          openAIApiKey: apiKey,
          configuration: {
            baseURL: baseUrl,
            defaultHeaders: {
              'api-key': apiKey
            }
          },
          modelName: modelConfig.model || 'gpt-35-turbo',
          temperature: modelConfig.temperature || 0.7,
          maxTokens: modelConfig.max_tokens || 2000,
          azure: {
            apiVersion: modelConfig.apiVersion || '2023-12-01-preview',
            deploymentName: modelConfig.deploymentName || modelConfig.model || 'gpt-35-turbo'
          }
        })

      case 'claude':
        return new ChatAnthropic({
          anthropicApiKey: apiKey,
          modelName: modelConfig.model || 'claude-3-opus-20240229',
          temperature: modelConfig.temperature || 0.7,
          maxTokens: modelConfig.max_tokens || 2000
        })

      case 'gemini':
        return new ChatGoogleGenerativeAI({
          apiKey,
          model: modelConfig.model || 'gemini-pro',
          maxOutputTokens: modelConfig.max_tokens || 2000,
          temperature: modelConfig.temperature || 0.7
        })

      case 'mistral':
        return new ChatMistralAI({
          apiKey,
          modelName: modelConfig.model || 'mistral-large-latest',
          temperature: modelConfig.temperature || 0.7,
          maxTokens: modelConfig.max_tokens || 2000
        })

      case 'ollama':
        return new ChatOllama({
          baseUrl: baseUrl || 'http://localhost:11434',
          model: modelConfig.model || 'llama2',
          temperature: modelConfig.temperature || 0.7
        })

      default:
        throw new Error(`不支持的模型类型: ${type}`)
    }
  }
}

// 转换消息历史记录为 LangChain 格式
function convertMessageHistory(messageHistory: Array<{ role: string; content: string }> = []) {
  return messageHistory.map(msg => {
    switch (msg.role) {
      case 'system':
        return new SystemMessage(msg.content)
      case 'assistant':
        return new AIMessage(msg.content)
      case 'user':
      default:
        return new HumanMessage(msg.content)
    }
  })
}

// 获取单个 AI 回复
export async function getSingleResponse(params: AIRequestParams, index: number): Promise<ModelResponse> {
  const { modelId, text, messageHistory = [], modelConfig } = params

  try {
    // 创建模型实例
    const model = ModelFactory.createModel(params)

    // 构建系统提示词
    const systemPrompt = `${modelConfig.systemPrompt}\n请生成第 ${index + 1} 个独特的回复。`
    
    // 构建消息历史
    const messages = [
      new SystemMessage(systemPrompt),
      ...convertMessageHistory(messageHistory),
      new HumanMessage(text)
    ]

    // 调用模型获取回复
    const response = await model.invoke(messages)

    return {
      modelId,
      content: response.content.toString()
    }
  } catch (error) {
    console.error('AI 响应错误:', error)
    return {
      modelId,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
} 