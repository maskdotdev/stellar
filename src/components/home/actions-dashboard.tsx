"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

import { 
  Activity, 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Search, 
  BookOpen,
  Brain,
  Calendar,
  TrendingUp,
  RefreshCw
} from "lucide-react"
import { useActionsStore, ActionType, ActionsService, UserAction, ActionStats } from "@/lib/services/actions-service"
import { useState, useEffect } from "react"

export function ActionsDashboard() {
  const { getActionStats, getRecentActions, currentSessionId } = useActionsStore()
  const actionsService = ActionsService.getInstance()
  
  const [stats, setStats] = useState<ActionStats>({
    total_actions: 0,
    actions_by_type: {},
    sessions_count: 0,
    documents_accessed: 0,
    average_session_duration: 0,
  })
  const [recentActions, setRecentActions] = useState<UserAction[]>([])
  const [todayInsights, setTodayInsights] = useState({
    totalStudyTime: 0,
    mostActiveHours: [] as number[],
    documentsStudied: [] as string[],
    topCategories: [] as string[],
    studyStreak: 0,
    averageSessionLength: 0,
    totalActions: 0,
    sessionsCount: 0
  })
  const [dataLoading, setDataLoading] = useState(true)
  
  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true)
      try {
        const [statsData, actionsData, insightsData] = await Promise.all([
          getActionStats(),
          getRecentActions(20),
          actionsService.getStudyInsights()
        ])
        
        setStats(statsData)
        setRecentActions(actionsData)
        setTodayInsights(insightsData)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setDataLoading(false)
      }
    }
    
    loadData()
  }, [])

  const refreshData = async () => {
    const loadData = async () => {
      setDataLoading(true)
      try {
        const [statsData, actionsData, insightsData] = await Promise.all([
          getActionStats(),
          getRecentActions(20),
          actionsService.getStudyInsights()
        ])
        
        setStats(statsData)
        setRecentActions(actionsData)
        setTodayInsights(insightsData)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setDataLoading(false)
      }
    }
    
    await loadData()
  }
  
  const getActionIcon = (type: string) => {
    switch (type) {
      case ActionType.DOCUMENT_VIEW:
      case ActionType.DOCUMENT_UPLOAD:
        return <FileText className="h-4 w-4" />
      case ActionType.CHAT_MESSAGE:
      case ActionType.CHAT_START:
        return <MessageSquare className="h-4 w-4" />
      case ActionType.DOCUMENT_HIGHLIGHT:
        return <BookOpen className="h-4 w-4" />
      case ActionType.SEARCH_QUERY:
        return <Search className="h-4 w-4" />
      case ActionType.NOTE_CREATE:
      case ActionType.NOTE_EDIT:
        return <Brain className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }
  
  const getActionColor = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case ActionType.DOCUMENT_VIEW:
      case ActionType.DOCUMENT_UPLOAD:
        return "default"
      case ActionType.CHAT_MESSAGE:
      case ActionType.CHAT_START:
        return "outline"
      case ActionType.DOCUMENT_HIGHLIGHT:
        return "outline"
      case ActionType.SEARCH_QUERY:
        return "secondary"
      case ActionType.NOTE_CREATE:
      case ActionType.NOTE_EDIT:
        return "default"
      default:
        return "secondary"
    }
  }
  
  const formatActionDescription = (action: UserAction) => {
    const data = action.data
    switch (action.action_type) {
      case ActionType.DOCUMENT_VIEW:
        return `Viewed "${data.documentTitle || 'document'}"`
      case ActionType.DOCUMENT_UPLOAD:
        return `Uploaded "${data.documentTitle || 'document'}"`
      case ActionType.DOCUMENT_HIGHLIGHT:
        return `Highlighted text in "${data.documentTitle || 'document'}"`
      case ActionType.CHAT_MESSAGE:
        return `Sent message (${data.documentsReferenced?.length || 0} docs referenced)`
      case ActionType.NOTE_CREATE:
        return `Created note "${data.noteTitle || 'note'}"`
      case ActionType.NOTE_EDIT:
        return `Edited note "${data.noteTitle || 'note'}"`
      case ActionType.CATEGORY_CREATE:
        return `Created category "${data.categoryName || 'category'}"`
      case ActionType.SEARCH_QUERY:
        return `Searched for "${data.query || 'query'}"`
      default:
        return `Performed ${action.action_type.replace('_', ' ')}`
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else {
      return `${diffDays}d ago`
    }
  }

  if (dataLoading && !stats.total_actions) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading study activity...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Study Activity Dashboard</h2>
          <p className="text-muted-foreground">
            Track your learning progress and study patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {currentSessionId ? 'Session Active' : 'No Active Session'}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={dataLoading}
          >
            <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_actions}</div>
            <p className="text-xs text-muted-foreground">
              All study activities
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sessions_count}</div>
            <p className="text-xs text-muted-foreground">
              Learning sessions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents Accessed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents_accessed}</div>
            <p className="text-xs text-muted-foreground">
              Unique documents
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayInsights.studyStreak}</div>
            <p className="text-xs text-muted-foreground">
              Days in a row
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Action Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Activity Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.actions_by_type).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {getActionIcon(type)}
                  <span className="text-sm font-medium">
                    {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <Badge variant="secondary">{count as number}</Badge>
              </div>
            ))}
            {Object.keys(stats.actions_by_type).length === 0 && (
              <div className="col-span-full text-center text-muted-foreground p-4">
                No activity data yet. Start studying to see your patterns!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {recentActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {getActionIcon(action.action_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatActionDescription(action)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getActionColor(action.action_type)} className="text-xs">
                          {action.action_type.replace('_', ' ').toLowerCase()
                            .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Session: {action.session_id.slice(0, 8)}...
                        </Badge>
                        {action.duration && (
                          <Badge variant="outline" className="text-xs">
                            {action.duration}s
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(action.timestamp)}
                  </div>
                </div>
              ))}
              {recentActions.length === 0 && (
                <div className="text-center text-muted-foreground p-4">
                  No recent activity found. Start studying to see your actions here!
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Study Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Study Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-2">Study Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Study Time:</span>
                  <span>{Math.round(todayInsights.totalStudyTime / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Session:</span>
                  <span>{Math.round(todayInsights.averageSessionLength / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documents Studied:</span>
                  <span>{todayInsights.documentsStudied.length}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Most Active Hours</h4>
              <div className="flex gap-1">
                {todayInsights.mostActiveHours.length > 0 ? (
                  todayInsights.mostActiveHours.map((hour) => (
                    <Badge key={hour} variant="secondary" className="text-xs">
                      {hour}:00
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No data yet</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs font-mono">
              <div>Current Session: {currentSessionId || 'None'}</div>
              <div>Total Actions: {stats.total_actions}</div>
              <div>Actions by Type: {JSON.stringify(stats.actions_by_type)}</div>
              <div>Recent Actions Count: {recentActions.length}</div>
              <div>Loading: {dataLoading ? 'Yes' : 'No'}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 