import { showToast, Toast } from "@raycast/api";
import { getSessionsForDate, saveSessionsForDate, WorkSession } from "./storage";

/**
 * Starts a new work session by adding it to today's list in local storage.
 */
export default async function startSession() {
  try {
    const now = new Date().toISOString();
    const todayKey = now.split("T")[0]; // YYYY-MM-DD

    // Get existing sessions for today's date
    const existing = await getSessionsForDate(todayKey);

    // Create a new session
    const newSession: WorkSession = {
      id: existing.length ? existing[existing.length - 1].id + 1 : 1,
      start_time: now,
    };

    existing.push(newSession);
    await saveSessionsForDate(todayKey, existing);

    await showToast(Toast.Style.Success, "Work session started");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to start session", String(error));
  }
}
