"use client"

import { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Bot, 
  Star, 
  Key, 
  Home, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle
} from "lucide-react"
import { useAIStore } from "@/lib/stores/ai-store"
import { aiService } from "@/lib/services/ai-service"
import { EmbeddingService } from "@/lib/services/embedding-service"
import { useToast } from "@/hooks/use-toast"

interface OnboardingDialogProps {
  open: boolean
  onClose: () => void
}

type OnboardingStep = 'welcome' | 'ai-setup' | 'success'

export function OnboardingDialog({ open, onClose }: OnboardingDialogProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  
  const { addProvider, providers, setActiveProvider, setActiveModel } = useAIStore()
  const { toast } = useToast()

  const resetState = () => {
    setStep('welcome')
    setSelectedProvider('')
    setApiKey('')
    setIsLoading(false)
    setTestResult(null)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId)
    setApiKey('')
    setTestResult(null)
  }

  const handleSetupProvider = async () => {
    if (!selectedProvider) return
    
    setIsLoading(true)
    setTestResult(null)

    try {
      // Check if provider already exists
      const existingProvider = providers.find(p => p.type === selectedProvider)
      let providerId = existingProvider?.id

      if (!existingProvider) {
        // Add new provider
        const newProvider = {
          name: getProviderName(selectedProvider),
          type: selectedProvider as any,
          baseUrl: getProviderBaseUrl(selectedProvider),
          enabled: true,
          models: []
        }
        
        addProvider(newProvider)
        // Find the newly added provider
        const updatedProviders = providers.filter(p => p.type === selectedProvider)
        providerId = updatedProviders[updatedProviders.length - 1]?.id
      }

      // Store API key if provided
      if (apiKey && providerId) {
        await aiService.storeApiKey(providerId, apiKey)
      }

      // Test connection
      const testProvider = {
        id: providerId!,
        name: getProviderName(selectedProvider),
        type: selectedProvider as any,
        baseUrl: getProviderBaseUrl(selectedProvider),
        enabled: true,
        models: [],
        apiKey: apiKey || undefined
      }

      const success = await aiService.testConnection(testProvider)
      
      if (success) {
        setTestResult(true)
        
        // Set as active provider
        setActiveProvider(providerId!)
        
        // Try to set a default model if available
        if (existingProvider?.models && existingProvider.models.length > 0) {
          setActiveModel(existingProvider.models[0].id)
        }
        
        // 🔥 NEW: Auto-configure OpenAI embeddings with the same API key
        if (selectedProvider === 'openai' && apiKey) {
          try {
            const embeddingService = EmbeddingService.getInstance()
            await embeddingService.configure({
              provider: 'openai',
              model: 'text-embedding-3-small', // Modern, efficient OpenAI embedding model
              apiKey: apiKey
            })
            
            console.log('✅ OpenAI embeddings configured automatically')
          } catch (embeddingError) {
            console.warn('⚠️ Failed to configure OpenAI embeddings:', embeddingError)
            // Don't fail the whole onboarding if embeddings fail
          }
        }
        
        toast({
          title: "AI Provider Connected!",
          description: `Successfully connected to ${getProviderName(selectedProvider)}${selectedProvider === 'openai' ? ' with smart search!' : ''}`,
        })
        
        // Move to success step
        setTimeout(() => {
          setStep('success')
        }, 1000)
      } else {
        setTestResult(false)
        toast({
          title: "Connection Failed",
          description: "Please check your settings and try again",
          variant: "destructive",
        })
      }
    } catch (error) {
      setTestResult(false)
      toast({
        title: "Setup Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getProviderName = (type: string): string => {
    switch (type) {
      case 'openai': return 'OpenAI'
      case 'ollama': return 'Ollama'
      case 'anthropic': return 'Anthropic'
      default: return 'Custom'
    }
  }

  const getProviderBaseUrl = (type: string): string => {
    switch (type) {
      case 'openai': return 'https://api.openai.com/v1'
      case 'ollama': return 'http://localhost:11434'
      case 'anthropic': return 'https://api.anthropic.com'
      default: return ''
    }
  }

  const getStepProgress = (): number => {
    switch (step) {
      case 'welcome': return 0
      case 'ai-setup': return 50
      case 'success': return 100
      default: return 0
    }
  }

  const requiresApiKey = (type: string): boolean => {
    return type === 'openai' || type === 'anthropic'
  }

  const canProceed = (): boolean => {
    if (!selectedProvider) return false
    if (requiresApiKey(selectedProvider) && !apiKey.trim()) return false
    return true
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Welcome to Stellar
          </DialogTitle>
          <DialogDescription>
            Let's get you set up in just a few steps
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {step === 'welcome' ? 1 : step === 'ai-setup' ? 2 : 3} of 3</span>
              <span>{getStepProgress()}%</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>

          {/* Step Content */}
          {step === 'welcome' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Sparkles className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Your AI-Powered Study Companion</h3>
                <p className="text-sm text-muted-foreground">
                  Stellar helps you chat with your documents, find information instantly, 
                  and generate flashcards automatically using AI.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="space-y-1">
                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">Chat with PDFs</p>
                </div>
                <div className="space-y-1">
                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">Smart Search</p>
                </div>
                <div className="space-y-1">
                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">Auto Flashcards</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep('ai-setup')}>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 'ai-setup' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Choose Your AI Provider
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select how you'd like to power your AI conversations:
                </p>
              </div>

              <div className="space-y-3">
                {/* OpenAI Option */}
                <Card 
                  className={`relative cursor-pointer transition-all ${
                    selectedProvider === 'openai' 
                      ? 'ring-2 ring-primary' 
                      : ''
                  }`}
                  onClick={() => handleProviderSelect('openai')}
                >
                  <Badge variant="secondary" className="absolute top-2 right-2">Recommended</Badge>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Key className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="font-medium">OpenAI</h4>
                          <p className="text-sm text-muted-foreground">Free, private, runs on your computer</p>
                          <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded flex items-center gap-2">
                            <Star className="h-4 w-4 text-primary" /> Smart search included
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ollama Option */}
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedProvider === 'ollama' 
                      ? 'ring-2 ring-primary' 
                      : ''
                  }`}
                  onClick={() => handleProviderSelect('ollama')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Home className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="font-medium">Ollama (Local)</h4>
                          <p className="text-sm text-muted-foreground">Free, private, runs on your computer</p>
                          <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />  Requires Ollama to be installed
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">Free</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Anthropic Option */}
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedProvider === 'anthropic' 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleProviderSelect('anthropic')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Shield className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Anthropic</h4>
                        <p className="text-sm text-muted-foreground">Alternative option, requires API key</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* API Key Input */}
              {selectedProvider && requiresApiKey(selectedProvider) && (
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key is stored securely and never shared.
                  </p>
                </div>
              )}

              {/* Ollama Setup Instructions */}
              {selectedProvider === 'ollama' && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    Need to install Ollama?
                  </p>
                  <p className="text-xs text-blue-700">
                    Download from{' '}
                    <a 
                      href="https://ollama.ai" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      ollama.ai
                    </a>
                    {' '}and run: <code className="bg-white px-1 rounded">ollama pull llama2</code>
                  </p>
                </div>
              )}

              {/* Test Result */}
              {testResult !== null && (
                <div className={`p-3 rounded-lg border ${
                  testResult 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <p className={`text-sm font-medium ${
                      testResult ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {testResult ? 'Connection successful!' : 'Connection failed'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('welcome')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  onClick={handleSetupProvider}
                  disabled={!canProceed() || isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? 'Testing...' : 'Continue'}
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">You're All Set!</h3>
                  <p className="text-sm text-muted-foreground">
                    Stellar is ready to supercharge your learning experience.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">What you can do now:</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Upload PDFs and chat with them using AI</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>
                      Search your documents intelligently
                      {selectedProvider === 'openai' && <span className="text-primary font-medium"> (already configured!)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Generate flashcards automatically</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>💡 Pro tip:</strong> {selectedProvider === 'openai' 
                    ? 'Your semantic search is already configured! Try uploading a PDF and asking questions about it.' 
                    : 'Visit Settings later to enable semantic search for even smarter document discovery!'}
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleClose}>
                  Start Using Stellar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 