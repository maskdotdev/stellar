"use client";

import { ControlledEditor } from "@/components/editor/ControlledEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useActionsStore } from "@/lib/services/actions-service";
import type { Document } from "@/lib/services/library-service";
import { LibraryService } from "@/lib/services/library-service";
import { type DocumentReference, useAIStore } from "@/lib/stores/ai-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useStudyStore } from "@/lib/stores/study-store";
import { cn } from "@/lib/utils/utils";
import { invoke } from "@tauri-apps/api/core";
import {
  Clock,
  Code,
  Edit,
  Eye,
  FileText,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { PdfRenderer } from "../../pdf-renderer";

// Renders trusted HTML content (generated within the app) without using dangerouslySetInnerHTML inline
// (Removed legacy TrustedHtmlContent; we now render via ControlledEditor)

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
  onTextSelection?: (text: string, info?: { page?: number }) => void;
}

type ViewMode = "markdown" | "pdf";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

type RendererFontSize = "small" | "medium" | "large" | "xlarge" | "xxlarge";

const TOC_HEADING_SELECTOR = "h1, h2, h3, h4";
const FONT_SIZE_ORDER: RendererFontSize[] = [
  "small",
  "medium",
  "large",
  "xlarge",
  "xxlarge",
];
const FONT_SIZE_LABELS: Record<RendererFontSize, string> = {
  small: "A-",
  medium: "A",
  large: "A+",
  xlarge: "A++",
  xxlarge: "A+++",
};
const FONT_SIZE_VARS: Record<
  RendererFontSize,
  {
    p: string;
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    note: string;
  }
> = {
  small: {
    p: "0.9rem",
    h1: "1.7rem",
    h2: "1.35rem",
    h3: "1.15rem",
    h4: "1.02rem",
    note: "0.93rem",
  },
  medium: {
    p: "0.97rem",
    h1: "1.875rem",
    h2: "1.5rem",
    h3: "1.25rem",
    h4: "1.125rem",
    note: "1rem",
  },
  large: {
    p: "1.08rem",
    h1: "2.1rem",
    h2: "1.75rem",
    h3: "1.4rem",
    h4: "1.2rem",
    note: "1.1rem",
  },
  xlarge: {
    p: "1.2rem",
    h1: "2.35rem",
    h2: "1.95rem",
    h3: "1.55rem",
    h4: "1.35rem",
    note: "1.22rem",
  },
  xxlarge: {
    p: "1.32rem",
    h1: "2.6rem",
    h2: "2.15rem",
    h3: "1.7rem",
    h4: "1.5rem",
    note: "1.34rem",
  },
};

function slugifyHeading(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "section";
}

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
  const { setShowFloatingChat, setInitialChatText, setEditingNoteId, setCurrentView } = useStudyStore();
  const rendererFontSize = useSettingsStore((state) => state.display.fontSize);
  const setRendererFontSize = useSettingsStore((state) => state.setFontSize);
  const { createConversationWithContext } = useAIStore();
  const { currentSessionId } = useActionsStore();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const markdownContentRef = useRef<HTMLDivElement>(null);
  const markdownScrollAreaRef = useRef<HTMLDivElement>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeTocId, setActiveTocId] = useState<string>("");

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

      // Try to detect the page number by walking up the DOM from the selection anchor
      let pageNumber: number | undefined = undefined;
      const anchorNode = selection.anchorNode as Node | null;
      const baseEl = anchorNode && (anchorNode.nodeType === Node.ELEMENT_NODE ? (anchorNode as Element) : (anchorNode as ChildNode)?.parentElement as Element | null);
      const findPageEl = (start: Element | null): Element | null => {
        let el: Element | null = start;
        while (el) {
          // Common attributes/classes in @react-pdf-viewer/PDF.js DOM
          if (el.getAttribute?.('data-page-number')) return el;
          if (el.classList && (el.classList.contains('rpv-core__page-layer') || el.classList.contains('rpv-core__page'))) return el;
          el = el.parentElement;
        }
        return null;
      };
      const pageEl = findPageEl(baseEl || null);
      if (pageEl) {
        const attr = pageEl.getAttribute('data-page-number');
        if (attr) {
          const n = Number.parseInt(attr, 10);
          if (!Number.isNaN(n)) pageNumber = n;
        }
        if (pageNumber === undefined) {
          // Attempt to parse from aria-label like "Page 3"
          const aria = pageEl.getAttribute('aria-label') || '';
          const m = aria.match(/Page\s+(\d+)/i);
          if (m) pageNumber = Number.parseInt(m[1], 10);
        }
      }

      setSelectedText(text);
      onTextSelection?.(text, { page: pageNumber });
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

  // Jump to pending location after opening the document
  useEffect(() => {
    // Only for PDFs
    if (!hasPdfFile) return;
    let cancelled = false;
    const { pendingJump, setPendingJump } = useStudyStore.getState();
    if (pendingJump && pendingJump.documentId === document.id) {
      // Ensure PDF path is ready
      const tryJump = () => {
        if (cancelled) return;
        // Prefer page jump via DOM
        if (pendingJump.page != null) {
          const pageSelector = `div[data-page-number="${pendingJump.page}"]`;
          const pageNode = containerRef.current?.querySelector?.(pageSelector);
          if (pageNode) {
            (pageNode as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        // Optionally, we could trigger a text search here in the future using search plugin
        setPendingJump(null);
      };

      // Delay slightly to allow viewer to render pages
      const t = setTimeout(tryJump, 300);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
  }, [document.id, hasPdfFile]);

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

  // Selection is handled directly from content containers onMouseUp

  const markdownContent = useMemo(() => {
    const content = document.content || "";
    if (document.doc_type !== "markdown") {
      return content;
    }

    // Legacy support: previous text import wrapped markdown into HTML paragraphs.
    if (/<\/?(p|br)\b/i.test(content)) {
      let normalized = content
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
        .replace(/<p[^>]*>/gi, "")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      normalized = normalized.replace(/\n{3,}/g, "\n\n").trim();
      return normalized;
    }

    return content;
  }, [document.content, document.doc_type]);

  const handleTocItemClick = useCallback((id: string) => {
    const headingEl = globalThis.document?.getElementById(id);
    if (!headingEl) return;

    headingEl.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTocId(id);
  }, []);

  useEffect(() => {
    const shouldShowMarkdown =
      document.doc_type !== "note" && (!hasPdfFile || viewMode === "markdown");

    if (!shouldShowMarkdown) {
      setTocItems([]);
      setActiveTocId("");
      return;
    }

    let cleanupScrollHandlers: (() => void) | undefined;
    const rafId = window.requestAnimationFrame(() => {
      const contentRoot = markdownContentRef.current;
      const scrollViewportRoot = markdownScrollAreaRef.current;
      const scrollViewport =
        scrollViewportRoot?.querySelector<HTMLElement>(
          "[data-radix-scroll-area-viewport]"
        ) ?? scrollViewportRoot;

      if (!contentRoot || !scrollViewport) {
        setTocItems([]);
        setActiveTocId("");
        return;
      }

      const headingElements = Array.from(
        contentRoot.querySelectorAll<HTMLHeadingElement>(TOC_HEADING_SELECTOR)
      );
      const slugCounts = new Map<string, number>();
      const nextTocItems: TocItem[] = [];

      for (const headingEl of headingElements) {
        const text = headingEl.textContent?.trim() || "";
        if (!text) continue;

        const baseId = slugifyHeading(text);
        const count = (slugCounts.get(baseId) ?? 0) + 1;
        slugCounts.set(baseId, count);

        const id = count === 1 ? baseId : `${baseId}-${count}`;
        headingEl.id = id;

        const rawLevel = Number.parseInt(headingEl.tagName.slice(1), 10);
        const level = Number.isNaN(rawLevel) ? 4 : Math.min(Math.max(rawLevel, 1), 4);
        nextTocItems.push({ id, text, level });
      }

      setTocItems(nextTocItems);

      if (nextTocItems.length === 0) {
        setActiveTocId("");
        return;
      }

      const updateActiveHeading = () => {
        const rootTop = scrollViewport.getBoundingClientRect().top;
        let currentActiveId = nextTocItems[0].id;

        for (const headingEl of headingElements) {
          const headingTop = headingEl.getBoundingClientRect().top - rootTop;
          if (headingTop <= 120) {
            currentActiveId = headingEl.id;
            continue;
          }
          break;
        }

        setActiveTocId((prev) =>
          prev === currentActiveId ? prev : currentActiveId
        );
      };

      updateActiveHeading();
      scrollViewport.addEventListener("scroll", updateActiveHeading, {
        passive: true,
      });
      window.addEventListener("resize", updateActiveHeading);

      cleanupScrollHandlers = () => {
        scrollViewport.removeEventListener("scroll", updateActiveHeading);
        window.removeEventListener("resize", updateActiveHeading);
      };
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      cleanupScrollHandlers?.();
    };
  }, [document.doc_type, hasPdfFile, markdownContent, viewMode]);

  const markdownFontStyle = useMemo<CSSProperties>(() => {
    const preset = FONT_SIZE_VARS[rendererFontSize];
    return {
      "--md-p-size": preset.p,
      "--md-h1-size": preset.h1,
      "--md-h2-size": preset.h2,
      "--md-h3-size": preset.h3,
      "--md-h4-size": preset.h4,
    } as CSSProperties;
  }, [rendererFontSize]);

  const adjustRendererFontSize = useCallback(
    (direction: -1 | 1) => {
      const currentIndex = FONT_SIZE_ORDER.indexOf(rendererFontSize);
      if (currentIndex < 0) return;
      const nextIndex = Math.min(
        FONT_SIZE_ORDER.length - 1,
        Math.max(0, currentIndex + direction)
      );
      if (nextIndex === currentIndex) return;
      setRendererFontSize(FONT_SIZE_ORDER[nextIndex]);
    },
    [rendererFontSize, setRendererFontSize]
  );

  const isFontSizeDecreaseDisabled = rendererFontSize === "small";
  const isFontSizeIncreaseDisabled = rendererFontSize === "xxlarge";

  const shouldShowFontSizeControl =
    document.doc_type === "note" || !hasPdfFile || viewMode === "markdown";

  const noteEditorElement = useMemo(() => {
    return (
      <ScrollArea className="flex-1 h-full">
        <div className="p-6" style={{ fontSize: FONT_SIZE_VARS[rendererFontSize].note }}>
          <div
            onMouseUp={() => {
              const text = window.getSelection()?.toString() || ""
              if (text.trim()) {
                setSelectedText(text)
                externalOnTextSelectionRef.current?.(text)
              }
            }}
          >
            <ControlledEditor
              content={document.content}
              editable={false}
              minimal
              className="border-0 bg-transparent shadow-none"
              placeholder=""
            />
          </div>
        </div>
      </ScrollArea>
    )
  }, [document.content, rendererFontSize])

  const markdownElement = useMemo(() => {
    const hasToc = tocItems.length > 0;

    return (
      <div className="relative h-full">
        <div ref={markdownScrollAreaRef} className="h-full">
          <ScrollArea className="flex-1 h-full">
            <div className="p-6">
              <div
                ref={markdownContentRef}
                className="mx-auto w-full max-w-3xl"
                style={markdownFontStyle}
                onMouseUp={() => {
                  const text = window.getSelection()?.toString() || ""
                  if (text.trim()) {
                    setSelectedText(text)
                    externalOnTextSelectionRef.current?.(text)
                  }
                }}
              >
                <Markdown className="w-full">
                  {markdownContent}
                </Markdown>
              </div>
            </div>
          </ScrollArea>
        </div>
        {hasToc && (
          <aside className="pointer-events-none absolute left-3 top-3 z-20 hidden max-h-[calc(100%-1.5rem)] w-48 xl:block">
            <div className="pointer-events-auto rounded-md border border-border/50 bg-background/80 p-2 shadow-sm backdrop-blur-sm">
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/90">
                Contents
              </p>
              <div className="max-h-[calc(100vh-15rem)] overflow-y-auto">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTocItemClick(item.id)}
                    aria-current={item.id === activeTocId ? "location" : undefined}
                    style={{ paddingLeft: `${(item.level - 1) * 10 + 6}px` }}
                    className={cn(
                      "mb-0.5 block w-full rounded px-2 py-1 text-left text-xs leading-snug transition-colors",
                      item.id === activeTocId
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    );
  }, [tocItems, activeTocId, handleTocItemClick, markdownContent, markdownFontStyle]);

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
      <div onMouseUp={handleTextSelection} className="h-full w-full" ref={containerRef}>
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
          {shouldShowFontSizeControl && (
            <div className="flex items-center rounded-md border border-border/70 bg-background/60 p-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={isFontSizeDecreaseDisabled}
                onClick={() => adjustRendererFontSize(-1)}
                aria-label="Decrease font size"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="min-w-7 px-1 text-center text-[11px] font-medium text-muted-foreground">
                {FONT_SIZE_LABELS[rendererFontSize]}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={isFontSizeIncreaseDisabled}
                onClick={() => adjustRendererFontSize(1)}
                aria-label="Increase font size"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          {document.doc_type === "note" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingNoteId(document.id)
                setCurrentView("note-editor")
              }}
              className="h-8 text-xs"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
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
              document.doc_type === "note" ? noteEditorElement : markdownElement
            )}
          </TabsContent>

          <TabsContent value="pdf" className="flex-1 m-0">
            {PdfView}
          </TabsContent>
        </Tabs>
      ) : (
        document.doc_type === "note" ? noteEditorElement : markdownElement
      )}
    </div>
  );
}
