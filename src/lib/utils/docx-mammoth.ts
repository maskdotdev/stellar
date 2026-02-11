import mammoth from "mammoth";
import TurndownService from "turndown";

const DOCX_STYLE_MAP = [
  "p[style-name='Code'] => pre:separator('\\n')",
  "p[style-name='Code Block'] => pre:separator('\\n')",
  "p[style-name='Source Code'] => pre:separator('\\n')",
  "p[style-name='Source'] => pre:separator('\\n')",
];

function createTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    bulletListMarker: "-",
  });

  // Preserve inline line breaks from docx HTML output.
  service.addRule("lineBreaks", {
    filter: "br",
    replacement: () => "\n",
  });

  return service;
}

const turndown = createTurndownService();
const inlineTurndown = createTurndownService();

function normalizeInlineCodeBlockText(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function getNodeTextWithBreaks(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement;
  Array.from(clone.querySelectorAll("br")).forEach((lineBreak) => {
    lineBreak.replaceWith("\n");
  });
  return normalizeInlineCodeBlockText(clone.textContent ?? "");
}

function looksLikeCodeLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (
    /^(?:\s{2,}|\t)/.test(line) ||
    /[{}[\]();:=<>\\]|->|=>|::|\/\/|#include\b|def\b|class\b|function\b|const\b|let\b|var\b|import\b|from\b|return\b/.test(
      trimmed,
    )
  ) {
    return true;
  }

  // Formula-like lines that usually belong in monospaced blocks from doc exports.
  if (/[∀∃ΣΠ∈∉⊂⊆→⇒↔]/.test(trimmed)) {
    return true;
  }

  return false;
}

function isCodeLikeMultiLineParagraph(node: HTMLElement): boolean {
  if (node.nodeName !== "P") return false;
  const hasLineBreaks = Array.from(node.childNodes).some(
    (child) => child.nodeName === "BR",
  );
  if (!hasLineBreaks) return false;

  const raw = getNodeTextWithBreaks(node);
  const lines = raw
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return false;

  const codeLikeLineCount = lines.filter(looksLikeCodeLine).length;
  const ratio = codeLikeLineCount / lines.length;
  return codeLikeLineCount >= 2 && ratio >= 0.6;
}

function normalizeTableCellMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>")
    .replace(/\|/g, "\\|")
    .trim();
}

function tableRowToMarkdownCells(row: HTMLTableRowElement): string[] {
  return Array.from(row.cells).map((cell) => {
    const rawHtml = cell.innerHTML?.trim() ?? "";
    if (!rawHtml) return "";

    const markdown = inlineTurndown.turndown(rawHtml);
    return normalizeTableCellMarkdown(markdown || cell.textContent || "");
  });
}

function renderMarkdownTable(table: HTMLTableElement): string | null {
  const rows = Array.from(table.rows);
  if (rows.length === 0) return null;

  const markdownRows = rows
    .map(tableRowToMarkdownCells)
    .filter((cells) => cells.length > 0);

  if (markdownRows.length === 0) return null;

  const headerRowIndex = rows.findIndex((row) =>
    Array.from(row.cells).some((cell) => cell.tagName === "TH"),
  );
  const resolvedHeaderRowIndex = headerRowIndex >= 0 ? headerRowIndex : 0;
  const headerCells = markdownRows[resolvedHeaderRowIndex] ?? [];
  const bodyRows = markdownRows.filter((_, index) => index !== resolvedHeaderRowIndex);

  const columnCount = Math.max(
    headerCells.length,
    ...bodyRows.map((cells) => cells.length),
    1,
  );

  const padCells = (cells: string[]) =>
    cells.length >= columnCount
      ? cells
      : [...cells, ...Array.from({ length: columnCount - cells.length }, () => "")];

  const headerLine = `| ${padCells(headerCells).join(" | ")} |`;
  const separatorLine = `| ${Array.from({ length: columnCount }, () => "---").join(" | ")} |`;
  const bodyLines = bodyRows.map((cells) => `| ${padCells(cells).join(" | ")} |`);

  return [headerLine, separatorLine, ...bodyLines].join("\n");
}

// Turndown does not preserve tables by default. Convert HTML tables to GFM.
turndown.addRule("tables", {
  filter: (node) => node.nodeName === "TABLE",
  replacement: (_content, node) => {
    const markdownTable = renderMarkdownTable(node as HTMLTableElement);
    return markdownTable ? `\n\n${markdownTable}\n\n` : "\n\n";
  },
});

// Mammoth often emits <pre> without nested <code>; force fenced output.
turndown.addRule("preformattedBlocks", {
  filter: (node) => node.nodeName === "PRE",
  replacement: (_content, node) => {
    const raw = getNodeTextWithBreaks(node as HTMLElement);
    const normalized = raw
      .split("\n")
      .map((line) => line.replace(/\s+$/g, ""))
      .join("\n")
      .trim();

    return normalized ? `\n\n\`\`\`\n${normalized}\n\`\`\`\n\n` : "\n\n";
  },
});

// DOCX exports frequently encode code blocks as single paragraphs with <br>.
turndown.addRule("codeLikeParagraphs", {
  filter: (node) => isCodeLikeMultiLineParagraph(node as HTMLElement),
  replacement: (_content, node) => {
    const raw = getNodeTextWithBreaks(node as HTMLElement);
    const normalized = raw
      .split("\n")
      .map((line) => line.replace(/\s+$/g, ""))
      .join("\n")
      .trim();

    return normalized ? `\n\n\`\`\`\n${normalized}\n\`\`\`\n\n` : "\n\n";
  },
});

export async function convertDocxFileToMarkdown(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    { styleMap: DOCX_STYLE_MAP },
  );

  if (!result.value || !result.value.trim()) {
    return "";
  }

  const markdown = turndown.turndown(result.value);
  return markdown.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
