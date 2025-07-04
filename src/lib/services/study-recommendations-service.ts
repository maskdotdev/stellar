import { aiService } from './ai-service'
import { invoke } from '@tauri-apps/api/core'
import type { UserAction } from './actions-service'

// 🧠 PHASE 2: Smart Study Recommendations System

export interface StudyPattern {
  id: string
  userId: string
  pattern: 'optimal_time' | 'topic_preference' | 'session_length' | 'difficulty_preference' | 'review_frequency'
  data: {
    timeOfDay?: string // e.g., "morning", "afternoon", "evening"
    dayOfWeek?: string[]
    averageSessionLength?: number // in minutes
    preferredDifficulty?: 'easy' | 'medium' | 'hard'
    successRate?: number
    topicAreas?: string[]
    reviewGaps?: number[] // days between reviews
  }
  confidence: number // 0-1 confidence in this pattern
  createdAt: Date
  updatedAt: Date
}

export interface StudyRecommendation {
  id: string
  type: 'session_timing' | 'topic_review' | 'difficulty_adjustment' | 'break_reminder' | 'study_plan'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  description: string
  reasoning: string
  suggestedActions: StudyAction[]
  estimatedTime?: number // in minutes
  deadline?: Date
  metadata?: Record<string, any>
}

export interface StudyAction {
  type: 'review_flashcards' | 'study_document' | 'create_notes' | 'take_break' | 'schedule_session'
  target?: string // document ID, category ID, etc.
  parameters?: Record<string, any>
}

export interface KnowledgeGap {
  id: string
  topic: string
  categoryId?: string
  documentId?: string
  gapType: 'forgotten' | 'never_learned' | 'needs_reinforcement'
  severity: 'low' | 'medium' | 'high'
  evidence: {
    flashcardFailures?: number
    lastReviewDate?: Date
    averageScore?: number
    relatedConcepts?: string[]
  }
  recommendations: StudyRecommendation[]
}

export interface StudyPlan {
  id: string
  title: string
  description: string
  objectives: string[]
  timeline: {
    startDate: Date
    endDate: Date
    totalHours: number
  }
  sessions: StudyPlanSession[]
  progress: {
    completedSessions: number
    hoursSpent: number
    objectivesCompleted: number
  }
  adaptable: boolean
}

export interface StudyPlanSession {
  id: string
  title: string
  scheduledDate: Date
  duration: number // in minutes
  activities: StudyAction[]
  prerequisites?: string[]
  objectives: string[]
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped'
}

export interface StudyInsight {
  id: string
  type: 'performance_trend' | 'learning_velocity' | 'retention_analysis' | 'optimal_conditions'
  title: string
  description: string
  data: Record<string, any>
  actionable: boolean
  recommendations?: StudyRecommendation[]
  confidence: number
}

class StudyRecommendationsService {
  /**
   * Analyze user study patterns from their actions
   */
  async analyzeStudyPatterns(_userId: string, days: number = 30): Promise<StudyPattern[]> {
    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
      
      const actions = await invoke<UserAction[]>('get_actions_by_date_range', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      const patterns: StudyPattern[] = []

      // Analyze optimal study times
      const timePattern = this.analyzeOptimalTimes(actions)
      if (timePattern) patterns.push(timePattern)

      // Analyze session length preferences
      const sessionPattern = this.analyzeSessionLengths(actions)
      if (sessionPattern) patterns.push(sessionPattern)

      // Analyze topic preferences
      const topicPattern = this.analyzeTopicPreferences(actions)
      if (topicPattern) patterns.push(topicPattern)

      // Analyze difficulty preferences
      const difficultyPattern = this.analyzeDifficultyPreferences(actions)
      if (difficultyPattern) patterns.push(difficultyPattern)

      // Analyze review frequency patterns
      const reviewPattern = this.analyzeReviewFrequency(actions)
      if (reviewPattern) patterns.push(reviewPattern)

      return patterns
    } catch (error) {
      console.error('Failed to analyze study patterns:', error)
      return []
    }
  }

  private analyzeOptimalTimes(actions: UserAction[]): StudyPattern | null {
    const timeSlots = {
      morning: 0,    // 6-12
      afternoon: 0,  // 12-18
      evening: 0     // 18-24
    }

    const successRates: Record<string, { total: number; successful: number }> = {
      morning: { total: 0, successful: 0 },
      afternoon: { total: 0, successful: 0 },
      evening: { total: 0, successful: 0 }
    }

    actions.forEach(action => {
      const hour = new Date(action.timestamp).getHours()
      let timeSlot: string
      
      if (hour >= 6 && hour < 12) timeSlot = 'morning'
      else if (hour >= 12 && hour < 18) timeSlot = 'afternoon'
      else timeSlot = 'evening'

      timeSlots[timeSlot as keyof typeof timeSlots]++

      // Track success rates for learning activities
      if (action.action_type === 'flashcard_review' && action.data) {
        const slot = successRates[timeSlot]
        slot.total++
        if (action.data.response === 'correct') {
          slot.successful++
        }
      }
    })

    // Find optimal time with highest activity and best success rate
    const optimalTime = Object.entries(timeSlots).reduce((best, [time, count]) => {
      const successRate = successRates[time].total > 0 
        ? successRates[time].successful / successRates[time].total 
        : 0
      
      const score = count * (1 + successRate)
      return score > best.score ? { time, score, count, successRate } : best
    }, { time: '', score: 0, count: 0, successRate: 0 })

    if (optimalTime.count < 5) return null // Not enough data

    return {
      id: crypto.randomUUID(),
      userId: 'current_user',
      pattern: 'optimal_time',
      data: {
        timeOfDay: optimalTime.time,
        successRate: optimalTime.successRate
      },
      confidence: Math.min(optimalTime.count / 20, 1), // Higher confidence with more data
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private analyzeSessionLengths(actions: UserAction[]): StudyPattern | null {
    const sessionLengths: number[] = []
    
    // Group actions by session and calculate durations
    const sessionGroups = new Map<string, UserAction[]>()
    actions.forEach(action => {
      if (action.session_id) {
        if (!sessionGroups.has(action.session_id)) {
          sessionGroups.set(action.session_id, [])
        }
        sessionGroups.get(action.session_id)!.push(action)
      }
    })

    sessionGroups.forEach(sessionActions => {
      if (sessionActions.length < 2) return
      
      const startTime = new Date(sessionActions[0].timestamp).getTime()
      const endTime = new Date(sessionActions[sessionActions.length - 1].timestamp).getTime()
      const duration = (endTime - startTime) / (1000 * 60) // in minutes
      
      if (duration > 5 && duration < 300) { // 5 minutes to 5 hours
        sessionLengths.push(duration)
      }
    })

    if (sessionLengths.length < 3) return null

    const averageLength = sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length

    return {
      id: crypto.randomUUID(),
      userId: 'current_user',
      pattern: 'session_length',
      data: {
        averageSessionLength: Math.round(averageLength)
      },
      confidence: Math.min(sessionLengths.length / 10, 1),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private analyzeTopicPreferences(actions: UserAction[]): StudyPattern | null {
    const topicCounts = new Map<string, number>()
    
    actions.forEach(action => {
      if (action.category_ids) {
        action.category_ids.forEach(categoryId => {
          topicCounts.set(categoryId, (topicCounts.get(categoryId) || 0) + 1)
        })
      }
    })

    if (topicCounts.size === 0) return null

    const sortedTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic)

    return {
      id: crypto.randomUUID(),
      userId: 'current_user',
      pattern: 'topic_preference',
      data: {
        topicAreas: sortedTopics
      },
      confidence: Math.min(topicCounts.size / 5, 1),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private analyzeDifficultyPreferences(actions: UserAction[]): StudyPattern | null {
    const difficulties = { easy: 0, medium: 0, hard: 0 }
    const successRates = { easy: { total: 0, successful: 0 }, medium: { total: 0, successful: 0 }, hard: { total: 0, successful: 0 } }

    actions.forEach(action => {
      if (action.action_type === 'flashcard_review' && action.data?.difficulty) {
        const difficulty = action.data.difficulty as keyof typeof difficulties
        difficulties[difficulty]++
        
        const rates = successRates[difficulty]
        rates.total++
        if (action.data.response === 'correct') {
          rates.successful++
        }
      }
    })

    const totalReviews = Object.values(difficulties).reduce((sum, count) => sum + count, 0)
    if (totalReviews < 10) return null

    // Find preferred difficulty (highest success rate with decent volume)
    const preferredDifficulty = Object.entries(successRates).reduce((best, [difficulty, rates]) => {
      if (rates.total < 3) return best
      
      const successRate = rates.successful / rates.total
      const volume = difficulties[difficulty as keyof typeof difficulties]
      const score = successRate * Math.log(volume + 1) // Balance success rate with volume
      
      return score > best.score ? { difficulty, score, successRate } : best
    }, { difficulty: '', score: 0, successRate: 0 })

    return {
      id: crypto.randomUUID(),
      userId: 'current_user',
      pattern: 'difficulty_preference',
      data: {
        preferredDifficulty: preferredDifficulty.difficulty as 'easy' | 'medium' | 'hard',
        successRate: preferredDifficulty.successRate
      },
      confidence: Math.min(totalReviews / 50, 1),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private analyzeReviewFrequency(actions: UserAction[]): StudyPattern | null {
    const reviewGaps: number[] = []
    const flashcardReviews = actions
      .filter(action => action.action_type === 'flashcard_review')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    if (flashcardReviews.length < 10) return null

    // Calculate gaps between review sessions
    for (let i = 1; i < flashcardReviews.length; i++) {
      const gap = (new Date(flashcardReviews[i].timestamp).getTime() - 
                   new Date(flashcardReviews[i-1].timestamp).getTime()) / (1000 * 60 * 60 * 24) // in days
      
      if (gap > 0.1 && gap < 30) { // Between 2.4 hours and 30 days
        reviewGaps.push(gap)
      }
    }

    if (reviewGaps.length < 5) return null

    return {
      id: crypto.randomUUID(),
      userId: 'current_user',
      pattern: 'review_frequency',
      data: {
        reviewGaps: reviewGaps
      },
      confidence: Math.min(reviewGaps.length / 20, 1),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Identify knowledge gaps based on performance data
   */
  async identifyKnowledgeGaps(_userId: string): Promise<KnowledgeGap[]> {
    try {
      const flashcardStats = await invoke<any[]>('get_flashcard_performance_by_topic')
      const gaps: KnowledgeGap[] = []

      flashcardStats.forEach(stat => {
        if (stat.success_rate < 0.6 || stat.avg_confidence < 3) {
          gaps.push({
            id: crypto.randomUUID(),
            topic: stat.topic || 'Unknown Topic',
            categoryId: stat.category_id,
            gapType: stat.success_rate < 0.3 ? 'never_learned' : 'needs_reinforcement',
            severity: stat.success_rate < 0.3 ? 'high' : stat.success_rate < 0.6 ? 'medium' : 'low',
            evidence: {
              flashcardFailures: stat.failure_count,
              lastReviewDate: stat.last_review ? new Date(stat.last_review) : undefined,
              averageScore: stat.success_rate,
              relatedConcepts: stat.related_topics || []
            },
            recommendations: this.generateGapRecommendations(stat)
          })
        }
      })

      return gaps
    } catch (error) {
      console.error('Failed to identify knowledge gaps:', error)
      return []
    }
  }

  private generateGapRecommendations(gapData: any): StudyRecommendation[] {
    const recommendations: StudyRecommendation[] = []

    if (gapData.success_rate < 0.3) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'study_plan',
        priority: 'high',
        title: 'Intensive Study Required',
        description: `Focus on mastering ${gapData.topic} fundamentals`,
        reasoning: 'Low success rate indicates fundamental knowledge gaps',
        suggestedActions: [
          { type: 'study_document', target: gapData.document_id },
          { type: 'create_notes', target: gapData.topic },
          { type: 'review_flashcards', target: gapData.category_id }
        ],
        estimatedTime: 60
      })
    } else if (gapData.success_rate < 0.6) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'topic_review',
        priority: 'medium',
        title: 'Reinforce Understanding',
        description: `Review and practice ${gapData.topic} concepts`,
        reasoning: 'Moderate success rate suggests need for reinforcement',
        suggestedActions: [
          { type: 'review_flashcards', target: gapData.category_id },
          { type: 'study_document', target: gapData.document_id }
        ],
        estimatedTime: 30
      })
    }

    return recommendations
  }

  /**
   * Generate personalized study recommendations
   */
  async generateStudyRecommendations(userId: string): Promise<StudyRecommendation[]> {
    try {
      const patterns = await this.analyzeStudyPatterns(userId)
      const gaps = await this.identifyKnowledgeGaps(userId)
      const recommendations: StudyRecommendation[] = []

      // Add gap-based recommendations
      gaps.forEach(gap => {
        recommendations.push(...gap.recommendations)
      })

      // Add pattern-based recommendations
      patterns.forEach(pattern => {
        const patternRecommendations = this.generatePatternRecommendations(pattern)
        recommendations.push(...patternRecommendations)
      })

      // Add time-based recommendations
      const timeRecommendations = await this.generateTimeBasedRecommendations(userId)
      recommendations.push(...timeRecommendations)

      // Sort by priority and limit results
      return recommendations
        .sort((a, b) => {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        })
        .slice(0, 10)
    } catch (error) {
      console.error('Failed to generate study recommendations:', error)
      return []
    }
  }

  private generatePatternRecommendations(pattern: StudyPattern): StudyRecommendation[] {
    const recommendations: StudyRecommendation[] = []

    if (pattern.pattern === 'optimal_time' && pattern.data.timeOfDay) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'session_timing',
        priority: 'medium',
        title: `Study During Your Peak Time`,
        description: `Schedule your next session during ${pattern.data.timeOfDay} for optimal performance`,
        reasoning: `You perform ${((pattern.data.successRate || 0) * 100).toFixed(0)}% better during ${pattern.data.timeOfDay}`,
        suggestedActions: [
          { type: 'schedule_session', parameters: { timeOfDay: pattern.data.timeOfDay } }
        ]
      })
    }

    if (pattern.pattern === 'session_length' && pattern.data.averageSessionLength) {
      const avgLength = pattern.data.averageSessionLength
      if (avgLength < 20) {
        recommendations.push({
          id: crypto.randomUUID(),
          type: 'session_timing',
          priority: 'low',
          title: 'Consider Longer Study Sessions',
          description: 'Try extending your study sessions to 25-30 minutes for better retention',
          reasoning: `Your average session length is ${avgLength} minutes, which may be too short for deep learning`,
          suggestedActions: [
            { type: 'schedule_session', parameters: { duration: 30 } }
          ]
        })
      }
    }

    return recommendations
  }

  private async generateTimeBasedRecommendations(_userId: string): Promise<StudyRecommendation[]> {
    const recommendations: StudyRecommendation[] = []
    const now = new Date()

    try {
      // Check for overdue flashcards
      const overdueCards = await invoke<any[]>('get_overdue_flashcards')
      if (overdueCards.length > 0) {
        recommendations.push({
          id: crypto.randomUUID(),
          type: 'topic_review',
          priority: 'high',
          title: 'Review Overdue Flashcards',
          description: `You have ${overdueCards.length} flashcards that are overdue for review`,
          reasoning: 'Regular review prevents knowledge decay',
          suggestedActions: [
            { type: 'review_flashcards', parameters: { limit: Math.min(overdueCards.length, 20) } }
          ],
          estimatedTime: Math.min(overdueCards.length * 2, 40)
        })
      }

      // Check for inactive periods
      const lastActivity = await invoke<string>('get_last_activity_date')
      if (lastActivity) {
        const daysSinceActivity = (now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceActivity > 3) {
          recommendations.push({
            id: crypto.randomUUID(),
            type: 'session_timing',
            priority: 'medium',
            title: 'Resume Your Study Routine',
            description: `It's been ${Math.floor(daysSinceActivity)} days since your last study session`,
            reasoning: 'Consistent study habits improve long-term retention',
            suggestedActions: [
              { type: 'review_flashcards', parameters: { limit: 10 } }
            ],
            estimatedTime: 15
          })
        }
      }

      return recommendations
    } catch (error) {
      console.error('Failed to generate time-based recommendations:', error)
      return []
    }
  }

  /**
   * Generate AI-powered study plan
   */
  async generateStudyPlan(request: {
    topic: string
    timeframe: number // in days
    hoursPerDay: number
    currentLevel: 'beginner' | 'intermediate' | 'advanced'
    objectives: string[]
  }): Promise<StudyPlan> {
    try {
      const { useAIStore } = await import('@/lib/stores/ai-store')
      const aiStore = useAIStore.getState()
      const activeProvider = aiStore.getActiveProvider()
      const activeModel = aiStore.getActiveModel()

      if (!activeProvider || !activeModel) {
        throw new Error('No AI provider configured for study plan generation')
      }

      const prompt = `Create a comprehensive study plan for the following requirements:
Topic: ${request.topic}
Timeframe: ${request.timeframe} days
Daily study time: ${request.hoursPerDay} hours
Current level: ${request.currentLevel}
Objectives: ${request.objectives.join(', ')}

Please generate a structured study plan with:
1. Daily sessions with specific activities
2. Progressive difficulty
3. Regular review sessions
4. Practice opportunities
5. Milestone assessments

Format the response as a JSON object with the following structure:
{
  "title": "Study Plan Title",
  "description": "Brief description",
  "sessions": [
    {
      "day": 1,
      "title": "Session Title",
      "duration": 60,
      "activities": [
        {
          "type": "study_document",
          "description": "Activity description",
          "estimatedTime": 30
        }
      ],
      "objectives": ["Objective 1", "Objective 2"]
    }
  ]
}`

      const response = await aiService.chatCompletion(
        activeProvider,
        activeModel,
        {
          messages: [{
            id: crypto.randomUUID(),
            role: 'user',
            content: prompt,
            timestamp: new Date()
          }],
          model: activeModel.id,
          temperature: 0.7,
          maxTokens: 3000
        }
      )

      const content = response.choices[0]?.message?.content || ''
      const planData = this.parseStudyPlanResponse(content)
      
      return {
        id: crypto.randomUUID(),
        title: planData.title || `${request.topic} Study Plan`,
        description: planData.description || `Comprehensive study plan for ${request.topic}`,
        objectives: request.objectives,
        timeline: {
          startDate: new Date(),
          endDate: new Date(Date.now() + request.timeframe * 24 * 60 * 60 * 1000),
          totalHours: request.timeframe * request.hoursPerDay
        },
        sessions: planData.sessions || [],
        progress: {
          completedSessions: 0,
          hoursSpent: 0,
          objectivesCompleted: 0
        },
        adaptable: true
      }
    } catch (error) {
      console.error('Failed to generate study plan:', error)
      throw new Error('Failed to generate study plan')
    }
  }

  private parseStudyPlanResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      
      return JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('Failed to parse study plan response:', error)
      
      // Fallback: create a simple plan structure
      return {
        title: 'Basic Study Plan',
        description: 'A simple study plan',
        sessions: [
          {
            day: 1,
            title: 'Introduction Session',
            duration: 60,
            activities: [
              {
                type: 'study_document',
                description: 'Review basic concepts',
                estimatedTime: 30
              },
              {
                type: 'create_notes',
                description: 'Take notes on key points',
                estimatedTime: 30
              }
            ],
            objectives: ['Understand basics']
          }
        ]
      }
    }
  }

  /**
   * Get study insights and analytics
   */
  async getStudyInsights(userId: string, days: number = 30): Promise<StudyInsight[]> {
    try {
      const insights: StudyInsight[] = []
      
      // Performance trend analysis
      const performanceTrend = await this.analyzePerformanceTrend(userId, days)
      if (performanceTrend) insights.push(performanceTrend)
      
      // Learning velocity analysis
      const learningVelocity = await this.analyzeLearningVelocity(userId, days)
      if (learningVelocity) insights.push(learningVelocity)
      
      // Retention analysis
      const retentionAnalysis = await this.analyzeRetention(userId, days)
      if (retentionAnalysis) insights.push(retentionAnalysis)
      
      return insights
    } catch (error) {
      console.error('Failed to get study insights:', error)
      return []
    }
  }

  private async analyzePerformanceTrend(_userId: string, days: number): Promise<StudyInsight | null> {
    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
      
      const actions = await invoke<UserAction[]>('get_actions_by_date_range', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      const flashcardReviews = actions.filter(action => action.action_type === 'flashcard_review')
      if (flashcardReviews.length < 10) return null

      // Calculate weekly success rates
      const weeklyRates: { week: number; successRate: number }[] = []
      const weekMs = 7 * 24 * 60 * 60 * 1000
      
      for (let i = 0; i < Math.ceil(days / 7); i++) {
        const weekStart = new Date(startDate.getTime() + i * weekMs)
        const weekEnd = new Date(Math.min(weekStart.getTime() + weekMs, endDate.getTime()))
        
        const weekReviews = flashcardReviews.filter(action => {
          const actionDate = new Date(action.timestamp)
          return actionDate >= weekStart && actionDate < weekEnd
        })
        
        if (weekReviews.length > 0) {
          const successful = weekReviews.filter(action => action.data?.response === 'correct').length
          const successRate = successful / weekReviews.length
          weeklyRates.push({ week: i + 1, successRate })
        }
      }

      if (weeklyRates.length < 2) return null

      // Calculate trend
      const firstWeek = weeklyRates[0].successRate
      const lastWeek = weeklyRates[weeklyRates.length - 1].successRate
      const trend = lastWeek - firstWeek
      
      const trendDescription = trend > 0.1 ? 'improving' : trend < -0.1 ? 'declining' : 'stable'

      return {
        id: crypto.randomUUID(),
        type: 'performance_trend',
        title: `Performance Trend: ${trendDescription}`,
        description: `Your performance has been ${trendDescription} over the past ${days} days`,
        data: {
          weeklyRates,
          trend,
          trendDescription,
          overallSuccessRate: flashcardReviews.filter(a => a.data?.response === 'correct').length / flashcardReviews.length
        },
        actionable: Math.abs(trend) > 0.1,
        recommendations: Math.abs(trend) > 0.1 ? [
          {
            id: crypto.randomUUID(),
            type: 'study_plan',
            priority: trend < -0.1 ? 'high' : 'medium',
            title: trend < -0.1 ? 'Address Performance Decline' : 'Maintain Good Progress',
            description: trend < -0.1 
              ? 'Your performance has declined recently. Consider adjusting your study approach.'
              : 'Your performance is improving. Keep up the good work!',
            reasoning: `Performance trend: ${(trend * 100).toFixed(1)}% change`,
            suggestedActions: trend < -0.1 
              ? [{ type: 'review_flashcards', parameters: { focus: 'difficult' } }]
              : [{ type: 'schedule_session', parameters: { maintain: true } }]
          }
        ] : undefined,
        confidence: Math.min(flashcardReviews.length / 50, 1)
      }
    } catch (error) {
      console.error('Failed to analyze performance trend:', error)
      return null
    }
  }

  private async analyzeLearningVelocity(_userId: string, days: number): Promise<StudyInsight | null> {
    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
      
      const actions = await invoke<UserAction[]>('get_actions_by_date_range', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      const learningActions = actions.filter(action => 
        ['document_view', 'note_create', 'flashcard_create', 'flashcard_review'].includes(action.action_type)
      )

      if (learningActions.length < 5) return null

      const dailyActivity = new Map<string, number>()
      learningActions.forEach(action => {
        const day = new Date(action.timestamp).toDateString()
        dailyActivity.set(day, (dailyActivity.get(day) || 0) + 1)
      })

      const activeDays = dailyActivity.size
      const averageActivitiesPerDay = learningActions.length / activeDays
      const consistencyScore = activeDays / days // How many days were active

      return {
        id: crypto.randomUUID(),
        type: 'learning_velocity',
        title: 'Learning Velocity Analysis',
        description: `You average ${averageActivitiesPerDay.toFixed(1)} learning activities per active day`,
        data: {
          totalActivities: learningActions.length,
          activeDays,
          averageActivitiesPerDay,
          consistencyScore,
          dailyBreakdown: Array.from(dailyActivity.entries())
        },
        actionable: consistencyScore < 0.5,
        recommendations: consistencyScore < 0.5 ? [
          {
            id: crypto.randomUUID(),
            type: 'session_timing',
            priority: 'medium',
            title: 'Improve Study Consistency',
            description: 'Try to study more regularly to improve learning effectiveness',
            reasoning: `You're only studying ${Math.round(consistencyScore * 100)}% of days`,
            suggestedActions: [
              { type: 'schedule_session', parameters: { frequency: 'daily', duration: 20 } }
            ]
          }
        ] : undefined,
        confidence: Math.min(learningActions.length / 30, 1)
      }
    } catch (error) {
      console.error('Failed to analyze learning velocity:', error)
      return null
    }
  }

  private async analyzeRetention(_userId: string, days: number): Promise<StudyInsight | null> {
    try {
      const flashcardReviews = await invoke<any[]>('get_flashcard_retention_analysis', { days })
      
      if (flashcardReviews.length < 10) return null

      const retentionByInterval = new Map<number, { total: number; successful: number }>()
      
      flashcardReviews.forEach(review => {
        const interval = review.interval_days || 1
        const bucket = Math.floor(interval / 7) * 7 // Group by weeks
        
        if (!retentionByInterval.has(bucket)) {
          retentionByInterval.set(bucket, { total: 0, successful: 0 })
        }
        
        const data = retentionByInterval.get(bucket)!
        data.total++
        if (review.was_successful) {
          data.successful++
        }
      })

      const retentionRates = Array.from(retentionByInterval.entries())
        .map(([interval, data]) => ({
          intervalWeeks: interval / 7,
          retentionRate: data.successful / data.total,
          sampleSize: data.total
        }))
        .sort((a, b) => a.intervalWeeks - b.intervalWeeks)

      const overallRetention = flashcardReviews.filter(r => r.was_successful).length / flashcardReviews.length

      return {
        id: crypto.randomUUID(),
        type: 'retention_analysis',
        title: 'Knowledge Retention Analysis',
        description: `Your overall retention rate is ${(overallRetention * 100).toFixed(1)}%`,
        data: {
          overallRetention,
          retentionByInterval: retentionRates,
          totalReviews: flashcardReviews.length
        },
        actionable: overallRetention < 0.7,
        recommendations: overallRetention < 0.7 ? [
          {
            id: crypto.randomUUID(),
            type: 'topic_review',
            priority: 'high',
            title: 'Improve Knowledge Retention',
            description: 'Your retention rate is below optimal. Consider more frequent review.',
            reasoning: `Retention rate: ${(overallRetention * 100).toFixed(1)}%`,
            suggestedActions: [
              { type: 'review_flashcards', parameters: { focus: 'low_retention' } }
            ]
          }
        ] : undefined,
        confidence: Math.min(flashcardReviews.length / 50, 1)
      }
    } catch (error) {
      console.error('Failed to analyze retention:', error)
      return null
    }
  }
}

export const studyRecommendationsService = new StudyRecommendationsService() 