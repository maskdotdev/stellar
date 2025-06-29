"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Clock, 
  Search, 
  Calendar, 
  Play, 
  BarChart3, 
  Settings, 
  Zap,
  RefreshCw,
  ChevronRight,
  Activity,
  FileText,
  MessageSquare,
  BookOpen,
} from "lucide-react"
import { useActionsStore, StudySession, UserAction } from "@/lib/actions-service"
import { useToast } from "@/hooks/use-toast"

export function SessionsManagement() {
  const { 
    startNewSession, 
    getActionsBySession,
    getStudySessions,
  } = useActionsStore()
  
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [filteredSessions, setFilteredSessions] = useState<StudySession[]>([])
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [sessionActions, setSessionActions] = useState<UserAction[]>([])
  
  const { toast } = useToast()

  // Load sessions on component mount
  useEffect(() => {
    loadSessions()
  }, [])

  // Filter sessions when search or filters change
  useEffect(() => {
    let filtered = [...sessions]
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(session => 
        session.title.toLowerCase().includes(query)
      )
    }
    
    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter(session => session.session_type === filterType)
    }
    
    // Status filter
    if (filterStatus !== "all") {
      if (filterStatus === "active") {
        filtered = filtered.filter(session => session.is_active)
      } else {
        filtered = filtered.filter(session => !session.is_active)
      }
    }
    
    // Sort by start time (newest first)
    filtered.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    
    setFilteredSessions(filtered)
  }, [sessions, searchQuery, filterType, filterStatus])

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      const sessionData = await getStudySessions()
      setSessions(sessionData)
    } catch (error) {
      console.error('Failed to load sessions:', error)
      toast({
        title: "Failed to load sessions",
        description: "There was an error loading your study sessions",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadSessionActions = async (sessionId: string) => {
    try {
      const actions = await getActionsBySession(sessionId)
      setSessionActions(actions)
    } catch (error) {
      console.error('Failed to load session actions:', error)
      setSessionActions([])
    }
  }

  const handleSessionSelect = (session: StudySession) => {
    setSelectedSession(session)
    loadSessionActions(session.id)
  }

  const handleResumeSession = async (session: StudySession) => {
    try {
      const newTitle = `${session.title} (Resumed)`
      const newSession = await startNewSession(newTitle, session.session_type)
      
      toast({
        title: "Session resumed",
        description: `Started new session: "${newSession.title}"`
      })
      
      // Refresh sessions list
      loadSessions()
    } catch (error) {
      console.error('Failed to resume session:', error)
      toast({
        title: "Failed to resume session",
        description: "There was an error resuming your study session",
        variant: "destructive"
      })
    }
  }

  const formatSessionTime = (session: StudySession) => {
    const startTime = new Date(session.start_time)
    
    if (session.is_active) {
      const now = new Date()
      const diffMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60))
      
      if (diffMinutes < 60) {
        return `${diffMinutes}m (active)`
      } else {
        const hours = Math.floor(diffMinutes / 60)
        const minutes = diffMinutes % 60
        return `${hours}h ${minutes}m (active)`
      }
    }
    
    if (session.end_time) {
      const endTime = new Date(session.end_time)
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))
      
      if (duration < 60) {
        return `${duration}m`
      } else {
        const hours = Math.floor(duration / 60)
        const minutes = duration % 60
        return `${hours}h ${minutes}m`
      }
    }
    
    return "Unknown duration"
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

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "DOCUMENT_VIEW":
      case "DOCUMENT_UPLOAD":
        return <FileText className="h-4 w-4" />
      case "CHAT_START":
      case "CHAT_MESSAGE":
        return <MessageSquare className="h-4 w-4" />
      case "SEARCH_QUERY":
        return <Search className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading sessions...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Study Sessions</h1>
          <p className="text-muted-foreground">
            Track and manage your study sessions
          </p>
        </div>
        <Button onClick={loadSessions} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="mixed">Mixed Study</SelectItem>
            <SelectItem value="focused">Focused Study</SelectItem>
            <SelectItem value="exploratory">Exploratory Learning</SelectItem>
            <SelectItem value="review">Review Session</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="active">Active Sessions</SelectItem>
            <SelectItem value="completed">Completed Sessions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sessions ({filteredSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {sessions.length === 0 ? "No study sessions yet" : "No sessions match your filters"}
                  </div>
                ) : (
                  filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedSession?.id === session.id
                          ? "bg-accent border-accent-foreground/20"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => handleSessionSelect(session)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate mb-1">
                            {session.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(session.start_time).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getSessionTypeColor(session.session_type)}`}
                          >
                            {getSessionTypeIcon(session.session_type)}
                            <span className="ml-1 capitalize">{session.session_type}</span>
                          </Badge>
                          {session.is_active && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Duration: {formatSessionTime(session)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Session Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Session Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSession ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">{selectedSession.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(selectedSession.start_time).toLocaleString()}
                      {selectedSession.end_time && (
                        <>
                          {" - "}
                          {new Date(selectedSession.end_time).toLocaleString()}
                        </>
                      )}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={getSessionTypeColor(selectedSession.session_type)}
                    >
                      {getSessionTypeIcon(selectedSession.session_type)}
                      <span className="ml-1 capitalize">{selectedSession.session_type}</span>
                    </Badge>
                  </div>
                  {!selectedSession.is_active && (
                    <Button
                      size="sm"
                      onClick={() => handleResumeSession(selectedSession)}
                      className="shrink-0"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Resume
                    </Button>
                  )}
                </div>

                {/* Session Statistics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-lg font-semibold">{formatSessionTime(selectedSession)}</div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-lg font-semibold">{sessionActions.length}</div>
                    <div className="text-xs text-muted-foreground">Actions</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-lg font-semibold">
                      {selectedSession.documents_accessed && typeof selectedSession.documents_accessed === 'string' 
                        ? JSON.parse(selectedSession.documents_accessed).length 
                        : Array.isArray(selectedSession.documents_accessed) 
                          ? selectedSession.documents_accessed.length 
                          : 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Documents</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-lg font-semibold">
                      {selectedSession.conversation_ids && typeof selectedSession.conversation_ids === 'string'
                        ? JSON.parse(selectedSession.conversation_ids).length
                        : Array.isArray(selectedSession.conversation_ids)
                          ? selectedSession.conversation_ids.length
                          : 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Conversations</div>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Activity Timeline
                  </h4>
                                     <ScrollArea className="h-48">
                     <div className="space-y-3">
                       {sessionActions && sessionActions.length > 0 ? (
                         sessionActions.map((action: UserAction) => (
                           <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                             <div className="p-2 rounded-lg bg-background border">
                               {getActionIcon(action.action_type)}
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between mb-1">
                                 <span className="text-sm font-medium">
                                   {action.action_type.replace(/_/g, ' ').toLowerCase()
                                     .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                 </span>
                                 <time className="text-xs text-muted-foreground">
                                   {new Date(action.timestamp).toLocaleTimeString([], {
                                     hour: '2-digit',
                                     minute: '2-digit'
                                   })}
                                 </time>
                               </div>
                               {action.data && typeof action.data === 'object' && (
                                 <div className="text-xs text-muted-foreground">
                                   {(action.data as any).title || (action.data as any).query || 'Activity recorded'}
                                 </div>
                               )}
                             </div>
                           </div>
                         ))
                       ) : (
                         <div className="text-center py-8 text-muted-foreground text-sm">
                           No activity recorded for this session
                         </div>
                       )}
                     </div>
                   </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a session to view details</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 