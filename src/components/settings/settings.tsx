"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ProvidersSettings } from "./providers-settings"
import { ModelsSettings } from "./models-settings"
import { ChatSettings } from "./chat-settings"
import { AppearanceSettings } from "./appearance-settings"
import { KeybindingsSettings } from "./keybindings-settings"
import { useStudyStore } from "@/lib/study-store"

export function Settings() {
  const { settingsTab, setSettingsTab } = useStudyStore()

  return (
    <TooltipProvider>
      <div className="h-full overflow-auto">
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground">
                Configure AI providers, models, chat settings, and keybindings
              </p>
            </div>

            <Tabs value={settingsTab} onValueChange={(value) => setSettingsTab(value as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="providers">AI Providers</TabsTrigger>
                <TabsTrigger value="models">Models</TabsTrigger>
                <TabsTrigger value="chat">Chat Settings</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="keybindings">Keybindings</TabsTrigger>
              </TabsList>

              <TabsContent value="providers" className="space-y-4">
                <ProvidersSettings />
              </TabsContent>

              <TabsContent value="models" className="space-y-4">
                <ModelsSettings />
              </TabsContent>

              <TabsContent value="chat" className="space-y-4">
                <ChatSettings />
              </TabsContent>

              <TabsContent value="appearance" className="space-y-4">
                <AppearanceSettings />
              </TabsContent>

              <TabsContent value="keybindings" className="space-y-4">
                <KeybindingsSettings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
} 