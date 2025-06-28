"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { ModelsService } from "./models-service"

export interface AIProvider {
  id: string
  name: string
  type: "openai" | "anthropic" | "ollama" | "custom"
  baseUrl: string
  apiKey?: string
  enabled: boolean
  models: AIModel[]
}

export interface AIModel {
  id: string
  name: string
  providerId: string
  contextWindow: number
  maxTokens: number
  supportsStreaming: boolean
  supportsTools: boolean
  capabilities: ("text" | "vision" | "code" | "reasoning")[]
  costPer1kTokens?: {
    input: number
    output: number
  }
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  model?: string
  providerId?: string
}

export interface AIConversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  model: string
  providerId: string
}

interface AIState {
  // Provider Management
  providers: AIProvider[]
  activeProviderId: string | null
  activeModelId: string | null
  
  // Conversations
  conversations: AIConversation[]
  activeConversationId: string | null
  
  // UI State
  isLoading: boolean
  error: string | null
  
  // Settings
  settings: {
    temperature: number
    maxTokens: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
    streamResponse: boolean
    saveConversations: boolean
  }

  // Actions
  addProvider: (provider: Omit<AIProvider, "id">) => void
  updateProvider: (id: string, updates: Partial<AIProvider>) => void
  removeProvider: (id: string) => void
  setActiveProvider: (providerId: string) => void
  setActiveModel: (modelId: string) => void
  
  // New methods for models.dev integration
  importModelsFromDev: () => Promise<void>
  syncProvider: (providerId: string) => Promise<void>
  
  // 🔥 NEW: Advanced model features
  getModelStatistics: () => Promise<any>
  compareModels: (models: AIModel[], criteria: any) => any[]
  findBestModel: (criteria: any) => Promise<AIModel | null>
  getModelRecommendations: (task: string) => any[]
  
  addConversation: (conversation: Omit<AIConversation, "id">) => void
  updateConversation: (id: string, updates: Partial<AIConversation>) => void
  removeConversation: (id: string) => void
  setActiveConversation: (conversationId: string | null) => void
  
  addMessage: (conversationId: string, message: Omit<ChatMessage, "id">) => void
  
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateSettings: (settings: Partial<AIState["settings"]>) => void
  
  // Computed getters
  getActiveProvider: () => AIProvider | null
  getActiveModel: () => AIModel | null
  getActiveConversation: () => AIConversation | null
  getAvailableModels: () => AIModel[]
  getModelsByCapability: (capability: string) => AIModel[]
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      // Initial state
      providers: [
        {
          id: "openai-default",
          name: "OpenAI",
          type: "openai",
          baseUrl: "https://api.openai.com/v1",
          enabled: false,
          models: [
            {
              id: "gpt-4o",
              name: "GPT-4o",
              providerId: "openai-default",
              contextWindow: 128000,
              maxTokens: 4096,
              supportsStreaming: true,
              supportsTools: true,
              capabilities: ["text", "vision", "code", "reasoning"],
              costPer1kTokens: { input: 0.005, output: 0.015 }
            },
            {
              id: "gpt-4o-mini",
              name: "GPT-4o Mini",
              providerId: "openai-default",
              contextWindow: 128000,
              maxTokens: 16384,
              supportsStreaming: true,
              supportsTools: true,
              capabilities: ["text", "vision", "code"],
              costPer1kTokens: { input: 0.00015, output: 0.0006 }
            }
          ]
        },
        {
          id: "anthropic-default",
          name: "Anthropic",
          type: "anthropic",
          baseUrl: "https://api.anthropic.com/v1",
          enabled: false,
          models: [
            {
              id: "claude-3-5-sonnet-20241022",
              name: "Claude 3.5 Sonnet",
              providerId: "anthropic-default",
              contextWindow: 200000,
              maxTokens: 8192,
              supportsStreaming: true,
              supportsTools: true,
              capabilities: ["text", "vision", "code", "reasoning"],
              costPer1kTokens: { input: 0.003, output: 0.015 }
            }
          ]
        }
      ],
      activeProviderId: null,
      activeModelId: null,
      
      conversations: [],
      activeConversationId: null,
      
      isLoading: false,
      error: null,
      
      settings: {
        temperature: 0.7,
        maxTokens: 2048,
        topP: 1.0,
        frequencyPenalty: 0,
        presencePenalty: 0,
        streamResponse: true,
        saveConversations: true,
      },

      // Actions
      addProvider: (provider) => set((state) => ({
        providers: [...state.providers, { ...provider, id: crypto.randomUUID() }]
      })),
      
      updateProvider: (id, updates) => set((state) => ({
        providers: state.providers.map(p => p.id === id ? { ...p, ...updates } : p)
      })),
      
      removeProvider: (id) => set((state) => ({
        providers: state.providers.filter(p => p.id !== id),
        activeProviderId: state.activeProviderId === id ? null : state.activeProviderId
      })),
      
      setActiveProvider: (providerId) => set({ activeProviderId: providerId }),
      setActiveModel: (modelId) => set({ activeModelId: modelId }),
      
      // New methods for models.dev integration
      importModelsFromDev: async () => {
        set({ isLoading: true, error: null })
        try {
          const popularProviders = await ModelsService.getPopularProviders()
          
          set((state) => {
            const existingProviderIds = new Set(state.providers.map(p => p.id))
            const newProviders = popularProviders.filter(p => !existingProviderIds.has(p.id))
            
            // Update existing providers with new models while preserving user settings
            const updatedProviders = state.providers.map(existingProvider => {
              const matchingProvider = popularProviders.find(p => p.id === existingProvider.id)
              if (matchingProvider) {
                return {
                  ...existingProvider,
                  models: matchingProvider.models,
                  name: matchingProvider.name, // Update name in case it changed
                  baseUrl: matchingProvider.baseUrl // Update base URL in case it changed
                }
              }
              return existingProvider
            })
            
            return {
              providers: [...updatedProviders, ...newProviders],
              isLoading: false
            }
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to import models", 
            isLoading: false 
          })
        }
      },
      
      syncProvider: async (providerId: string) => {
        set({ isLoading: true, error: null })
        try {
          const modelsData = await ModelsService.fetchModelsData()
          const allProviders = ModelsService.transformToAIProviders(modelsData)
          const providerData = allProviders.find(p => p.id === providerId)
          
          if (providerData) {
            set((state) => ({
              providers: state.providers.map(p => 
                p.id === providerId 
                  ? { ...p, models: providerData.models, name: providerData.name }
                  : p
              ),
              isLoading: false
            }))
          } else {
            throw new Error(`Provider ${providerId} not found`)
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to sync provider", 
            isLoading: false 
          })
        }
      },
      
      addConversation: (conversation) => set((state) => ({
        conversations: [...state.conversations, { ...conversation, id: crypto.randomUUID() }]
      })),
      
      updateConversation: (id, updates) => set((state) => ({
        conversations: state.conversations.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      
      removeConversation: (id) => set((state) => ({
        conversations: state.conversations.filter(c => c.id !== id),
        activeConversationId: state.activeConversationId === id ? null : state.activeConversationId
      })),
      
      setActiveConversation: (conversationId) => set({ activeConversationId: conversationId }),
      
      addMessage: (conversationId, message) => set((state) => ({
        conversations: state.conversations.map(c => 
          c.id === conversationId 
            ? { ...c, messages: [...c.messages, { ...message, id: crypto.randomUUID() }] }
            : c
        )
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      updateSettings: (settings) => set((state) => ({ 
        settings: { ...state.settings, ...settings } 
      })),
      
      // Computed getters
      getActiveProvider: () => {
        const { providers, activeProviderId } = get()
        return providers.find(p => p.id === activeProviderId) || null
      },
      
      getActiveModel: () => {
        const { providers, activeProviderId, activeModelId } = get()
        const provider = providers.find(p => p.id === activeProviderId)
        return provider?.models.find(m => m.id === activeModelId) || null
      },
      
      getActiveConversation: () => {
        const { conversations, activeConversationId } = get()
        return conversations.find(c => c.id === activeConversationId) || null
      },
      
      getAvailableModels: () => {
        const { providers } = get()
        return providers
          .filter(p => p.enabled)
          .flatMap(p => p.models)
      },
      
      getModelsByCapability: (capability: string) => {
        const { providers } = get()
        return providers
          .filter(p => p.enabled)
          .flatMap(p => p.models)
          .filter(m => m.capabilities.includes(capability as any))
      },
      
      // 🔥 NEW: Advanced model features
      getModelStatistics: async () => {
        set({ isLoading: true, error: null })
        try {
          const statistics = await ModelsService.getModelStatistics()
          set({ isLoading: false })
          return statistics
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to get model statistics", 
            isLoading: false 
          })
          return null
        }
      },
      
      compareModels: (models: AIModel[], criteria: any) => {
        set({ isLoading: true, error: null })
        try {
          const comparisonResults = ModelsService.compareModels(models, criteria)
          set({ isLoading: false })
          return comparisonResults
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to compare models", 
            isLoading: false 
          })
          return []
        }
      },
      
      findBestModel: async (criteria: any) => {
        set({ isLoading: true, error: null })
        try {
          const bestModel = await ModelsService.findBestModel(criteria)
          set({ isLoading: false })
          return bestModel
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to find best model", 
            isLoading: false 
          })
          return null
        }
      },
      
      getModelRecommendations: (task: string) => {
        set({ isLoading: true, error: null })
        try {
          const recommendations = ModelsService.getModelRecommendations(task)
          set({ isLoading: false })
          return recommendations
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to get model recommendations", 
            isLoading: false 
          })
          return []
        }
      }
    }),
    {
      name: "ai-store",
      // Don't persist sensitive data like API keys in localStorage
      partialize: (state) => ({
        providers: state.providers.map(p => ({ ...p, apiKey: undefined })),
        activeProviderId: state.activeProviderId,
        activeModelId: state.activeModelId,
        conversations: state.settings.saveConversations ? state.conversations : [],
        settings: state.settings
      })
    }
  )
) 