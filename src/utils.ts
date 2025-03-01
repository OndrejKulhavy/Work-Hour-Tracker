import { getAllDates, getSessionsForDate, WorkSession } from "./storage";

export function validateMonthYear(month: number, year: number) {
  if (isNaN(month) || isNaN(year)) {
    throw new Error("Invalid input for month or year");
  }
}

export async function getSessionsForMonthYear(month: number, year: number) {
  const allDates = await getAllDates();
  const sessionsMap = new Map<string, WorkSession[]>();

  for (const dateKey of allDates) {
    const [thisYear, thisMonth] = dateKey.split("-").map((p) => parseInt(p, 10));
    if (thisYear === year && thisMonth === month) {
      const sessions = await getSessionsForDate(dateKey);
      sessionsMap.set(dateKey, sessions);
    }
  }

  if (sessionsMap.size === 0) {
    throw new Error("No sessions found for this month/year.");
  }

  return sessionsMap;
}
