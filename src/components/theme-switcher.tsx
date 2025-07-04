import * as React from "react"
import { useTheme } from "@/components/theme-provider"
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
import { themes, ThemeManager, BaseTheme } from "@/lib/config/theme-config"

export { themes } from "@/lib/config/theme-config"

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    const SunIcon = themes[1].icon
    return (
      <Button variant="outline" size="sm">
        <SunIcon className="h-4 w-4" />
      </Button>
    )
  }

  // Get current theme display info
  const { baseTheme, config } = ThemeManager.getThemeDisplayInfo(theme)
  const Icon = config.icon

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Icon className="h-4 w-4" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {themes.map((themeOption) => {
            const ThemeIcon = themeOption.icon
            const isActive = baseTheme === themeOption.name
            return (
              <DropdownMenuItem
                key={themeOption.name}
                onClick={() => setTheme(themeOption.name as BaseTheme)}
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
      <TooltipContent>
        <p>Switch theme</p>
      </TooltipContent>
    </Tooltip>
  )
} 