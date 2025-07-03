"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Brain, 
  Zap, 
  BookOpen, 
  BarChart3, 
  Settings, 
  TrendingUp,
  Lightbulb,
  Play,
  RefreshCw,
  Star
} from "lucide-react"
import { useActionsStore, UserAction } from "@/lib/actions-service"
import { SessionSuggestion } from "@/lib/session-detection-service"
import { useToast } from "@/hooks/use-toast"

export function SmartSessionDialog() {
  const { 
    startSmartSession, 
    getRecentActions,
    autoDetectSessionsFromActions,
    getActionStats,
    currentSessionId,
    isLoading
  } = useActionsStore()
  
  const [isOpen, setIsOpen] = useState(false)
  const [sessionSuggestions, setSessionSuggestions] = useState<SessionSuggestion[]>([])
  const [_recentActions, setRecentActions] = useState<UserAction[]>([])
  const [insights, setInsights] = useState<{
    totalActions: number
    sessionsCount: number
    averageSessionDuration: number
    actionsByType: Record<string, number>
  } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadSessionInsights()
    }
  }, [isOpen])

  const loadSessionInsights = async () => {
    try {
      setIsGenerating(true)
      
      // Load recent actions
      const actions = await getRecentActions(100)
      setRecentActions(actions)
      
      // Get session suggestions from recent actions
      if (actions.length > 0) {
        const suggestions = await autoDetectSessionsFromActions(actions)
        setSessionSuggestions(suggestions.slice(0, 5)) // Show top 5 suggestions
      }
      
      // Load action statistics
      const stats = await getActionStats()
      setInsights({
        totalActions: stats.total_actions,
        sessionsCount: stats.sessions_count,
        averageSessionDuration: stats.average_session_duration / 60, // Convert to minutes
        actionsByType: stats.actions_by_type
      })
      
    } catch (error) {
      console.error('Failed to load session insights:', error)
      toast({
        title: "Failed to load insights",
        description: "There was an error loading your session insights",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartSmartSession = async () => {
    try {
      const session = await startSmartSession()
      
             toast({
         title: "Smart session started",
         description: `Started "${session.title}" with intelligent pattern-based settings`
       })
      
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to start smart session:', error)
      toast({
        title: "Failed to start session",
        description: "There was an error starting your smart session",
        variant: "destructive"
      })
    }
  }

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case "focused": return <Zap className="h-4 w-4" />
      case "exploratory": return <BookOpen className="h-4 w-4" />
      case "review": return <BarChart3 className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const getSessionTypeColor = (type: string) => {
    switch (type) {
      case "focused": return "bg-orange-500/10 text-orange-700 border-orange-200"
      case "exploratory": return "bg-blue-500/10 text-blue-700 border-blue-200"
      case "review": return "bg-green-500/10 text-green-700 border-green-200"
      default: return "bg-purple-500/10 text-purple-700 border-purple-200"
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600"
    if (confidence >= 0.6) return "text-yellow-600"
    return "text-gray-600"
  }

  const getMostCommonActionType = () => {
    if (!insights?.actionsByType) return "No data"
    
    const sortedTypes = Object.entries(insights.actionsByType)
      .sort(([,a], [,b]) => b - a)
    
    if (sortedTypes.length === 0) return "No data"
    
    const [type] = sortedTypes[0]
    return type.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, (l: string) => l.toUpperCase())
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full h-11 gap-2 bg-transparent"
          disabled={!!currentSessionId}
        >
          <Brain className="h-4 w-4" />
          Smart Session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Smart Session Assistant
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Quick Start */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Start
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                                     <p className="text-sm text-muted-foreground">
                     Start an intelligent study session based on your recent activity patterns.
                   </p>
                  <Button 
                    onClick={handleStartSmartSession}
                    disabled={isLoading || isGenerating}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Smart Session
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Session Suggestions */}
            {sessionSuggestions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Suggested Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sessionSuggestions.map((suggestion, index) => (
                      <div key={index} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{suggestion.suggestedTitle}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {suggestion.reasoning}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getSessionTypeColor(suggestion.suggestedType)}`}
                            >
                              {getSessionTypeIcon(suggestion.suggestedType)}
                              <span className="ml-1 capitalize">{suggestion.suggestedType}</span>
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Star className={`h-3 w-3 ${getConfidenceColor(suggestion.confidence)}`} />
                              <span className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                                {Math.round(suggestion.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Study Insights */}
            {insights && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Your Study Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="text-lg font-semibold">{insights.totalActions}</div>
                      <div className="text-xs text-muted-foreground">Total Actions</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="text-lg font-semibold">{insights.sessionsCount}</div>
                      <div className="text-xs text-muted-foreground">Study Sessions</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="text-lg font-semibold">
                        {Math.round(insights.averageSessionDuration)}m
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Session Length</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="text-lg font-semibold">
                        {getMostCommonActionType()}
                      </div>
                      <div className="text-xs text-muted-foreground">Top Activity</div>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recent Activity Breakdown</h4>
                    {Object.entries(insights.actionsByType)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 3)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {type.replace(/_/g, ' ').toLowerCase()
                              .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {isGenerating && (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Analyzing your study patterns...
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 