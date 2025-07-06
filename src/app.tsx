'use client'

import { useEffect, Suspense, lazy, useState } from "react"
import { SlimNavRail } from "@/components/home/slim-nav-rail"
import { ContextBar } from "@/components/home/context-bar"
import { FloatingChat } from "@/components/home/floating-chat"
import { CommandPalette } from "@/components/home/command-palette"
import { ThemeProvider, useTheme } from "@/components/theme-provider"
import { ThemeManager } from "@/lib/config/theme-config"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useStudyStore } from "@/lib/stores/study-store"
import { HotkeyProvider, HotkeyOverlay, useHotkeyContext } from "@/components/hotkey"
import { AppInitializationService } from "@/lib/core/app-initialization"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { OnboardingDialog } from "@/components/onboarding"
import { OnboardingService } from "@/lib/services/onboarding-service"
import { MessageCircle } from "lucide-react"

// Lazy load heavy components to enable code splitting
const FocusPane = lazy(() => import("@/components/focus").then(module => ({ default: module.FocusPane })))
const NoteEditor = lazy(() => import("@/components/focus").then(module => ({ default: module.NoteEditor })))
const GraphView = lazy(() => import("@/components/home/graph-view").then(module => ({ default: module.GraphView })))
const Library = lazy(() => import("@/components/library").then(module => ({ default: module.Library })))
const Workspace = lazy(() => import("@/components/home/workspace").then(module => ({ default: module.Workspace })))
const History = lazy(() => import("@/components/history").then(module => ({ default: module.History })))
const Settings = lazy(() => import("@/components/settings").then(module => ({ default: module.Settings })))
const ActionsDashboard = lazy(() => import("@/components/home/actions-dashboard").then(module => ({ default: module.ActionsDashboard })))
const SessionsManagement = lazy(() => import("@/components/session").then(module => ({ default: module.SessionsManagement })))
const FlashcardDashboard = lazy(() => import("@/components/flashcards/flashcard-dashboard").then(module => ({ default: module.FlashcardDashboard })))
const DebugHotkeyTest = lazy(() => import("@/components/hotkey/dev").then(module => ({ default: module.DebugHotkeyTest })))

// Loading fallback component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
)

// Function to apply custom fonts if they've been set by the user
const updateCSSFontVariables = (fontFamily: { sans: string; serif: string; mono: string }) => {
  const root = document.documentElement
  root.style.setProperty('--font-sans', fontFamily.sans)
  root.style.setProperty('--font-serif', fontFamily.serif)
  root.style.setProperty('--font-mono', fontFamily.mono)
}

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
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Check if onboarding should be shown
  useEffect(() => {
    const onboardingService = OnboardingService.getInstance()
    const shouldShow = onboardingService.shouldShowOnboarding()
    setShowOnboarding(shouldShow)
  }, [])

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    const onboardingService = OnboardingService.getInstance()
    onboardingService.completeOnboarding()
    setShowOnboarding(false)
  }

  // Restore custom fonts if they were previously set by the user
  useEffect(() => {
    const fontFamily = useSettingsStore.getState().display.fontFamily
    const defaultFonts = {
      sans: "system-ui, -apple-system, sans-serif",
      serif: "ui-serif, Georgia, serif", 
      mono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace"
    }
    
    // Only apply custom fonts if user has previously customized them
    const hasCustomFonts = 
      fontFamily.sans !== defaultFonts.sans ||
      fontFamily.serif !== defaultFonts.serif ||
      fontFamily.mono !== defaultFonts.mono
    
    if (hasCustomFonts) {
      console.log('🎨 Restoring custom fonts:', fontFamily)
      updateCSSFontVariables(fontFamily)
    }
  }, []) // Run once on app mount

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
      // IMMEDIATELY return for standard system shortcuts to avoid any interference
      const systemShortcuts = ['c', 'v', 'a', 'x', 'z', 'y', 's', 'r', 'f', 't', 'w', 'n', 'q', 'l', 'j', 'k', 'i', 'b', 'u', 'h', 'g', 'p', 'o', 'e', 'd', 'm']
      if (e.metaKey && systemShortcuts.includes(e.key.toLowerCase())) {
        // Debug: Check if event has been prevented or stopped
        if (process.env.NODE_ENV === 'development' && (e.key === 'c' || e.key === 'v')) {
          console.log('🔍 Event status before return:', {
            defaultPrevented: e.defaultPrevented,
            cancelable: e.cancelable,
            bubbles: e.bubbles,
            isTrusted: e.isTrusted,
            timeStamp: e.timeStamp
          })
        }
        return
      }
      
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
            case "flashcards":
              setCurrentView("flashcards")
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
      
      // Handle additional single-key shortcuts (only if not typing and not using modifiers)
      if (!isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Quick search with "/" key
        if (e.key === "/" && !e.shiftKey) {
          e.preventDefault()
          setShowCommandPalette(true)
        }
        
        // Back navigation with "b" key
        else if (e.key === "b" && !e.shiftKey) {
          e.preventDefault()
          if (canGoBack()) {
            goBack()
          }
        }
      }
      
      // Handle Tab key (only if not typing and no modifiers except shift)
      if (!isTyping && e.key === "Tab" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!e.shiftKey) {
          e.preventDefault()
          // Toggle context bar visibility logic would go here
        }
      }
    }

    // TEMPORARILY DISABLED - Testing if our event listener is causing copy/paste issues
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
    
    return () => {} // Empty cleanup function
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
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GraphView />
          </Suspense>
        )
      case "workspace":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Workspace />
          </Suspense>
        )
      case "history":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <History />
          </Suspense>
        )
      case "analytics":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ActionsDashboard />
          </Suspense>
        )
      case "sessions":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SessionsManagement />
          </Suspense>
        )
      case "flashcards":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <FlashcardDashboard />
          </Suspense>
        )
      case "settings":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Settings />
          </Suspense>
        )
      case "debug-hotkeys":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <DebugHotkeyTest />
          </Suspense>
        )
      case "note-editor":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <NoteEditor 
              documentId={editingNoteId || undefined} 
              onBack={() => setCurrentView("library")}
              categories={categories}
              currentCategoryId={currentCategory}
            />
          </Suspense>
        )
      case "library":
      default:
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Library />
          </Suspense>
        )
    }
  }

  return (
    <ThemeProvider
      defaultTheme="light-teal"
    >
         <HotkeyProvider leaderKey=" " requireConfirmation={false} bufferTimeout={1500} enabled={true}>
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
            <div className="overflow-hidden min-h-0 h-full">
              {currentView === "focus" ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <FocusPane />
                </Suspense>
              ) : (
                renderCurrentView()
              )}
            </div>

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
          
          {/* Onboarding Dialog */}
          <OnboardingDialog 
            open={showOnboarding} 
            onClose={handleOnboardingComplete}
          />
          
          </div>
          <Toaster />
        </TooltipProvider>
      </HotkeyProvider>
    </ThemeProvider>
  )
}

export default App
