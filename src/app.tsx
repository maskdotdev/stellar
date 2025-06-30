'use client'

import { useEffect } from "react"
import { SlimNavRail } from "@/components/home/slim-nav-rail"
import { ContextBar } from "@/components/home/context-bar"
import { FocusPane, NoteEditor } from "@/components/focus"
import { FloatingChat } from "@/components/home/floating-chat"
import { CommandPalette } from "@/components/home/command-palette"
import { GraphView } from "@/components/home/graph-view"
import { Library } from "@/components/library"
import { Workspace } from "@/components/home/workspace"
import { History } from "@/components/history"
import { Settings } from "@/components/settings"
import { ActionsDashboard } from "@/components/home/actions-dashboard"
import { SessionsManagement } from "@/components/session"
import { ThemeProvider, useTheme } from "@/components/theme-provider"
import { ThemeManager } from "@/lib/theme-config"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useStudyStore } from "@/lib/study-store"
import { HotkeyProvider, HotkeyOverlay, useHotkeyContext } from "@/components/hotkey"
import { DebugHotkeyTest } from "@/components/hotkey/dev"
import { AppInitializationService } from "@/lib/app-initialization"

// Component to show when hotkey leader mode is active
const HotkeyModeIndicator: React.FC = () => {
  const { mode, currentBuffer, requireConfirmation } = useHotkeyContext();
  
  if (mode !== 'leader' && mode !== 'active') {
    return null;
  }
  
  const getMessage = () => {
    if (mode === 'leader') {
      return (
        <>
          Hotkey Mode Active • Type letters to {requireConfirmation ? 'focus' : 'activate'} elements
          {currentBuffer && (
            <> • <kbd className="px-1 py-0.5 bg-yellow-600/50 rounded text-xs font-mono">{currentBuffer}</kbd></>
          )}
        </>
      );
    } else if (mode === 'active') {
      const actionText = requireConfirmation ? 'press Enter to activate' : 'exact match auto-activates';
      return (
        <>
          Typing: <kbd className="px-1 py-0.5 bg-yellow-600/50 rounded text-xs font-mono">{currentBuffer}</kbd> • Continue typing or {actionText}
        </>
      );
    }
  };
  
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-yellow-500/90 text-yellow-950 text-sm rounded-full shadow-lg backdrop-blur z-50 animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-yellow-700 rounded-full animate-pulse" />
        {getMessage()}
      </div>
    </div>
  );
};

import { MessageCircle } from "lucide-react"

// Helper function to check if user is actively editing
const isUserActivelyEditing = (target: HTMLElement): boolean => {
  // Basic input/textarea/contentEditable check
  if (
    target.tagName === "INPUT" || 
    target.tagName === "TEXTAREA" || 
    target.isContentEditable
  ) {
    return true
  }
  
  // Check for TipTap editor elements (based on the actual TipTap structure in the codebase)
  if (
    target.closest('.tiptap') ||
    target.closest('[data-tiptap-editor]') ||
    target.closest('.ProseMirror') ||
    target.closest('.tiptap-editor') ||
    target.closest('[data-editor]') ||
    target.closest('.editor-content')
  ) {
    return true
  }
  
  // Check for command palette input (allow shortcuts in command palette for navigation)
  if (target.closest('[data-slot="command-input"]')) {
    return false // Allow shortcuts in command palette
  }
  
  // Check for other editor-related elements from the codebase
  if (
    target.closest('.monaco-editor') || // Monaco editor
    target.closest('.cm-editor') ||     // CodeMirror
    target.closest('[role="textbox"]') ||
    target.closest('[data-slot="textarea"]') ||
    target.closest('[data-slot="input"]') ||
    target.closest('[data-slot="select-trigger"]') || // Select dropdowns
    target.closest('.simple-editor') ||  // From simple-editor.scss
    target.hasAttribute('contenteditable')
  ) {
    return true
  }
  
  // Check for focus states that indicate active editing
  if (
    target.matches(':focus') && (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable ||
      target.closest('[role="textbox"]')
    )
  ) {
    return true
  }
  
  // Check if any parent element has editing-related classes or states
  let parent = target.parentElement
  while (parent && parent !== document.body) {
    if (
      parent.classList.contains('editor') ||
      parent.classList.contains('input-wrapper') ||
      parent.classList.contains('text-editor') ||
      parent.classList.contains('tiptap-editor') ||
      parent.classList.contains('simple-editor') ||
      parent.hasAttribute('contenteditable') ||
      parent.hasAttribute('data-editor')
    ) {
      return true
    }
    parent = parent.parentElement
  }
  
  return false
}

// Helper function to parse keyboard shortcut strings
const parseKeybinding = (keybinding: string): { modifiers: Set<string>, key: string } => {
  const modifiers = new Set<string>()
  let key = ''
  
  // Handle special cases first
  if (keybinding.includes('Space')) {
    if (keybinding.includes('⇧')) modifiers.add('Shift')
    if (keybinding.includes('⌘')) modifiers.add('Meta')
    if (keybinding.includes('⌥')) modifiers.add('Alt')
    if (keybinding.includes('^') || keybinding.includes('Ctrl')) modifiers.add('Control')
    return { modifiers, key: ' ' }
  }
  
  if (keybinding.includes('Escape')) {
    return { modifiers, key: 'Escape' }
  }
  
  // Handle compound shortcuts like ⌘,P
  if (keybinding.includes(',')) {
    const parts = keybinding.split(',')
    const modifierPart = parts[0]
    const keyPart = parts[1]
    
    if (modifierPart.includes('⌘')) modifiers.add('Meta')
    if (modifierPart.includes('⇧')) modifiers.add('Shift')
    if (modifierPart.includes('⌥')) modifiers.add('Alt')
    if (modifierPart.includes('^') || modifierPart.includes('Ctrl')) modifiers.add('Control')
    
    return { modifiers, key: keyPart.toLowerCase() }
  }
  
  // Parse regular shortcuts
  const chars = keybinding.split('')
  for (const char of chars) {
    if (char === '⌘') {
      modifiers.add('Meta')
    } else if (char === '⇧') {
      modifiers.add('Shift')
    } else if (char === '⌥') {
      modifiers.add('Alt')
    } else if (char === '^') {
      modifiers.add('Control')
    } else {
      key += char
    }
  }
  
  // Check for Ctrl in string format
  if (keybinding.includes('Ctrl')) {
    modifiers.add('Control')
    key = keybinding.replace(/Ctrl\+?/gi, '').trim()
  }
  
  return { modifiers, key: key.toLowerCase() }
}

// Helper function to check if pressed keys match a keybinding
const matchesKeybinding = (event: KeyboardEvent, keybinding: string): boolean => {
  const { modifiers, key } = parseKeybinding(keybinding)
  
  // Check modifiers
  const eventModifiers = new Set<string>()
  if (event.metaKey) eventModifiers.add('Meta')
  if (event.ctrlKey) eventModifiers.add('Control')
  if (event.shiftKey) eventModifiers.add('Shift')
  if (event.altKey) eventModifiers.add('Alt')
  
  // Compare modifiers
  if (modifiers.size !== eventModifiers.size) return false
  for (const mod of modifiers) {
    if (!eventModifiers.has(mod)) return false
  }
  
  // Compare key
  const eventKey = event.key === ' ' ? ' ' : event.key.toLowerCase()
  return eventKey === key
}

export function App() {
  const {
    currentView,
    focusMode,
    showCommandPalette,
    showFloatingChat,
    initialChatText,
    editingNoteId,
    keybindings,
    setShowCommandPalette,
    setShowFloatingChat,
    setInitialChatText,
    setFocusMode,
    setCurrentView,
    setEditingNoteId,
    setSettingsTab,
    categories,
    currentCategory,
    goBack,
    canGoBack,
  } = useStudyStore()
  
  const { theme, setTheme } = useTheme()

  // Initialize services on app startup
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Starting app initialization...')
        const appInit = AppInitializationService.getInstance()
        await appInit.initialize()
        console.log('✅ App initialization completed successfully')
      } catch (error) {
        console.error('❌ App initialization failed:', error)
        // Don't throw the error - the app should still work without embeddings
      }
    }

    initializeApp()
  }, []) // Empty dependency array = run once on mount

  // Dynamic keyboard shortcuts using store keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const target = e.target as HTMLElement
      const isTyping = isUserActivelyEditing(target)
      
      // Debug logging for development (can be removed in production)
      if (process.env.NODE_ENV === 'development' && isTyping) {
        console.log('🚫 Keybinding blocked - user is editing:', {
          target: target.tagName,
          isContentEditable: target.isContentEditable,
          classList: Array.from(target.classList),
          closest: {
            tiptap: !!target.closest('.tiptap'),
            prosemirror: !!target.closest('.ProseMirror'),
            simpleEditor: !!target.closest('.simple-editor'),
            dataSlotInput: !!target.closest('[data-slot="input"]'),
            dataSlotTextarea: !!target.closest('[data-slot="textarea"]'),
          }
        })
      }
      
      // Handle keybindings
      for (const binding of keybindings) {
        if (matchesKeybinding(e, binding.currentKeys)) {
          // Some keybindings should work even when editing (like Escape)
          const alwaysAllowedActions = ['escape', 'command-palette']
          const shouldPreventWhenTyping = !alwaysAllowedActions.includes(binding.id)
          
          if (isTyping && shouldPreventWhenTyping) {
            continue // Skip this keybinding when user is typing
          }
          
          e.preventDefault()
          
          switch (binding.id) {
            // Navigation
            case "library":
              setCurrentView("library")
              break
            case "graph":
              setCurrentView("graph")
              break
            case "workspace":
              setCurrentView("workspace")
              break
            case "history":
              setCurrentView("history")
              break
              
            // Quick Actions
            case "import":
              console.log("Import PDF")
              break
            case "new-note":
              setEditingNoteId(null)
              setCurrentView("note-editor")
              break
            case "focus":
              setFocusMode(!focusMode)
              setCurrentView("focus")
              break
            case "chat":
              setShowFloatingChat(!showFloatingChat)
              break
            case "flashcards":
              console.log("Create flashcards")
              break
            case "toggle-dark-mode":
              ThemeManager.toggleDarkMode(theme, setTheme)
              break
              
            // Settings
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
              
            // Development
            case "debug-hotkeys":
              setCurrentView("debug-hotkeys")
              break
              
            // System
            case "command-palette":
              setShowCommandPalette(true)
              break
            case "escape":
              setShowCommandPalette(false)
              setShowFloatingChat(false)
              break
            case "back":
              if (canGoBack()) {
                goBack()
              }
              break
          }
          
          return // Stop processing if we found a match
        }
      }
      
      // Quick search with "/" key (only if not typing)
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !isTyping) {
        e.preventDefault()
        setShowCommandPalette(true)
      }
      
      // Back navigation with "b" key (only if not typing)
      if (e.key === "b" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && !isTyping) {
        e.preventDefault()
        if (canGoBack()) {
          goBack()
        }
      }
      
      // Tab to toggle context bar (only if not typing) 
      if (e.key === "Tab" && !e.shiftKey && !e.metaKey && !e.ctrlKey && !isTyping) {
        e.preventDefault()
        // Toggle context bar visibility logic would go here
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    keybindings, 
    focusMode, 
    showFloatingChat, 
    setShowCommandPalette, 
    setShowFloatingChat, 
    setFocusMode, 
    setCurrentView, 
    setEditingNoteId,
    setSettingsTab,
    goBack,
    canGoBack,
    theme,
    setTheme
  ])

  const renderCurrentView = () => {
    switch (currentView) {
      case "graph":
        return <GraphView />
      case "workspace":
        return <Workspace />
      case "history":
        return <History />
      case "analytics":
        return <ActionsDashboard />
      case "sessions":
        return <SessionsManagement />
      case "settings":
        return <Settings />
      case "debug-hotkeys":
        return <DebugHotkeyTest />
      case "note-editor":
        return (
          <NoteEditor 
            documentId={editingNoteId || undefined} 
            onBack={() => setCurrentView("library")}
            categories={categories}
            currentCategoryId={currentCategory}
          />
        )
      case "library":
      default:
        return <Library />
    }
  }

  return (
    <ThemeProvider
      defaultTheme="dark-teal"
    >
      <HotkeyProvider leaderKey=" " requireConfirmation={false} bufferTimeout={1500}>
        <TooltipProvider delayDuration={100}>
          <div className="h-screen bg-background text-foreground overflow-hidden spotlight-bg">
          {/* Main Layout Grid */}
          <div className="h-full grid grid-cols-[48px_1fr] grid-rows-[auto_1fr_auto] spotlight-content">
            {/* Slim Nav Rail */}
            <div className="row-span-3 border-r border-border">
                            <SlimNavRail />
            </div>

            {/* Context Bar */}
            {!focusMode && (
              <div className="border-b border-border">
                <ContextBar />
              </div>
            )}

            {/* Focus Pane */}
            <div className="overflow-hidden min-h-0 h-full">{currentView === "focus" ? <FocusPane /> : renderCurrentView()}</div>

          </div>

          {/* Command Palette Overlay */}
          {showCommandPalette && <CommandPalette />}

          {/* Floating Chat */}
          {showFloatingChat && <FloatingChat onClose={() => {
            setShowFloatingChat(false)
            setInitialChatText(null)
          }} initialText={initialChatText || undefined} />}

          {/* Floating Chat Trigger */}
          {!showFloatingChat && (
            <button
              onClick={() => setShowFloatingChat(true)}
              className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center z-40"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
          )}

          {/* Focus Mode Indicator */}
          {focusMode && (
            <div className="fixed top-4 right-4 px-3 py-1 bg-primary text-primary-foreground text-sm rounded-full">
              Focus Mode • {keybindings.find(kb => kb.id === "focus")?.currentKeys || "⌘."}
            </div>
          )}

          {/* Hotkey Leader Mode Indicator */}
          <HotkeyModeIndicator />

          {/* Hotkey Overlay */}
          <HotkeyOverlay />
          </div>
          <Toaster />
        </TooltipProvider>
      </HotkeyProvider>
    </ThemeProvider>
  )
}

export default App
