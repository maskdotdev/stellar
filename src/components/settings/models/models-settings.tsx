"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAIStore } from "@/lib/stores/ai-store"
import { ModelSelection } from "./model-selection"
import { ModelBrowser } from "./model-browser"
import { CatalogManagement } from "./catalog-management"
import { Statistics } from "./statistics"

export function ModelsSettings() {
  const { error } = useAIStore()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Model Selection</h2>
          <p className="text-sm text-muted-foreground">
            Choose your active AI model and manage the complete models catalog
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <Tabs defaultValue="selection" className="w-full">
        <TabsList>
          <TabsTrigger value="selection">Current Model</TabsTrigger>
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