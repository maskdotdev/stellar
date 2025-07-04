"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  Search,
  Filter,
  Clock,
  Calendar as CalendarIcon,
  FileText,
  MessageSquare,
  Brain,
  BookOpen,
  Activity,
  Eye,
  Edit,
  Plus,
  BarChart3,
  Target,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { useActionsStore, type UserAction, ActionType } from "@/lib/services/actions-service"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils/utils"
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns"

interface HistoryProps {
  className?: string
}

interface ActionFilter {
  type?: ActionType
  sessionId?: string
  categoryId?: string
  documentId?: string
  dateRange?: {
    from: Date
    to: Date
  }
  searchQuery?: string
}

interface ActivityGroup {
  id: string
  title: string
  date: Date
  actions: UserAction[]
  sessionId?: string
  totalDuration?: number
  primaryActivity: string
}

export function History({ className }: HistoryProps) {
  const { getRecentActions, isLoading } = useActionsStore()
  const { toast } = useToast()

  // Local state for actions
  const [actions, setActions] = useState<UserAction[]>([])

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<ActionFilter>({})
  const [view, setView] = useState<'timeline' | 'sessions' | 'analytics'>('timeline')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'date' | 'type' | 'duration'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Load actions on mount
  useEffect(() => {
    loadActions()
  }, [])

  const loadActions = useCallback(async () => {
    try {
      const recentActions = await getRecentActions(1000) // Get recent 1000 actions
      setActions(recentActions)
    } catch (error) {
      console.error('Failed to load actions:', error)
      toast({
        title: "Loading Failed",
        description: "Failed to load activity history. Please try again.",
        variant: "destructive"
      })
    }
  }, [getRecentActions, toast])

  // Helper functions
  const getActionTypeDisplay = (type: ActionType | string): string => {
    const typeMap: Partial<Record<ActionType, string>> = {
      [ActionType.DOCUMENT_UPLOAD]: 'Document Upload',
      [ActionType.DOCUMENT_VIEW]: 'Document View',
      [ActionType.DOCUMENT_HIGHLIGHT]: 'Highlight',
      [ActionType.NOTE_CREATE]: 'Note Creation',
      [ActionType.NOTE_EDIT]: 'Note Edit',
      [ActionType.CHAT_START]: 'Chat Start',
      [ActionType.CHAT_MESSAGE]: 'Chat Message',
      [ActionType.FLASHCARD_CREATE]: 'Flashcard Create',
      [ActionType.FLASHCARD_REVIEW]: 'Flashcard Review',
      [ActionType.CATEGORY_CREATE]: 'Category Create',
      [ActionType.SEARCH_QUERY]: 'Search Query'
    }
    
    return typeMap[type as ActionType] || type
  }

  const getPrimaryActivity = (actions: UserAction[]): string => {
    const typeCounts = new Map<string, number>()
    
    actions.forEach(action => {
      typeCounts.set(action.action_type, (typeCounts.get(action.action_type) || 0) + 1)
    })

    const [primaryType] = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0] || ['unknown', 0]

    return getActionTypeDisplay(primaryType as ActionType)
  }

  const getDateTitle = (date: Date): string => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    if (isThisWeek(date)) return format(date, 'EEEE')
    if (isThisMonth(date)) return format(date, 'MMM d')
    return format(date, 'MMM d, yyyy')
  }

  // Filter and search actions
  const filteredActions = useMemo(() => {
    let filtered = actions

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(action => 
        action.action_type.toLowerCase().includes(query) ||
        JSON.stringify(action.data).toLowerCase().includes(query) ||
        action.session_id?.toLowerCase().includes(query)
      )
    }

    // Type filter
    if (selectedFilter.type) {
      filtered = filtered.filter(action => action.action_type === selectedFilter.type)
    }

    // Session filter
    if (selectedFilter.sessionId) {
      filtered = filtered.filter(action => action.session_id === selectedFilter.sessionId)
    }

    return filtered
  }, [actions, searchQuery, selectedFilter])

  // Group actions by session or time
  const groupedActions = useMemo(() => {
    const groups: ActivityGroup[] = []
    
    if (view === 'sessions') {
      // Group by session
      const sessionMap = new Map<string, UserAction[]>()
      
      filteredActions.forEach(action => {
        const sessionId = action.session_id || 'no-session'
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, [])
        }
        sessionMap.get(sessionId)!.push(action)
      })

      sessionMap.forEach((sessionActions, sessionId) => {
        if (sessionActions.length === 0) return
        
        const startTime = new Date(Math.min(...sessionActions.map(a => new Date(a.timestamp).getTime())))
        const endTime = new Date(Math.max(...sessionActions.map(a => new Date(a.timestamp).getTime())))
        const duration = (endTime.getTime() - startTime.getTime()) / 1000 / 60 // minutes
        
        const primaryActivity = getPrimaryActivity(sessionActions)
        
        groups.push({
          id: sessionId,
          title: sessionId === 'no-session' ? 'Untracked Activities' : `Study Session`,
          date: startTime,
          actions: sessionActions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
          sessionId: sessionId === 'no-session' ? undefined : sessionId,
          totalDuration: duration,
          primaryActivity
        })
      })
    } else {
      // Group by time period (day)
      const dayMap = new Map<string, UserAction[]>()
      
      filteredActions.forEach(action => {
        const day = format(new Date(action.timestamp), 'yyyy-MM-dd')
        if (!dayMap.has(day)) {
          dayMap.set(day, [])
        }
        dayMap.get(day)!.push(action)
      })

      dayMap.forEach((dayActions, day) => {
        if (dayActions.length === 0) return
        
        const date = parseISO(day)
        const primaryActivity = getPrimaryActivity(dayActions)
        
        groups.push({
          id: day,
          title: getDateTitle(date),
          date,
          actions: dayActions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
          primaryActivity
        })
      })
    }

    // Sort groups
    return groups.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc' 
          ? b.date.getTime() - a.date.getTime()
          : a.date.getTime() - b.date.getTime()
      } else if (sortBy === 'duration') {
        return sortOrder === 'desc'
          ? (b.totalDuration || 0) - (a.totalDuration || 0)
          : (a.totalDuration || 0) - (b.totalDuration || 0)
      } else {
        return sortOrder === 'desc'
          ? b.actions.length - a.actions.length
          : a.actions.length - b.actions.length
      }
    })
  }, [filteredActions, view, sortBy, sortOrder])

  const getActionIcon = (type: ActionType | string) => {
    const iconMap: Partial<Record<ActionType, JSX.Element>> = {
      [ActionType.DOCUMENT_UPLOAD]: <FileText className="h-4 w-4" />,
      [ActionType.DOCUMENT_VIEW]: <Eye className="h-4 w-4" />,
      [ActionType.DOCUMENT_HIGHLIGHT]: <Target className="h-4 w-4" />,
      [ActionType.NOTE_CREATE]: <Plus className="h-4 w-4" />,
      [ActionType.NOTE_EDIT]: <Edit className="h-4 w-4" />,
      [ActionType.CHAT_START]: <MessageSquare className="h-4 w-4" />,
      [ActionType.CHAT_MESSAGE]: <MessageSquare className="h-4 w-4" />,
      [ActionType.FLASHCARD_CREATE]: <Brain className="h-4 w-4" />,
      [ActionType.FLASHCARD_REVIEW]: <Target className="h-4 w-4" />,
      [ActionType.CATEGORY_CREATE]: <BookOpen className="h-4 w-4" />,
      [ActionType.SEARCH_QUERY]: <Search className="h-4 w-4" />
    }
    
    return iconMap[type as ActionType] || <Activity className="h-4 w-4" />
  }

  const getActionColor = (type: ActionType | string): "default" | "secondary" | "destructive" | "outline" => {
    const variantMap: Partial<Record<ActionType, "default" | "secondary" | "destructive" | "outline">> = {
      [ActionType.DOCUMENT_UPLOAD]: 'default',
      [ActionType.DOCUMENT_VIEW]: 'secondary',
      [ActionType.DOCUMENT_HIGHLIGHT]: 'outline',
      [ActionType.NOTE_CREATE]: 'default',
      [ActionType.NOTE_EDIT]: 'outline',
      [ActionType.CHAT_START]: 'default',
      [ActionType.CHAT_MESSAGE]: 'outline',
      [ActionType.FLASHCARD_CREATE]: 'default',
      [ActionType.FLASHCARD_REVIEW]: 'outline',
      [ActionType.CATEGORY_CREATE]: 'default',
      [ActionType.SEARCH_QUERY]: 'secondary'
    }
    
    return variantMap[type as ActionType] || 'secondary'
  }

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  const clearFilters = () => {
    setSelectedFilter({})
    setSearchQuery('')
  }

  const exportHistory = () => {
    const dataStr = JSON.stringify(filteredActions, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `stellar-history-${format(new Date(), 'yyyy-MM-dd')}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Analytics calculations
  const analyticsData = useMemo(() => {
    const totalActions = filteredActions.length
    const uniqueSessions = new Set(filteredActions.map(a => a.session_id).filter(Boolean)).size
    const uniqueDocuments = new Set(filteredActions.flatMap(a => a.document_ids || [])).size
    const uniqueCategories = new Set(filteredActions.flatMap(a => a.category_ids || [])).size
    
    const actionsByType = new Map<ActionType, number>()
    filteredActions.forEach(action => {
      actionsByType.set(action.action_type as ActionType, (actionsByType.get(action.action_type as ActionType) || 0) + 1)
    })

    const topActionTypes = Array.from(actionsByType.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const averageActionsPerDay = filteredActions.length > 0 ? 
      filteredActions.length / Math.max(1, Math.ceil((Date.now() - new Date(filteredActions[filteredActions.length - 1]?.timestamp || Date.now()).getTime()) / (1000 * 60 * 60 * 24))) : 0

    return {
      totalActions,
      uniqueSessions,
      uniqueDocuments,
      uniqueCategories,
      topActionTypes,
      averageActionsPerDay
    }
  }, [filteredActions])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-6 p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity History</h2>
          <p className="text-muted-foreground">
            Real-time feed of your study activities and progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportHistory}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadActions}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Activities</Label>
              <Input
                id="search"
                placeholder="Search actions, sessions, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select
                value={selectedFilter.type || "all"}
                onValueChange={(value) => setSelectedFilter(prev => ({ 
                  ...prev, 
                  type: value === "all" ? undefined : value as ActionType
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.values(ActionType).map(type => (
                    <SelectItem key={type} value={type}>
                      {getActionTypeDisplay(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedFilter.dateRange?.from ? (
                      selectedFilter.dateRange.to ? (
                        <>
                          {format(selectedFilter.dateRange.from, "LLL dd, y")} -{" "}
                          {format(selectedFilter.dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(selectedFilter.dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={selectedFilter.dateRange?.from}
                    selected={selectedFilter.dateRange}
                    onSelect={(range) => setSelectedFilter(prev => ({ 
                      ...prev, 
                      dateRange: range ? {
                        from: range.from || new Date(),
                        to: range.to || new Date()
                      } : undefined
                    }))}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Clear Filters
            </Button>
            <Badge variant="secondary">
              {filteredActions.length} activities
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Sort by:</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1"
              >
                {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </div>
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-4">
              {groupedActions.map((group) => (
                <Card key={group.id} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => toggleGroupExpanded(group.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedGroups.has(group.id) ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronUp className="h-4 w-4" />
                        }
                        <div>
                          <CardTitle className="text-lg">{group.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {group.actions.length} activities • {group.primaryActivity}
                            {group.totalDuration && ` • ${Math.round(group.totalDuration)} min`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {format(group.date, 'MMM d, h:mm a')}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  {expandedGroups.has(group.id) && (
                    <CardContent>
                      <div className="space-y-2">
                        {group.actions.map((action) => (
                          <div key={action.id} className="flex items-center gap-3 p-2 rounded-lg border">
                            <div className="flex-shrink-0">
                              {getActionIcon(action.action_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant={getActionColor(action.action_type)}>
                                  {getActionTypeDisplay(action.action_type)}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(action.timestamp), 'h:mm a')}
                                </span>
                              </div>
                              {action.data && Object.keys(action.data).length > 0 && (
                                <p className="text-sm text-muted-foreground mt-1 truncate">
                                  {JSON.stringify(action.data).slice(0, 100)}...
                                </p>
                              )}
                            </div>
                            {action.duration && (
                              <Badge variant="secondary">
                                {Math.round(action.duration / 60)}m
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}

              {groupedActions.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Activities Found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters to see more activities.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {groupedActions.map((group) => (
                <Card key={group.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{group.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {group.actions.length} activities
                          {group.totalDuration && ` • ${Math.round(group.totalDuration)} minutes`}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {format(group.date, 'MMM d, h:mm a')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Array.from(new Set(group.actions.map(a => a.action_type))).map(type => (
                        <div key={type} className="text-center">
                          <div className="flex justify-center mb-2">
                            {getActionIcon(type)}
                          </div>
                          <Badge variant={getActionColor(type)}>
                            {group.actions.filter(a => a.action_type === type).length}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getActionTypeDisplay(type)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalActions}</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.averageActionsPerDay.toFixed(1)} per day avg
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Study Sessions</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.uniqueSessions}</div>
                <p className="text-xs text-muted-foreground">
                  Unique sessions tracked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.uniqueDocuments}</div>
                <p className="text-xs text-muted-foreground">
                  Unique documents accessed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.uniqueCategories}</div>
                <p className="text-xs text-muted-foreground">
                  Topic areas covered
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Activity Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.topActionTypes.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getActionIcon(type)}
                      <span className="text-sm font-medium">
                        {getActionTypeDisplay(type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ width: `${(count / analyticsData.totalActions) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 