"use client"

import React, { useState, useCallback, memo } from 'react'
import { Document, Page } from 'react-pdf'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, FileText } from 'lucide-react'
import { cn } from '@/lib/utils/utils'


interface PdfViewerProps {
  filePath: string
  className?: string
  onLoadSuccess?: (pdf: any) => void
  onLoadError?: (error: Error) => void
  onTextSelection?: (text: string) => void
}

const PdfViewerComponent = ({ 
  filePath, 
  className,
  onLoadSuccess,
  onLoadError,
  onTextSelection
}: PdfViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(2.0)
  const [rotation, setRotation] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setError(null)
    console.log('PDF loaded successfully:', numPages, 'pages')
    onLoadSuccess?.(numPages)
  }, [onLoadSuccess])

  const onDocumentLoadError = useCallback((error: Error) => {
    setIsLoading(false)
    setError(error.message)
    console.error('Failed to load PDF:', error)
    onLoadError?.(error)
  }, [onLoadError])

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim()
      console.log('PDF text selected:', text)
      onTextSelection?.(text)
    }
  }, [onTextSelection])

  const goToPrevPage = useCallback(() => {
    setPageNumber(prev => Math.max(1, prev - 1))
  }, [])

  const goToNextPage = useCallback(() => {
    setPageNumber(prev => Math.min(numPages, prev + 1))
  }, [numPages])

  const handlePageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value)
    if (page >= 1 && page <= numPages) {
      setPageNumber(page)
    }
  }, [numPages])

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(3.0, prev + 0.2))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(0.5, prev - 0.2))
  }, [])

  const rotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360)
  }, [])

  const resetZoom = useCallback(() => {
    setScale(2.0)
  }, [])

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", className)}>
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Failed to load PDF</h3>
        <p className="text-muted-foreground text-center mb-4">{error}</p>
        <Button 
          variant="outline" 
          onClick={() => {
            setError(null)
            setIsLoading(true)
          }}
        >
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/20">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-1">
            <Input
              type="number"
              min={1}
              max={numPages}
              value={pageNumber}
              onChange={handlePageInputChange}
              className="w-16 h-8 text-sm text-center"
            />
            <span className="text-sm text-muted-foreground">
              of {numPages}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={resetZoom}
            className="min-w-[60px] text-xs"
          >
            {Math.round(scale * 100)}%
          </Button>
          
          <Button variant="ghost" size="sm" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm" onClick={rotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto">
        <div 
          className="flex justify-center p-4"
          onMouseUp={handleTextSelection}
          onKeyUp={(e) => {
            // Handle keyboard selection (Ctrl+A, Shift+arrows, etc.)
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'a') {
              handleTextSelection()
            }
          }}
        >
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}
          
          <Document
            file={filePath}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
            className="max-w-full"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              loading=""
              className="shadow-lg"
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary rerenders
export const PdfViewer = memo(PdfViewerComponent) 