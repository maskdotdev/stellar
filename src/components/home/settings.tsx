"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Eye, EyeOff, TestTube, CheckCircle, XCircle, X, Settings as SettingsIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ThemeSwitcher, themes } from "@/components/theme-switcher"
import { useTheme } from "next-themes"
import { useAIStore, type AIProvider } from "@/lib/ai-store"
import { aiService } from "@/lib/ai-service"

export function Settings() {
  const {
    providers,
    activeProviderId,
    activeModelId,
    settings,
    addProvider,
    updateProvider,
    removeProvider,
    setActiveProvider,
    setActiveModel,
    updateSettings,
    getActiveProvider,
    getActiveModel
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
          }
        } catch (error) {
          console.error(`Failed to check API key for ${provider.name}:`, error)
        }
      }
    }
    
    checkExistingApiKeys()
  }, [providers, updateProvider]) // Run when providers change

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
      updateProvider(providerId, { apiKey: apiKey ? "••••••••" : undefined }) // Visual indicator only
      // Update local cache
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
      // Need to fetch the API key
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
      // Clear local cache
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

  const activeProvider = getActiveProvider()
  const activeModel = getActiveModel()
  const { theme, setTheme } = useTheme()

  return (
    <TooltipProvider>
      <div className="h-full overflow-auto">
        <div className="container mx-auto p-6 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">
              Configure AI providers, models, and chat settings
            </p>
          </div>

          <Tabs defaultValue="providers" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="providers">AI Providers</TabsTrigger>
              <TabsTrigger value="models">Models</TabsTrigger>
              <TabsTrigger value="chat">Chat Settings</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
            </TabsList>

            <TabsContent value="providers" className="space-y-4">
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
                            value={
                              showApiKeys[provider.id] 
                                ? actualApiKeys[provider.id] || ""
                                : provider.apiKey || ""
                            }
                            onChange={(e) => {
                              // Update local cache when typing
                              setActualApiKeys(prev => ({
                                ...prev,
                                [provider.id]: e.target.value
                              }))
                            }}
                            onBlur={(e) => {
                              if (e.target.value !== (provider.apiKey === "••••••••" ? actualApiKeys[provider.id] : provider.apiKey)) {
                                handleUpdateApiKey(provider.id, e.target.value)
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
                                disabled={loadingApiKeys[provider.id] || !provider.apiKey}
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
                                  : !provider.apiKey
                                  ? "No API key saved"
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
            </TabsContent>

            <TabsContent value="models" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="chat" className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Chat Settings</h2>
                <p className="text-sm text-muted-foreground">
                  Configure AI conversation parameters
                </p>
              </div>

              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Generation Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>Temperature</Label>
                        <span className="text-sm text-muted-foreground">{settings.temperature}</span>
                      </div>
                      <Slider
                        value={[settings.temperature]}
                        onValueChange={([value]) => updateSettings({ temperature: value })}
                        max={2}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Controls randomness. Lower values make responses more focused and deterministic.
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>Max Tokens</Label>
                        <span className="text-sm text-muted-foreground">{settings.maxTokens}</span>
                      </div>
                      <Slider
                        value={[settings.maxTokens]}
                        onValueChange={([value]) => updateSettings({ maxTokens: value })}
                        max={8192}
                        min={100}
                        step={100}
                        className="w-full"
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>Top P</Label>
                        <span className="text-sm text-muted-foreground">{settings.topP}</span>
                      </div>
                      <Slider
                        value={[settings.topP]}
                        onValueChange={([value]) => updateSettings({ topP: value })}
                        max={1}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Behavior Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Stream Responses</Label>
                        <p className="text-sm text-muted-foreground">
                          Show responses as they're generated
                        </p>
                      </div>
                      <Switch
                        checked={settings.streamResponse}
                        onCheckedChange={(streamResponse) => updateSettings({ streamResponse })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Save Conversations</Label>
                        <p className="text-sm text-muted-foreground">
                          Persist chat history between sessions
                        </p>
                      </div>
                      <Switch
                        checked={settings.saveConversations}
                        onCheckedChange={(saveConversations) => updateSettings({ saveConversations })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Appearance</h2>
                <p className="text-sm text-muted-foreground">
                  Customize the look and feel of your application
                </p>
              </div>

              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Theme Selection
                    </CardTitle>
                    <CardDescription>
                      Choose from multiple theme options to personalize your experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Current Theme</Label>
                        <p className="text-sm text-muted-foreground">
                          Switch between light, dark, and colored themes
                        </p>
                      </div>
                      <ThemeSwitcher />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Label>Theme Preview</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {themes.map((themeOption) => {
                          const ThemeIcon = themeOption.icon
                          const isActive = theme === themeOption.name
                          
                          return (
                            <button
                              key={themeOption.name}
                              onClick={() => setTheme(themeOption.name)}
                              className={`
                                p-3 rounded-lg border transition-all hover:scale-105
                                ${isActive 
                                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
                                  : 'border-border bg-card hover:border-primary/40'
                                }
                              `}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <ThemeIcon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {themeOption.label}
                                </span>
                                {isActive && (
                                  <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: themeOption.activeColor }}
                                  />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Theme Features</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>Automatic system detection</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>Smooth color transitions</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>Multiple color schemes</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>Persistent theme settings</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Display Preferences</CardTitle>
                    <CardDescription>
                      Adjust visual settings for better accessibility
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Reduce Motion</Label>
                        <p className="text-sm text-muted-foreground">
                          Minimize animations and transitions
                        </p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>High Contrast</Label>
                        <p className="text-sm text-muted-foreground">
                          Increase contrast for better visibility
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        </div>
      </div>
    </TooltipProvider>
  )
} 