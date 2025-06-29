"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RefreshCw, Download, Search, FileDown, Globe, Database } from "lucide-react"
import { useAIStore } from "@/lib/ai-store"
import { useToast } from "@/hooks/use-toast"
import { getCapabilityIcon } from "./utils"

export function CatalogManagement() {
  const {
    buildFullCatalog,
    importAllProviders,
    importProvidersByCategory,
    searchModelsInCatalog,
    exportCatalog,
    clearModelCache,
    catalogState,
    isLoading
  } = useAIStore()

  const [catalogSearchQuery, setCatalogSearchQuery] = useState("")
  const [catalogFilters, setCatalogFilters] = useState({
    capability: "",
    maxCost: "",
    minContext: "",
    provider: "",
    category: ""
  })
  const [catalogSearchResults, setCatalogSearchResults] = useState<any[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  
  const { toast } = useToast()

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

  return (
    <div className="space-y-4">
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
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => handleBuildCatalog(false)}
              disabled={isLoading || catalogState.isBuilding}
            >
              <Database className="h-3 w-3 mr-1" />
              Build Catalog
            </Button>
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
                                {getCapabilityIcon(cap, "sm")}
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
    </div>
  )
} 