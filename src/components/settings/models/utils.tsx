
import { Eye, Code, Brain, Image, FileText } from "lucide-react"

export const getCapabilityIcon = (capability: string, size: "sm" | "md" = "md") => {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-5 w-5";
  const containerStyle = size === "sm" ? "rounded p-0.5" : "rounded-md p-1";
  
  switch (capability) {
    case "vision":
      return <span className={`${containerStyle} bg-green-100/80 text-green-500`}><Eye className={iconSize} /></span>;
    case "code":
      return <span className={`${containerStyle} bg-purple-100/80 text-purple-500`}><Code className={iconSize} /></span>;
    case "reasoning":
      return <span className={`${containerStyle} bg-pink-100/80 text-pink-500`}><Brain className={iconSize} /></span>;
    case "text":
      return <span className={`${containerStyle} bg-blue-100/80 text-blue-500`}><FileText className={iconSize} /></span>;
    case "image":
      return <span className={`${containerStyle} bg-orange-100/80 text-orange-500`}><Image className={iconSize} /></span>;
    default:
      return <span className={`${containerStyle} bg-blue-100/80 text-blue-500`}><FileText className={iconSize} /></span>;
  }
};

export const getCapabilityTooltip = (capability: string) => {
  switch (capability) {
    case "vision":
      return "Can analyze and understand images";
    case "code":
      return "Specialized for code generation and analysis";
    case "reasoning":
      return "Advanced reasoning and problem-solving";
    case "text":
      return "Text generation and understanding";
    case "image":
      return "Image generation capabilities";
    default:
      return "Text processing capabilities";
  }
};

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