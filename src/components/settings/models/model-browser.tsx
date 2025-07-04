"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipWrapper } from "@/components/ui/tooltip";
import {
  Search,
  MessageSquare,
  Star,
  Eye,
  Code,
  Brain,
  FileText,
  Sparkles,
  Type,
  Expand,
  DollarSign,
} from "lucide-react";
import { useAIStore } from "@/lib/stores/ai-store";
import { useToast } from "@/hooks/use-toast";
import { getFilteredModels, filterProviders, getCapabilityIcon, getCapabilityTooltip } from "./utils";
import { ProviderLogo } from "./provider-logos";
import { cn } from "@/lib/utils/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";




const formatModelNumber = (index: number) => {
  return `#${String(index + 1).padStart(3, "0")}`;
};

export function ModelBrowser() {
  const {
    providers,
    setActiveProvider,
    setActiveModel,
    activeProviderId,
    activeModelId,
  } = useAIStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCapability, setSelectedCapability] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);

  const { toast } = useToast();



  const handleSelectModel = (
    providerId: string,
    modelId: string,
    modelName: string
  ) => {
    setActiveProvider(providerId);
    setActiveModel(modelId);
    toast({
      title: `${modelName} selected`,
      description: "This model is now active",
    });
  };

  // Filter and sort models based on current settings
  const filteredProviders = filterProviders(
    providers,
    searchQuery,
    selectedCapability,
    showEnabledOnly
  );

  // Flatten all models for grid display with provider context
  const allModels = filteredProviders
    .flatMap((provider) =>
      getFilteredModels(provider, searchQuery, selectedCapability, sortBy).map(
        (model: any, index: number) => ({
          ...model,
          providerId: provider.id,
          providerName: provider.name,
          providerEnabled: provider.enabled,
          globalIndex: index,
        })
      )
    )
    .filter((model) => {
      // Additional filter for enabled models only
      if (showEnabledOnly && !model.providerEnabled) return false;
      return true;
    });

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="space-y-3 rounded-lg">
        {/* Search input and selects in same row */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search models... "
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-card border-2 border-muted"
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Select
              value={selectedCapability}
              onValueChange={setSelectedCapability}
            >
              <SelectTrigger className="w-[140px] bg-card border-2 border-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    All Types
                  </div>
                </SelectItem>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Text Only
                  </div>
                </SelectItem>
                <SelectItem value="vision">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Vision
                  </div>
                </SelectItem>
                <SelectItem value="code">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Code
                  </div>
                </SelectItem>
                <SelectItem value="reasoning">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Reasoning
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[120px] bg-card border-2 border-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Name
                  </div>
                </SelectItem>
                <SelectItem value="contextWindow">
                  <div className="flex items-center gap-2">
                    <Expand className="h-4 w-4" />
                    Context Size
                  </div>
                </SelectItem>
                <SelectItem value="cost">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cost
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Switch pushed to the right */}
        <div className="flex justify-end">
          <div className="flex items-center space-x-2">
            <Switch
              id="enabled-providers-only"
              checked={showEnabledOnly}
              onCheckedChange={setShowEnabledOnly}
            />
            <Label htmlFor="enabled-providers-only" className="text-sm font-medium">
              Show enabled providers only
            </Label>
          </div>
        </div>
      </div>

      {/* Provider Sync Controls */}
      {/* <div className="flex flex-wrap gap-2">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            variant={provider.enabled ? "default" : "outline"}
            size="sm"
            onClick={() => handleSyncProvider(provider.id)}
            disabled={isLoading}
            className="text-xs"
          >
            <ProviderLogo
              providerId={provider.id}
              providerName={provider.name}
              size={14}
              className="mr-1"
            />
            <RefreshCw className="h-3 w-3 mr-1" />
            {provider.name}
            {provider.enabled && <Zap className="h-3 w-3 ml-1" />}
          </Button>
        ))}
      </div> */}

      {/* Model Grid - Pokedex Style */}
      <ScrollArea className="h-[700px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1 pr-3">
          {allModels.map((model: any, index: number) => {
            const isActive =
              activeProviderId === model.providerId &&
              activeModelId === model.id;

            return (
              <Card
                key={`${model.providerId}-${model.id}`}
                className={cn(
                  "relative overflow-hidden transition-all duration-300 hover:shadow-lg shadow-muted hover:border-primary cursor-pointer border-2",
                  isActive && "border-yellow-400 shadow-yellow-200 shadow-lg"
                )}
              >
                {/* Model Number Badge */}
                <div className="absolute top-2 left-2 z-10 flex gap-2">
                  <Badge variant="secondary" className="text-xs font-mono">
                    {formatModelNumber(index)}
                  </Badge>
                  {!model.providerEnabled ? (
                    <Badge
                      variant="destructive"
                      className="text-xs font-mono bg-rose-100/80 text-rose-500"
                    >
                      Disabled
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-xs font-mono bg-green-100/80 text-green-500"
                    >
                      Enabled
                    </Badge>
                  )}
                </div>

                {/* Active Model Star */}
                {isActive && (
                  <div className="absolute top-2 right-2 z-10">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  </div>
                )}

                {/* Model Brand Background */}
                {/* <div className={cn("h-20 relative", brandColor)}>
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="absolute bottom-2 left-2 text-white text-xs font-medium flex items-center gap-1">
                    <ProviderLogo
                      providerId={model.providerId}
                      providerName={model.providerName}
                      size={14}
                      className="text-white"
                    />
                    {model.providerName}
                  </div>
                </div> */}

                <CardContent className="p-4">
                  {/* Model Name */}
                  <h3
                    className="font-bold text-sm mb-2 "
                    title={model.name}
                  >
                    <div className="flex items-center gap-1">
                    <ProviderLogo
                      providerId={model.providerId}
                      providerName={model.providerName}
                      size={14}
                      className="text-white"
                    />
                    <span className="text-xs font-mono">
                      {model.providerName}
                    </span>
                    </div>
                    {model.name}
                  </h3>

                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {model.capabilities.map((cap: string) => (
                      <TooltipWrapper
                        key={cap}
                        content={getCapabilityTooltip(cap)}
                        side="top"
                      >
                        <div className="flex items-center gap-1">
                          {getCapabilityIcon(cap)}
                        </div>
                      </TooltipWrapper>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Context:</span>
                      <span className="font-mono">
                        {(model.contextWindow / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Tokens:</span>
                      <span className="font-mono">
                        {(model.maxTokens / 1000).toFixed(0)}K
                      </span>
                    </div>
                    {model.costPer1kTokens && (
                      <div className="flex justify-between">
                        <span>Cost/1K:</span>
                        <span className="font-mono">
                          ${model.costPer1kTokens.input.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Select Button */}
                  {model.providerEnabled && (
                    <Button
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        handleSelectModel(
                          model.providerId,
                          model.id,
                          model.name
                        )
                      }
                      className="w-full mt-3 text-xs"
                    >
                      {isActive ? "✨ Active" : "Select"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {allModels.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No models found matching your search criteria.</p>
            <p className="text-sm">
              Try adjusting your filters or search terms.
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
