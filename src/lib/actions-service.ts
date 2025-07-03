import { create } from "zustand"
import { persist } from "zustand/middleware"
import { invoke } from '@tauri-apps/api/core'
import { sessionDetectionService, SessionSuggestion } from './session-detection-service'

// Action Types Enum
export enum ActionType {
  // Document Actions
  DOCUMENT_UPLOAD = 'document_upload',
  DOCUMENT_VIEW = 'document_view',
  DOCUMENT_HIGHLIGHT = 'document_highlight',
  DOCUMENT_ANNOTATE = 'document_annotate',
  
  // Note Actions
  NOTE_CREATE = 'note_create',
  NOTE_EDIT = 'note_edit',
  NOTE_DELETE = 'note_delete',
  
  // Chat Actions
  CHAT_START = 'chat_start',
  CHAT_MESSAGE = 'chat_message',
  CHAT_END = 'chat_end',
  
  // Flashcard Actions
  FLASHCARD_CREATE = 'flashcard_create',
  FLASHCARD_REVIEW = 'flashcard_review',
  FLASHCARD_CORRECT = 'flashcard_correct',
  FLASHCARD_INCORRECT = 'flashcard_incorrect',
  
  // Category Actions
  CATEGORY_CREATE = 'category_create',
  CATEGORY_EDIT = 'category_edit',
  CATEGORY_DELETE = 'category_delete',
  
  // Search Actions
  SEARCH_QUERY = 'search_query',
  SEARCH_RESULT_CLICK = 'search_result_click',
  
  // Navigation Actions
  VIEW_CHANGE = 'view_change',
  FOCUS_MODE_TOGGLE = 'focus_mode_toggle',
  
  // Study Actions
  STUDY_SESSION_START = 'study_session_start',
  STUDY_SESSION_END = 'study_session_end',
  STUDY_BREAK = 'study_break',
}

// Flexible action data types
export interface DocumentActionData {
  documentId: string
  documentTitle: string
  documentType: string
  categoryId?: string
  duration?: number
  progress?: number // For reading progress
}

export interface NoteActionData {
  noteId: string
  noteTitle: string
  documentId?: string
  categoryId?: string
  wordCount?: number
  hasDocumentReferences?: boolean
}

export interface ChatActionData {
  conversationId: string
  messageCount?: number
  documentsReferenced?: string[]
  categoriesReferenced?: string[]
  aiModel?: string
  provider?: string
}

export interface FlashcardActionData {
  flashcardId: string
  deckId?: string
  difficulty: 'easy' | 'medium' | 'hard'
  sourceDocumentId?: string
  response?: 'correct' | 'incorrect' | 'partial'
  timeSpent?: number
  confidence?: 1 | 2 | 3 | 4 | 5
}

export interface SearchActionData {
  query: string
  scope: 'all' | 'documents' | 'notes' | 'conversations'
  resultCount?: number
  clickedResultId?: string
  clickedResultType?: string
}

export interface CategoryActionData {
  categoryId: string
  categoryName: string
  documentCount?: number
  color?: string
  icon?: string
}

export interface ViewActionData {
  fromView: string
  toView: string
  trigger: 'navigation' | 'keybinding' | 'button'
}

export type ActionData = 
  | DocumentActionData 
  | NoteActionData 
  | ChatActionData 
  | FlashcardActionData 
  | SearchActionData 
  | CategoryActionData
  | ViewActionData
  | Record<string, any> // Fallback for other action types

// Main User Action Interface (matches Rust UserAction)
export interface UserAction {
  id: string
  action_type: string // Changed from 'type' to match Rust
  timestamp: string // ISO string from backend
  session_id: string // Changed from sessionId to match Rust
  data: any // JSON data from backend
  document_ids?: string[] // Changed from documentIds to match Rust
  category_ids?: string[] // Changed from categoryIds to match Rust
  duration?: number // Total time spent on this action (in seconds)
  metadata?: any // JSON metadata from backend
}

// Study Session Interface (matches Rust StudySession)
export interface StudySession {
  id: string
  title: string
  start_time: string // ISO string from backend
  end_time?: string // ISO string from backend
  is_active: boolean
  session_type: string // 'focused', 'exploratory', 'review', 'mixed'
  total_duration: number // Duration in seconds
  documents_accessed: string[]
  categories_accessed: string[]
  conversation_ids: string[]
  metadata?: any // JSON metadata
}

// Action Context for recording actions
export interface ActionContext {
  sessionId?: string
  documentIds?: string[]
  categoryIds?: string[]
  duration?: number
  metadata?: any
}

// Action Statistics Interface (matches Rust ActionStats)
export interface ActionStats {
  total_actions: number
  actions_by_type: Record<string, number>
  sessions_count: number
  documents_accessed: number
  average_session_duration: number
}

// Database initialization helper
let dbInitialized = false
const ensureDatabaseInitialized = async () => {
  if (dbInitialized) return
  
  try {
    await invoke('init_database')
    dbInitialized = true
    console.log('Actions database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize actions database:', error)
    throw error
  }
}

// Actions Store State - SQLite Backend
interface ActionsState {
  currentSessionId: string | null
  isTracking: boolean
  isLoading: boolean
  
  // Actions
  recordAction: (type: ActionType, data: ActionData, context?: Partial<ActionContext>) => Promise<void>
  getActionsBySession: (sessionId: string) => Promise<UserAction[]>
  getActionsByDocument: (documentId: string) => Promise<UserAction[]>
  getRecentActions: (limit: number) => Promise<UserAction[]>
  
  // Session management
  startNewSession: (title: string, sessionType?: string) => Promise<StudySession>
  getCurrentSession: () => Promise<StudySession | null>
  endCurrentSession: () => Promise<boolean>
  getStudySessions: (limit?: number, offset?: number) => Promise<StudySession[]>
  setCurrentSession: (sessionId: string) => void
  clearCurrentSession: () => void
  
  // Smart session management
  generateSessionTitle: (sessionId: string) => Promise<SessionSuggestion>
  checkAutoEndSession: () => Promise<boolean>
  autoDetectSessionsFromActions: (actions: UserAction[]) => Promise<SessionSuggestion[]>
  startSmartSession: () => Promise<StudySession>
  
  // Settings
  setTracking: (enabled: boolean) => void
  setLoading: (loading: boolean) => void
  
  // Analytics helpers
  getActionStats: () => Promise<ActionStats>
}

// Actions Store - SQLite Backend
export const useActionsStore = create<ActionsState>()(
  persist(
    (set, get) => ({
      currentSessionId: null,
      isTracking: true,
      isLoading: false,
      
      recordAction: async (type: ActionType, data: ActionData, context: Partial<ActionContext> = {}) => {
        if (!get().isTracking) return
        
        set({ isLoading: true })
        
        try {
          await ensureDatabaseInitialized()
          
          // Get current session or create one
          let sessionId = context.sessionId || get().currentSessionId
          
          if (!sessionId) {
            const session = await get().startNewSession("Study Session")
            sessionId = session.id
          }
          
          // Prepare action data
          const actionData = {
            action_type: type,
            session_id: sessionId,
            data: data,
            document_ids: context.documentIds,
            category_ids: context.categoryIds,
            duration: context.duration,
            metadata: {
              deviceType: 'desktop',
              viewportSize: typeof window !== 'undefined' ? {
                width: window.innerWidth,
                height: window.innerHeight
              } : undefined,
              timestamp: new Date().toISOString(),
              ...context.metadata
            }
          }
          
          await invoke('record_user_action', { req: actionData })
        } catch (error) {
          console.error('Failed to record action:', error)
        } finally {
          set({ isLoading: false })
        }
      },
      
      getActionsBySession: async (sessionId: string) => {
        try {
          await ensureDatabaseInitialized()
          const actions = await invoke<UserAction[]>('get_actions_by_session', { sessionId })
          return actions
        } catch (error) {
          console.error('Failed to get actions by session:', error)
          return []
        }
      },
      
      getActionsByDocument: async (documentId: string) => {
        try {
          await ensureDatabaseInitialized()
          const actions = await invoke<UserAction[]>('get_actions_by_document', { documentId })
          return actions
        } catch (error) {
          console.error('Failed to get actions by document:', error)
          return []
        }
      },
      
      getRecentActions: async (limit: number) => {
        try {
          await ensureDatabaseInitialized()
          const actions = await invoke<UserAction[]>('get_recent_actions', { limit })
          return actions
        } catch (error) {
          console.error('Failed to get recent actions:', error)
          return []
        }
      },
      
      startNewSession: async (title: string, sessionType: string = 'mixed') => {
        try {
          await ensureDatabaseInitialized()
          const session = await invoke<StudySession>('start_new_session', { 
            title, 
            session_type: sessionType 
          })
          set({ currentSessionId: session.id })
          return session
        } catch (error) {
          console.error('Failed to start new session:', error)
          throw error
        }
      },
      
      getCurrentSession: async () => {
        try {
          await ensureDatabaseInitialized()
          const session = await invoke<StudySession | null>('get_active_session')
          if (session) {
            set({ currentSessionId: session.id })
          }
          return session
        } catch (error) {
          console.error('Failed to get current session:', error)
          return null
        }
      },
      
      endCurrentSession: async () => {
        const sessionId = get().currentSessionId
        if (!sessionId) return false
        
        try {
          await ensureDatabaseInitialized()
          const success = await invoke<boolean>('end_study_session', { sessionId })
          if (success) {
            set({ currentSessionId: null })
          }
          return success
        } catch (error) {
          console.error('Failed to end current session:', error)
          return false
        }
      },
      
      getStudySessions: async (limit: number = 50, offset: number = 0) => {
        try {
          await ensureDatabaseInitialized()
          const sessions = await invoke<StudySession[]>('get_study_sessions', { limit, offset })
          return sessions
        } catch (error) {
          console.error('Failed to get study sessions:', error)
          return []
        }
      },
      
      setCurrentSession: (sessionId: string) => {
        set({ currentSessionId: sessionId })
      },
      
      clearCurrentSession: () => {
        set({ currentSessionId: null })
      },
      
      setTracking: (enabled: boolean) => {
        set({ isTracking: enabled })
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
      
      getActionStats: async () => {
        try {
          await ensureDatabaseInitialized()
          const stats = await invoke<ActionStats>('get_action_statistics')
          return stats
        } catch (error) {
          console.error('Failed to get action statistics:', error)
          return {
            total_actions: 0,
            actions_by_type: {},
            sessions_count: 0,
            documents_accessed: 0,
            average_session_duration: 0
          }
        }
      },
      
      // Smart session management methods
      generateSessionTitle: async (sessionId: string) => {
        try {
          await ensureDatabaseInitialized()
          const actions = await invoke<UserAction[]>('get_actions_by_session', { sessionId })
          return sessionDetectionService.generateSessionTitle(actions)
        } catch (error) {
          console.error('Failed to generate session title:', error)
          return {
            suggestedTitle: "Study Session",
            suggestedType: "mixed" as const,
            confidence: 0.3,
            reasoning: "Error generating title"
          }
        }
      },
      
      checkAutoEndSession: async () => {
        const currentSessionId = get().currentSessionId
        if (!currentSessionId) return false
        
        try {
          await ensureDatabaseInitialized()
          return await sessionDetectionService.shouldAutoEndSession(currentSessionId)
        } catch (error) {
          console.error('Failed to check auto-end session:', error)
          return false
        }
      },
      
      autoDetectSessionsFromActions: async (actions: UserAction[]) => {
        try {
          await ensureDatabaseInitialized()
          return await sessionDetectionService.autoDetectSessions(actions)
        } catch (error) {
          console.error('Failed to auto-detect sessions:', error)
          return []
        }
      },
      
      startSmartSession: async () => {
        try {
          await ensureDatabaseInitialized()
          
          // Get recent actions to analyze patterns
          const recentActions = await get().getRecentActions(50)
          
          let sessionTitle = "Study Session"
          let sessionType = "mixed"
          
          if (recentActions.length > 0) {
            const suggestion = sessionDetectionService.generateSessionTitle(recentActions)
            sessionTitle = suggestion.suggestedTitle
            sessionType = suggestion.suggestedType
          }
          
          // Add timestamp to make title unique
          const now = new Date()
          const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const finalTitle = `${sessionTitle} - ${timeString}`
          
          return await get().startNewSession(finalTitle, sessionType)
        } catch (error) {
          console.error('Failed to start smart session:', error)
          // Fallback to regular session
          return await get().startNewSession("Study Session", "mixed")
        }
      }
    }),
    {
      name: 'actions-store',
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
        isTracking: state.isTracking
      }),
    }
  )
)

// Actions Service Class for complex operations
export class ActionsService {
  private static instance: ActionsService
  
  private constructor() {}
  
  static getInstance(): ActionsService {
    if (!ActionsService.instance) {
      ActionsService.instance = new ActionsService()
    }
    return ActionsService.instance
  }
  
  // Helper method to record action with automatic context detection
  async recordActionWithAutoContext(
    type: ActionType, 
    data: ActionData, 
    additionalContext: Partial<ActionContext> = {}
  ) {
    const store = useActionsStore.getState()
    
    // Auto-detect context from current app state if available
    const context: Partial<ActionContext> = {
      duration: 0,
      metadata: {
        deviceType: this.detectDeviceType(),
        viewportSize: typeof window !== 'undefined' ? {
          width: window.innerWidth,
          height: window.innerHeight
        } : undefined,
        timestamp: new Date().toISOString()
      },
      ...additionalContext
    }
    
    return store.recordAction(type, data, context)
  }
  
  // Record multiple actions in batch
  async recordBatchActions(actions: { type: ActionType; data: ActionData; context?: Partial<ActionContext> }[]) {
    const store = useActionsStore.getState()
    
    for (const action of actions) {
      await store.recordAction(action.type, action.data, action.context)
    }
  }
  
  // Get comprehensive study insights
  async getStudyInsights(): Promise<{
    totalStudyTime: number
    mostActiveHours: number[]
    documentsStudied: string[]
    topCategories: string[]
    studyStreak: number
    averageSessionLength: number
    totalActions: number
    sessionsCount: number
  }> {
    try {
      const stats = await useActionsStore.getState().getActionStats()
      const recentActions = await useActionsStore.getState().getRecentActions(1000)
      
      return {
        totalStudyTime: stats.average_session_duration * stats.sessions_count,
        mostActiveHours: this.getMostActiveHours(recentActions),
        documentsStudied: this.getDocumentsFromActions(recentActions),
        topCategories: this.getTopCategories(recentActions),
        studyStreak: this.calculateStudyStreak(recentActions),
        averageSessionLength: stats.average_session_duration,
        totalActions: stats.total_actions,
        sessionsCount: stats.sessions_count
      }
    } catch (error) {
      console.error('Failed to get study insights:', error)
      return {
        totalStudyTime: 0,
        mostActiveHours: [],
        documentsStudied: [],
        topCategories: [],
        studyStreak: 0,
        averageSessionLength: 0,
        totalActions: 0,
        sessionsCount: 0
      }
    }
  }
  
  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    if (typeof window === 'undefined') return 'desktop'
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }
  
  private getMostActiveHours(actions: UserAction[]): number[] {
    const hourCounts: Record<number, number> = {}
    
    actions.forEach(action => {
      const hour = new Date(action.timestamp).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    
    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour))
  }
  
  private getDocumentsFromActions(actions: UserAction[]): string[] {
    const documentIds = new Set<string>()
    
    actions.forEach(action => {
      if (action.document_ids) {
        action.document_ids.forEach(id => documentIds.add(id))
      }
      // Also check data for document references
      if (action.data && typeof action.data === 'object') {
        if (action.data.documentId) {
          documentIds.add(action.data.documentId)
        }
      }
    })
    
    return Array.from(documentIds)
  }
  
  private getTopCategories(actions: UserAction[]): string[] {
    const categoryCounts: Record<string, number> = {}
    
    actions.forEach(action => {
      if (action.category_ids) {
        action.category_ids.forEach(id => {
          categoryCounts[id] = (categoryCounts[id] || 0) + 1
        })
      }
    })
    
    return Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category)
  }
  
  private calculateStudyStreak(actions: UserAction[]): number {
    if (actions.length === 0) return 0
    
    // Group actions by date
    const actionsByDate: Record<string, UserAction[]> = {}
    actions.forEach(action => {
      const date = new Date(action.timestamp).toDateString()
      if (!actionsByDate[date]) {
        actionsByDate[date] = []
      }
      actionsByDate[date].push(action)
    })
    
    // Calculate consecutive days with actions
    const dates = Object.keys(actionsByDate).sort()
    let streak = 0
    let currentStreak = 0
    
    for (let i = dates.length - 1; i >= 0; i--) {
      const currentDate = new Date(dates[i])
      const nextDate = i < dates.length - 1 ? new Date(dates[i + 1]) : new Date()
      
      const daysDiff = Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff <= 1) {
        currentStreak++
      } else {
        break
      }
    }
    
    return currentStreak
  }
} 