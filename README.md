# CodeWhere

CodeWhere is a local-first developer tooling project. This repository currently contains a JetBrains plugin that captures a compact, deterministic description of the current editor location or selection and copies it to the clipboard for use with coding agents and other developer workflows.

## Current implementation

The repository currently includes one implementation:

- `JetBrains/`: a JetBrains plugin for IntelliJ-based IDEs

## What the JetBrains plugin does

The plugin adds an editor action named `Copy CodeWhere Context`. When triggered from the editor context menu, it copies a small text payload describing the current file and location:

```text
path: src/main/java/com/hezhe/codewhere/jetbrains/actions/CopyCodeWhereDescriptionAction.java
symbol: CopyCodeWhereDescriptionAction.actionPerformed
lines: 32-48
anchor: CopyPasteManager.getInstance().setContents(new StringSelection(snapshot.toPlainText()));
```

The payload is intentionally compact and stable:

- project-relative file path when available
- enclosing symbol path when one can be resolved
- current line or selected line range
- a short anchor line when it improves disambiguation

## Future plan

- Chrome extension for GitHub
- VS Code plugin

## License

[MIT](LICENSE)
