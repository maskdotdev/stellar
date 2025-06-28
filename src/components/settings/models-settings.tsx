"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, Download, Search, Filter, Zap, Eye, Code, Brain } from "lucide-react"
import { useAIStore } from "@/lib/ai-store"
import { ModelsService } from "@/lib/models-service"
import { useToast } from "@/hooks/use-toast"

export function ModelsSettings() {
  const {
    providers,
    activeProviderId,
    activeModelId,
    setActiveProvider,
    setActiveModel,
    getActiveProvider,
    getActiveModel,
    importModelsFromDev,
    syncProvider,
    isLoading,
    error
  } = useAIStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCapability, setSelectedCapability] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name")
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false)
  
  const { toast } = useToast()
  
  const activeProvider = getActiveProvider()
  const activeModel = getActiveModel()

  // Filter and sort models based on current settings
  const filteredProviders = providers.filter(provider => {
    if (showOnlyEnabled && !provider.enabled) return false
    
    const hasMatchingModels = provider.models.some(model => {
      const matchesSearch = searchQuery === "" || 
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.id.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCapability = selectedCapability === "all" || 
        model.capabilities.includes(selectedCapability as any)
      
      return matchesSearch && matchesCapability
    })
    
    return hasMatchingModels
  })

  const handleImportModels = async () => {
    try {
      await importModelsFromDev()
      toast({
        title: "Models imported successfully",
        description: "Updated model database from models.dev"
      })
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import models from models.dev",
        variant: "destructive"
      })
    }
  }

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

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case "text": return <span className="text-blue-500">T</span>
      case "vision": return <Eye className="h-3 w-3 text-green-500" />
      case "code": return <Code className="h-3 w-3 text-purple-500" />
      case "reasoning": return <Brain className="h-3 w-3 text-orange-500" />
      default: return null
    }
  }

  const getFilteredModels = (provider: any) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Model Selection</h2>
          <p className="text-sm text-muted-foreground">
            Choose your active AI model for conversations
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleImportModels}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Import from models.dev
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <Tabs defaultValue="selection" className="w-full">
        <TabsList>
          <TabsTrigger value="selection">Model Selection</TabsTrigger>
          <TabsTrigger value="browse">Browse All Models</TabsTrigger>
        </TabsList>

        <TabsContent value="selection" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={activeProviderId || ""} onValueChange={setActiveProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.filter(p => p.enabled).map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center gap-2">
                          <span>{provider.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {provider.models.length} models
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Model</CardTitle>
              </CardHeader>
              <CardContent>
                <Select 
                  value={activeModelId || ""} 
                  onValueChange={setActiveModel}
                  disabled={!activeProvider}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProvider?.models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span>{model.name}</span>
                            {model.capabilities.map(cap => (
                              <span key={cap} className="ml-1">
                                {getCapabilityIcon(cap)}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {model.contextWindow.toLocaleString()} context • {model.maxTokens.toLocaleString()} max tokens
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {activeModel && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Context Window</Label>
                    <p className="text-sm text-muted-foreground">
                      {activeModel.contextWindow.toLocaleString()} tokens
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Max Output</Label>
                    <p className="text-sm text-muted-foreground">
                      {activeModel.maxTokens.toLocaleString()} tokens
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Capabilities</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeModel.capabilities.map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-xs flex items-center gap-1">
                        {getCapabilityIcon(cap)}
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>

                {activeModel.costPer1kTokens && (
                  <div>
                    <Label className="text-sm font-medium">Pricing (per 1K tokens)</Label>
                    <div className="text-sm text-muted-foreground">
                      Input: ${activeModel.costPer1kTokens.input.toFixed(4)} • 
                      Output: ${activeModel.costPer1kTokens.output.toFixed(4)}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${activeModel.supportsStreaming ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm">Streaming</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${activeModel.supportsTools ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm">Tools</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="browse" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedCapability} onValueChange={setSelectedCapability}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="text">Text Only</SelectItem>
                  <SelectItem value="vision">Vision</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="reasoning">Reasoning</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="contextWindow">Context Size</SelectItem>
                  <SelectItem value="cost">Cost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredProviders.map((provider) => {
                const filteredModels = getFilteredModels(provider)
                if (filteredModels.length === 0) return null

                return (
                  <Card key={provider.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{provider.name}</CardTitle>
                          <Badge variant={provider.enabled ? "default" : "secondary"}>
                            {provider.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {filteredModels.length} models
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncProvider(provider.id)}
                          disabled={isLoading}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {filteredModels.map((model: any) => (
                          <div key={model.id} className="flex items-center justify-between p-2 rounded border">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{model.name}</span>
                                <div className="flex gap-1">
                                  {model.capabilities.map((cap: any) => (
                                    <span key={cap}>
                                      {getCapabilityIcon(cap)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {model.contextWindow.toLocaleString()} context • {model.maxTokens.toLocaleString()} max
                                {model.costPer1kTokens && (
                                  <span> • ${model.costPer1kTokens.input.toFixed(4)}/1K input</span>
                                )}
                              </div>
                            </div>
                            {provider.enabled && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setActiveProvider(provider.id)
                                  setActiveModel(model.id)
                                }}
                                className="text-xs"
                              >
                                Select
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
} 