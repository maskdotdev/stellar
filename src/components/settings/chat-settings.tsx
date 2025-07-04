"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { useAIStore } from "@/lib/stores/ai-store"

export function ChatSettings() {
  const { settings, updateSettings } = useAIStore()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Chat Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure AI conversation parameters
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generation Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Temperature</Label>
                <span className="text-sm text-muted-foreground">{settings.temperature}</span>
              </div>
              <Slider
                value={[settings.temperature]}
                onValueChange={([value]) => updateSettings({ temperature: value })}
                max={2}
                min={0}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Controls randomness. Lower values make responses more focused and deterministic.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Max Tokens</Label>
                <span className="text-sm text-muted-foreground">{settings.maxTokens}</span>
              </div>
              <Slider
                value={[settings.maxTokens]}
                onValueChange={([value]) => updateSettings({ maxTokens: value })}
                max={8192}
                min={100}
                step={100}
                className="w-full"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Top P</Label>
                <span className="text-sm text-muted-foreground">{settings.topP}</span>
              </div>
              <Slider
                value={[settings.topP]}
                onValueChange={([value]) => updateSettings({ topP: value })}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Behavior Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Stream Responses</Label>
                <p className="text-sm text-muted-foreground">
                  Show responses as they're generated
                </p>
              </div>
              <Switch
                checked={settings.streamResponse}
                onCheckedChange={(streamResponse) => updateSettings({ streamResponse })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Save Conversations</Label>
                <p className="text-sm text-muted-foreground">
                  Persist chat history between sessions
                </p>
              </div>
              <Switch
                checked={settings.saveConversations}
                onCheckedChange={(saveConversations) => updateSettings({ saveConversations })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 