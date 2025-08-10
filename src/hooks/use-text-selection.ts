import { useCallback, useEffect, useRef, useState } from 'react'

export interface TextSelectionState {
  selectedText: string
  range: Range | null
  isActive: boolean
}

export interface UseTextSelectionOptions {
  onSelectionChange?: (selection: TextSelectionState) => void
  minSelectionLength?: number
  debounceMs?: number
  containerRef?: React.RefObject<HTMLElement>
}

export interface UseTextSelectionReturn {
  selectionState: TextSelectionState
  clearSelection: () => void
  isSelectionActive: boolean
}

/**
 * Custom hook for handling text selection without interfering with native browser behavior
 * Uses the selectionchange event to detect selections and provides debounced updates
 */
export function useTextSelection(options: UseTextSelectionOptions = {}): UseTextSelectionReturn {
  const {
    onSelectionChange,
    minSelectionLength = 1,
    debounceMs = 150,
    containerRef
  } = options

  const [selectionState, setSelectionState] = useState<TextSelectionState>({
    selectedText: '',
    range: null,
    isActive: false
  })

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSelectionRef = useRef<TextSelectionState | null>(null)

  /**
   * Validates if the current selection is within the target container
   */
  const isSelectionWithinContainer = useCallback((selection: Selection): boolean => {
    if (!containerRef?.current || !selection.rangeCount) {
      return true // If no container specified, allow all selections
    }

    const range = selection.getRangeAt(0)
    const container = containerRef.current

    // Check if the selection is completely within the container
    return container.contains(range.commonAncestorContainer)
  }, [containerRef])

  /**
   * Validates if a selection is valid and meets minimum requirements
   */
  const isValidSelection = useCallback((selection: Selection): boolean => {
    if (!selection || selection.rangeCount === 0) {
      return false
    }

    const range = selection.getRangeAt(0)
    const selectedText = range.toString().trim()

    // Check minimum length requirement
    if (selectedText.length < minSelectionLength) {
      return false
    }

    // Check if selection is within container bounds
    if (!isSelectionWithinContainer(selection)) {
      return false
    }

    return true
  }, [minSelectionLength, isSelectionWithinContainer])

  /**
   * Processes the current selection and updates state
   */
  const processSelection = useCallback(() => {
    const selection = window.getSelection()
    
    if (!selection || !isValidSelection(selection)) {
      const emptyState: TextSelectionState = {
        selectedText: '',
        range: null,
        isActive: false
      }
      
      // Only update if state actually changed
      if (lastSelectionRef.current?.isActive) {
        setSelectionState(emptyState)
        lastSelectionRef.current = emptyState
        onSelectionChange?.(emptyState)
      }
      return
    }

    const range = selection.getRangeAt(0)
    const selectedText = range.toString().trim()

    const newState: TextSelectionState = {
      selectedText,
      range: range.cloneRange(), // Clone to avoid reference issues
      isActive: true
    }

    // Only update if the selection actually changed
    const hasChanged = !lastSelectionRef.current ||
      lastSelectionRef.current.selectedText !== selectedText ||
      lastSelectionRef.current.isActive !== newState.isActive

    if (hasChanged) {
      setSelectionState(newState)
      lastSelectionRef.current = newState
      onSelectionChange?.(newState)
    }
  }, [isValidSelection, onSelectionChange])

  /**
   * Debounced selection handler to prevent excessive updates
   */
  const handleSelectionChange = useCallback(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set up debounced processing
    debounceTimeoutRef.current = setTimeout(() => {
      processSelection()
      debounceTimeoutRef.current = null
    }, debounceMs)
  }, [processSelection, debounceMs])

  /**
   * Clears the current selection programmatically
   */
  const clearSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
    }

    const emptyState: TextSelectionState = {
      selectedText: '',
      range: null,
      isActive: false
    }

    setSelectionState(emptyState)
    lastSelectionRef.current = emptyState
    onSelectionChange?.(emptyState)
  }, [onSelectionChange])

  // Set up event listeners
  useEffect(() => {
    // Add selectionchange event listener to document
    document.addEventListener('selectionchange', handleSelectionChange)

    // Cleanup function to remove event listeners and clear timeouts
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      
      // Clear any pending debounced calls
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }
    }
  }, [handleSelectionChange])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts on unmount
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return {
    selectionState,
    clearSelection,
    isSelectionActive: selectionState.isActive
  }
}