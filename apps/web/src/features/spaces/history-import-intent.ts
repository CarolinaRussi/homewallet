const OFFER_KEY = "hw_history_import_offer";
const DONE_KEY = "hw_history_import_done";

export function setHistoryImportOffer(targetSpaceId: string) {
  sessionStorage.setItem(OFFER_KEY, targetSpaceId);
}

export function peekHistoryImportOffer(): string | null {
  return sessionStorage.getItem(OFFER_KEY);
}

export function clearHistoryImportOffer() {
  sessionStorage.removeItem(OFFER_KEY);
}

export function setHistoryImportDone() {
  sessionStorage.setItem(DONE_KEY, "1");
}

export function takeHistoryImportDone() {
  const value = sessionStorage.getItem(DONE_KEY);
  sessionStorage.removeItem(DONE_KEY);
  return value === "1";
}
