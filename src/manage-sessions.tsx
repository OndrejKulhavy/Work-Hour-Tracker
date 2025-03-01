import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getAllDates, getSessionsForDate, saveSessionsForDate, WorkSession } from "./storage";

/**
 * Formats a given Date object as "HH hours MM minutes".
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Given a difference in milliseconds, formats it as "HH hours MM minutes".
 */
function formatTimeDiff(diffInMs: number): string {
  const totalMinutes = Math.floor(diffInMs / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")} h ${String(minutes).padStart(2, "0")} min`;
}

/**
 * Main command component that lists sessions in descending date order (most recent first),
 * provides filtering by month/year or viewing them all,
 * offers session removal or editing, as well as session addition.
 * The "Remove All Data" action is only accessible under the "More" menu.
 * Each session shows start/end times and total length in "HH hours MM minutes".
 * Each day shows how many sessions and total day hours in "HH hours MM minutes".
 */
export default function ManageSessionsCommand() {
  const [sessionsMap, setSessionsMap] = useState<Map<string, WorkSession[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [selectedFilter, setSelectedFilter] = useState<string>("all"); // "all" means no specific month-year filtering

  // Load sessions on mount
  useEffect(() => {
    reloadSessions(setSessionsMap, setIsLoading).then();
  }, []);

  // Build set of "YYYY-MM" from loaded sessions
  const monthYearOptions = useMemo(() => {
    const setOfMonths = new Set<string>();
    for (const dateKey of sessionsMap.keys()) {
      // dateKey is "YYYY-MM-DD"
      const [year, month] = dateKey.split("-").map((p) => parseInt(p, 10));
      const monthStr = String(month).padStart(2, "0");
      setOfMonths.add(`${year}-${monthStr}`);
    }
    return Array.from(setOfMonths).sort();
  }, [sessionsMap]);

  // Based on the filter, decide which dates to show, then sort descending so newest date is first
  const filteredKeys = useMemo(() => {
    let keys = [...sessionsMap.keys()];
    if (selectedFilter !== "all") {
      keys = keys.filter((dateKey) => {
        const [year, month] = dateKey.split("-").map((p) => parseInt(p, 10));
        const keyMonthYear = `${year}-${String(month).padStart(2, "0")}`;
        return keyMonthYear === selectedFilter;
      });
    }
    keys.sort(); // ascending
    keys.reverse(); // descending
    return keys;
  }, [sessionsMap, selectedFilter]);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Month/Year or show all" storeValue onChange={setSelectedFilter}>
          <List.Dropdown.Item key="all" title="All" value="all" />
          {monthYearOptions.map((ym) => (
            <List.Dropdown.Item key={ym} title={ym} value={ym} />
          ))}
        </List.Dropdown>
      }
    >
      {/* "Add New Session" button */}
      <List.Item
        title="Add New Session"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add"
              target={<AddOrEditSession onSessionSaved={() => reloadSessions(setSessionsMap, setIsLoading)} />}
            />
          </ActionPanel>
        }
      />

      {/* "More" menu containing the "Remove All Data" button */}
      <List.Item
        title="More"
        icon={Icon.Ellipsis}
        actions={
          <ActionPanel>
            <Action
              title="Remove All Data"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => handleRemoveAllData(setSessionsMap, setIsLoading)}
            />
          </ActionPanel>
        }
      />

      {/* Sessions grouped by date, sorted descending by date, and each session sorted by start time */}
      {filteredKeys.map((dateKey) => {
        // sort sessions by ascending start time
        const sessions = [...(sessionsMap.get(dateKey) || [])].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );

        // compute total day ms
        const totalDayMs = sessions.reduce((sum, session) => {
          if (session.start_time && session.end_time) {
            return sum + (new Date(session.end_time).getTime() - new Date(session.start_time).getTime());
          }
          return sum;
        }, 0);

        return (
          <List.Section
            key={dateKey}
            title={dateKey}
            subtitle={`Sessions: ${sessions.length}, Total Hours: ${formatTimeDiff(totalDayMs)}`}
          >
            {sessions.map((session) => {
              const startTimeFormatted = session.start_time ? formatTime(new Date(session.start_time)) : "";
              const endTimeFormatted = session.end_time ? formatTime(new Date(session.end_time)) : "";
              let lengthHrs = "N/A";
              if (session.start_time && session.end_time) {
                const diffMs = new Date(session.end_time).getTime() - new Date(session.start_time).getTime();
                lengthHrs = formatTimeDiff(diffMs);
              }

              return (
                <List.Item
                  key={session.id}
                  // Main focus is on the times, show them as the title
                  title={`${startTimeFormatted} - ${endTimeFormatted}`}
                  // Description is shown as the subtitle
                  subtitle={session.description || ""}
                  // Keep total hours as an accessory
                  accessories={[{ text: `Total: ${lengthHrs}` }]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Edit"
                        icon={Icon.Pencil}
                        target={
                          <AddOrEditSession
                            existingSession={session}
                            dateKey={dateKey}
                            onSessionSaved={() => reloadSessions(setSessionsMap, setIsLoading)}
                          />
                        }
                      />
                      <Action
                        title="Remove"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleRemoveSession(dateKey, session.id, setSessionsMap, setIsLoading)}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

/**
 * Completely removes all sessions (clears local storage).
 * Now only accessible under the "More" menu.
 */
async function handleRemoveAllData(
  setSessionsMap: React.Dispatch<React.SetStateAction<Map<string, WorkSession[]>>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  if (
    await confirmAlert({
      title: "Remove All Data?",
      message: "This will permanently remove all stored sessions",
      primaryAction: {
        title: "Confirm",
        style: Alert.ActionStyle.Destructive,
      },
    })
  ) {
    setIsLoading(true);
    try {
      await LocalStorage.clear();
      setSessionsMap(new Map());
      await showToast(Toast.Style.Success, "All data removed");
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to remove all data", String(error));
    } finally {
      setIsLoading(false);
    }
  }
}

/**
 * Removes a session by ID from the specified dateKey in storage.
 */
async function handleRemoveSession(
  dateKey: string,
  sessionId: number,
  setSessionsMap: React.Dispatch<React.SetStateAction<Map<string, WorkSession[]>>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  if (
    await confirmAlert({
      title: "Remove Session?",
      primaryAction: {
        title: "Confirm",
        style: Alert.ActionStyle.Destructive,
      },
    })
  ) {
    setIsLoading(true);
    try {
      const sessions = await getSessionsForDate(dateKey);
      const updatedSessions = sessions.filter((s) => s.id !== sessionId);
      await saveSessionsForDate(dateKey, updatedSessions);
      await reloadSessions(setSessionsMap, setIsLoading);
      await showToast(Toast.Style.Success, "Session removed");
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to remove session", String(error));
      setIsLoading(false);
    }
  }
}

/**
 * Simple helper to reload all sessions from storage into the state.
 */
async function reloadSessions(
  setSessionsMap: React.Dispatch<React.SetStateAction<Map<string, WorkSession[]>>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  setIsLoading(true);
  try {
    const allDates = await getAllDates();
    const newSessionsMap = new Map<string, WorkSession[]>();
    for (const dateKey of allDates) {
      const sessions = await getSessionsForDate(dateKey);
      newSessionsMap.set(dateKey, sessions);
    }
    setSessionsMap(newSessionsMap);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error loading sessions", String(error));
  } finally {
    setIsLoading(false);
  }
}

/**
 * Component for either adding a new session or editing an existing session.
 */
function AddOrEditSession(props: { existingSession?: WorkSession; dateKey?: string; onSessionSaved: () => void }) {
  const { pop } = useNavigation();
  const editing = !!props.existingSession;

  // We'll store date, start time, end time separately, then combine them into ISO strings on submit.
  const [selectedDate, setSelectedDate] = useState<Date | null>(() =>
    props.dateKey
      ? new Date(props.dateKey)
      : props.existingSession?.start_time
        ? new Date(props.existingSession.start_time)
        : null
  );
  const [selectedDateError, setSelectedDateError] = useState<string | undefined>();

  const [startTime, setStartTime] = useState(() =>
    props.existingSession?.start_time ? extractHHmm(props.existingSession.start_time) : ""
  );
  const [startTimeError, setStartTimeError] = useState<string | undefined>();

  const [endTime, setEndTime] = useState(() =>
    props.existingSession?.end_time ? extractHHmm(props.existingSession.end_time) : ""
  );
  const [endTimeError, setEndTimeError] = useState<string | undefined>();

  const [description, setDescription] = useState(props.existingSession?.description || "");
  const [tag, setTag] = useState(props.existingSession?.tag || "");

  function validateDate(date: Date | null) {
    setSelectedDate(date);
    setSelectedDateError(!date ? "Date is required." : undefined);
  }

  function validateStartTime(value: string) {
    setStartTime(value);
    if (!isValidTime(value)) {
      setStartTimeError("Invalid time format (use HH:mm).");
    } else {
      setStartTimeError(undefined);
    }
  }

  function validateEndTime(value: string) {
    setEndTime(value);
    if (value && !isValidTime(value)) {
      setEndTimeError("Invalid time format (use HH:mm).");
    } else {
      setEndTimeError(undefined);
    }
  }

  async function handleSubmit() {
    // Final validation before saving
    if (!selectedDate) {
      setSelectedDateError("Date is required.");
      return;
    }
    if (startTimeError || endTimeError || selectedDateError) {
      // If there is a validation error already, do not proceed
      await showToast(Toast.Style.Failure, "Please fix validation errors first.");
      return;
    }
    if (!isValidTime(startTime)) {
      setStartTimeError("Invalid time format (use HH:mm).");
      await showToast(Toast.Style.Failure, "Invalid start time format.");
      return;
    }
    if (endTime && !isValidTime(endTime)) {
      setEndTimeError("Invalid time format (use HH:mm).");
      await showToast(Toast.Style.Failure, "Invalid end time format.");
      return;
    }

    const startISO = buildDateTime(selectedDate, startTime);
    const endISO = endTime ? buildDateTime(selectedDate, endTime) : undefined;

    // If both times are provided, ensure start < end
    if (startISO && endISO && new Date(endISO).getTime() < new Date(startISO).getTime()) {
      setEndTimeError("End time must be after start time.");
      await showToast(Toast.Style.Failure, "End time must be after start time.");
      return;
    }

    try {
      const dateKey = toYYYYMMDD(selectedDate);
      const sessions = await getSessionsForDate(dateKey);

      if (editing && props.existingSession) {
        const updatedSessions = sessions.map((s) =>
          s.id === props.existingSession?.id
            ? {
              ...s,
              start_time: startISO,
              end_time: endISO,
              description,
              tag,
            }
            : s
        );
        await saveSessionsForDate(dateKey, updatedSessions);
      } else {
        const newSession: WorkSession = {
          id: getNextId(sessions),
          start_time: startISO,
          end_time: endISO,
          description,
          tag,
        };
        sessions.push(newSession);
        await saveSessionsForDate(dateKey, sessions);
      }

      await showToast(Toast.Style.Success, `Session ${editing ? "updated" : "added"}`);
      props.onSessionSaved();
      pop();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to save session", String(error));
    }
  }

  async function handleRemove() {
    if (
      await confirmAlert({
        title: "Remove Session?",
        primaryAction: {
          title: "Confirm",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        const sessions = await getSessionsForDate(props.dateKey || toYYYYMMDD(new Date()));
        const updatedSessions = sessions.filter((s) => s.id !== props.existingSession?.id);
        await saveSessionsForDate(props.dateKey || toYYYYMMDD(new Date()), updatedSessions);
        await showToast(Toast.Style.Success, "Session removed");
        props.onSessionSaved();
        pop();
      } catch (error) {
        await showToast(Toast.Style.Failure, "Failed to remove session", String(error));
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={editing ? "Save" : "Add"} onSubmit={handleSubmit} />
          {editing && (
            <Action title="Remove" icon={Icon.Trash} style={Action.Style.Destructive} onAction={handleRemove} />
          )}
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="selectedDate"
        title="Date"
        value={selectedDate || null}
        onChange={validateDate}
        error={selectedDateError}
        type={Form.DatePicker.Type.Date}
      />
      <Form.TextField
        id="startTime"
        title="Time From (HH:mm)"
        placeholder="e.g. 09:30"
        value={startTime}
        onChange={validateStartTime}
        error={startTimeError}
      />
      <Form.TextField
        id="endTime"
        title="Time Till (HH:mm)"
        placeholder="e.g. 17:00"
        value={endTime}
        onChange={validateEndTime}
        error={endTimeError}
      />
      <Form.TextField
        id="description"
        title="Description"
        value={description}
        onChange={setDescription}
      />
      <Form.TextField id="tag" title="Tag" value={tag} onChange={setTag} />
    </Form>
  );
}

/**
 * Converts a Date object to "YYYY-MM-DD" string.
 */
function toYYYYMMDD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Given a Date object and a "HH:mm" string, returns an ISO string combining them.
 */
function buildDateTime(date: Date, hhmm: string): string {
  const parts = hhmm.split(":");
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  const result = new Date(date);
  result.setHours(hh, mm, 0, 0);
  return result.toISOString();
}

/**
 * Extracts "HH:mm" (zero-padded) from an ISO string date/time.
 */
function extractHHmm(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Simple validation utility for a "HH:mm" time string.
 */
function isValidTime(val: string): boolean {
  if (!/^\d{1,2}:\d{2}$/.test(val)) {
    return false;
  }
  const [hh, mm] = val.split(":");
  const hour = parseInt(hh, 10);
  const minute = parseInt(mm, 10);
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60;
}

/**
 * Finds the next available numeric ID to assign to a new session.
 */
function getNextId(sessions: WorkSession[]): number {
  if (sessions.length === 0) return 1;
  return Math.max(...sessions.map((s) => s.id)) + 1;
}
