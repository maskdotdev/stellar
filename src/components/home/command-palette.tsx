"use client"

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
import { FileText, Plus, Import, Network, Zap, BookOpen, MessageCircle, Clock, Settings, Bot, Palette, MessageSquare, Cpu, Keyboard } from "lucide-react"
import { useStudyStore } from "@/lib/study-store"

// Helper to get keybinding by id
const getKeybindingShortcut = (keybindings: any[], id: string): string => {
  const binding = keybindings.find(kb => kb.id === id)
  return binding?.currentKeys || ""
}

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
    setEditingNoteId,
    setFocusMode,
    setShowFloatingChat,
    setSettingsTab,
    keybindings
  } = useStudyStore()

  // Dynamic actions based on keybindings
  const quickActions = [
    { id: "import", label: "Import PDF", icon: Import, shortcut: getKeybindingShortcut(keybindings, "import") },
    { id: "new-note", label: "New Note", icon: Plus, shortcut: getKeybindingShortcut(keybindings, "new-note") },
    { id: "graph", label: "Open Graph View", icon: Network, shortcut: getKeybindingShortcut(keybindings, "graph") },
    { id: "flashcards", label: "Create Flashcards", icon: Zap, shortcut: getKeybindingShortcut(keybindings, "flashcards") },
    { id: "focus", label: "Focus Mode", icon: BookOpen, shortcut: getKeybindingShortcut(keybindings, "focus") },
    { id: "chat", label: "Ask AI", icon: MessageCircle, shortcut: getKeybindingShortcut(keybindings, "chat") },
  ]

  const settingsActions = [
    { id: "settings-providers", label: "AI Providers Settings", icon: Bot, shortcut: getKeybindingShortcut(keybindings, "settings-providers") },
    { id: "settings-models", label: "Models Settings", icon: Cpu, shortcut: getKeybindingShortcut(keybindings, "settings-models") },
    { id: "settings-chat", label: "Chat Settings", icon: MessageSquare, shortcut: getKeybindingShortcut(keybindings, "settings-chat") },
    { id: "settings-appearance", label: "Appearance Settings", icon: Palette, shortcut: getKeybindingShortcut(keybindings, "settings-appearance") },
    { id: "settings-keybindings", label: "Keybindings Settings", icon: Keyboard, shortcut: getKeybindingShortcut(keybindings, "settings-keybindings") },
  ]

  const navigationActions = [
    { id: "library", label: "Library", shortcut: getKeybindingShortcut(keybindings, "library") },
    { id: "graph", label: "Graph View", shortcut: getKeybindingShortcut(keybindings, "graph") },
    { id: "workspace", label: "Workspace", shortcut: getKeybindingShortcut(keybindings, "workspace") },
    { id: "history", label: "History", shortcut: getKeybindingShortcut(keybindings, "history") },
  ]

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
          setEditingNoteId(null) // null indicates new note
          setCurrentView("note-editor")
          break
        case "flashcards":
          console.log("Create flashcards")
          break
        case "chat":
          setShowFloatingChat(true)
          break
      }
    }

    // Handle settings actions
    const settingsAction = settingsActions.find(a => a.id === value)
    if (settingsAction) {
      switch (settingsAction.id) {
        case "settings-providers":
          setSettingsTab("providers")
          setCurrentView("settings")
          break
        case "settings-models":
          setSettingsTab("models")
          setCurrentView("settings")
          break
        case "settings-chat":
          setSettingsTab("chat")
          setCurrentView("settings")
          break
        case "settings-appearance":
          setSettingsTab("appearance")
          setCurrentView("settings")
          break
        case "settings-keybindings":
          setSettingsTab("keybindings")
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
        
        <CommandGroup heading="Settings">
          {settingsActions.map((action) => (
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
