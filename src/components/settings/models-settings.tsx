"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAIStore } from "@/lib/ai-store"

export function ModelsSettings() {
  const {
    providers,
    activeProviderId,
    activeModelId,
    setActiveProvider,
    setActiveModel,
    getActiveProvider,
    getActiveModel
  } = useAIStore()

  const activeProvider = getActiveProvider()
  const activeModel = getActiveModel()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Model Selection</h2>
        <p className="text-sm text-muted-foreground">
          Choose your active AI model for conversations
        </p>
      </div>

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
                    {provider.name}
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
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.contextWindow.toLocaleString()} tokens
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
                  <Badge key={cap} variant="secondary" className="text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>

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
    </div>
  )
} 