import { Type, FileText, Code } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { Button } from "@/components/ui/button"
import { useEffect, useMemo } from "react"

// Common system font stacks for each font type
const FONT_OPTIONS = {
  sans: [
    {
      name: "System Default",
      value: "system-ui, -apple-system, sans-serif",
      preview: "The quick brown fox jumps over the lazy dog"
    },
    {
      name: "Inter",
      value: "Inter, system-ui, -apple-system, sans-serif",
      preview: "The quick brown fox jumps over the lazy dog"
    },
    {
      name: "SF Pro Display (macOS)",
      value: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      preview: "The quick brown fox jumps over the lazy dog"
    },
    {
      name: "Segoe UI (Windows)",
      value: "'Segoe UI', system-ui, -apple-system, sans-serif",
      preview: "The quick brown fox jumps over the lazy dog"
    },
    {
      name: "Roboto",
      value: "Roboto, system-ui, -apple-system, sans-serif",
      preview: "The quick brown fox jumps over the lazy dog"
    },
    {
      name: "Helvetica Neue",
      value: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      preview: "The quick brown fox jumps over the lazy dog"
    },
    {
      name: "Arial",
      value: "Arial, system-ui, -apple-system, sans-serif",
      preview: "The quick brown fox jumps over the lazy dog"
    }
  ],
  serif: [
    {
      name: "System Serif",
      value: "ui-serif, Georgia, serif",
      preview: "The quick brown fox jumps over the lazy dog"
    },
    {
      name: "Georgia",
      value: "Georgia, 'Times New Roman', serif",
      preview: "The quick brown fox jumps over the lazy dog"
    },
    {
      name: "Times New Roman",
      value: "'Times New Roman', Times, serif",
      preview: "The quick brown fox jumps over the lazy dog"
    },
    {
      name: "Playfair Display",
      value: "'Playfair Display', Georgia, serif",
      preview: "The quick brown fox jumps over the lazy dog"
    },
    {
      name: "Crimson Text",
      value: "'Crimson Text', Georgia, serif",
      preview: "The quick brown fox jumps over the lazy dog"
    },
    {
      name: "Merriweather",
      value: "Merriweather, Georgia, serif",
      preview: "The quick brown fox jumps over the lazy dog"
    }
  ],
  mono: [
    {
      name: "System Mono",
      value: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace",
      preview: "function hello() { return 'world'; }"
    },
    {
      name: "Cascadia Code",
      value: "'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace",
      preview: "function hello() { return 'world'; }"
    },
    {
      name: "Source Code Pro",
      value: "'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace",
      preview: "function hello() { return 'world'; }"
    },
    {
      name: "Menlo (macOS)",
      value: "Menlo, Monaco, 'Cascadia Code', 'Source Code Pro', Consolas, monospace",
      preview: "function hello() { return 'world'; }"
    },
    {
      name: "Consolas (Windows)",
      value: "Consolas, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, monospace",
      preview: "function hello() { return 'world'; }"
    },
    {
      name: "Monaco",
      value: "Monaco, Menlo, 'Cascadia Code', 'Source Code Pro', Consolas, monospace",
      preview: "function hello() { return 'world'; }"
    },
    {
      name: "JetBrains Mono",
      value: "'JetBrains Mono', 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, monospace",
      preview: "function hello() { return 'world'; }"
    },
    {
      name: "Fira Code",
      value: "'Fira Code', 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, monospace",
      preview: "function hello() { return 'world'; }"
    }
  ]
}

// Function to apply font changes to CSS variables
const updateCSSFontVariables = (fontFamily: { sans: string; serif: string; mono: string }) => {
  const root = document.documentElement
  root.style.setProperty('--font-sans', fontFamily.sans)
  root.style.setProperty('--font-serif', fontFamily.serif)
  root.style.setProperty('--font-mono', fontFamily.mono)
}

export function FontSettings() {
  // Use stable selectors to avoid infinite re-renders
  const fontFamily = useSettingsStore((state) => state.display.fontFamily)
  const setFontFamily = useSettingsStore((state) => state.setFontFamily)

  // Note: We don't apply fonts on mount to avoid overriding theme defaults
  // Font restoration happens at the app level during initialization

  const handleFontChange = (fontType: "sans" | "serif" | "mono", newFontFamily: string) => {
    // Update the store
    setFontFamily(fontType, newFontFamily)
    
    // Apply the change immediately to CSS for instant visual feedback
    const updatedFontFamily = {
      ...fontFamily,
      [fontType]: newFontFamily
    }
    updateCSSFontVariables(updatedFontFamily)
  }

  const resetToDefaults = () => {
    setFontFamily("sans", "system-ui, -apple-system, sans-serif")
    setFontFamily("serif", "ui-serif, Georgia, serif")
    setFontFamily("mono", "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace")
  }

  const getCurrentFontName = (fontType: "sans" | "serif" | "mono") => {
    const currentFont = fontFamily[fontType]
    const option = FONT_OPTIONS[fontType].find(opt => opt.value === currentFont)
    return option?.name || "Custom"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Type className="w-5 h-5" />
            Font Settings
          </h3>
          <p className="text-sm text-muted-foreground">
            Customize fonts for different content types
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Sans Serif Font */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Sans Serif Font
            </CardTitle>
            <CardDescription>
              Used for body text, headings, and general interface elements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Font Family</Label>
              <Select 
                value={fontFamily.sans} 
                onValueChange={(value) => handleFontChange("sans", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sans serif font" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.sans.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{font.name}</span>
                        <span 
                          className="text-xs text-muted-foreground"
                          style={{ fontFamily: font.value }}
                        >
                          {font.preview}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <div 
                className="text-base"
                style={{ fontFamily: fontFamily.sans }}
              >
                <p className="font-normal mb-1">Regular text using your selected sans serif font</p>
                <p className="font-medium mb-1">Medium weight text for emphasis</p>
                <p className="font-bold">Bold text for headings and important content</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Serif Font */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Serif Font
            </CardTitle>
            <CardDescription>
              Used for document content and reading-focused interfaces
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Font Family</Label>
              <Select 
                value={fontFamily.serif} 
                onValueChange={(value) => handleFontChange("serif", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select serif font" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.serif.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{font.name}</span>
                        <span 
                          className="text-xs text-muted-foreground"
                          style={{ fontFamily: font.value }}
                        >
                          {font.preview}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <div 
                className="text-base"
                style={{ fontFamily: fontFamily.serif }}
              >
                <p className="font-normal mb-1">Regular serif text for body content</p>
                <p className="font-medium mb-1">Medium weight for emphasis</p>
                <p className="font-bold">Bold serif text for headings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monospace Font */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Code className="w-4 h-4" />
              Monospace Font
            </CardTitle>
            <CardDescription>
              Used for code blocks, terminal output, and technical content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Font Family</Label>
              <Select 
                value={fontFamily.mono} 
                onValueChange={(value) => handleFontChange("mono", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select monospace font" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.mono.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{font.name}</span>
                        <span 
                          className="text-xs text-muted-foreground"
                          style={{ fontFamily: font.value }}
                        >
                          {font.preview}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <div 
                className="text-sm"
                style={{ fontFamily: fontFamily.mono }}
              >
                <pre className="mb-2">{`function calculateSum(a, b) {
  return a + b;
}`}</pre>
                <p className="mb-1">Terminal: <code>npm install package-name</code></p>
                <p>Code: <code>const result = calculateSum(5, 3);</code></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-2">
                💡 Font Loading Tips
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p>• System fonts load instantly and provide the best performance</p>
                <p>• Custom fonts may need to be installed on your system to display properly</p>
                <p>• Font changes apply immediately across the entire application</p>
                <p>• Settings are saved automatically and persist between sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 