"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAIStore } from "@/lib/stores/ai-store"
import { ModelSelection } from "./model-selection"
import { ModelBrowser } from "./model-browser"
import { CatalogManagement } from "./catalog-management"
import { Statistics } from "./statistics"
import { EmbeddingModelsSettings } from "./embedding-models-settings"
import { AIOverview } from "./ai-overview"

export function AIModelsSettings() {
  const { error } = useAIStore()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">AI Models</h2>
          <p className="text-sm text-muted-foreground">
            Manage your AI models for chat, embeddings, and other AI features
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chat">Chat Models</TabsTrigger>
          <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
          <TabsTrigger value="catalog">Full Catalog</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AIOverview />
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Current Chat Model</h3>
              <p className="text-sm text-muted-foreground">
                Choose your active model for chat conversations
              </p>
            </div>
            <ModelSelection />
            
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Browse Available Models</h3>
              <ModelBrowser />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="embeddings" className="space-y-4">
          <EmbeddingModelsSettings />
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