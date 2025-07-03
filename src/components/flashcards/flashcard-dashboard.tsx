"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Plus,
  Play,
  Brain,
  Zap,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Star,
  Award,
  BookOpen,
  BarChart3,
  ChevronRight,
  Sparkles
} from "lucide-react"
import { 
  useFlashcardStore, 
  type Flashcard, 
  type FlashcardDeck, 
  type FlashcardStats, 
} from "@/lib/stores/flashcard-store"
import { useToast } from "@/hooks/use-toast"
import { FlashcardCreationModal } from "./flashcard-creation-modal"
import { FlashcardDeckCreationModal } from "./flashcard-deck-creation-modal"
import { FlashcardReviewInterface } from "./flashcard-review-interface"

interface FlashcardDashboardProps {
  onStartReview?: (cards: Flashcard[]) => void
  onCreateCard?: () => void
}

export function FlashcardDashboard({ onCreateCard }: FlashcardDashboardProps) {
  const { 
    getStats, 
    getDueFlashcards, 
    getNewFlashcards, 
    getDecks,
    getReviewSession,
    startReviewSession,
  } = useFlashcardStore()
  
  const { toast } = useToast()

  // State
  const [stats, setStats] = useState<FlashcardStats | null>(null)
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [newCards, setNewCards] = useState<Flashcard[]>([])
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false)
  const [showReviewInterface, setShowReviewInterface] = useState(false)
  const [currentReviewCards, setCurrentReviewCards] = useState<Flashcard[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // Load data
  useEffect(() => {
    loadDashboardData()
  }, [])



  const loadDashboardData = async () => {
    setDataLoading(true)
    try {
      const [statsData, dueCardsData, newCardsData, decksData] = await Promise.all([
        getStats(),
        getDueFlashcards(10),
        getNewFlashcards(5),
        getDecks()
      ])

      setStats(statsData)
      setDueCards(dueCardsData)
      setNewCards(newCardsData)
      setDecks(decksData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast({
        title: "Loading Error",
        description: "Failed to load flashcard data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setDataLoading(false)
    }
  }

  const handleStartQuickReview = async () => {
    try {
      const sessionData = await getReviewSession(20, 'mixed')
      const allCards = [
        ...(sessionData.dueCards || []), 
        ...(sessionData.newCards || [])
      ]
      
      if (allCards.length === 0) {
        toast({
          title: "No Cards Available",
          description: "Create some flashcards to start reviewing!",
          variant: "destructive"
        })
        return
      }

      setCurrentReviewCards(allCards)
      setShowReviewInterface(true)
      startReviewSession(sessionData)
    } catch (error) {
      console.error('Failed to start review:', error)
      toast({
        title: "Review Error",
        description: "Failed to start review session. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleStartCustomReview = async (sessionLimit: number, strategy: 'due_first' | 'mixed' | 'new_first') => {
    try {
      const sessionData = await getReviewSession(sessionLimit, strategy)
      const allCards = [
        ...(sessionData.dueCards || []), 
        ...(sessionData.newCards || [])
      ]
      
      if (allCards.length === 0) {
        toast({
          title: "No Cards Available",
          description: "No cards match your review criteria.",
          variant: "destructive"
        })
        return
      }

      setCurrentReviewCards(allCards)
      setShowReviewInterface(true)
      startReviewSession(sessionData)
    } catch (error) {
      console.error('Failed to start custom review:', error)
      toast({
        title: "Review Error",
        description: "Failed to start review session. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleReviewComplete = (results: any) => {
    setShowReviewInterface(false)
    setCurrentReviewCards([])
    loadDashboardData() // Refresh data
    
    toast({
      title: "Review Complete!",
      description: `Great job! You reviewed ${results.totalCards} cards with ${results.correctAnswers}/${results.totalCards} correct.`
    })
  }

  const handleReviewExit = () => {
    setShowReviewInterface(false)
    setCurrentReviewCards([])
  }

  const getPerformanceColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600'
    if (rate >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStreakBadge = (streak: number) => {
    if (streak >= 10) return { color: 'bg-purple-100 text-purple-800', icon: '🔥' }
    if (streak >= 5) return { color: 'bg-orange-100 text-orange-800', icon: '⚡' }
    if (streak >= 1) return { color: 'bg-blue-100 text-blue-800', icon: '⭐' }
    return { color: 'bg-gray-100 text-gray-800', icon: '💤' }
  }

  if (showReviewInterface) {
    return (
      <FlashcardReviewInterface
        cards={currentReviewCards}
        onComplete={handleReviewComplete}
        onExit={handleReviewExit}
      />
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Flashcards</h1>
            <p className="text-muted-foreground mt-1">
              Master your knowledge with spaced repetition
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Cards
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowCreateDeckModal(true)}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Create Deck
            </Button>
            <Button 
              onClick={handleStartQuickReview}
              disabled={dataLoading || (dueCards.length === 0 && newCards.length === 0)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Quick Review
            </Button>
          </div>
        </div>

      {dataLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Cards</p>
                    <p className="text-2xl font-bold">{stats?.totalCards || 0}</p>
                  </div>
                  <Brain className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Due Today</p>
                    <p className="text-2xl font-bold text-orange-600">{stats?.cardsDue || 0}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                    <p className={`text-2xl font-bold ${getPerformanceColor(stats?.averageSuccessRate || 0)}`}>
                      {Math.round((stats?.averageSuccessRate || 0) * 100)}%
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Study Streak</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{stats?.studyStreak || 0}</p>
                      <span className="text-sm">{getStreakBadge(stats?.studyStreak || 0).icon}</span>
                    </div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center"
                  onClick={() => {
                    if (dueCards.length === 0) {
                      toast({
                        title: "No Due Cards",
                        description: "No cards are due for review right now. Create and study some cards first!",
                        variant: "destructive"
                      })
                    } else {
                      handleStartCustomReview(10, 'due_first')
                    }
                  }}
                >
                  <Clock className="h-5 w-5 mb-1" />
                  <span className="text-sm">Due Cards ({dueCards.length})</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center"
                  onClick={() => {
                    if (newCards.length === 0) {
                      toast({
                        title: "No New Cards",
                        description: "Create some flashcards first to start reviewing!",
                        variant: "destructive"
                      })
                    } else {
                      handleStartCustomReview(10, 'new_first')
                    }
                  }}
                >
                  <Sparkles className="h-5 w-5 mb-1" />
                  <span className="text-sm">New Cards ({newCards.length})</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center"
                  onClick={() => handleStartCustomReview(20, 'mixed')}
                  disabled={dueCards.length === 0 && newCards.length === 0}
                >
                  <Play className="h-5 w-5 mb-1" />
                  <span className="text-sm">Mixed Session</span>
                </Button>
              </div>

              {(dueCards.length > 0 || newCards.length > 0) && (
                <div className="text-sm text-muted-foreground text-center">
                  Estimated time: {Math.ceil((dueCards.length + newCards.length) * 0.75)} minutes
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="decks">Decks</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Due Cards */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Due Cards
                      </span>
                      {dueCards.length > 0 && (
                        <Badge variant="secondary">{dueCards.length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dueCards.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No cards due for review</p>
                        <p className="text-sm">Great job staying on top of your studies!</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {dueCards.map((card) => (
                            <div key={card.id} className="p-3 border rounded-lg">
                              <div className="font-medium text-sm mb-1">
                                {card.front.slice(0, 50)}...
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    card.difficulty === 'easy' 
                                      ? 'text-green-600 bg-green-50' 
                                      : card.difficulty === 'hard' 
                                      ? 'text-red-600 bg-red-50' 
                                      : 'text-yellow-600 bg-yellow-50'
                                  }`}
                                >
                                  {card.difficulty}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Review #{card.reviewCount + 1}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Recent Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Learning Progress</span>
                        <span className="text-sm text-muted-foreground">
                          {stats?.cardsMastered || 0} / {stats?.totalCards || 0} mastered
                        </span>
                      </div>
                      <Progress 
                        value={stats?.totalCards ? (stats.cardsMastered / stats.totalCards) * 100 : 0} 
                        className="h-2"
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Cards Mastered</span>
                        <span className="font-medium text-green-600">{stats?.cardsMastered || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Cards Learning</span>
                        <span className="font-medium text-blue-600">{stats?.cardsLearning || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>New Cards</span>
                        <span className="font-medium text-purple-600">{stats?.cardsNew || 0}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {stats?.dailyReviewCount || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">cards reviewed today</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="decks" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {decks.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Decks Yet</h3>
                    <p className="mb-4">Create your first deck to organize your flashcards</p>
                    <Button onClick={() => setShowCreateDeckModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Deck
                    </Button>
                  </div>
                ) : (
                  decks.map((deck) => (
                    <Card key={deck.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{deck.name}</h3>
                              {deck.description && (
                                <p className="text-sm text-muted-foreground">
                                  {deck.description}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{deck.cardCount} cards</Badge>
                              {deck.dueCount > 0 && (
                                <Badge variant="outline" className="text-orange-600">
                                  {deck.dueCount} due
                                </Badge>
                              )}
                            </div>
                          </div>

                          {deck.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {deck.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Study Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{stats?.totalReviews || 0}</div>
                        <div className="text-sm text-muted-foreground">Total Reviews</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getPerformanceColor(stats?.averageSuccessRate || 0)}`}>
                          {Math.round((stats?.averageSuccessRate || 0) * 100)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Success Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Achievement Badges</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <Award className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                        <div className="font-medium">Study Streak</div>
                        <div className="text-sm text-muted-foreground">
                          {stats?.studyStreak || 0} days
                        </div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Star className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <div className="font-medium">Mastery Level</div>
                        <div className="text-sm text-muted-foreground">
                          {stats?.cardsMastered || 0} cards
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

        {/* Modals */}
        <FlashcardCreationModal
          isOpen={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCreated={() => {
            loadDashboardData()
            onCreateCard?.()
          }}
        />
        
        <FlashcardDeckCreationModal
          isOpen={showCreateDeckModal}
          onOpenChange={setShowCreateDeckModal}
          onCreated={() => {
            loadDashboardData()
          }}
        />
      </div>
    </ScrollArea>
  )
} 