import { LocalStorage } from "@raycast/api";

export interface WorkSession {
  id: number;
  start_time: string;
  end_time?: string;
  description?: string;
  tag?: string;
}

/**
 * Retrieves all sessions (array of WorkSession objects) for a given date (YYYY-MM-DD).
 * If none found, returns an empty array.
 */
export async function getSessionsForDate(dateKey: string): Promise<WorkSession[]> {
  const sessionsString = await LocalStorage.getItem<string>(dateKey);
  if (!sessionsString) {
    return [];
  }
  try {
    return JSON.parse(sessionsString) as WorkSession[];
  } catch {
    // If parsing fails, return an empty array
    return [];
  }
}

/**
 * Saves an array of WorkSession objects for a given date (YYYY-MM-DD).
 */
export async function saveSessionsForDate(dateKey: string, sessions: WorkSession[]): Promise<void> {
  await LocalStorage.setItem(dateKey, JSON.stringify(sessions));
}

/**
 * Retrieves all keys (dates) stored in local storage.
 * Can be used for summary generation of multiple days or months.
 */
export async function getAllDates(): Promise<string[]> {
  const allItems = await LocalStorage.allItems();
  return Object.keys(allItems);
}
