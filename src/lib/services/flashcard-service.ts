import { aiService } from '@/lib/services/ai-service'
import type { Flashcard, FlashcardReview } from '@/lib/stores/flashcard-store'

// 🧠 PHASE 2: Flashcard Service with SM-2 Algorithm and AI Generation

export interface SM2Result {
  efFactor: number
  interval: number
  repetitions: number
  nextReview: Date
}

export interface FlashcardGenerationRequest {
  text: string
  documentId?: string
  categoryId?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  cardType?: 'basic' | 'cloze' | 'image' | 'definition'
  maxCards?: number
}

export interface GeneratedFlashcard {
  front: string
  back: string
  sourceText: string
  confidence: number
  cardType: 'basic' | 'cloze' | 'image' | 'definition'
  tags: string[]
}

export class FlashcardService {
  private static instance: FlashcardService
  
  static getInstance(): FlashcardService {
    if (!FlashcardService.instance) {
      FlashcardService.instance = new FlashcardService()
    }
    return FlashcardService.instance
  }

  /**
   * SM-2 Spaced Repetition Algorithm Implementation
   * Based on the SuperMemo SM-2 algorithm with quality ratings 0-5
   */
  calculateSM2(
    quality: number, // 0-5 scale (0 = complete blackout, 5 = perfect response)
    previousEF: number = 2.5,
    previousInterval: number = 1,
    previousRepetitions: number = 0
  ): SM2Result {
    // Ensure quality is within bounds
    quality = Math.max(0, Math.min(5, quality))
    
    let newEF = previousEF
    let newInterval = previousInterval
    let newRepetitions = previousRepetitions

    // Calculate new ease factor
    newEF = previousEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    
    // Ensure EF doesn't go below 1.3
    if (newEF < 1.3) {
      newEF = 1.3
    }

    // If quality was below 3, reset repetitions and interval
    if (quality < 3) {
      newRepetitions = 0
      newInterval = 1
    } else {
      newRepetitions = previousRepetitions + 1
      
      // Calculate new interval based on repetitions
      if (newRepetitions === 1) {
        newInterval = 1
      } else if (newRepetitions === 2) {
        newInterval = 6
      } else {
        newInterval = Math.round(previousInterval * newEF)
      }
    }

    // Calculate next review date
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + newInterval)

    return {
      efFactor: Math.round(newEF * 100) / 100, // Round to 2 decimal places
      interval: newInterval,
      repetitions: newRepetitions,
      nextReview
    }
  }

  /**
   * Convert confidence rating (1-5) to SM-2 quality (0-5)
   * This helps bridge the UI confidence scale to the algorithm
   */
  confidenceToQuality(confidence: number, wasCorrect: boolean): number {
    if (!wasCorrect) {
      return Math.max(0, confidence - 2) // Incorrect answers get lower quality
    }
    
    // Correct answers map confidence directly
    return Math.max(0, confidence - 1)
  }

  /**
   * Generate flashcards from text using AI
   */
  async generateFlashcardsFromText(request: FlashcardGenerationRequest): Promise<GeneratedFlashcard[]> {
    const { text, maxCards = 10, cardType = 'basic', difficulty = 'medium' } = request
    
    try {
      // Get active AI provider and model
      const { useAIStore } = await import('@/lib/stores/ai-store')
      const aiStore = useAIStore.getState()
      const activeProvider = aiStore.getActiveProvider()
      const activeModel = aiStore.getActiveModel()

      if (!activeProvider || !activeModel) {
        throw new Error('No AI provider configured for flashcard generation')
      }

      const prompt = this.buildGenerationPrompt(text, cardType, difficulty, maxCards)
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
          temperature: 0.3,
          maxTokens: 2000
        }
      )

      const content = response.choices[0]?.message?.content || ''
      return this.parseAIResponse(content, text)
    } catch (error) {
      console.error('Failed to generate flashcards:', error)
      throw new Error('Failed to generate flashcards from text')
    }
  }

  /**
   * Generate flashcards from selected text with context
   */
  async generateFlashcardsFromSelection(
    selectedText: string,
    contextText: string,
    options: Partial<FlashcardGenerationRequest> = {}
  ): Promise<GeneratedFlashcard[]> {
    const fullContext = `Context: ${contextText}\n\nSelected Text: ${selectedText}`
    
    return this.generateFlashcardsFromText({
      text: fullContext,
      maxCards: 5, // Fewer cards for selections
      ...options
    })
  }

  /**
   * Extract key concepts from text for flashcard creation
   */
  async extractKeyConcepts(text: string): Promise<string[]> {
    try {
      // Get active AI provider and model
      const { useAIStore } = await import('@/lib/stores/ai-store')
      const aiStore = useAIStore.getState()
      const activeProvider = aiStore.getActiveProvider()
      const activeModel = aiStore.getActiveModel()

      if (!activeProvider || !activeModel) {
        console.warn('No AI provider configured for concept extraction')
        return []
      }

      const prompt = `Extract 10-15 key concepts, terms, or important facts from the following text. Return only a JSON array of strings, no other text:

${text}`

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
          temperature: 0.2,
          maxTokens: 500
        }
      )

      const content = response.choices[0]?.message?.content || ''

      // Try to parse as JSON array
      try {
        const concepts = JSON.parse(content)
        return Array.isArray(concepts) ? concepts : []
      } catch {
        // Fallback: split by lines and clean up
        return content
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line && !line.startsWith('[') && !line.startsWith(']'))
          .slice(0, 15)
      }
    } catch (error) {
      console.error('Failed to extract concepts:', error)
      return []
    }
  }

  /**
   * Suggest optimal study session based on due cards
   */
  calculateOptimalSession(
    dueCards: Flashcard[],
    newCards: Flashcard[],
    availableMinutes: number = 30
  ): {
    recommendedCards: Flashcard[]
    estimatedTime: number
    sessionType: 'review' | 'mixed' | 'new'
    strategy: string
  } {
    const averageTimePerCard = 45 // seconds
    const maxCards = Math.floor((availableMinutes * 60) / averageTimePerCard)
    
    let recommendedCards: Flashcard[] = []
    let sessionType: 'review' | 'mixed' | 'new' = 'mixed'
    let strategy = ''

    if (dueCards.length === 0 && newCards.length === 0) {
      return {
        recommendedCards: [],
        estimatedTime: 0,
        sessionType: 'mixed',
        strategy: 'No cards available for review'
      }
    }

    // Prioritize due cards
    if (dueCards.length >= maxCards) {
      recommendedCards = dueCards.slice(0, maxCards)
      sessionType = 'review'
      strategy = 'Focus on overdue cards'
    } else if (dueCards.length > 0) {
      // Mix due and new cards
      const remainingSlots = maxCards - dueCards.length
      const newCardsToAdd = Math.min(remainingSlots, newCards.length)
      
      recommendedCards = [
        ...dueCards,
        ...newCards.slice(0, newCardsToAdd)
      ]
      sessionType = 'mixed'
      strategy = `Review ${dueCards.length} due cards and learn ${newCardsToAdd} new cards`
    } else {
      // Only new cards
      recommendedCards = newCards.slice(0, maxCards)
      sessionType = 'new'
      strategy = 'Learn new cards'
    }

    const estimatedTime = Math.ceil((recommendedCards.length * averageTimePerCard) / 60)

    return {
      recommendedCards,
      estimatedTime,
      sessionType,
      strategy
    }
  }

  /**
   * Analyze review performance and provide insights
   */
  analyzeReviewPerformance(reviews: FlashcardReview[]): {
    accuracy: number
    averageTime: number
    strongPoints: string[]
    weakPoints: string[]
    recommendations: string[]
  } {
    if (reviews.length === 0) {
      return {
        accuracy: 0,
        averageTime: 0,
        strongPoints: [],
        weakPoints: [],
        recommendations: ['Start reviewing flashcards to build your knowledge base!']
      }
    }

    const correctReviews = reviews.filter(r => r.response === 'correct').length
    const accuracy = correctReviews / reviews.length
    const averageTime = reviews.reduce((sum, r) => sum + r.timeSpent, 0) / reviews.length

    const strongPoints: string[] = []
    const weakPoints: string[] = []
    const recommendations: string[] = []

    // Analyze accuracy
    if (accuracy >= 0.8) {
      strongPoints.push('High accuracy rate - excellent retention!')
    } else if (accuracy < 0.6) {
      weakPoints.push('Low accuracy rate - needs more frequent review')
      recommendations.push('Consider reviewing cards more frequently')
    }

    // Analyze speed
    if (averageTime <= 30) {
      strongPoints.push('Quick recall - concepts are well internalized')
    } else if (averageTime > 60) {
      weakPoints.push('Slow recall - may need more practice')
      recommendations.push('Focus on understanding core concepts better')
    }

    // Time-based analysis
    const recentReviews = reviews.slice(0, 10)
    const recentAccuracy = recentReviews.filter(r => r.response === 'correct').length / recentReviews.length
    
    if (recentAccuracy > accuracy + 0.1) {
      strongPoints.push('Improving performance trend')
    } else if (recentAccuracy < accuracy - 0.1) {
      weakPoints.push('Declining performance - may need a break')
      recommendations.push('Consider taking a short break or reviewing study materials')
    }

    return {
      accuracy: Math.round(accuracy * 100) / 100,
      averageTime: Math.round(averageTime),
      strongPoints,
      weakPoints,
      recommendations
    }
  }

  private buildGenerationPrompt(
    text: string,
    cardType: string,
    difficulty: string,
    maxCards: number
  ): string {
    const basePrompt = `Generate ${maxCards} high-quality flashcards from the following text. Create ${cardType} flashcards with ${difficulty} difficulty level.

Instructions:
- Extract the most important concepts, facts, and relationships
- Make questions clear and specific
- Ensure answers are concise but complete
- Avoid overly obvious or overly obscure questions
- Include relevant context in questions when needed

Text to process:
${text}

Return ONLY a JSON array of flashcard objects with this exact format:
[
  {
    "front": "Question or prompt",
    "back": "Clear, concise answer",
    "sourceText": "Relevant excerpt from source",
    "confidence": 0.9,
    "cardType": "${cardType}",
    "tags": ["concept1", "concept2"]
  }
]`

    return basePrompt
  }

  private parseAIResponse(response: string, sourceText: string): GeneratedFlashcard[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in response')
      }

      const flashcards = JSON.parse(jsonMatch[0])
      
      if (!Array.isArray(flashcards)) {
        throw new Error('Response is not an array')
      }

      return flashcards.map((card: any) => ({
        front: card.front || '',
        back: card.back || '',
        sourceText: card.sourceText || sourceText.slice(0, 200),
        confidence: typeof card.confidence === 'number' ? card.confidence : 0.8,
        cardType: card.cardType || 'basic',
        tags: Array.isArray(card.tags) ? card.tags : []
      })).filter(card => card.front && card.back)
      
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      
      // Fallback: try to extract question-answer pairs manually
      return this.extractQAPairs(response, sourceText)
    }
  }

  private extractQAPairs(text: string, sourceText: string): GeneratedFlashcard[] {
    const lines = text.split('\n').filter(line => line.trim())
    const flashcards: GeneratedFlashcard[] = []
    
    for (let i = 0; i < lines.length - 1; i += 2) {
      const question = lines[i]?.replace(/^[QA]:\s*/, '').trim()
      const answer = lines[i + 1]?.replace(/^[QA]:\s*/, '').trim()
      
      if (question && answer) {
        flashcards.push({
          front: question,
          back: answer,
          sourceText: sourceText.slice(0, 200),
          confidence: 0.7,
          cardType: 'basic',
          tags: []
        })
      }
    }
    
    return flashcards.slice(0, 5) // Limit fallback results
  }
}

// Export singleton instance
export const flashcardService = FlashcardService.getInstance() 