"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

import { TooltipProvider, TooltipWrapper } from "@/components/ui/tooltip"
import { Library, Network, FileText, History, Settings, BookOpen, Sun, Moon, BarChart3, Calendar, Bug, Zap } from "lucide-react"
import { useStudyStore } from "@/lib/stores/study-store"
import { useTheme } from "@/components/theme-provider"
import { ThemeManager } from "@/lib/config/theme-config"
import { HotkeyWrapper } from "@/components/hotkey"
import { useActionsStore, ActionsService, ActionType } from "@/lib/services/actions-service"

export function SlimNavRail() {
  const { currentView, setCurrentView, keybindings } = useStudyStore()
  const { theme, setTheme } = useTheme()
  const [darkMode, setDarkMode] = useState(false)
  
  // Actions tracking
  const actionsService = ActionsService.getInstance()
  const { currentSessionId } = useActionsStore()

  // Helper to get keybinding by id
  const getKeybindingShortcut = (id: string): string => {
    const binding = keybindings.find(kb => kb.id === id)
    return binding?.currentKeys || ""
  }

  // Handle navigation with action tracking
  const handleNavigation = async (viewId: string, viewLabel: string) => {
    // Record navigation action
    await actionsService.recordActionWithAutoContext(
      ActionType.VIEW_SWITCH,
      {
        fromView: currentView,
        toView: viewId,
        viewLabel: viewLabel,
        navigationMethod: 'nav-rail'
      },
      {
        sessionId: currentSessionId || 'default-session'
      }
    )
    
    setCurrentView(viewId as any)
  }

  const navItems = [
    { id: "library", icon: Library, label: "Library", shortcut: getKeybindingShortcut("library") },
    { id: "flashcards", icon: Zap, label: "Flashcards", shortcut: getKeybindingShortcut("flashcards") },
    { id: "graph", icon: Network, label: "Graph", shortcut: getKeybindingShortcut("graph") },
    { id: "workspace", icon: FileText, label: "Workspace", shortcut: getKeybindingShortcut("workspace") },
    { id: "history", icon: History, label: "History", shortcut: getKeybindingShortcut("history") },
    { id: "sessions", icon: Calendar, label: "Sessions", shortcut: "⌘7" },
    { id: "analytics", icon: BarChart3, label: "Analytics", shortcut: "⌘6" },
    { id: "settings", icon: Settings, label: "Settings", shortcut: "⌘5" }, // This one doesn't exist in keybindings yet
  ]

  const { baseTheme, isDark } = ThemeManager.getThemeDisplayInfo(theme)

  // Update dark mode state when theme changes
  useEffect(() => {
    setDarkMode(isDark)
  }, [isDark])

  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    
    if (baseTheme === "system") {
      // Keep system theme as is
      return
    }
    
    ThemeManager.setDarkModeState(theme, setTheme, newDarkMode)
  }



  return (
    <TooltipProvider>
      <div
        className="h-full w-12 bg-muted/30 flex flex-col items-center py-4 space-y-2"
      >
        {/* Focus Button */}
        <HotkeyWrapper 
          hotkey="Focus" 
          onAction={() => handleNavigation("focus", "Focus Pane")}
          group="navigation"
        >
          <TooltipWrapper content={`Focus Pane • ${getKeybindingShortcut("focus")}`} side="right">
            <Button
              variant={currentView === "focus" ? "default" : "ghost"}
              size="icon"
              className="w-8 h-8"
              onClick={() => handleNavigation("focus", "Focus Pane")}
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          </TooltipWrapper>
        </HotkeyWrapper>

        <div className="w-6 h-px bg-border my-2" />

        {/* Navigation Items */}
        {navItems.map((item) => (
          <HotkeyWrapper
            key={item.id}
            hotkey={item.label}
            onAction={() => handleNavigation(item.id, item.label)}
            group="navigation"
            showIndicator={true}
          >
            <TooltipWrapper content={`${item.label} • ${item.shortcut}`} side="right">
              <Button
                variant={currentView === item.id ? "default" : "ghost"}
                size="icon"
                className="w-8 h-8"
                onClick={() => handleNavigation(item.id, item.label)}
              >
                <item.icon className="h-4 w-4" />
              </Button>
            </TooltipWrapper>
          </HotkeyWrapper>
        ))}

        {/* Push remaining items to bottom */}
        <div className="flex-1" />

        {/* Debug Hotkeys Button (Development) */}
        {process.env.NODE_ENV === 'development' && (
          <HotkeyWrapper
            hotkey="Debug Hotkeys"
            onAction={() => handleNavigation("debug-hotkeys", "Debug Hotkeys")}
            group="development"
          >
            <TooltipWrapper content={`Debug Hotkeys • ${getKeybindingShortcut("debug-hotkeys")}`} side="right">
              <Button
                variant={currentView === "debug-hotkeys" ? "default" : "ghost"}
                size="icon"
                className="w-8 h-8"
                onClick={() => handleNavigation("debug-hotkeys", "Debug Hotkeys")}
              >
                <Bug className="h-4 w-4" />
              </Button>
            </TooltipWrapper>
          </HotkeyWrapper>
        )}

        {/* Light/Dark Theme Toggle */}
        <HotkeyWrapper
          hotkey="Toggle Theme"
          onAction={handleDarkModeToggle}
          group="interface"
        >
          <TooltipWrapper content={`Switch to ${darkMode ? 'Light' : 'Dark'} Mode`} side="right">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={handleDarkModeToggle}
            >
              {darkMode ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          </TooltipWrapper>
        </HotkeyWrapper>

        {/* Notification Badge */}
        <div className="mt-2">
          <div className="relative">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
