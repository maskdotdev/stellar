"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Library, Network, FileText, History, Settings, BookOpen, Sun, Moon, BarChart3, Calendar, Bug } from "lucide-react"
import { useStudyStore } from "@/lib/study-store"
import { useTheme } from "@/components/theme-provider"
import { ThemeManager } from "@/lib/theme-config"
import { HotkeyWrapper } from "@/components/hotkey"

export function SlimNavRail() {
  const { currentView, setCurrentView, keybindings } = useStudyStore()
  const { theme, setTheme } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  // Helper to get keybinding by id
  const getKeybindingShortcut = (id: string): string => {
    const binding = keybindings.find(kb => kb.id === id)
    return binding?.currentKeys || ""
  }

  const navItems = [
    { id: "library", icon: Library, label: "Library", shortcut: getKeybindingShortcut("library") },
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
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Focus Button */}
        <HotkeyWrapper 
          hotkey="Focus" 
          onAction={() => setCurrentView("focus")}
          group="navigation"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentView === "focus" ? "default" : "ghost"}
                size="icon"
                className="w-8 h-8"
                onClick={() => setCurrentView("focus")}
              >
                <BookOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Focus Pane • {getKeybindingShortcut("focus")}</p>
            </TooltipContent>
          </Tooltip>
        </HotkeyWrapper>

        <div className="w-6 h-px bg-border my-2" />

        {/* Navigation Items */}
        {navItems.map((item) => (
          <HotkeyWrapper
            key={item.id}
            hotkey={item.label}
            onAction={() => setCurrentView(item.id as any)}
            group="navigation"
            showIndicator={true}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentView === item.id ? "default" : "ghost"}
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => setCurrentView(item.id as any)}
                >
                  <item.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>
                  {item.label} • {item.shortcut}
                </p>
              </TooltipContent>
            </Tooltip>
          </HotkeyWrapper>
        ))}

        {/* Push remaining items to bottom */}
        <div className="flex-1" />

        {/* Debug Hotkeys Button (Development) */}
        {process.env.NODE_ENV === 'development' && (
          <HotkeyWrapper
            hotkey="Debug Hotkeys"
            onAction={() => setCurrentView("debug-hotkeys")}
            group="development"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentView === "debug-hotkeys" ? "default" : "ghost"}
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => setCurrentView("debug-hotkeys")}
                >
                  <Bug className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Debug Hotkeys • {getKeybindingShortcut("debug-hotkeys")}</p>
              </TooltipContent>
            </Tooltip>
          </HotkeyWrapper>
        )}

        {/* Light/Dark Theme Toggle */}
        <HotkeyWrapper
          hotkey="Toggle Theme"
          onAction={handleDarkModeToggle}
          group="interface"
        >
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Switch to {darkMode ? 'Light' : 'Dark'} Mode</p>
            </TooltipContent>
          </Tooltip>
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
