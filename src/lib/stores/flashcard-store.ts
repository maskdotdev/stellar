import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { invoke } from '@tauri-apps/api/core'
import { flashcardService } from '@/lib/services/flashcard-service'

// 🧠 PHASE 2: Flashcard System - TypeScript Interfaces

export interface Flashcard {
  id: string
  front: string
  back: string
  sourceDocumentId?: string
  sourceText?: string
  difficulty: 'easy' | 'medium' | 'hard'
  createdAt: Date
  lastReviewed?: Date
  nextReview?: Date
  reviewCount: number
  successRate: number
  tags: string[]
  categoryId?: string
  cardType: 'basic' | 'cloze' | 'image' | 'definition'
  deckId?: string
  efFactor: number // Ease Factor for SM-2 algorithm
  interval: number // Review interval in days
  repetitions: number // Number of consecutive successful reviews
  metadata?: Record<string, any>
}

export interface FlashcardReview {
  id: string
  flashcardId: string
  sessionId: string
  timestamp: Date
  response: 'correct' | 'incorrect' | 'partial'
  timeSpent: number // Time spent in seconds
  confidence: 1 | 2 | 3 | 4 | 5
  quality: 0 | 1 | 2 | 3 | 4 | 5 // For SM-2 algorithm
  previousEf: number
  newEf: number
  previousInterval: number
  newInterval: number
  metadata?: Record<string, any>
}

export interface FlashcardDeck {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  createdAt: Date
  updatedAt: Date
  categoryId?: string
  isShared: boolean
  tags: string[]
  cardCount: number
  dueCount: number
  metadata?: Record<string, any>
}

export interface CreateFlashcardRequest {
  front: string
  back: string
  sourceDocumentId?: string
  sourceText?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  tags: string[]
  categoryId?: string
  cardType?: 'basic' | 'cloze' | 'image' | 'definition'
  deckId?: string
  metadata?: Record<string, any>
}

export interface CreateFlashcardDeckRequest {
  name: string
  description?: string
  color?: string
  icon?: string
  categoryId?: string
  tags: string[]
  isShared?: boolean
  metadata?: Record<string, any>
}

export interface CreateFlashcardReviewRequest {
  flashcardId: string
  sessionId: string
  response: 'correct' | 'incorrect' | 'partial'
  timeSpent: number
  confidence: 1 | 2 | 3 | 4 | 5
  quality: 0 | 1 | 2 | 3 | 4 | 5
  metadata?: Record<string, any>
}

export interface FlashcardStats {
  totalCards: number
  cardsDue: number
  cardsNew: number
  cardsLearning: number
  cardsMastered: number
  totalReviews: number
  averageSuccessRate: number
  studyStreak: number
  cardsByDifficulty: Record<string, number>
  cardsByType: Record<string, number>
  reviewAccuracyTrend: number[]
  dailyReviewCount: number
}

export interface FlashcardReviewSession {
  dueCards: Flashcard[]
  newCards: Flashcard[]
  sessionLimit: number
  estimatedTime: number // in minutes
  mixStrategy: 'due_first' | 'mixed' | 'new_first'
}

// Zustand Store for Flashcard Management

interface FlashcardState {
  // State
  flashcards: Flashcard[]
  decks: FlashcardDeck[]
  currentDeck: FlashcardDeck | null
  currentReviewSession: FlashcardReviewSession | null
  isReviewMode: boolean
  stats: FlashcardStats | null
  isLoading: boolean
  error: string | null

  // Actions
  createFlashcard: (request: CreateFlashcardRequest) => Promise<Flashcard>
  updateFlashcard: (id: string, request: CreateFlashcardRequest) => Promise<Flashcard | null>
  deleteFlashcard: (id: string) => Promise<boolean>
  getFlashcard: (id: string) => Promise<Flashcard | null>
  getFlashcards: (limit?: number, offset?: number) => Promise<Flashcard[]>
  getFlashcardsByDeck: (deckId: string) => Promise<Flashcard[]>
  getFlashcardsByCategory: (categoryId: string) => Promise<Flashcard[]>
  getFlashcardsByDocument: (documentId: string) => Promise<Flashcard[]>

  // Deck actions
  createDeck: (request: CreateFlashcardDeckRequest) => Promise<FlashcardDeck>
  updateDeck: (id: string, request: CreateFlashcardDeckRequest) => Promise<FlashcardDeck | null>
  deleteDeck: (id: string) => Promise<boolean>
  getDeck: (id: string) => Promise<FlashcardDeck | null>
  getDecks: () => Promise<FlashcardDeck[]>
  setCurrentDeck: (deck: FlashcardDeck | null) => void

  // Review actions
  recordReview: (request: CreateFlashcardReviewRequest) => Promise<FlashcardReview>
  getDueFlashcards: (limit?: number) => Promise<Flashcard[]>
  getNewFlashcards: (limit?: number) => Promise<Flashcard[]>
  getReviewSession: (sessionLimit: number, mixStrategy: string) => Promise<FlashcardReviewSession>
  startReviewSession: (session: FlashcardReviewSession) => void
  endReviewSession: () => void

  // Statistics
  getStats: () => Promise<FlashcardStats>
  refreshStats: () => Promise<void>

  // AI Generation
  generateFlashcardsFromText: (text: string, documentId?: string) => Promise<Flashcard[]>
  generateFlashcardsFromDocument: (documentId: string) => Promise<Flashcard[]>

  // Utility
  refreshFlashcards: () => Promise<void>
  refreshDecks: () => Promise<void>
  setError: (error: string | null) => void
  clearError: () => void
}

export const useFlashcardStore = create<FlashcardState>()(
  persist(
    (set, get) => ({
      // Initial state
      flashcards: [],
      decks: [],
      currentDeck: null,
      currentReviewSession: null,
      isReviewMode: false,
      stats: null,
      isLoading: false,
      error: null,

      // Flashcard CRUD
      createFlashcard: async (request: CreateFlashcardRequest) => {
        try {
          set({ isLoading: true, error: null })
          const flashcard = await invoke<Flashcard>('create_flashcard', { request })
          const flashcards = get().flashcards
          set({ flashcards: [flashcard, ...flashcards], isLoading: false })
          return flashcard
        } catch (error) {
          set({ error: `Failed to create flashcard: ${error}`, isLoading: false })
          throw error
        }
      },

      updateFlashcard: async (id: string, request: CreateFlashcardRequest) => {
        try {
          set({ isLoading: true, error: null })
          const flashcard = await invoke<Flashcard | null>('update_flashcard', { id, request })
          if (flashcard) {
            const flashcards = get().flashcards.map(f => f.id === id ? flashcard : f)
            set({ flashcards, isLoading: false })
          }
          set({ isLoading: false })
          return flashcard
        } catch (error) {
          set({ error: `Failed to update flashcard: ${error}`, isLoading: false })
          throw error
        }
      },

      deleteFlashcard: async (id: string) => {
        try {
          set({ isLoading: true, error: null })
          const success = await invoke<boolean>('delete_flashcard', { id })
          if (success) {
            const flashcards = get().flashcards.filter(f => f.id !== id)
            set({ flashcards, isLoading: false })
          }
          set({ isLoading: false })
          return success
        } catch (error) {
          set({ error: `Failed to delete flashcard: ${error}`, isLoading: false })
          throw error
        }
      },

      getFlashcard: async (id: string) => {
        try {
          const flashcard = await invoke<Flashcard | null>('get_flashcard', { id })
          return flashcard
        } catch (error) {
          set({ error: `Failed to get flashcard: ${error}` })
          throw error
        }
      },

      getFlashcards: async (limit?: number, offset?: number) => {
        try {
          set({ isLoading: true, error: null })
          const flashcards = await invoke<Flashcard[]>('get_flashcards', { limit, offset })
          console.log('flashcards', flashcards)
          set({ flashcards, isLoading: false })
          return flashcards
        } catch (error) {
          set({ error: `Failed to get flashcards: ${error}`, isLoading: false })
          throw error
        }
      },

      getFlashcardsByDeck: async (deckId: string) => {
        try {
          const flashcards = await invoke<Flashcard[]>('get_flashcards_by_deck', { deckId })
          return flashcards
        } catch (error) {
          set({ error: `Failed to get flashcards by deck: ${error}` })
          throw error
        }
      },

      getFlashcardsByCategory: async (categoryId: string) => {
        try {
          const flashcards = await invoke<Flashcard[]>('get_flashcards_by_category', { categoryId })
          return flashcards
        } catch (error) {
          set({ error: `Failed to get flashcards by category: ${error}` })
          throw error
        }
      },

      getFlashcardsByDocument: async (documentId: string) => {
        try {
          const flashcards = await invoke<Flashcard[]>('get_flashcards_by_document', { documentId })
          return flashcards
        } catch (error) {
          set({ error: `Failed to get flashcards by document: ${error}` })
          throw error
        }
      },

      // Deck CRUD
      createDeck: async (request: CreateFlashcardDeckRequest) => {
        try {
          set({ isLoading: true, error: null })
          const deck = await invoke<FlashcardDeck>('create_flashcard_deck', { request })
          const decks = get().decks
          set({ decks: [deck, ...decks], isLoading: false })
          return deck
        } catch (error) {
          set({ error: `Failed to create deck: ${error}`, isLoading: false })
          throw error
        }
      },

      updateDeck: async (id: string, request: CreateFlashcardDeckRequest) => {
        try {
          set({ isLoading: true, error: null })
          const deck = await invoke<FlashcardDeck | null>('update_flashcard_deck', { id, request })
          if (deck) {
            const decks = get().decks.map(d => d.id === id ? deck : d)
            set({ decks, isLoading: false })
          }
          set({ isLoading: false })
          return deck
        } catch (error) {
          set({ error: `Failed to update deck: ${error}`, isLoading: false })
          throw error
        }
      },

      deleteDeck: async (id: string) => {
        try {
          set({ isLoading: true, error: null })
          const success = await invoke<boolean>('delete_flashcard_deck', { id })
          if (success) {
            const decks = get().decks.filter(d => d.id !== id)
            set({ decks, isLoading: false })
          }
          set({ isLoading: false })
          return success
        } catch (error) {
          set({ error: `Failed to delete deck: ${error}`, isLoading: false })
          throw error
        }
      },

      getDeck: async (id: string) => {
        try {
          const deck = await invoke<FlashcardDeck | null>('get_flashcard_deck', { id })
          return deck
        } catch (error) {
          set({ error: `Failed to get deck: ${error}` })
          throw error
        }
      },

      getDecks: async () => {
        try {
          set({ isLoading: true, error: null })
          const decks = await invoke<FlashcardDeck[]>('get_flashcard_decks')
          set({ decks, isLoading: false })
          return decks
        } catch (error) {
          set({ error: `Failed to get decks: ${error}`, isLoading: false })
          throw error
        }
      },

      setCurrentDeck: (deck: FlashcardDeck | null) => {
        set({ currentDeck: deck })
      },

      // Review system
      recordReview: async (request: CreateFlashcardReviewRequest) => {
        try {
          const review = await invoke<FlashcardReview>('record_flashcard_review', { request })
          // Refresh flashcards to update review data
          get().refreshFlashcards()
          return review
        } catch (error) {
          set({ error: `Failed to record review: ${error}` })
          throw error
        }
      },

      getDueFlashcards: async (limit?: number) => {
        try {
          const flashcards = await invoke<Flashcard[]>('get_due_flashcards', { limit })
          return flashcards
        } catch (error) {
          set({ error: `Failed to get due flashcards: ${error}` })
          throw error
        }
      },

      getNewFlashcards: async (limit?: number) => {
        try {
          const flashcards = await invoke<Flashcard[]>('get_new_flashcards', { limit })
          return flashcards
        } catch (error) {
          set({ error: `Failed to get new flashcards: ${error}` })
          throw error
        }
      },

      getReviewSession: async (sessionLimit: number, mixStrategy: string) => {
        try {
          const session = await invoke<FlashcardReviewSession>('get_flashcard_review_session', { 
            sessionLimit, 
            mixStrategy 
          })
          return session
        } catch (error) {
          set({ error: `Failed to get review session: ${error}` })
          throw error
        }
      },

      startReviewSession: (session: FlashcardReviewSession) => {
        set({ currentReviewSession: session, isReviewMode: true })
      },

      endReviewSession: () => {
        set({ currentReviewSession: null, isReviewMode: false })
      },

      // Statistics
      getStats: async () => {
        try {
          const stats = await invoke<FlashcardStats>('get_flashcard_stats')
          set({ stats })
          return stats
        } catch (error) {
          set({ error: `Failed to get stats: ${error}` })
          throw error
        }
      },

      refreshStats: async () => {
        try {
          await get().getStats()
        } catch (error) {
          console.error('Failed to refresh stats:', error)
        }
      },

      // AI Generation
      generateFlashcardsFromText: async (text: string, documentId?: string) => {
        try {
          set({ isLoading: true, error: null })
          
          const generatedCards = await flashcardService.generateFlashcardsFromText({
            text,
            maxCards: 10,
            cardType: 'basic',
            difficulty: 'medium'
          })

          const flashcards: Flashcard[] = []
          
          for (const card of generatedCards) {
            const request: CreateFlashcardRequest = {
              front: card.front,
              back: card.back,
              sourceText: card.sourceText,
              sourceDocumentId: documentId,
              difficulty: 'medium',
              tags: card.tags,
              cardType: card.cardType,
              deckId: undefined
            }
            
            const flashcard = await get().createFlashcard(request)
            flashcards.push(flashcard)
          }

          set({ isLoading: false })
          return flashcards
        } catch (error) {
          set({ error: `Failed to generate flashcards: ${error}`, isLoading: false })
          throw error
        }
      },

      generateFlashcardsFromDocument: async (documentId: string) => {
        try {
          set({ isLoading: true, error: null })
          
          // TODO: Get document content and generate flashcards
          // For now, we'll use placeholder text
          const documentText = "This is placeholder text for document content"
          
          const generatedCards = await flashcardService.generateFlashcardsFromText({
            text: documentText,
            maxCards: 15,
            cardType: 'basic',
            difficulty: 'medium'
          })

          const flashcards: Flashcard[] = []
          
          for (const card of generatedCards) {
            const request: CreateFlashcardRequest = {
              front: card.front,
              back: card.back,
              sourceText: card.sourceText,
              sourceDocumentId: documentId,
              difficulty: 'medium',
              tags: card.tags,
              cardType: card.cardType,
              deckId: undefined
            }
            
            const flashcard = await get().createFlashcard(request)
            flashcards.push(flashcard)
          }

          set({ isLoading: false })
          return flashcards
        } catch (error) {
          set({ error: `Failed to generate flashcards: ${error}`, isLoading: false })
          throw error
        }
      },

      // Utility
      refreshFlashcards: async () => {
        try {
          await get().getFlashcards()
        } catch (error) {
          console.error('Failed to refresh flashcards:', error)
        }
      },

      refreshDecks: async () => {
        try {
          await get().getDecks()
        } catch (error) {
          console.error('Failed to refresh decks:', error)
        }
      },

      setError: (error: string | null) => {
        set({ error })
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'flashcard-store',
      partialize: (state) => ({
        currentDeck: state.currentDeck,
        // Don't persist flashcards and decks - they should be fetched fresh
      }),
    }
  )
) 