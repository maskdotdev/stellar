"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Note: We avoid using the shared useTextSelection hook here to prevent
// component re-renders that can collapse the native browser selection.
import { cn } from "@/lib/utils/utils";
import { AlertCircle, AlertTriangle, Check, CheckCircle, Copy, Info } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// Import highlight.js CSS for syntax highlighting
import "highlight.js/styles/github.css";
// Import katex CSS for math rendering
import "katex/dist/katex.min.css";

// Custom components that can be used in MDX
const customComponents = {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  AlertDescription,
  AlertTitle,

  // Custom alert components
  InfoAlert: ({
    title,
    children,
  }: {
    title?: string;
    children: React.ReactNode;
  }) => (
    <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
      <Info className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  ),

  WarningAlert: ({
    title,
    children,
  }: {
    title?: string;
    children: React.ReactNode;
  }) => (
    <Alert className="mb-4 border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
      <AlertTriangle className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  ),

  ErrorAlert: ({
    title,
    children,
  }: {
    title?: string;
    children: React.ReactNode;
  }) => (
    <Alert className="mb-4 border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      <AlertCircle className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  ),

  SuccessAlert: ({
    title,
    children,
  }: {
    title?: string;
    children: React.ReactNode;
  }) => (
    <Alert className="mb-4 border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
      <CheckCircle className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  ),
};

// React-markdown components mapping
const markdownComponents = {
  // Headings
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="scroll-m-20 text-3xl font-bold tracking-tight mt-8 mb-4 first:mt-0"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="scroll-m-20 text-2xl font-semibold tracking-tight mt-6 mb-3 first:mt-0"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className="scroll-m-20 text-xl font-semibold tracking-tight mt-5 mb-2 first:mt-0"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4
      className="scroll-m-20 text-lg font-semibold tracking-tight mt-4 mb-2 first:mt-0"
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h5
      className="scroll-m-20 text-base font-semibold tracking-tight mt-3 mb-1 first:mt-0"
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h6
      className="scroll-m-20 text-sm font-semibold tracking-tight mt-3 mb-1 first:mt-0"
      {...props}
    >
      {children}
    </h6>
  ),

  // Paragraphs
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="leading-7 mb-4" {...props}>
      {children}
    </p>
  ),

  // Lists
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-4 ml-6 list-disc [&>li]:mt-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-4 ml-6 list-decimal [&>li]:mt-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="mb-1" {...props}>
      {children}
    </li>
  ),

  // Links
  a: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      className="font-medium text-primary underline underline-offset-4 hover:no-underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  ),

  // Code
  code: ({
    children,
    className,
    ...props
  }: React.HTMLAttributes<HTMLElement>) => {
    const isInline = !className?.includes("language-");

    if (isInline) {
      return (
        <code
          className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <code className={cn("font-mono text-sm", className)} {...props}>
        {children}
      </code>
    );
  },

  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => {
    const preRef = useRef<HTMLPreElement>(null);
    const [copied, setCopied] = useState(false);
    async function handleCopy() {
      try {
        const text =
          preRef.current?.querySelector("code")?.textContent ??
          preRef.current?.innerText ??
          "";
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      } catch {
        // no-op
      }
    }
    return (
      <div className="relative p-2 rounded-lg border border-border bg-card text-card-foreground">
        <pre
          ref={preRef}
          className="mb-2 mt-2 overflow-x-auto rounded-lg bg-muted p-4 pr-12"
          {...props}
        >
          {children}
        </pre>
        <div className="absolute right-3 top-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={copied ? "Copied" : "Copy code"}
            className="h-7 px-2 text-xs"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="mr-1 h-3.5 w-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy
              </>
            )}
          </Button>
        </div>
      </div>
    );
  },

  // Blockquotes
  blockquote: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="mt-4 border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Tables
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-4 w-full overflow-y-auto">
      <table className="w-full border-collapse border border-border" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-muted/50" {...props}>
      {children}
    </thead>
  ),
  tbody: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="border-b border-border hover:bg-muted/50" {...props}>
      {children}
    </tr>
  ),
  th: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLTableHeaderCellElement>) => (
    <th
      className="border border-border px-4 py-2 text-left font-bold"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLTableDataCellElement>) => (
    <td className="border border-border px-4 py-2" {...props}>
      {children}
    </td>
  ),

  // Horizontal rule
  hr: ({ ...props }: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-4 border-t border-border" {...props} />
  ),

  // Strong and emphasis
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),

  // Merge custom components
  ...customComponents,
};

interface MDXRendererProps {
  content: string;
  className?: string;
  onTextSelection?: (selectedText: string, range: Range) => void;
  enableTextSelection?: boolean;
  // Deprecated: Use onTextSelection instead
  onMouseUp?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function MDXRenderer({
  content,
  className,
  onTextSelection,
  enableTextSelection = true,
  onMouseUp,
}: MDXRendererProps) {
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lightweight selection listener to avoid re-renders on selection changes
  useEffect(() => {
    if (!enableTextSelection || !onTextSelection) return;

    let timeoutId: number | null = null;

    const isSelectionWithinContainer = (selection: Selection): boolean => {
      if (!containerRef.current || selection.rangeCount === 0) return true;
      const range = selection.getRangeAt(0);
      const container = containerRef.current;
      return container.contains(range.commonAncestorContainer);
    };

    const handleSelectionChange = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        if (!isSelectionWithinContainer(selection)) return;
        const range = selection.getRangeAt(0);
        const text = range.toString().trim();
        if (!text) return;
        onTextSelection(text, range.cloneRange());
      }, 150);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [enableTextSelection, onTextSelection]);

  // Check if content contains JSX-like syntax for advanced features
  const hasJSX = useMemo(() => {
    return isMDXContent(content);
  }, [content]);

  const processedContent = useMemo(() => {
    if (!hasJSX) {
      return content;
    }

    // For JSX content, we need to process it more carefully
    try {
      // Basic JSX processing - replace component tags with markdown equivalents
      let processed = content;

      // Handle InfoAlert, WarningAlert, ErrorAlert, SuccessAlert
      processed = processed.replace(
        /<(Info|Warning|Error|Success)Alert(?:\s+title="([^"]*)")?>([\s\S]*?)<\/\1Alert>/g,
        (_, type, title, content) => {
          const icon =
            type === "Info"
              ? "ℹ️"
              : type === "Warning"
                ? "⚠️"
                : type === "Error"
                  ? "❌"
                  : "✅";
          return `\n> ${icon} **${title || type}**\n>\n> ${content.trim()}\n\n`;
        }
      );

      // Handle Button components
      processed = processed.replace(
        /<Button(?:\s+[^>]*)?>([^<]*)<\/Button>/g,
        "`$1`"
      );

      // Handle Card components
      processed = processed.replace(
        /<Card>([\s\S]*?)<\/Card>/g,
        "\n---\n$1\n---\n"
      );

      return processed;
    } catch (err) {
      setError("Error processing JSX content");
      return content;
    }
  }, [content, hasJSX]);

  if (error) {
    return (
      <div
        className={cn(
          "prose prose-neutral dark:prose-invert max-w-4xl mx-auto leading-relaxed",
          className
        )}
      >
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <strong>Rendering Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "prose prose-neutral dark:prose-invert max-w-4xl mx-auto leading-relaxed",
        className
      )}
      {...(!enableTextSelection && onMouseUp ? { onMouseUp } : {})}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeHighlight,
          rehypeSlug,
          rehypeKatex,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
        ]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

// Helper function to check if content is likely MDX (contains JSX-like syntax)
export function isMDXContent(content: string): boolean {
  // Check for JSX-like patterns
  const jsxPattern = /<[A-Z][^>]*>/;
  const importPattern = /^import\s+/m;
  const exportPattern = /^export\s+/m;

  return (
    jsxPattern.test(content) ||
    importPattern.test(content) ||
    exportPattern.test(content)
  );
}

// Fallback markdown renderer for simple cases
export function SimpleMarkdownRenderer({
  content,
  className,
  onTextSelection,
  enableTextSelection = true,
  onMouseUp,
}: MDXRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Minimal selection listener similar to MDXRenderer to avoid re-renders
  useEffect(() => {
    if (!enableTextSelection || !onTextSelection) return;
    let timeoutId: number | null = null;
    const isSelectionWithinContainer = (selection: Selection): boolean => {
      if (!containerRef.current || selection.rangeCount === 0) return true;
      const range = selection.getRangeAt(0);
      const container = containerRef.current;
      return container.contains(range.commonAncestorContainer);
    };
    const handleSelectionChange = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        if (!isSelectionWithinContainer(selection)) return;
        const range = selection.getRangeAt(0);
        const text = range.toString().trim();
        if (!text) return;
        onTextSelection(text, range.cloneRange());
      }, 150);
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [enableTextSelection, onTextSelection]);
  const htmlContent = useMemo(() => {
    return content
      .replace(
        /^# (.*$)/gim,
        '<h1 class="scroll-m-20 text-3xl font-bold tracking-tight mt-8 mb-4 first:mt-0">$1</h1>'
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 class="scroll-m-20 text-2xl font-semibold tracking-tight mt-6 mb-3 first:mt-0">$1</h2>'
      )
      .replace(
        /^### (.*$)/gim,
        '<h3 class="scroll-m-20 text-xl font-semibold tracking-tight mt-5 mb-2 first:mt-0">$1</h3>'
      )
      .replace(
        /^#### (.*$)/gim,
        '<h4 class="scroll-m-20 text-lg font-semibold tracking-tight mt-4 mb-2 first:mt-0">$1</h4>'
      )
      .replace(/^\* (.*$)/gim, '<li class="mb-1">$1</li>')
      .replace(/^\- (.*$)/gim, '<li class="mb-1">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="mb-1 list-decimal">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(
        /`(.*?)`/g,
        '<code class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">$1</code>'
      )
      .replace(
        /```([\s\S]*?)```/g,
        '<pre class="mb-4 mt-4 overflow-x-auto rounded-lg bg-muted p-4"><code class="font-mono text-sm">$1</code></pre>'
      )
      .replace(/\n\n/g, '</p><p class="leading-7 mb-4">')
      .replace(/\n/g, "<br/>");
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "prose prose-neutral dark:prose-invert max-w-none leading-relaxed",
        className
      )}
      {...(!enableTextSelection && onMouseUp ? { onMouseUp } : {})}
      dangerouslySetInnerHTML={{
        __html: `<p class="leading-7 mb-4">${htmlContent}</p>`,
      }}
    />
  );
}
