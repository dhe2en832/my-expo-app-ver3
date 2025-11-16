export const generateQRCodeBase64 = async (data: string, size: number = 200): Promise<string> => {
  // This would generate a base64 QR code
  // Implementation depends on your specific needs
  return Promise.resolve("");
};

export const prepareQRForPrint = (base64Data: string): string => {
  // Convert base64 QR for thermal printing
  // This is a simplified version - thermal printers need special handling
  return "[QR_CODE_PLACEHOLDER]";
};

export const generateQRPatternText = (soNumber: string = ""): string => {
  const lines: string[] = [];
  const PRINT_WIDTH = 32;

  const centerText = (text: string): string => {
    if (!text) return "";
    const cleanText = text.trim();
    if (cleanText.length >= PRINT_WIDTH) return cleanText;

    const padding = Math.floor((PRINT_WIDTH - cleanText.length) / 2);
    return " ".repeat(Math.max(0, padding)) + cleanText;
  };

  lines.push(centerText("╔════════════════╗"));
  lines.push(centerText("║ ██  ██  ██  ██ ║"));
  lines.push(centerText("║ ██        ██ ║"));
  lines.push(centerText("║ ██  ██  ██  ██ ║"));
  lines.push(centerText("║ ██    ██    ██ ║"));
  lines.push(centerText("║ ██  ██  ██  ██ ║"));
  lines.push(centerText("╚════════════════╝"));

  if (soNumber) {
    lines.push(centerText(`SO: ${soNumber}`));
  }
  lines.push(centerText("SCAN FOR DETAILS"));

  return lines.join("\n");
};