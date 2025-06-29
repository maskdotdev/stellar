"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"
import { Keyboard, Edit3, RotateCcw } from "lucide-react"
import { useStudyStore, type Keybinding } from "@/lib/study-store"

export function KeybindingsSettings() {
  const { 
    keybindings, 
    updateKeybinding, 
    resetKeybinding, 
    resetAllKeybindings 
  } = useStudyStore()
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingKeys, setEditingKeys] = useState("")

  const categories = Array.from(new Set(keybindings.map(k => k.category)))

  const handleEdit = (keybinding: Keybinding) => {
    setEditingId(keybinding.id)
    setEditingKeys(keybinding.currentKeys)
  }

  const handleSave = (id: string) => {
    updateKeybinding(id, editingKeys)
    setEditingId(null)
    setEditingKeys("")
  }

  const handleReset = (id: string) => {
    resetKeybinding(id)
  }

  const handleResetAll = () => {
    resetAllKeybindings()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault()
    const keys: string[] = []
    
    if (e.metaKey) keys.push("⌘")
    if (e.ctrlKey) keys.push("Ctrl")
    if (e.altKey) keys.push("Alt")
    if (e.shiftKey) keys.push("⇧")
    
    if (e.key !== "Meta" && e.key !== "Control" && e.key !== "Alt" && e.key !== "Shift") {
      if (e.key === " ") {
        keys.push("Space")
      } else if (e.key === "Escape") {
        keys.push("Escape")
      } else {
        keys.push(e.key.toUpperCase())
      }
    }
    
    setEditingKeys(keys.join("+"))
  }

  // Helper function to format keybinding display with plus signs
  const formatKeybinding = (keys: string): string => {
    // If it already has plus signs, return as is
    if (keys.includes('+')) return keys
    
    // Split common modifier combinations and add plus signs
    const modifiers = ['⌘', 'Ctrl', 'Alt', '⇧']
    let result = keys
    
    // Add plus signs between modifiers and the main key
    modifiers.forEach(modifier => {
      if (result.includes(modifier) && result.length > modifier.length) {
        const index = result.indexOf(modifier)
        const afterModifier = result.substring(index + modifier.length)
        if (afterModifier && !afterModifier.startsWith('+')) {
          result = result.substring(0, index + modifier.length) + '+' + afterModifier
        }
      }
    })
    
    // Handle comma-separated combinations like "⌘,P"
    if (result.includes(',')) {
      result = result.replace(',', '+')
    }
    
    return result
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keybindings
          </h3>
          <p className="text-sm text-muted-foreground">
            Customize keyboard shortcuts for quick access to features
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleResetAll}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All
        </Button>
      </div>

      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-base">{category}</CardTitle>
            <CardDescription>
              Keyboard shortcuts for {category.toLowerCase()} actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {keybindings
              .filter(kb => kb.category === category)
              .map((keybinding) => (
                <div key={keybinding.id}>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="font-medium">{keybinding.action}</div>
                      <div className="text-sm text-muted-foreground">
                        {keybinding.description}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {editingId === keybinding.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingKeys}
                            onChange={(e) => setEditingKeys(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Press keys..."
                            className="w-32 text-center"
                            autoFocus
                          />
                          <Button 
                            size="sm" 
                            onClick={() => handleSave(keybinding.id)}
                            disabled={!editingKeys}
                          >
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className="font-mono min-w-[60px] justify-center"
                          >
                            {formatKeybinding(keybinding.currentKeys)}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(keybinding)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          {keybinding.currentKeys !== keybinding.defaultKeys && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReset(keybinding.id)}
                              title="Reset to default"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {keybinding.id !== keybindings[keybindings.length - 1].id && 
                   keybinding.category === keybindings.find(kb => kb.id === keybinding.id)?.category && (
                    <Separator className="mt-2" />
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      ))}
      
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Keyboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Click the edit button next to any keybinding to customize it.
              <br />
              Press keys while editing to record new shortcuts.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-2">
              🛡️ Smart Editor Protection
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Keybindings are automatically disabled when you're typing in editors, input fields, or text areas. 
              Only <strong>Escape</strong> and <strong>Command Palette</strong> shortcuts work while editing.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              This includes: Rich text editors, note editors, search fields, chat inputs, and settings forms.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 