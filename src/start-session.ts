import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { getSessionsForDate, saveSessionsForDate, WorkSession } from "./storage";

/**
 * Generates a new unique ID for a work session based on the existing sessions for the day.
 *
 * @param sessionsToday An array of WorkSession objects representing the work sessions for the day.
 * @returns A number representing the new unique ID for the work session.
 */
function GenerateId(sessionsToday: WorkSession[]): number {
  return sessionsToday.length ? sessionsToday[sessionsToday.length - 1].id + 1 : 1;
}

/**
 * Starts a new work session by adding it to today's list in local storage.
 */
export default async function startSession() {
  try {
    const now = new Date().toISOString();
    const todayKey = now.split("T")[0]; // YYYY-MM-DD

    // Get existing sessions for today's date
    const sessionsToday = await getSessionsForDate(todayKey);

    // Create a new session
    const newSession: WorkSession = {
      id: GenerateId(sessionsToday),
      start_time: now,
    };

    // Save new session
    sessionsToday.push(newSession);
    await saveSessionsForDate(todayKey, sessionsToday);

    //Close raycast and notify the user
    await closeMainWindow();
    await showHUD("Work session started");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to start session", String(error));
  }
}
