"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Library, Network, FileText, History, Settings, BookOpen } from "lucide-react"
import { useStudyStore } from "@/lib/study-store"

const navItems = [
  { id: "library", icon: Library, label: "Library", shortcut: "⌘1" },
  { id: "graph", icon: Network, label: "Graph", shortcut: "⌘2" },
  { id: "workspace", icon: FileText, label: "Workspace", shortcut: "⌘3" },
  { id: "history", icon: History, label: "History", shortcut: "⌘4" },
  { id: "settings", icon: Settings, label: "Settings", shortcut: "⌘5" },
]

export function SlimNavRail() {
  const { currentView, setCurrentView } = useStudyStore()
  const [isExpanded, setIsExpanded] = useState(false)

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
            <p>Focus Pane</p>
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

        {/* Notification Badge */}
        <div className="mt-auto">
          <div className="relative">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
