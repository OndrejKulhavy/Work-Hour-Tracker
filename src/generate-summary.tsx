import { showToast, Toast, ActionPanel, Action, Form, Clipboard, showHUD } from "@raycast/api";
import { validateMonthYear, getSessionsForMonthYear } from "./utils";
import { buildHTMLContent, writeSummaryToFile, openSummaryInBrowser } from "./htmlExport";
import { WorkSession } from "./storage";

/**
 * Main command for generating a monthly summary in Raycast.
 */
export default function GenerateSummaryCommand() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Summary"
            onSubmit={(values) => handleFormSubmit(values.month, values.year)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="month" title="Month">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <Form.Dropdown.Item key={m} value={String(m)} title={String(m)} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="year" title="Year (YYYY)" defaultValue="2025" />
    </Form>
  );
}

/**
 * Handles the form submission and initiates summary generation.
 */
async function handleFormSubmit(monthInput: string, yearInput: string) {
  try {
    const month = parseInt(monthInput, 10);
    const year = parseInt(yearInput, 10);

    validateMonthYear(month, year);
    const sessionsMap = await getSessionsForMonthYear(month, year);

    // Build the HTML summary and write it to an HTML file
    const htmlContent = buildHTMLContent(month, year, sessionsMap);
    const outputFile = await writeSummaryToFile(year, month, htmlContent);

    // Open the summary in the default browser
    await openSummaryInBrowser(outputFile);

    // Copy the same table content that the web button copies
    const textToCopy = buildClipboardSummary(month, year, sessionsMap);
    await Clipboard.copy(textToCopy);

    // Show a toast and a HUD that it's copied
    await showToast(Toast.Style.Success, "Summary generated");
    await showHUD("Summary copied to clipboard");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to generate summary", String(error));
  }
}

/**
 * Builds the text that would be copied to the clipboard, mirroring the web button's output.
 */
function buildClipboardSummary(month: number, year: number, sessionsMap: Map<string, WorkSession[]>): string {
  const numDays = getDaysInMonth(year, month);
  const lines: string[] = [];
  lines.push("Day\tSince\tTill\tHours");

  for (let day = 1; day <= numDays; day++) {
    const dateKey = constructDateKey(year, month, day);
    const dailySessions = sessionsMap.get(dateKey) || [];
    const { firstSessionStart, lastSessionEnd, dailyHours } = calculateDailySessions(dailySessions);

    const since = dailyHours > 0 && firstSessionStart ? formatTime(firstSessionStart) : "";
    const till = dailyHours > 0 && lastSessionEnd ? formatTime(lastSessionEnd) : "";
    const hours = dailyHours > 0 ? dailyHours.toFixed(2) : "";

    lines.push(`${day}\t${since}\t${till}\t${hours}`);
  }

  return lines.join("\n");
}

/**
 * Constructs a date key formatted as YYYY-MM-DD.
 */
function constructDateKey(year: number, month: number, day: number): string {
  const monthString = String(month).padStart(2, "0");
  const dayString = String(day).padStart(2, "0");
  return `${year}-${monthString}-${dayString}`;
}

/**
 * Retrieves the correct number of days in the specified month/year.
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates the start time, end time, and daily hours for a given set of sessions.
 */
function calculateDailySessions(sessions: WorkSession[]) {
  let firstSessionStart: Date | null = null;
  let lastSessionEnd: Date | null = null;
  let dailyHours = 0;

  for (const session of sessions) {
    if (!session.end_time) {
      continue;
    }
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    dailyHours += hours;

    if (!firstSessionStart || start < firstSessionStart) {
      firstSessionStart = start;
    }
    if (!lastSessionEnd || end > lastSessionEnd) {
      lastSessionEnd = end;
    }
  }

  return { firstSessionStart, lastSessionEnd, dailyHours };
}

/**
 * Formats a Date object as HH:MM.
 */
function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
