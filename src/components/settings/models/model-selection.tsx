"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAIStore } from "@/lib/ai-store"
import { getCapabilityIcon } from "./utils"

export function ModelSelection() {
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={activeProviderId || "none"} onValueChange={(value) => setActiveProvider(value === "none" ? "" : value)}>
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
              value={activeModelId || "none"} 
              onValueChange={(value) => setActiveModel(value === "none" ? "" : value)}
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
    </div>
  )
} 