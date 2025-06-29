"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ControlledSimpleEditor } from "@/components/ui/controlled-simple-editor"
import { 
  Save, 
  ArrowLeft, 
  Tag, 
  FileText,
  Loader2,
  Plus,
  X,
  Clock
} from "lucide-react"
import { useStudyStore } from "@/lib/study-store"
import { LibraryService, type Document, type Category } from "@/lib/library-service"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface NoteEditorProps {
  documentId?: string
  onBack?: () => void
  categories?: Category[]
  currentCategoryId?: string | null
}

export function NoteEditor({ documentId, onBack, categories = [], currentCategoryId = null }: NoteEditorProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [document, setDocument] = useState<Document | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    currentCategoryId || undefined
  )
  
  const { toast } = useToast()
  const { addDocument, updateDocument, setEditingNoteId, setCurrentDocument, setCurrentView, documents } = useStudyStore()
  const libraryService = LibraryService.getInstance()

  // Load existing document if editing
  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId) {
        // New note - set default content
        setTitle("Untitled Note")
        setContent("<h1>New Note</h1><p>Start writing your thoughts here...</p>")
        setTags(["note"])
        // Auto-apply current category if we're in a category context
        if (currentCategoryId && currentCategoryId !== "uncategorized") {
          setSelectedCategoryId(currentCategoryId)
        }
        return
      }

      try {
        setIsLoading(true)
        
        // First, try to get from store (for recent updates)
        const storeDocument = documents.find(doc => doc.id === documentId)
        
        let doc: Document | null = null
        
        if (storeDocument) {
          // Use store data if available (likely more recent)
          doc = storeDocument
        } else {
          // Fallback to database with retry logic for race conditions
          let retries = 3
          while (retries > 0 && !doc) {
            doc = await libraryService.getDocument(documentId)
            if (!doc && retries > 1) {
              // Wait a bit and retry (handles race conditions)
              await new Promise(resolve => setTimeout(resolve, 150))
            }
            retries--
          }
        }
        
        if (doc) {
          setDocument(doc)
          setTitle(doc.title)
          setContent(doc.content)
          setTags(doc.tags)
          setSelectedCategoryId(doc.category_id || undefined)
        }
      } catch (error) {
        console.error('Failed to load document:', error)
        toast({
          title: "Error",
          description: "Failed to load note. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadDocument()
  }, [documentId, currentCategoryId, toast])

  // Watch for document updates in the store (e.g., when content is added from PDF viewer)
  useEffect(() => {
    if (documentId && document) {
      const storeDocument = documents.find(doc => doc.id === documentId)
      
      // If store document has newer content than current state, update it
      if (storeDocument && storeDocument.updated_at !== document.updated_at) {
        console.log('Note editor: Detected document update in store, reloading content')
        setDocument(storeDocument)
        setTitle(storeDocument.title)
        setContent(storeDocument.content)
        setTags(storeDocument.tags)
        setSelectedCategoryId(storeDocument.category_id || undefined)
      }
    }
  }, [documentId, document, documents]) // Re-run when documents array changes

  // Auto-save functionality
  useEffect(() => {
    if (!title || !content) return

    const timeoutId = setTimeout(() => {
      handleSave(true)
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId)
  }, [title, content, tags])

  // Handle document link clicks
  useEffect(() => {
    const handleDocumentLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.classList.contains('document-link') || target.closest('.document-link')) {
        event.preventDefault()
        event.stopPropagation()
        
        const linkElement = target.classList.contains('document-link') ? target : target.closest('.document-link')
        const documentId = linkElement?.getAttribute('data-document-id')
        
        if (documentId && documentId.trim() !== '') {
          // Navigate to the source document
          setCurrentDocument(documentId)
          setCurrentView("focus")
          
          toast({
            title: "Opening Document",
            description: "Navigating to the source document...",
          })
        } else {
          toast({
            title: "Document Not Found",
            description: "The linked document could not be found.",
            variant: "destructive",
          })
        }
      }
    }

    // Add event listener to the browser document
    window.document.addEventListener('click', handleDocumentLinkClick)

    return () => {
      window.document.removeEventListener('click', handleDocumentLinkClick)
    }
  }, [setCurrentDocument, setCurrentView, toast])

  const handleSave = async (silent = false) => {
    if (!title.trim() || !content.trim()) {
      if (!silent) {
        toast({
          title: "Error",
          description: "Please provide both a title and content for the note.",
          variant: "destructive",
        })
      }
      return
    }

    try {
      setIsSaving(true)

      if (documentId && document) {
        // Update existing document
        const updatedDocument = await libraryService.updateDocument(documentId, {
          title: title.trim(),
          content,
          doc_type: "note",
          tags,
          status: "draft",
          category_id: selectedCategoryId
        })
        
        if (updatedDocument) {
          updateDocument(documentId, updatedDocument)
          setDocument(updatedDocument)
          setLastSaved(new Date())
          
          if (!silent) {
            toast({
              title: "Success",
              description: "Note updated successfully!",
            })
          }
        }
      } else {
        // Create new document
        const newDocument = await libraryService.createDocument({
          title: title.trim(),
          content,
          doc_type: "note",
          tags,
          status: "draft",
          category_id: selectedCategoryId
        })

        addDocument(newDocument)
        setDocument(newDocument)
        setEditingNoteId(newDocument.id) // Update to editing mode
        setLastSaved(new Date())
        
        if (!silent) {
          toast({
            title: "Success",
            description: "Note saved successfully!",
          })
        }
      }
    } catch (error) {
      console.error('Failed to save note:', error)
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to save note. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading note...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-muted/20">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <FileText className="h-5 w-5 text-muted-foreground" />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold border-0 bg-transparent px-0 focus-visible:ring-0"
                placeholder="Note title..."
              />
            </div>
            <div className="flex items-center space-x-2">
              {lastSaved && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                </div>
              )}
              <Button 
                onClick={() => handleSave()} 
                disabled={isSaving}
                size="sm"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>

          {/* Category and Tags */}
          <div className="space-y-2">
            {/* Category Selection */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>Category:</span>
              </div>
              <Select value={selectedCategoryId || "none"} onValueChange={(value) => setSelectedCategoryId(value === "none" ? undefined : value)}>
                <SelectTrigger className="h-6 text-xs w-48">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Tag className="h-3 w-3" />
                <span>Tags:</span>
              </div>
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              <div className="flex items-center space-x-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add tag..."
                  className="h-6 text-xs w-20"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddTag}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4 max-h-[calc(100vh-10rem)] overflow-y-auto">
        <ControlledSimpleEditor
          content={content}
          onChange={setContent}
          placeholder="Start writing your note... Rich text editing with markdown support!"
          className="h-full"
        />
      </div>
    </div>
  )
}
