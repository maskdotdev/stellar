"use client"

import { useState, useEffect } from "react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command"
import { FileText, Plus, Import, Network, Zap, BookOpen, MessageCircle, Clock, Settings } from "lucide-react"
import { useStudyStore } from "@/lib/study-store"

const quickActions = [
  { id: "import", label: "Import PDF", icon: Import, shortcut: "⌘I" },
  { id: "new-note", label: "New Note", icon: Plus, shortcut: "⌘N" },
  { id: "graph", label: "Open Graph View", icon: Network, shortcut: "⌘2" },
  { id: "flashcards", label: "Create Flashcards", icon: Zap, shortcut: "⌘F" },
  { id: "focus", label: "Focus Mode", icon: BookOpen, shortcut: "⌘." },
  { id: "chat", label: "Ask AI", icon: MessageCircle, shortcut: "⇧Space" },
  { id: "settings", label: "Settings", icon: Settings, shortcut: "⌘," },
]

const navigationActions = [
  { id: "library", label: "Library", shortcut: "⌘1" },
  { id: "graph", label: "Graph View", shortcut: "⌘2" },
  { id: "workspace", label: "Workspace", shortcut: "⌘3" },
  { id: "history", label: "History", shortcut: "⌘4" },
]

const recentFiles = [
  "Attention Is All You Need",
  "BERT: Pre-training of Deep Bidirectional Transformers", 
  "GPT-3: Language Models are Few-Shot Learners",
  "ResNet: Deep Residual Learning for Image Recognition",
  "Transformer Architecture Deep Dive",
]

export function CommandPalette() {
  const { 
    showCommandPalette, 
    setShowCommandPalette, 
    setCurrentView, 
    setFocusMode,
    setShowFloatingChat
  } = useStudyStore()

  const handleSelect = (value: string) => {
    // Handle quick actions
    const action = quickActions.find(a => a.id === value)
    if (action) {
      switch (action.id) {
        case "graph":
          setCurrentView("graph")
          break
        case "library":
          setCurrentView("library")
          break
        case "workspace":
          setCurrentView("workspace")
          break
        case "history":
          setCurrentView("history")
          break
        case "focus":
          setFocusMode(true)
          setCurrentView("focus")
          break
        case "import":
          // Simulate file import
          console.log("Import file")
          break
        case "new-note":
          console.log("New note")
          break
        case "flashcards":
          console.log("Create flashcards")
          break
        case "chat":
          setShowFloatingChat(true)
          break
        case "settings":
          setCurrentView("settings")
          break
      }
    }

    // Handle navigation actions
    const navAction = navigationActions.find(a => a.id === value)
    if (navAction) {
      setCurrentView(navAction.id as any)
    }

    // Handle file selections
    if (recentFiles.includes(value)) {
      setCurrentView("focus")
      console.log("Open file:", value)
    }

    setShowCommandPalette(false)
  }

  return (
    <CommandDialog 
      open={showCommandPalette} 
      onOpenChange={setShowCommandPalette}
      title="Command Palette"
      description="Search for commands, files, and actions..."
    >
      <CommandInput placeholder="Search or type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => (
            <CommandItem 
              key={action.id} 
              value={action.id}
              onSelect={handleSelect}
            >
              <action.icon className="mr-2 h-4 w-4" />
              <span>{action.label}</span>
              <CommandShortcut>{action.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Navigation">
          {navigationActions.map((action) => (
            <CommandItem 
              key={action.id} 
              value={action.id}
              onSelect={handleSelect}
            >
              <span>{action.label}</span>
              <CommandShortcut>{action.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Recent Files">
          {recentFiles.map((file) => (
            <CommandItem 
              key={file}
              value={file}
              onSelect={handleSelect}
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>{file}</span>
              <CommandShortcut>
                <Clock className="h-3 w-3" />
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
