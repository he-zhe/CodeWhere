export interface EditorContextSnapshot {
  filePath: string;
  symbol?: string;
  startLine: number;
  endLine: number;
  anchor?: string;
}

export const MAX_ANCHOR_LENGTH = 160;

export function toPlainText(snapshot: EditorContextSnapshot): string {
  const lines: string[] = [];
  appendLine(lines, "path", snapshot.filePath);
  appendLine(lines, "symbol", snapshot.symbol);
  appendLine(lines, "lines", formatLines(snapshot.startLine, snapshot.endLine));
  appendLine(lines, "anchor", snapshot.anchor);
  return lines.join("\n");
}

export function formatLines(startLine: number, endLine: number): string {
  return startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`;
}

export function normalizeAnchor(value?: string | null): string | undefined {
  if (value == null) {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= MAX_ANCHOR_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_ANCHOR_LENGTH - 3)}...`;
}

export function resolveAnchor(lineTexts: string[], symbol?: string): string | undefined {
  if (lineTexts.length === 0) {
    return undefined;
  }

  if (lineTexts.length === 1) {
    return normalizeAnchor(lineTexts[0]);
  }

  if (symbol?.trim()) {
    return undefined;
  }

  for (const lineText of lineTexts) {
    const normalized = normalizeAnchor(lineText);
    if (normalized) {
      return normalized;
    }
  }

  return normalizeAnchor(lineTexts[0]);
}

export function inclusiveSelectionEndLine(
  startLine: number,
  endLine: number,
  endCharacter: number
): number {
  if (endLine <= startLine) {
    return startLine;
  }

  return endCharacter === 0 ? endLine - 1 : endLine;
}

function appendLine(lines: string[], key: string, value?: string): void {
  if (!value?.trim()) {
    return;
  }

  lines.push(`${key}: ${value}`);
}
