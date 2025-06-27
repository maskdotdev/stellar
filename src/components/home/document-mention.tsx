import { useState, useEffect, useRef } from "react"
import { useStudyStore } from "@/lib/study-store"
import { LibraryService } from "@/lib/library-service"
import { useSettingsStore } from "@/lib/settings-store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { FileText, BookOpen, Code, Headphones } from "lucide-react"
import { cn } from "@/lib/utils"

interface DocumentMentionProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

interface MentionState {
  isOpen: boolean
  query: string
  position: { top: number; left: number }
  selectedIndex: number
}

const typeIcons = {
  pdf: FileText,
  paper: FileText,
  note: BookOpen,
  code: Code,
  audio: Headphones,
  markdown: BookOpen,
}

export function DocumentMention({ 
  value, 
  onChange, 
  onKeyDown, 
  placeholder, 
  disabled, 
  className 
}: DocumentMentionProps) {
  const [mentionState, setMentionState] = useState<MentionState>({
    isOpen: false,
    query: "",
    position: { top: 0, left: 0 },
    selectedIndex: 0,
  })
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { documents } = useStudyStore()
  const { app } = useSettingsStore()
  const libraryService = LibraryService.getInstance()

  // Get filtered documents based on query with fuzzy matching
  const getFilteredDocuments = (query: string) => {
    const limit = app.documentMentionLimit
    
    if (!query) return documents.slice(0, limit)
    
    return documents
      .filter(doc => 
        doc.title.toLowerCase().includes(query.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      )
      .slice(0, limit)
  }

  const filteredDocuments = getFilteredDocuments(mentionState.query)

  // Handle input change and detect @ mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    const cursorPosition = e.target.selectionStart || 0
    
    onChange(newValue)

    // Check if we're typing an @ mention
    const beforeCursor = newValue.slice(0, cursorPosition)
    const lastAtIndex = beforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.slice(lastAtIndex + 1)
      // Only show dropdown if we haven't completed a document name yet
      const hasSpaceAfterAt = afterAt.includes(' ')
      
      if (!hasSpaceAfterAt) {
        const query = afterAt
        
        // Calculate dropdown position
        const input = inputRef.current
        if (input) {
          const rect = input.getBoundingClientRect()
          const textWidth = getTextWidth(beforeCursor.slice(0, lastAtIndex), input)
          
          setMentionState({
            isOpen: true,
            query,
            position: {
              top: rect.bottom + 4,
              left: rect.left + textWidth,
            },
            selectedIndex: 0,
          })
        }
      } else {
        setMentionState(prev => ({ ...prev, isOpen: false }))
      }
    } else {
      setMentionState(prev => ({ ...prev, isOpen: false }))
    }
  }

  // Handle key navigation in dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionState.isOpen) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setMentionState(prev => ({
            ...prev,
            selectedIndex: Math.min(prev.selectedIndex + 1, filteredDocuments.length - 1)
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
          e.preventDefault()
          if (filteredDocuments[mentionState.selectedIndex]) {
            selectDocument(filteredDocuments[mentionState.selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setMentionState(prev => ({ ...prev, isOpen: false }))
          break
        default:
          onKeyDown?.(e)
      }
    } else {
      onKeyDown?.(e)
    }
  }

  // Select a document from the dropdown
  const selectDocument = (document: { id: string; title: string }) => {
    const cursorPosition = inputRef.current?.selectionStart || 0
    const beforeCursor = value.slice(0, cursorPosition)
    const afterCursor = value.slice(cursorPosition)
    
    // Find the @ position
    const lastAtIndex = beforeCursor.lastIndexOf('@')
    if (lastAtIndex !== -1) {
      const newValue = 
        value.slice(0, lastAtIndex) + 
        `@${document.title} ` + 
        afterCursor
      
      onChange(newValue)
      setMentionState(prev => ({ ...prev, isOpen: false }))
      
      // Set cursor after the mention (including the space)
      setTimeout(() => {
        const newCursorPos = lastAtIndex + `@${document.title} `.length
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
  }

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setMentionState(prev => ({ ...prev, isOpen: false }))
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />

      {mentionState.isOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-50 w-80 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
          style={{
            top: mentionState.position.top,
            left: mentionState.position.left,
          }}
        >
          <ScrollArea className="max-h-64">
            {filteredDocuments.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No documents found
              </div>
            ) : (
              filteredDocuments.map((document, index) => {
                const Icon = typeIcons[document.doc_type as keyof typeof typeIcons] || FileText
                const isSelected = index === mentionState.selectedIndex
                
                return (
                  <div
                    key={document.id}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                      isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    )}
                    onClick={() => selectDocument(document)}
                  >
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{document.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {libraryService.getContentPreview(document.content, 50)}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {document.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
} 