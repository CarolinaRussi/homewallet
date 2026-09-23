const DONE_KEY = "hw_leave_export_done";

export function setLeaveExportDone() {
  sessionStorage.setItem(DONE_KEY, "1");
}

export function takeLeaveExportDone() {
  const value = sessionStorage.getItem(DONE_KEY);
  sessionStorage.removeItem(DONE_KEY);
  return value === "1";
}
