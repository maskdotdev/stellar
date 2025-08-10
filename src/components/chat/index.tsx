"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    ChatContainerContent,
    ChatContainerRoot,
} from "@/components/ui/chat-container"
import {
    Message,
    MessageAction,
    MessageActions,
    MessageContent,
} from "@/components/ui/message"
import {
    PromptInput,
    PromptInputAction,
    PromptInputActions,
    PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { useChat } from "@/hooks/use-chat"
import { cn } from "@/lib/utils/utils"
import {
    ArrowUp,
    Copy,
    Mic,
    Pencil,
    Plus,
    ThumbsDown,
    ThumbsUp,
    Trash,
} from "lucide-react"
import { useState } from "react"
import ModelSwitcherInline from "./model-switcher-inline"

// ModelSwitcherInline moved to its own file and imported above

// ModelSwitcherInline moved to its own file and imported above

function ConversationPromptInput() {
    const {
        messages,
        streamingMessage,
        isStreaming,
        isLoading,
        error,
        sendMessage,
        clearError,
        activeModel,
        // activeProvider,
        canSendMessage,
    } = useChat({ autoCreateConversation: true })

    const [prompt, setPrompt] = useState("")
    const [attachment, setAttachment] = useState<File | null>(null)

    const hasVision = !!activeModel?.capabilities.includes("vision")
    const hasTools = !!activeModel?.supportsTools

    const handleSubmit = () => {
        if (!prompt.trim()) return
        sendMessage(prompt.trim())
        setPrompt("")
        setAttachment(null)
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden">
            <ChatContainerRoot className="relative flex-1 space-y-0 overflow-y-auto px-4 py-12">
                <ChatContainerContent className="space-y-12 px-4 py-12">
                    {messages.map((message, index) => {
                        const isAssistant = message.role === "assistant"
                        const isLastMessage = index === messages.length - 1

                        return (
                            <Message
                                key={message.id}
                                className={cn(
                                    "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6",
                                    isAssistant ? "items-start" : "items-end"
                                )}
                            >
                                {isAssistant ? (
                                    <div className="group flex w-full flex-col gap-0">
                                        <MessageContent
                                            className="text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0"
                                            markdown
                                        >
                                            {message.content}
                                        </MessageContent>
                                        <MessageActions
                                            className={cn(
                                                "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                                isLastMessage && "opacity-100"
                                            )}
                                        >
                                            <MessageAction tooltip="Copy" delayDuration={100}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-full"
                                                >
                                                    <Copy />
                                                </Button>
                                            </MessageAction>
                                            <MessageAction tooltip="Upvote" delayDuration={100}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-full"
                                                >
                                                    <ThumbsUp />
                                                </Button>
                                            </MessageAction>
                                            <MessageAction tooltip="Downvote" delayDuration={100}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-full"
                                                >
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
                                        <MessageActions
                                            className={cn(
                                                "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                                            )}
                                        >
                                            <MessageAction tooltip="Edit" delayDuration={100}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-full"
                                                >
                                                    <Pencil />
                                                </Button>
                                            </MessageAction>
                                            <MessageAction tooltip="Delete" delayDuration={100}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-full"
                                                >
                                                    <Trash />
                                                </Button>
                                            </MessageAction>
                                            <MessageAction tooltip="Copy" delayDuration={100}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-full"
                                                >
                                                    <Copy />
                                                </Button>
                                            </MessageAction>
                                        </MessageActions>
                                    </div>
                                )}
                            </Message>
                        )
                    })}

                    {isStreaming && streamingMessage && (
                        <Message className="group/message justify-start">
                            <MessageContent markdown>{streamingMessage}</MessageContent>
                        </Message>
                    )}
                </ChatContainerContent>
            </ChatContainerRoot>

            <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 md:px-5 md:pb-5">
                <PromptInput
                    isLoading={isLoading}
                    value={prompt}
                    onValueChange={setPrompt}
                    onSubmit={handleSubmit}
                    className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
                >
                    <div className="flex flex-col">
                        <PromptInputTextarea
                            placeholder={hasVision ? "Ask anything • you can also attach images" : "Ask anything"}
                            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                        />

                        <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                            <div className="flex items-center gap-2">
                                <ModelSwitcherInline />
                                <PromptInputAction tooltip={hasVision ? "Upload image or file" : "Requires a vision-capable model"}>
                                    <div>
                                        <input
                                            id="chat-file-input"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="size-9 rounded-full"
                                            disabled={!hasVision}
                                            onClick={() => document.getElementById("chat-file-input")?.click()}
                                        >
                                            <Plus size={18} />
                                        </Button>
                                    </div>
                                </PromptInputAction>
                                {attachment && (
                                    <Badge variant="secondary" className="text-xs">
                                        {attachment.name}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <PromptInputAction tooltip="Voice input">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="size-9 rounded-full"
                                        disabled
                                    >
                                        <Mic size={18} />
                                    </Button>
                                </PromptInputAction>
                                {hasTools && (
                                    <Badge variant="outline" className="text-xs">Tools</Badge>
                                )}
                                <Button
                                    size="icon"
                                    disabled={!prompt.trim() || !canSendMessage}
                                    onClick={handleSubmit}
                                    className="size-9 rounded-full"
                                >
                                    {!isLoading ? (
                                        <ArrowUp size={18} />
                                    ) : (
                                        <span className="size-3 rounded-xs bg-white" />
                                    )}
                                </Button>
                            </div>
                        </PromptInputActions>
                    </div>
                </PromptInput>

                {error && (
                    <div className="mt-2 text-xs text-destructive">
                        {error}
                        <Button variant="link" className="px-1" onClick={clearError}>
                            Dismiss
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

export { ConversationPromptInput }
