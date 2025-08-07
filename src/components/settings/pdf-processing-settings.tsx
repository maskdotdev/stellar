"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// removed unused Switch import
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { aiService } from "@/lib/services/ai-service";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertCircle,
  Eye,
  EyeOff,
  FileText,
  RefreshCw,
  TestTube,
} from "lucide-react";
import { useEffect, useState } from "react";

interface MarkerConfig {
  available: boolean;
  has_gemini_key: boolean;
  supported_features: {
    llm_processing: boolean;
    format_lines: boolean;
    force_ocr: boolean;
    inline_math: boolean;
  };
}

export function PDFProcessingSettings() {
  const { toast } = useToast();
  const [markerConfig, setMarkerConfig] = useState<MarkerConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [originalApiKey, setOriginalApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);

  useEffect(() => {
    loadMarkerConfig();
    checkExistingApiKey();
  }, []);

  const loadMarkerConfig = async () => {
    try {
      const config = await invoke<MarkerConfig>("get_marker_config");
      setMarkerConfig(config);
    } catch (error) {
      console.error("Failed to load marker config:", error);
    }
  };

  const checkExistingApiKey = async () => {
    try {
      const apiKey = await aiService.getApiKey("gemini");
      if (apiKey) {
        setHasStoredKey(true);
        setGeminiApiKey(apiKey);
        setOriginalApiKey(apiKey);
      }
    } catch (error) {
      console.error("Failed to check existing API key:", error);
    }
  };

  const handleSaveApiKey = async () => {
    if (!geminiApiKey.trim()) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid Gemini API key",
        variant: "destructive",
      });
      return;
    }

    try {
      await aiService.storeApiKey("gemini", geminiApiKey);
      setHasStoredKey(true);
      await loadMarkerConfig(); // Refresh config after saving key
      toast({
        title: "API Key Saved",
        description: "Gemini API key has been saved successfully",
      });
    } catch (error) {
      console.error("Failed to save API key:", error);
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApiKey = async () => {
    try {
      await aiService.deleteApiKey("gemini");
      setHasStoredKey(false);
      setGeminiApiKey("");
      await loadMarkerConfig(); // Refresh config after deleting key
      toast({
        title: "API Key Deleted",
        description: "Gemini API key has been deleted",
      });
    } catch (error) {
      console.error("Failed to delete API key:", error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const handleTestMarker = async () => {
    setTesting(true);
    try {
      const available = await invoke<boolean>("check_marker_availability");
      toast({
        title: available ? "Marker Available" : "Marker Not Available",
        description: available
          ? "marker_single command is available on your system"
          : "marker_single command is not available. Please install marker-pdf first.",
        variant: available ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Failed to test marker:", error);
      toast({
        title: "Test Failed",
        description: "Failed to test marker availability",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRefreshConfig = async () => {
    setLoading(true);
    await loadMarkerConfig();
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          PDF Processing
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure advanced PDF processing options including Marker for
          high-quality conversion
        </p>
      </div>

      {/* Marker Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Marker Configuration</span>
          </CardTitle>
          <CardDescription>
            Marker provides high-quality PDF to markdown conversion with LLM
            enhancement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Marker Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Marker Status:</span>
              {markerConfig ? (
                <Badge
                  variant={markerConfig.available ? "default" : "destructive"}
                >
                  {markerConfig.available ? "Available" : "Not Available"}
                </Badge>
              ) : (
                <Badge variant="outline">Loading...</Badge>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestMarker}
                disabled={testing}
              >
                {testing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshConfig}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          {/* Installation Instructions */}
          {markerConfig && !markerConfig.available && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>To use Marker for PDF processing, install it via pip:</p>
                  <code className="block bg-muted p-2 rounded text-sm">
                    pip install marker-pdf
                  </code>
                  <p className="text-xs text-muted-foreground">
                    After installation, restart the application and click "Test"
                    to verify availability.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Gemini API Key Section */}
          {markerConfig?.available && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Gemini API Key</Label>
                <p className="text-xs text-muted-foreground">
                  Required for LLM-enhanced processing features (math formulas,
                  better formatting)
                </p>
                <div className="flex space-x-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder={
                      hasStoredKey ? "API key saved" : "Enter Gemini API key"
                    }
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{showApiKey ? "Hide API key" : "Show API key"}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveApiKey}
                    disabled={
                      !geminiApiKey.trim() || geminiApiKey === originalApiKey
                    }
                  >
                    Save
                  </Button>
                  {hasStoredKey && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteApiKey}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              {/* Feature Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Available Features
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">LLM Processing</span>
                    <Badge
                      variant={
                        markerConfig.supported_features.llm_processing
                          ? "default"
                          : "outline"
                      }
                    >
                      {markerConfig.supported_features.llm_processing
                        ? "Available"
                        : "Needs API Key"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">Format Lines</span>
                    <Badge
                      variant={
                        markerConfig.supported_features.format_lines
                          ? "default"
                          : "outline"
                      }
                    >
                      {markerConfig.supported_features.format_lines
                        ? "Available"
                        : "Unavailable"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">Force OCR</span>
                    <Badge
                      variant={
                        markerConfig.supported_features.force_ocr
                          ? "default"
                          : "outline"
                      }
                    >
                      {markerConfig.supported_features.force_ocr
                        ? "Available"
                        : "Unavailable"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">Inline Math</span>
                    <Badge
                      variant={
                        markerConfig.supported_features.inline_math
                          ? "default"
                          : "outline"
                      }
                    >
                      {markerConfig.supported_features.inline_math
                        ? "Available"
                        : "Needs API Key"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Methods Info */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Methods</CardTitle>
          <CardDescription>
            Different methods available for PDF processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Basic Processing</div>
                <div className="text-sm text-muted-foreground">
                  Fast text extraction
                </div>
              </div>
              <Badge variant="default">Always Available</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Enhanced Processing</div>
                <div className="text-sm text-muted-foreground">
                  Improved structure detection
                </div>
              </div>
              <Badge variant="default">Always Available</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">MarkItDown</div>
                <div className="text-sm text-muted-foreground">
                  Microsoft's tool - balanced speed and quality
                </div>
              </div>
              <Badge variant="outline">Requires Setup</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Marker</div>
                <div className="text-sm text-muted-foreground">
                  Highest quality with 95.6% accuracy
                </div>
              </div>
              <Badge variant={markerConfig?.available ? "default" : "outline"}>
                {markerConfig?.available ? "Available" : "Requires Setup"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
