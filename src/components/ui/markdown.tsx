import { cn } from "@/lib/utils/utils";
import { marked } from "marked";
import { memo, type ReactNode, useEffect, useId, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CodeBlock, CodeBlockCode } from "./code-block";
import "katex/dist/katex.min.css";

export type MarkdownProps = {
  children: string;
  id?: string;
  className?: string;
  components?: Partial<Components>;
};

const LATEXIT_TAG_PATTERN = /<latexit\b[^>]*>([\s\S]*?)<\/latexit>/gi;
const LATEXIT_TAG_DETECTOR = /<latexit\b[^>]*>[\s\S]*?<\/latexit>/i;
const CITATION_PATTERN = /(^\[\^[^\]]+\]:)|(\[\^[^\]]+\])|(^\[[^\]]+\]:\s+\S+)/m;
const EXTERNAL_LINK_PATTERN = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

function shouldRenderAsSingleDocument(markdown: string): boolean {
  return CITATION_PATTERN.test(markdown);
}

function decodeAscii(bytes: Uint8Array, offset: number, length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(bytes[offset + i] ?? 0);
  }
  return result;
}

function decodeUtf16BE(bytes: Uint8Array, offset: number, byteLength: number): string {
  let result = "";
  const end = offset + byteLength;
  for (let i = offset; i + 1 < end; i += 2) {
    const codePoint = (bytes[i] << 8) | bytes[i + 1];
    result += String.fromCharCode(codePoint);
  }
  return result;
}

function readBigEndianUInt(bytes: Uint8Array, offset: number, byteLength: number): number {
  if (offset < 0 || byteLength < 0 || offset + byteLength > bytes.length) {
    return Number.NaN;
  }
  let value = 0;
  for (let i = 0; i < byteLength; i++) {
    value = value * 256 + bytes[offset + i];
  }
  return value;
}

function decodeBase64ToBytes(base64: string): Uint8Array | null {
  const normalized = base64.replace(/\s+/g, "");
  if (!normalized) return null;
  try {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) & 0xff;
    }
    return bytes;
  } catch {
    return null;
  }
}

function parseBinaryPlist(bytes: Uint8Array): unknown {
  if (bytes.length < 40) return null;
  if (decodeAscii(bytes, 0, 8) !== "bplist00") return null;

  const trailerOffset = bytes.length - 32;
  const offsetIntSize = bytes[trailerOffset + 6];
  const objectRefSize = bytes[trailerOffset + 7];
  const objectCount = readBigEndianUInt(bytes, trailerOffset + 8, 8);
  const topObject = readBigEndianUInt(bytes, trailerOffset + 16, 8);
  const offsetTableOffset = readBigEndianUInt(bytes, trailerOffset + 24, 8);

  if (
    !Number.isFinite(objectCount) ||
    !Number.isFinite(topObject) ||
    !Number.isFinite(offsetTableOffset) ||
    !Number.isInteger(objectCount) ||
    !Number.isInteger(topObject) ||
    !Number.isInteger(offsetTableOffset) ||
    offsetIntSize <= 0 ||
    objectRefSize <= 0
  ) {
    return null;
  }

  const offsetTableEnd = offsetTableOffset + objectCount * offsetIntSize;
  if (offsetTableOffset < 0 || offsetTableEnd > trailerOffset) return null;

  const objectOffsets: number[] = new Array(objectCount);
  for (let i = 0; i < objectCount; i++) {
    const entryOffset = offsetTableOffset + i * offsetIntSize;
    const objectOffset = readBigEndianUInt(bytes, entryOffset, offsetIntSize);
    if (
      !Number.isFinite(objectOffset) ||
      !Number.isInteger(objectOffset) ||
      objectOffset < 0 ||
      objectOffset >= bytes.length
    ) {
      return null;
    }
    objectOffsets[i] = objectOffset;
  }

  const cache = new Map<number, unknown>();
  const inProgress = new Set<number>();

  const readLength = (
    info: number,
    lengthObjectOffset: number,
  ): { length: number; lengthBytes: number } | null => {
    if (info < 0x0f) return { length: info, lengthBytes: 0 };

    if (lengthObjectOffset >= bytes.length) return null;
    const marker = bytes[lengthObjectOffset];
    const markerType = marker >> 4;
    const markerInfo = marker & 0x0f;
    if (markerType !== 0x1) return null;

    const intByteLength = 1 << markerInfo;
    if (intByteLength <= 0 || intByteLength > 8) return null;

    const intStart = lengthObjectOffset + 1;
    const length = readBigEndianUInt(bytes, intStart, intByteLength);
    if (!Number.isFinite(length) || !Number.isInteger(length) || length < 0) return null;

    return { length, lengthBytes: 1 + intByteLength };
  };

  const readObject = (objectIndex: number): unknown => {
    if (!Number.isInteger(objectIndex) || objectIndex < 0 || objectIndex >= objectOffsets.length) {
      return null;
    }
    if (cache.has(objectIndex)) return cache.get(objectIndex);
    if (inProgress.has(objectIndex)) return null;

    inProgress.add(objectIndex);

    const objectOffset = objectOffsets[objectIndex];
    if (objectOffset >= bytes.length) {
      inProgress.delete(objectIndex);
      return null;
    }

    const marker = bytes[objectOffset];
    const objectType = marker >> 4;
    const objectInfo = marker & 0x0f;
    let result: unknown = null;

    switch (objectType) {
      case 0x0: {
        if (objectInfo === 0x0) result = null;
        else if (objectInfo === 0x8) result = false;
        else if (objectInfo === 0x9) result = true;
        break;
      }
      case 0x1: {
        const intByteLength = 1 << objectInfo;
        if (intByteLength > 0 && intByteLength <= 8) {
          result = readBigEndianUInt(bytes, objectOffset + 1, intByteLength);
        }
        break;
      }
      case 0x2: {
        const realByteLength = 1 << objectInfo;
        if (realByteLength === 4 || realByteLength === 8) {
          const view = new DataView(
            bytes.buffer,
            bytes.byteOffset + objectOffset + 1,
            realByteLength,
          );
          result = realByteLength === 4 ? view.getFloat32(0, false) : view.getFloat64(0, false);
        }
        break;
      }
      case 0x3: {
        const realByteLength = 1 << objectInfo;
        if (realByteLength === 8) {
          const view = new DataView(bytes.buffer, bytes.byteOffset + objectOffset + 1, 8);
          result = view.getFloat64(0, false);
        }
        break;
      }
      case 0x4: {
        const lengthInfo = readLength(objectInfo, objectOffset + 1);
        if (lengthInfo) {
          const dataStart = objectOffset + 1 + lengthInfo.lengthBytes;
          const dataEnd = dataStart + lengthInfo.length;
          if (dataEnd <= bytes.length) {
            result = bytes.slice(dataStart, dataEnd);
          }
        }
        break;
      }
      case 0x5: {
        const lengthInfo = readLength(objectInfo, objectOffset + 1);
        if (lengthInfo) {
          const strStart = objectOffset + 1 + lengthInfo.lengthBytes;
          const strEnd = strStart + lengthInfo.length;
          if (strEnd <= bytes.length) {
            result = decodeAscii(bytes, strStart, lengthInfo.length);
          }
        }
        break;
      }
      case 0x6: {
        const lengthInfo = readLength(objectInfo, objectOffset + 1);
        if (lengthInfo) {
          const strStart = objectOffset + 1 + lengthInfo.lengthBytes;
          const byteLength = lengthInfo.length * 2;
          const strEnd = strStart + byteLength;
          if (strEnd <= bytes.length) {
            result = decodeUtf16BE(bytes, strStart, byteLength);
          }
        }
        break;
      }
      case 0xa: {
        const lengthInfo = readLength(objectInfo, objectOffset + 1);
        if (lengthInfo) {
          const refsStart = objectOffset + 1 + lengthInfo.lengthBytes;
          const refsEnd = refsStart + lengthInfo.length * objectRefSize;
          if (refsEnd <= bytes.length) {
            const items: unknown[] = [];
            for (let i = 0; i < lengthInfo.length; i++) {
              const refOffset = refsStart + i * objectRefSize;
              const ref = readBigEndianUInt(bytes, refOffset, objectRefSize);
              items.push(readObject(ref));
            }
            result = items;
          }
        }
        break;
      }
      case 0xd: {
        const lengthInfo = readLength(objectInfo, objectOffset + 1);
        if (lengthInfo) {
          const refsStart = objectOffset + 1 + lengthInfo.lengthBytes;
          const keyRefsEnd = refsStart + lengthInfo.length * objectRefSize;
          const valueRefsEnd = keyRefsEnd + lengthInfo.length * objectRefSize;

          if (valueRefsEnd <= bytes.length) {
            const dict: Record<string, unknown> = {};
            for (let i = 0; i < lengthInfo.length; i++) {
              const keyRefOffset = refsStart + i * objectRefSize;
              const valueRefOffset = keyRefsEnd + i * objectRefSize;
              const keyRef = readBigEndianUInt(bytes, keyRefOffset, objectRefSize);
              const valueRef = readBigEndianUInt(bytes, valueRefOffset, objectRefSize);
              const key = readObject(keyRef);
              if (typeof key === "string") {
                dict[key] = readObject(valueRef);
              }
            }
            result = dict;
          }
        }
        break;
      }
      default: {
        result = null;
      }
    }

    inProgress.delete(objectIndex);
    cache.set(objectIndex, result);
    return result;
  };

  return readObject(topObject);
}

async function inflateDeflate(data: Uint8Array): Promise<Uint8Array | null> {
  type DecompressionStreamCtor = new (
    format: "deflate" | "deflate-raw" | "gzip",
  ) => TransformStream<Uint8Array, Uint8Array>;

  const decompressionStreamCtor = (
    globalThis as { DecompressionStream?: DecompressionStreamCtor }
  ).DecompressionStream;

  if (!decompressionStreamCtor) return null;

  try {
    const stream = new Blob([data]).stream().pipeThrough(new decompressionStreamCtor("deflate"));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

async function extractLatexitSource(encodedPayload: string): Promise<string | null> {
  const payloadBytes = decodeBase64ToBytes(encodedPayload);
  if (!payloadBytes || payloadBytes.length === 0) return null;

  const compressedCandidates: Uint8Array[] = [];
  if (payloadBytes.length > 4) {
    const declaredLength = readBigEndianUInt(payloadBytes, 0, 4);
    if (declaredLength === payloadBytes.length - 4) {
      compressedCandidates.push(payloadBytes.slice(4));
    }
  }
  compressedCandidates.push(payloadBytes);

  for (const candidate of compressedCandidates) {
    const inflated = await inflateDeflate(candidate);
    if (!inflated) continue;

    const plist = parseBinaryPlist(inflated);
    if (!plist || typeof plist !== "object" || Array.isArray(plist)) continue;

    const source = (plist as Record<string, unknown>).source;
    if (typeof source === "string" && source.trim()) {
      return source.trim();
    }
  }

  return null;
}

function normalizeLatexForMarkdown(latex: string): string | null {
  const trimmed = latex.trim();
  if (!trimmed) return null;

  const hasMathDelimiters =
    (trimmed.startsWith("$") && trimmed.endsWith("$")) ||
    (trimmed.startsWith("\\(") && trimmed.endsWith("\\)")) ||
    (trimmed.startsWith("\\[") && trimmed.endsWith("\\]"));

  if (hasMathDelimiters) return trimmed;
  if (trimmed.includes("\n")) return `$$\n${trimmed}\n$$`;
  return `$${trimmed}$`;
}

async function replaceLatexitTagsInMarkdown(markdown: string): Promise<string> {
  const matches = [...markdown.matchAll(LATEXIT_TAG_PATTERN)];
  if (matches.length === 0) return markdown;

  let output = "";
  let cursor = 0;

  for (const match of matches) {
    const fullMatch = match[0];
    const payload = match[1];
    const startIndex = match.index ?? 0;

    output += markdown.slice(cursor, startIndex);

    const extractedSource = await extractLatexitSource(payload);
    const replacement = extractedSource ? normalizeLatexForMarkdown(extractedSource) : null;
    output += replacement ?? fullMatch;

    cursor = startIndex + fullMatch.length;
  }

  output += markdown.slice(cursor);
  return output;
}

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
          "mt-2 mb-4 text-[length:var(--md-h1-size,1.875rem)] font-bold tracking-tight text-foreground",
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
          "mt-7 mb-3 border-b border-border/70 pb-2 text-[length:var(--md-h2-size,1.5rem)] font-semibold tracking-tight text-foreground",
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
        className={cn(
          "mt-6 mb-3 text-[length:var(--md-h3-size,1.25rem)] font-semibold text-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </h3>
    );
  },
  h4: function Heading4Component({ children, className, ...props }) {
    return (
      <h4
        className={cn(
          "mt-5 mb-2 text-[length:var(--md-h4-size,1.125rem)] font-semibold text-foreground",
          className,
        )}
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
          "mb-4 last:mb-0 text-[length:var(--md-p-size,0.97rem)] leading-7 text-foreground/95",
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
      <li
        className={cn(
          "pl-1 text-[length:var(--md-p-size,0.97rem)] leading-7 text-foreground/95",
          className,
        )}
        {...props}
      >
        {children}
      </li>
    );
  },
  a: function AnchorComponent({ children, className, href, ...props }) {
    const isExternal = typeof href === "string" && EXTERNAL_LINK_PATTERN.test(href);
    return (
      <a
        className={cn(
          "font-medium text-primary underline decoration-primary/50 underline-offset-4 transition-colors hover:text-primary/80",
          className,
        )}
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer noopener" : undefined}
        {...props}
      >
        {children}
      </a>
    );
  },
  strong: function StrongComponent({ children, className, ...props }) {
    return (
      <strong className={cn("font-semibold text-primary/70", className)} {...props}>
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
  sup: function SuperscriptComponent({ children, className, ...props }) {
    return (
      <sup className={cn("text-xs align-super", className)} {...props}>
        {children}
      </sup>
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
  section: function SectionComponent({ children, className, ...props }) {
    const isFootnotes = "data-footnotes" in props;
    return (
      <section
        className={cn(
          isFootnotes &&
            "mt-8 border-t border-border/70 pt-4 text-sm text-muted-foreground [&_ol]:space-y-2 [&_ol]:pl-6",
          className,
        )}
        {...props}
      >
        {children}
      </section>
    );
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
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeKatex]}
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
  const [processedMarkdown, setProcessedMarkdown] = useState(children);

  useEffect(() => {
    if (!LATEXIT_TAG_DETECTOR.test(children)) {
      setProcessedMarkdown(children);
      return;
    }

    let cancelled = false;
    (async () => {
      const normalized = await replaceLatexitTagsInMarkdown(children);
      if (!cancelled) {
        setProcessedMarkdown(normalized);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [children]);

  const blocks = useMemo(() => {
    if (shouldRenderAsSingleDocument(processedMarkdown)) {
      return [processedMarkdown];
    }
    return parseMarkdownIntoBlocks(processedMarkdown);
  }, [processedMarkdown]);
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
