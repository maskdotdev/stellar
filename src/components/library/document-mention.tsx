import { useState, useEffect, useRef } from "react"
import { useStudyStore } from "@/lib/study-store"
import { LibraryService } from "@/lib/library-service"
import { useSettingsStore } from "@/lib/settings-store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { FileText, BookOpen, Code, Headphones, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface DocumentMentionProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  onSend?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

interface DropdownState {
  isOpen: boolean
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
  onSend, 
  placeholder, 
  disabled, 
  className 
}: DocumentMentionProps) {
  const [dropdownState, setDropdownState] = useState<DropdownState>({
    isOpen: false,
    selectedIndex: 0,
  })
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { documents } = useStudyStore()
  const { app } = useSettingsStore()
  const libraryService = LibraryService.getInstance()
  
  // Debug: Log available documents
  console.log("📚 Available documents:", documents.length, documents.map(doc => ({ id: doc.id, title: doc.title })))

  // Get filtered documents based on current input value
  const getFilteredDocuments = (query: string) => {
    const limit = app.documentMentionLimit
    console.log("🔍 DocumentMention filtering with query:", query)
    
    if (!query.trim()) {
      console.log("⚠️ Empty query, returning no results")
      return []
    }
    
    // Remove @ symbol from the beginning if present for searching
    const searchQuery = query.startsWith('@') ? query.slice(1) : query
    console.log("🔍 Search query after removing @:", searchQuery)
    
    if (!searchQuery.trim()) {
      console.log("⚠️ Empty search query after removing @, returning no results")
      return []
    }
    
    const filtered = documents
      .filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .slice(0, limit)
    
    console.log(`📊 Found ${filtered.length} documents matching "${searchQuery}":`, filtered.map(doc => doc.title))
    return filtered
  }

  const filteredDocuments = getFilteredDocuments(value)

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
  }

  // Update dropdown visibility based on filtered documents
  useEffect(() => {
    if (value.trim() && filteredDocuments.length > 0) {
      console.log("📂 Opening dropdown with", filteredDocuments.length, "documents")
      setDropdownState(prev => ({
        ...prev,
        isOpen: true,
        selectedIndex: 0,
      }))
    } else {
      console.log("📂 Closing dropdown")
      setDropdownState(prev => ({ ...prev, isOpen: false }))
    }
  }, [value, filteredDocuments.length])

  // Handle key navigation in dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (dropdownState.isOpen && filteredDocuments.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setDropdownState(prev => ({
            ...prev,
            selectedIndex: Math.min(prev.selectedIndex + 1, filteredDocuments.length - 1)
          }))
          break
        case 'ArrowUp':
          e.preventDefault()
          setDropdownState(prev => ({
            ...prev,
            selectedIndex: Math.max(prev.selectedIndex - 1, 0)
          }))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredDocuments[dropdownState.selectedIndex]) {
            selectDocument(filteredDocuments[dropdownState.selectedIndex])
          } else {
            onSend?.()
          }
          break
        case 'Escape':
          e.preventDefault()
          setDropdownState(prev => ({ ...prev, isOpen: false }))
          break
        default:
          onKeyDown?.(e)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      onSend?.()
    } else {
      onKeyDown?.(e)
    }
  }

  // Select a document from the dropdown
  const selectDocument = (document: { id: string; title: string }) => {
    const newValue = `@${document.title} `
    console.log("✅ Document selected:", document.title)
    console.log("📝 Setting input value to:", newValue)
    onChange(newValue)
    setDropdownState(prev => ({ ...prev, isOpen: false }))
    
    // Focus input after selection
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  // Handle send button click
  const handleSendClick = () => {
    onSend?.()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownState(prev => ({ ...prev, isOpen: false }))
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      {/* Dropdown positioned above input */}
      {dropdownState.isOpen && filteredDocuments.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-2 z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-xl"
        >
          <div className="p-2">
            <ScrollArea className="max-h-72">
                              <div className="space-y-2">
                <div className="px-3 py-2 text-xs text-muted-foreground border-b mb-2">
                  {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
                </div>
                {filteredDocuments.map((document, index) => {
                  const Icon = typeIcons[document.doc_type as keyof typeof typeIcons] || FileText
                  const isSelected = index === dropdownState.selectedIndex
                  
                  return (
                    <div
                      key={document.id}
                      className={cn(
                        "relative flex cursor-pointer select-none items-start rounded-md px-3 py-3 text-sm outline-none transition-colors",
                        isSelected ? "bg-accent text-accent-foreground ring-1 ring-ring" : "hover:bg-accent/50"
                      )}
                      onClick={() => selectDocument(document)}
                    >
                      <Icon className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-medium truncate leading-none">{document.title}</div>
                        {document.content && (
                          <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {libraryService.getContentPreview(document.content, 80)}
                          </div>
                        )}
                        {document.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {document.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
                                {tag}
                              </Badge>
                            ))}
                            {document.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto">
                                +{document.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Input field */}
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
    </div>
  )
} 