import { useCallback, useRef } from 'react'
import { ActionsService, ActionType, ActionData, ActionContext } from '@/lib/services/actions-service'

interface DebouncedActionOptions {
  delay?: number
  maxWait?: number
  leading?: boolean
  trailing?: boolean
}

/**
 * Custom hook for debounced action recording
 * Prevents flooding the database with rapid actions like note edits
 */
export function useDebouncedAction(options: DebouncedActionOptions = {}) {
  const {
    delay = 5000, // 5 seconds default delay
    maxWait = 15000, // 15 seconds maximum wait
    leading = false,
    trailing = true
  } = options

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastArgsRef = useRef<{
    type: ActionType
    data: ActionData
    context?: Partial<ActionContext>
  } | null>(null)
  const actionsService = ActionsService.getInstance()

  const debouncedRecordAction = useCallback(
    (type: ActionType, data: ActionData, context?: Partial<ActionContext>) => {
      // Store the latest arguments for trailing execution
      lastArgsRef.current = { type, data, context }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Execute immediately if leading is true and no timeout is pending
      if (leading && !timeoutRef.current) {
        actionsService.recordActionWithAutoContext(type, data, context)
      }

      // Set up the delayed execution
      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          if (lastArgsRef.current) {
            actionsService.recordActionWithAutoContext(
              lastArgsRef.current.type,
              lastArgsRef.current.data,
              lastArgsRef.current.context
            )
          }
          timeoutRef.current = null
          if (maxTimeoutRef.current) {
            clearTimeout(maxTimeoutRef.current)
            maxTimeoutRef.current = null
          }
        }, delay)
      }

      // Set up maximum wait timeout
      if (maxWait && !maxTimeoutRef.current) {
        maxTimeoutRef.current = setTimeout(() => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          if (lastArgsRef.current) {
            actionsService.recordActionWithAutoContext(
              lastArgsRef.current.type,
              lastArgsRef.current.data,
              lastArgsRef.current.context
            )
          }
          maxTimeoutRef.current = null
        }, maxWait)
      }
    },
    [delay, maxWait, leading, trailing, actionsService]
  )

  // Function to immediately flush any pending action
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current)
      maxTimeoutRef.current = null
    }
    if (lastArgsRef.current) {
      actionsService.recordActionWithAutoContext(
        lastArgsRef.current.type,
        lastArgsRef.current.data,
        lastArgsRef.current.context
      )
      lastArgsRef.current = null
    }
  }, [actionsService])

  // Function to cancel any pending action
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current)
      maxTimeoutRef.current = null
    }
    lastArgsRef.current = null
  }, [])

  return {
    debouncedRecordAction,
    flush,
    cancel
  }
}

/**
 * Hook specifically for search actions
 * Uses optimized settings for search queries
 */
export function useDebouncedSearchAction() {
  const { debouncedRecordAction } = useDebouncedAction({
    delay: 1000, // 1 second - shorter delay for search
    maxWait: 3000, // 3 seconds maximum wait
    trailing: true,
    leading: false
  })

  const recordSearch = useCallback((
    query: string,
    scope: string,
    resultCount: number,
    options: {
      categoryId?: string
      sessionId?: string
    } = {}
  ) => {
    debouncedRecordAction(
      ActionType.SEARCH_QUERY,
      {
        query,
        scope,
        resultCount,
        queryLength: query.length,
        hasResults: resultCount > 0
      },
      {
        sessionId: options.sessionId,
        categoryIds: options.categoryId ? [options.categoryId] : undefined
      }
    )
  }, [debouncedRecordAction])

  return { recordSearch }
}

/**
 * Hook specifically for note editing actions
 * Uses optimized settings for note editing workflow
 */
export function useDebouncedNoteAction() {
  const editStartTimeRef = useRef<Date | null>(null)
  const editCountRef = useRef<number>(0)
  const initialContentRef = useRef<string>('')

  const { debouncedRecordAction, flush, cancel } = useDebouncedAction({
    delay: 8000, // 8 seconds - longer delay for note editing
    maxWait: 30000, // 30 seconds maximum wait
    trailing: true,
    leading: false
  })

  const recordNoteEdit = useCallback((
    documentId: string,
    noteTitle: string,
    content: string,
    options: {
      tags?: string[]
      categoryId?: string
      sessionId?: string
      isManualSave?: boolean
    } = {}
  ) => {
    // Track editing session
    if (!editStartTimeRef.current) {
      editStartTimeRef.current = new Date()
      initialContentRef.current = content
      editCountRef.current = 0
    }
    
    editCountRef.current++

    // Calculate word count and edit metrics
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length
    const contentDelta = content.length - initialContentRef.current.length
    const editDuration = editStartTimeRef.current ? 
      (new Date().getTime() - editStartTimeRef.current.getTime()) / 1000 : 0

    // For manual saves, flush immediately
    if (options.isManualSave) {
      flush()
      // Reset editing session after manual save
      editStartTimeRef.current = new Date()
      initialContentRef.current = content
      editCountRef.current = 1
    }

    debouncedRecordAction(
      ActionType.NOTE_EDIT,
      {
        documentId,
        noteTitle,
        noteWordCount: wordCount,
        tags: options.tags || [],
        categoryId: options.categoryId,
        editCount: editCountRef.current,
        editDuration: Math.round(editDuration),
        contentDelta,
        isManualSave: options.isManualSave || false,
        isAutoSave: !options.isManualSave
      },
      {
        sessionId: options.sessionId,
        documentIds: [documentId],
        categoryIds: options.categoryId ? [options.categoryId] : undefined,
        duration: Math.round(editDuration)
      }
    )
  }, [debouncedRecordAction, flush])

  const finishEditingSession = useCallback(() => {
    flush()
    editStartTimeRef.current = null
    editCountRef.current = 0
    initialContentRef.current = ''
  }, [flush])

  return {
    recordNoteEdit,
    finishEditingSession,
    cancel
  }
} 