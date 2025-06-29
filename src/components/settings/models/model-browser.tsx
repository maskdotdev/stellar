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
  RefreshCw,
  Search,
  Zap,
  MessageSquare,
  Star,
  Eye,
  Brain,
  Code,
  FileText,
  Image,
} from "lucide-react";
import { useAIStore } from "@/lib/ai-store";
import { useToast } from "@/hooks/use-toast";
import { getFilteredModels, filterProviders } from "./utils";
import { ProviderLogo } from "./provider-logos";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Provider brand colors
const getProviderBrandColor = (providerId: string, providerName: string) => {
  const id = providerId.toLowerCase();
  const name = providerName.toLowerCase();

  // OpenAI - Dark green/black
  if (id.includes("openai") || name.includes("openai")) {
    return "bg-gray-900";
  }

  // Anthropic - Orange/coral
  if (
    id.includes("anthropic") ||
    name.includes("anthropic") ||
    name.includes("claude")
  ) {
    return "bg-orange-600";
  }

  // Google - Blue (Google brand blue)
  if (
    id.includes("google") ||
    name.includes("google") ||
    name.includes("gemini")
  ) {
    return "bg-blue-600";
  }

  // Meta - Blue (Facebook blue)
  if (id.includes("meta") || name.includes("meta") || name.includes("llama")) {
    return "bg-blue-700";
  }

  // Microsoft/Azure - Blue (Microsoft blue)
  if (
    id.includes("azure") ||
    name.includes("azure") ||
    id.includes("microsoft") ||
    name.includes("microsoft")
  ) {
    return "bg-blue-500";
  }

  // Mistral - Orange (Mistral brand color)
  if (id.includes("mistral") || name.includes("mistral")) {
    return "bg-orange-500";
  }

  // HuggingFace - Yellow
  if (id.includes("huggingface") || name.includes("hugging")) {
    return "bg-yellow-500";
  }

  // Cohere - Purple/blue
  if (id.includes("cohere") || name.includes("cohere")) {
    return "bg-indigo-600";
  }

  // Amazon/AWS - Orange
  if (
    id.includes("aws") ||
    name.includes("aws") ||
    id.includes("amazon") ||
    name.includes("amazon")
  ) {
    return "bg-orange-600";
  }

  // Ollama - Green
  if (id.includes("ollama") || name.includes("ollama")) {
    return "bg-green-600";
  }

  // Groq - Purple/pink
  if (id.includes("groq") || name.includes("groq")) {
    return "bg-purple-600";
  }

  // X/Grok - Black (X brand color)
  if (
    id.includes("grok") ||
    name.includes("grok") ||
    id.includes("xai") ||
    name.includes("x.ai")
  ) {
    return "bg-gray-900";
  }

  // Vercel - Black
  if (id.includes("vercel") || name.includes("vercel")) {
    return "bg-gray-900";
  }

  // GitHub - Dark gray/black
  if (
    id.includes("github") ||
    name.includes("github") ||
    name.includes("copilot")
  ) {
    return "bg-gray-800";
  }

  // Stability AI - Purple
  if (id.includes("stability") || name.includes("stability")) {
    return "bg-purple-700";
  }

  // Together - Blue
  if (id.includes("together") || name.includes("together")) {
    return "bg-blue-600";
  }

  // Replicate - Black
  if (id.includes("replicate") || name.includes("replicate")) {
    return "bg-gray-900";
  }

  // Perplexity - Blue/teal
  if (id.includes("perplexity") || name.includes("perplexity")) {
    return "bg-teal-600";
  }

  // Default fallback - neutral gray
  return "bg-gray-600";
};

const getCapabilityIcon = (capability: string) => {
  switch (capability) {
    case "vision":
      return <Eye className="h-5 w-5 text-green-400" />;
    case "code":
      return <Code className="h-5 w-5 text-purple-400" />;
    case "reasoning":
      return <Brain className="h-5 w-5 text-pink-400" />;
    case "text":
      return <FileText className="h-5 w-5 text-blue-400" />;
    case "image":
      return <Image className="h-5 w-5 text-orange-400" />;
    default:
      return <FileText className="h-5 w-5 text-blue-400" />;
  }
};

const getCapabilityTooltip = (capability: string) => {
  switch (capability) {
    case "vision":
      return "Can analyze and understand images";
    case "code":
      return "Specialized for code generation and analysis";
    case "reasoning":
      return "Advanced reasoning and problem-solving";
    case "text":
      return "Text generation and understanding";
    case "image":
      return "Image generation capabilities";
    default:
      return "Text processing capabilities";
  }
};

const formatModelNumber = (index: number) => {
  return `#${String(index + 1).padStart(3, "0")}`;
};

interface ModelBrowserProps {
  showEnabledOnly?: boolean
}

export function ModelBrowser({ showEnabledOnly = false }: ModelBrowserProps) {
  const {
    providers,
    setActiveProvider,
    setActiveModel,
    syncProvider,
    isLoading,
    activeProviderId,
    activeModelId,
  } = useAIStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCapability, setSelectedCapability] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

  const { toast } = useToast();

  const handleSyncProvider = async (providerId: string) => {
    try {
      await syncProvider(providerId);
      toast({
        title: "Provider synced",
        description: `Updated models for ${providerId}`,
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: `Failed to sync provider ${providerId}`,
        variant: "destructive",
      });
    }
  };

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
      <div className="flex flex-col gap-4 md:flex-row md:items-center rounded-lg">
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
              <SelectItem value="all">🌟 All Types</SelectItem>
              <SelectItem value="text">💬 Text Only</SelectItem>
              <SelectItem value="vision">👁️ Vision</SelectItem>
              <SelectItem value="code">💻 Code</SelectItem>
              <SelectItem value="reasoning">🧠 Reasoning</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px] bg-card border-2 border-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">📝 Name</SelectItem>
              <SelectItem value="contextWindow">📏 Context Size</SelectItem>
              <SelectItem value="cost">💰 Cost</SelectItem>
            </SelectContent>
          </Select>
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
            const brandColor = getProviderBrandColor(
              model.providerId,
              model.providerName
            );

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
                      className="text-xs font-mono bg-red-100 text-red-700 "
                    >
                      Disabled
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-xs font-mono bg-green-100 text-green-700"
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
