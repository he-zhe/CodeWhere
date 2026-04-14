package dev.codewhere.jetbrains.context;

import org.jetbrains.annotations.Nullable;

public record EditorContextSnapshot(
        String schemaVersion,
        String filePath,
        String fileName,
        String languageId,
        int caretOffset,
        int line,
        int column,
        boolean hasSelection,
        int selectionStartOffset,
        int selectionEndOffset,
        String lineText,
        @Nullable String selectedText
) {
    public String toJson() {
        return """
                {
                  "schemaVersion": %s,
                  "file": {
                    "path": %s,
                    "name": %s,
                    "languageId": %s
                  },
                  "caret": {
                    "offset": %d,
                    "line": %d,
                    "column": %d
                  },
                  "selection": {
                    "hasSelection": %s,
                    "startOffset": %d,
                    "endOffset": %d,
                    "selectedText": %s
                  },
                  "context": {
                    "lineText": %s
                  }
                }
                """.formatted(
                quote(schemaVersion),
                quote(filePath),
                quote(fileName),
                quote(languageId),
                caretOffset,
                line,
                column,
                hasSelection,
                selectionStartOffset,
                selectionEndOffset,
                nullableQuote(selectedText),
                quote(lineText)
        );
    }

    private static String nullableQuote(@Nullable String value) {
        return value == null ? "null" : quote(value);
    }

    private static String quote(String value) {
        return "\"" + escapeJson(value) + "\"";
    }

    private static String escapeJson(String value) {
        StringBuilder escaped = new StringBuilder(value.length() + 16);

        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);

            switch (ch) {
                case '\\' -> escaped.append("\\\\");
                case '"' -> escaped.append("\\\"");
                case '\b' -> escaped.append("\\b");
                case '\f' -> escaped.append("\\f");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                default -> {
                    if (ch < 0x20) {
                        escaped.append(String.format("\\u%04x", (int) ch));
                    } else {
                        escaped.append(ch);
                    }
                }
            }
        }

        return escaped.toString();
    }
}
