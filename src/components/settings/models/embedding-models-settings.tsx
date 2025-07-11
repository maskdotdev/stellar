"use client"

import { useState, useEffect } from "react"
import { Settings, TestTube, CheckCircle, XCircle, RefreshCw, Zap, Eye, EyeOff, Bug, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EmbeddingService, type EmbeddingConfig } from "@/lib/services/embedding-service"
import { useToast } from "@/hooks/use-toast"
import { EmbeddingDebug } from "./embedding-debug"

interface EmbeddingProvider {
  id: string
  name: string
  description: string
  models: string[]
  requiresApiKey: boolean
  supportsCustomUrl: boolean
  defaultUrl?: string
}

const EMBEDDING_PROVIDERS: EmbeddingProvider[] = [
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run embedding models locally with Ollama - good balance of privacy and quality',
    models: ['all-minilm', 'mxbai-embed-large', 'nomic-embed-text'],
    requiresApiKey: false,
    supportsCustomUrl: true,
    defaultUrl: 'http://localhost:11434'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'High-quality embeddings from OpenAI (requires API key)',
    models: ['text-embedding-ada-002', 'text-embedding-3-small', 'text-embedding-3-large'],
    requiresApiKey: true,
    supportsCustomUrl: false
  },
  {
    id: 'openai-compatible',
    name: 'OpenAI Compatible',
    description: 'Custom OpenAI-compatible endpoints (requires API key and base URL)',
    models: ['text-embedding-ada-002', 'text-embedding-3-small', 'text-embedding-3-large', 'custom-model'],
    requiresApiKey: true,
    supportsCustomUrl: true,
    defaultUrl: 'https://api.your-provider.com/v1'
  }
]

export function EmbeddingModelsSettings() {
  const [embeddingService] = useState(() => EmbeddingService.getInstance())
  const { toast } = useToast()
  const [config, setConfig] = useState<EmbeddingConfig>({
    provider: 'ollama',
    model: 'all-minilm',
    baseUrl: 'http://localhost:11434'
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCurrentConfig()
    loadStats()
  }, [])

  const loadCurrentConfig = async () => {
    // In a real implementation, this would load from settings store
    // For now, we'll use the service's current state
    setInitialized(embeddingService.isInitialized())
  }

  const loadStats = async () => {
    try {
      if (embeddingService.isInitialized()) {
        const serviceStats = await embeddingService.getStats()
        setStats(serviceStats)
      }
    } catch (error) {
      console.warn("Could not load embedding stats:", error)
    }
  }

  const handleProviderChange = (providerId: string) => {
    const provider = EMBEDDING_PROVIDERS.find(p => p.id === providerId)
    if (provider) {
      setConfig(prev => ({
        ...prev,
        provider: providerId as any,
        model: provider.models[0],
        baseUrl: provider.defaultUrl || prev.baseUrl,
        apiKey: provider.requiresApiKey ? prev.apiKey : undefined
      }))
      setTestResult(null) // Reset test result when provider changes
    }
  }

  const handleApplyConfig = async () => {
    setLoading(true)
    
    // Validate configuration
    const currentProvider = EMBEDDING_PROVIDERS.find(p => p.id === config.provider)
    if (currentProvider?.requiresApiKey && !config.apiKey?.trim()) {
      toast({
        title: "API Key Required",
        description: `${currentProvider.name} requires an API key to function.`,
        variant: "destructive",
      })
      setLoading(false)
      return
    }
    
    toast({
      title: "Configuring Embeddings",
      description: `Setting up ${currentProvider?.name} with model ${config.model}...`,
    })
    
    try {
      const success = await embeddingService.configure(config)
      if (success) {
        setInitialized(true)
        await loadStats()
        setTestResult(true)
        toast({
          title: "Configuration Applied",
          description: `Successfully configured ${currentProvider?.name} embeddings. Semantic search is now active!`,
        })
      } else {
        setTestResult(false)
        toast({
          title: "Configuration Failed",
          description: "Could not apply embedding configuration. Check your settings and try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to configure embedding service:", error)
      setTestResult(false)
      toast({
        title: "Configuration Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!initialized) {
      toast({
        title: "Not Configured",
        description: "Please apply a configuration before testing the connection.",
        variant: "destructive",
      })
      return
    }
    
    setTesting(true)
    toast({
      title: "Testing Connection",
      description: "Checking embedding service connectivity...",
    })
    
    try {
      const success = await embeddingService.healthCheck()
      setTestResult(success)
      
      if (success) {
        toast({
          title: "Connection Successful",
          description: "Embedding service is working correctly!",
        })
      } else {
        toast({
          title: "Connection Failed",
          description: "Could not connect to embedding service. Check your configuration.",
          variant: "destructive",
        })
      }
    } catch (error) {
      setTestResult(false)
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const currentProvider = EMBEDDING_PROVIDERS.find(p => p.id === config.provider)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Embedding Models</h3>
          <p className="text-sm text-muted-foreground">
            Configure models for semantic search and document understanding
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={initialized ? "default" : "secondary"}>
            {initialized ? "Active" : "Not Configured"}
          </Badge>
          {testResult === true && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {testResult === false && (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>

      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configuration" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Configuration</span>
          </TabsTrigger>
          <TabsTrigger value="debug" className="flex items-center space-x-2">
            <Bug className="w-4 h-4" />
            <span>Debug</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Embedding Configuration</span>
          </CardTitle>
          <CardDescription>
            Choose your embedding provider and model for semantic search capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>Embedding Provider</Label>
            <Select value={config.provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMBEDDING_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex flex-col">
                      <span>{provider.name}</span>
                      <span className="text-xs text-muted-foreground">{provider.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          {currentProvider && (
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={config.model} onValueChange={(model) => setConfig(prev => ({ ...prev, model }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentProvider.models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* API Key (if required) */}
          {currentProvider?.requiresApiKey && (
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex space-x-2">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter your API key"
                  value={config.apiKey || ""}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showApiKey ? "Hide API key" : "Show API key"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {currentProvider.requiresApiKey && !config.apiKey?.trim() && (
                <p className="text-sm text-red-600">API key is required for {currentProvider.name}</p>
              )}
            </div>
          )}

          {/* Custom URL (if supported) */}
          {currentProvider?.supportsCustomUrl && (
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                placeholder={currentProvider.defaultUrl}
                value={config.baseUrl || ""}
                onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use default: {currentProvider.defaultUrl}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-4">
            <Button onClick={handleApplyConfig} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Applying..." : "Apply Configuration"}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTestConnection} 
              disabled={testing || !initialized}
            >
              <TestTube className={`w-4 h-4 mr-2 ${testing ? 'animate-pulse' : ''}`} />
              {testing ? "Testing..." : "Test Connection"}
            </Button>
          </div>

          {/* Status Messages */}
          {!initialized && (
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Getting Started:</strong> Choose a provider and click "Apply Configuration" to enable semantic search.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Embedding Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Total Documents</p>
                <p className="text-2xl font-bold">{stats.total_documents}</p>
                <p className="text-xs text-muted-foreground">Indexed for search</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Text Chunks</p>
                <p className="text-2xl font-bold">{stats.total_chunks}</p>
                <p className="text-xs text-muted-foreground">Embedded vectors</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Provider</p>
                <div className="flex items-center space-x-2">
                  <Badge variant={stats.provider === 'rust-bert' ? 'secondary' : 'outline'}>
                    {stats.provider}
                  </Badge>
                  {stats.provider === 'rust-bert' && (
                    <span className="text-xs text-yellow-600">⚠️ Fallback</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.provider === 'rust-bert' 
                    ? 'Using basic fallback embeddings' 
                    : 'Current embedding service'
                  }
                </p>
              </div>
            </div>

            {stats.provider === 'rust-bert' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Using Fallback Provider</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      The system is using a basic fallback for embeddings. 
                      For better semantic search quality, consider setting up Ollama or providing an OpenAI API key.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Embedding Models</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Embedding models convert text into numerical vectors that capture semantic meaning. 
            This enables features like:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Semantic document search - find relevant content based on meaning, not just keywords</li>
            <li>Document context for AI chat - automatically find relevant documents for queries</li>
            <li>Similarity detection - identify related documents and content</li>
          </ul>
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Recommendation:</strong> Ollama provides a good balance of quality and privacy 
              for most users. OpenAI offers the highest quality but requires an API key and sends data externally.
            </p>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="debug" className="space-y-6">
          <EmbeddingDebug />
        </TabsContent>
      </Tabs>
    </div>
  )
} 