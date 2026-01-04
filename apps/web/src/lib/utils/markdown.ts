import { marked } from "marked";
import { sanitizeRichHtml } from "./sanitize";

export function renderMarkdownSafe(markdown: string) {
  const raw = marked.parse(markdown || "");
  return sanitizeRichHtml(String(raw || ""));
}
