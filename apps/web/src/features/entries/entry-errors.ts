import type { MessageKey } from "../../shared/lib/i18n/messages";

const ENTRY_ERROR_KEYS: Record<string, MessageKey> = {
  "cardLines sum cannot exceed amount": "me.cardLinesOver",
  "Installment does not fit a future statement total":
    "me.cardInstallmentFutureFit",
  "This category does not allow statement detail": "me.cardDetailNotAllowed",
  "cardLines are only allowed on expenses": "me.cardDetailExpenseOnly",
};

export function mapEntryError(
  error: unknown,
  t: (key: MessageKey) => string
): string {
  const raw = error instanceof Error ? error.message : "";
  const key = ENTRY_ERROR_KEYS[raw];
  return key ? t(key) : raw || t("auth.errorGeneric");
}
