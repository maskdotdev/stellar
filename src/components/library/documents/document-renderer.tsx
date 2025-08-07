"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MDXRenderer } from "@/components/ui/mdx-renderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useActionsStore } from "@/lib/services/actions-service";
import type { Document } from "@/lib/services/library-service";
import { LibraryService } from "@/lib/services/library-service";
import { type DocumentReference, useAIStore } from "@/lib/stores/ai-store";
import { useStudyStore } from "@/lib/stores/study-store";
import { cn } from "@/lib/utils/utils";
import { invoke } from "@tauri-apps/api/core";
import {
  Clock,
  Code,
  Eye,
  FileText,
  Loader2,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PdfRenderer } from "../../pdf-renderer";

interface ProcessingJob {
  id: string;
  job_type: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  original_filename: string;
  title?: string;
}

interface DocumentRendererProps {
  document: Document;
  className?: string;
  onTextSelection?: (text: string) => void;
}

type ViewMode = "markdown" | "pdf";

export function DocumentRenderer({
  document,
  className,
  onTextSelection,
}: DocumentRendererProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("pdf");
  const [pdfFilePath, setPdfFilePath] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [processingJob, setProcessingJob] = useState<ProcessingJob | null>(
    null
  );
  // Removed unused isCheckingProcessing state

  // Determine if PDF view is available
  const hasPdfFile = document.doc_type === "pdf" && document.file_path;

  // Determine if markdown tab should be disabled
  const isMarkdownDisabled =
    document.doc_type === "pdf" &&
    (document.status === "processing" ||
      processingJob?.status === "pending" ||
      processingJob?.status === "processing");

  const libraryService = LibraryService.getInstance();
  const { setShowFloatingChat, setInitialChatText } = useStudyStore();
  const { createConversationWithContext } = useAIStore();
  const { currentSessionId } = useActionsStore();
  const { toast } = useToast();

  // Load PDF file path when component mounts or document changes
  useEffect(() => {
    const loadPdfFilePath = async () => {
      if (!hasPdfFile || !document.file_path) {
        setPdfFilePath(null);
        return;
      }

      setIsPdfLoading(true);
      setPdfError(null);

      try {
        // Use the new blob URL method for better browser compatibility
        const blobUrl = await libraryService.getPdfBlobUrl(document.file_path);

        if (blobUrl) {
          setPdfFilePath(blobUrl);
        } else {
          setPdfError("PDF file not found");
        }
      } catch (error) {
        console.error("Failed to load PDF file:", error);
        setPdfError("Failed to load PDF file");
      } finally {
        setIsPdfLoading(false);
      }
    };

    loadPdfFilePath();
  }, [document.file_path, hasPdfFile, libraryService.getPdfBlobUrl]);

  // Check processing status when document changes
  useEffect(() => {
    const checkProcessingStatus = async () => {
      if (document.doc_type !== "pdf") {
        setProcessingJob(null);
        return;
      }

      // no-op
      try {
        const job = await invoke<ProcessingJob | null>(
          "get_document_processing_status",
          {
            documentId: document.id,
          }
        );
        setProcessingJob(job);
      } catch (error) {
        console.error("Failed to check processing status:", error);
        setProcessingJob(null);
      } finally {
        // no-op
      }
    };

    checkProcessingStatus();
  }, [document.id, document.doc_type]);

  // Poll for processing status updates when job is active
  useEffect(() => {
    if (
      !processingJob ||
      processingJob.status === "completed" ||
      processingJob.status === "failed"
    ) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const updatedJob = await invoke<ProcessingJob | null>(
          "get_document_processing_status",
          {
            documentId: document.id,
          }
        );

        // Check if processing just completed
        if (processingJob && updatedJob) {
          if (
            processingJob.status !== "completed" &&
            updatedJob.status === "completed"
          ) {
            toast({
              title: "PDF Processing Complete",
              description: `"${document.title}" is now ready for text viewing. The markdown tab is now available.`,
            });
          }
        }

        setProcessingJob(updatedJob);

        // Stop polling if job is complete or failed
        if (
          !updatedJob ||
          updatedJob.status === "completed" ||
          updatedJob.status === "failed"
        ) {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Failed to poll processing status:", error);
        clearInterval(pollInterval);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [processingJob, document.id, document.title, toast]);

  // Switch to PDF view when markdown is disabled
  useEffect(() => {
    if (isMarkdownDisabled && viewMode === "markdown") {
      setViewMode("pdf");
    }
  }, [isMarkdownDisabled, viewMode]);

  // Cleanup blob URL when component unmounts or PDF changes
  useEffect(() => {
    return () => {
      if (pdfFilePath?.startsWith("blob:")) {
        URL.revokeObjectURL(pdfFilePath);
      }
    };
  }, [pdfFilePath]);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection?.toString().trim()) {
      const text = selection?.toString() || "";
      setSelectedText(text);
      onTextSelection?.(text);
    }
  }, [onTextSelection]);

  // 🔥 NEW: Chat about this document
  const handleChatAboutDocument = useCallback(() => {
    const documentRef: DocumentReference = {
      id: document.id,
      title: document.title,
      category_id: document.category_id,
      relevance_score: 1.0,
    };

    createConversationWithContext(
      `Chat about ${document.title}`,
      currentSessionId || undefined,
      [documentRef],
      "explanation"
    );

    setInitialChatText(`Let's discuss this document: @{${document.title}}`);
    setShowFloatingChat(true);
  }, [
    document,
    createConversationWithContext,
    currentSessionId,
    setInitialChatText,
    setShowFloatingChat,
  ]);

  // 🔥 NEW: Chat about selected text
  const handleChatAboutSelection = useCallback(() => {
    if (!selectedText.trim()) return;

    const documentRef: DocumentReference = {
      id: document.id,
      title: document.title,
      category_id: document.category_id,
      relevantSections: [selectedText],
      relevance_score: 1.0,
    };

    createConversationWithContext(
      `Chat about selection from ${document.title}`,
      currentSessionId || undefined,
      [documentRef],
      "explanation"
    );

    setInitialChatText(
      `I want to discuss this text from @{${document.title}}:\n\n"${selectedText}"\n\nCan you explain this in more detail?`
    );
    setShowFloatingChat(true);
  }, [
    selectedText,
    document,
    createConversationWithContext,
    currentSessionId,
    setInitialChatText,
    setShowFloatingChat,
  ]);

  // Memoize the callback functions to prevent PdfRenderer rerenders
  const onDocumentLoadSuccess = useCallback((numPages: number) => {
    console.log("PDF loaded with", numPages, "pages");
  }, []);

  const onDocumentLoadError = useCallback(
    (error: Error) => {
      console.error("PDF load error:", error);
      console.error("Failed to load PDF from path:", pdfFilePath);
      setPdfError("Failed to load PDF file");
      toast({
        title: "Error",
        description: "Failed to load PDF file",
        variant: "destructive",
      });
    },
    [pdfFilePath, toast]
  );

  // Keep a stable callback for markdown selection to avoid re-rendering the content area
  const externalOnTextSelectionRef = useRef(onTextSelection)
  useEffect(() => {
    externalOnTextSelectionRef.current = onTextSelection
  }, [onTextSelection])

  const handleMarkdownSelection = useCallback((text: string) => {
    if (!text.trim()) return
    setSelectedText(text)
    externalOnTextSelectionRef.current?.(text)
  }, [])

  const markdownElement = useMemo(() => {
    return (
      <ScrollArea className="flex-1 h-full">
        <div className="p-6">
          <MDXRenderer
            content={document.content}
            onTextSelection={handleMarkdownSelection}
          />
        </div>
      </ScrollArea>
    )
  }, [document.content, handleMarkdownSelection])

  // Memoize PdfView to prevent unnecessary rerenders
  const PdfView = useMemo(() => {
    if (!hasPdfFile || !document.file_path) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">PDF file not available</h3>
          <p className="text-muted-foreground text-center">
            The original PDF file for this document is not available. You can
            view the extracted text content in the Markdown tab.
          </p>
        </div>
      );
    }

    if (isPdfLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <h3 className="text-lg font-medium mb-2">Loading PDF...</h3>
          <p className="text-muted-foreground text-center">
            Please wait while we prepare the PDF for viewing.
          </p>
        </div>
      );
    }

    if (pdfError || !pdfFilePath) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">PDF file not available</h3>
          <p className="text-muted-foreground text-center mb-4">
            {pdfError || "The PDF file could not be loaded."}
            <br />
            You can view the extracted text content in the Markdown tab.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setViewMode("markdown");
            }}
          >
            View Text Content
          </Button>
        </div>
      );
    }

    return (
      <div onMouseUp={handleTextSelection} className="h-full w-full">
        <PdfRenderer
          fileUrl={pdfFilePath}
          className="h-full w-full"
          onDocumentLoadSuccess={onDocumentLoadSuccess}
          onError={onDocumentLoadError}
        />
      </div>
    );
  }, [
    hasPdfFile,
    document.file_path,
    isPdfLoading,
    pdfError,
    pdfFilePath,
    onDocumentLoadSuccess,
    onDocumentLoadError,
    handleTextSelection,
  ]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Document Info Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{document.title}</span>
          <Badge variant="secondary" className="text-xs">
            {document.doc_type}
          </Badge>
          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
            {document.content.length.toLocaleString()} chars
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {selectedText && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleChatAboutSelection}
              className="h-8 text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Chat about selection
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleChatAboutDocument}
            className="h-8 text-xs"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Chat about this
          </Button>
        </div>
      </div>

      {/* View Mode Tabs - Only show if PDF is available */}
      {hasPdfFile ? (
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ViewMode)}
          className="flex flex-col h-full"
        >
          <div className="border-b">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger
                value="markdown"
                className="flex items-center gap-2"
                disabled={isMarkdownDisabled}
              >
                {isMarkdownDisabled ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Code className="h-4 w-4" />
                )}
                {isMarkdownDisabled ? "Processing..." : "Markdown"}
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                PDF
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="markdown" className="flex-1 h-0 m-0">
            {isMarkdownDisabled ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <Clock className="h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
                <h3 className="text-lg font-medium mb-2">Processing PDF...</h3>
                <p className="text-muted-foreground text-center mb-4">
                  The PDF content is being processed in the background. You can
                  view the PDF while we extract the text content.
                </p>
                {processingJob && (
                  <div className="w-64">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{processingJob.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${processingJob.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              markdownElement
            )}
          </TabsContent>

          <TabsContent value="pdf" className="flex-1 m-0">
            {PdfView}
          </TabsContent>
        </Tabs>
      ) : (
        // Just show markdown view if no PDF available
        markdownElement
      )}
    </div>
  );
}
