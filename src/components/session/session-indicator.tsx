"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { 
  Play, 
  Square, 
  Clock, 
  BookOpen, 
  BarChart3,
  Settings,
  Zap
} from "lucide-react"
import { useActionsStore, StudySession } from "@/lib/services/actions-service"
import { useToast } from "@/hooks/use-toast"
import { SmartSessionDialog } from "./smart-session-dialog"

export function SessionIndicator() {
  const { 
    currentSessionId, 
    getCurrentSession, 
    startNewSession, 
    endCurrentSession,
    isLoading 
  } = useActionsStore()
  
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null)
  const [sessionDuration, setSessionDuration] = useState<string>("0m")
  const [isStartingSession, setIsStartingSession] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState("")
  const [newSessionType, setNewSessionType] = useState("mixed")
  
  const { toast } = useToast()

  // Update session data when currentSessionId changes
  useEffect(() => {
    const loadCurrentSession = async () => {
      if (currentSessionId) {
        try {
          const session = await getCurrentSession()
          setCurrentSession(session)
        } catch (error) {
          console.error('Failed to load current session:', error)
        }
      } else {
        setCurrentSession(null)
      }
    }
    
    loadCurrentSession()
  }, [currentSessionId])

  // Update session duration every minute
  useEffect(() => {
    if (!currentSession || !currentSession.is_active) return

    const updateDuration = () => {
      const startTime = new Date(currentSession.start_time)
      const now = new Date()
      const diffMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60))
      
      if (diffMinutes < 60) {
        setSessionDuration(`${diffMinutes}m`)
      } else {
        const hours = Math.floor(diffMinutes / 60)
        const minutes = diffMinutes % 60
        setSessionDuration(`${hours}h ${minutes}m`)
      }
    }

    updateDuration()
    const interval = setInterval(updateDuration, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [currentSession])

  const handleStartSession = async () => {
    if (!newSessionTitle.trim()) {
      toast({
        title: "Session title required",
        description: "Please enter a title for your study session",
        variant: "destructive"
      })
      return
    }

    setIsStartingSession(true)
    try {
      const session = await startNewSession(newSessionTitle.trim(), newSessionType)
      setCurrentSession(session)
      setNewSessionTitle("")
      setNewSessionType("mixed")
      
      toast({
        title: "Study session started",
        description: `Started "${session.title}" session`
      })
    } catch (error) {
      console.error('Failed to start session:', error)
      toast({
        title: "Failed to start session",
        description: "There was an error starting your study session",
        variant: "destructive"
      })
    } finally {
      setIsStartingSession(false)
    }
  }

  const handleEndSession = async () => {
    if (!currentSession) return

    try {
      const success = await endCurrentSession()
      if (success) {
        setCurrentSession(null)
        toast({
          title: "Study session ended",
          description: `Ended "${currentSession.title}" session`
        })
      }
    } catch (error) {
      console.error('Failed to end session:', error)
      toast({
        title: "Failed to end session",
        description: "There was an error ending your study session",
        variant: "destructive"
      })
    }
  }

  // Quick start session with generated title
  const handleQuickStart = async () => {
    const now = new Date()
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const defaultTitle = `Study Session - ${timeString}`
    
    setIsStartingSession(true)
    try {
      const session = await startNewSession(defaultTitle, "mixed")
      setCurrentSession(session)
      
      toast({
        title: "Quick session started",
        description: `Started "${session.title}"`
      })
    } catch (error) {
      console.error('Failed to start quick session:', error)
      toast({
        title: "Failed to start session",
        description: "There was an error starting your study session",
        variant: "destructive"
      })
    } finally {
      setIsStartingSession(false)
    }
  }

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case "focused": return <Zap className="h-4 w-4 text-muted-foreground" />
      case "exploratory": return <BookOpen className="h-4 w-4 text-muted-foreground" />
      case "review": return <BarChart3 className="h-4 w-4 text-muted-foreground" />
      default: return <Settings className="h-4 w-4 text-muted-foreground" />
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

  if (currentSession && currentSession.is_active) {
    // Active session indicator
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <Clock className="h-3 w-3" />
            <span className="font-medium">{sessionDuration}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Active Study Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{currentSession.title}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getSessionTypeColor(currentSession.session_type)}`}
                  >
                    {getSessionTypeIcon(currentSession.session_type)}
                    <span className="ml-1 capitalize">{currentSession.session_type}</span>
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Started: {new Date(currentSession.start_time).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Duration: {sessionDuration}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={handleEndSession}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Square className="h-3 w-3 mr-1" />
                  End Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    )
  }

  // No active session - show start controls
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
        >
          <Play className="h-3 w-3" />
          <span>Start Session</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="center">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold leading-none tracking-tight">Start Study Session</h3>
            <p className="text-sm text-muted-foreground">Configure your study session settings</p>
          </div>

          {/* Session Title */}
          <div className="space-y-2">
            <Label htmlFor="session-title" className="text-sm font-medium">
              Session Title
            </Label>
            <Input
              id="session-title"
              placeholder="Enter session title..."
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Session Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Session Type</Label>
            <Select value={newSessionType} onValueChange={setNewSessionType}>
              <SelectTrigger className="h-11">
                <div className="flex items-center gap-2">
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Mixed Study
                  </div>
                </SelectItem>
                <SelectItem value="focused">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Focused Study
                  </div>
                </SelectItem>
                <SelectItem value="exploratory">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Exploratory Learning
                  </div>
                </SelectItem>
                <SelectItem value="review">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Review Session
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleQuickStart}
              disabled={isStartingSession}
              className="flex-1 h-11 gap-2 bg-transparent"
            >
              <Zap className="h-4 w-4" />
              Quick Start
            </Button>
            <Button 
              onClick={handleStartSession}
              disabled={isStartingSession || !newSessionTitle.trim()}
              className="flex-1 h-11 gap-2"
            >
              <Play className="h-4 w-4" />
              Start Session
            </Button>
          </div>

          <Separator />

          {/* Smart Session */}
          <SmartSessionDialog />
        </div>
      </PopoverContent>
    </Popover>
  )
} 