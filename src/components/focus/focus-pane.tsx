"use client"

import { DocumentRenderer } from "@/components/library"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ActionType, ActionsService, useActionsStore } from "@/lib/services/actions-service"
import { type Document, LibraryService } from "@/lib/services/library-service"
import { useStudyStore } from "@/lib/stores/study-store"
import { ArrowLeft, FileText, Loader2, Split } from "lucide-react"
import { useEffect, useState } from "react"
import { TextSelectionPopover } from "./text-selection-popover"

export function FocusPane() {
  const [splitView, setSplitView] = useState(false)
  const [selectedText, setSelectedText] = useState("")
  const [selectedPage, setSelectedPage] = useState<number | null>(null)
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [notes, setNotes] = useState("")
  const [existingNotes, setExistingNotes] = useState<Document[]>([])

  // Document reading tracking
  const [documentStartTime, setDocumentStartTime] = useState<Date | null>(null)

  const {
    setShowFloatingChat,
    setInitialChatText,
    currentDocument: currentDocumentId,
    setCurrentView,
    setEditingNoteId,
    documents,
    addDocument,
    updateDocument
  } = useStudyStore()

  const libraryService = LibraryService.getInstance()

  // Actions tracking
  const actionsService = ActionsService.getInstance()
  const { currentSessionId } = useActionsStore()

  // Load current document
  useEffect(() => {
    const loadDocument = async () => {
      if (!currentDocumentId) {
        // If switching away from a document, record reading session
        if (documentStartTime && currentDocument) {
          const readingDuration = (new Date().getTime() - documentStartTime.getTime()) / 1000
          if (readingDuration > 5) { // Only record if read for more than 5 seconds
            await actionsService.recordActionWithAutoContext(
              ActionType.DOCUMENT_VIEW,
              {
                documentId: currentDocument.id,
                documentTitle: currentDocument.title,
                documentType: currentDocument.doc_type,
                readingDuration: Math.round(readingDuration),
                categoryId: currentDocument.category_id || undefined
              },
              {
                sessionId: currentSessionId || 'default-session',
                documentIds: [currentDocument.id],
                categoryIds: currentDocument.category_id ? [currentDocument.category_id] : undefined,
                duration: Math.round(readingDuration)
              }
            )
          }
        }

        setCurrentDocument(null)
        setExistingNotes([])
        setDocumentStartTime(null)
        return
      }

      try {
        setIsLoading(true)
        const doc = await libraryService.getDocument(currentDocumentId)
        setCurrentDocument(doc)

        // Start reading session timer
        setDocumentStartTime(new Date())

        // Load existing notes from the same category
        const notesInCategory = documents.filter(d =>
          d.doc_type === "note" &&
          d.category_id === doc?.category_id &&
          d.id !== currentDocumentId
        )
        setExistingNotes(notesInCategory)
      } catch (error) {
        console.error('Failed to load document:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDocument()
  }, [currentDocumentId, documents])

  // Cleanup reading session on unmount
  useEffect(() => {
    return () => {
      if (documentStartTime && currentDocument) {
        const readingDuration = (new Date().getTime() - documentStartTime.getTime()) / 1000
        if (readingDuration > 5) { // Only record if read for more than 5 seconds
          actionsService.recordActionWithAutoContext(
            ActionType.DOCUMENT_VIEW,
            {
              documentId: currentDocument.id,
              documentTitle: currentDocument.title,
              documentType: currentDocument.doc_type,
              readingDuration: Math.round(readingDuration),
              categoryId: currentDocument.category_id || undefined
            },
            {
              sessionId: currentSessionId || 'default-session',
              documentIds: [currentDocument.id],
              categoryIds: currentDocument.category_id ? [currentDocument.category_id] : undefined,
              duration: Math.round(readingDuration)
            }
          )
        }
      }
    }
  }, [documentStartTime, currentDocument, actionsService, currentSessionId])

  const handleTextSelection = async (text: string) => {
    // Record document highlight action
    if (text.trim() && currentDocument) {
      await actionsService.recordActionWithAutoContext(
        ActionType.DOCUMENT_HIGHLIGHT,
        {
          documentId: currentDocument.id,
          documentTitle: currentDocument.title,
          documentType: currentDocument.doc_type,
          categoryId: currentDocument.category_id || undefined
        },
        {
          sessionId: currentSessionId || 'default-session',
          documentIds: [currentDocument.id],
          categoryIds: currentDocument.category_id ? [currentDocument.category_id] : undefined,
          metadata: {
            studyContext: {
              focusMode: true
            }
          }
        }
      )
    }

    setSelectedText(text)
  }

  const handleQuestionShortcut = () => {
    if (selectedText) {
      // Create a contextual prompt with the selected text
      const contextualPrompt = `I selected this text from the document "${currentDocument?.title}":

"${selectedText}"

Please help me understand this or answer questions about it.`

      setInitialChatText(contextualPrompt)
      setShowFloatingChat(true)
      // Keep the selection visible for context
    }
  }

  const handleCreateNewNote = async () => {
    if (selectedText) {
      try {
        // Create a note with the selected text
        const noteTitle = `Note from ${currentDocument?.title || 'Document'}`
        const noteContent = `<h2>Source Document</h2>
<p><a href="#" data-document-id="${currentDocument?.id || ''}"${selectedPage !== null ? ` data-page="${selectedPage}"` : ''}${selectedText ? ` data-text="${encodeURIComponent(selectedText.slice(0, 200))}"` : ''} class="document-link" style="color: #3b82f6; text-decoration: underline; cursor: pointer;">${currentDocument?.title || 'Unknown Document'}${selectedPage !== null ? ` (p. ${selectedPage})` : ''}</a></p>

<h2>Selected Text</h2>
<blockquote>
<p>${selectedText}</p>
</blockquote>

<h2>My Notes</h2>
<p>Add your thoughts here...</p>`

        const newNote = await libraryService.createDocument({
          title: noteTitle,
          content: noteContent,
          doc_type: "note",
          tags: ["highlight", "note"],
          status: "draft",
          category_id: currentDocument?.category_id || undefined
        })

        // Add to the store
        addDocument(newNote)

        // Open the note for editing
        setEditingNoteId(newNote.id)
        setCurrentView("note-editor")

        // Clear the selection
        setSelectedText("")
      } catch (error) {
        console.error('Failed to create note:', error)
        // Fallback to local notes if creation fails
        const newNote = `**Selected:** "${selectedText}"\n\n`
        setNotes(prevNotes => prevNotes + newNote)
        setSelectedText("")
      }
    }
  }

  const handleAddToExistingNote = async (noteId: string) => {
    if (selectedText) {
      try {
        // Get the existing note
        const existingNote = await libraryService.getDocument(noteId)
        if (!existingNote) return

        // Create the new content block to append
        const timestamp = new Date().toLocaleDateString()
        const selectedTextBlock = `
<hr>
<p><small><em>Added on ${timestamp} from <a href="#" data-document-id="${currentDocument?.id || ''}"${selectedPage !== null ? ` data-page="${selectedPage}"` : ''}${selectedText ? ` data-text="${encodeURIComponent(selectedText.slice(0, 200))}"` : ''} class="document-link" style="color: #3b82f6; text-decoration: underline; cursor: pointer;">${currentDocument?.title || 'Unknown Document'}${selectedPage !== null ? ` (p. ${selectedPage})` : ''}</a></em></small></p>
<h3>Selected Text</h3>
<blockquote>
<p>${selectedText}</p>
</blockquote>
<h3>Notes</h3>
<p>Add your thoughts here...</p>`

        // Append to existing content
        const updatedContent = existingNote.content + selectedTextBlock

        // Update the note
        const updatedNote = await libraryService.updateDocument(noteId, {
          title: existingNote.title,
          content: updatedContent,
          file_path: existingNote.file_path,
          doc_type: existingNote.doc_type,
          tags: [...new Set([...existingNote.tags, "highlight"])], // Add highlight tag if not present
          status: existingNote.status,
          category_id: existingNote.category_id
        })

        // Update in the store
        if (updatedNote) {
          updateDocument(noteId, updatedNote)

          // Wait a moment to ensure database update is complete
          await new Promise(resolve => setTimeout(resolve, 100))

          // Open the note for editing
          setEditingNoteId(noteId)
          setCurrentView("note-editor")
        }

        // Clear the selection
        setSelectedText("")
      } catch (error) {
        console.error('Failed to add to existing note:', error)
        // Fallback to local notes if update fails
        const newNote = `**Selected:** "${selectedText}"\n\n`
        setNotes(prevNotes => prevNotes + newNote)
        setSelectedText("")
      }
    }
  }

  // Legacy handler for backward compatibility
  const handleNoteShortcut = () => {
    handleCreateNewNote()
  }

  const handleClosePopover = () => {
    setSelectedText("")
    // Clear the browser selection
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
    }
  }

  const handleBackToLibrary = () => {
    setCurrentView("library")
  }

  if (!currentDocumentId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No document selected</h3>
          <p className="text-muted-foreground mb-4">
            Select a document from the library to start reading.
          </p>
          <Button onClick={handleBackToLibrary}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  if (!currentDocument) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Document not found</h3>
          <p className="text-muted-foreground mb-4">
            The selected document could not be loaded.
          </p>
          <Button onClick={handleBackToLibrary}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleBackToLibrary}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Focus Mode</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={() => setSplitView(!splitView)}>
            <Split className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 flex ${splitView ? "divide-x" : ""} min-h-0`}>
        {/* Main Content */}
        <div className={`${splitView ? "w-1/2" : "w-full"} flex flex-col min-h-0`}>
          <DocumentRenderer
            document={currentDocument}
            onTextSelection={(text, info) => {
              setSelectedText(text)
              setSelectedPage(info?.page ?? null)
              handleTextSelection(text)
            }}
            className="flex-1"
          />
        </div>

        {/* Split View - Notes */}
        {splitView && (
          <div className="w-1/2 flex flex-col">
            <div className="p-3 border-b">
              <h3 className="font-medium">Notes</h3>
            </div>
            <div className="flex-1 p-3">
              <Textarea
                placeholder="Take notes here... (markdown supported)"
                className="h-full resize-none border-0 focus-visible:ring-0"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Selection Popover */}
      <TextSelectionPopover
        selectedText={selectedText}
        onAsk={handleQuestionShortcut}
        onNote={handleNoteShortcut}
        onClose={handleClosePopover}
        existingNotes={existingNotes}
        onCreateNewNote={handleCreateNewNote}
        onAddToExistingNote={handleAddToExistingNote}
      />
    </div>
  )
}
