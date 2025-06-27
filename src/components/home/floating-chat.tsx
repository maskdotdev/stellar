"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  AlertCircle,
  Minimize2,
  Maximize2,
  X,
  Settings,
  RotateCcw
} from "lucide-react"
import { useStudyStore } from "@/lib/study-store"
import { useChat } from "@/hooks/use-chat"
import { useAIStore } from "@/lib/ai-store"
import { cn } from "@/lib/utils"

interface FloatingChatProps {
  onClose: () => void
}

export function FloatingChat({ onClose }: FloatingChatProps) {
  const [chatInput, setChatInput] = useState("")
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  const { setCurrentView } = useStudyStore()
  
  const {
    messages,
    streamingMessage,
    isLoading,
    error,
    sendMessage,
    clearError,
    canSendMessage,
    activeProvider,
    activeModel
  } = useChat({ autoCreateConversation: true })

  const { conversations, activeConversationId, setActiveConversation } = useAIStore()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, streamingMessage])

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !canSendMessage) return
    
    const message = chatInput
    setChatInput("")
    await sendMessage(message)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const allMessages = [...messages]
  if (streamingMessage) {
    allMessages.push({
      id: "streaming",
      role: "assistant" as const,
      content: streamingMessage,
      timestamp: new Date(),
      model: activeModel?.id,
      providerId: activeProvider?.id
    })
  }

  const openSettings = () => {
    setCurrentView("settings")
    onClose()
  }

  const startNewConversation = () => {
    setActiveConversation(null)
    setChatInput("")
    clearError()
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsMinimized(false)}
                className="rounded-full w-14 h-14 shadow-lg"
                size="icon"
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open AI Chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div 
          className={cn(
            "absolute right-6 top-6 bottom-6 pointer-events-auto",
            isMaximized ? "left-6" : "w-96"
          )}
        >
          <Card className="h-full flex flex-col shadow-2xl border-2 pb-0">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2 border-b">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Chat</CardTitle>
                {activeModel && (
                  <Badge variant="secondary" className="text-xs">
                    {activeModel.name}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startNewConversation}
                      className="h-8 w-8 p-0"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>New Conversation</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openSettings}
                      className="h-8 w-8 p-0"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open Settings</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMaximized(!isMaximized)}
                      className="h-8 w-8 p-0"
                    >
                      {isMaximized ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isMaximized ? "Restore Size" : "Maximize"}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMinimized(true)}
                      className="h-8 w-8 p-0"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Minimize</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Close Chat</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              {error && (
                <Alert variant="destructive" className="mx-4 mt-4 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    {error}
                    <Button variant="ghost" size="sm" onClick={clearError} className="h-auto p-1">
                      <X className="h-4 w-4" />
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {!activeProvider || !activeModel ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium mb-2">No AI Provider Configured</h3>
                    <p className="text-sm mb-4">Configure an AI provider to start chatting</p>
                    <Button onClick={openSettings} variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Open Settings
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-h-0">
                    <ScrollArea ref={scrollAreaRef} className="h-full">
                      <div className="p-4 space-y-4">
                        {allMessages.length === 0 && (
                          <div className="text-center text-muted-foreground py-8">
                            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                            <h3 className="font-medium mb-2">Start a Conversation</h3>
                            <p className="text-sm">Ask {activeModel.name} anything about your documents</p>
                          </div>
                        )}
                        
                        {allMessages.map((message, index) => (
                          <div
                            key={message.id || index}
                            className={`flex items-start space-x-3 ${
                              message.role === "user" ? "justify-end" : ""
                            }`}
                          >
                            {message.role === "assistant" && (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Bot className="h-4 w-4 text-primary" />
                              </div>
                            )}
                            
                            <div
                              className={cn(
                                "max-w-[75%] px-4 py-3 rounded-2xl",
                                message.role === "user" 
                                  ? "bg-primary text-primary-foreground rounded-br-md" 
                                  : "bg-muted rounded-bl-md",
                                message.id === "streaming" && "animate-pulse"
                              )}
                            >
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {message.content}
                              </p>
                              {message.timestamp && (
                                <p className="text-xs opacity-60 mt-2">
                                  {message.timestamp.toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              )}
                            </div>
                            
                            {message.role === "user" && (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="border-t bg-background/50 backdrop-blur-sm">
                    <div className="p-4">
                      <div className="flex space-x-2">
                        <Input
                          placeholder={`Ask ${activeModel.name} about your documents...`}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={handleKeyPress}
                          disabled={!canSendMessage}
                          className="flex-1"
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              onClick={handleSendMessage} 
                              disabled={!canSendMessage || !chatInput.trim()}
                              size="sm"
                              className="px-3"
                            >
                              {isLoading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send Message</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      {!canSendMessage && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Configure an AI provider in Settings to start chatting
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
} 