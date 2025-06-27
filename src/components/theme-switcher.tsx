import * as React from "react"
import { useTheme } from "@/components/theme-provider"
import { Monitor, Moon, Sun, Palette, Sparkles, Zap } from "lucide-react"
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
    label: "Stellar Dark",
    icon: Moon,
    activeColor: "oklch(0.7 0.131 195)",
  },
  {
    name: "light-teal",
    label: "Stellar Light",
    icon: Sun,
    activeColor: "oklch(0.65 0.15 195)",
  },
  {
    name: "light",
    label: "Solar",
    icon: Sun,
    activeColor: "oklch(0.129 0.042 264.695)",
  },
  {
    name: "dark",
    label: "Eclipse", 
    icon: Moon,
    activeColor: "oklch(0.984 0.003 247.858)",
  },
  {
    name: "system",
    label: "Auto",
    icon: Monitor,
    activeColor: "oklch(0.554 0.046 257.417)",
  },
  {
    name: "blue",
    label: "Galaxy",
    icon: Palette,
    activeColor: "oklch(0.5 0.2 240)",
  },
  {
    name: "green", 
    label: "Terra",
    icon: Palette,
    activeColor: "oklch(0.5 0.2 140)",
  },
  {
    name: "purple",
    label: "Nebula", 
    icon: Palette,
    activeColor: "oklch(0.5 0.2 280)",
  },
  {
    name: "orange",
    label: "Solar Flare",
    icon: Palette,
    activeColor: "oklch(0.6 0.2 50)",
  },
  {
    name: "rose",
    label: "Nova",
    icon: Palette,
    activeColor: "oklch(0.6 0.2 10)",
  },
  {
    name: "space",
    label: "Deep Space",
    icon: Sparkles,
    activeColor: "oklch(0.65 0.25 285)",
  },
  {
    name: "aurora",
    label: "Aurora",
    icon: Zap,
    activeColor: "oklch(0.78 0.15 85)",
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
              onClick={() => setTheme(themeOption.name as any)}
              className="flex items-center gap-2"
            >
              <ThemeIcon className="h-4 w-4" />
              <span>{themeOption.label}</span>
              <div 
                className={`ml-auto h-2 w-2 rounded-full transition-opacity ${
                  theme === themeOption.name ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ backgroundColor: themeOption.activeColor }}
              />
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 