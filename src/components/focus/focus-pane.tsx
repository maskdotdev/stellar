"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, MessageCircle, Lightbulb, Split, Loader2, ArrowLeft } from "lucide-react"
import { useStudyStore } from "@/lib/study-store"
import { LibraryService, type Document } from "@/lib/library-service"
import { DocumentRenderer } from "@/components/library/document-renderer"

export function FocusPane() {
  const [splitView, setSplitView] = useState(false)
  const [selectedText, setSelectedText] = useState("")
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [notes, setNotes] = useState("")
  
  const { 
    setShowFloatingChat, 
    currentDocument: currentDocumentId, 
    setCurrentView 
  } = useStudyStore()

  const libraryService = LibraryService.getInstance()

  // Load current document
  useEffect(() => {
    const loadDocument = async () => {
      if (!currentDocumentId) {
        setCurrentDocument(null)
        return
      }

      try {
        setIsLoading(true)
        const doc = await libraryService.getDocument(currentDocumentId)
        setCurrentDocument(doc)
      } catch (error) {
        console.error('Failed to load document:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDocument()
  }, [currentDocumentId])

  const handleTextSelection = (text: string) => {
    setSelectedText(text)
  }

  const handleQuestionShortcut = () => {
    if (selectedText) {
      setShowFloatingChat(true)
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
    <div className="h-full flex flex-col">
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
            onTextSelection={handleTextSelection}
            className="flex-1"
          />

          {/* Selection Actions */}
          {selectedText && (
            <div className="p-3 border-t bg-muted/20">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Selected:</span>
                <span className="text-sm font-medium truncate max-w-xs">
                  "{selectedText.substring(0, 50)}..."
                </span>
                <Button variant="outline" size="sm" onClick={handleQuestionShortcut}>
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Ask (?)
                </Button>
                <Button variant="outline" size="sm">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Note
                </Button>
              </div>
            </div>
          )}
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
    </div>
  )
}
