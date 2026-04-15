package dev.codewhere.jetbrains.actions;

import com.intellij.notification.Notification;
import com.intellij.notification.NotificationType;
import com.intellij.notification.Notifications;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.ide.CopyPasteManager;
import com.intellij.openapi.project.DumbAwareAction;
import dev.codewhere.jetbrains.context.EditorContextSnapshot;
import dev.codewhere.jetbrains.context.EditorContextSnapshotBuilder;
import org.jetbrains.annotations.NotNull;

import java.awt.datatransfer.StringSelection;

public final class CopyCodeWhereDescriptionAction extends DumbAwareAction {
    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }

    @Override
    public void update(@NotNull AnActionEvent event) {
        boolean hasEditor = event.getData(CommonDataKeys.EDITOR) != null;
        boolean hasFile = event.getData(CommonDataKeys.VIRTUAL_FILE) != null;

        event.getPresentation().setEnabledAndVisible(hasEditor && hasFile);
    }

    @Override
    public void actionPerformed(@NotNull AnActionEvent event) {
        EditorContextSnapshot snapshot = EditorContextSnapshotBuilder.from(event);

        if (snapshot == null) {
            Notifications.Bus.notify(
                    new Notification(
                            "CodeWhere",
                            "CodeWhere context unavailable",
                            "No editor context could be captured from the current event.",
                            NotificationType.WARNING
                    ),
                    event.getProject()
            );
            return;
        }

        CopyPasteManager.getInstance().setContents(new StringSelection(snapshot.toPlainText()));

        Notifications.Bus.notify(
                new Notification(
                        "CodeWhere",
                        "CodeWhere context copied",
                        "Copied semantic editor context for the current location or selection.",
                        NotificationType.INFORMATION
                ),
                event.getProject()
        );
    }
}
