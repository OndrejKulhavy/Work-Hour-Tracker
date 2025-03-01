import { promisify } from "util";
import { exec } from "child_process";
import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import { WorkSession } from "./storage";

const execAsync = promisify(exec);

/**
 * Builds the complete HTML content to be displayed.
 */
export function buildHTMLContent(month: number, year: number, sessionsMap: Map<string, WorkSession[]>): string {
  const numDays = getDaysInMonth(year, month);
  let totalHours = 0;
  let tableRows = "";

  for (let day = 1; day <= numDays; day++) {
    const dateKey = constructDateKey(year, month, day);
    const dailySessions = sessionsMap.get(dateKey) || [];

    const { firstSessionStart, lastSessionEnd, dailyHours } = calculateDailySessions(dailySessions);
    if (dailyHours > 0) {
      totalHours += dailyHours;
    }

    const rowClass = dailyHours > 0 ? "worked" : "not-worked";
    const since = dailyHours > 0 && firstSessionStart ? formatTime(firstSessionStart) : "";
    const till = dailyHours > 0 && lastSessionEnd ? formatTime(lastSessionEnd) : "";

    tableRows += `
      <tr class="${rowClass}">
        <td contenteditable="false">${day}</td>
        <td contenteditable="false">${since}</td>
        <td contenteditable="false">${till}</td>
        <td contenteditable="false">${dailyHours > 0 ? dailyHours.toFixed(2) : ""}</td>
      </tr>`;
  }

  return buildHTML(month, year, tableRows, totalHours);
}

/**
 * Writes the summary to a local HTML file.
 */
export async function writeSummaryToFile(year: number, month: number, htmlContent: string): Promise<string> {
  const outputFile = path.join(os.tmpdir(), `work-summary-${year}-${month}.html`);
  await fs.writeFile(outputFile, htmlContent, "utf8");
  return outputFile;
}

/**
 * Opens the summary using the system's default browser.
 */
export async function openSummaryInBrowser(filePath: string): Promise<void> {
  await execAsync(`open "${filePath}"`);
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

/**
 * Builds the final HTML string with styling, table content, and script logic.
 */
function buildHTML(month: number, year: number, rows: string, totalHours: number) {
  return `
    <html>
      <head>
        <title>Work Summary</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f8f8f8;
            margin: 0;
            padding: 0;
          }
          h1 {
            text-align: center;
            margin-top: 20px;
          }
          table {
            margin: 20px auto;
            border-collapse: collapse;
            width: 80%;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 12px;
            text-align: center;
          }
          .worked {
            background-color: #dfffe0; /* pastel green */
          }
          .not-worked {
            background-color: #ffd9d9; /* pastel red */
          }
          button {
            display: inline-block;
            margin: 10px auto;
            margin-right: 10px;
            padding: 10px 20px;
            background-color: #cddffa;
            border: none;
            cursor: pointer;
            font-size: 16px;
          }
          .button-container {
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>Work Summary ${month}/${year}</h1>
        <div class="button-container">
          <button onclick="toggleEditMode()">Toggle Edit Mode</button>
          <button onclick="copyTableToClipboard()">Copy Table</button>
        </div>
        <table>
          <tr>
            <th>Day</th>
            <th>Since</th>
            <th>Till</th>
            <th>Hours</th>
          </tr>
          ${rows}
        </table>
        <p style="text-align: center;"><strong>Total Hours: ${totalHours.toFixed(2)}</strong></p>
        <script>
          function toggleEditMode() {
            const cells = document.querySelectorAll("table td");
            cells.forEach(cell => {
              cell.contentEditable = cell.contentEditable === "true" ? "false" : "true";
            });
          }
          
          function copyTableToClipboard() {
            // Skip header row
            const tableRows = Array.from(document.querySelectorAll("table tr")).slice(1);
            const tableContent = tableRows
              .map(row => Array.from(row.querySelectorAll("th, td"))
                .map(cell => cell.innerText)
                .join("\\t"))
              .join("\\n");
            const el = document.createElement("textarea");
            el.value = tableContent;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            alert("Table content copied to clipboard.");
          }
        </script>
      </body>
    </html>
  `;
}
