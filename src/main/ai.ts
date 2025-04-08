import * as dotenv from 'dotenv'
import type { AIRequestParams, ModelResponse } from '../types'
import { getSingleResponse } from './ai/langchain-manager'

// 加载环境变量
dotenv.config()

// 获取 AI 响应
export async function getAIResponse(params: AIRequestParams): Promise<ModelResponse[]> {
  const responses: ModelResponse[] = []
  
  try {
    // 获取单个模型的响应
    const response = await getSingleResponse(params, 0)
    responses.push(response)
    
    return responses
  } catch (error) {
    console.error('获取 AI 响应失败:', error)
    return [{
      modelId: params.modelId,
      error: error instanceof Error ? error.message : '获取响应失败'
    }]
  }
} 