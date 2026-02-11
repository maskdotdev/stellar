"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// Removed unused Collapsible imports
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Removed unused Switch import
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

import { HardDrive, Link, Loader2, Plus, Upload, X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  type Category,
  type Document,
  LibraryService,
} from "@/lib/services/library-service";

interface PdfUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (document: Document) => void;
  categories?: Category[];
  currentCategoryId?: string | null;
}

type UploadType = "text" | "file" | "url";

export function PdfUploadDialog({
  open,
  onOpenChange,
  onSuccess,
  categories = [],
  currentCategoryId = null,
}: PdfUploadDialogProps) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [uploadType, setUploadType] = useState<UploadType>("text");
  const [url, setUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [textFileName, setTextFileName] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >(currentCategoryId ?? undefined);
  // Background processing toggle not yet implemented; removing unused state

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
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleTextFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    try {
      const fileText = await selected.text();
      setTextContent(fileText);
      setTextFileName(selected.name);

      if (!title.trim()) {
        const fileTitle = selected.name.replace(/\.[^/.]+$/, "");
        setTitle(fileTitle);
      }
    } catch (error) {
      console.error("Failed to read text file:", error);
      toast({
        title: "Error",
        description: "Failed to read the selected text file.",
        variant: "destructive",
      });
    }
  };

  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const textToHtml = (value: string) => {
    const normalized = value.replace(/\r\n/g, "\n").trim();
    if (!normalized) return "<p></p>";

    return normalized
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
      .join("\n");
  };

  const resetForm = () => {
    setTitle("");
    setTags([]);
    setTagInput("");
    setUrl("");
    setUploadType("text");
    setTextContent("");
    setFile(null);
    setTextFileName(null);
    setSelectedCategoryId(currentCategoryId ?? undefined);
    // no-op for background processing toggle

    // Reset the file input element
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }

    const textFileInput = document.getElementById(
      "text-file-upload"
    ) as HTMLInputElement;
    if (textFileInput) {
      textFileInput.value = "";
    }
  };

  const handleUpload = async () => {
    try {
      setIsUploading(true);

      if (uploadType === "text") {
        const normalizedText = textContent.trim();
        if (!normalizedText) {
          toast({
            title: "Error",
            description: "Please paste text or upload a .txt/.md file.",
            variant: "destructive",
          });
          return;
        }

        const htmlContent = textToHtml(normalizedText);
        const textDocument = await libraryService.createDocument({
          title: title.trim() || textFileName || "Imported Text",
          content: htmlContent,
          doc_type: "markdown",
          tags: tags,
          status: "ready",
          category_id: selectedCategoryId,
        });

        onSuccess(textDocument);
        onOpenChange(false);
        resetForm();

        toast({
          title: "Text Imported",
          description: `"${textDocument.title}" was added to your library.`,
        });

        return;
      }

      // For PDF file uploads we enqueue background jobs; URL returns a placeholder document immediately
      if (uploadType === "file") {
        if (!file) {
          toast({
            title: "Error",
            description: "Please select a PDF file.",
            variant: "destructive",
          });
          return;
        }

        const document = await libraryService.uploadPdfFileWithOptions(file, {
          title: title.trim() || undefined,
          tags: tags,
          categoryId: selectedCategoryId,
        });

        if (document) {
          onSuccess(document);
        }

        onOpenChange(false);
        resetForm();
        toast({
          title: "Processing started",
          description:
            "Your PDF has been queued for background processing and is now available in your library. You can monitor progress in Processing Status.",
        });
        return;
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

        // Download PDF and create document immediately (content processes in background)
        const document =
          await libraryService.downloadPdfFromUrlAndProcessBackground({
            url: url.trim(),
            title: title.trim() || undefined,
            tags: tags,
            categoryId: selectedCategoryId,
          });

        // Add document to library immediately
        onSuccess(document);
        onOpenChange(false);
        resetForm();

        toast({
          title: "PDF Downloaded",
          description: `"${document.title}" is now available in your library. Text content is being processed in the background.`,
        });

        return;
      }

      // handled per-branch
    } catch (error) {
      console.error("Failed to import document:", error);

      // More specific error messages
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (uploadType === "file") {
        errorMessage = "Failed to queue PDF for processing. Please try again.";
      } else if (uploadType === "url") {
        // URL upload error - check the error message for more details
        const errorStr = error instanceof Error ? error.message : String(error);

        if (errorStr.includes("Failed to download PDF: HTTP")) {
          errorMessage =
            "Failed to download PDF from URL. Please check the URL and try again.";
        } else if (errorStr.includes("Failed to download PDF:")) {
          errorMessage =
            "Network error while downloading PDF. Please check your internet connection and try again.";
        } else if (errorStr.includes("Failed to save PDF")) {
          errorMessage =
            "Downloaded PDF successfully but failed to save it. Please try again.";
        } else if (errorStr.includes("Failed to create processing job")) {
          errorMessage =
            "Downloaded PDF successfully but failed to create processing job. Please try again.";
        } else {
          errorMessage =
            "Failed to download PDF from URL. Please check the URL and try again.";
        }
      } else {
        errorMessage = "Text import failed. Please paste text and try again.";
      }

      toast({
        title: "Error",
        description:
          uploadType === "url" || uploadType === "file"
            ? `${errorMessage} If this keeps failing, use Text import instead.`
            : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isFormValid =
    (uploadType === "text" && textContent.trim().length > 0) ||
    (uploadType === "file" && file !== null) ||
    (uploadType === "url" && url.trim().length > 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        {/* Compact Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Add Document</h2>
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
            <Label className="text-xs font-medium text-muted-foreground">
              Import Method
            </Label>
            <Tabs
              value={uploadType}
              onValueChange={(value) => setUploadType(value as UploadType)}
            >
              <TabsList className="h-8">
                <TabsTrigger value="text" className="text-xs h-6">
                  <Plus className="w-3 h-3" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="file" className="text-xs h-6">
                  <HardDrive className="w-3 h-3" />
                  Local PDF
                </TabsTrigger>
                <TabsTrigger value="url" className="text-xs h-6">
                  <Link className="w-3 h-3" />
                  PDF URL
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* File Upload or URL Input - Compact */}
          {uploadType === "text" ? (
            <div className="space-y-2">
              <Input
                id="text-file-upload"
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={handleTextFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="text-file-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
                    <span>
                      <Upload className="w-3 h-3 mr-1" />
                      Upload .txt/.md
                    </span>
                  </Button>
                </Label>
                {textFileName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {textFileName}
                  </p>
                )}
              </div>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste text here... (recommended if PDF import is unreliable)"
                className="w-full min-h-[140px] rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          ) : uploadType === "file" ? (
            <div
              className={`border border-dashed rounded p-2 text-center transition-colors ${file
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
                }`}
            >
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
                <Upload
                  className={`w-4 h-4 ${file ? "text-primary" : "text-muted-foreground"
                    }`}
                />
                <p
                  className={`text-xs ${file ? "text-primary font-medium" : "text-muted-foreground"
                    }`}
                >
                  {file ? file.name : "Click to upload PDF (optional)"}
                </p>
              </Label>
            </div>
          ) : (
            <Input
              type="url"
              placeholder="https://example.com/document.pdf (optional)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="text-xs h-8"
            />
          )}

          {/* Category Selection */}
          <div className="space-y-1 pt-2 border-t border-border">
            <Label className="text-xs font-medium text-muted-foreground">
              Category <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Select
              value={selectedCategoryId || "none"}
              onValueChange={(value) =>
                setSelectedCategoryId(value === "none" ? undefined : value)
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Category</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metadata - Compact */}
          <div className="space-y-2">
            <div>
              <Label
                htmlFor="title"
                className="text-xs font-medium text-muted-foreground"
              >
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
              <Label className="text-xs font-medium text-muted-foreground">
                Tags
              </Label>
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
                {uploadType === "url"
                  ? "Downloading..."
                  : uploadType === "file"
                    ? "Processing..."
                    : "Importing..."}
              </>
            ) : (
              <>
                <Upload className="w-3 h-3 mr-1" />
                {uploadType === "text" ? "Import" : "Process"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
