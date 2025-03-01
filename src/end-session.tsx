import { ActionPanel, Action, Form, showToast, Toast, LaunchProps, closeMainWindow, showHUD } from "@raycast/api";
import { useState } from "react";
import { getSessionsForDate, saveSessionsForDate, WorkSession } from "./storage";

/**
 * This command ends the most recent active work session for today's date.
 * It allows optional inputs for session description and tag.
 */
export default function EndSessionCommand(props: LaunchProps<{ arguments: Arguments.EndSession }>) {
  const [description, setDescription] = useState(props.arguments.description || "");
  const [tag, setTag] = useState(props.arguments.tag || "");

  async function handleSubmit() {
    try {
      const now: string = new Date().toISOString();
      const todayKey: string = now.split("T")[0]; // YYYY-MM-DD

      // Get existing sessions for today's date
      const sessionsToday: WorkSession[] = await getSessionsForDate(todayKey);
      if (!sessionsToday.length) {
        await showToast(Toast.Style.Failure, "No sessions found for today.");
        return;
      }

      // Find the most recent session that doesn't have an end_time
      const activeSessionIndex = sessionsToday
        .slice()
        .reverse()
        .findIndex((session) => !session.end_time);

      if (activeSessionIndex === -1) {
        await showToast(Toast.Style.Failure, "No active session to end.");
        return;
      }

      // Calculate the real index from reversed array index
      const realIndex: number = sessionsToday.length - 1 - activeSessionIndex;
      const session: WorkSession = sessionsToday[realIndex];
      session.end_time = now;

      // Assign optional description and tag
      if (description.trim().length > 0) {
        session.description = description.trim();
      }
      if (tag.trim().length > 0) {
        sessionsToday[realIndex].tag = tag.trim();
      }

      // Save updated sessions
      await saveSessionsForDate(todayKey, sessionsToday);

      await closeMainWindow({ clearRootSearch: true });
      await showHUD("Work session ended");
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to end session", String(error));
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="End Session" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="description"
        title="Description (optional)"
        placeholder="E.g., 'Worked on feature X'"
        value={description}
        onChange={setDescription}
      />
      <Form.TextField
        id="tag"
        title="Tag (optional)"
        placeholder="E.g., '#development'"
        value={tag}
        onChange={setTag}
      />
    </Form>
  );
}
