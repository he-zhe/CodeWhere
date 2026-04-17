package com.hezhe.codewhere.jetbrains.context;

import org.jetbrains.annotations.Nullable;

public record EditorContextSnapshot(
        String filePath,
        @Nullable String symbol,
        int startLine,
        int endLine,
        @Nullable String anchor
) {
    public String toPlainText() {
        StringBuilder builder = new StringBuilder();
        appendLine(builder, "path", filePath);
        appendLine(builder, "symbol", symbol);
        appendLine(builder, "lines", formatLines(startLine, endLine));
        appendLine(builder, "anchor", anchor);
        return builder.toString();
    }

    private static void appendLine(StringBuilder builder, String key, @Nullable String value) {
        if (value == null || value.isBlank()) {
            return;
        }

        if (!builder.isEmpty()) {
            builder.append('\n');
        }

        builder.append(key).append(": ").append(value);
    }

    private static String formatLines(int startLine, int endLine) {
        return startLine == endLine ? Integer.toString(startLine) : startLine + "-" + endLine;
    }
}
