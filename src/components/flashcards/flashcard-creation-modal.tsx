"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Plus,
  Wand2,
  Zap,
  X,
  Edit3,
  RefreshCw,
  BookOpen,
  FileText,
  Quote,
  Search
} from "lucide-react"
import { useFlashcardStore, CreateFlashcardRequest } from "@/lib/stores/flashcard-store"
import { flashcardService, type GeneratedFlashcard } from "@/lib/services/flashcard-service"
import { LibraryService, type Document } from "@/lib/services/library-service"
import { useToast } from "@/hooks/use-toast"
import { ActionType, useActionsStore } from "@/lib/services/actions-service"

interface FlashcardCreationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  prefilledData?: {
    front?: string
    back?: string
    sourceText?: string
    sourceDocumentId?: string
    categoryId?: string
  }
  onCreated?: (flashcard: any) => void
}

export function FlashcardCreationModal({ 
  isOpen, 
  onOpenChange, 
  prefilledData,
  onCreated 
}: FlashcardCreationModalProps) {
  const { createFlashcard, getDecks, isLoading } = useFlashcardStore()
  const { recordAction, currentSessionId } = useActionsStore()
  const libraryService = LibraryService.getInstance()

  // Form state
  const [creationMode, setCreationMode] = useState<"manual" | "ai" | "document">("manual")
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [cardType, setCardType] = useState<'basic' | 'cloze' | 'image' | 'definition'>('basic')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [deckId, setDeckId] = useState<string>('')

  // AI generation state
  const [aiText, setAiText] = useState('')
  const [maxCards, setMaxCards] = useState(5)
  const [generatedCards, setGeneratedCards] = useState<GeneratedFlashcard[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Document selection state
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [documentSearchQuery, setDocumentSearchQuery] = useState('')
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)

  // Data
  const [decks, setDecks] = useState<any[]>([])

  const { toast: showToast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadDecks()
      loadDocuments()
      
      // Pre-fill data if provided
      if (prefilledData) {
        setFront(prefilledData.front || '')
        setBack(prefilledData.back || '')
        setAiText(prefilledData.sourceText || '')
        setCategoryId(prefilledData.categoryId || '')
        
        // If we have source text, switch to AI tab
        if (prefilledData.sourceText) {
          setCreationMode('ai')
        }
        
        // If we have a source document, switch to document tab and load it
        if (prefilledData.sourceDocumentId) {
          setCreationMode('document')
          loadSelectedDocument(prefilledData.sourceDocumentId)
        }
      }
    }
  }, [isOpen, prefilledData])

  const loadDecks = async () => {
    try {
      const decksList = await getDecks()
      setDecks(decksList)
    } catch (error) {
      console.error('Failed to load decks:', error)
    }
  }

  const loadDocuments = async () => {
    try {
      setIsLoadingDocuments(true)
      const documentsList = await libraryService.getAllDocuments()
      setDocuments(documentsList)
    } catch (error) {
      console.error('Failed to load documents:', error)
      showToast({
        title: "Loading Error",
        description: "Failed to load documents from library.",
        variant: "destructive"
      })
    } finally {
      setIsLoadingDocuments(false)
    }
  }

  const loadSelectedDocument = async (documentId: string) => {
    try {
      const document = await libraryService.getDocument(documentId)
      if (document) {
        setSelectedDocument(document)
        setSelectedText(document.content || '')
      }
    } catch (error) {
      console.error('Failed to load selected document:', error)
    }
  }

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(documentSearchQuery.toLowerCase()))
  )

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

  const handleCreateCard = async () => {
    if (creationMode === "manual") {
      // Manual creation
      if (!front.trim() || !back.trim()) {
        showToast({
          title: "Missing Information",
          description: "Please fill in both the front and back of the card.",
          variant: "destructive"
        })
        return
      }

      try {
        const request: CreateFlashcardRequest = {
          front: front.trim(),
          back: back.trim(),
          sourceText: selectedText || prefilledData?.sourceText,
          sourceDocumentId: selectedDocument?.id || prefilledData?.sourceDocumentId,
          difficulty,
          tags,
          categoryId: categoryId || undefined,
          cardType,
          deckId: deckId || undefined
        }

        const flashcard = await createFlashcard(request)

        // Record action
        if (currentSessionId) {
          await recordAction(ActionType.FLASHCARD_CREATE, {
            flashcardId: flashcard.id,
            deckId: flashcard.deckId,
            difficulty: flashcard.difficulty,
            sourceDocumentId: flashcard.sourceDocumentId
          })
        }

        showToast({
          title: "Flashcard Created",
          description: "Your flashcard has been created successfully!",
        })

        onCreated?.(flashcard)
        resetForm()
        onOpenChange(false)
      } catch (error) {
        console.error('Failed to create flashcard:', error)
        showToast({
          title: "Creation Failed",
          description: "Failed to create flashcard. Please try again.",
          variant: "destructive"
        })
      }
    } else if (creationMode === "ai" || creationMode === "document") {
      // AI generation or document-based creation
      if (generatedCards.length === 0) {
        showToast({
          title: "No Cards Generated",
          description: "Please generate some cards first before creating them.",
          variant: "destructive"
        })
        return
      }

      try {
        const createdCards = []
        for (const card of generatedCards) {
          const request: CreateFlashcardRequest = {
            front: card.front,
            back: card.back,
            sourceText: selectedText || card.sourceText,
            sourceDocumentId: selectedDocument?.id || prefilledData?.sourceDocumentId,
            difficulty,
            tags: [...tags, ...card.tags],
            categoryId: categoryId || undefined,
            cardType: card.cardType,
            deckId: deckId || undefined
          }

          const flashcard = await createFlashcard(request)
          createdCards.push(flashcard)

          // Record action for each card
          if (currentSessionId) {
            await recordAction(ActionType.FLASHCARD_CREATE, {
              flashcardId: flashcard.id,
              deckId: flashcard.deckId,
              difficulty: flashcard.difficulty,
              sourceDocumentId: flashcard.sourceDocumentId
            })
          }
        }

        showToast({
          title: "Flashcards Created",
          description: `Successfully created ${createdCards.length} flashcards!`,
        })

        onCreated?.(createdCards)
        resetForm()
        onOpenChange(false)
      } catch (error) {
        console.error('Failed to create flashcards:', error)
        showToast({
          title: "Creation Failed",
          description: "Failed to create some flashcards. Please try again.",
          variant: "destructive"
        })
      }
    }
  }

  const handleGenerateCards = async () => {
    const textToGenerate = creationMode === "document" ? selectedText : aiText
    if (!textToGenerate.trim()) return

    setIsGenerating(true)
    try {
      const generatedCards = await flashcardService.generateFlashcardsFromText({
        text: textToGenerate,
        maxCards,
        cardType,
        difficulty
      })

      setGeneratedCards(generatedCards)

      if (generatedCards.length === 0) {
        showToast({
          title: "No Cards Generated",
          description: "Could not generate flashcards from the provided text. Try different text or adjust settings.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to generate flashcards:', error)
      showToast({
        title: "Generation Failed",
        description: "Failed to generate flashcards. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const resetForm = () => {
    setFront('')
    setBack('')
    setAiText('')
    setSelectedText('')
    setSelectedDocument(null)
    setTags([])
    setNewTag('')
    setGeneratedCards([])
    setCreationMode('manual')
    setDocumentSearchQuery('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Create Flashcards
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs value={creationMode} onValueChange={(value) => setCreationMode(value as any)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Manual
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                AI Generation
              </TabsTrigger>
              <TabsTrigger value="document" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                From Document
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question" className="text-sm font-medium">
                  Front (Question)
                </Label>
                <Textarea
                  id="question"
                  placeholder="Enter your question or prompt..."
                  className="min-h-[80px] resize-none"
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="answer" className="text-sm font-medium">
                  Back (Answer)
                </Label>
                <Textarea 
                  id="answer" 
                  placeholder="Enter the answer..." 
                  className="min-h-[80px] resize-none"
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                />
              </div>

              {selectedDocument && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Linked to: {selectedDocument.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedDocument.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-text" className="text-sm font-medium">
                  Text for AI Generation
                </Label>
                <Textarea
                  id="ai-text"
                  placeholder="Paste or type text that you'd like to generate flashcards from..."
                  className="min-h-[120px] resize-none"
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-cards" className="text-sm font-medium">
                    Max Cards
                  </Label>
                  <Select value={maxCards.toString()} onValueChange={(value) => setMaxCards(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1">
                  <Button
                    onClick={handleGenerateCards}
                    disabled={isGenerating || !aiText.trim()}
                    className="mt-7 w-full"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Cards
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Generated Cards Preview */}
              {generatedCards.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Generated Cards ({generatedCards.length})</Label>
                  <ScrollArea className="h-40">
                    <div className="space-y-2 pr-4">
                      {generatedCards.map((card, index) => (
                        <div key={index} className="p-3 border rounded-lg bg-muted/50">
                          <div className="font-medium text-sm mb-1">{card.front}</div>
                          <div className="text-sm text-muted-foreground">{card.back}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>

            <TabsContent value="document" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Document Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Document</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search documents..."
                        value={documentSearchQuery}
                        onChange={(e) => setDocumentSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <ScrollArea className="h-48 border rounded-lg">
                      <div className="p-2 space-y-1">
                        {isLoadingDocuments ? (
                          <div className="text-center py-4 text-muted-foreground">Loading documents...</div>
                        ) : filteredDocuments.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">No documents found</div>
                        ) : (
                          filteredDocuments.map((doc) => (
                            <div
                              key={doc.id}
                              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                selectedDocument?.id === doc.id 
                                  ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700' 
                                  : 'bg-muted/50 hover:bg-muted'
                              }`}
                              onClick={() => {
                                setSelectedDocument(doc)
                                setSelectedText(doc.content || '')
                              }}
                            >
                              <div className="font-medium text-sm">{doc.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {doc.doc_type} • {doc.tags.join(', ')}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                {/* Document Content & Text Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    {selectedDocument ? `Content: ${selectedDocument.title}` : 'Select a document to view content'}
                  </Label>
                  
                  {selectedDocument ? (
                    <div className="space-y-2">
                      <ScrollArea className="h-48 border rounded-lg">
                        <div className="p-3">
                          <div className="text-sm whitespace-pre-wrap">
                            {selectedDocument.content || 'No content available'}
                          </div>
                        </div>
                      </ScrollArea>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Selected Text for Generation</Label>
                        <Textarea
                          placeholder="Select text from the document above, or edit this field..."
                          value={selectedText}
                          onChange={(e) => setSelectedText(e.target.value)}
                          className="min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 border rounded-lg flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Select a document to view its content</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedDocument && (
                <div className="flex gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-cards-doc" className="text-sm font-medium">
                      Max Cards
                    </Label>
                    <Select value={maxCards.toString()} onValueChange={(value) => setMaxCards(parseInt(value))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <Button
                      onClick={handleGenerateCards}
                      disabled={isGenerating || !selectedText.trim()}
                      className="mt-7 w-full"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Generate from Document
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Generated Cards Preview */}
              {generatedCards.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Generated Cards ({generatedCards.length})</Label>
                  <ScrollArea className="h-40">
                    <div className="space-y-2 pr-4">
                      {generatedCards.map((card, index) => (
                        <div key={index} className="p-3 border rounded-lg bg-muted/50">
                          <div className="font-medium text-sm mb-1">{card.front}</div>
                          <div className="text-sm text-muted-foreground">{card.back}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <Quote className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-blue-600">From: {selectedDocument?.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Separator className="my-6" />

          {/* Common Settings */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-sm font-medium">
                  Difficulty
                </Label>
                <Select value={difficulty} onValueChange={(value) => setDifficulty(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-type" className="text-sm font-medium">
                  Card Type
                </Label>
                <Select value={cardType} onValueChange={(value) => setCardType(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="cloze">Cloze Deletion</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="definition">Definition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deck" className="text-sm font-medium">
                Deck (Optional)
              </Label>
              <Select value={deckId} onValueChange={setDeckId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a deck" />
                </SelectTrigger>
                <SelectContent>
                  {decks.map((deck) => (
                    <SelectItem key={deck.id} value={deck.id}>
                      {deck.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Tags</Label>
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
          </div>

          <Separator className="my-6" />

          {/* Create Button */}
          <Button 
            onClick={handleCreateCard} 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {creationMode === "manual" ? "Create Flashcard" : `Create ${generatedCards.length} Flashcards`}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 