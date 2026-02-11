import pdf2md from "@opendocsg/pdf2md";

export async function convertPdfFileToMarkdown(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const markdown = await pdf2md(arrayBuffer);

  if (!markdown || !markdown.trim()) {
    return "";
  }

  return markdown.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
