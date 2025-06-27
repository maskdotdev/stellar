"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Loader2, X, Upload, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LibraryService, type Document } from "@/lib/library-service"
import { useToast } from "@/hooks/use-toast"

interface PdfUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (document: Document) => void
}

export function PdfUploadDialog({ open, onOpenChange, onSuccess }: PdfUploadDialogProps) {
  const [title, setTitle] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [useMarker, setUseMarker] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const libraryService = LibraryService.getInstance()

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleUpload = async () => {
    try {
      setIsUploading(true)
      
      const document = await libraryService.uploadPdfWithOptions({
        title: title.trim() || undefined,
        tags: tags,
        useMarker
      })
      
      if (document) {
        onSuccess(document)
        onOpenChange(false)
        
        // Reset form
        setTitle("")
        setTags([])
        setTagInput("")
        setUseMarker(false)
        
        toast({
          title: "Success",
          description: `PDF "${document.title}" uploaded and processed successfully!`,
        })
      }
    } catch (error) {
      console.error('Failed to upload PDF:', error)
      toast({
        title: "Error",
        description: "Failed to upload PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Upload PDF</span>
          </DialogTitle>
          <DialogDescription>
            Configure your PDF upload settings. Leave title empty to use the filename.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              placeholder="Enter document title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Tags Input */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex space-x-2">
              <Input
                id="tags"
                placeholder="Add tags..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                    <span>{tag}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Marker Option */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <Label htmlFor="use-marker" className="font-medium">
                  Enhanced Processing
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Use Marker for high-quality PDF conversion with better layout detection
              </p>
            </div>
            <Switch
              id="use-marker"
              checked={useMarker}
              onCheckedChange={setUseMarker}
            />
          </div>

          {useMarker && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Enhanced mode:</strong> Better accuracy (95.6%), table extraction, 
                and layout preservation. Processing will take 2-4 seconds longer.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {useMarker ? "Processing with Marker..." : "Uploading..."}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 