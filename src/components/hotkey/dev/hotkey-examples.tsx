"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, Input } from "../components"
import { Settings, Home, Search, Heart, Save, Download, Trash2 } from "lucide-react"

export function HotkeyExamples() {
  const [searchValue, setSearchValue] = React.useState("")
  const [emailValue, setEmailValue] = React.useState("")
  const [message, setMessage] = React.useState("")

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🎯 Enhanced Components Examples</h1>
        <p className="text-muted-foreground">
          Button and Input components with built-in hotkey functionality
        </p>
      </div>

      {/* Enhanced Input Components */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Input Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Input components with hotkey support and different indicator positions:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search (top-right indicator)</label>
              <Input
                hotkey="search"
                placeholder="Search documents..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                hotkeyIndicatorPosition="top-right"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email (inline indicator)</label>
              <Input
                hotkey="email"
                type="email"
                placeholder="Enter your email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                hotkeyIndicatorPosition="inline"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Filter (bottom-left indicator)</label>
              <Input
                hotkey="filter"
                placeholder="Filter results..."
                hotkeyIndicatorPosition="bottom-left"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password (hidden indicator)</label>
              <Input
                hotkey="password"
                type="password"
                placeholder="Enter password"
                showHotkeyIndicator={false}
              />
            </div>
          </div>

          <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`<Input
  hotkey="search"
  placeholder="Search documents..."
  value={searchValue}
  onChange={(e) => setSearchValue(e.target.value)}
  hotkeyIndicatorPosition="top-right"
/>`}
          </pre>
        </CardContent>
      </Card>

      {/* Enhanced Button Components */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Button Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Button components with hotkey support - all original variants and sizes work:
          </p>
          
          <div className="space-y-4">
            {/* Primary Actions */}
            <div>
              <div className="text-sm font-medium mb-2">Primary Actions</div>
              <div className="flex gap-2">
                <Button
                  hotkey="save"
                  variant="default"
                  onClick={() => setMessage("Document saved!")}
                  hotkeyIndicatorPosition="top-right"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Document
                </Button>

                <Button
                  hotkey="download"
                  variant="secondary"
                  onClick={() => setMessage("Download started!")}
                  hotkeyIndicatorPosition="top-right"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {/* Secondary Actions with Inline Indicators */}
            <div>
              <div className="text-sm font-medium mb-2">Secondary Actions (inline indicators)</div>
              <div className="flex gap-2">
                <Button
                  hotkey="search action"
                  variant="outline"
                  onClick={() => setMessage("Search initiated!")}
                  hotkeyIndicatorPosition="inline"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>

                <Button
                  hotkey="like"
                  variant="ghost"
                  onClick={() => setMessage("Liked!")}
                  hotkeyIndicatorPosition="inline"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Like
                </Button>
              </div>
            </div>

            {/* Destructive Actions with Groups */}
            <div>
              <div className="text-sm font-medium mb-2">Destructive Actions (grouped with priority)</div>
              <div className="flex gap-2">
                <Button
                  hotkey="delete"
                  variant="destructive"
                  onClick={() => setMessage("Item deleted!")}
                  hotkeyGroup="dangerous"
                  hotkeyPriority={10}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>

                <Button
                  hotkey="clear all"
                  variant="destructive"
                  onClick={() => setMessage("Everything cleared!")}
                  hotkeyGroup="dangerous"
                  hotkeyPriority={5}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>

          <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`<Button
  hotkey="save"
  variant="default"
  onClick={() => setMessage("Document saved!")}
  hotkeyIndicatorPosition="top-right"
>
  <Save className="h-4 w-4 mr-2" />
  Save Document
</Button>`}
          </pre>
        </CardContent>
      </Card>

      {/* Different Indicator Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Indicator Positions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Control where the hotkey indicator appears:
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button 
              hotkey="top right" 
              onClick={() => setMessage("Top right clicked!")} 
              hotkeyIndicatorPosition="top-right"
              size="sm"
            >
              Top Right
            </Button>
            
            <Button 
              hotkey="top left" 
              onClick={() => setMessage("Top left clicked!")} 
              hotkeyIndicatorPosition="top-left"
              size="sm"
            >
              Top Left
            </Button>
            
            <Button 
              hotkey="bottom right" 
              onClick={() => setMessage("Bottom right clicked!")} 
              hotkeyIndicatorPosition="bottom-right"
              size="sm"
            >
              Bottom Right
            </Button>
            
            <Button 
              hotkey="bottom left" 
              onClick={() => setMessage("Bottom left clicked!")} 
              hotkeyIndicatorPosition="bottom-left"
              size="sm"
            >
              Bottom Left
            </Button>
            
            <Button 
              hotkey="inline display" 
              onClick={() => setMessage("Inline clicked!")} 
              hotkeyIndicatorPosition="inline"
              size="sm"
            >
              Inline
            </Button>
            
            <Button 
              hotkey="hidden indicator" 
              onClick={() => setMessage("Hidden clicked!")} 
              showHotkeyIndicator={false}
              size="sm"
            >
              Hidden
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Hotkey Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Hotkey Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Separate actions for hotkey activation vs click:
          </p>
          
          <div className="flex gap-4">
            <Button
              hotkey="custom1"
              variant="secondary"
              onClick={() => setMessage("Button clicked normally")}
              onHotkeyAction={() => setMessage("Custom hotkey action triggered!")}
            >
              Custom Action 1
            </Button>

            <Button
              hotkey="custom2"
              variant="outline"
              onClick={() => setMessage("Regular click")}
              onHotkeyAction={() => {
                const time = new Date().toLocaleTimeString()
                setMessage(`Hotkey triggered at ${time}`)
              }}
            >
              Custom Action 2
            </Button>
          </div>

          <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`<Button
  hotkey="custom1"
  onClick={() => setMessage("Button clicked normally")}
  onHotkeyAction={() => setMessage("Custom hotkey action!")}
>
  Custom Action 1
</Button>`}
          </pre>
        </CardContent>
      </Card>

      {/* Navigation Pattern */}
      <Card>
        <CardHeader>
          <CardTitle>Navigation Pattern (Groups & Priority)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Organize hotkeys into groups and set priorities for shorter prefixes:
          </p>
          
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium mb-2">Navigation (High Priority)</div>
              <div className="flex gap-2">
                <Button 
                  hotkey="home" 
                  onClick={() => setMessage("Navigate to home!")} 
                  variant="outline"
                  size="sm"
                  hotkeyGroup="navigation" 
                  hotkeyPriority={10}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
                
                <Button 
                  hotkey="settings" 
                  onClick={() => setMessage("Navigate to settings!")} 
                  variant="outline"
                  size="sm"
                  hotkeyGroup="navigation" 
                  hotkeyPriority={10}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-2">Actions (Normal Priority)</div>
              <div className="flex gap-2">
                <Button 
                  hotkey="like post" 
                  onClick={() => setMessage("Post liked!")} 
                  variant="ghost"
                  size="sm"
                  hotkeyGroup="actions"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Like
                </Button>

                <Button 
                  hotkey="search posts" 
                  onClick={() => setMessage("Searching posts!")} 
                  variant="ghost"
                  size="sm"
                  hotkeyGroup="actions"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Feedback */}
      {message && (
        <Card>
          <CardContent className="pt-6">
            <div className="p-3 bg-muted rounded-md text-sm">
              <strong>Last Action:</strong> {message}
              <button 
                onClick={() => setMessage("")}
                className="ml-2 text-xs text-muted-foreground underline"
              >
                clear
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>1. Start hotkey mode:</strong> Press any letter or number</p>
            <p><strong>2. Navigate:</strong> Type the prefix shown in the badge</p>
            <p><strong>3. Activate:</strong> Press Enter to trigger the action</p>
            <p><strong>4. Cancel:</strong> Press Escape to exit hotkey mode</p>
            <p><strong>5. Focus inputs:</strong> Hotkeys will focus inputs automatically</p>
            <p><strong>6. Click buttons:</strong> Hotkeys will click buttons automatically</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 