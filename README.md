# CodeWhere

CodeWhere is a local-first developer tooling project. This repository contains editor and browser integrations that capture a compact, deterministic description of the current file location or selection and copy it to the clipboard for use with coding agents and other developer workflows.

## Current implementations

- `JetBrains/`: a JetBrains plugin for IntelliJ-based IDEs
- `VSCode/`: a Visual Studio Code extension
- `Chrome/`: a Chrome extension for GitHub file and diff views

## What the IDE plugins do

Each IDE plugin adds an editor action named `Copy CodeWhere Context`. When triggered from the editor context menu, it copies a small text payload describing the current file and location:

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

## What the Chrome extension does

The Chrome extension adds a `Copy CodeWhere` button to supported GitHub pages and copies the same compact payload shape GitHub can support:

```text
path: src/main/java/com/hezhe/codewhere/jetbrains/actions/CopyCodeWhereDescriptionAction.java
lines: 32-48
anchor: CopyPasteManager.getInstance().setContents(new StringSelection(snapshot.toPlainText()));
```

Current scope:

- file pages on `github.com`
- pull request and commit diff pages with one button per file header
- line ranges from text selection or GitHub URL anchors, with a first-line fallback when no range is selected
- no `symbol` field yet because GitHub DOM data is not a reliable syntax-analysis source

## License

[MIT](LICENSE)
