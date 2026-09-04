import type { MessageKey } from "../../shared/lib/i18n/messages";

const AUTH_ERROR_KEYS: Record<string, MessageKey> = {
  "Invalid email": "auth.errorInvalidEmail",
  "Passcode must be at least 8 characters": "auth.errorPassMin",
  "Passcode is required": "auth.errorPassRequired",
  "Name is required": "auth.errorNameRequired",
  "Name is too long": "auth.errorNameTooLong",
  "Email already registered": "auth.errorEmailTaken",
  "Invalid email or passcode": "auth.errorInvalidCredentials",
  "Google sign-in is not configured": "auth.errorGoogleUnavailable",
  "Google sign-in failed": "auth.errorGoogleFailed",
  "Invalid or expired reset link": "auth.errorResetInvalid",
  Unauthorized: "auth.errorGeneric",
  "Request failed": "auth.errorGeneric",
  "Internal server error": "auth.errorGeneric",
  "Invalid request": "auth.errorGeneric",
};

export function mapAuthError(
  error: unknown,
  t: (key: MessageKey) => string
): string {
  const raw = error instanceof Error ? error.message : "";
  const key = AUTH_ERROR_KEYS[raw];
  return key ? t(key) : raw || t("auth.errorGeneric");
}
