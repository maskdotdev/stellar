"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageCircle, Zap, Network, Send, Bot, User, AlertCircle } from "lucide-react"
import { useStudyStore } from "@/lib/study-store"
import { useChat } from "@/hooks/use-chat"

export function InteractionDrawer() {
  const [chatInput, setChatInput] = useState("")
  
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

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !canSendMessage) return
    
    const message = chatInput
    setChatInput("")
    await sendMessage(message)
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

  return (
    <div className="h-80 bg-background border-t">
      <Tabs defaultValue="chat" className="h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <TabsList className="grid w-full max-w-xs grid-cols-3">
            <TabsTrigger value="chat">
              <MessageCircle className="h-4 w-4 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="flashcards">
              <Zap className="h-4 w-4 mr-1" />
              Cards
            </TabsTrigger>
            <TabsTrigger value="graph">
              <Network className="h-4 w-4 mr-1" />
              Graph
            </TabsTrigger>
          </TabsList>

          <Button variant="ghost" size="sm" onClick={() => useStudyStore.getState().setShowInteractionDrawer(false)}>
            ×
          </Button>
        </div>

        <TabsContent value="chat" className="h-full mt-0 flex flex-col">
          {error && (
            <Alert variant="destructive" className="mx-4 mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                {error}
                <Button variant="ghost" size="sm" onClick={clearError} className="h-auto p-1">
                  ×
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!activeProvider || !activeModel ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center text-muted-foreground">
                <Bot className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No AI provider configured</p>
                <p className="text-xs mt-1">Go to Settings to configure an AI provider</p>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {allMessages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <Bot className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Start a conversation with {activeModel.name}</p>
                    </div>
                  )}
                  
                  {allMessages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={`flex items-start space-x-3 ${message.role === "user" ? "justify-end" : ""}`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        } ${message.id === "streaming" ? "animate-pulse" : ""}`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    placeholder={`Ask ${activeModel.name} about the current document...`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    disabled={!canSendMessage}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!canSendMessage || !chatInput.trim()}
                    size="sm"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {!canSendMessage && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure an AI provider in Settings to start chatting
                  </p>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="flashcards" className="p-4">
          <div className="text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2" />
            <p>Select text to generate flashcards</p>
          </div>
        </TabsContent>

        <TabsContent value="graph" className="p-4">
          <div className="text-center text-muted-foreground">
            <Network className="h-8 w-8 mx-auto mb-2" />
            <p>Concept graph for current document</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
