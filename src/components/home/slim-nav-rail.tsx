"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Library, Network, FileText, History, Settings, BookOpen, Sun, Moon, BarChart3 } from "lucide-react"
import { useStudyStore } from "@/lib/study-store"
import { useTheme } from "@/components/theme-provider"

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
    { id: "analytics", icon: BarChart3, label: "Analytics", shortcut: "⌘6" },
    { id: "settings", icon: Settings, label: "Settings", shortcut: "⌘5" }, // This one doesn't exist in keybindings yet
  ]

  // Extract base theme name (remove dark-/light- prefix if present) - copied from appearance-settings.tsx
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

  // Check if current theme is dark variant - copied from appearance-settings.tsx
  const isDarkTheme = (fullTheme: string): boolean => {
    return fullTheme?.startsWith("dark-") || 
           fullTheme === "dark" || 
           fullTheme === "system" ||
           // These themes are inherently dark (default to dark variant)
           ["space", "aurora", "starfield"].includes(fullTheme)
  }

  const baseTheme = getBaseTheme(theme)

  // Update dark mode state when theme changes - copied from appearance-settings.tsx
  useEffect(() => {
    setDarkMode(isDarkTheme(theme))
  }, [theme])

  // Handle dark mode toggle - copied from appearance-settings.tsx
  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    
    if (baseTheme === "system") {
      // Keep system theme as is
      return
    }
    
    // Theme mapping for light/dark variants
    const themeVariants: Record<string, { light: string; dark: string }> = {
      default: { light: "light", dark: "dark" },
      teal: { light: "light-teal", dark: "dark-teal" },
      rose: { light: "rose", dark: "dark-rose" },
      "solar-flare": { light: "solar-flare", dark: "dark-solar-flare" },
      space: { light: "light-space", dark: "space" },
      aurora: { light: "light-aurora", dark: "aurora" },
      starfield: { light: "light-starfield", dark: "starfield" },
      cosmos: { light: "cosmos", dark: "dark-cosmos" },
      nebula: { light: "nebula", dark: "dark-nebula" },
      "starry-night": { light: "starry-night", dark: "dark-starry-night" },
      infinity: { light: "infinity", dark: "dark-infinity" },
      pluto: { light: "pluto", dark: "dark-pluto" },
      "t3-chat": { light: "t3-chat", dark: "dark-t3-chat" }
    }

    const variants = themeVariants[baseTheme]
    if (variants) {
      setTheme((newDarkMode ? variants.dark : variants.light) as any)
    }
  }

  return (
    <TooltipProvider>
      <div
        className="h-full w-12 bg-muted/30 flex flex-col items-center py-4 space-y-2"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Focus Button */}
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

        <div className="w-6 h-px bg-border my-2" />

        {/* Navigation Items */}
        {navItems.map((item) => (
          <Tooltip key={item.id}>
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
        ))}

        {/* Push remaining items to bottom */}
        <div className="flex-1" />

        {/* Light/Dark Theme Toggle */}
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
