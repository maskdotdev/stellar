"use client"

import ModelSwitcherInline from "@/components/chat/model-switcher-inline"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChatContainerContent,
    ChatContainerRoot,
} from "@/components/ui/chat-container"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { MentionInput } from "@/components/ui/mention-input"
import {
    Message,
    MessageAction,
    MessageActions,
    MessageContent,
} from "@/components/ui/message"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    PromptInput,
    PromptInputActions,
} from "@/components/ui/prompt-input"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useChat } from "@/hooks/use-chat"
import { useToast } from "@/hooks/use-toast"
import { createDocumentProvider, createUrlProvider } from "@/lib/providers"
import { ActionType, ActionsService, useActionsStore } from "@/lib/services/actions-service"
import { useAIStore } from "@/lib/stores/ai-store"
import { useFlashcardStore } from "@/lib/stores/flashcard-store"
import { useStudyStore } from "@/lib/stores/study-store"
import { cn } from "@/lib/utils/utils"
import {
    AlertCircle,
    ArrowUp,
    BookOpen,
    Bot,
    Copy,
    Download,
    Ellipsis,
    GraduationCap,
    Plus,
    Quote,
    Settings,
    ThumbsDown,
    ThumbsUp,
    X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type FloatingChatV2Props = {
    onClose: () => void
    initialText?: string
}

export function FloatingChatV2({ onClose, initialText }: FloatingChatV2Props) {
    const [chatInput, setChatInput] = useState(initialText || "")
    const [isMinimized, setIsMinimized] = useState(false)

    const { setCurrentView, documents, setDocuments, setIsLoadingDocuments, setEditingNoteId } = useStudyStore()
    const { setActiveConversation } = useAIStore()
    const { currentSessionId } = useActionsStore()
    const actionsService = ActionsService.getInstance()
    const { toast } = useToast()
    const { generateFlashcardsFromText } = useFlashcardStore()

    // Mention providers for @documents and #urls
    const mentionProviders = useMemo(() => {
        return [createDocumentProvider(), createUrlProvider()]
    }, [])

    // Load documents lazily if not available
    useEffect(() => {
        const loadDocuments = async () => {
            if (documents.length === 0) {
                try {
                    setIsLoadingDocuments(true)
                    const { LibraryService } = await import("@/lib/services/library-service")
                    const libraryService = LibraryService.getInstance()
                    await libraryService.initialize()
                    const docs = await libraryService.getAllDocuments()
                    setDocuments(docs)
                } catch (error) {
                    console.error("Failed to load documents:", error)
                } finally {
                    setIsLoadingDocuments(false)
                }
            }
        }
        loadDocuments()
    }, [documents.length, setDocuments, setIsLoadingDocuments])

    const {
        messages,
        streamingMessage,
        isLoading,
        error,
        sendMessage,
        clearError,
        canSendMessage,
        activeProvider,
        activeModel,
        conversationId,
    } = useChat({ autoCreateConversation: true })

    // Keep initial text if provided and input empty
    useEffect(() => {
        if (initialText && !chatInput) {
            setChatInput(initialText)
        }
    }, [initialText, chatInput])

    // Handle Escape to close
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [onClose])

    const allMessages = useMemo(() => {
        const list = [...messages]
        if (streamingMessage) {
            list.push({
                id: "streaming",
                role: "assistant" as const,
                content: streamingMessage,
                timestamp: new Date(),
                model: activeModel?.id,
                providerId: activeProvider?.id,
            })
        }
        return list
    }, [messages, streamingMessage, activeModel?.id, activeProvider?.id])

    const lastAssistantMessage = useMemo(() => {
        for (let i = allMessages.length - 1; i >= 0; i--) {
            const m = allMessages[i]
            if (m.role === "assistant" && m.content?.trim()) return m
        }
        return null
    }, [allMessages])

    const getMentionedDocuments = () => {
        return documents.filter((doc) => chatInput.includes(`@${doc.title}`))
    }

    const mentionedDocs = getMentionedDocuments()

    const handleSubmit = async () => {
        const text = chatInput.trim()
        if (!text || !canSendMessage) return

        const docs = getMentionedDocuments()
        await actionsService.recordActionWithAutoContext(
            ActionType.CHAT_MESSAGE,
            {
                conversationId: conversationId || "new-conversation",
                messageCount: messages.length + 1,
                documentsReferenced: docs.map((d) => d.id),
                categoriesReferenced: docs.map((d) => d.category_id).filter(Boolean),
                aiModel: activeModel?.name,
                provider: activeProvider?.name,
            },
            {
                sessionId: currentSessionId || "default-session",
                documentIds: docs.map((d) => d.id),
                categoryIds: docs.map((d) => d.category_id).filter(Boolean) as string[],
            }
        )

        setChatInput("")
        await sendMessage(text)
    }

    const startNewConversation = () => {
        setActiveConversation(null)
        setChatInput("")
        clearError()
    }

    const openSettings = () => {
        setCurrentView("settings")
        onClose()
    }

    const [showCitations, setShowCitations] = useState(false)
    const [attachOpen, setAttachOpen] = useState(false)
    const [moreOpen, setMoreOpen] = useState(false)

    const handleSaveToNote = async () => {
        try {
            const content = lastAssistantMessage?.content?.trim()
            if (!content) {
                toast({ title: "Nothing to save", description: "No assistant message found" })
                return
            }
            const { LibraryService } = await import("@/lib/services/library-service")
            const libraryService = LibraryService.getInstance()
            await libraryService.initialize()
            const html = `<h1>AI Answer</h1><p>${content.replace(/\n/g, "<br/>")}</p>`
            const doc = await libraryService.createDocument({
                title: `Chat Note – ${new Date().toLocaleString()}`,
                content: html,
                doc_type: "note",
                tags: ["chat", "ai"],
            })
            setEditingNoteId(doc.id)
            setCurrentView("note-editor")
            onClose()
        } catch (e) {
            console.error(e)
            toast({ title: "Failed to save", description: "Could not save to note", variant: "destructive" })
        }
    }

    const handleGenerateFlashcards = async () => {
        try {
            const content = lastAssistantMessage?.content?.trim()
            if (!content) {
                toast({ title: "No content", description: "Ask a question to generate cards" })
                return
            }
            const cards = await generateFlashcardsFromText(content)
            toast({ title: "Flashcards created", description: `${cards.length} cards generated from answer` })
            setCurrentView("flashcards")
            onClose()
        } catch (e) {
            console.error(e)
            toast({ title: "Failed to generate", description: "Flashcard generation failed", variant: "destructive" })
        }
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
                                <Bot className="h-6 w-6" />
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
                        "absolute right-6 top-6 bottom-6 pointer-events-auto w-96"
                    )}
                >
                    <Card className="h-full flex flex-col shadow-2xl border-2 border-primary/20 pb-0">
                        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2 border-b">
                            <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">AI Chat</CardTitle>
                                <div className="ml-2">
                                    <ModelSwitcherInline />
                                </div>
                            </div>

                            <div className="flex items-center space-x-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={startNewConversation} className="h-8 w-8 p-0">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>New Conversation</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant={showCitations ? "secondary" : "ghost"} size="sm" onClick={() => setShowCitations(v => !v)} className="h-8 w-8 p-0">
                                            <Quote className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{showCitations ? "Hide Citations" : "Show Citations"}</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={handleSaveToNote} className="h-8 w-8 p-0">
                                            <BookOpen className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Save to Note</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={handleGenerateFlashcards} className="h-8 w-8 p-0">
                                            <GraduationCap className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Create Flashcards</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Popover open={moreOpen} onOpenChange={setMoreOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <Ellipsis className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 p-0">
                                        <Command>
                                            <CommandList>
                                                <CommandItem
                                                    value="copy-last-answer"
                                                    onSelect={() => {
                                                        if (lastAssistantMessage?.content) {
                                                            navigator.clipboard.writeText(lastAssistantMessage.content)
                                                            toast({ title: "Copied", description: "Last answer copied" })
                                                        }
                                                        setMoreOpen(false)
                                                    }}
                                                >
                                                    <span className="flex items-center gap-2"><Copy className="h-4 w-4" />Copy last answer</span>
                                                </CommandItem>
                                                <CommandItem
                                                    value="export-md"
                                                    onSelect={() => {
                                                        const lines = allMessages.map(m => `- ${m.role}: ${m.content}`).join("\n\n")
                                                        const blob = new Blob([`# Chat Transcript\n\n${lines}\n`], { type: "text/markdown" })
                                                        const url = URL.createObjectURL(blob)
                                                        const a = document.createElement("a")
                                                        a.href = url
                                                        a.download = `chat-${Date.now()}.md`
                                                        a.click()
                                                        URL.revokeObjectURL(url)
                                                        setMoreOpen(false)
                                                    }}
                                                >
                                                    <span className="flex items-center gap-2"><Download className="h-4 w-4" />Export as Markdown</span>
                                                </CommandItem>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
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
                                        <ChatContainerRoot className="h-full px-4 py-4">
                                            <ChatContainerContent className="space-y-8">
                                                {allMessages.length === 0 && (
                                                    <div className="text-center text-muted-foreground py-8">
                                                        <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                                                        <h3 className="font-medium mb-2">Start a Conversation</h3>
                                                        <p className="text-sm mb-2">Ask {activeModel.name} anything about your documents</p>
                                                        {documents.length > 0 && (
                                                            <div className="text-xs text-muted-foreground/70">
                                                                Tip: Type @ to reference documents
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {allMessages.map((message, index) => {
                                                    const isAssistant = message.role === "assistant"
                                                    const isLast = index === allMessages.length - 1
                                                    return (
                                                        <Message
                                                            key={message.id || index}
                                                            className={cn(
                                                                "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-2",
                                                                isAssistant ? "items-start" : "items-end"
                                                            )}
                                                        >
                                                            {isAssistant ? (
                                                                <div className="group flex w-full flex-col gap-1">
                                                                    <MessageContent className={cn("prose w-full flex-1 rounded-3xl p-3", message.id === "streaming" && "animate-pulse")} markdown>
                                                                        {message.content}
                                                                    </MessageContent>
                                                                    <MessageActions className={cn("-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100", isLast && "opacity-100")}
                                                                    >
                                                                        <MessageAction tooltip="Copy" delayDuration={100}>
                                                                            <Button variant="ghost" size="icon" className="rounded-full">
                                                                                <Copy />
                                                                            </Button>
                                                                        </MessageAction>
                                                                        <MessageAction tooltip="Upvote" delayDuration={100}>
                                                                            <Button variant="ghost" size="icon" className="rounded-full">
                                                                                <ThumbsUp />
                                                                            </Button>
                                                                        </MessageAction>
                                                                        <MessageAction tooltip="Downvote" delayDuration={100}>
                                                                            <Button variant="ghost" size="icon" className="rounded-full">
                                                                                <ThumbsDown />
                                                                            </Button>
                                                                        </MessageAction>
                                                                    </MessageActions>
                                                                </div>
                                                            ) : (
                                                                <div className="group flex flex-col items-end gap-1">
                                                                    <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                                                                        {message.content}
                                                                    </MessageContent>
                                                                </div>
                                                            )}
                                                        </Message>
                                                    )
                                                })}
                                            </ChatContainerContent>
                                        </ChatContainerRoot>
                                    </div>

                                    <div className="border-t bg-background/50 backdrop-blur-sm rounded-b-xl">
                                        <div className="p-4">
                                            {mentionedDocs.length > 0 && (
                                                <div className="mb-3 p-2 bg-muted/50 rounded-md">
                                                    <div className="text-xs text-muted-foreground mb-1">Referenced documents:</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {mentionedDocs.map((doc) => (
                                                            <Badge key={doc.id} variant="secondary" className="text-xs">
                                                                {doc.title}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl shrink-0 px-0">
                                                <PromptInput
                                                    isLoading={isLoading}
                                                    value={chatInput}
                                                    onValueChange={setChatInput}
                                                    onSubmit={handleSubmit}
                                                    className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
                                                >
                                                    <div className="flex flex-col">
                                                        <MentionInput
                                                            placeholder={
                                                                documents.length > 0
                                                                    ? `Ask ${activeModel.name} about your documents... Type @ for documents, # for URLs`
                                                                    : `Ask ${activeModel.name} anything...`
                                                            }
                                                            value={chatInput}
                                                            onChange={setChatInput}
                                                            onKeyDown={(e: React.KeyboardEvent) => {
                                                                if (e.key === "Enter" && !e.shiftKey) {
                                                                    e.preventDefault()
                                                                    handleSubmit()
                                                                }
                                                            }}
                                                            disabled={!canSendMessage}
                                                            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                                                            providers={mentionProviders}
                                                            maxResults={8}
                                                        />

                                                        <PromptInputActions className="mt-4 flex w-full items-center justify-between gap-2 px-3 pb-3">
                                                            <div className="flex items-center gap-2">
                                                                <Popover open={attachOpen} onOpenChange={setAttachOpen}>
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant="outline" size="sm" className="h-8 rounded-full">
                                                                            <BookOpen className="h-4 w-4 mr-2" /> Attach context
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-80 p-0">
                                                                        <Command>
                                                                            <CommandInput placeholder="Search documents..." className="h-9" />
                                                                            <CommandEmpty>No documents</CommandEmpty>
                                                                            <CommandList>
                                                                                {documents.map(doc => (
                                                                                    <CommandItem key={doc.id} value={doc.title} onSelect={() => {
                                                                                        setChatInput(v => `${v}${v.endsWith(' ') || v.length === 0 ? '' : ' '}@${doc.title} `)
                                                                                        setAttachOpen(false)
                                                                                    }}>
                                                                                        {doc.title}
                                                                                    </CommandItem>
                                                                                ))}
                                                                            </CommandList>
                                                                        </Command>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    size="icon"
                                                                    disabled={!chatInput.trim() || !canSendMessage || isLoading}
                                                                    onClick={handleSubmit}
                                                                    className="size-9 rounded-full"
                                                                >
                                                                    {!isLoading ? <ArrowUp size={18} /> : <span className="size-3 rounded-xs bg-white" />}
                                                                </Button>
                                                            </div>
                                                        </PromptInputActions>
                                                    </div>
                                                </PromptInput>
                                                {!canSendMessage && (
                                                    <p className="text-xs text-muted-foreground mt-2">Configure an AI provider in Settings to start chatting</p>
                                                )}
                                            </div>
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


