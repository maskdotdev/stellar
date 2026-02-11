import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils/utils";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import tokyoNightTheme from "shiki/themes/tokyo-night.mjs";

type SupportedTheme = "tokyo-night" | "github-light" | "github-dark";
type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;
type ShikiModule = { default: unknown };
type Loader = () => Promise<ShikiModule>;

const THEME_ALIAS: Record<string, SupportedTheme> = {
  tokyonight: "tokyo-night",
  "tokyo-night": "tokyo-night",
  light: "github-light",
  dark: "github-dark",
  "github-light": "github-light",
  "github-dark": "github-dark",
};

const LANGUAGE_ALIAS: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  shellscript: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  "c++": "cpp",
  "c#": "csharp",
  csharp: "csharp",
  plaintext: "text",
  plain: "text",
  txt: "text",
};

const DEFAULT_THEME: SupportedTheme = "tokyo-night";
const DEFAULT_LANGUAGE = "text";

const THEME_LOADERS: Record<SupportedTheme, Loader> = {
  "tokyo-night": async () => ({ default: tokyoNightTheme }),
  "github-light": () => import("shiki/themes/github-light.mjs"),
  "github-dark": () => import("shiki/themes/github-dark.mjs"),
};

const LANGUAGE_LOADERS: Record<string, Loader> = {
  javascript: () => import("shiki/langs/javascript.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  bash: () => import("shiki/langs/bash.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  java: () => import("shiki/langs/java.mjs"),
  cpp: () => import("shiki/langs/cpp.mjs"),
  csharp: () => import("shiki/langs/csharp.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  diff: () => import("shiki/langs/diff.mjs"),
  toml: () => import("shiki/langs/toml.mjs"),
};

function looksLikeJson(source: string): boolean {
  const first = source[0];
  if (first !== "{" && first !== "[") return false;
  try {
    JSON.parse(source);
    return true;
  } catch {
    return false;
  }
}

function detectLanguageFromCode(code: string): string {
  const source = code.trim();
  if (!source) return DEFAULT_LANGUAGE;

  if (looksLikeJson(source)) return "json";
  if (/^(diff --git|--- |\+\+\+ |@@ )/m.test(source)) return "diff";

  if (source.startsWith("#!")) {
    if (/\bpython(?:\d+(?:\.\d+)?)?\b/i.test(source)) return "python";
    if (/\b(?:bash|zsh|sh)\b/i.test(source)) return "bash";
  }

  if (/^\s*<([a-zA-Z][\w:-]*)(\s|>)/.test(source) && /<\/[a-zA-Z][\w:-]*>\s*$/.test(source)) {
    return "html";
  }

  if (/^\s*\[[\w.-]+\]\s*$/m.test(source) && /^\s*[\w.-]+\s*=\s*.+$/m.test(source)) {
    return "toml";
  }

  const yamlLikeLines = source
    .split("\n")
    .filter((line) => /^\s*[\w-]+\s*:\s*.+$/.test(line));
  if (yamlLikeLines.length >= 2 && !/[{};]/.test(source)) return "yaml";

  if (
    /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH|FROM|WHERE|JOIN)\b/i.test(source) &&
    /[;\n]/.test(source)
  ) {
    return "sql";
  }

  if (/\bpackage\s+main\b/.test(source) || /\bfunc\s+\w+\s*\(/.test(source)) return "go";
  if (/\bfn\s+\w+\s*\(/.test(source) || /\buse\s+std::/.test(source)) return "rust";

  if (
    (/\b(def|class)\s+\w+\s*[:(]/.test(source) || /\bimport\s+\w+/.test(source)) &&
    /:\s*(?:\n|$)/.test(source)
  ) {
    return "python";
  }

  if (
    /\b(interface|type|enum)\s+\w+/.test(source) ||
    /:\s*[A-Za-z_$][\w<>\[\]\s|,&?]*(?=[,);=])/m.test(source)
  ) {
    return "typescript";
  }

  if (/\b(import|export|const|let|var|function|=>|console\.)\b/.test(source)) {
    return "javascript";
  }

  if (/^[^{}]+\{[^}]*:[^}]*\}/s.test(source) && /;/.test(source)) return "css";
  if (/^#{1,6}\s/m.test(source) || /```/.test(source)) return "markdown";

  return DEFAULT_LANGUAGE;
}

function resolveLanguage(code: string, requestedLanguage?: string): string {
  const normalized = normalizeLanguage(requestedLanguage);
  if (normalized !== DEFAULT_LANGUAGE) return normalized;

  const detected = normalizeLanguage(detectLanguageFromCode(code));
  return LANGUAGE_LOADERS[detected] ? detected : DEFAULT_LANGUAGE;
}

let highlighterPromise: Promise<Highlighter> | null = null;
const loadedThemes = new Set<SupportedTheme>([DEFAULT_THEME]);
const loadedLanguages = new Set<string>([DEFAULT_LANGUAGE]);
const loadingThemePromises = new Map<SupportedTheme, Promise<void>>();
const loadingLanguagePromises = new Map<string, Promise<void>>();

function normalizeLanguage(language?: string): string {
  const raw = (language || DEFAULT_LANGUAGE).toLowerCase().trim();
  const noPrefix = raw.replace(/^language-/, "");
  const normalized = LANGUAGE_ALIAS[noPrefix] || noPrefix || DEFAULT_LANGUAGE;
  if (normalized === "text" || normalized === "txt" || normalized === "plaintext") {
    return DEFAULT_LANGUAGE;
  }
  return normalized;
}

function normalizeTheme(theme?: string): SupportedTheme {
  if (!theme) return DEFAULT_THEME;
  const normalized = theme.toLowerCase().trim();
  return THEME_ALIAS[normalized] || DEFAULT_THEME;
}

function resolveTheme(themeOverride?: string): SupportedTheme {
  if (themeOverride) return normalizeTheme(themeOverride);
  return DEFAULT_THEME;
}

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [tokyoNightTheme],
      langs: [],
    });
  }

  return highlighterPromise;
}

async function ensureThemeLoaded(theme: SupportedTheme) {
  if (loadedThemes.has(theme)) return;
  const loadingTheme = loadingThemePromises.get(theme);
  if (loadingTheme) {
    await loadingTheme;
    return;
  }

  const pending = (async () => {
    const loader = THEME_LOADERS[theme];
    if (!loader) return;
    const highlighter = await getHighlighter();
    const module = await loader();
    await highlighter.loadTheme(module.default as never);
    loadedThemes.add(theme);
  })();

  loadingThemePromises.set(theme, pending);

  try {
    await pending;
  } finally {
    loadingThemePromises.delete(theme);
  }
}

async function ensureLanguageLoaded(language: string): Promise<string> {
  if (language === DEFAULT_LANGUAGE) return DEFAULT_LANGUAGE;
  const loader = LANGUAGE_LOADERS[language];
  if (!loader) return DEFAULT_LANGUAGE;
  if (loadedLanguages.has(language)) return language;
  const loadingLanguage = loadingLanguagePromises.get(language);
  if (loadingLanguage) {
    await loadingLanguage;
    return language;
  }

  const pending = (async () => {
    const highlighter = await getHighlighter();
    const module = await loader();
    await highlighter.loadLanguage(module.default as never);
    loadedLanguages.add(language);
  })();

  loadingLanguagePromises.set(language, pending);

  try {
    await pending;
  } finally {
    loadingLanguagePromises.delete(language);
  }

  return language;
}

export type CodeBlockProps = {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose w-full",
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
  theme,
  className,
  ...props
}: CodeBlockCodeProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [resolvedLanguage, setResolvedLanguage] = useState(DEFAULT_LANGUAGE);
  const [copied, setCopied] = useState(false);
  const activeTheme = useMemo(() => resolveTheme(theme), [theme]);

  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      if (!code) {
        if (!cancelled) {
          setHighlightedHtml("<pre><code></code></pre>");
          setResolvedLanguage(DEFAULT_LANGUAGE);
        }
        return;
      }

      const requestedLanguage = resolveLanguage(code, language);
      const requestedTheme = activeTheme;

      try {
        await ensureThemeLoaded(requestedTheme);
        const lang = await ensureLanguageLoaded(requestedLanguage);
        const highlighter = await getHighlighter();

        const html = highlighter.codeToHtml(code, {
          lang,
          theme: requestedTheme,
        });

        if (!cancelled) {
          setResolvedLanguage(lang);
          setHighlightedHtml(html);
        }
      } catch (error) {
        console.error("Failed to highlight code block:", error);
        if (!cancelled) {
          setResolvedLanguage(DEFAULT_LANGUAGE);
          setHighlightedHtml(null);
        }
      }
    }

    highlight();

    return () => {
      cancelled = true;
    };
  }, [activeTheme, code, language]);

  const classNames = cn(
    "w-full overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground",
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

  return (
    <div className={classNames} {...props}>
      <div className="flex items-center justify-between border-b border-border/70 bg-muted/35 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {resolvedLanguage}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={copied ? "Copied" : "Copy code"}
          title={copied ? "Copied" : "Copy code"}
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
      {highlightedHtml ? (
        <div className="w-full overflow-x-auto text-[13px] [&_pre]:m-0 [&_pre]:px-3 [&_pre]:py-3">
          <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        </div>
      ) : (
        <pre className="overflow-x-auto p-3 text-[13px]">
          <code>{code}</code>
        </pre>
      )}
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
