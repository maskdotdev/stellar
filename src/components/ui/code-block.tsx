import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/utils";
import { codeToHtml } from "shiki";

export type CodeBlockProps = {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose flex w-full flex-col overflow-clip border p-2",
        "border-border bg-card text-card-foreground rounded-xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CodeBlockCodeProps = {
  code: string;
  language?: string;
  theme?: string;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlockCode({
  code,
  language = "tsx",
  theme = "github-light",
  className,
  ...props
}: CodeBlockCodeProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function highlight() {
      if (!code) {
        setHighlightedHtml("<pre><code></code></pre>");
        return;
      }

      const html = await codeToHtml(code, { lang: language, theme });
      setHighlightedHtml(html);
    }
    highlight();
  }, [code, language, theme]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (highlightedHtml) {
      containerRef.current.innerHTML = highlightedHtml;
    } else {
      containerRef.current.innerHTML = "";
    }
  }, [highlightedHtml]);

  const classNames = cn(
    "relative w-full overflow-x-auto text-[13px] [&>pre]:px-4 [&>pre]:py-4 [&>pre]:pr-12",
    className,
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // no-op
    }
  }

  // SSR fallback: render plain code if not hydrated yet
  return highlightedHtml ? (
    <div className={classNames} {...props}>
      <div ref={containerRef} />
      <div className="absolute right-2 top-2">
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
  ) : (
    <div className={classNames} {...props}>
      <pre>
        <code>{code}</code>
      </pre>
      <div className="absolute right-2 top-2">
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
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>;

function CodeBlockGroup({
  children,
  className,
  ...props
}: CodeBlockGroupProps) {
  return (
    <div
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock };
