"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export const themes = [
  {
    name: "dark-teal",
    label: "Dark Teal",
    icon: Moon,
    activeColor: "oklch(0.7 0.131 195)",
  },
  {
    name: "light",
    label: "Light",
    icon: Sun,
    activeColor: "oklch(0.129 0.042 264.695)",
  },
  {
    name: "dark",
    label: "Dark", 
    icon: Moon,
    activeColor: "oklch(0.984 0.003 247.858)",
  },
  {
    name: "system",
    label: "System",
    icon: Monitor,
    activeColor: "oklch(0.554 0.046 257.417)",
  },
  {
    name: "blue",
    label: "Blue",
    icon: Palette,
    activeColor: "oklch(0.5 0.2 240)",
  },
  {
    name: "green", 
    label: "Green",
    icon: Palette,
    activeColor: "oklch(0.5 0.2 140)",
  },
  {
    name: "purple",
    label: "Purple", 
    icon: Palette,
    activeColor: "oklch(0.5 0.2 280)",
  },
  {
    name: "orange",
    label: "Orange",
    icon: Palette,
    activeColor: "oklch(0.6 0.2 50)",
  },
  {
    name: "rose",
    label: "Rose",
    icon: Palette,
    activeColor: "oklch(0.6 0.2 10)",
  },
] as const

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="sm">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const currentTheme = themes.find(t => t.name === theme) || themes[0]
  const Icon = currentTheme.icon

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Icon className="h-4 w-4" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Switch theme</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((themeOption) => {
          const ThemeIcon = themeOption.icon
          return (
            <DropdownMenuItem
              key={themeOption.name}
              onClick={() => setTheme(themeOption.name)}
              className="flex items-center gap-2"
            >
              <ThemeIcon className="h-4 w-4" />
              <span>{themeOption.label}</span>
              {theme === themeOption.name && (
                <div 
                  className="ml-auto h-2 w-2 rounded-full"
                  style={{ backgroundColor: themeOption.activeColor }}
                />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 