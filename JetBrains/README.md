# CodeWhere JetBrains Plugin

Bootstrap for a JetBrains plugin that targets the editor right-click menu and stays local, deterministic, and fast.

## What is included

- A modern Gradle IntelliJ Platform project scaffold under `JetBrains/`
- A registered editor popup action: `Copy CodeWhere Context`
- A bootstrap context extractor that copies structured JSON for the current file, caret, line, and selection

## Current behavior

Right-click inside the editor and run `Copy CodeWhere Context`.

The action copies a bootstrap payload like this to the clipboard:

```json
{
  "schemaVersion": "bootstrap-v1",
  "file": {
    "path": "/path/to/file.py",
    "name": "file.py",
    "languageId": "Python"
  },
  "caret": {
    "offset": 120,
    "line": 10,
    "column": 5
  },
  "selection": {
    "hasSelection": true,
    "startOffset": 95,
    "endOffset": 140,
    "selectedText": "..."
  },
  "context": {
    "lineText": "def example():"
  }
}
```

This is intentionally a thin starting point. It proves the editor integration and gives you a deterministic payload surface to evolve into a richer semantic description later.

## Project layout

- `build.gradle.kts` configures the IntelliJ Platform Gradle plugin
- `src/main/resources/META-INF/plugin.xml` registers the plugin action
- `src/main/java/dev/codewhere/jetbrains/actions/CopyCodeWhereDescriptionAction.java` wires the UI action to clipboard copy
- `src/main/java/dev/codewhere/jetbrains/context/` contains the bootstrap snapshot model and builder

## Requirements

- JDK 21
- Internet access on first Gradle sync so IntelliJ Platform and Gradle dependencies can be downloaded

## First run

```bash
cd JetBrains
./gradlew runIde
```

After the sandboxed bootstrap here, you will still need a local JDK installed before the plugin can be built or run.
