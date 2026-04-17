# CodeWhere JetBrains Plugin

Bootstrap for a JetBrains plugin that targets the editor right-click menu and stays local, deterministic, and fast.

## What is included

- A modern Gradle IntelliJ Platform project scaffold under `JetBrains/`
- A registered editor popup action: `Copy CodeWhere Context`
- A context extractor that copies compact semantic text for the current file, symbol, and line range

## Current behavior

Right-click inside the editor and run `Copy CodeWhere Context`.

The action copies a compact payload like this to the clipboard:

```text
path: src/main/java/com/hezhe/codewhere/jetbrains/actions/CopyCodeWhereDescriptionAction.java
symbol: CopyCodeWhereDescriptionAction.actionPerformed
lines: 32-48
anchor: CopyPasteManager.getInstance().setContents(new StringSelection(snapshot.toPlainText()));
```

The payload is intentionally small and optimized for coding agents: project-relative path, enclosing symbol path when available, a stable line range, and a single-line anchor only when it adds value.

## Project layout

- `build.gradle.kts` configures the IntelliJ Platform Gradle plugin
- `src/main/resources/META-INF/plugin.xml` registers the plugin action
- `src/main/java/com/hezhe/codewhere/jetbrains/actions/CopyCodeWhereDescriptionAction.java` wires the UI action to clipboard copy
- `src/main/java/com/hezhe/codewhere/jetbrains/context/` contains the context snapshot model and builder

## Requirements

- JDK 21
- Internet access on first Gradle sync so IntelliJ Platform and Gradle dependencies can be downloaded

## First run

```bash
cd JetBrains
./gradlew runIde
```

After the sandboxed bootstrap here, you will still need a local JDK installed before the plugin can be built or run.
