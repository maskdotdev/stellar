"use client"

import { useEffect } from "react"
import { SlimNavRail } from "@/components/home/slim-nav-rail"
import { ContextBar } from "@/components/home/context-bar"
import { FocusPane } from "@/components/home/focus-pane"
import { FloatingChat } from "@/components/home/floating-chat"
import { CommandPalette } from "@/components/home/command-palette"
import { GraphView } from "@/components/home/graph-view"
import { Library } from "@/components/home/library"
import { Workspace } from "@/components/home/workspace"
import { History } from "@/components/home/history"
import { Settings } from "@/components/home/settings"
import { NoteEditor } from "@/components/home/note-editor"
import { ThemeProvider } from "@/components/theme-provider"
import { useStudyStore } from "@/lib/study-store"
import { MessageCircle } from "lucide-react"

export function App() {
  const {
    currentView,
    focusMode,
    showCommandPalette,
    showInteractionDrawer,
    showFloatingChat,
    editingNoteId,
    setShowCommandPalette,
    setShowInteractionDrawer,
    setShowFloatingChat,
    setFocusMode,
    setCurrentView,
    setEditingNoteId,
  } = useStudyStore()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setShowCommandPalette(true)
      }

      // Quick search
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault()
          setShowCommandPalette(true)
        }
      }

      // Focus Mode
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault()
        setFocusMode(!focusMode)
      }

      // Floating Chat
      if (e.shiftKey && e.code === "Space") {
        e.preventDefault()
        setShowFloatingChat(!showFloatingChat)
      }

      // Navigation shortcuts
      if ((e.metaKey || e.ctrlKey) && ["1", "2", "3", "4", "5"].includes(e.key)) {
        e.preventDefault()
        const views = ["library", "graph", "workspace", "history", "settings"]
        setCurrentView(views[Number.parseInt(e.key) - 1] as any)
      }

      // Escape to close overlays
      if (e.key === "Escape") {
        setShowCommandPalette(false)
        setShowFloatingChat(false)
      }

      // Tab to toggle context bar
      if (e.key === "Tab" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault()
          // Toggle context bar visibility logic would go here
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [focusMode, showFloatingChat, setShowCommandPalette, setShowFloatingChat, setFocusMode, setCurrentView])

  const renderCurrentView = () => {
    switch (currentView) {
      case "graph":
        return <GraphView />
      case "workspace":
        return <Workspace />
      case "history":
        return <History />
      case "settings":
        return <Settings />
      case "note-editor":
        return (
          <NoteEditor 
            documentId={editingNoteId} 
            onBack={() => setCurrentView("library")} 
          />
        )
      case "library":
      default:
        return <Library />
    }
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark-teal"
      enableSystem
      disableTransitionOnChange
    >
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
        {showFloatingChat && <FloatingChat onClose={() => setShowFloatingChat(false)} />}

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
            Focus Mode • ⌘.
          </div>
        )}
      </div>
    </ThemeProvider>
  )
}

export default App
