"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Plus,
  X,
  BookOpen,
  Palette,
  Tag,
  RefreshCw
} from "lucide-react"
import { useFlashcardStore, CreateFlashcardDeckRequest } from "@/lib/stores/flashcard-store"
import { useToast } from "@/hooks/use-toast"
import { ActionType, useActionsStore } from "@/lib/services/actions-service"

interface FlashcardDeckCreationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (deck: any) => void
}

// Predefined deck colors and icons
const DECK_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Yellow", value: "#eab308" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Gray", value: "#6b7280" }
]

const DECK_ICONS = [
  { name: "Book", value: "book" },
  { name: "Brain", value: "brain" },
  { name: "Graduation Cap", value: "graduation-cap" },
  { name: "Lightbulb", value: "lightbulb" },
  { name: "Target", value: "target" },
  { name: "Zap", value: "zap" },
  { name: "Star", value: "star" },
  { name: "Heart", value: "heart" },
  { name: "Folder", value: "folder" },
  { name: "Bookmark", value: "bookmark" }
]

export function FlashcardDeckCreationModal({ 
  isOpen, 
  onOpenChange, 
  onCreated 
}: FlashcardDeckCreationModalProps) {
  const { createDeck, isLoading } = useFlashcardStore()
  const { recordAction, currentSessionId } = useActionsStore()

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [icon, setIcon] = useState('book')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [isShared, setIsShared] = useState(false)

  const { toast: showToast } = useToast()

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setName('')
    setDescription('')
    setColor('#3b82f6')
    setIcon('book')
    setTags([])
    setNewTag('')
    setIsShared(false)
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }

  const handleCreateDeck = async () => {
    if (!name.trim()) {
      showToast({
        title: "Missing Information",
        description: "Please provide a name for your deck.",
        variant: "destructive"
      })
      return
    }

    try {
      const request: CreateFlashcardDeckRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
        tags,
        isShared
      }

      const deck = await createDeck(request)

      // Record action
      if (currentSessionId) {
        await recordAction(ActionType.FLASHCARD_CREATE, {
          deckId: deck.id,
          deckName: deck.name
        })
      }

      showToast({
        title: "Deck Created",
        description: `Your deck "${deck.name}" has been created successfully!`,
      })

      onCreated?.(deck)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create deck:', error)
      showToast({
        title: "Creation Failed",
        description: "Failed to create deck. Please try again.",
        variant: "destructive"
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Create New Deck
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deck-name" className="text-sm font-medium">
                Deck Name *
              </Label>
              <Input
                id="deck-name"
                placeholder="Enter deck name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deck-description" className="text-sm font-medium">
                Description (Optional)
              </Label>
              <Textarea
                id="deck-description"
                placeholder="Describe what this deck is about..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>

          {/* Visual Customization */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Deck Color
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {DECK_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      color === colorOption.value 
                        ? 'border-gray-400 ring-2 ring-gray-300' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: colorOption.value }}
                    onClick={() => setColor(colorOption.value)}
                    title={colorOption.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Deck Icon
              </Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECK_ICONS.map((iconOption) => (
                    <SelectItem key={iconOption.value} value={iconOption.value}>
                      {iconOption.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-auto p-0 text-xs"
                    onClick={() => removeTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={addTag} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview</Label>
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: color }}
                >
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{name || 'Deck Name'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {description || 'No description provided'}
                  </p>
                </div>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Create Button */}
          <Button 
            onClick={handleCreateDeck} 
            className="w-full" 
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Deck
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 