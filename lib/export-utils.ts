export type ExportFormat = "txt" | "md" | "docx" | "pdf" | "json";

export async function exportContent(content: unknown, format: ExportFormat, filename?: string): Promise<void> {
  let textContent: string;
  let mimeType: string;
  let fileExtension: string;

  // Convert content to string based on format
  if (format === "json") {
    textContent = JSON.stringify(content, null, 2);
    mimeType = "application/json";
    fileExtension = "json";
  } else if (format === "md") {
    textContent = typeof content === "string" ? content : "```json\n" + JSON.stringify(content, null, 2) + "\n```";
    mimeType = "text/markdown";
    fileExtension = "md";
  } else if (format === "txt") {
    textContent = typeof content === "string" ? content : String(content ?? "");
    mimeType = "text/plain";
    fileExtension = "txt";
  } else if (format === "docx") {
    // For DOCX, we'll create a simple text file with .docx extension
    // Note: This creates a text file, not a true DOCX. For real DOCX, you'd need a library like docx
    textContent = typeof content === "string" ? content : String(content ?? "");
    mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    fileExtension = "docx";
    // For now, we'll save as plain text with .docx extension
    // In production, you might want to use a library like 'docx' to create proper DOCX files
  } else if (format === "pdf") {
    // For PDF, we'll create a text file
    // Note: This creates a text file, not a true PDF. For real PDF, you'd need a library like jsPDF or pdfkit
    textContent = typeof content === "string" ? content : String(content ?? "");
    mimeType = "application/pdf";
    fileExtension = "pdf";
    // For now, we'll save as plain text with .pdf extension
    // In production, you might want to use a library like 'jsPDF' to create proper PDF files
  } else {
    textContent = typeof content === "string" ? content : String(content ?? "");
    mimeType = "text/plain";
    fileExtension = "txt";
  }

  // Create a blob and download it
  const blob = new Blob([textContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename 
    ? `${filename.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_')}.${fileExtension}`
    : `export.${fileExtension}`;
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  URL.revokeObjectURL(url);
}
