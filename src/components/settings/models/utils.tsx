import React from "react"
import { Eye, Code, Brain } from "lucide-react"

export const getCapabilityIcon = (capability: string) => {
  switch (capability) {
    case "text": return <span className="text-blue-500">T</span>
    case "vision": return <Eye className="h-3 w-3 text-green-500" />
    case "code": return <Code className="h-3 w-3 text-purple-500" />
    case "reasoning": return <Brain className="h-3 w-3 text-orange-500" />
    default: return null
  }
}

export const getFilteredModels = (provider: any, searchQuery: string, selectedCapability: string, sortBy: string) => {
  return provider.models.filter((model: any) => {
    const matchesSearch = searchQuery === "" || 
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.id.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCapability = selectedCapability === "all" || 
      model.capabilities.includes(selectedCapability as any)
    
    return matchesSearch && matchesCapability
  }).sort((a: any, b: any) => {
    switch (sortBy) {
      case "contextWindow":
        return b.contextWindow - a.contextWindow
      case "cost":
        const aCost = a.costPer1kTokens?.input || 0
        const bCost = b.costPer1kTokens?.input || 0
        return aCost - bCost
      case "name":
      default:
        return a.name.localeCompare(b.name)
    }
  })
}

export const filterProviders = (providers: any[], searchQuery: string, selectedCapability: string, showOnlyEnabled: boolean) => {
  return providers.filter(provider => {
    if (showOnlyEnabled && !provider.enabled) return false
    
    const hasMatchingModels = provider.models.some((model: any) => {
      const matchesSearch = searchQuery === "" || 
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.id.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCapability = selectedCapability === "all" || 
        model.capabilities.includes(selectedCapability as any)
      
      return matchesSearch && matchesCapability
    })
    
    return hasMatchingModels
  })
} 