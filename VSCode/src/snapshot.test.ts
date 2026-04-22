import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_ANCHOR_LENGTH,
  inclusiveSelectionEndLine,
  normalizeAnchor,
  resolveAnchor,
  toPlainText
} from "./snapshot";

describe("snapshot utilities", () => {
  it("formats a compact plain-text payload", () => {
    const result = toPlainText({
      filePath: "src/extension.ts",
      symbol: "activate",
      startLine: 8,
      endLine: 23,
      anchor: "const disposable = vscode.commands.registerCommand(...)"
    });

    assert.equal(
      result,
      [
        "path: src/extension.ts",
        "symbol: activate",
        "lines: 8-23",
        "anchor: const disposable = vscode.commands.registerCommand(...)"
      ].join("\n")
    );
  });

  it("normalizes and truncates anchors", () => {
    assert.equal(normalizeAnchor("  hello    world  "), "hello world");
    assert.equal(normalizeAnchor(""), undefined);
    assert.equal(normalizeAnchor("x".repeat(MAX_ANCHOR_LENGTH + 10))?.length, MAX_ANCHOR_LENGTH);
  });

  it("uses the first non-empty line for multi-line selections without a symbol", () => {
    const anchor = resolveAnchor(["   ", "", "  const value = 1;  "], undefined);
    assert.equal(anchor, "const value = 1;");
  });

  it("omits a multi-line anchor when a symbol already disambiguates the selection", () => {
    const anchor = resolveAnchor(["const a = 1;", "const b = 2;"], "Example.method");
    assert.equal(anchor, undefined);
  });

  it("treats an end-of-line-zero selection boundary as inclusive of the previous line", () => {
    assert.equal(inclusiveSelectionEndLine(4, 8, 0), 7);
    assert.equal(inclusiveSelectionEndLine(4, 8, 5), 8);
  });
});
