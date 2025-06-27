import { Sparkles } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ThemeSwitcher, themes } from "@/components/theme-switcher"
import { useTheme } from "@/components/theme-provider"

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()

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
              Choose from multiple theme options to personalize your experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Current Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Switch between light, dark, and colored themes
                </p>
              </div>
              <ThemeSwitcher />
            </div>

            <Separator />

            <div className="space-y-4">
              <Label>Theme Preview</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {themes.map((themeOption) => {
                  const ThemeIcon = themeOption.icon
                  const isActive = theme === themeOption.name
                  
                  return (
                    <button
                      key={themeOption.name}
                      onClick={() => setTheme(themeOption.name as any)}
                      className={`
                        p-3 rounded-lg border transition-all hover:scale-105
                        ${isActive 
                          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
                          : 'border-border bg-card hover:border-primary/40'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <ThemeIcon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {themeOption.label}
                        </span>
                        <div 
                          className={`w-2 h-2 rounded-full transition-opacity ${
                            isActive ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{ backgroundColor: themeOption.activeColor }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Theme Features</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Automatic system detection</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Smooth color transitions</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Multiple color schemes</span>
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
      </div>
    </div>
  )
} 