import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, Input } from "../components"
import { Label } from "@/components/ui/label"
import { useHotkeyContext } from "../core"

export function DebugHotkeyTest() {
  const context = useHotkeyContext()
  const [inputValue, setInputValue] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [isPulsing, setIsPulsing] = React.useState(false)

  // Enhanced setMessage function that triggers pulse animation
  const setMessageWithPulse = React.useCallback((newMessage: string) => {
    setMessage(newMessage)
    if (newMessage) {
      setIsPulsing(true)
      // Clear pulse after animation duration
      setTimeout(() => setIsPulsing(false), 1000)
    }
  }, [])

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto max-h-screen overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Enhanced Components Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Context Status */}
          <div className="p-4 bg-muted rounded">
            <h3 className="font-semibold mb-2">Context Status</h3>
            <div className="text-sm space-y-1">
              <div>Mode: <code>{context.mode}</code></div>
              <div>Buffer: <code>"{context.currentBuffer}"</code></div>
              <div>Leader Key: <code>"{context.leaderKey}"</code></div>
              <div>Require Confirmation: <code>{context.requireConfirmation.toString()}</code></div>
              <div>Show Overlay: <code>{context.showOverlay.toString()}</code></div>
              <div>Prefixes Count: <code>{Object.keys(context.prefixes).length}</code></div>
            </div>

            {/* Configuration Info */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/50 rounded border">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Hotkey Behavior</h4>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                {context.requireConfirmation ? (
                  <>
                    <div>✅ <strong>Confirmation Mode:</strong> Type prefix → Press Enter to activate</div>
                    <div>🔑 Press <kbd className="bg-blue-200 dark:bg-blue-800 px-1 rounded">{context.leaderKey === ' ' ? 'Space' : context.leaderKey}</kbd> → Type letters → Press Enter</div>
                  </>
                ) : (
                  <>
                    <div>⚡ <strong>Immediate Mode:</strong> Type exact prefix → Activates instantly</div>
                    <div>🔑 Press <kbd className="bg-blue-200 dark:bg-blue-800 px-1 rounded">{context.leaderKey === ' ' ? 'Space' : context.leaderKey}</kbd> → Type letters → Auto-activates</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Prefixes Display */}
          <div className="p-4 bg-muted rounded">
            <h3 className="font-semibold mb-2">Current Prefixes</h3>
            <div className="text-sm">
              {Object.entries(context.prefixes).length > 0 ? (
                <ul className="space-y-1">
                  {Object.entries(context.prefixes).map(([label, prefix]) => (
                    <li key={label}>
                      <code>{label}</code> → <code>"{prefix}"</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted-foreground">No prefixes computed yet</div>
              )}
            </div>
          </div>

          {/* Enhanced Input Components */}
          <div className="space-y-4">
            <h3 className="font-semibold">Enhanced Input Components</h3>

            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="search"
                  className="block text-sm font-medium mb-1">Search Input (hotkey: "search")
                </Label>
                <Input
                  id="search"
                  hotkey="search"
                  placeholder="Search documents..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  hotkeyIndicatorPosition="top-right"
                />
              </div>

              <div>
                <Label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1">Email Input (inline indicator)
                </Label>
                <Input
                  hotkey="email"
                  type="email"
                  placeholder="Enter your email"
                  hotkeyIndicatorPosition="inline"
                />
              </div>

              <div>
                <Label
                  htmlFor="filter"
                  className="block text-sm font-medium mb-1">Filter Input (bottom-left indicator)
                </Label>
                <Input
                  hotkey="filter"
                  placeholder="Filter results..."
                  hotkeyIndicatorPosition="bottom-left"
                />
              </div>
            </div>
          </div>

          {/* Enhanced Button Components */}
          <div className="space-y-4">
            <h3 className="font-semibold">Enhanced Button Components</h3>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-2">Primary Actions</div>
                <div className="flex gap-2">
                  <Button
                    hotkey="save"
                    variant="default"
                    onClick={() => setMessageWithPulse("Saved!")}
                    hotkeyIndicatorPosition="top-right"
                  >
                    Save Changes
                  </Button>

                  <Button
                    hotkey="export"
                    variant="outline"
                    onClick={() => setMessageWithPulse("Exported!")}
                    hotkeyIndicatorPosition="top-left"
                  >
                    Export Data
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Secondary Actions (inline indicators)</div>
                <div className="flex gap-2">
                  <Button
                    hotkey="cancel"
                    variant="ghost"
                    onClick={() => setMessageWithPulse("Cancelled!")}
                    hotkeyIndicatorPosition="inline"
                  >
                    Cancel
                  </Button>

                  <Button
                    hotkey="reset"
                    variant="outline"
                    onClick={() => {
                      setMessageWithPulse("Reset!")
                      setInputValue("")
                    }}
                    hotkeyIndicatorPosition="inline"
                  >
                    Reset Form
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Destructive Actions (grouped)</div>
                <div className="flex gap-2">
                  <Button
                    hotkey="delete"
                    variant="destructive"
                    onClick={() => setMessageWithPulse("Deleted!")}
                    hotkeyGroup="dangerous"
                    hotkeyPriority={10}
                  >
                    Delete Item
                  </Button>

                  <Button
                    hotkey="clear"
                    variant="destructive"
                    onClick={() => setMessageWithPulse("Cleared!")}
                    hotkeyGroup="dangerous"
                    hotkeyPriority={5}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Actions Test */}
          <div className="space-y-4">
            <h3 className="font-semibold">Custom Hotkey Actions</h3>

            <div className="flex gap-2">
              <Button
                hotkey="custom1"
                variant="secondary"
                onHotkeyAction={() => {
                  setMessageWithPulse("Custom hotkey action triggered!")
                  console.log("Custom action executed via hotkey")
                }}
                onClick={() => setMessageWithPulse("Custom button clicked normally")}
              >
                Custom Action 1
              </Button>

              <Button
                hotkey="custom2"
                variant="secondary"
                onHotkeyAction={() => {
                  const time = new Date().toLocaleTimeString()
                  setMessageWithPulse(`Hotkey triggered at ${time}`)
                }}
                onClick={() => setMessageWithPulse("Button clicked normally")}
              >
                Custom Action 2
              </Button>
            </div>
          </div>

          {/* Action Feedback */}
          {message && (
            <div className={`p-3 rounded-md text-sm transition-all duration-1000 ${isPulsing
                ? 'bg-primary/20 border-2 border-primary shadow-lg shadow-primary/30 animate-pulse'
                : 'bg-muted border border-transparent'
              }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isPulsing ? 'bg-primary animate-ping' : 'bg-muted-foreground'
                  }`} />
                <strong className={isPulsing ? 'text-primary' : 'text-foreground'}>
                  Last Action:
                </strong>
                <span className={isPulsing ? 'text-primary font-medium' : 'text-foreground'}>
                  {message}
                </span>
                <button
                  onClick={() => {
                    setMessage("")
                    setIsPulsing(false)
                  }}
                  className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
                >
                  clear
                </button>
              </div>
            </div>
          )}

          {/* Debug Info */}
          <div className="p-4 bg-muted rounded text-xs">
            <div className="font-medium mb-1">Debug Info:</div>
            <div>Input Value: "{inputValue}"</div>
            <div>Current Input Length: {inputValue.length}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
