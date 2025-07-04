import { Sparkles, Moon, Sun } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ThemeSwitcher, themes } from "@/components/theme-switcher"
import { useTheme } from "@/components/theme-provider"
import { ThemeManager } from "@/lib/config/theme-config"
import { useState, useEffect } from "react"
import { FontSettings } from "./font-settings"

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const [darkMode, setDarkMode] = useState(false)

  const { baseTheme, isDark } = ThemeManager.getThemeDisplayInfo(theme)

  // Update dark mode state when theme changes
  useEffect(() => {
    setDarkMode(isDark)
  }, [isDark])

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked)
    ThemeManager.setDarkModeState(theme, setTheme, checked)
  }

  const renderThemeGrid = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {themes.map((themeOption) => {
        const ThemeIcon = themeOption.icon
        const isActive = baseTheme === themeOption.name
        
        return (
          <button
            key={themeOption.name}
            onClick={() => {
              ThemeManager.applyThemeWithPreference(themeOption.name, theme, setTheme)
            }}
            className={`
              p-4 rounded-lg border transition-all hover:scale-105
              ${isActive 
                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
                : 'border-border bg-card hover:border-primary/40'
              }
            `}
          >
            <div className="flex flex-col items-center gap-2">
              <ThemeIcon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-center">
                <div className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {themeOption.label}
                </div>
                <div className={`text-xs ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                  {themeOption.description}
                </div>
              </div>
              <div 
                className={`w-3 h-3 rounded-full transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ backgroundColor: themeOption.activeColor }}
              />
            </div>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Appearance</h2>
        <p className="text-sm text-muted-foreground">
          Customize the look and feel of your application
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Theme Selection
            </CardTitle>
            <CardDescription>
              Choose from multiple theme options to personalize your cosmic experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Current Theme</Label>
                <p className="text-sm text-muted-foreground">
                  {themes.find(t => t.name === baseTheme)?.label || 'Stellar'} theme
                  {darkMode && baseTheme !== 'system' ? ' (Dark)' : ''}
                </p>
              </div>
              <ThemeSwitcher />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  Dark Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Toggle between light and dark variants
                </p>
              </div>
              <Switch 
                checked={darkMode} 
                onCheckedChange={handleDarkModeToggle}
                disabled={baseTheme === 'system'}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Available Themes</Label>
                <p className="text-sm text-muted-foreground">
                  Choose your favorite cosmic theme - each automatically adapts to your dark mode preference
                </p>
              </div>
              {renderThemeGrid()}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Theme Features</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Automatic light/dark variants</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>System preference detection</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Smooth cosmic transitions</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Persistent theme settings</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Display Preferences</CardTitle>
            <CardDescription>
              Adjust visual settings for better accessibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Reduce Motion</Label>
                <p className="text-sm text-muted-foreground">
                  Minimize animations and transitions
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>High Contrast</Label>
                <p className="text-sm text-muted-foreground">
                  Increase contrast for better visibility
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <FontSettings />
      </div>
    </div>
  )
} 