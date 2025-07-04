import { useState, useEffect, useRef, useCallback } from "react"

import { cn } from "@/lib/utils/utils"

// Base interfaces for extensibility
export interface MentionItem {
  id: string
  title: string
  subtitle?: string
  preview?: string
  tags?: string[]
  icon?: React.ComponentType<{ className?: string }>
  data?: any // Additional data for the mention type
}

export interface MentionProvider {
  type: string // e.g., 'document', 'url', 'user'
  trigger?: string // Optional custom trigger (defaults to @)
  search: (query: string) => Promise<MentionItem[]> | MentionItem[]
  render?: (item: MentionItem, isSelected: boolean) => React.ReactNode
  format: (item: MentionItem) => string // How to format the mention in text
}

interface MentionState {
  isOpen: boolean
  query: string
  position: { top: number; left: number }
  selectedIndex: number
  provider: MentionProvider | null
  triggerIndex: number // Position where @ was typed
}

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  providers: MentionProvider[]
  maxResults?: number
}

export function MentionInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  className,
  providers,
  maxResults = 10
}: MentionInputProps) {
  // Log component initialization
  console.log("🚀 MentionInput: Component initialized")
  console.log("  📝 Initial value:", JSON.stringify(value))
  console.log("  🔧 Providers:", providers.length, providers.map(p => `${p.trigger || '@'}${p.type}`))
  console.log("  🔢 Max results:", maxResults)
  console.log("  🚫 Disabled:", disabled)

  const [mentionState, setMentionState] = useState<MentionState>({
    isOpen: false,
    query: "",
    position: { top: 0, left: 0 },
    selectedIndex: 0,
    provider: null,
    triggerIndex: -1,
  })
  
  const [suggestions, setSuggestions] = useState<MentionItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Search for suggestions when query changes
  useEffect(() => {
    console.log("🔍 MentionInput: Search effect triggered")
    console.log("  🔧 Provider:", mentionState.provider?.type || 'none')
    console.log("  🔍 Query:", JSON.stringify(mentionState.query))
    console.log("  🎯 Is open:", mentionState.isOpen)

    if (!mentionState.provider) {
      console.log("  ❌ No provider, clearing suggestions")
      setSuggestions([])
      return
    }

    // Allow empty queries - providers can handle them (e.g., show all documents when typing @)
    console.log("  ✅ Provider exists, proceeding with search...")

    const searchAsync = async () => {
      try {
        if (!mentionState.provider) return
        console.log(`  🚀 Calling ${mentionState.provider.type} provider search with query: "${mentionState.query}"`)
        const results = await mentionState.provider.search(mentionState.query)
        console.log(`  📊 Search results:`, results)
        console.log(`  📊 Results count:`, results?.length || 0)
        
        const finalResults = Array.isArray(results) ? results.slice(0, maxResults) : []
        console.log(`  ✅ Final suggestions (max ${maxResults}):`, finalResults.length, finalResults.map(r => r.title))
        setSuggestions(finalResults)
      } catch (error) {
        console.error('❌ Error searching mentions:', error)
        setSuggestions([])
      }
    }

    searchAsync()
  }, [mentionState.query, mentionState.provider, maxResults])

  // Handle input change and detect mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    const cursorPosition = e.target.selectionStart || 0
    
    console.log("🎯 MentionInput: Input changed")
    console.log("  📝 New value:", JSON.stringify(newValue))
    console.log("  📍 Cursor position:", cursorPosition)
    console.log("  🔧 Available providers:", providers.map(p => `${p.trigger || '@'}${p.type}`))
    
    onChange(newValue)

    // Check if we're typing a mention
    const beforeCursor = newValue.slice(0, cursorPosition)
    console.log("  ⬅️ Before cursor:", JSON.stringify(beforeCursor))
    
    // Find the last trigger symbol before cursor
    let triggerIndex = -1
    let matchedProvider: MentionProvider | null = null
    
    for (const provider of providers) {
      const trigger = provider.trigger || '@'
      const lastTriggerIndex = beforeCursor.lastIndexOf(trigger)
      
      console.log(`  🔍 Checking provider ${provider.type} with trigger "${trigger}"`)
      console.log(`    📍 Last trigger index: ${lastTriggerIndex}`)
      
      if (lastTriggerIndex > triggerIndex) {
        const afterTrigger = beforeCursor.slice(lastTriggerIndex + trigger.length)
        console.log(`    ➡️ After trigger: ${JSON.stringify(afterTrigger)}`)
        
        // Only show dropdown if we haven't completed a mention yet (no space after trigger)
        const hasSpace = afterTrigger.includes(' ')
        const hasNewline = afterTrigger.includes('\n')
        console.log(`    🚫 Has space: ${hasSpace}, has newline: ${hasNewline}`)
        
        if (!hasSpace && !hasNewline) {
          console.log(`    ✅ Provider ${provider.type} matched!`)
          triggerIndex = lastTriggerIndex
          matchedProvider = provider
        }
      }
    }
    
    if (triggerIndex !== -1 && matchedProvider) {
      const trigger = matchedProvider.trigger || '@'
      const query = beforeCursor.slice(triggerIndex + trigger.length)
      
      console.log("🎉 Mention triggered!")
      console.log("  🔑 Provider:", matchedProvider.type)
      console.log("  🎯 Trigger:", trigger)
      console.log("  📍 Trigger index:", triggerIndex)
      console.log("  🔍 Query:", JSON.stringify(query))
      
              // Calculate dropdown position
        const input = inputRef.current
        if (input) {
          const rect = input.getBoundingClientRect()
          const textWidth = getTextWidth(beforeCursor.slice(0, triggerIndex), input)
          
          // Position dropdown below the input
          const gap = 4
          const top = rect.bottom + gap
          const left = Math.max(8, Math.min(rect.left + textWidth, window.innerWidth - 320 - 8)) // Keep within viewport
          
          console.log("  📐 Input rect:", rect)
          console.log("  📐 Window size:", { width: window.innerWidth, height: window.innerHeight })
          console.log("  📐 Dropdown position:", { top, left })
          
          const newState = {
            isOpen: true,
            query,
            position: { top, left },
            selectedIndex: 0,
            provider: matchedProvider,
            triggerIndex,
          }
          console.log("  🔄 Setting mention state:", newState)
          setMentionState(newState)
        }
    } else {
      console.log("❌ No mention detected, closing dropdown")
      console.log("  📍 Trigger index:", triggerIndex)
      console.log("  🔧 Matched provider:", matchedProvider?.type || 'none')
      setMentionState(prev => ({ ...prev, isOpen: false, provider: null }))
      setSuggestions([])
    }
  }

  // Handle key navigation in dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionState.isOpen && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setMentionState(prev => ({
            ...prev,
            selectedIndex: Math.min(prev.selectedIndex + 1, suggestions.length - 1)
          }))
          break
        case 'ArrowUp':
          e.preventDefault()
          setMentionState(prev => ({
            ...prev,
            selectedIndex: Math.max(prev.selectedIndex - 1, 0)
          }))
          break
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          if (suggestions[mentionState.selectedIndex]) {
            selectMention(suggestions[mentionState.selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setMentionState(prev => ({ ...prev, isOpen: false, provider: null }))
          setSuggestions([])
          break
        default:
          onKeyDown?.(e)
      }
    } else {
      onKeyDown?.(e)
    }
  }

  // Select a mention from the dropdown
  const selectMention = useCallback((item: MentionItem) => {
    if (!mentionState.provider) return

    const cursorPosition = inputRef.current?.selectionStart || 0
    const afterCursor = value.slice(cursorPosition)
    
    const trigger = mentionState.provider.trigger || '@'
    const mentionText = mentionState.provider.format(item)
    
    // Replace from trigger position to current cursor
    const newValue = 
      value.slice(0, mentionState.triggerIndex) + 
      trigger + mentionText + ' ' +
      afterCursor
    
    onChange(newValue)
    setMentionState(prev => ({ ...prev, isOpen: false, provider: null }))
    setSuggestions([])
    
    // Set cursor after the mention (including the space)
    setTimeout(() => {
      const newCursorPos = mentionState.triggerIndex + trigger.length + mentionText.length + 1
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      inputRef.current?.focus()
    }, 0)
  }, [value, onChange, mentionState.provider, mentionState.triggerIndex])

  // Utility to calculate text width (approximate)
  const getTextWidth = (text: string, element: HTMLInputElement) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (context) {
      const styles = window.getComputedStyle(element)
      context.font = `${styles.fontSize} ${styles.fontFamily}`
      return context.measureText(text).width
    }
    return text.length * 8 // Fallback
  }

  // Default render function for mention items
  const renderMentionItem = (item: MentionItem, isSelected: boolean, provider: MentionProvider) => {
    if (provider.render) {
      return provider.render(item, isSelected)
    }

    return (
      <div
        className={cn(
          "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
        )}
        onClick={() => selectMention(item)}
      >
        <div className="font-medium truncate">
          {provider.type.charAt(0).toUpperCase()} - {item.title}
        </div>
      </div>
    )
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setMentionState(prev => ({ ...prev, isOpen: false, provider: null }))
        setSuggestions([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />

      {(() => {
        const shouldShow = mentionState.isOpen && mentionState.provider && suggestions.length > 0
        console.log("🎨 MentionInput: Dropdown render check")
        console.log("  🎯 Is open:", mentionState.isOpen)
        console.log("  🔧 Has provider:", !!mentionState.provider)
        console.log("  📊 Suggestions count:", suggestions.length)
        console.log("  👁️ Should show dropdown:", shouldShow)
        
        if (shouldShow) {
          console.log("  🎨 Rendering dropdown with", suggestions.length, "suggestions")
        }
        
        return shouldShow ? (
          <div
            ref={dropdownRef}
            className="absolute z-[9999] w-full rounded-md border bg-popover text-popover-foreground shadow-xl"
            style={{
              bottom: '100%',
              left: 0,
              marginBottom: '8px',
            }}
            onMouseDown={(e) => {
              // Prevent input from losing focus when clicking dropdown
              e.preventDefault()
            }}
          >
            <div className="p-1">
              {suggestions.slice(0, 8).map((item, index) => (
                <div key={item.id}>
                  {renderMentionItem(item, index === mentionState.selectedIndex, mentionState.provider!)}
                </div>
              ))}
              {suggestions.length > 0 && (
                <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1">
                  {Math.min(suggestions.length, 8)} of {suggestions.length} {mentionState.provider?.type}{suggestions.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        ) : null
      })()}
    </div>
  )
} 