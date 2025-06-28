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
  
  // 🔥 NEW: Full catalog caching
  private static fullCatalog: AIProvider[] | null = null
  private static catalogLastFetch: number = 0

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
      
      // Validate and adapt the data structure
      if (!rawData || typeof rawData !== 'object') {
        throw new Error('Invalid response format from models.dev API')
      }

      let data: ModelsDevResponse
      
      // Check if the response has the old structure (with providers field) or new structure (providers at root)
      if (rawData.providers && typeof rawData.providers === 'object') {
        // Old structure: { providers: { openai: {...}, anthropic: {...} } }
        console.log('🔍 DEBUG: Using old API structure with providers field')
        data = rawData as ModelsDevResponse
      } else {
        // New structure: { openai: {...}, anthropic: {...} }
        console.log('🔍 DEBUG: Using new API structure, wrapping providers at root level')
        
        // Filter out any non-provider entries (like metadata) and ensure we have provider-like objects
        const providerEntries = Object.entries(rawData).filter(([key, value]) => {
          const isProvider = value && 
                           typeof value === 'object' && 
                           ((value as any).name || (value as any).models || typeof value === 'object')
          console.log(`🔍 DEBUG: Checking entry ${key}:`, isProvider ? 'valid provider' : 'skipping')
          return isProvider
        })
        
        const providers = Object.fromEntries(providerEntries)
        console.log('🔍 DEBUG: Filtered providers:', Object.keys(providers))
        
        data = { providers } as ModelsDevResponse
      }
      
      // Final validation
      if (!data.providers || typeof data.providers !== 'object') {
        console.warn('🔍 DEBUG: Still no valid providers after processing')
        data.providers = {}
      }
      
      this.cachedData = data
      this.lastFetch = now
      
      if (data.providers && Object.keys(data.providers).length > 0) {
        console.log("Successfully fetched models.dev data:", Object.keys(data.providers).length, "providers")
      } else {
        console.log("No providers found in response")
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

    console.log('🔍 DEBUG: Starting transformToAIProviders')
    console.log('🔍 DEBUG: modelsData type:', typeof modelsData)
    console.log('🔍 DEBUG: modelsData keys:', Object.keys(modelsData || {}))

    // Check if modelsData.providers exists and is not null
    if (!modelsData?.providers) {
      console.warn('🔍 DEBUG: No providers data available')
      return providers
    }

    console.log('🔍 DEBUG: Found providers:', Object.keys(modelsData.providers).length)

    for (const [providerId, providerData] of Object.entries(modelsData.providers)) {
      console.log(`🔍 DEBUG: Processing provider: ${providerId}`)
      const models: AIModel[] = []

      // Check if providerData.models exists and is not null
      if (!providerData?.models) {
        console.warn(`🔍 DEBUG: No models data available for provider: ${providerId}`)
        continue
      }

      console.log(`🔍 DEBUG: Provider ${providerId} has ${Object.keys(providerData.models).length} models`)

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
        console.log(`🔍 DEBUG: Adding provider ${providerId} with ${models.length} models`)
        providers.push({
          id: providerId,
          name: providerData.name,
          type: this.getProviderType(providerId),
          baseUrl: this.getProviderBaseUrl(providerId),
          enabled: false, // User needs to explicitly enable and add API keys
          models
        })
      } else {
        console.log(`🔍 DEBUG: Skipping provider ${providerId} - no valid models`)
      }
    }

    console.log(`🔍 DEBUG: transformToAIProviders completed: ${providers.length} providers`)
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
    return this.getProvidersByCategory(["popular"])
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

  // 🔥 NEW: Get complete catalog of ALL providers and models
  static async getFullCatalog(forceRefresh: boolean = false): Promise<AIProvider[]> {
    const now = Date.now()
    
    // Return cached catalog if still valid and not forcing refresh
    if (!forceRefresh && this.fullCatalog && (now - this.catalogLastFetch) < this.CACHE_DURATION) {
      console.log("🔍 DEBUG: Returning cached catalog")
      return this.fullCatalog
    }

    try {
      console.log("🔍 DEBUG: Building full models catalog from models.dev...")
      const modelsData = await this.fetchModelsData()
      console.log("🔍 DEBUG: Raw modelsData:", modelsData)
      console.log("🔍 DEBUG: modelsData.providers keys:", modelsData?.providers ? Object.keys(modelsData.providers) : 'no providers')
      
      const allProviders = this.transformToAIProviders(modelsData)
      console.log("🔍 DEBUG: Transformed providers:", allProviders.length)
      console.log("🔍 DEBUG: Sample provider:", allProviders[0])
      
      // Cache the full catalog
      this.fullCatalog = allProviders
      this.catalogLastFetch = now
      
      console.log(`🔍 DEBUG: Full catalog built: ${allProviders.length} providers, ${allProviders.reduce((sum, p) => sum + p.models.length, 0)} models`)
      return allProviders
    } catch (error) {
      console.error("🔍 DEBUG: Failed to build full catalog:", error)
      // Return cached data if available
      if (this.fullCatalog) {
        return this.fullCatalog
      }
      return []
    }
  }

  // 🔥 NEW: Get all providers (not just popular ones)
  static async getAllProviders(): Promise<AIProvider[]> {
    return this.getFullCatalog()
  }

  // 🔥 NEW: Get all models across all providers
  static async getAllModels(): Promise<AIModel[]> {
    const catalog = await this.getFullCatalog()
    return catalog.flatMap(provider => provider.models)
  }

  // 🔥 NEW: Advanced filtering capabilities
  static async getProvidersByCategory(categories: string[] = []): Promise<AIProvider[]> {
    const catalog = await this.getFullCatalog()
    
    if (categories.length === 0) return catalog
    
    return catalog.filter(provider => {
      const providerName = provider.name.toLowerCase()
      const providerId = provider.id.toLowerCase()
      
      return categories.some(category => {
        const cat = category.toLowerCase()
        switch (cat) {
          case "popular":
            return ["openai", "anthropic", "google", "deepseek", "mistral", "xai", "meta", "groq", "cohere", "openrouter", "azure"].includes(providerId)
          case "free":
            return provider.models.some(model => 
              !model.costPer1kTokens || 
              (model.costPer1kTokens.input === 0 && model.costPer1kTokens.output === 0)
            )
          case "vision":
            return provider.models.some(model => model.capabilities.includes("vision"))
          case "code":
            return provider.models.some(model => model.capabilities.includes("code"))
          case "reasoning":
            return provider.models.some(model => model.capabilities.includes("reasoning"))
          case "large-context":
            return provider.models.some(model => model.contextWindow >= 100000)
          case "streaming":
            return provider.models.some(model => model.supportsStreaming)
          case "tools":
            return provider.models.some(model => model.supportsTools)
          default:
            return providerName.includes(cat) || providerId.includes(cat)
        }
      })
    })
  }

  // 🔥 NEW: Enhanced model search with ranking
  static async searchModelsAdvanced(query: string, options: {
    capability?: string
    maxCost?: number
    minContext?: number
    provider?: string
    limit?: number
  } = {}): Promise<AIModel[]> {
    const allModels = await this.getAllModels()
    const lowerQuery = query.toLowerCase()
    
    let filteredModels = allModels.filter(model => {
      // Text search
      const matchesText = query === "" || 
        model.name.toLowerCase().includes(lowerQuery) ||
        model.id.toLowerCase().includes(lowerQuery) ||
        model.capabilities.some(cap => cap.includes(lowerQuery)) ||
        model.providerId.toLowerCase().includes(lowerQuery)
      
      // Capability filter
      const matchesCapability = !options.capability || 
        model.capabilities.includes(options.capability as any)
      
      // Cost filter
      const matchesCost = !options.maxCost || 
        !model.costPer1kTokens?.input || 
        model.costPer1kTokens.input <= options.maxCost
      
      // Context filter
      const matchesContext = !options.minContext || 
        model.contextWindow >= options.minContext
      
      // Provider filter
      const matchesProvider = !options.provider || 
        model.providerId.toLowerCase() === options.provider.toLowerCase()
      
      return matchesText && matchesCapability && matchesCost && matchesContext && matchesProvider
    })

    // Rank results by relevance
    filteredModels = filteredModels.map(model => ({
      ...model,
      _score: this.calculateRelevanceScore(model, query)
    }))
    .sort((a: any, b: any) => b._score - a._score)
    .map(({ _score, ...model }) => model)

    // Apply limit
    if (options.limit) {
      filteredModels = filteredModels.slice(0, options.limit)
    }

    return filteredModels
  }

  // 🔥 NEW: Calculate relevance score for search ranking
  private static calculateRelevanceScore(model: AIModel, query: string): number {
    const lowerQuery = query.toLowerCase()
    const modelName = model.name.toLowerCase()
    const modelId = model.id.toLowerCase()
    
    let score = 0
    
    // Exact name match gets highest score
    if (modelName === lowerQuery) score += 100
    else if (modelName.startsWith(lowerQuery)) score += 80
    else if (modelName.includes(lowerQuery)) score += 60
    
    // ID matches
    if (modelId === lowerQuery) score += 90
    else if (modelId.startsWith(lowerQuery)) score += 70
    else if (modelId.includes(lowerQuery)) score += 50
    
    // Capability matches
    if (model.capabilities.some(cap => cap.includes(lowerQuery))) score += 30
    
    // Provider matches
    if (model.providerId.toLowerCase().includes(lowerQuery)) score += 20
    
    // Boost popular models slightly
    const popularModels = ["gpt-4", "claude", "gemini", "deepseek", "llama"]
    if (popularModels.some(popular => modelName.includes(popular))) score += 10
    
    return score
  }

  // 🔥 NEW: Get catalog statistics
  static async getCatalogStatistics(): Promise<{
    totalProviders: number
    totalModels: number
    providerBreakdown: Record<string, number>
    capabilityBreakdown: Record<string, number>
    costBreakdown: {
      free: number
      cheap: number  // < $0.001
      moderate: number // $0.001 - $0.01
      expensive: number // > $0.01
    }
    contextBreakdown: {
      small: number // < 8K
      medium: number // 8K - 32K
      large: number // 32K - 128K
      xlarge: number // > 128K
    }
    lastUpdated: Date
  }> {
    const catalog = await this.getFullCatalog()
    const allModels = catalog.flatMap(provider => provider.models)
    
    const stats = {
      totalProviders: catalog.length,
      totalModels: allModels.length,
      providerBreakdown: {} as Record<string, number>,
      capabilityBreakdown: {} as Record<string, number>,
      costBreakdown: { free: 0, cheap: 0, moderate: 0, expensive: 0 },
      contextBreakdown: { small: 0, medium: 0, large: 0, xlarge: 0 },
      lastUpdated: new Date(this.catalogLastFetch)
    }
    
    // Calculate breakdowns
    catalog.forEach(provider => {
      stats.providerBreakdown[provider.name] = provider.models.length
    })
    
    allModels.forEach(model => {
      // Capabilities
      model.capabilities.forEach(cap => {
        stats.capabilityBreakdown[cap] = (stats.capabilityBreakdown[cap] || 0) + 1
      })
      
      // Cost breakdown
      const cost = model.costPer1kTokens?.input || 0
      if (cost === 0) stats.costBreakdown.free++
      else if (cost < 0.001) stats.costBreakdown.cheap++
      else if (cost <= 0.01) stats.costBreakdown.moderate++
      else stats.costBreakdown.expensive++
      
      // Context breakdown
      const context = model.contextWindow
      if (context < 8000) stats.contextBreakdown.small++
      else if (context <= 32000) stats.contextBreakdown.medium++
      else if (context <= 128000) stats.contextBreakdown.large++
      else stats.contextBreakdown.xlarge++
    })
    
    return stats
  }

  // 🔥 NEW: Clear all caches
  static clearCache(): void {
    this.cachedData = null
    this.fullCatalog = null
    this.lastFetch = 0
    this.catalogLastFetch = 0
    console.log("Models cache cleared")
  }

  // 🔥 NEW: Export catalog to JSON
  static async exportCatalog(): Promise<string> {
    const catalog = await this.getFullCatalog()
    const stats = await this.getCatalogStatistics()
    
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
        source: "models.dev",
        ...stats
      },
      providers: catalog
    }
    
    return JSON.stringify(exportData, null, 2)
  }
} 