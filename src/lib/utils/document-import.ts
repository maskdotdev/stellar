export const SUPPORTED_IMPORT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "odt",
  "rtf",
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
] as const;

const SUPPORTED_IMPORT_MIME_TYPES = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "application/rtf",
  "text/rtf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/tab-separated-values",
]);

export const SUPPORTED_IMPORT_ACCEPT_ATTR =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.rtf,.txt,.md,.markdown,.csv,.tsv";

export function getFileExtension(fileName: string): string {
  const extension = fileName.split(".").pop();
  return extension ? extension.toLowerCase() : "";
}

export function isSupportedImportFile(file: { name?: string; type?: string }): boolean {
  const extension = getFileExtension(file.name || "");

  if (SUPPORTED_IMPORT_EXTENSIONS.includes(extension as (typeof SUPPORTED_IMPORT_EXTENSIONS)[number])) {
    return true;
  }

  const mimeType = (file.type || "").toLowerCase();
  return SUPPORTED_IMPORT_MIME_TYPES.has(mimeType);
}
