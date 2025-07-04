import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, Calendar, Tag, Edit, Trash2, Check, X, Upload, Plus } from "lucide-react"
import { type Document } from "@/lib/services/library-service"
import { typeIcons } from "./library-constants"
import { useEffect, useRef } from "react"

interface DocumentViewProps {
  documents: Document[]
  filteredDocuments: Document[]
  isLoadingDocuments: boolean
  viewMode: "list" | "grid"
  libraryService: any
  editingTitleId: string | null
  editingTitle: string
  onItemClick: (item: Document) => void
  onStartEditTitle: (documentId: string, currentTitle: string) => void
  onSaveTitle: (documentId: string) => void
  onCancelEditTitle: () => void
  onDeleteDocument: (documentId: string) => void
  onCreateNote: () => void
  onUploadPdf: () => void
  setEditingTitle: (title: string) => void
}

export function DocumentView({
  documents,
  filteredDocuments,
  isLoadingDocuments,
  viewMode,
  libraryService,
  editingTitleId,
  editingTitle,
  onItemClick,
  onStartEditTitle,
  onSaveTitle,
  onCancelEditTitle,
  onDeleteDocument,
  onCreateNote,
  onUploadPdf,
  setEditingTitle,
}: DocumentViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Keyboard navigation for numbered shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we're not in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Handle number keys 1-9 and 0
      const key = e.key
      if (/^[1-9]$/.test(key)) {
        const index = parseInt(key) - 1
        if (index < filteredDocuments.length) {
          e.preventDefault()
          onItemClick(filteredDocuments[index])
        }
      } else if (key === '0') {
        // 0 key for the 10th item (index 9)
        if (filteredDocuments.length > 9) {
          e.preventDefault()
          onItemClick(filteredDocuments[9])
        }
      }
    }

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [filteredDocuments, onItemClick])

  if (isLoadingDocuments) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    )
  }

  if (filteredDocuments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No documents found</h3>
        <p className="text-muted-foreground mb-4">
          {documents.length === 0 
            ? "Get started by uploading a PDF or creating a new note in this category."
            : "Try adjusting your search terms."
          }
        </p>
        {documents.length === 0 && (
          <div className="flex space-x-2">
            <Button onClick={onUploadPdf}>
              <Upload className="h-4 w-4 mr-2" />
              Upload PDF
            </Button>
            <Button variant="outline" onClick={onCreateNote}>
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (viewMode === "list") {
    return (
      <div ref={containerRef} className="space-y-2">
        {filteredDocuments.map((item, index) => {
          const Icon = typeIcons[item.doc_type as keyof typeof typeIcons] || FileText
          const displayNumber = index + 1
          const shouldShowNumber = displayNumber <= 10
          
          return (
            <div
              key={item.id}
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors relative"
            >
              {/* Number overlay for list view */}
              {shouldShowNumber && (
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-md">
                  {displayNumber === 10 ? '0' : displayNumber}
                </div>
              )}
              
              <div className="flex items-start justify-between">
                <div 
                  className="flex items-start space-x-3 flex-1 cursor-pointer"
                  onClick={() => onItemClick(item)}
                >
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    {editingTitleId === item.id ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onSaveTitle(item.id)
                            } else if (e.key === 'Escape') {
                              onCancelEditTitle()
                            }
                          }}
                          className="font-medium h-8"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSaveTitle(item.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onCancelEditTitle}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <h3 
                        className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartEditTitle(item.id, item.title)
                        }}
                        title="Click to edit title"
                      >
                        {item.title}
                      </h3>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {libraryService.getContentPreview(item.content)}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {libraryService.formatDate(item.updated_at)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {item.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {item.doc_type}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1 mt-2">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Document Actions */}
                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onItemClick(item)
                    }}
                    className="h-8 px-2"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteDocument(item.id)
                    }}
                    className="h-8 px-2 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Grid view
  return (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredDocuments.map((item, index) => {
        const Icon = typeIcons[item.doc_type as keyof typeof typeIcons] || FileText
        const displayNumber = index + 1
        const shouldShowNumber = displayNumber <= 10
        
        return (
          <div
            key={item.id}
            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors relative group"
          >
            {/* Number overlay for grid view */}
            {shouldShowNumber && (
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-md">
                {displayNumber === 10 ? '0' : displayNumber}
              </div>
            )}
            
            {/* Document Actions for Grid View */}
            <div 
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onItemClick(item)
                }}
                className="h-7 w-7 p-0"
                title="Open"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteDocument(item.id)
                }}
                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <div 
              className="cursor-pointer"
              onClick={() => onItemClick(item)}
            >
              <Icon className="h-8 w-8 text-muted-foreground mb-3" />
              {editingTitleId === item.id ? (
                <div className="flex items-center space-x-1 mb-2" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onSaveTitle(item.id)
                      } else if (e.key === 'Escape') {
                        onCancelEditTitle()
                      }
                    }}
                    className="font-medium h-8 text-sm"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSaveTitle(item.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="h-3 w-3 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancelEditTitle}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
              ) : (
                <h3 
                  className="font-medium mb-2 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartEditTitle(item.id, item.title)
                  }}
                  title="Click to edit title"
                >
                  {item.title}
                </h3>
              )}
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {libraryService.getContentPreview(item.content, 100)}
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {item.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {item.tags.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{item.tags.length - 2}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {libraryService.formatDate(item.updated_at)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
} 