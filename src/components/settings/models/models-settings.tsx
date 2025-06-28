"use client"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Download, Database } from "lucide-react"
import { useAIStore } from "@/lib/ai-store"
import { useToast } from "@/hooks/use-toast"
import { ModelSelection } from "./model-selection"
import { ModelBrowser } from "./model-browser"
import { CatalogManagement } from "./catalog-management"
import { Statistics } from "./statistics"

export function ModelsSettings() {
  const {
    importModelsFromDev,
    buildFullCatalog,
    catalogState,
    isLoading,
    error
  } = useAIStore()

  const { toast } = useToast()

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

  const handleBuildCatalog = async (forceRefresh: boolean = false) => {
    try {
      console.log("🔍 DEBUG: Starting catalog build...")
      await buildFullCatalog(forceRefresh)
      console.log("🔍 DEBUG: buildFullCatalog completed")
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
          <ModelSelection />
        </TabsContent>

        <TabsContent value="browse" className="space-y-4">
          <ModelBrowser />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <CatalogManagement />
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Statistics />
        </TabsContent>
      </Tabs>
    </div>
  )
} 