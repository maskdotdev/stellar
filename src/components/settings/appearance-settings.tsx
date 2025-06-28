import { Sparkles } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ThemeSwitcher, themes } from "@/components/theme-switcher"
import { useTheme } from "@/components/theme-provider"

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()

  // Categorize themes
  const lightThemes = themes.filter(t => 
    t.name.includes('light') || 
    t.icon.name === 'Sun' ||
    t.name === 'mint-chocolate' ||
    t.name === 'lavender-cream' ||
    t.name === 'ocean-foam' ||
    t.name === 'pulsar' ||
    t.name === 'nasa'
  )
  
  const darkThemes = themes.filter(t => 
    t.name.includes('dark') || 
    t.icon.name === 'Moon' || 
    t.name === 'space' ||
    t.name === 'aurora' ||
    t.name === 'nebula' ||
    t.name === 'starfield'
  )
  
  const coloredThemes = themes.filter(t => 
    !lightThemes.includes(t) && 
    !darkThemes.includes(t) && 
    t.name !== 'system'
  )

  const renderThemeGrid = (themeList: Array<typeof themes[number]>) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {themeList.map((themeOption) => {
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
              <Label>Theme Categories</Label>
              
              <Tabs defaultValue="light" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="light">Stellar</TabsTrigger>
                  <TabsTrigger value="dark">Cosmic</TabsTrigger>
                  <TabsTrigger value="colored">Galactic</TabsTrigger>
                  <TabsTrigger value="system">Auto</TabsTrigger>
                </TabsList>
                
                <TabsContent value="light" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Light Space Themes</h4>
                    <p className="text-xs text-muted-foreground">Bright cosmic themes - from stellar winds to galactic pulsar energy</p>
                  </div>
                  {renderThemeGrid(lightThemes)}
                </TabsContent>
                
                <TabsContent value="dark" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Dark Space Themes</h4>
                    <p className="text-xs text-muted-foreground">Deep cosmic themes - from dark matter to distant nebulae</p>
                  </div>
                  {renderThemeGrid(darkThemes)}
                </TabsContent>
                
                <TabsContent value="colored" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Cosmic Themes</h4>
                    <p className="text-xs text-muted-foreground">Vibrant galactic themes with stellar color palettes</p>
                  </div>
                  {renderThemeGrid(coloredThemes)}
                </TabsContent>
                
                <TabsContent value="system" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Cosmic Auto</h4>
                    <p className="text-xs text-muted-foreground">Automatically adapts to your system's cosmic preference</p>
                  </div>
                  {renderThemeGrid(themes.filter(t => t.name === 'system'))}
                </TabsContent>
              </Tabs>
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