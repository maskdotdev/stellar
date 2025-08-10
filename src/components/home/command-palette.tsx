"use client"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,

} from "@/components/ui/command"
import { ThemeManager, themes } from "@/lib/config/theme-config"
import { ActionType, ActionsService, useActionsStore } from "@/lib/services/actions-service"
import { type Document, LibraryService } from "@/lib/services/library-service"
import { useStudyStore } from "@/lib/stores/study-store"
import type { Keybinding as KeybindingType } from "@/lib/stores/study-store"
import { useFeatureFlags } from "@/lib/utils/feature-flags"
import { BarChart3, Bug, Calendar, Download, File, FileText, Focus, FolderOpen, FolderPlus, HelpCircle, History, Keyboard, Library, Moon, Network, Palette, Plus, Search, Settings, Sun, Upload, Zap } from "lucide-react"
import { BookOpen, FileText as FileTextIcon } from "lucide-react"
import React, { useEffect, useMemo, useState } from "react"

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
  const { isFeatureEnabled } = useFeatureFlags()
  const { setCurrentDocument, setEditingNoteId } = useStudyStore()
  const libraryService = useMemo(() => LibraryService.getInstance(), [])
  const [docResults, setDocResults] = useState<Document[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Ensure we don't show duplicate documents/notes (by unique id)
  const dedupeById = React.useCallback((items: Document[]): Document[] => {
    const seen = new Set<string>()
    const unique: Document[] = []
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        unique.push(item)
      }
    }
    return unique
  }, [])


  // Actions tracking
  const actionsService = ActionsService.getInstance()
  const { currentSessionId } = useActionsStore()

  // Helper to get keybinding by id
  const getKeybindingShortcut = React.useCallback((kbs: KeybindingType[], id: string): string => {
    const binding = kbs.find(kb => kb.id === id)
    return binding?.currentKeys || ""
  }, [])

  // Get current theme display info
  const { baseTheme, isDark } = ThemeManager.getThemeDisplayInfo(theme)

  // Navigation commands
  const navigationCommands: Command[] = useMemo(() => [
    { id: "focus", label: "Focus Pane", icon: Focus, shortcut: getKeybindingShortcut(keybindings, "focus") },
    { id: "library", label: "Library", icon: Library, shortcut: getKeybindingShortcut(keybindings, "library") },
    { id: "flashcards", label: "Flashcards", icon: Zap, shortcut: getKeybindingShortcut(keybindings, "flashcards") },
    ...(isFeatureEnabled("showWorkspace") ? [{ id: "workspace", label: "Workspace", icon: FileText, shortcut: getKeybindingShortcut(keybindings, "workspace") }] : []),
    ...(isFeatureEnabled("showGraphView") ? [{ id: "graph", label: "Graph View", icon: Network, shortcut: getKeybindingShortcut(keybindings, "graph") }] : []),
    { id: "history", label: "History", icon: History, shortcut: getKeybindingShortcut(keybindings, "history") },
    ...(isFeatureEnabled("showSessions") ? [{ id: "sessions", label: "Sessions", icon: Calendar, shortcut: "⌘7" }] : []),
    ...(isFeatureEnabled("showAnalytics") ? [{ id: "analytics", label: "Analytics", icon: BarChart3, shortcut: "⌘6" }] : []),
    { id: "settings", label: "Settings", icon: Settings, shortcut: getKeybindingShortcut(keybindings, "settings") },
    ...(isFeatureEnabled("showDebugHotkeys") ? [{ id: "debug-hotkeys", label: "Debug Hotkeys", icon: Bug, shortcut: getKeybindingShortcut(keybindings, "debug-hotkeys") }] : []),
  ], [keybindings, isFeatureEnabled, getKeybindingShortcut])

  // Quick actions
  const actionCommands: Command[] = useMemo(() => [
    { id: "toggle-dark-mode", label: "Toggle Dark Mode", icon: isDark ? Sun : Moon, shortcut: getKeybindingShortcut(keybindings, "toggle-dark-mode") },
    { id: "command-palette", label: "Command Palette", icon: Search, shortcut: getKeybindingShortcut(keybindings, "command-palette") },
    { id: "new-document", label: "New Document", icon: Plus, shortcut: getKeybindingShortcut(keybindings, "new-document") },
    { id: "upload-pdf", label: "Upload PDF", icon: Upload, shortcut: getKeybindingShortcut(keybindings, "upload-pdf") },
    { id: "open-file", label: "Open File", icon: File, shortcut: getKeybindingShortcut(keybindings, "open-file") },
    { id: "open-folder", label: "Open Folder", icon: FolderOpen, shortcut: getKeybindingShortcut(keybindings, "open-folder") },
    { id: "new-category", label: "New Category", icon: FolderPlus, shortcut: "⌘⇧C" },
  ], [isDark, keybindings, getKeybindingShortcut])

  // Settings commands  
  const settingsCommands: Command[] = useMemo(() => [
    { id: "settings-theme", label: "Theme Settings", icon: Palette, shortcut: getKeybindingShortcut(keybindings, "settings-theme") },
    { id: "settings-keybindings", label: "Keybindings", icon: Keyboard, shortcut: getKeybindingShortcut(keybindings, "settings-keybindings") },
    { id: "settings-help", label: "Help & Support", icon: HelpCircle, shortcut: getKeybindingShortcut(keybindings, "settings-help") },
    { id: "settings-export", label: "Export Data", icon: Download, shortcut: getKeybindingShortcut(keybindings, "settings-export") },
  ], [keybindings, getKeybindingShortcut])



  const isViewIdMemo = useMemo(() => {
    const ids = ["focus", "library", "graph", "workspace", "history", "analytics", "sessions", "settings", "note-editor", "debug-hotkeys", "flashcards"] as const
    return (id: string): id is typeof ids[number] => (ids as readonly string[]).includes(id)
  }, [])

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

      if (isViewIdMemo(command.id)) {
        setCurrentView(command.id)
      }
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
      case "new-category":
        // Navigate to Library and trigger Create Category dialog
        setCurrentView("library")
        // fire intent flag so the Library hook opens the dialog and sets parent if in a category
        useStudyStore.getState().setShouldOpenCreateCategoryDialog(true)
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
  }, [setCurrentView, theme, setTheme, setShowCommandPalette, actionsService, currentView, currentSessionId, search, navigationCommands, isViewIdMemo])

  // Global search for documents/notes
  useEffect(() => {
    let cancelled = false
    const q = search.trim()
    if (!showCommandPalette) {
      setDocResults([])
      return
    }
    setIsSearching(true)
    const run = async () => {
      if (q) {
        let results: Document[] = []
        try {
          results = await libraryService.searchDocuments(q, 20)
        } catch (e) {
          console.error('Search failed, falling back to client filter:', e)
        }
        if (!results || results.length === 0) {
          // Fallback: fetch all and filter on client
          const all = await libraryService.getAllDocuments()
          const qLower = q.toLowerCase()
          results = all.filter(d => d.title.toLowerCase().includes(qLower)).slice(0, 20)
        }
        if (cancelled) return
        setDocResults(dedupeById(results))
        // Record search immediately (no debounce for speed)
        actionsService.recordActionWithAutoContext(
          ActionType.SEARCH_QUERY,
          {
            query: q,
            scope: "global",
            resultCount: results.length,
            queryLength: q.length,
            hasResults: results.length > 0
          },
          {
            sessionId: currentSessionId || 'default-session'
          }
        )
      } else {
        const all = await libraryService.getAllDocuments()
        if (cancelled) return
        setDocResults(dedupeById(all).slice(0, 20))
      }
    }
    run()
      .catch(() => {
        if (cancelled) return
        setDocResults([])
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false)
      })
    return () => { cancelled = true }
  }, [search, showCommandPalette, libraryService, actionsService, currentSessionId, dedupeById])

  const openDocumentFromResult = React.useCallback((doc: Document) => {
    setShowCommandPalette(false)
    if (doc.doc_type === "note") {
      setEditingNoteId(doc.id)
      setCurrentView("note-editor")
    } else {
      setCurrentDocument(doc.id)
      setCurrentView("focus")
    }
  }, [setShowCommandPalette, setEditingNoteId, setCurrentView, setCurrentDocument])

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

          {/* Global search results */}
          <CommandGroup heading={isSearching ? "Searching documents..." : (search.trim() ? "Documents & Notes" : "Recent Documents & Notes")}>
            {docResults.map((doc) => (
              <CommandItem
                key={doc.id}
                value={`${doc.doc_type === "note" ? "notes" : "doc"} ${doc.title} ${doc.doc_type} ${(doc.tags || []).join(' ')}`}
                onSelect={() => openDocumentFromResult(doc)}
              >
                {doc.doc_type === "note" ? (
                  <BookOpen className="mr-2 h-4 w-4" />
                ) : (
                  <FileTextIcon className="mr-2 h-4 w-4" />
                )}
                <div className="flex flex-col">
                  <span>{`${doc.doc_type === "note" ? "notes" : "doc"} ${doc.title}`}</span>
                  <span className="text-xs text-muted-foreground">{doc.doc_type}{doc.category_id ? ` · ${doc.category_id}` : ""}</span>
                </div>
              </CommandItem>
            ))}
            {!isSearching && docResults.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No matches in documents</div>
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
