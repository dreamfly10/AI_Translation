export type ExportFormat = "txt" | "md" | "json";

export function exportContent(content: unknown, format: ExportFormat): string {
  if (format === "json") {
    return JSON.stringify(content, null, 2);
  }
  if (format === "md") {
    // If content is already string, return; otherwise stringify
    return typeof content === "string" ? content : "```json\n" + JSON.stringify(content, null, 2) + "\n```";
  }
  // txt
  return typeof content === "string" ? content : String(content ?? "");
}
