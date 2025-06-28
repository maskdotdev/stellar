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
import { RefreshCw, Download, Search, Filter, Zap, Eye, Code, Brain, Database, BarChart3, FileDown, Globe } from "lucide-react"
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
    error,
    buildFullCatalog,
    importAllProviders,
    importProvidersByCategory,
    searchModelsInCatalog,
    getCatalogStatistics,
    clearModelCache,
    exportCatalog,
    catalogState
  } = useAIStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCapability, setSelectedCapability] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name")
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false)
  
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("")
  const [catalogFilters, setCatalogFilters] = useState({
    capability: "",
    maxCost: "",
    minContext: "",
    provider: "",
    category: ""
  })
  const [catalogSearchResults, setCatalogSearchResults] = useState<any[]>([])
  const [catalogStats, setCatalogStats] = useState<any>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  
  const { toast } = useToast()
  
  const activeProvider = getActiveProvider()
  const activeModel = getActiveModel()

  useEffect(() => {
    loadCatalogStats()
  }, [])

  const loadCatalogStats = async () => {
    try {
      const stats = await getCatalogStatistics()
      setCatalogStats(stats)
    } catch (error) {
      console.error("Failed to load catalog stats:", error)
    }
  }

  const handleCatalogSearch = async () => {
    if (!catalogSearchQuery.trim()) {
      setCatalogSearchResults([])
      return
    }

    try {
      const options: any = {}
      if (catalogFilters.capability) options.capability = catalogFilters.capability
      if (catalogFilters.maxCost) options.maxCost = parseFloat(catalogFilters.maxCost)
      if (catalogFilters.minContext) options.minContext = parseInt(catalogFilters.minContext)
      if (catalogFilters.provider) options.provider = catalogFilters.provider
      options.limit = 50

      const results = await searchModelsInCatalog(catalogSearchQuery, options)
      setCatalogSearchResults(results)
      
      toast({
        title: "Search completed",
        description: `Found ${results.length} models matching your criteria`
      })
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Failed to search catalog",
        variant: "destructive"
      })
    }
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleImportByCategories = async () => {
    if (selectedCategories.length === 0) {
      toast({
        title: "No categories selected",
        description: "Please select at least one category to import",
        variant: "destructive"
      })
      return
    }

    try {
      await importProvidersByCategory(selectedCategories)
      toast({
        title: "Providers imported",
        description: `Successfully imported providers for: ${selectedCategories.join(', ')}`
      })
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import providers by category",
        variant: "destructive"
      })
    }
  }

  const handleBuildCatalog = async (forceRefresh: boolean = false) => {
    try {
      console.log("🔍 DEBUG: Starting catalog build...")
      await buildFullCatalog(forceRefresh)
      console.log("🔍 DEBUG: buildFullCatalog completed")
      
      await loadCatalogStats()
      console.log("🔍 DEBUG: loadCatalogStats completed")
      console.log("🔍 DEBUG: Final catalog state:", catalogState)
      
      toast({
        title: "Catalog built successfully",
        description: `Cached ${catalogState.totalProviders} providers with ${catalogState.totalModels} models`
      })
    } catch (error) {
      console.error("🔍 DEBUG: Catalog build error:", error)
      toast({
        title: "Catalog build failed",
        description: "Failed to build full catalog",
        variant: "destructive"
      })
    }
  }

  const handleExportCatalog = async () => {
    try {
      const catalogJson = await exportCatalog()
      const blob = new Blob([catalogJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `models-catalog-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Catalog exported",
        description: "Catalog has been downloaded as JSON file"
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export catalog",
        variant: "destructive"
      })
    }
  }

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
            Choose your active AI model and manage the complete models catalog
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
            Import Popular
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleBuildCatalog(false)}
            disabled={isLoading || catalogState.isBuilding}
          >
            <Database className="h-4 w-4 mr-2" />
            Build Catalog
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
          <TabsTrigger value="browse">Browse Models</TabsTrigger>
          <TabsTrigger value="catalog">Full Catalog</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
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

        <TabsContent value="catalog" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Models.dev Catalog
                {catalogState.isBuilding && <RefreshCw className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{catalogState.totalProviders}</div>
                  <div className="text-sm text-muted-foreground">Providers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{catalogState.totalModels}</div>
                  <div className="text-sm text-muted-foreground">Models</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {catalogState.lastUpdated ? 
                      new Date(catalogState.lastUpdated).toLocaleDateString() : 
                      'Not cached'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Last Updated</div>
                </div>
                <div className="text-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBuildCatalog(true)}
                    disabled={catalogState.isBuilding}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => importAllProviders()}
                  disabled={isLoading}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Import All Providers
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportCatalog}
                  disabled={isLoading}
                >
                  <FileDown className="h-3 w-3 mr-1" />
                  Export Catalog
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearModelCache}
                >
                  Clear Cache
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: "popular", label: "Popular", icon: "⭐" },
                    { id: "free", label: "Free", icon: "💰" },
                    { id: "vision", label: "Vision", icon: "👁️" },
                    { id: "code", label: "Code", icon: "💻" },
                    { id: "reasoning", label: "Reasoning", icon: "🧠" },
                    { id: "large-context", label: "Large Context", icon: "📚" },
                    { id: "streaming", label: "Streaming", icon: "🌊" },
                    { id: "tools", label: "Function Calling", icon: "🔧" }
                  ].map(category => (
                    <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">
                        {category.icon} {category.label}
                      </span>
                    </label>
                  ))}
                </div>
                <Button 
                  onClick={handleImportByCategories}
                  disabled={isLoading || selectedCategories.length === 0}
                  className="w-full"
                >
                  Import Selected Categories ({selectedCategories.length})
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Catalog</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search models in catalog..."
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCatalogSearch()}
                  />
                </div>
                <Button onClick={handleCatalogSearch} disabled={isLoading}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Select value={catalogFilters.capability || "all"} onValueChange={(value) => 
                  setCatalogFilters(prev => ({ ...prev, capability: value === "all" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Capability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Capabilities</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="vision">Vision</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="reasoning">Reasoning</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  placeholder="Max cost ($/1K)"
                  value={catalogFilters.maxCost}
                  onChange={(e) => setCatalogFilters(prev => ({ ...prev, maxCost: e.target.value }))}
                />
                
                <Input
                  placeholder="Min context (K)"
                  value={catalogFilters.minContext}
                  onChange={(e) => setCatalogFilters(prev => ({ ...prev, minContext: e.target.value }))}
                />
                
                <Input
                  placeholder="Provider"
                  value={catalogFilters.provider}
                  onChange={(e) => setCatalogFilters(prev => ({ ...prev, provider: e.target.value }))}
                />
              </div>
              
              {catalogSearchResults.length > 0 && (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {catalogSearchResults.map((model) => (
                      <div key={`${model.providerId}-${model.id}`} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {model.providerId}
                              </Badge>
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
                                <span> • ${model.costPer1kTokens.input.toFixed(4)}/1K</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          {catalogStats ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Catalog Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{catalogStats.totalProviders || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Providers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{catalogStats.totalModels || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Models</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {catalogStats.avgContextWindow ? catalogStats.avgContextWindow.toLocaleString() : '0'}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Context Window</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        ${catalogStats.avgCost ? catalogStats.avgCost.toFixed(4) : '0.0000'}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Cost per 1K</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Capabilities Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {catalogStats.capabilityBreakdown ? Object.entries(catalogStats.capabilityBreakdown).map(([capability, count]) => (
                        <div key={capability} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {getCapabilityIcon(capability)}
                            <span className="capitalize">{capability}</span>
                          </div>
                          <Badge variant="secondary">{count as number}</Badge>
                        </div>
                      )) : (
                        <div className="text-sm text-muted-foreground">No capability data available</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cost Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {catalogStats.costBreakdown ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span>💰 Free Models</span>
                            <Badge variant="secondary">{catalogStats.costBreakdown.free || 0}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>💵 Cheap (&lt; $0.001)</span>
                            <Badge variant="secondary">{catalogStats.costBreakdown.cheap || 0}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>💴 Moderate ($0.001-$0.01)</span>
                            <Badge variant="secondary">{catalogStats.costBreakdown.moderate || 0}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>💸 Expensive (&gt; $0.01)</span>
                            <Badge variant="secondary">{catalogStats.costBreakdown.expensive || 0}</Badge>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">No cost data available</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-muted-foreground">
                  No catalog statistics available. Build the catalog first to see statistics.
                </div>
                <Button 
                  className="mt-4"
                  onClick={() => handleBuildCatalog(false)}
                  disabled={isLoading || catalogState.isBuilding}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Build Catalog
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 