"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStudyStore } from "@/lib/stores/study-store";
import { AppearanceSettings } from "./appearance-settings";
import { ChatSettings } from "./chat-settings";
import { DataCleanupSettings } from "./data-cleanup-settings";
import { DeveloperSettings } from "./developer-settings";
import { KeybindingsSettings } from "./keybindings-settings";
import { AIModelsSettings } from "./models";
import { PDFProcessingSettings } from "./pdf-processing-settings";
import { ProvidersSettings } from "./providers-settings";

export function Settings() {
  const { settingsTab, setSettingsTab } = useStudyStore();

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

            <Tabs
              value={settingsTab}
              onValueChange={(value) => setSettingsTab(value as any)}
              className="w-full"
            >
              <TabsList
                className={`grid w-full ${
                  process.env.NODE_ENV === "development"
                    ? "grid-cols-8"
                    : "grid-cols-7"
                }`}
              >
                <TabsTrigger value="providers">AI Providers</TabsTrigger>
                <TabsTrigger value="models">AI Models</TabsTrigger>
                <TabsTrigger value="chat">Chat Settings</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="keybindings">Keybindings</TabsTrigger>
                <TabsTrigger value="pdf">PDF Processing</TabsTrigger>
                <TabsTrigger value="data">Data Cleanup</TabsTrigger>
                {process.env.NODE_ENV === "development" && (
                  <TabsTrigger value="developer">Developer</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="providers" className="space-y-4">
                <ProvidersSettings />
              </TabsContent>

              <TabsContent value="models" className="space-y-4">
                <AIModelsSettings />
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

              <TabsContent value="pdf" className="space-y-4">
                <PDFProcessingSettings />
              </TabsContent>

              <TabsContent value="data" className="space-y-4">
                <DataCleanupSettings />
              </TabsContent>

              {process.env.NODE_ENV === "development" && (
                <TabsContent value="developer" className="space-y-4">
                  <DeveloperSettings />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
