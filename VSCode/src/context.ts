import * as path from "node:path";
import * as vscode from "vscode";
import {
  EditorContextSnapshot,
  inclusiveSelectionEndLine,
  resolveAnchor
} from "./snapshot";

const STRUCTURAL_SYMBOL_KINDS = new Set<vscode.SymbolKind>([
  vscode.SymbolKind.Class,
  vscode.SymbolKind.Constructor,
  vscode.SymbolKind.Enum,
  vscode.SymbolKind.Field,
  vscode.SymbolKind.Function,
  vscode.SymbolKind.Interface,
  vscode.SymbolKind.Method,
  vscode.SymbolKind.Module,
  vscode.SymbolKind.Namespace,
  vscode.SymbolKind.Object,
  vscode.SymbolKind.Property,
  vscode.SymbolKind.Struct
]);

interface SymbolCandidate {
  path: string[];
  range: vscode.Range;
}

export async function captureEditorContext(
  editor: vscode.TextEditor
): Promise<EditorContextSnapshot> {
  const document = editor.document;
  const selection = editor.selection;
  const activePosition = selection.isEmpty ? selection.active : selection.start;
  const startLine = selection.isEmpty ? selection.active.line + 1 : selection.start.line + 1;
  const endLine = selection.isEmpty
    ? selection.active.line + 1
    : inclusiveSelectionEndLine(selection.start.line + 1, selection.end.line + 1, selection.end.character);
  const symbol = await resolveSymbol(document, activePosition);
  const lineTexts = collectLineTexts(document, startLine, endLine);

  return {
    filePath: resolveFilePath(document),
    symbol,
    startLine,
    endLine,
    anchor: resolveAnchor(lineTexts, symbol)
  };
}

function resolveFilePath(document: vscode.TextDocument): string {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (workspaceFolder && document.uri.scheme === "file" && workspaceFolder.uri.scheme === "file") {
    const relativePath = path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath);
    if (relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
      return relativePath.split(path.sep).join("/");
    }
  }

  const workspaceRelativePath = vscode.workspace.asRelativePath(document.uri, false);
  if (workspaceRelativePath && workspaceRelativePath !== document.uri.fsPath) {
    return workspaceRelativePath.split(path.sep).join("/");
  }

  return document.uri.scheme === "file" ? document.uri.fsPath : document.uri.toString(true);
}

function collectLineTexts(
  document: vscode.TextDocument,
  startLine: number,
  endLine: number
): string[] {
  const lines: string[] = [];
  for (let line = startLine; line <= endLine; line += 1) {
    lines.push(document.lineAt(line - 1).text);
  }
  return lines;
}

async function resolveSymbol(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<string | undefined> {
  const symbols = await vscode.commands.executeCommand<
    readonly vscode.DocumentSymbol[] | readonly vscode.SymbolInformation[] | undefined
  >("vscode.executeDocumentSymbolProvider", document.uri);

  if (!symbols || symbols.length === 0) {
    return undefined;
  }

  if (isDocumentSymbolArray(symbols)) {
    return resolveDocumentSymbolPath(symbols, position);
  }

  return resolveSymbolInformationPath(symbols, position);
}

function isDocumentSymbolArray(
  symbols: readonly vscode.DocumentSymbol[] | readonly vscode.SymbolInformation[]
): symbols is readonly vscode.DocumentSymbol[] {
  return "children" in symbols[0];
}

function resolveDocumentSymbolPath(
  symbols: readonly vscode.DocumentSymbol[],
  position: vscode.Position
): string | undefined {
  const candidate = findBestDocumentSymbolCandidate(symbols, position, []);
  return candidate?.path.length ? candidate.path.join(".") : undefined;
}

function findBestDocumentSymbolCandidate(
  symbols: readonly vscode.DocumentSymbol[],
  position: vscode.Position,
  ancestors: string[]
): SymbolCandidate | undefined {
  let best: SymbolCandidate | undefined;

  for (const symbol of symbols) {
    if (!symbol.range.contains(position)) {
      continue;
    }

    const name = isStructuralSymbolKind(symbol.kind) ? cleanSymbolName(symbol.name) : undefined;
    const pathParts = name ? [...ancestors, name] : ancestors;
    const childCandidate = findBestDocumentSymbolCandidate(symbol.children, position, pathParts);
    const selfCandidate = name ? { path: pathParts, range: symbol.range } : undefined;

    best = pickBetterCandidate(best, childCandidate);
    best = pickBetterCandidate(best, selfCandidate);
  }

  return best;
}

function resolveSymbolInformationPath(
  symbols: readonly vscode.SymbolInformation[],
  position: vscode.Position
): string | undefined {
  let best: SymbolCandidate | undefined;

  for (const symbol of symbols) {
    if (!isStructuralSymbolKind(symbol.kind) || !symbol.location.range.contains(position)) {
      continue;
    }

    const name = cleanSymbolName(symbol.name);
    if (!name) {
      continue;
    }

    const containerParts = symbol.containerName
      ?.split(".")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

    best = pickBetterCandidate(best, {
      path: [...containerParts, name],
      range: symbol.location.range
    });
  }

  return best?.path.length ? best.path.join(".") : undefined;
}

function pickBetterCandidate(
  current: SymbolCandidate | undefined,
  next: SymbolCandidate | undefined
): SymbolCandidate | undefined {
  if (!next) {
    return current;
  }

  if (!current) {
    return next;
  }

  if (next.path.length !== current.path.length) {
    return next.path.length > current.path.length ? next : current;
  }

  return rangeWeight(next.range) <= rangeWeight(current.range) ? next : current;
}

function rangeWeight(range: vscode.Range): number {
  return (range.end.line - range.start.line) * 100000 + (range.end.character - range.start.character);
}

function isStructuralSymbolKind(kind: vscode.SymbolKind): boolean {
  return STRUCTURAL_SYMBOL_KINDS.has(kind);
}

function cleanSymbolName(name: string): string | undefined {
  const trimmed = name.trim();
  return trimmed ? trimmed : undefined;
}
