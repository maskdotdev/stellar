"use client"

import * as React from "react"
import { Button, Input } from "../components"

export const EnhancedComponentsExample = () => {
  const [inputValue, setInputValue] = React.useState("")
  const [message, setMessage] = React.useState("")

  return (
    <div className="p-6 space-y-6 max-w-md">
      <h2 className="text-2xl font-bold">Enhanced Components with Hotkeys</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Search Input (hotkey: "search")
          </label>
          <Input
            hotkey="search"
            placeholder="Type to search..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            hotkeyIndicatorPosition="top-right"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Email Input (hotkey: "email", inline indicator)
          </label>
          <Input
            hotkey="email"
            type="email"
            placeholder="Enter your email"
            hotkeyIndicatorPosition="inline"
          />
        </div>

        <div className="space-y-2">
          <Button
            hotkey="save"
            variant="default"
            onClick={() => setMessage("Saved!")}
            hotkeyIndicatorPosition="top-right"
          >
            Save Changes
          </Button>

          <Button
            hotkey="cancel"
            variant="outline"
            onClick={() => setMessage("Cancelled!")}
            hotkeyIndicatorPosition="inline"
          >
            Cancel
          </Button>

          <Button
            hotkey="delete"
            variant="destructive"
            onClick={() => setMessage("Deleted!")}
            hotkeyGroup="actions"
            hotkeyPriority={10}
          >
            Delete Item
          </Button>
        </div>

        {message && (
          <div className="p-3 bg-muted rounded-md text-sm">
            <strong>Action:</strong> {message}
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        <p><strong>Instructions:</strong></p>
        <p>• Press any letter to start hotkey mode</p>
        <p>• Type the hotkey prefix shown in badges</p>
        <p>• Press Enter to activate the focused element</p>
        <p>• Press Escape to cancel</p>
      </div>
    </div>
  )
}

export default EnhancedComponentsExample 