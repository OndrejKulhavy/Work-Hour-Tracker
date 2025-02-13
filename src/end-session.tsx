import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getSessionsForDate, saveSessionsForDate, WorkSession } from "./storage";

/**
 * This command ends the most recent active work session for today's date.
 * It allows optional inputs for session description and tag.
 */
export default function EndSessionCommand() {
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");

  async function handleSubmit() {
    try {
      const now = new Date().toISOString();
      const todayKey = now.split("T")[0]; // YYYY-MM-DD

      // Get existing sessions for today's date
      const sessions = await getSessionsForDate(todayKey);
      if (!sessions.length) {
        await showToast(Toast.Style.Failure, "No sessions found for today.");
        return;
      }

      // Find the most recent session that doesn't have an end_time
      const unfinishedIndex = sessions
        .slice()
        .reverse()
        .findIndex((session) => !session.end_time);

      if (unfinishedIndex === -1) {
        await showToast(Toast.Style.Failure, "No active session to end.");
        return;
      }

      // Calculate the real index from reversed array index
      const realIndex = sessions.length - 1 - unfinishedIndex;
      sessions[realIndex].end_time = now;

      // Assign optional description and tag
      if (description.trim().length > 0) {
        sessions[realIndex].description = description.trim();
      }
      if (tag.trim().length > 0) {
        sessions[realIndex].tag = tag.trim();
      }

      // Save updated sessions
      await saveSessionsForDate(todayKey, sessions);

      await showToast(Toast.Style.Success, "Work session ended");
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
      <Form.TextField
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
