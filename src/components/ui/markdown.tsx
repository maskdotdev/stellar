import { cn } from "@/lib/utils/utils";
import { marked } from "marked";
import { memo, type ReactNode, useId, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { CodeBlock, CodeBlockCode } from "./code-block";

export type MarkdownProps = {
  children: string;
  id?: string;
  className?: string;
  components?: Partial<Components>;
};

function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // Convert to unsigned 32-bit and then base36 to keep it short
  return (hash >>> 0).toString(36);
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw).filter((token) => token.trim().length > 0);
}

function extractLanguage(className?: string): string {
  if (!className) return "plaintext";
  const match = className.match(/language-([\w-]+)/);
  return match ? match[1] : "plaintext";
}

function stringifyNodeChildren(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(stringifyNodeChildren).join("");
  return "";
}

const INITIAL_COMPONENTS: Partial<Components> = {
  h1: function Heading1Component({ children, className, ...props }) {
    return (
      <h1
        className={cn(
          "mt-2 mb-4 text-3xl font-bold tracking-tight text-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </h1>
    );
  },
  h2: function Heading2Component({ children, className, ...props }) {
    return (
      <h2
        className={cn(
          "mt-7 mb-3 border-b border-border/70 pb-2 text-2xl font-semibold tracking-tight text-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </h2>
    );
  },
  h3: function Heading3Component({ children, className, ...props }) {
    return (
      <h3
        className={cn("mt-6 mb-3 text-xl font-semibold text-foreground", className)}
        {...props}
      >
        {children}
      </h3>
    );
  },
  h4: function Heading4Component({ children, className, ...props }) {
    return (
      <h4
        className={cn("mt-5 mb-2 text-lg font-semibold text-foreground", className)}
        {...props}
      >
        {children}
      </h4>
    );
  },
  p: function ParagraphComponent({ children, className, ...props }) {
    return (
      <p
        className={cn(
          "mb-4 last:mb-0 text-[0.97rem] leading-7 text-foreground/95",
          className,
        )}
        {...props}
      >
        {children}
      </p>
    );
  },
  ul: function UnorderedListComponent({ children, className, ...props }) {
    return (
      <ul
        className={cn("my-4 list-disc space-y-2 pl-6 marker:text-primary", className)}
        {...props}
      >
        {children}
      </ul>
    );
  },
  ol: function OrderedListComponent({ children, className, ...props }) {
    return (
      <ol
        className={cn("my-4 list-decimal space-y-2 pl-6 marker:text-primary", className)}
        {...props}
      >
        {children}
      </ol>
    );
  },
  li: function ListItemComponent({ children, className, ...props }) {
    return (
      <li className={cn("pl-1 leading-7 text-foreground/95", className)} {...props}>
        {children}
      </li>
    );
  },
  a: function AnchorComponent({ children, className, ...props }) {
    return (
      <a
        className={cn(
          "font-medium text-primary underline decoration-primary/50 underline-offset-4 transition-colors hover:text-primary/80",
          className,
        )}
        target="_blank"
        rel="noreferrer noopener"
        {...props}
      >
        {children}
      </a>
    );
  },
  strong: function StrongComponent({ children, className, ...props }) {
    return (
      <strong className={cn("font-semibold text-foreground", className)} {...props}>
        {children}
      </strong>
    );
  },
  em: function EmphasisComponent({ children, className, ...props }) {
    return (
      <em className={cn("text-foreground/90", className)} {...props}>
        {children}
      </em>
    );
  },
  blockquote: function BlockquoteComponent({ children, className, ...props }) {
    return (
      <blockquote
        className={cn(
          "my-5 border-l-4 border-primary/40 bg-primary/5 px-4 py-3 italic text-foreground/90",
          className,
        )}
        {...props}
      >
        {children}
      </blockquote>
    );
  },
  hr: function HrComponent({ className, ...props }) {
    return <hr className={cn("my-8 border-border/70", className)} {...props} />;
  },
  code: function CodeComponent({ className, children, ...props }) {
    const code = stringifyNodeChildren(children);
    const explicitInline = (props as { inline?: boolean }).inline;
    const inline = explicitInline ?? !code.includes("\n");

    if (inline) {
      return (
        <span
          className={cn(
            "rounded-md border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </span>
      );
    }

    const language = extractLanguage(className);

    return (
      <CodeBlock className={className}>
        <CodeBlockCode code={code} language={language} />
      </CodeBlock>
    );
  },
  pre: function PreComponent({ children }) {
    return <>{children}</>;
  },
  table: function TableComponent({ children, className, ...props }) {
    return (
      <div className="my-6 overflow-x-auto rounded-xl border border-border/80">
        <table className={cn("min-w-full border-collapse text-sm", className)} {...props}>
          {children}
        </table>
      </div>
    );
  },
  thead: function THeadComponent({ children, className, ...props }) {
    return (
      <thead className={cn("bg-muted/60", className)} {...props}>
        {children}
      </thead>
    );
  },
  th: function THComponent({ children, className, ...props }) {
    return (
      <th
        className={cn(
          "border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground/85",
          className,
        )}
        {...props}
      >
        {children}
      </th>
    );
  },
  td: function TDComponent({ children, className, ...props }) {
    return (
      <td className={cn("border-t border-border/70 px-3 py-2 align-top", className)} {...props}>
        {children}
      </td>
    );
  },
  img: function ImageComponent({ className, alt, ...props }) {
    return (
      <img
        className={cn(
          "my-5 max-w-full rounded-xl border border-border/60 shadow-sm",
          className,
        )}
        alt={alt || "Markdown image"}
        loading="lazy"
        {...props}
      />
    );
  },
};

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components = INITIAL_COMPONENTS,
  }: {
    content: string;
    components?: Partial<Components>;
  }) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    );
  },
  function propsAreEqual(prevProps, nextProps) {
    return prevProps.content === nextProps.content;
  },
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

function MarkdownComponent({
  children,
  id,
  className,
  components = {},
}: MarkdownProps) {
  const generatedId = useId();
  const blockId = id ?? generatedId;
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children]);
  const mergedComponents = useMemo(
    () => ({ ...INITIAL_COMPONENTS, ...components }),
    [components],
  );

  return (
    <div className={cn("max-w-none space-y-1 leading-relaxed", className)}>
      {blocks.map((block) => (
        <MemoizedMarkdownBlock
          key={`${blockId}-block-${hashString(block)}`}
          content={block}
          components={mergedComponents}
        />
      ))}
    </div>
  );
}

const Markdown = memo(MarkdownComponent);
Markdown.displayName = "Markdown";

export { Markdown };
