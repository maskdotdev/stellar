"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ControlledSimpleEditor } from "@/components/ui/controlled-simple-editor"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDebouncedNoteAction } from "@/hooks/use-debounced-action"
import { useToast } from "@/hooks/use-toast"
import { ActionType, ActionsService, useActionsStore } from "@/lib/services/actions-service"
import { type Category, type Document, LibraryService } from "@/lib/services/library-service"
import { useStudyStore } from "@/lib/stores/study-store"
import {
  ArrowLeft,
  Clock,
  FileText,
  Lightbulb,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  Tag,
  X
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { TextSelectionPopover } from "./text-selection-popover"

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
  const [selectedText, setSelectedText] = useState("")
  const [hoverLink, setHoverLink] = useState<{
    rect: DOMRect
    documentId: string
    page?: number
    text?: string
  } | null>(null)
  const lastSavedContentRef = useRef<string>("")
  const lastLoadedUpdatedAtRef = useRef<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    currentCategoryId || undefined
  )

  const { toast } = useToast()
  const { addDocument, updateDocument, setEditingNoteId, setCurrentDocument, setCurrentView, documents, setShowFloatingChat, setInitialChatText, setPendingJump } = useStudyStore()
  const libraryServiceRef = useRef(LibraryService.getInstance())

  // Actions tracking
  const actionsService = ActionsService.getInstance()
  const { currentSessionId } = useActionsStore()
  const { recordNoteEdit, finishEditingSession } = useDebouncedNoteAction()

  // Load existing document if editing (fetch-first to avoid stale cache)
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

        // Fetch-first from DB with retry to ensure freshest content
        let doc: Document | null = null
        let retries = 3
        while (retries > 0 && !doc) {
          doc = await libraryServiceRef.current.getDocument(documentId)
          if (!doc && retries > 1) {
            await new Promise(resolve => setTimeout(resolve, 150))
          }
          retries--
        }

        if (doc) {
          setDocument(doc)
          setTitle(doc.title)
          setContent(doc.content)
          setTags(doc.tags)
          setSelectedCategoryId(doc.category_id || undefined)
          lastSavedContentRef.current = doc.content
          lastLoadedUpdatedAtRef.current = doc.updated_at
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
    // Ensure we always clear loading after a hard timeout to avoid spinner lock
    const safety = setTimeout(() => setIsLoading(false), 5000)
    return () => clearTimeout(safety)
  }, [documentId, currentCategoryId, toast])

  // Sync fetched document to store once per version, without causing a loop
  const lastSyncedVersionRef = useRef<string | null>(null)
  useEffect(() => {
    if (!document) return
    if (lastSyncedVersionRef.current === document.updated_at) return
    updateDocument(document.id, document)
    lastSyncedVersionRef.current = document.updated_at
  }, [document, updateDocument])

  // Watch for document updates in the store and load only meaningful external changes
  useEffect(() => {
    if (!documentId) return
    const storeDocument = documents.find(d => d.id === documentId)
    if (!storeDocument) return

    // If we've already loaded this version, skip
    if (lastLoadedUpdatedAtRef.current === storeDocument.updated_at) return

    const normalize = (html: string) => html.replace(/\s+/g, ' ').trim()
    const storeContent = normalize(storeDocument.content || "")
    const localContent = normalize(content || "")
    const lastSavedContent = normalize(lastSavedContentRef.current || "")

    // If contents match current editor or last saved, just sync the ref and skip heavy state updates
    if (storeContent === localContent || storeContent === lastSavedContent) {
      lastLoadedUpdatedAtRef.current = storeDocument.updated_at
      return
    }

    // External change: update local editor state
    setDocument(storeDocument)
    setTitle(storeDocument.title)
    setContent(storeDocument.content)
    setTags(storeDocument.tags)
    setSelectedCategoryId(storeDocument.category_id || undefined)
    lastLoadedUpdatedAtRef.current = storeDocument.updated_at
  }, [documentId, documents, content])

  // Auto-save functionality (500ms idle)
  useEffect(() => {
    const hasChanges = title || content
    if (!hasChanges) return

    const timeoutId = setTimeout(() => {
      handleSave(true)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [title, content])

  // Debounced action recording for content changes (only for existing notes)
  useEffect(() => {
    if (documentId && document && title && content) {
      recordNoteEdit(
        documentId,
        title,
        content,
        {
          tags: tags,
          categoryId: selectedCategoryId || undefined,
          sessionId: currentSessionId || 'default-session',
          isManualSave: false
        }
      )
    }
  }, [documentId, document, title, content, tags, selectedCategoryId, currentSessionId, recordNoteEdit])

  // Cleanup: finish editing session when navigating away
  useEffect(() => {
    return () => {
      if (documentId && document) {
        finishEditingSession()
      }
    }
  }, [documentId, document, finishEditingSession])

  // Handle document link clicks
  useEffect(() => {
    const handleDocumentLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.classList.contains('document-link') || target.closest('.document-link')) {
        event.preventDefault()
        event.stopPropagation()

        const linkElement = target.classList.contains('document-link') ? target : target.closest('.document-link')
        const documentId = linkElement?.getAttribute('data-document-id')
        const pageAttr = linkElement?.getAttribute('data-page')
        const textAttr = linkElement?.getAttribute('data-text')

        if (documentId && documentId.trim() !== '') {
          // Navigate to the source document
          // Stage a pending jump (page and/or text)
          try {
            setPendingJump({
              documentId,
              page: pageAttr ? Number.parseInt(pageAttr, 10) : undefined,
              text: textAttr ? decodeURIComponent(textAttr) : undefined,
            })
          } catch { }
          setCurrentDocument(documentId)
          setCurrentView("focus")

          toast({
            title: "Opening Document",
            description: pageAttr ? `Navigating to page ${pageAttr}...` : "Navigating to the source document...",
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
  }, [setCurrentDocument, setCurrentView, toast, setPendingJump])

  // Selection handling within the editor
  const editorContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let timeoutId: number | null = null

    const isSelectionWithinContainer = (selection: Selection): boolean => {
      if (!editorContainerRef.current || selection.rangeCount === 0) return false
      const range = selection.getRangeAt(0)
      const container = editorContainerRef.current
      return !!container && container.contains(range.commonAncestorContainer)
    }

    const handleSelectionChange = () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return
        if (!isSelectionWithinContainer(selection)) return
        const text = selection.toString().trim()
        if (!text) return
        setSelectedText(text)
      }, 120)
    }

    const docEl = window.document
    docEl.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      docEl.removeEventListener('selectionchange', handleSelectionChange)
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [])

  const handleClosePopover = () => {
    setSelectedText("")
    const selection = window.getSelection()
    if (selection) selection.removeAllRanges()
  }

  const handleAsk = () => {
    if (!selectedText.trim()) return
    const contextualPrompt = `I selected this text from the note "${title}":\n\n"${selectedText}"\n\nPlease help me understand this or answer questions about it.`
    setInitialChatText(contextualPrompt)
    setShowFloatingChat(true)
  }

  const handleNoteFromSelection = async () => {
    if (!selectedText.trim()) return
    try {
      const noteTitle = `Note from ${title || 'Note'}`
      const noteContent = `<h2>Source Note</h2>
<p><strong>${title || 'Untitled Note'}</strong></p>

<h2>Selected Text</h2>
<blockquote>
<p>${selectedText}</p>
</blockquote>

<h2>My Notes</h2>
<p>Add your thoughts here...</p>`

      const newNote = await libraryServiceRef.current.createDocument({
        title: noteTitle,
        content: noteContent,
        doc_type: "note",
        tags: ["highlight", "note"],
        status: "draft",
        category_id: selectedCategoryId || undefined
      })

      addDocument(newNote)
      setEditingNoteId(newNote.id)
      setCurrentView("note-editor")
      setSelectedText("")
    } catch (error) {
      console.error('Failed to create note from selection:', error)
    }
  }

  const handleSave = async (silent = false) => {
    if (!content.trim()) {
      if (!silent) {
        toast({
          title: "Error",
          description: "Please add some content before saving.",
          variant: "destructive",
        })
      }
      return
    }

    try {
      setIsSaving(true)

      // Prefer provided documentId, fallback to currently loaded/created document id
      const targetId = documentId || document?.id

      if (targetId) {
        // Update existing document
        const updatedDocument = await libraryServiceRef.current.updateDocument(targetId, {
          title: title.trim(),
          content,
          doc_type: "note",
          tags,
          status: "draft",
          category_id: selectedCategoryId
        })

        if (updatedDocument) {
          updateDocument(targetId, updatedDocument)
          setDocument(updatedDocument)
          setLastSaved(new Date())
          lastSavedContentRef.current = content
          lastLoadedUpdatedAtRef.current = updatedDocument.updated_at

          // Record note edit action (debounced)
          recordNoteEdit(
            updatedDocument.id,
            updatedDocument.title,
            content,
            {
              tags: tags,
              categoryId: selectedCategoryId || undefined,
              sessionId: currentSessionId || 'default-session',
              isManualSave: !silent
            }
          )

          if (!silent) {
            toast({
              title: "Success",
              description: "Note updated successfully!",
            })
          }
        }
      } else {
        // Create new document
        const newDocument = await libraryServiceRef.current.createDocument({
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
        lastSavedContentRef.current = content
        lastLoadedUpdatedAtRef.current = newDocument.updated_at

        // Record note creation action (immediate for new notes)
        await actionsService.recordActionWithAutoContext(
          ActionType.NOTE_CREATE,
          {
            documentId: newDocument.id,
            noteTitle: newDocument.title,
            noteWordCount: content.replace(/<[^>]*>/g, '').split(/\s+/).length,
            tags: tags,
            categoryId: selectedCategoryId || undefined,
            isAutoSave: silent
          },
          {
            sessionId: currentSessionId || 'default-session',
            documentIds: [newDocument.id],
            categoryIds: selectedCategoryId ? [selectedCategoryId] : undefined
          }
        )

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

  // Memoize the editor so selection updates do not re-render the editor DOM
  const editorElement = useMemo(() => (
    <div ref={editorContainerRef} className="flex-1 p-4 max-h-[calc(100vh-10rem)] overflow-y-auto">
      <ControlledSimpleEditor
        content={content}
        onChange={setContent}
        placeholder="Start writing your note... Rich text editing with markdown support!"
        className="h-full"
      />
    </div>
  ), [content])

  // Show a small floating "Open" button when hovering a source link inside the editor
  useEffect(() => {
    const container = editorContainerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = (target.closest?.('.document-link')) as HTMLElement | null
      if (link && container.contains(link)) {
        const rect = link.getBoundingClientRect()
        const documentId = link.getAttribute('data-document-id') || ''
        const pageAttr = link.getAttribute('data-page')
        const textAttr = link.getAttribute('data-text')
        setHoverLink({
          rect,
          documentId,
          page: pageAttr ? Number.parseInt(pageAttr, 10) : undefined,
          text: textAttr ? decodeURIComponent(textAttr) : undefined,
        })
      } else if (hoverLink) {
        setHoverLink(null)
      }
    }

    const handleMouseLeave = () => setHoverLink(null)
    const handleScroll = () => setHoverLink(null)

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)
    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
      container.removeEventListener('scroll', handleScroll)
    }
  }, [hoverLink])

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
    <div className="h-full flex flex-col relative">
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
      {editorElement}

      {/* Floating Open button on link hover */}
      {hoverLink && (
        <div
          style={{
            position: 'fixed',
            top: `${hoverLink.rect.top - 32}px`,
            left: `${Math.min(hoverLink.rect.left, window.innerWidth - 120)}px`,
            zIndex: 50,
          }}
          className="pointer-events-auto"
        >
          <Button
            size="sm"
            variant="secondary"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setPendingJump({
                documentId: hoverLink.documentId,
                page: hoverLink.page,
                text: hoverLink.text,
              })
              setCurrentDocument(hoverLink.documentId)
              setCurrentView('focus')
              setHoverLink(null)
              toast({
                title: 'Opening Document',
                description: hoverLink.page ? `Navigating to page ${hoverLink.page}...` : 'Navigating to the source document...',
              })
            }}
          >
            Open Source
          </Button>
        </div>
      )}

      {/* Floating Selection Popover for NoteEditor with richer actions */}
      <TextSelectionPopover
        selectedText={selectedText}
        onAsk={handleAsk}
        onNote={handleNoteFromSelection}
        onClose={handleClosePopover}
        actions={[
          { label: "Chat", onClick: handleAsk, icon: <MessageCircle className="h-3 w-3" /> },
          {
            label: "Explain", onClick: () => {
              if (!selectedText.trim()) return
              setInitialChatText(`Please explain this selection from my note "${title}":\n\n"${selectedText}"`)
              setShowFloatingChat(true)
            }
          },
          {
            label: "Summarize", onClick: () => {
              if (!selectedText.trim()) return
              setInitialChatText(`Summarize this selection from my note "${title}":\n\n"${selectedText}"`)
              setShowFloatingChat(true)
            }
          },
          { label: "New Note", onClick: handleNoteFromSelection, icon: <Lightbulb className="h-3 w-3" /> },
        ]}
      />
    </div>
  )
}
