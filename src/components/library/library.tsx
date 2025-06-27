"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Search, Filter, Grid, List, FileText, BookOpen, Code, 
  Headphones, Calendar, Tag, Upload, Plus, Loader2, 
  MoreVertical, Trash2, Edit
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useStudyStore } from "@/lib/study-store"
import { LibraryService, type Document } from "@/lib/library-service"
import { useToast } from "@/hooks/use-toast"
import { useSimpleSettingsStore } from "@/lib/simple-settings-store"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { PdfUploadDialog } from "./pdf-upload-dialog"

const typeIcons = {
  pdf: FileText,
  paper: FileText,
  note: BookOpen,
  code: Code,
  audio: Headphones,
  markdown: BookOpen,
}

export function Library() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const { toast } = useToast()
  
  // Use persistent settings for layout preferences
  const viewMode = useSimpleSettingsStore((state) => state.libraryViewMode)
  const setLibraryViewMode = useSimpleSettingsStore((state) => state.setLibraryViewMode)
  const addSearchHistory = useSimpleSettingsStore((state) => state.addSearchHistory)
  
  const { 
    setCurrentView, 
    setCurrentDocument, 
    setEditingNoteId,
    documents, 
    isLoadingDocuments, 
    setDocuments, 
    setIsLoadingDocuments,
    addDocument,
    removeDocument
  } = useStudyStore()

  const libraryService = LibraryService.getInstance()

  // Initialize service and load documents
  useEffect(() => {
    const initializeLibrary = async () => {
      try {
        setIsLoadingDocuments(true)
        await libraryService.initialize()
        const docs = await libraryService.getAllDocuments()
        setDocuments(docs)
      } catch (error) {
        console.error('Failed to initialize library:', error)
        toast({
          title: "Error",
          description: "Failed to load library. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingDocuments(false)
      }
    }

    initializeLibrary()
  }, [])

  // Filter documents based on search query
  const filteredItems = documents.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      libraryService.getContentPreview(item.content).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleItemClick = (item: Document) => {
    if (item.doc_type === "note") {
      // Use note editor for notes
      setEditingNoteId(item.id)
      setCurrentView("note-editor")
    } else {
      // Use focus view for other documents (PDFs, etc.)
      setCurrentDocument(item.id)
      setCurrentView("focus")
    }
  }

  const handleUploadSuccess = (document: Document) => {
    addDocument(document)
    // Toast is already handled in the dialog
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const success = await libraryService.deleteDocument(documentId)
      
      if (success) {
        removeDocument(documentId)
        toast({
          title: "Success",
          description: "Document deleted successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete document.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteDocumentId(null)
    }
  }

  const handleCreateNote = () => {
    // Navigate to note editor for new note creation
    setEditingNoteId(null) // null indicates new note
    setCurrentView("note-editor")
  }

  if (isLoadingDocuments) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading your library...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Library</h1>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCreateNote}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setLibraryViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setLibraryViewMode("grid")}>
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents, tags, content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  addSearchHistory(searchQuery.trim())
                }
              }}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-4">
                {documents.length === 0 
                  ? "Get started by uploading a PDF or creating a new note."
                  : "Try adjusting your search terms."
                }
              </p>
              {documents.length === 0 && (
                <div className="flex space-x-2">
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PDF
                  </Button>
                  <Button variant="outline" onClick={handleCreateNote}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Note
                  </Button>
                </div>
              )}
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const Icon = typeIcons[item.doc_type as keyof typeof typeIcons] || FileText
                return (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex items-start space-x-3 flex-1 cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <h3 className="font-medium">{item.title}</h3>
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
                            handleItemClick(item)
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
                            setDeleteDocumentId(item.id)
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const Icon = typeIcons[item.doc_type as keyof typeof typeIcons] || FileText
                return (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors relative group"
                  >
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
                          handleItemClick(item)
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
                          setDeleteDocumentId(item.id)
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div 
                      className="cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      <Icon className="h-8 w-8 text-muted-foreground mb-3" />
                      <h3 className="font-medium mb-2">{item.title}</h3>
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
          )}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDocumentId} onOpenChange={() => setDeleteDocumentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => deleteDocumentId && handleDeleteDocument(deleteDocumentId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Upload Dialog */}
      <PdfUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}
