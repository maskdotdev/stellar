"use client"

import React, { useState } from "react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,

} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Search, Settings, Palette, Moon, Sun, Library, History, Focus, FileText, Network, Calendar, BarChart3, HelpCircle, Keyboard, Download, Plus, Upload, File, FolderOpen, Bug, Zap } from "lucide-react"
import { useStudyStore } from "@/lib/stores/study-store"
import { useTheme } from "@/components/theme-provider"
import { themes, ThemeManager } from "@/lib/config/theme-config"
import { useActionsStore, ActionsService, ActionType } from "@/lib/services/actions-service"

interface Command {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
  group?: string
}

export function CommandPalette() {
  const [search, setSearch] = useState("")
  const { currentView, setCurrentView, keybindings, showCommandPalette, setShowCommandPalette } = useStudyStore()
  const { theme, setTheme } = useTheme()
  
  // Actions tracking
  const actionsService = ActionsService.getInstance()
  const { currentSessionId } = useActionsStore()

  // Helper to get keybinding by id
  const getKeybindingShortcut = (keybindings: any[], id: string): string => {
    const binding = keybindings.find(kb => kb.id === id)
    return binding?.currentKeys || ""
  }

  // Get current theme display info
  const { baseTheme, isDark } = ThemeManager.getThemeDisplayInfo(theme)

  // Navigation commands
  const navigationCommands: Command[] = [
    { id: "focus", label: "Focus Pane", icon: Focus, shortcut: getKeybindingShortcut(keybindings, "focus") },
    { id: "library", label: "Library", icon: Library, shortcut: getKeybindingShortcut(keybindings, "library") },
    { id: "flashcards", label: "Flashcards", icon: Zap, shortcut: getKeybindingShortcut(keybindings, "flashcards") },
    { id: "workspace", label: "Workspace", icon: FileText, shortcut: getKeybindingShortcut(keybindings, "workspace") },
    { id: "graph", label: "Graph View", icon: Network, shortcut: getKeybindingShortcut(keybindings, "graph") },
    { id: "history", label: "History", icon: History, shortcut: getKeybindingShortcut(keybindings, "history") },
    { id: "sessions", label: "Sessions", icon: Calendar, shortcut: "⌘7" },
    { id: "analytics", label: "Analytics", icon: BarChart3, shortcut: "⌘6" },
    { id: "settings", label: "Settings", icon: Settings, shortcut: getKeybindingShortcut(keybindings, "settings") },
    ...(process.env.NODE_ENV === 'development' ? [
      { id: "debug-hotkeys", label: "Debug Hotkeys", icon: Bug, shortcut: getKeybindingShortcut(keybindings, "debug-hotkeys") }
    ] : []),
  ]

  // Quick actions
  const actionCommands: Command[] = [
    { id: "toggle-dark-mode", label: "Toggle Dark Mode", icon: isDark ? Sun : Moon, shortcut: getKeybindingShortcut(keybindings, "toggle-dark-mode") },
    { id: "command-palette", label: "Command Palette", icon: Search, shortcut: getKeybindingShortcut(keybindings, "command-palette") },
    { id: "new-document", label: "New Document", icon: Plus, shortcut: getKeybindingShortcut(keybindings, "new-document") },
    { id: "upload-pdf", label: "Upload PDF", icon: Upload, shortcut: getKeybindingShortcut(keybindings, "upload-pdf") },
    { id: "open-file", label: "Open File", icon: File, shortcut: getKeybindingShortcut(keybindings, "open-file") },
    { id: "open-folder", label: "Open Folder", icon: FolderOpen, shortcut: getKeybindingShortcut(keybindings, "open-folder") },
  ]

  // Settings commands  
  const settingsCommands: Command[] = [
    { id: "settings-theme", label: "Theme Settings", icon: Palette, shortcut: getKeybindingShortcut(keybindings, "settings-theme") },
    { id: "settings-keybindings", label: "Keybindings", icon: Keyboard, shortcut: getKeybindingShortcut(keybindings, "settings-keybindings") },
    { id: "settings-help", label: "Help & Support", icon: HelpCircle, shortcut: getKeybindingShortcut(keybindings, "settings-help") },
    { id: "settings-export", label: "Export Data", icon: Download, shortcut: getKeybindingShortcut(keybindings, "settings-export") },
  ]



  const runCommand = React.useCallback(async (command: Command) => {
    setShowCommandPalette(false)
    setSearch("")

    // Handle navigation commands
    if (navigationCommands.some(nav => nav.id === command.id)) {
      // Record navigation action
      await actionsService.recordActionWithAutoContext(
        ActionType.VIEW_SWITCH,
        {
          fromView: currentView,
          toView: command.id,
          viewLabel: command.label,
          navigationMethod: 'command-palette',
          searchQuery: search
        },
        {
          sessionId: currentSessionId || 'default-session'
        }
      )
      
      setCurrentView(command.id as any)
      return
    }

    // Handle action commands
    switch (command.id) {
      case "toggle-dark-mode":
        ThemeManager.toggleDarkMode(theme, setTheme)
        break
      case "command-palette":
        setShowCommandPalette(true)
        break
      case "new-document":
        // Handle new document
        break
      case "upload-pdf":
        // Handle PDF upload
        break
      case "open-file":
        // Handle open file
        break
      case "open-folder":
        // Handle open folder
        break
    }

    // Handle settings commands
    switch (command.id) {
      case "settings-theme":
        setCurrentView("settings")
        // Could add specific settings panel navigation here
        break
      case "settings-keybindings":
        setCurrentView("settings")
        break
      case "settings-help":
        setCurrentView("settings")
        break
      case "settings-export":
        // Handle export
        break
    }

    // Handle theme changes (base themes only)
    const selectedTheme = themes.find(t => `theme-${t.name}` === command.id)
    if (selectedTheme) {
      ThemeManager.applyThemeWithPreference(selectedTheme.name, theme, setTheme)
    }
  }, [setCurrentView, theme, setTheme, setShowCommandPalette, actionsService, currentView, currentSessionId, search])

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setShowCommandPalette(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Search...
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
        <CommandInput 
          placeholder="Type a command or search..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Navigation">
            {navigationCommands.filter(cmd => 
              !search || cmd.label.toLowerCase().includes(search.toLowerCase())
            ).map((command) => {
              const Icon = command.icon
              const isActive = currentView === command.id
              return (
                <CommandItem
                  key={command.id}
                  value={command.id}
                  onSelect={() => runCommand(command)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{command.label}</span>
                  </div>
                  {command.shortcut && (
                    <div className="ml-auto text-xs text-muted-foreground">
                      {command.shortcut}
                    </div>
                  )}
                  {isActive && (
                    <div className="ml-2 h-2 w-2 rounded-full bg-primary" />
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandGroup heading="Themes">
            {themes.map((themeOption) => {
              const ThemeIcon = themeOption.icon
              const isActive = baseTheme === themeOption.name
              return (
                <CommandItem
                  key={`theme-${themeOption.name}`}
                  value={`theme-${themeOption.name}`}
                  onSelect={() => runCommand({ id: `theme-${themeOption.name}`, label: themeOption.label, icon: ThemeIcon })}
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

          <CommandGroup heading="Actions">
            {actionCommands.filter(cmd => 
              !search || cmd.label.toLowerCase().includes(search.toLowerCase())
            ).map((command) => {
              const Icon = command.icon
              return (
                <CommandItem
                  key={command.id}
                  value={command.id}
                  onSelect={() => runCommand(command)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{command.label}</span>
                  {command.shortcut && (
                    <div className="ml-auto text-xs text-muted-foreground">
                      {command.shortcut}
                    </div>
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandGroup heading="Settings">
            {settingsCommands.filter(cmd => 
              !search || cmd.label.toLowerCase().includes(search.toLowerCase())
            ).map((command) => {
              const Icon = command.icon
              return (
                <CommandItem
                  key={command.id}
                  value={command.id}
                  onSelect={() => runCommand(command)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{command.label}</span>
                  {command.shortcut && (
                    <div className="ml-auto text-xs text-muted-foreground">
                      {command.shortcut}
                    </div>
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
