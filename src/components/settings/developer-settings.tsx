"use client"

import { useFeatureFlags, type FeatureFlags } from "@/lib/utils/feature-flags"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Code, Eye, EyeOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function DeveloperSettings() {
  const { getEnabledFeatures, toggleFeature } = useFeatureFlags()

  if (process.env.NODE_ENV !== 'development') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Developer Settings
          </CardTitle>
          <CardDescription>
            Developer settings are only available in development mode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              These settings are not available in production builds.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const featureFlags = getEnabledFeatures()
  const featureDescriptions: Record<keyof FeatureFlags, string> = {
    showGraphView: "Show the graph view in navigation - displays knowledge graph of documents and connections",
    showWorkspace: "Show the workspace view in navigation - provides a collaborative workspace environment",
    showDebugHotkeys: "Show debug hotkeys button - displays the hotkey testing and debugging interface",
    showAnalytics: "Show analytics view in navigation - provides usage analytics and insights",
    showSessions: "Show sessions view in navigation - manages study sessions and time tracking",
  }

  const handleToggle = (feature: keyof FeatureFlags) => {
    toggleFeature(feature)
    // Force re-render by updating the component
    window.location.reload()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Developer Settings
          <Badge variant="outline" className="ml-2">
            Development Only
          </Badge>
        </CardTitle>
        <CardDescription>
          Configure feature flags for development and testing purposes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            These settings only affect the development environment and will not persist in production builds.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Feature Flags</h3>
          <div className="grid gap-4">
            {Object.entries(featureFlags).map(([key, enabled]) => {
              const feature = key as keyof FeatureFlags
              return (
                <div key={feature} className="flex items-center justify-between space-x-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={feature} className="text-sm font-medium">
                        {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Label>
                      {enabled ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {featureDescriptions[feature]}
                    </p>
                  </div>
                  <Switch
                    id={feature}
                    checked={enabled}
                    onCheckedChange={() => handleToggle(feature)}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Current Configuration</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(featureFlags).map(([key, enabled]) => (
              <Badge key={key} variant={enabled ? "default" : "secondary"}>
                {key}: {enabled ? "ON" : "OFF"}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 