import { useState, useCallback } from "react"
import { useAIStore, type ChatMessage } from "@/lib/ai-store"
import { AIService } from "@/lib/ai-service"
import { useStudyStore } from "@/lib/study-store"
import { DocumentContextParser } from "@/lib/document-context"

interface UseChatOptions {
  conversationId?: string
  autoCreateConversation?: boolean
}

// Simplified message type for API calls
interface ApiChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export function useChat(options: UseChatOptions = {}) {
  const {
    conversations,
    activeConversationId,
    getActiveProvider,
    getActiveModel,
    addConversation,
    addMessage,
    setActiveConversation,
    isLoading,
    setLoading,
    error,
    setError,
    settings
  } = useAIStore()

  const [streamingMessage, setStreamingMessage] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)

  const activeProvider = getActiveProvider()
  const activeModel = getActiveModel()
  const conversationId = options.conversationId || activeConversationId
  const conversation = conversations.find(c => c.id === conversationId)
  
  const { documents } = useStudyStore()
  const documentParser = DocumentContextParser.getInstance()

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return
    if (!activeProvider || !activeModel) {
      setError("No active provider or model selected")
      return
    }

    setError(null)
    setLoading(true)
    
    // Parse document mentions
    const documentContext = await documentParser.parseDocumentMentions(content, documents)
    const displayMessage = documentParser.getPlainTextMessage(content)
    const contextualMessage = documentContext.contextualMessage
    
    let targetConversationId = conversationId

    // Create conversation if needed
    if (!targetConversationId && options.autoCreateConversation) {
      const newConversation = {
        title: displayMessage.slice(0, 50) + (displayMessage.length > 50 ? "..." : ""),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        model: activeModel.id,
        providerId: activeProvider.id
      }
      addConversation(newConversation)
      // Get the newly created conversation ID (would need to modify store to return it)
      targetConversationId = conversations[conversations.length - 1]?.id
      if (targetConversationId) {
        setActiveConversation(targetConversationId)
      }
    }

    if (!targetConversationId) {
      setError("No conversation available")
      setLoading(false)
      return
    }

    // Add user message (display the clean version without @{})
    const userMessage: Omit<ChatMessage, "id"> = {
      role: "user",
      content: displayMessage,
      timestamp: new Date(),
      model: activeModel.id,
      providerId: activeProvider.id
    }
    
    addMessage(targetConversationId, userMessage)

    try {
      const aiService = AIService.getInstance()
      const currentConversation = conversations.find(c => c.id === targetConversationId)
      const messages = currentConversation?.messages || []

      // Convert to API format with document context
      const apiMessages: ApiChatMessage[] = []
      
      // Add system message with document context if we have mentioned documents
      if (documentContext.mentionedDocuments.length > 0) {
        const systemMessage = documentParser.createSystemMessage(documentContext.mentionedDocuments)
        apiMessages.push({ role: "system", content: systemMessage })
      }
      
      // Add conversation history
      apiMessages.push(...messages.map(m => ({ role: m.role, content: m.content } as ApiChatMessage)))
      
      // Add current message with document context
      apiMessages.push({ role: "user", content: contextualMessage } as ApiChatMessage)

      if (settings.streamResponse && activeModel.supportsStreaming) {
        // Streaming response
        setIsStreaming(true)
        setStreamingMessage("")
        
        let assistantContent = ""
        
        await aiService.chatCompletionStream(
          activeProvider,
          activeModel,
          {
            messages: apiMessages as ChatMessage[], // Type assertion for API compatibility
            model: activeModel.id,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            topP: settings.topP,
            frequencyPenalty: settings.frequencyPenalty,
            presencePenalty: settings.presencePenalty
          },
          (chunk) => {
            const delta = chunk.choices[0]?.delta?.content || ""
            assistantContent += delta
            setStreamingMessage(assistantContent)
          },
          () => {
            // Stream complete
            const assistantMessage: Omit<ChatMessage, "id"> = {
              role: "assistant",
              content: assistantContent,
              timestamp: new Date(),
              model: activeModel.id,
              providerId: activeProvider.id
            }
            addMessage(targetConversationId!, assistantMessage)
            setStreamingMessage("")
            setIsStreaming(false)
            setLoading(false)
          },
          (error) => {
            setError(error.message)
            setIsStreaming(false)
            setLoading(false)
          }
        )
      } else {
        // Non-streaming response
        const response = await aiService.chatCompletion(
          activeProvider,
          activeModel,
          {
            messages: apiMessages as ChatMessage[], // Type assertion for API compatibility
            model: activeModel.id,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            topP: settings.topP,
            frequencyPenalty: settings.frequencyPenalty,
            presencePenalty: settings.presencePenalty
          }
        )

        const assistantMessage: Omit<ChatMessage, "id"> = {
          role: "assistant",
          content: response.choices[0]?.message?.content || "",
          timestamp: new Date(),  
          model: activeModel.id,
          providerId: activeProvider.id
        }
        
        addMessage(targetConversationId, assistantMessage)
        setLoading(false)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message"
      setError(errorMessage)
      setLoading(false)
    }
  }, [
    activeProvider,
    activeModel,
    conversationId,
    conversations,
    addConversation,
    addMessage,
    setActiveConversation,
    setError,
    setLoading,
    settings,
    options.autoCreateConversation,
    documents,
    documentParser
  ])

  const clearError = useCallback(() => {
    setError(null)
  }, [setError])

  return {
    messages: conversation?.messages || [],
    streamingMessage,
    isStreaming,
    isLoading,
    error,
    sendMessage,
    clearError,
    conversationId,
    activeProvider,
    activeModel,
    canSendMessage: !!(activeProvider && activeModel && !isLoading)
  }
} 