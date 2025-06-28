import * as React from "react"
import { useTheme } from "@/components/theme-provider"
import { Monitor, Moon, Sun, Sparkles, Zap, Star, Flower, Circle } from "lucide-react"
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
    name: "system",
    label: "System",
    icon: Monitor,
    activeColor: "oklch(0.554 0.046 257.417)",
    description: "Follow system preference"
  },
  {
    name: "teal",
    label: "Stellar",
    icon: Star,
    activeColor: "oklch(0.65 0.15 195)",
    description: "Default stellar theme"
  },
  {
    name: "default",
    label: "Dead Space",
    icon: Moon,
    activeColor: "oklch(0.208 0.042 265.755)",
    description: "Classic dead space theme"
  },
  {
    name: "solar-flare",
    label: "Solar Flare",
    icon: Sun,
    activeColor: "oklch(0.85 0.15 60)",
    description: "Intense solar flare energy"
  },
  {
    name: "rose",
    label: "Supernova",
    icon: Sparkles,
    activeColor: "oklch(0.6 0.2 10)",
    description: "Explosive supernova energy"
  },
  {
    name: "space",
    label: "Deep Space",
    icon: Moon,
    activeColor: "oklch(0.65 0.25 285)",
    description: "Dark cosmic space"
  },
  {
    name: "aurora",
    label: "Aurora",
    icon: Zap,
    activeColor: "oklch(0.78 0.15 85)",
    description: "Electric aurora borealis"
  },
  {
    name: "starfield",
    label: "Starfield",
    icon: Star,
    activeColor: "oklch(0.7874 0.1179 295.7538)",
    description: "Brilliant starfield"
  },
  {
    name: "cosmos",
    label: "Cosmos",
    icon: Sparkles,
    activeColor: "oklch(0.5417 0.179 288.0332)",
    description: "Cosmic wonder"
  },
  {
    name: "nebula",
    label: "Nebula",
    icon: Flower,
    activeColor: "oklch(0.6726 0.2904 341.4084)",
    description: "Colorful cosmic nebula"
  },
  {
    name: "starry-night",
    label: "Starry Night",
    icon: Moon,
    activeColor: "oklch(0.4815 0.1178 263.3758)",
    description: "Van Gogh inspired starry night"
  },
  {
    name: "infinity",
    label: "Infinity",
    icon: Zap,
    activeColor: "oklch(0.5624 0.0947 203.2755)",
    description: "Infinite possibilities"
  },
  {
    name: "pluto",
    label: "Pluto",
    icon: Circle,
    activeColor: "oklch(0.6489 0.237 26.9728)",
    description: "High-contrast dwarf planet"
  }
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

  // Extract base theme name (remove dark- prefix if present)
  const baseTheme = theme?.startsWith('dark-') ? theme.slice(5) : theme
  const currentTheme = themes.find(t => t.name === baseTheme) || themes.find(t => t.name === 'teal')! // Default to stellar
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
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((themeOption) => {          const ThemeIcon = themeOption.icon
          const isActive = baseTheme === themeOption.name
          return (
            <DropdownMenuItem
              key={themeOption.name}
              onClick={() => setTheme(themeOption.name as any)}
              className="flex items-center gap-2"
            >
              <ThemeIcon className="h-4 w-4" />
              <div className="flex flex-col">
                <span>{themeOption.label}</span>
                <span className="text-xs text-muted-foreground">{themeOption.description}</span>
              </div>
              <div 
                className={`ml-auto h-2 w-2 rounded-full transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
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