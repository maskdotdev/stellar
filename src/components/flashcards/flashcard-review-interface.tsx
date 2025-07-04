"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  Check,
  X,
  SkipForward,
  Star,
  Timer,
  Target,
  Brain,
  Zap,
  Award,
  TrendingUp,
  Eye,
  EyeOff,
  Pause,
  Play,
  Home
} from "lucide-react"
import { useFlashcardStore, type Flashcard, type CreateFlashcardReviewRequest } from "@/lib/stores/flashcard-store"
import { flashcardService } from "@/lib/services/flashcard-service"
import { useActionsStore, ActionType } from "@/lib/services/actions-service"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils/utils"

interface FlashcardReviewInterfaceProps {
  cards: Flashcard[]
  onComplete: (results: ReviewSessionResults) => void
  onExit: () => void
  sessionType?: 'review' | 'learn' | 'mixed'
}

interface ReviewSessionResults {
  totalCards: number
  correctAnswers: number
  averageTime: number
  cardsReviewed: Flashcard[]
  difficulty: 'easy' | 'medium' | 'hard'
  sessionDuration: number
}

interface CardReview {
  cardId: string
  response: 'correct' | 'incorrect' | 'partial'
  timeSpent: number
  confidence: 1 | 2 | 3 | 4 | 5
  quality: 0 | 1 | 2 | 3 | 4 | 5
}

export function FlashcardReviewInterface({ 
  cards, 
  onComplete, 
  onExit
}: FlashcardReviewInterfaceProps) {
  const { recordReview } = useFlashcardStore()
  const { recordAction, currentSessionId } = useActionsStore()
  const { toast } = useToast()

  // Review state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showResults, setShowResults] = useState(false)
  
  // Timing
  const [startTime] = useState(Date.now())
  const [cardStartTime, setCardStartTime] = useState(Date.now())
  const [sessionTime, setSessionTime] = useState(0)
  
  // Performance tracking
  const [reviews, setReviews] = useState<CardReview[]>([])
  const [streak, setStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  
  // UI state
  const [showConfidenceModal, setShowConfidenceModal] = useState(false)
  const [pendingResponse, setPendingResponse] = useState<'correct' | 'incorrect' | null>(null)

  const currentCard = cards[currentIndex]
  const progress = ((currentIndex + (isFlipped ? 0.5 : 0)) / cards.length) * 100
  const isLastCard = currentIndex === cards.length - 1

  // Timer
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setSessionTime(Date.now() - startTime)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [startTime, isPaused])

  // Card start time tracking
  useEffect(() => {
    setCardStartTime(Date.now())
  }, [currentIndex])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true)
    }
  }

  const handleResponse = (response: 'correct' | 'incorrect') => {
    setPendingResponse(response)
    setShowConfidenceModal(true)
  }

  const handleConfidenceSubmit = async (confidence: 1 | 2 | 3 | 4 | 5) => {
    if (!pendingResponse || !currentCard) return

    const timeSpent = Math.floor((Date.now() - cardStartTime) / 1000)
    const quality = flashcardService.confidenceToQuality(confidence, pendingResponse === 'correct') as 0 | 1 | 2 | 3 | 4 | 5

    // Create review record
    const review: CardReview = {
      cardId: currentCard.id,
      response: pendingResponse,
      timeSpent,
      confidence,
      quality
    }

    // Calculate SM-2 spaced repetition
    const sm2Result = flashcardService.calculateSM2(
      quality,
      currentCard.efFactor,
      currentCard.interval,
      currentCard.repetitions
    )

    // Record in database
    if (currentSessionId) {
      try {
        const reviewRequest: CreateFlashcardReviewRequest = {
          flashcardId: currentCard.id,
          sessionId: currentSessionId,
          response: pendingResponse,
          timeSpent,
          confidence,
          quality
        }

        await recordReview(reviewRequest)

        // Record action
        await recordAction(ActionType.FLASHCARD_REVIEW, {
          flashcardId: currentCard.id,
          deckId: currentCard.deckId,
          difficulty: currentCard.difficulty,
          response: pendingResponse,
          timeSpent,
          confidence
        })
      } catch (error) {
        console.error('Failed to record review:', error)
      }
    }

    // Update local state
    setReviews(prev => [...prev, review])

    // Update streak
    if (pendingResponse === 'correct') {
      const newStreak = streak + 1
      setStreak(newStreak)
      setLongestStreak(Math.max(longestStreak, newStreak))
    } else {
      setStreak(0)
    }

    // Show feedback toast
    toast({
      title: pendingResponse === 'correct' ? "Correct!" : "Keep Learning!",
      description: pendingResponse === 'correct' 
        ? `Great job! ${streak > 0 ? `Streak: ${streak + 1}` : ''}` 
        : `Next review: ${sm2Result.nextReview.toLocaleDateString()}`
    })

    // Move to next card or finish
    if (isLastCard) {
      finishSession()
    } else {
      setCurrentIndex(prev => prev + 1)
      setIsFlipped(false)
    }

    // Reset state
    setShowConfidenceModal(false)
    setPendingResponse(null)
  }

  const handleSkip = () => {
    if (isLastCard) {
      finishSession()
    } else {
      setCurrentIndex(prev => prev + 1)
      setIsFlipped(false)
    }
  }

  const finishSession = () => {
    const correctCount = reviews.filter(r => r.response === 'correct').length
    const averageTime = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.timeSpent, 0) / reviews.length 
      : 0

    const results: ReviewSessionResults = {
      totalCards: cards.length,
      correctAnswers: correctCount,
      averageTime,
      cardsReviewed: cards.slice(0, currentIndex + 1),
      difficulty: 'medium', // Could be calculated based on cards
      sessionDuration: Date.now() - startTime
    }

    setShowResults(true)
    setTimeout(() => onComplete(results), 3000) // Show results for 3 seconds
  }

  const calculateAccuracy = () => {
    if (reviews.length === 0) return 0
    return Math.round((reviews.filter(r => r.response === 'correct').length / reviews.length) * 100)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'hard': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCardTypeIcon = (type: string) => {
    switch (type) {
      case 'definition': return <Brain className="h-4 w-4" />
      case 'cloze': return <Target className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Cards Available</h3>
          <p className="text-muted-foreground mb-4">There are no cards to review in this session.</p>
          <Button onClick={onExit}>
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (showResults) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <Award className="h-16 w-16 mx-auto text-yellow-500" />
            <h2 className="text-2xl font-bold">Session Complete!</h2>
            <p className="text-muted-foreground">Great work on your review session</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{calculateAccuracy()}%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{longestStreak}</div>
                <div className="text-sm text-muted-foreground">Best Streak</div>
              </CardContent>
            </Card>
          </div>

          <div className="text-sm text-muted-foreground">
            Redirecting to dashboard...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onExit}>
            <Home className="h-4 w-4 mr-2" />
            Exit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            {formatTime(sessionTime)}
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            {calculateAccuracy()}% accurate
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Streak: {streak}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Card {currentIndex + 1} of {cards.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Flashcard */}
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <div
            className={cn(
              "relative h-80 cursor-pointer transition-transform duration-500 preserve-3d",
              isFlipped && "rotate-y-180"
            )}
            onClick={handleFlip}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front */}
            <Card className={cn(
              "absolute inset-0 backface-hidden border-2",
              !isFlipped && "border-primary"
            )}>
              <CardContent className="h-full flex flex-col justify-between p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCardTypeIcon(currentCard.cardType)}
                    <Badge variant="outline" className={getDifficultyColor(currentCard.difficulty)}>
                      {currentCard.difficulty}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to reveal</span>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-semibold leading-relaxed">
                      {currentCard.front}
                    </h3>
                    {currentCard.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {currentCard.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Think about your answer, then click to flip
                </div>
              </CardContent>
            </Card>

            {/* Back */}
            <Card className={cn(
              "absolute inset-0 backface-hidden rotate-y-180 border-2",
              isFlipped && "border-green-500"
            )}>
              <CardContent className="h-full flex flex-col justify-between p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">Answer</span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Review #{currentCard.reviewCount + 1}
                  </Badge>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="text-lg leading-relaxed">
                      {currentCard.back}
                    </div>
                    {currentCard.sourceText && (
                      <div className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3 max-w-md">
                        "{currentCard.sourceText.slice(0, 100)}..."
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  How well did you know this answer?
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isFlipped && (
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => handleResponse('incorrect')}
            className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
            Incorrect
          </Button>

          <Button
            variant="outline"
            onClick={handleSkip}
            className="flex items-center gap-2"
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </Button>

          <Button
            onClick={() => handleResponse('correct')}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4" />
            Correct
          </Button>
        </div>
      )}

      {/* Confidence Modal */}
      <Dialog open={showConfidenceModal} onOpenChange={setShowConfidenceModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              How confident were you?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Rate your confidence level to improve future scheduling:
            </p>

            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  variant="ghost"
                  className="h-16 flex flex-col text-muted-foreground hover:text-accent-foreground items-center justify-center"
                  onClick={() => handleConfidenceSubmit(level as any)}
                >
                  <div className="flex">
                    {Array.from({ length: level }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-xs mt-1">
                    {level === 1 ? 'Guess' : level === 5 ? 'Perfect' : level.toString()}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  )
} 