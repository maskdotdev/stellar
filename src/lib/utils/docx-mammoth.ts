import mammoth from "mammoth";
import TurndownService from "turndown";

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

export async function convertDocxFileToMarkdown(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });

  if (!result.value || !result.value.trim()) {
    return "";
  }

  const markdown = turndown.turndown(result.value);
  return markdown.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
