"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Lightbulb, Plus, FileText, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/utils'
import { type Document } from '@/lib/services/library-service'

interface NoteSelectionDialogProps {
  open: boolean
  onClose: () => void
  onCreateNew: () => void
  onSelectNote: (noteId: string) => void
  existingNotes: Document[]
}

function NoteSelectionDialog({ 
  open, 
  onClose, 
  onCreateNew, 
  onSelectNote, 
  existingNotes 
}: NoteSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5" />
            <span>Add to Notes</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button 
            onClick={onCreateNew}
            className="w-full justify-start"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Note
          </Button>
          
          {existingNotes.length > 0 && (
            <>
              <div className="text-sm text-muted-foreground">
                Or add to existing note:
              </div>
              
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {existingNotes.map((note) => (
                    <Button
                      key={note.id}
                      onClick={() => onSelectNote(note.id)}
                      variant="ghost"
                      className="w-full justify-start h-auto p-3"
                    >
                      <div className="flex-1 text-left space-y-1">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{note.title}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                          <div className="flex space-x-1">
                            {note.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface TextSelectionPopoverProps {
  selectedText: string
  onAsk: () => void
  onNote: () => void
  onClose: () => void
  existingNotes?: Document[]
  onCreateNewNote?: () => void
  onAddToExistingNote?: (noteId: string) => void
}

export function TextSelectionPopover({ 
  selectedText, 
  onAsk, 
  onNote, 
  onClose,
  existingNotes = [],
  onCreateNewNote,
  onAddToExistingNote
}: TextSelectionPopoverProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedText) {
      setIsVisible(false)
      setPosition(null)
      return
    }

    // Get the selection range and position
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      setIsVisible(false)
      return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    if (rect.width === 0 && rect.height === 0) {
      setIsVisible(false)
      return
    }

    // Calculate position above the selection
    const x = rect.left + rect.width / 2
    const y = rect.top - 10 // Position above the selection

    // Adjust position to stay within viewport
    const viewportWidth = window.innerWidth
    const popoverWidth = 200 // Estimated popover width
    const popoverHeight = 50 // Estimated popover height

    let adjustedX = x - popoverWidth / 2
    let adjustedY = y - popoverHeight

    // Keep within horizontal bounds
    if (adjustedX < 10) adjustedX = 10
    if (adjustedX + popoverWidth > viewportWidth - 10) {
      adjustedX = viewportWidth - popoverWidth - 10
    }

    // If there's not enough space above, show below
    if (adjustedY < 10) {
      adjustedY = rect.bottom + 10
    }

    setPosition({ x: adjustedX, y: adjustedY })
    setIsVisible(true)
  }, [selectedText])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        // Check if the click is on selected text to avoid closing immediately
        const selection = window.getSelection()
        if (!selection || selection.toString().trim() === '') {
          onClose()
        }
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const handleScroll = () => {
      // Update position on scroll
      if (selectedText) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          const x = rect.left + rect.width / 2
          const y = rect.top - 10

          setPosition({ x: x - 100, y: y - 50 })
        }
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      window.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isVisible, selectedText, onClose])

  const handleNoteClick = () => {
    if (existingNotes.length > 0 && onCreateNewNote && onAddToExistingNote) {
      setShowNoteDialog(true)
    } else {
      onNote()
    }
  }

  const handleCreateNewNote = () => {
    setShowNoteDialog(false)
    if (onCreateNewNote) {
      onCreateNewNote()
    } else {
      onNote()
    }
  }

  const handleSelectExistingNote = (noteId: string) => {
    setShowNoteDialog(false)
    if (onAddToExistingNote) {
      onAddToExistingNote(noteId)
    }
  }

  const handleCloseNoteDialog = () => {
    setShowNoteDialog(false)
  }

  if (!isVisible || !position || !selectedText) {
    return null
  }

  return (
    <>
      <div
        ref={popoverRef}
        className={cn(
          "fixed z-50 bg-background text-foreground rounded-md border shadow-lg",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          "flex items-center gap-1 p-1"
        )}
        style={{
          left: position.x,
          top: position.y + 10,
          transform: 'translateX(50%)', // Center horizontally
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onAsk}
          className="h-8 px-2 text-xs"
        >
          <MessageCircle className="h-3 w-3 mr-1" />
          Ask 
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNoteClick}
          className="h-8 px-2 text-xs"
        >
          <Lightbulb className="h-3 w-3 mr-1" />
          Note
        </Button>
      </div>
      
      <NoteSelectionDialog
        open={showNoteDialog}
        onClose={handleCloseNoteDialog}
        onCreateNew={handleCreateNewNote}
        onSelectNote={handleSelectExistingNote}
        existingNotes={existingNotes}
      />
    </>
  )
} 