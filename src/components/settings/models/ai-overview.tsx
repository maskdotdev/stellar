"use client"

import { useState, useEffect } from "react"
import { Bot, Database, Zap, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAIStore } from "@/lib/stores/ai-store"
import { EmbeddingService } from "@/lib/services/embedding-service"
import { AppInitializationService } from "@/lib/core/app-initialization"
import { useToast } from "@/hooks/use-toast"

interface AIServiceStatus {
  name: string
  status: 'healthy' | 'error' | 'unknown'
  description: string
  icon: React.ReactNode
}

interface AIStats {
  chatModels: number
  activeProvider: string
  embeddingStats: {
    total_chunks: number
    total_documents: number
    provider: string
  } | null
}

export function AIOverview() {
  const { providers, getActiveModel } = useAIStore()
  const { toast } = useToast()
  const [serviceStatuses, setServiceStatuses] = useState<AIServiceStatus[]>([])
  const [stats, setStats] = useState<AIStats>({
    chatModels: 0,
    activeProvider: 'None',
    embeddingStats: null
  })
  const [loading, setLoading] = useState(true)

  const checkServiceHealth = async () => {
    setLoading(true)
    
    const embeddingService = EmbeddingService.getInstance()
    const appInit = AppInitializationService.getInstance()
    
    try {
      // Check initialization status
      const initStatus = await appInit.getInitializationStatus()
      
      // Check embedding service health with proper error handling
      let embeddingHealth = false
      let embeddingStats = null
      let embeddingError = null
      
      if (embeddingService.isInitialized()) {
        try {
          embeddingHealth = await embeddingService.healthCheck()
          embeddingStats = await embeddingService.getStats()
        } catch (error) {
          embeddingError = error instanceof Error ? error.message : 'Unknown error'
          console.warn("Embedding service error:", embeddingError)
        }
      } else {
        embeddingError = "Embedding service not initialized"
      }
      
      // Get active providers
      const activeProviders = providers.filter(p => p.enabled)
      const enabledModels = activeProviders.reduce((sum, p) => sum + p.models.length, 0)
      
      // Determine embedding status
      let embeddingStatus: 'healthy' | 'error' | 'unknown' = 'unknown'
      let embeddingDescription = "Embedding service not configured"
      
      if (embeddingService.isInitialized()) {
        if (embeddingHealth) {
          embeddingStatus = 'healthy'
          embeddingDescription = `Using ${embeddingStats?.provider || 'unknown'} embeddings`
        } else {
          embeddingStatus = 'error'
          embeddingDescription = embeddingError || "Embedding service error"
        }
      }
      
      setServiceStatuses([
        {
          name: "Chat Models",
          status: enabledModels > 0 ? 'healthy' : 'error',
          description: `${enabledModels} models available across ${activeProviders.length} providers`,
          icon: <Bot className="w-4 h-4" />
        },
        {
          name: "Document Library",
          status: initStatus.library ? 'healthy' : 'error',
          description: initStatus.library ? "Library service running" : "Library service unavailable",
          icon: <Database className="w-4 h-4" />
        },
        {
          name: "Semantic Search",
          status: embeddingStatus,
          description: embeddingDescription,
          icon: <Zap className="w-4 h-4" />
        }
      ])
      
      const activeModel = getActiveModel()
      setStats({
        chatModels: enabledModels,
        activeProvider: activeModel?.providerId || 'None',
        embeddingStats
      })
      
    } catch (error) {
      console.error("Failed to check service health:", error)
      toast({
        title: "Service Health Check Failed",
        description: "Unable to check AI service status. Some features may not work correctly.",
        variant: "destructive",
      })
      
      setServiceStatuses([
        {
          name: "Service Check",
          status: 'error',
          description: "Failed to check service status",
          icon: <XCircle className="w-4 h-4" />
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const initializeEmbeddings = async () => {
    const embeddingService = EmbeddingService.getInstance()
    
    toast({
      title: "Initializing Embeddings",
      description: "Setting up semantic search with default configuration...",
    })
    
    try {
      const success = await embeddingService.initialize()
      
      if (success) {
        toast({
          title: "Embeddings Initialized",
          description: "Semantic search is now available! You can configure it in the Embeddings tab.",
        })
        await checkServiceHealth() // Refresh status after initialization
      } else {
        toast({
          title: "Embedding Initialization Failed",
          description: "Could not initialize semantic search. Check if Ollama is running or configure in Embeddings tab.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to initialize embeddings:", error)
      toast({
        title: "Embedding Initialization Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    checkServiceHealth()
  }, [providers, getActiveModel])

  const getStatusColor = (status: AIServiceStatus['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'unknown': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: AIServiceStatus['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />
      case 'unknown': return <AlertCircle className="w-4 h-4 text-yellow-600" />
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">AI Services Overview</h3>
          <p className="text-sm text-muted-foreground">
            Monitor the status and health of your AI services
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkServiceHealth} 
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Service Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {serviceStatuses.map((service) => (
          <Card key={service.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {service.name}
              </CardTitle>
              {service.icon}
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {getStatusIcon(service.status)}
                <span className={`text-sm font-medium ${getStatusColor(service.status)}`}>
                  {service.status === 'healthy' ? 'Healthy' : 
                   service.status === 'error' ? 'Error' : 'Unknown'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {service.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Statistics</CardTitle>
          <CardDescription>
            Overview of your AI configuration and usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Chat Models</p>
              <p className="text-2xl font-bold">{stats.chatModels}</p>
              <p className="text-xs text-muted-foreground">
                Available across all providers
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Active Provider</p>
              <Badge variant="outline" className="text-sm">
                {stats.activeProvider}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Current chat model provider
              </p>
            </div>

            {stats.embeddingStats && (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Indexed Documents</p>
                  <p className="text-2xl font-bold">{stats.embeddingStats.total_documents}</p>
                  <p className="text-xs text-muted-foreground">
                    Ready for semantic search
              </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Text Chunks</p>
                  <p className="text-2xl font-bold">{stats.embeddingStats.total_chunks}</p>
                  <p className="text-xs text-muted-foreground">
                    Embedded for search
                  </p>
                </div>
              </>
            )}
          </div>

          {stats.embeddingStats && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Embedding Provider</span>
                <Badge variant="secondary">
                  {stats.embeddingStats.provider}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.chatModels === 0 && (
            <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-md">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">No chat models available</p>
                <p className="text-xs text-yellow-700">Configure AI providers to enable chat functionality</p>
              </div>
            </div>
          )}
          
          {!stats.embeddingStats && (
            <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-md">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex items-center justify-between w-full">
                <div>
                  <p className="text-sm font-medium text-blue-800">Semantic search not configured</p>
                  <p className="text-xs text-blue-700">Enable embedding models for enhanced document search</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={initializeEmbeddings}
                  className="ml-4"
                >
                  Initialize Now
                </Button>
              </div>
            </div>
          )}
          
          {serviceStatuses.every(s => s.status === 'healthy') && (
            <div className="flex items-start space-x-2 p-3 bg-green-50 rounded-md">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">All systems operational</p>
                <p className="text-xs text-green-700">Your AI services are running smoothly</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 