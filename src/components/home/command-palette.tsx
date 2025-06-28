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
import { useTheme } from "@/components/theme-provider"
import { themes } from "@/components/theme-switcher"

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
  
  const { theme, setTheme } = useTheme()

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
    { id: "settings-theme", label: "Theme Settings", icon: Palette, shortcut: getKeybindingShortcut(keybindings, "settings-theme") },
    { id: "settings-keybindings", label: "Keybindings Settings", icon: Keyboard, shortcut: getKeybindingShortcut(keybindings, "settings-keybindings") },
  ]

  const navigationActions = [
    { id: "library", label: "Library", shortcut: getKeybindingShortcut(keybindings, "library") },
    { id: "graph", label: "Graph View", shortcut: getKeybindingShortcut(keybindings, "graph") },
    { id: "workspace", label: "Workspace", shortcut: getKeybindingShortcut(keybindings, "workspace") },
    { id: "history", label: "History", shortcut: getKeybindingShortcut(keybindings, "history") },
  ]

  // Get current base theme for comparison
  const getBaseTheme = (fullTheme: string): string => {
    if (fullTheme?.startsWith("dark-")) {
      return fullTheme.slice(5)
    }
    if (fullTheme?.startsWith("light-")) {
      return fullTheme.slice(6)
    }
    if (fullTheme === "light") return "default"
    if (fullTheme === "dark") return "default"
    return fullTheme || "teal"
  }

  const currentBaseTheme = getBaseTheme(theme)

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
        case "settings-theme":
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

    // Handle theme changes
    const selectedTheme = themes.find(t => `theme-${t.name}` === value)
    if (selectedTheme) {
      setTheme(selectedTheme.name as any)
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
        
        <CommandGroup heading="Themes">
          {themes.map((themeOption) => {
            const ThemeIcon = themeOption.icon
            const isActive = currentBaseTheme === themeOption.name
            return (
              <CommandItem 
                key={`theme-${themeOption.name}`} 
                value={`theme-${themeOption.name}`}
                onSelect={handleSelect}
              >
                <ThemeIcon className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{themeOption.label}</span>
                  <span className="text-xs text-muted-foreground">{themeOption.description}</span>
                </div>
                {isActive && (
                  <div 
                    className="ml-auto h-2 w-2 rounded-full"
                    style={{ backgroundColor: themeOption.activeColor }}
                  />
                )}
              </CommandItem>
            )
          })}
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
