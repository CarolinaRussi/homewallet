export function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month: string, delta: number) {
  const [yearText, monthText] = month.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function todayIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Persist month-only entries as the first day of that month. */
export function monthToOccurredOn(month: string) {
  return `${month}-01`;
}

export function occurredOnToMonth(occurredOn: string) {
  return occurredOn.slice(0, 7);
}

export function formatEntryDate(
  occurredOn: string,
  entryDateMode: "month" | "day"
) {
  return entryDateMode === "month" ? occurredOnToMonth(occurredOn) : occurredOn;
}
