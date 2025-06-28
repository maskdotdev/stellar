"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RefreshCw, Search, Zap, MessageSquare, Star } from "lucide-react"
import { useAIStore } from "@/lib/ai-store"
import { useToast } from "@/hooks/use-toast"
import { getFilteredModels, filterProviders } from "./utils"
import { ProviderLogo } from "./provider-logos"

// Model type colors inspired by Pokemon types
const getModelTypeColor = (capabilities: string[]) => {
  if (capabilities.includes('vision')) return 'bg-purple-500'
  if (capabilities.includes('code')) return 'bg-blue-500'
  if (capabilities.includes('reasoning')) return 'bg-orange-500'
  return 'bg-green-500'
}

const getCapabilityBadgeColor = (capability: string) => {
  switch (capability) {
    case 'vision': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'code': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'reasoning': return 'bg-orange-100 text-orange-800 border-orange-200'
    default: return 'bg-green-100 text-green-800 border-green-200'
  }
}

const formatModelNumber = (index: number) => {
  return `#${String(index + 1).padStart(3, '0')}`
}



export function ModelBrowser() {
  const {
    providers,
    setActiveProvider,
    setActiveModel,
    syncProvider,
    isLoading,
    activeProviderId,
    activeModelId,
    getActiveProvider,
    getActiveModel
  } = useAIStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCapability, setSelectedCapability] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name")
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false)
  
  const { toast } = useToast()

  const handleSyncProvider = async (providerId: string) => {
    try {
      await syncProvider(providerId)
      toast({
        title: "Provider synced",
        description: `Updated models for ${providerId}`
      })
    } catch (error) {
      toast({
        title: "Sync failed",
        description: `Failed to sync provider ${providerId}`,
        variant: "destructive"
      })
    }
  }

  const handleSelectModel = (providerId: string, modelId: string, modelName: string) => {
    setActiveProvider(providerId)
    setActiveModel(modelId)
    toast({
      title: `${modelName} selected`,
      description: "This model is now active"
    })
  }

  // Filter and sort models based on current settings
  const filteredProviders = filterProviders(providers, searchQuery, selectedCapability, showOnlyEnabled)
  
  // Flatten all models for grid display with provider context
  const allModels = filteredProviders.flatMap(provider => 
    getFilteredModels(provider, searchQuery, selectedCapability, sortBy).map((model: any, index: number) => ({
      ...model,
      providerId: provider.id,
      providerName: provider.name,
      providerEnabled: provider.enabled,
      globalIndex: index
    }))
  )

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center bg-card p-4 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models... "
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-card border-2 border-muted"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={selectedCapability} onValueChange={setSelectedCapability}>
            <SelectTrigger className="w-[140px] bg-card border-2 border-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌟 All Types</SelectItem>
              <SelectItem value="text">💬 Text Only</SelectItem>
              <SelectItem value="vision">👁️ Vision</SelectItem>
              <SelectItem value="code">💻 Code</SelectItem>
              <SelectItem value="reasoning">🧠 Reasoning</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px] bg-card border-2 border-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">📝 Name</SelectItem>
              <SelectItem value="contextWindow">📏 Context Size</SelectItem>
              <SelectItem value="cost">💰 Cost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

             {/* Provider Sync Controls */}
       <div className="flex flex-wrap gap-2">
         {providers.map((provider) => (
           <Button
             key={provider.id}
             variant={provider.enabled ? "default" : "outline"}
             size="sm"
             onClick={() => handleSyncProvider(provider.id)}
             disabled={isLoading}
             className="text-xs"
           >
             <ProviderLogo 
               providerId={provider.id} 
               providerName={provider.name} 
               size={14}
               className="mr-1"
             />
             <RefreshCw className="h-3 w-3 mr-1" />
             {provider.name}
             {provider.enabled && <Zap className="h-3 w-3 ml-1" />}
           </Button>
         ))}
       </div>

      {/* Model Grid - Pokedex Style */}
      <ScrollArea className="h-[700px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
                     {allModels.map((model: any, index: number) => {
             const isActive = activeProviderId === model.providerId && activeModelId === model.id
             const typeColor = getModelTypeColor(model.capabilities)
            
            return (
              <Card 
                key={`${model.providerId}-${model.id}`} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg shadow-muted hover:border-primary cursor-pointer border-2 ${
                  isActive ? 'border-yellow-400 shadow-yellow-200 shadow-lg' : ''
                }`}
              >
                {/* Model Number Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <Badge variant="secondary" className="text-xs font-mono">
                    {formatModelNumber(index)}
                  </Badge>
                </div>
                
                {/* Active Model Star */}
                {isActive && (
                  <div className="absolute top-2 right-2 z-10">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  </div>
                )}

                                 {/* Model Type Background */}
                 <div className={`h-20 ${typeColor} relative`}>
                   <div className="absolute inset-0 bg-black/20"></div>
                   <div className="absolute bottom-2 left-2 text-white text-xs font-medium flex items-center gap-1">
                     <ProviderLogo 
                       providerId={model.providerId} 
                       providerName={model.providerName} 
                       size={14}
                       className="text-white"
                     />
                     {model.providerName}
                   </div>
                   {!model.providerEnabled && (
                     <div className="absolute top-2 right-2">
                       <Badge variant="destructive" className="text-xs">
                         Disabled
                       </Badge>
                     </div>
                   )}
                 </div>

                <CardContent className="p-4">
                  {/* Model Name */}
                  <h3 className="font-bold text-sm mb-2 line-clamp-1" title={model.name}>
                    {model.name}
                  </h3>

                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {model.capabilities.map((cap: string) => (
                      <Badge 
                        key={cap} 
                        variant="outline" 
                        className={`text-xs px-2 py-0.5 ${getCapabilityBadgeColor(cap)}`}
                      >
                        {cap}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Context:</span>
                      <span className="font-mono">{(model.contextWindow / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Tokens:</span>
                      <span className="font-mono">{(model.maxTokens / 1000).toFixed(0)}K</span>
                    </div>
                    {model.costPer1kTokens && (
                      <div className="flex justify-between">
                        <span>Cost/1K:</span>
                        <span className="font-mono">${model.costPer1kTokens.input.toFixed(4)}</span>
                      </div>
                    )}
                  </div>

                                     {/* Select Button */}
                   {model.providerEnabled && (
                     <Button
                       variant={isActive ? "default" : "outline"}
                       size="sm"
                       onClick={() => handleSelectModel(model.providerId, model.id, model.name)}
                       className="w-full mt-3 text-xs"
                     >
                       {isActive ? "✨ Active" : "Select"}
                     </Button>
                   )}
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {allModels.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No models found matching your search criteria.</p>
            <p className="text-sm">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
} 