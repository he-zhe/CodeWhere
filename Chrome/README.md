# CodeWhere Chrome Extension

Chrome extension for GitHub that copies a compact CodeWhere snapshot from file pages and diff views.

## What it does

On supported GitHub pages, the extension injects a `Copy CodeWhere` button:

- file pages: next to the existing file actions
- pull request and commit diffs: once per file header

The copied payload matches the JetBrains plugin format as closely as GitHub allows:

```text
path: src/main/java/com/hezhe/codewhere/jetbrains/actions/CopyCodeWhereDescriptionAction.java
lines: 32-48
anchor: CopyPasteManager.getInstance().setContents(new StringSelection(snapshot.toPlainText()));
```

## Selection rules

- If you select text inside a GitHub code view, the extension uses the start and end lines of that selection.
- If GitHub already has line anchors in the URL hash, the extension uses those line numbers.
- If neither exists, it falls back to the first non-empty visible line in that file section.

## Limitations

- `symbol` is not emitted yet. GitHub sometimes exposes symbols, but the page DOM is not a dependable syntax-analysis source and line-to-symbol mapping is inconsistent across languages and views.
- Diff line numbers are best-effort. For additions and unchanged context, the extension prefers right-side line numbers. For deletions, it prefers left-side line numbers when GitHub exposes them clearly.
- The extension currently targets `github.com` file pages and diff pages, not raw views or GitHub Enterprise hosts.

## Load locally

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the [`Chrome`](/Users/zhe/.codex/worktrees/e9de/CodeWhere/Chrome) directory.
