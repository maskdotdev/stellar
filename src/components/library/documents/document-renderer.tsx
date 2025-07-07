"use client"

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FileText, Eye, Code, Loader2, MessageCircle, Sparkles } from 'lucide-react'
import { PdfRenderer } from '../../pdf-renderer'
import { type Document } from '@/lib/services/library-service'
import { LibraryService } from '@/lib/services/library-service'
import { useStudyStore } from '@/lib/stores/study-store'
import { useAIStore, type DocumentReference } from '@/lib/stores/ai-store'
import { useActionsStore } from '@/lib/services/actions-service'
import { cn } from '@/lib/utils/utils'
import { useToast } from '@/hooks/use-toast'


interface DocumentRendererProps {
  document: Document
  className?: string
  onTextSelection?: (text: string) => void
}

type ViewMode = 'markdown' | 'pdf'

export function DocumentRenderer({ 
  document, 
  className,
  onTextSelection 
}: DocumentRendererProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('pdf')
  const [pdfFilePath, setPdfFilePath] = useState<string | null>(null)
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [selectedText, setSelectedText] = useState<string>('')

  // Determine if PDF view is available
  const hasPdfFile = document.doc_type === 'pdf' && document.file_path

  const libraryService = LibraryService.getInstance()
  const { setShowFloatingChat, setInitialChatText } = useStudyStore()
  const { createConversationWithContext } = useAIStore()
  const { currentSessionId } = useActionsStore()
  const { toast } = useToast()

  // Load PDF file path when component mounts or document changes
  useEffect(() => {
    const loadPdfFilePath = async () => {
      if (!hasPdfFile || !document.file_path) {
        setPdfFilePath(null)
        return
      }

      setIsPdfLoading(true)
      setPdfError(null)
      
      try {
        // Use the new blob URL method for better browser compatibility
        const blobUrl = await libraryService.getPdfBlobUrl(document.file_path)
        
        if (blobUrl) {
          setPdfFilePath(blobUrl)
        } else {
          setPdfError('PDF file not found')
        }
      } catch (error) {
        console.error('Failed to load PDF file:', error)
        setPdfError('Failed to load PDF file')
      } finally {
        setIsPdfLoading(false)
      }
    }

    loadPdfFilePath()
  }, [document.id, document.file_path, hasPdfFile])

  // Cleanup blob URL when component unmounts or PDF changes
  useEffect(() => {
    return () => {
      if (pdfFilePath && pdfFilePath.startsWith('blob:')) {
        URL.revokeObjectURL(pdfFilePath)
      }
    }
  }, [pdfFilePath])

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      const text = selection.toString()
      setSelectedText(text)
      onTextSelection?.(text)
    }
  }, [onTextSelection])
  
  // 🔥 NEW: Chat about this document
  const handleChatAboutDocument = useCallback(() => {
    const documentRef: DocumentReference = {
      id: document.id,
      title: document.title,
      category_id: document.category_id,
      relevance_score: 1.0
    }
    
    createConversationWithContext(
      `Chat about ${document.title}`,
      currentSessionId || undefined,
      [documentRef],
      'explanation'
    )
    
    setInitialChatText(`Let's discuss this document: @{${document.title}}`)
    setShowFloatingChat(true)
  }, [document, createConversationWithContext, currentSessionId, setInitialChatText, setShowFloatingChat])
  
  // 🔥 NEW: Chat about selected text
  const handleChatAboutSelection = useCallback(() => {
    if (!selectedText.trim()) return
    
    const documentRef: DocumentReference = {
      id: document.id,
      title: document.title,
      category_id: document.category_id,
      relevantSections: [selectedText],
      relevance_score: 1.0
    }
    
    createConversationWithContext(
      `Chat about selection from ${document.title}`,
      currentSessionId || undefined,
      [documentRef],
      'explanation'
    )
    
    setInitialChatText(`I want to discuss this text from @{${document.title}}:\n\n"${selectedText}"\n\nCan you explain this in more detail?`)
    setShowFloatingChat(true)
  }, [selectedText, document, createConversationWithContext, currentSessionId, setInitialChatText, setShowFloatingChat])

  // Memoize the callback functions to prevent PdfRenderer rerenders
  const onDocumentLoadSuccess = useCallback((numPages: number) => {
    console.log('PDF loaded with', numPages, 'pages')
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error)
    console.error('Failed to load PDF from path:', pdfFilePath)
    setPdfError('Failed to load PDF file')
    toast({
      title: "Error",
      description: "Failed to load PDF file",
      variant: "destructive",
    })
  }, [pdfFilePath, toast])

  // Render markdown content as HTML
  const renderMarkdownContent = (content: string) => {
    const htmlContent = content
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4 mt-6">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3 mt-5">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium mb-2 mt-4">$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4 class="text-lg font-medium mb-2 mt-3">$1</h4>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-1 list-decimal">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4"><code>$1</code></pre>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br/>')

    return `<div class="prose prose-neutral dark:prose-invert max-w-none leading-relaxed"><p class="mb-4">${htmlContent}</p></div>`
  }

  const MarkdownView = () => (
    <ScrollArea className="flex-1 h-full">
      <div className="p-6">
        <div 
          className="prose prose-neutral dark:prose-invert max-w-none leading-relaxed"
          onMouseUp={handleTextSelection}
          dangerouslySetInnerHTML={{ 
            __html: renderMarkdownContent(document.content) 
          }}
        />
      </div>
    </ScrollArea>
  )

  // Memoize PdfView to prevent unnecessary rerenders
  const PdfView = useMemo(() => {
    if (!hasPdfFile || !document.file_path) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">PDF file not available</h3>
          <p className="text-muted-foreground text-center">
            The original PDF file for this document is not available.
            You can view the extracted text content in the Markdown tab.
          </p>
        </div>
      )
    }

    if (isPdfLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <h3 className="text-lg font-medium mb-2">Loading PDF...</h3>
          <p className="text-muted-foreground text-center">
            Please wait while we prepare the PDF for viewing.
          </p>
        </div>
      )
    }

    if (pdfError || !pdfFilePath) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">PDF file not available</h3>
          <p className="text-muted-foreground text-center mb-4">
            {pdfError || 'The PDF file could not be loaded.'}
            <br />
            You can view the extracted text content in the Markdown tab.
          </p>
          <Button variant="outline" onClick={() => {
            setViewMode('markdown')
          }}>
            View Text Content
          </Button>
        </div>
      )
    }

    return (
      <div onMouseUp={handleTextSelection}>
        <PdfRenderer
          fileUrl={pdfFilePath}
          className="h-full"
          onDocumentLoadSuccess={onDocumentLoadSuccess}
          onError={onDocumentLoadError}
        />
      </div>
    )
  }, [hasPdfFile, document.file_path, isPdfLoading, pdfError, pdfFilePath, onDocumentLoadSuccess, onDocumentLoadError, handleTextSelection])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Document Info Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{document.title}</span>
          <Badge variant="secondary" className="text-xs">
            {document.doc_type}
          </Badge>
          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
            {document.content.length.toLocaleString()} chars
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedText && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleChatAboutSelection}
              className="h-8 text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Chat about selection
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleChatAboutDocument}
            className="h-8 text-xs"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Chat about this
          </Button>
        </div>
      </div>

      {/* View Mode Tabs - Only show if PDF is available */}
      {hasPdfFile ? (
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="flex flex-col h-full">
          <div className="border-b">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="markdown" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Markdown
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                PDF
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="markdown" className="flex-1 h-0 m-0">
            <MarkdownView />
          </TabsContent>

          <TabsContent value="pdf" className="flex-1 h-0 m-0">
            <div className='p-6'>
              {PdfView}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        // Just show markdown view if no PDF available
        <MarkdownView />
      )}


    </div>
  )
} 