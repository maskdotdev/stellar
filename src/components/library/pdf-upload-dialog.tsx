"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


import {
  Loader2,
  X,
  Upload,
  Sparkles,
  Link,
  HardDrive,
  FileText,
  Plus,
} from "lucide-react";

import { LibraryService, type Document } from "@/lib/library-service";
import { useToast } from "@/hooks/use-toast";

interface PdfUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (document: Document) => void;
}

type UploadType = "file" | "url";
type ConversionMethod = "standard" | "marker";

export function PdfUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: PdfUploadDialogProps) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [uploadType, setUploadType] = useState<UploadType>("file");
  const [url, setUrl] = useState("");
  const [conversionMethod, setConversionMethod] =
    useState<ConversionMethod>("standard");
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const libraryService = LibraryService.getInstance();

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setTitle("");
    setTags([]);
    setTagInput("");
    setUrl("");
    setUploadType("file");
    setConversionMethod("standard");
    setFile(null);
  };

  const handleUpload = async () => {
    try {
      setIsUploading(true);

      let document: Document | null = null;

      if (uploadType === "file") {
        // Use existing file upload method
        document = await libraryService.uploadPdfWithOptions({
          title: title.trim() || undefined,
          tags: tags,
          useMarker: conversionMethod === "marker",
        });
      } else {
        // Use URL upload method
        if (!url.trim()) {
          toast({
            title: "Error",
            description: "Please enter a valid URL",
            variant: "destructive",
          });
          return;
        }

        document = await libraryService.uploadPdfFromUrl({
          url: url.trim(),
          title: title.trim() || undefined,
          tags: tags,
          useMarker: conversionMethod === "marker",
        });
      }

      if (document) {
        onSuccess(document);
        onOpenChange(false);
        resetForm();

        toast({
          title: "Success",
          description: `PDF "${document.title}" uploaded and processed successfully!`,
        });
      }
    } catch (error) {
      console.error("Failed to upload PDF:", error);
      toast({
        title: "Error",
        description:
          uploadType === "file"
            ? "Failed to upload PDF. Please try again."
            : "Failed to download and process PDF from URL. Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isFormValid =
    uploadType === "file" || (uploadType === "url" && url.trim().length > 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        {/* Compact Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Upload PDF
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-3">
          {/* Upload Method - Tabs */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Upload Method</Label>
            <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as UploadType)}>
              <TabsList className="h-8">
                <TabsTrigger value="file" className="text-xs h-6">
                  <HardDrive className="w-3 h-3" />
                  Local File
                </TabsTrigger>
                <TabsTrigger value="url" className="text-xs h-6">
                  <Link className="w-3 h-3" />
                  URL
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* File Upload or URL Input - Compact */}
          {uploadType === "file" ? (
            <div className="border border-dashed border-border rounded p-2 text-center hover:border-primary/50 transition-colors">
              <Input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <Label
                htmlFor="file-upload"
                className="cursor-pointer flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {file ? file.name : "Click to upload PDF"}
                </p>
              </Label>
            </div>
          ) : (
            <Input
              type="url"
              placeholder="https://example.com/document.pdf"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="text-xs h-8"
            />
          )}

                    {/* Processing Method - Tabs */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Processing Method</Label>
            <Tabs value={conversionMethod} onValueChange={(value) => setConversionMethod(value as ConversionMethod)}>
              <TabsList className="h-8">
                <TabsTrigger value="standard" className="text-xs h-6">
                  <FileText className="w-3 h-3" />
                  Standard (faster)
                </TabsTrigger>
                <TabsTrigger value="marker" className="text-xs h-6">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Enhanced (better)
                  <Badge variant="secondary" className="text-xs px-1 py-0 ml-1">
                    95.6%
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {conversionMethod === "marker" && (
            <div className="p-2 bg-primary/5 border border-primary/10 rounded text-xs text-primary">
              Enhanced mode takes longer but provides superior accuracy & table extraction.
            </div>
          )}

          {/* Metadata - Compact */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div>
              <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">
                Title <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="title"
                placeholder="Document title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs h-8 mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground">Tags</Label>
              <div className="flex gap-1 mt-1">
                <Input
                  placeholder="Add tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 text-xs h-8"
                />
                <Button
                  onClick={handleAddTag}
                  variant="outline"
                  size="sm"
                  className="px-2 h-8"
                  disabled={!tagInput.trim()}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-accent text-xs px-1 py-0"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} <X className="w-2 h-2 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="flex items-center justify-end gap-2 p-3 border-t bg-muted/20 border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
            className="h-7 px-3 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-7 px-3 text-xs"
            onClick={handleUpload}
            disabled={isUploading || !isFormValid}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                {uploadType === "url" ? "Downloading..." : "Processing..."}
              </>
            ) : (
              <>
                <Upload className="w-3 h-3 mr-1" />
                Process
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
