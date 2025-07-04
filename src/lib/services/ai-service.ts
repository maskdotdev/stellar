import { invoke } from "@tauri-apps/api/core"
import type { AIProvider, AIModel, ChatMessage } from "@/lib/stores/ai-store"

export interface ChatCompletionRequest {
  messages: ChatMessage[]
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stream?: boolean
}

export interface ChatCompletionResponse {
  id: string
  choices: Array<{
    message: {
      role: "assistant"
      content: string
    }
    finishReason: string
  }>
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface ChatCompletionStreamChunk {
  id: string
  choices: Array<{
    delta: {
      role?: "assistant"
      content?: string
    }
    finishReason?: string
  }>
}

export class AIService {
  private static instance: AIService
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }
  
  /**
   * Send a chat completion request to the specified provider
   */
  async chatCompletion(
    provider: AIProvider,
    model: AIModel,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await invoke<ChatCompletionResponse>("ai_chat_completion", {
        provider: {
          id: provider.id,
          type: provider.type,
          baseUrl: provider.baseUrl,
          apiKey: await this.getSecureApiKey(provider.id)
        },
        model: model.id,
        request
      })
      
      return response
    } catch (error) {
      console.error("AI chat completion failed:", error)
      throw new Error(`AI service error: ${error}`)
    }
  }
  
  /**
   * Send a streaming chat completion request
   */
  async chatCompletionStream(
    provider: AIProvider,
    model: AIModel,
    request: ChatCompletionRequest,
    onChunk: (chunk: ChatCompletionStreamChunk) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      // Use Tauri's event system for streaming
      const eventName = `ai_stream_${crypto.randomUUID()}`
      
      await invoke<() => void>("ai_chat_completion_stream", {
        provider: {
          id: provider.id,
          type: provider.type,
          baseUrl: provider.baseUrl,
          apiKey: await this.getSecureApiKey(provider.id)
        },
        model: model.id,
        request: { ...request, stream: true },
        eventName
      })
      
      // Listen for streaming events
      const { listen } = await import("@tauri-apps/api/event")
      
      const unlistenStream = await listen<ChatCompletionStreamChunk>(
        eventName,
        (event) => {
          const chunk = event.payload
          if (chunk.choices[0]?.finishReason) {
            onComplete()
            unlistenStream()
          } else {
            onChunk(chunk)
          }
        }
      )
      
      // Listen for errors
      const unlistenError = await listen<string>(
        `${eventName}_error`,
        (event) => {
          onError(new Error(event.payload))
          unlistenError()
          unlistenStream()
        }
      )
      
    } catch (error) {
      console.error("AI streaming failed:", error)
      onError(new Error(`AI streaming error: ${error}`))
    }
  }
  
  /**
   * Test connection to a provider
   */
  async testConnection(provider: AIProvider): Promise<boolean> {
    try {
      await invoke<boolean>("ai_test_connection", {
        provider: {
          id: provider.id,
          type: provider.type,
          baseUrl: provider.baseUrl,
          apiKey: await this.getSecureApiKey(provider.id)
        }
      })
      return true
    } catch (error) {
      console.error("Connection test failed:", error)
      return false
    }
  }
  
  /**
   * Get available models from a provider
   */
  async getModels(provider: AIProvider): Promise<AIModel[]> {
    try {
      const models = await invoke<AIModel[]>("ai_get_models", {
        provider: {
          id: provider.id,
          type: provider.type,
          baseUrl: provider.baseUrl,
          apiKey: await this.getSecureApiKey(provider.id)
        }
      })
      return models
    } catch (error) {
      console.error("Failed to fetch models:", error)
      throw new Error(`Failed to fetch models: ${error}`)
    }
  }
  
  /**
   * Securely store API key
   */
  async storeApiKey(providerId: string, apiKey: string): Promise<void> {
    try {
      await invoke("store_api_key", { providerId, apiKey })
    } catch (error) {
      console.error("Failed to store API key:", error)
      throw new Error(`Failed to store API key: ${error}`)
    }
  }
  
  /**
   * Get securely stored API key
   */
  private async getSecureApiKey(providerId: string): Promise<string | undefined> {
    try {
      return await invoke<string>("get_api_key", { providerId })
    } catch (error) {
      console.error("Failed to get API key:", error)
      return undefined
    }
  }

  /**
   * Get API key for display purposes (public method)
   */
  async getApiKey(providerId: string): Promise<string | undefined> {
    return this.getSecureApiKey(providerId)
  }
  
  /**
   * Delete stored API key
   */
  async deleteApiKey(providerId: string): Promise<void> {
    try {
      await invoke("delete_api_key", { providerId })
    } catch (error) {
      console.error("Failed to delete API key:", error)
      throw new Error(`Failed to delete API key: ${error}`)
    }
  }
}

export const aiService = AIService.getInstance() 