package com.hezhe.codewhere.jetbrains.context;

import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.editor.SelectionModel;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.project.ProjectUtil;
import com.intellij.openapi.util.TextRange;
import com.intellij.openapi.vfs.VfsUtilCore;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.psi.PsiElement;
import com.intellij.psi.PsiFile;
import com.intellij.psi.PsiNamedElement;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

public final class EditorContextSnapshotBuilder {
    private static final int MAX_ANCHOR_LENGTH = 160;
    private static final List<String> STRUCTURAL_SYMBOL_KEYWORDS = List.of(
            "actor",
            "class",
            "constructor",
            "enum",
            "extension",
            "field",
            "function",
            "interface",
            "method",
            "module",
            "namespace",
            "object",
            "property",
            "protocol",
            "record",
            "struct",
            "trait"
    );

    private EditorContextSnapshotBuilder() {
    }

    public static @Nullable EditorContextSnapshot from(@NotNull AnActionEvent event) {
        Project project = event.getProject();
        Editor editor = event.getData(CommonDataKeys.EDITOR);
        VirtualFile virtualFile = event.getData(CommonDataKeys.VIRTUAL_FILE);
        PsiFile psiFile = event.getData(CommonDataKeys.PSI_FILE);

        if (editor == null || virtualFile == null) {
            return null;
        }

        Document document = editor.getDocument();
        SelectionModel selectionModel = editor.getSelectionModel();
        int caretOffset = editor.getCaretModel().getOffset();
        int startOffset = selectionModel.hasSelection() ? selectionModel.getSelectionStart() : caretOffset;
        int endOffset = selectionModel.hasSelection() ? inclusiveSelectionEndOffset(selectionModel) : caretOffset;
        int startLine = document.getLineNumber(clampDocumentOffset(document, startOffset)) + 1;
        int endLine = document.getLineNumber(clampDocumentOffset(document, endOffset)) + 1;
        String symbol = resolveSymbol(psiFile, startOffset);

        return new EditorContextSnapshot(
                resolveFilePath(project, virtualFile),
                symbol,
                startLine,
                endLine,
                resolveAnchor(document, startLine, endLine, symbol)
        );
    }

    private static int inclusiveSelectionEndOffset(@NotNull SelectionModel selectionModel) {
        int startOffset = selectionModel.getSelectionStart();
        int endOffset = selectionModel.getSelectionEnd();
        return endOffset <= startOffset ? startOffset : endOffset - 1;
    }

    private static int clampDocumentOffset(@NotNull Document document, int offset) {
        return Math.max(0, Math.min(offset, document.getTextLength()));
    }

    private static String resolveFilePath(@Nullable Project project, @NotNull VirtualFile virtualFile) {
        if (project != null) {
            VirtualFile projectDir = ProjectUtil.guessProjectDir(project);
            if (projectDir != null) {
                String relativePath = VfsUtilCore.getRelativePath(virtualFile, projectDir, '/');
                if (relativePath != null && !relativePath.isBlank()) {
                    return relativePath;
                }
            }
        }

        return virtualFile.getPath();
    }

    private static @Nullable String resolveSymbol(@Nullable PsiFile psiFile, int offset) {
        if (psiFile == null || psiFile.getTextLength() == 0) {
            return null;
        }

        PsiElement element = findContextElement(psiFile, offset);
        if (element == null) {
            return null;
        }

        List<String> symbolParts = new ArrayList<>();
        for (PsiElement current = element; current != null && current != psiFile; current = current.getParent()) {
            if (current instanceof PsiNamedElement namedElement && isStructuralNamedElement(namedElement)) {
                String name = namedElement.getName();
                if (name != null && !name.isBlank()) {
                    symbolParts.add(name.trim());
                }
            }
        }

        if (symbolParts.isEmpty()) {
            return null;
        }

        Collections.reverse(symbolParts);
        return String.join(".", symbolParts);
    }

    private static @Nullable PsiElement findContextElement(@NotNull PsiFile psiFile, int offset) {
        int clampedOffset = Math.max(0, Math.min(offset, psiFile.getTextLength() - 1));
        PsiElement element = psiFile.findElementAt(clampedOffset);
        if (element == null && clampedOffset > 0) {
            return psiFile.findElementAt(clampedOffset - 1);
        }
        return element;
    }

    private static boolean isStructuralNamedElement(@NotNull PsiNamedElement namedElement) {
        String typeName = namedElement.getClass().getSimpleName().toLowerCase(Locale.ROOT);
        for (String keyword : STRUCTURAL_SYMBOL_KEYWORDS) {
            if (typeName.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private static @Nullable String resolveAnchor(
            @NotNull Document document,
            int startLine,
            int endLine,
            @Nullable String symbol
    ) {
        if (startLine == endLine) {
            return normalizeAnchor(lineText(document, startLine - 1));
        }

        if (symbol != null) {
            return null;
        }

        return normalizeAnchor(firstNonEmptyLine(document, startLine - 1, endLine - 1));
    }

    private static String firstNonEmptyLine(@NotNull Document document, int startLine, int endLine) {
        for (int line = startLine; line <= endLine; line++) {
            String text = lineText(document, line);
            if (!text.isBlank()) {
                return text;
            }
        }

        return lineText(document, startLine);
    }

    private static String lineText(@NotNull Document document, int zeroBasedLine) {
        int safeLine = Math.max(0, Math.min(zeroBasedLine, document.getLineCount() - 1));
        int lineStartOffset = document.getLineStartOffset(safeLine);
        int lineEndOffset = document.getLineEndOffset(safeLine);
        return document.getText(TextRange.create(lineStartOffset, lineEndOffset));
    }

    private static @Nullable String normalizeAnchor(@Nullable String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim().replaceAll("\\s+", " ");
        if (normalized.isEmpty()) {
            return null;
        }

        if (normalized.length() <= MAX_ANCHOR_LENGTH) {
            return normalized;
        }

        return normalized.substring(0, MAX_ANCHOR_LENGTH - 3) + "...";
    }
}
