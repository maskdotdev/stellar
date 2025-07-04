"use client"

import { useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAIStore } from "@/lib/stores/ai-store"
import { getCapabilityIcon } from "./utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn, formatNumber } from "@/lib/utils/utils"

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
  
  const [providerSearchOpen, setProviderSearchOpen] = useState(false)
  const [modelSearchOpen, setModelSearchOpen] = useState(false)
  
  const activeProvider = getActiveProvider()
  const activeModel = getActiveModel()

  // Show all providers in the model selection
  const filteredProviders = providers

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Provider</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Searchable Provider Selection */}
            <Popover open={providerSearchOpen} onOpenChange={setProviderSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={providerSearchOpen}
                  className="w-full justify-between"
                >
                  {activeProviderId ? (
                    <div className="flex items-center gap-2">
                      <span>{providers.find(p => p.id === activeProviderId)?.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {providers.find(p => p.id === activeProviderId)?.models.length} models
                      </Badge>
                    </div>
                  ) : (
                    "Select provider..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search providers..." className="h-9" />
                  <CommandEmpty>No provider found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {filteredProviders.map((provider) => (
                        <CommandItem
                          key={provider.id}
                          value={provider.name}
                          onSelect={() => {
                            setActiveProvider(provider.id === activeProviderId ? "" : provider.id)
                            setProviderSearchOpen(false)
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span>{provider.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {provider.models.length} models
                            </Badge>
                            {!provider.enabled && (
                              <Badge variant="destructive" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              activeProviderId === provider.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Model</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Searchable Model Selection */}
            <Popover open={modelSearchOpen} onOpenChange={setModelSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={modelSearchOpen}
                  className="w-full justify-between"
                  disabled={!activeProvider}
                >
                  {activeModelId ? (
                    <div className="flex items-center gap-2">
                      <span>{activeProvider?.models.find(m => m.id === activeModelId)?.name}</span>
                      {activeModel && activeModel.contextWindow && (
                        <Badge variant="secondary" className="text-xs">
                          {formatNumber(activeModel.contextWindow)} ctx
                        </Badge>
                      )}
                    </div>
                  ) : (
                    "Select model..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search models..." className="h-9" />
                  <CommandEmpty>No model found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {activeProvider?.models.map((model) => (
                        <CommandItem
                          key={model.id}
                          value={model.name}
                          onSelect={() => {
                            setActiveModel(model.id === activeModelId ? "" : model.id)
                            setModelSearchOpen(false)
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span>{model.name}</span>
                            {model.contextWindow && (
                              <Badge variant="secondary" className="text-xs">
                                {formatNumber(model.contextWindow)} ctx
                              </Badge>
                            )}
                            {model.capabilities.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {model.capabilities.length} caps
                              </Badge>
                            )}
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              activeModelId === model.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
                    {getCapabilityIcon(cap, "sm")}
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