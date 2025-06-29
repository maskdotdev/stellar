"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useAIStore } from "@/lib/ai-store"
import { getCapabilityIcon } from "./utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModelSelectionProps {
  showEnabledOnly?: boolean
}

export function ModelSelection({ showEnabledOnly = false }: ModelSelectionProps) {
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
  const [providerSearchValue, setProviderSearchValue] = useState("")
  
  const activeProvider = getActiveProvider()
  const activeModel = getActiveModel()

  // Filter providers based on enabled status
  const filteredProviders = providers.filter(p => showEnabledOnly ? p.enabled : true)

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