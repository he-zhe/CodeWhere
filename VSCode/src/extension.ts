import * as vscode from "vscode";
import { captureEditorContext } from "./context";
import { toPlainText } from "./snapshot";

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand("codewhere.copyContext", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      await vscode.window.showWarningMessage(
        "No editor context could be captured from the current window."
      );
      return;
    }

    try {
      const snapshot = await captureEditorContext(editor);
      await vscode.env.clipboard.writeText(toPlainText(snapshot));
      await vscode.window.showInformationMessage(
        "Copied semantic editor context for the current location or selection."
      );
    } catch (error) {
      console.error("CodeWhere failed to capture editor context", error);
      await vscode.window.showWarningMessage(
        "No editor context could be captured from the current editor."
      );
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {}
