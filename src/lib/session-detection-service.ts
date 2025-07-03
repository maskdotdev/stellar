import { invoke } from '@tauri-apps/api/core'
import { UserAction, ActionType } from './actions-service'

export interface SessionDetectionConfig {
  idleThresholdMinutes: number // Default: 30 minutes
  contextSwitchThreshold: number // Default: 3 different document/category switches
  autoTitleEnabled: boolean
  autoEndSessionEnabled: boolean
}

export interface ActivityPattern {
  dominantAction: ActionType
  documentTypes: string[]
  categoryFocus: string[]
  activityIntensity: 'low' | 'medium' | 'high'
  timeSpent: number
}

export interface SessionSuggestion {
  suggestedTitle: string
  suggestedType: 'focused' | 'exploratory' | 'review' | 'mixed'
  confidence: number // 0-1
  reasoning: string
}

export class SessionDetectionService {
  private config: SessionDetectionConfig = {
    idleThresholdMinutes: 30,
    contextSwitchThreshold: 3,
    autoTitleEnabled: true,
    autoEndSessionEnabled: false
  }

  constructor(config?: Partial<SessionDetectionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * Analyze user actions to detect session boundaries
   */
  async detectSessionBoundaries(actions: UserAction[]): Promise<UserAction[][]> {
    if (actions.length === 0) return []

    const sessionGroups: UserAction[][] = []
    let currentSession: UserAction[] = []
    
    for (let i = 0; i < actions.length; i++) {
      const currentAction = actions[i]
      const previousAction = i > 0 ? actions[i - 1] : null

      if (previousAction && this.shouldCreateNewSession(previousAction, currentAction)) {
        if (currentSession.length > 0) {
          sessionGroups.push([...currentSession])
          currentSession = []
        }
      }

      currentSession.push(currentAction)
    }

    if (currentSession.length > 0) {
      sessionGroups.push(currentSession)
    }

    return sessionGroups
  }

  /**
   * Determine if a new session should be created based on action patterns
   */
  private shouldCreateNewSession(previousAction: UserAction, currentAction: UserAction): boolean {
    const timeDiff = new Date(currentAction.timestamp).getTime() - new Date(previousAction.timestamp).getTime()
    const minutesDiff = timeDiff / (1000 * 60)

    // Time-based boundary: 30+ minutes gap
    if (minutesDiff >= this.config.idleThresholdMinutes) {
      return true
    }

    // Context switch detection: Major change in activity type
    if (this.isSignificantContextSwitch(previousAction, currentAction)) {
      return true
    }

    return false
  }

  /**
   * Detect significant context switches between actions
   */
  private isSignificantContextSwitch(prevAction: UserAction, currentAction: UserAction): boolean {
    // Major action type changes that indicate context switch
    const contextSwitchPairs = [
      ['DOCUMENT_VIEW', 'CHAT_START'],
      ['CHAT_MESSAGE', 'DOCUMENT_UPLOAD'],
      ['FLASHCARD_REVIEW', 'DOCUMENT_VIEW'],
      ['NOTE_CREATE', 'SEARCH_QUERY']
    ]

    const prevType = prevAction.action_type
    const currentType = currentAction.action_type

    return contextSwitchPairs.some(([from, to]) => 
      (prevType === from && currentType === to) ||
      (prevType === to && currentType === from)
    )
  }

  /**
   * Analyze activity patterns within a session
   */
  analyzeActivityPattern(actions: UserAction[]): ActivityPattern {
    if (actions.length === 0) {
      return {
        dominantAction: 'DOCUMENT_VIEW' as ActionType,
        documentTypes: [],
        categoryFocus: [],
        activityIntensity: 'low',
        timeSpent: 0
      }
    }

    // Count action types
    const actionCounts = new Map<string, number>()
    const documentIds = new Set<string>()
    const categoryIds = new Set<string>()

    let totalDuration = 0
    const startTime = new Date(actions[0].timestamp).getTime()
    const endTime = new Date(actions[actions.length - 1].timestamp).getTime()
    totalDuration = (endTime - startTime) / (1000 * 60) // minutes

    actions.forEach(action => {
      actionCounts.set(action.action_type, (actionCounts.get(action.action_type) || 0) + 1)
      
      if (action.document_ids) {
        action.document_ids.forEach(id => documentIds.add(id))
      }
      
      if (action.category_ids) {
        action.category_ids.forEach(id => categoryIds.add(id))
      }
    })

    // Find dominant action
    let dominantAction = 'DOCUMENT_VIEW' as ActionType
    let maxCount = 0
    for (const [action, count] of actionCounts.entries()) {
      if (count > maxCount) {
        maxCount = count
        dominantAction = action as ActionType
      }
    }

    // Determine activity intensity
    const actionsPerMinute = actions.length / Math.max(totalDuration, 1)
    let activityIntensity: 'low' | 'medium' | 'high' = 'low'
    if (actionsPerMinute > 2) activityIntensity = 'high'
    else if (actionsPerMinute > 0.5) activityIntensity = 'medium'

    return {
      dominantAction,
      documentTypes: Array.from(documentIds),
      categoryFocus: Array.from(categoryIds),
      activityIntensity,
      timeSpent: totalDuration
    }
  }

  /**
   * Generate intelligent session title based on activity patterns using rule-based analysis
   */
  generateSessionTitle(actions: UserAction[], pattern?: ActivityPattern): SessionSuggestion {
    const activityPattern = pattern || this.analyzeActivityPattern(actions)
    
    if (actions.length === 0) {
      return {
        suggestedTitle: "Study Session",
        suggestedType: "mixed",
        confidence: 0.5,
        reasoning: "Default session title"
      }
    }

    const suggestions = this.generateTitleSuggestions(actions, activityPattern)
    
    // Return the highest confidence suggestion
    return suggestions.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    )
  }

  /**
   * Generate multiple title suggestions with confidence scores
   */
  private generateTitleSuggestions(actions: UserAction[], pattern: ActivityPattern): SessionSuggestion[] {
    const suggestions: SessionSuggestion[] = []
    
    // Document-focused session
    if (pattern.dominantAction === ActionType.DOCUMENT_VIEW || pattern.dominantAction === ActionType.DOCUMENT_UPLOAD) {
      const docCount = pattern.documentTypes.length
      if (docCount === 1) {
        suggestions.push({
          suggestedTitle: "Document Study Session",
          suggestedType: "focused",
          confidence: 0.8,
          reasoning: "Single document focus indicates concentrated study"
        })
      } else if (docCount > 1) {
        suggestions.push({
          suggestedTitle: `Multi-Document Research (${docCount} docs)`,
          suggestedType: "exploratory",
          confidence: 0.7,
          reasoning: "Multiple documents suggest research or comparison activity"
        })
      }
    }

    // Chat-focused session
    if (pattern.dominantAction === ActionType.CHAT_MESSAGE || pattern.dominantAction === ActionType.CHAT_START) {
      const chatActions = actions.filter(a => a.action_type === 'chat_message' || a.action_type === 'chat_start')
      if (chatActions.length > 10) {
        suggestions.push({
          suggestedTitle: "Deep Learning Discussion",
          suggestedType: "exploratory",
          confidence: 0.75,
          reasoning: "High chat activity suggests active learning through questions"
        })
      } else {
        suggestions.push({
          suggestedTitle: "AI-Assisted Study",
          suggestedType: "mixed",
          confidence: 0.6,
          reasoning: "Moderate chat activity with other tasks"
        })
      }
    }

    // Flashcard-focused session
    if (pattern.dominantAction === ActionType.FLASHCARD_REVIEW) {
      suggestions.push({
        suggestedTitle: "Flashcard Review Session",
        suggestedType: "review",
        confidence: 0.9,
        reasoning: "Flashcard activity clearly indicates review session"
      })
    }

    // Note-taking focused session
    if (pattern.dominantAction === ActionType.NOTE_CREATE || pattern.dominantAction === ActionType.NOTE_EDIT) {
      suggestions.push({
        suggestedTitle: "Note-Taking Session",
        suggestedType: "focused",
        confidence: 0.8,
        reasoning: "Note-taking activity suggests focused content processing"
      })
    }

    // Search-heavy session
    if (pattern.dominantAction === ActionType.SEARCH_QUERY) {
      suggestions.push({
        suggestedTitle: "Research & Discovery",
        suggestedType: "exploratory",
        confidence: 0.7,
        reasoning: "Search activity indicates exploration and discovery"
      })
    }

    // Time-based titles
    const timeOfDay = new Date(actions[0].timestamp).getHours()
    if (timeOfDay < 12) {
      suggestions.push({
        suggestedTitle: "Morning Study Session",
        suggestedType: "mixed",
        confidence: 0.4,
        reasoning: "Time-based naming for morning sessions"
      })
    } else if (timeOfDay < 17) {
      suggestions.push({
        suggestedTitle: "Afternoon Study Session",
        suggestedType: "mixed",
        confidence: 0.4,
        reasoning: "Time-based naming for afternoon sessions"
      })
    } else {
      suggestions.push({
        suggestedTitle: "Evening Study Session",
        suggestedType: "mixed",
        confidence: 0.4,
        reasoning: "Time-based naming for evening sessions"
      })
    }

    // Intensity-based titles
    if (pattern.activityIntensity === 'high') {
      suggestions.push({
        suggestedTitle: "Intensive Study Session",
        suggestedType: "focused",
        confidence: 0.6,
        reasoning: "High activity intensity suggests focused study"
      })
    }

    // Duration-based titles
    if (pattern.timeSpent > 120) { // 2+ hours
      suggestions.push({
        suggestedTitle: "Extended Study Session",
        suggestedType: "mixed",
        confidence: 0.5,
        reasoning: "Long duration suggests comprehensive study"
      })
    }

    // Default fallback
    if (suggestions.length === 0) {
      suggestions.push({
        suggestedTitle: "Study Session",
        suggestedType: "mixed",
        confidence: 0.3,
        reasoning: "Default title when no clear pattern is detected"
      })
    }

    return suggestions
  }

  /**
   * Check if current session should be automatically ended
   */
  async shouldAutoEndSession(currentSessionId: string): Promise<boolean> {
    if (!this.config.autoEndSessionEnabled) return false

    try {
      const actions = await invoke<UserAction[]>('get_actions_by_session', { sessionId: currentSessionId })
      
      if (actions.length === 0) return false

      const lastAction = actions[actions.length - 1]
      const timeSinceLastAction = Date.now() - new Date(lastAction.timestamp).getTime()
      const minutesSinceLastAction = timeSinceLastAction / (1000 * 60)

      return minutesSinceLastAction >= this.config.idleThresholdMinutes
    } catch (error) {
      console.error('Error checking for auto-end session:', error)
      return false
    }
  }

  /**
   * Automatically detect and create sessions from unorganized actions
   */
  async autoDetectSessions(actions: UserAction[]): Promise<SessionSuggestion[]> {
    const sessionGroups = await this.detectSessionBoundaries(actions)
    const suggestions: SessionSuggestion[] = []

    for (const sessionActions of sessionGroups) {
      const suggestion = this.generateSessionTitle(sessionActions)
      suggestions.push(suggestion)
    }

    return suggestions
  }

  /**
   * Update session configuration
   */
  updateConfig(newConfig: Partial<SessionDetectionConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): SessionDetectionConfig {
    return { ...this.config }
  }
}

// Export singleton instance
export const sessionDetectionService = new SessionDetectionService() 