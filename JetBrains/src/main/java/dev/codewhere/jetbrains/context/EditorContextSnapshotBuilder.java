package dev.codewhere.jetbrains.context;

import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.editor.LogicalPosition;
import com.intellij.openapi.editor.SelectionModel;
import com.intellij.openapi.util.TextRange;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.psi.PsiFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public final class EditorContextSnapshotBuilder {
    private EditorContextSnapshotBuilder() {
    }

    public static @Nullable EditorContextSnapshot from(@NotNull AnActionEvent event) {
        Editor editor = event.getData(CommonDataKeys.EDITOR);
        VirtualFile virtualFile = event.getData(CommonDataKeys.VIRTUAL_FILE);
        PsiFile psiFile = event.getData(CommonDataKeys.PSI_FILE);

        if (editor == null || virtualFile == null) {
            return null;
        }

        int caretOffset = editor.getCaretModel().getOffset();
        LogicalPosition logicalPosition = editor.offsetToLogicalPosition(caretOffset);
        SelectionModel selectionModel = editor.getSelectionModel();
        Document document = editor.getDocument();

        return new EditorContextSnapshot(
                "bootstrap-v1",
                virtualFile.getPath(),
                virtualFile.getName(),
                resolveLanguageId(psiFile, virtualFile),
                caretOffset,
                logicalPosition.line + 1,
                logicalPosition.column + 1,
                selectionModel.hasSelection(),
                selectionModel.hasSelection() ? selectionModel.getSelectionStart() : caretOffset,
                selectionModel.hasSelection() ? selectionModel.getSelectionEnd() : caretOffset,
                currentLineText(document, logicalPosition.line),
                selectionModel.hasSelection() ? selectionModel.getSelectedText() : null
        );
    }

    private static String resolveLanguageId(@Nullable PsiFile psiFile, @NotNull VirtualFile virtualFile) {
        if (psiFile != null) {
            return psiFile.getLanguage().getID();
        }

        return virtualFile.getFileType().getName();
    }

    private static String currentLineText(@NotNull Document document, int zeroBasedLine) {
        int lineStartOffset = document.getLineStartOffset(zeroBasedLine);
        int lineEndOffset = document.getLineEndOffset(zeroBasedLine);
        return document.getText(TextRange.create(lineStartOffset, lineEndOffset));
    }
}
