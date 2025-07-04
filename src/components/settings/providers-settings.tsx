"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Eye, EyeOff, TestTube, CheckCircle, XCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAIStore, type AIProvider } from "@/lib/stores/ai-store"
import { aiService } from "@/lib/services/ai-service"

export function ProvidersSettings() {
  const {
    providers,
    addProvider,
    updateProvider,
    removeProvider,
  } = useAIStore()

  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({})
  const [actualApiKeys, setActualApiKeys] = useState<Record<string, string>>({})
  const [loadingApiKeys, setLoadingApiKeys] = useState<Record<string, boolean>>({})
  const [newProvider, setNewProvider] = useState<Partial<AIProvider>>({
    name: "",
    type: "custom",
    baseUrl: "",
    enabled: true,
    models: []
  })
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Check for existing API keys on mount
  useEffect(() => {
    const checkExistingApiKeys = async () => {
      for (const provider of providers) {
        try {
          const apiKey = await aiService.getApiKey(provider.id)
          if (apiKey) {
            updateProvider(provider.id, { apiKey: "••••••••" })
            setActualApiKeys(prev => ({
              ...prev,
              [provider.id]: apiKey
            }))
          }
        } catch (error) {
          console.error(`Failed to check API key for ${provider.name}:`, error)
        }
      }
    }
    
    checkExistingApiKeys()
  }, [providers, updateProvider])

  const handleTestConnection = async (provider: AIProvider) => {
    setTestingProvider(provider.id)
    try {
      const result = await aiService.testConnection(provider)
      setTestResults(prev => ({ ...prev, [provider.id]: result }))
    } catch (error) {
      setTestResults(prev => ({ ...prev, [provider.id]: false }))
    } finally {
      setTestingProvider(null)
    }
  }

  const handleAddProvider = () => {
    if (newProvider.name && newProvider.baseUrl) {
      addProvider({
        ...newProvider,
        models: []
      } as Omit<AIProvider, "id">)
      setNewProvider({
        name: "",
        type: "custom",
        baseUrl: "",
        enabled: true,
        models: []
      })
      setShowAddDialog(false)
    }
  }

  const handleUpdateApiKey = async (providerId: string, apiKey: string) => {
    try {
      await aiService.storeApiKey(providerId, apiKey)
      updateProvider(providerId, { apiKey: apiKey ? "••••••••" : undefined })
      setActualApiKeys(prev => ({
        ...prev,
        [providerId]: apiKey
      }))
    } catch (error) {
      console.error("Failed to update API key:", error)
    }
  }

  const toggleApiKeyVisibility = async (providerId: string) => {
    const isCurrentlyShown = showApiKeys[providerId]
    
    if (!isCurrentlyShown && !actualApiKeys[providerId]) {
      setLoadingApiKeys(prev => ({ ...prev, [providerId]: true }))
      try {
        const apiKey = await aiService.getApiKey(providerId)
        if (apiKey) {
          setActualApiKeys(prev => ({
            ...prev,
            [providerId]: apiKey
          }))
        }
      } catch (error) {
        console.error("Failed to fetch API key:", error)
      } finally {
        setLoadingApiKeys(prev => ({ ...prev, [providerId]: false }))
      }
    }
    
    setShowApiKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }))
  }

  const handleDeleteApiKey = async (providerId: string) => {
    try {
      await aiService.deleteApiKey(providerId)
      updateProvider(providerId, { apiKey: undefined })
      setActualApiKeys(prev => {
        const { [providerId]: _, ...rest } = prev
        return rest
      })
      setShowApiKeys(prev => ({
        ...prev,
        [providerId]: false
      }))
    } catch (error) {
      console.error("Failed to delete API key:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">AI Providers</h2>
          <p className="text-sm text-muted-foreground">
            Manage your AI service providers and API keys
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Provider
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a new AI provider</p>
              </TooltipContent>
            </Tooltip>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add AI Provider</DialogTitle>
              <DialogDescription>
                Configure a new AI service provider
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider-name">Provider Name</Label>
                <Input
                  id="provider-name"
                  placeholder="Custom Provider"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-type">Provider Type</Label>
                <Select 
                  value={newProvider.type} 
                  onValueChange={(value) => setNewProvider(prev => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI Compatible</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="ollama">Ollama</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-url">Base URL</Label>
                <Input
                  id="provider-url"
                  placeholder="https://api.example.com/v1"
                  value={newProvider.baseUrl}
                  onChange={(e) => setNewProvider(prev => ({ ...prev, baseUrl: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddProvider}>Add Provider</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-lg">{provider.name}</CardTitle>
                  <Badge variant={provider.enabled ? "default" : "secondary"}>
                    {provider.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {provider.type}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {testResults[provider.id] === true && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Connection test successful</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {testResults[provider.id] === false && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <XCircle className="w-4 h-4 text-red-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Connection test failed</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(provider)}
                        disabled={testingProvider === provider.id}
                      >
                        <TestTube className="w-4 h-4 mr-1" />
                        {testingProvider === provider.id ? "Testing..." : "Test"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Test connection to this provider</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProvider(provider.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove this provider</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <CardDescription>{provider.baseUrl}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={provider.enabled}
                  onCheckedChange={(enabled) => updateProvider(provider.id, { enabled })}
                />
                <Label>Enable this provider</Label>
              </div>
              
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex space-x-2">
                  <Input
                    type={showApiKeys[provider.id] ? "text" : "password"}
                    placeholder={provider.apiKey ? "API key saved" : "Enter API key"}
                    value={actualApiKeys[provider.id] ?? ""}
                    onChange={(e) => {
                      setActualApiKeys(prev => ({
                        ...prev,
                        [provider.id]: e.target.value
                      }))
                    }}
                    onBlur={(e) => {
                      const currentApiKey = e.target.value.trim()
                      if (currentApiKey && currentApiKey !== provider.apiKey) {
                        handleUpdateApiKey(provider.id, currentApiKey)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const currentApiKey = e.currentTarget.value.trim()
                        if (currentApiKey && currentApiKey !== provider.apiKey) {
                          handleUpdateApiKey(provider.id, currentApiKey)
                        }
                      }
                    }}
                    disabled={loadingApiKeys[provider.id]}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleApiKeyVisibility(provider.id)}
                        disabled={loadingApiKeys[provider.id]}
                      >
                        {loadingApiKeys[provider.id] ? (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                        ) : showApiKeys[provider.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {loadingApiKeys[provider.id]
                          ? "Loading..."
                          : showApiKeys[provider.id]
                          ? "Hide API key"
                          : "Show API key"
                        }
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  {provider.apiKey && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteApiKey(provider.id)}
                          disabled={loadingApiKeys[provider.id]}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete API key</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {provider.models.length} models available
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 