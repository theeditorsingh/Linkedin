// Helpers for the <input type="datetime-local"> schedule pickers.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Tomorrow at 09:00, formatted for datetime-local
export function defaultScheduleTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

// "Now", formatted for the input's min attribute
export function nowISOMin(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
