import { AIProvider, AIModel } from "./ai-store"
import { invoke } from "@tauri-apps/api/core"

// Types from models.dev API
interface ModelsDevModel {
  id: string
  name: string
  attachment?: boolean
  reasoning?: boolean
  tool_call?: boolean
  temperature?: boolean
  knowledge?: string
  release_date?: string
  last_updated?: string
  cost?: {
    input?: number
    output?: number
    cache_read?: number
    cache_write?: number
  }
  limit?: {
    context?: number
    output?: number
  }
  modalities?: {
    input?: string[]
    output?: string[]
  }
  open_weights?: boolean
}

interface ModelsDevProvider {
  id: string
  name: string
  models: Record<string, ModelsDevModel>
}

interface ModelsDevResponse {
  providers: Record<string, ModelsDevProvider>
}

// Enhanced types for model comparison and analysis
export interface ModelComparison {
  model: AIModel
  provider: string
  score: number
  strengths: string[]
  weaknesses: string[]
}

export interface ModelRecommendation {
  task: string
  recommended: AIModel[]
  reasoning: string
}

export class ModelsService {
  private static readonly MODELS_DEV_API = "https://models.dev/api.json"
  private static cachedData: ModelsDevResponse | null = null
  private static lastFetch: number = 0
  private static readonly CACHE_DURATION = 1000 * 60 * 60 // 1 hour

  static async fetchModelsData(): Promise<ModelsDevResponse> {
    const now = Date.now()
    
    // Return cached data if still valid
    if (this.cachedData && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cachedData
    }

    try {
      console.log("Fetching models.dev data via Tauri backend...")
      const rawData = await invoke<any>("fetch_models_dev_data")
      console.log("Raw response from Tauri:", rawData)
      console.log("Response type:", typeof rawData)
      console.log("Response keys:", Object.keys(rawData))
      
      // For now, assume the data structure and adapt
      const data: ModelsDevResponse = rawData as ModelsDevResponse
      this.cachedData = data
      this.lastFetch = now
      
      if (data.providers) {
        console.log("Successfully fetched models.dev data:", Object.keys(data.providers).length, "providers")
      } else {
        console.log("No providers field found in response")
      }
      
      return data
    } catch (error) {
      console.error("Failed to fetch models from models.dev:", error)
      // Return fallback data if available
      if (this.cachedData) {
        return this.cachedData
      }
      throw error
    }
  }

  static transformToAIProviders(modelsData: ModelsDevResponse): AIProvider[] {
    const providers: AIProvider[] = []

    for (const [providerId, providerData] of Object.entries(modelsData.providers)) {
      const models: AIModel[] = []

      for (const [modelId, modelData] of Object.entries(providerData.models)) {
        const capabilities = this.extractCapabilities(modelData)
        
        models.push({
          id: modelId,
          name: modelData.name,
          providerId,
          contextWindow: modelData.limit?.context || 4096,
          maxTokens: modelData.limit?.output || 2048,
          supportsStreaming: true, // Most modern models support streaming
          supportsTools: modelData.tool_call || false,
          capabilities,
          costPer1kTokens: modelData.cost ? {
            input: (modelData.cost.input || 0) / 1000, // Convert from per-million to per-1k
            output: (modelData.cost.output || 0) / 1000
          } : undefined
        })
      }

      if (models.length > 0) {
        providers.push({
          id: providerId,
          name: providerData.name,
          type: this.getProviderType(providerId),
          baseUrl: this.getProviderBaseUrl(providerId),
          enabled: false, // User needs to explicitly enable and add API keys
          models
        })
      }
    }

    return providers
  }

  private static extractCapabilities(model: ModelsDevModel): ("text" | "vision" | "code" | "reasoning")[] {
    const capabilities: ("text" | "vision" | "code" | "reasoning")[] = ["text"] // All models support text
    
    // Check for vision capabilities
    if (model.modalities?.input?.includes("image") || 
        model.modalities?.input?.includes("video") ||
        model.name.toLowerCase().includes("vision")) {
      capabilities.push("vision")
    }
    
    // Check for reasoning capabilities
    if (model.reasoning || 
        model.name.toLowerCase().includes("reasoning") ||
        model.name.toLowerCase().includes("o1") ||
        model.name.toLowerCase().includes("o3") ||
        model.name.toLowerCase().includes("thinking") ||
        model.name.toLowerCase().includes("qwq")) {
      capabilities.push("reasoning")
    }
    
    // Enhanced code capabilities detection
    const modelName = model.name.toLowerCase()
    const modelId = model.id.toLowerCase()
    if (modelName.includes("code") || modelName.includes("coder") || 
        modelName.includes("codestral") || modelName.includes("deepseek") ||
        modelName.includes("devstral") || modelId.includes("code") ||
        modelName.includes("starcoder") || modelName.includes("codellama")) {
      capabilities.push("code")
    }
    
    return capabilities
  }

  private static getProviderType(providerId: string): AIProvider["type"] {
    switch (providerId.toLowerCase()) {
      case "openai":
      case "azure":
        return "openai"
      case "anthropic":
        return "anthropic"
      default:
        return "custom"
    }
  }

  private static getProviderBaseUrl(providerId: string): string {
    switch (providerId.toLowerCase()) {
      case "openai":
        return "https://api.openai.com/v1"
      case "anthropic":
        return "https://api.anthropic.com/v1"
      case "google":
        return "https://generativelanguage.googleapis.com/v1"
      case "mistral":
        return "https://api.mistral.ai/v1"
      case "cohere":
        return "https://api.cohere.ai/v1"
      case "deepseek":
        return "https://api.deepseek.com/v1"
      case "xai":
        return "https://api.x.ai/v1"
      case "groq":
        return "https://api.groq.com/openai/v1"
      case "openrouter":
        return "https://openrouter.ai/api/v1"
      case "azure":
        return "https://{resource}.openai.azure.com"
      default:
        return ""
    }
  }

  static async getPopularProviders(): Promise<AIProvider[]> {
    try {
      const modelsData = await this.fetchModelsData()
      const allProviders = this.transformToAIProviders(modelsData)
      
      // Enhanced popularity ranking based on model count, capabilities, and market presence
      const popularProviderIds = [
        "openai", "anthropic", "google", "deepseek", "mistral", "xai", 
        "meta", "groq", "cohere", "openrouter", "azure", "amazon-bedrock"
      ]
      
      return allProviders
        .filter(provider => popularProviderIds.includes(provider.id.toLowerCase()))
        .sort((a, b) => {
          const aIndex = popularProviderIds.indexOf(a.id.toLowerCase())
          const bIndex = popularProviderIds.indexOf(b.id.toLowerCase())
          return aIndex - bIndex
        })
    } catch (error) {
      console.error("Failed to fetch popular providers:", error)
      return []
    }
  }

  static async searchModels(query: string): Promise<AIModel[]> {
    try {
      const modelsData = await this.fetchModelsData()
      const allProviders = this.transformToAIProviders(modelsData)
      const allModels = allProviders.flatMap(provider => provider.models)
      
      const lowerQuery = query.toLowerCase()
      return allModels.filter(model => 
        model.name.toLowerCase().includes(lowerQuery) ||
        model.id.toLowerCase().includes(lowerQuery) ||
        model.capabilities.some(cap => cap.includes(lowerQuery)) ||
        model.providerId.toLowerCase().includes(lowerQuery)
      )
    } catch (error) {
      console.error("Failed to search models:", error)
      return []
    }
  }

  static filterModelsByCapability(models: AIModel[], capability: string): AIModel[] {
    return models.filter(model => 
      model.capabilities.includes(capability as any)
    )
  }

  static sortModelsByContextWindow(models: AIModel[]): AIModel[] {
    return [...models].sort((a, b) => b.contextWindow - a.contextWindow)
  }

  static sortModelsByCost(models: AIModel[]): AIModel[] {
    return [...models].sort((a, b) => {
      const aCost = a.costPer1kTokens?.input || 0
      const bCost = b.costPer1kTokens?.input || 0
      return aCost - bCost
    })
  }

  // 🔥 NEW: Advanced model comparison and recommendation features
  static compareModels(models: AIModel[], criteria: {
    prioritizeCost?: boolean
    prioritizeContext?: boolean
    prioritizeCapabilities?: string[]
    maxCostPer1k?: number
    minContextWindow?: number
  }): ModelComparison[] {
    return models.map(model => {
      let score = 0
      const strengths: string[] = []
      const weaknesses: string[] = []

      // Cost scoring
      if (criteria.prioritizeCost && model.costPer1kTokens) {
        const inputCost = model.costPer1kTokens.input
        if (inputCost < 0.001) {
          score += 30
          strengths.push("Very low cost")
        } else if (inputCost < 0.01) {
          score += 20
          strengths.push("Low cost")
        } else if (inputCost > 0.1) {
          score -= 10
          weaknesses.push("High cost")
        }
      }

      // Context window scoring
      if (criteria.prioritizeContext) {
        if (model.contextWindow >= 200000) {
          score += 25
          strengths.push("Large context window")
        } else if (model.contextWindow >= 100000) {
          score += 15
          strengths.push("Good context window")
        } else if (model.contextWindow < 8000) {
          score -= 10
          weaknesses.push("Small context window")
        }
      }

      // Capabilities scoring
      if (criteria.prioritizeCapabilities) {
        const matchingCaps = model.capabilities.filter(cap => 
          criteria.prioritizeCapabilities?.includes(cap)
        )
        score += matchingCaps.length * 10
        if (matchingCaps.length > 0) {
          strengths.push(`Supports ${matchingCaps.join(", ")}`)
        }
      }

      // Tool support
      if (model.supportsTools) {
        score += 10
        strengths.push("Function calling")
      }

      // Streaming support
      if (model.supportsStreaming) {
        score += 5
        strengths.push("Streaming")
      }

      return {
        model,
        provider: model.providerId,
        score,
        strengths,
        weaknesses
      }
    }).sort((a, b) => b.score - a.score)
  }

  static getModelRecommendations(task: string): ModelRecommendation[] {
    const recommendations: ModelRecommendation[] = []

    switch (task.toLowerCase()) {
      case "coding":
        recommendations.push({
          task: "Code Generation",
          recommended: [], // Will be populated with actual models
          reasoning: "Models optimized for code generation with strong programming capabilities"
        })
        break
      case "reasoning":
        recommendations.push({
          task: "Complex Reasoning",
          recommended: [],
          reasoning: "Models with enhanced reasoning capabilities for complex problem solving"
        })
        break
      case "vision":
        recommendations.push({
          task: "Vision Tasks",
          recommended: [],
          reasoning: "Models capable of processing and understanding images"
        })
        break
      case "budget":
        recommendations.push({
          task: "Budget-Friendly",
          recommended: [],
          reasoning: "Cost-effective models with good performance per dollar"
        })
        break
      default:
        recommendations.push({
          task: "General Purpose",
          recommended: [],
          reasoning: "Well-rounded models suitable for most tasks"
        })
    }

    return recommendations
  }

  // 🔥 NEW: Get model statistics
  static async getModelStatistics(): Promise<{
    totalModels: number
    totalProviders: number
    capabilityDistribution: Record<string, number>
    avgContextWindow: number
    avgCost: number
    costRange: { min: number, max: number }
    contextRange: { min: number, max: number }
  }> {
    try {
      const modelsData = await this.fetchModelsData()
      const allProviders = this.transformToAIProviders(modelsData)
      const allModels = allProviders.flatMap(provider => provider.models)

      const capabilityDistribution: Record<string, number> = {}
      let totalContext = 0
      let totalCost = 0
      let costCount = 0
      let minCost = Infinity
      let maxCost = 0
      let minContext = Infinity
      let maxContext = 0

      allModels.forEach(model => {
        // Capability distribution
        model.capabilities.forEach(cap => {
          capabilityDistribution[cap] = (capabilityDistribution[cap] || 0) + 1
        })

        // Context window stats
        totalContext += model.contextWindow
        minContext = Math.min(minContext, model.contextWindow)
        maxContext = Math.max(maxContext, model.contextWindow)

        // Cost stats
        if (model.costPer1kTokens?.input) {
          totalCost += model.costPer1kTokens.input
          costCount++
          minCost = Math.min(minCost, model.costPer1kTokens.input)
          maxCost = Math.max(maxCost, model.costPer1kTokens.input)
        }
      })

      return {
        totalModels: allModels.length,
        totalProviders: allProviders.length,
        capabilityDistribution,
        avgContextWindow: Math.round(totalContext / allModels.length),
        avgCost: costCount > 0 ? totalCost / costCount : 0,
        costRange: { min: minCost === Infinity ? 0 : minCost, max: maxCost },
        contextRange: { min: minContext === Infinity ? 0 : minContext, max: maxContext }
      }
    } catch (error) {
      console.error("Failed to get model statistics:", error)
      return {
        totalModels: 0,
        totalProviders: 0,
        capabilityDistribution: {},
        avgContextWindow: 0,
        avgCost: 0,
        costRange: { min: 0, max: 0 },
        contextRange: { min: 0, max: 0 }
      }
    }
  }

  // 🔥 NEW: Find best model for specific criteria
  static async findBestModel(criteria: {
    capability?: string
    maxCost?: number
    minContext?: number
    provider?: string
  }): Promise<AIModel | null> {
    try {
      const modelsData = await this.fetchModelsData()
      const allProviders = this.transformToAIProviders(modelsData)
      let allModels = allProviders.flatMap(provider => provider.models)

      // Apply filters
      if (criteria.capability) {
        allModels = allModels.filter(model => 
          model.capabilities.includes(criteria.capability as any)
        )
      }

      if (criteria.maxCost) {
        allModels = allModels.filter(model => 
          !model.costPer1kTokens?.input || model.costPer1kTokens.input <= criteria.maxCost!
        )
      }

      if (criteria.minContext) {
        allModels = allModels.filter(model => 
          model.contextWindow >= criteria.minContext!
        )
      }

      if (criteria.provider) {
        allModels = allModels.filter(model => 
          model.providerId.toLowerCase() === criteria.provider!.toLowerCase()
        )
      }

      if (allModels.length === 0) return null

      // Score models and return the best
      const comparisons = this.compareModels(allModels, {
        prioritizeCost: true,
        prioritizeContext: true,
        prioritizeCapabilities: criteria.capability ? [criteria.capability] : undefined
      })

      return comparisons[0]?.model || null
    } catch (error) {
      console.error("Failed to find best model:", error)
      return null
    }
  }
} 