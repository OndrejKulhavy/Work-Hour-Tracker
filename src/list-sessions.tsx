import { showToast, Toast, ActionPanel, Action, Form } from "@raycast/api";
import { getAllDates, getSessionsForDate } from "./storage";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

interface WorkSession {
  id: number;
  start_time: string;
  end_time?: string;
}

export default function ListSessionsCommand() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Summary"
            onSubmit={(values) => generateSummary(values.month, values.year)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="month" title="Month (1-12)" defaultValue="1" />
      <Form.TextField id="year" title="Year (YYYY)" defaultValue="2025" />
    </Form>
  );
}

/**
 * Summarizes sessions for a given month/year by collecting
 * local storage keys that fall within that month/year.
 */
async function generateSummary(monthInput: string, yearInput: string) {
  try {
    const month = parseInt(monthInput, 10);
    const year = parseInt(yearInput, 10);

    if (isNaN(month) || isNaN(year)) {
      throw new Error("Invalid input for month or year");
    }

    // Gather all relevant date keys
    const allDates = await getAllDates();
    // Filter out those that match the specified month/year
    const matchingKeys = allDates.filter((dateKey) => {
      const [thisYear, thisMonth] = dateKey.split("-").map((p) => parseInt(p, 10));
      return thisYear === year && thisMonth === month;
    });

    if (!matchingKeys.length) {
      await showToast(Toast.Style.Failure, "No sessions found for this month/year.");
      return;
    }

    // Retrieve sessions for each matching date
    const allSessions: { date: string; sessions: WorkSession[] }[] = [];
    for (const dateKey of matchingKeys) {
      const sessions = await getSessionsForDate(dateKey);
      allSessions.push({ date: dateKey, sessions });
    }

    // Flatten all sessions into one array for total hour calculation
    let totalHours = 0;
    let htmlTableRows = "";

    for (const entry of allSessions) {
      const dateLabel = entry.date;
      for (const session of entry.sessions) {
        if (!session.end_time) {
          continue;
        }

        const start = new Date(session.start_time);
        const end = new Date(session.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalHours += hours;

        const startTime = formatTime(start);
        const endTime = formatTime(end);
        htmlTableRows += `<tr><td>${dateLabel}</td><td>${startTime} - ${endTime}</td><td>${hours.toFixed(2)}</td></tr>`;
      }
    }

    const htmlContent = buildHTML(month, year, htmlTableRows, totalHours);

    // Write HTML to a temp file
    const outputFile = path.join(os.tmpdir(), `work-summary-${year}-${month}.html`);
    const fs = await import("fs/promises");
    await fs.writeFile(outputFile, htmlContent, "utf8");

    // Open in default browser
    await execAsync(`open "${outputFile}"`);

    await showToast(Toast.Style.Success, "Summary generated");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to generate summary", String(error));
  }
}

function formatTime(date: Date) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildHTML(month: number, year: number, rows: string, totalHours: number) {
  return `
<html>
<head><title>Work Summary</title></head>
<body>
  <h1>Work Summary ${month}/${year}</h1>
  <table border='1' cellspacing='0' cellpadding='5'>
    <tr>
      <th>Date</th>
      <th>Time Range</th>
      <th>Hours</th>
    </tr>
    ${rows}
  </table>
  <p><strong>Total Hours: ${totalHours.toFixed(2)}</strong></p>
</body>
</html>
`;
}
