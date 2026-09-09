import type { MessageKey } from "../../shared/lib/i18n/messages";

const AUTH_ERROR_KEYS: Record<string, MessageKey> = {
  "Invalid email": "auth.errorInvalidEmail",
  "Passcode must be at least 8 characters": "auth.errorPassMin",
  "Passcode must be at most 128 characters": "auth.errorPassMax",
  "Passcode is required": "auth.errorPassRequired",
  "Name is required": "auth.errorNameRequired",
  "Name is too long": "auth.errorNameTooLong",
  "Email already registered": "auth.errorEmailTaken",
  "Could not complete registration": "auth.errorRegisterFailed",
  "Invalid email or passcode": "auth.errorInvalidCredentials",
  "Google sign-in is not configured": "auth.errorGoogleUnavailable",
  "Google sign-in failed": "auth.errorGoogleFailed",
  "Google email is not verified": "auth.errorGoogleUnverified",
  "Google link required": "auth.errorGoogleLinkRequired",
  "Google account already linked": "auth.errorGoogleAlreadyLinked",
  "Google email does not match account": "auth.errorGoogleEmailMismatch",
  "Email verification required": "auth.errorEmailVerifyRequired",
  "Invalid or expired reset link": "auth.errorResetInvalid",
  "Invalid or expired verify link": "auth.errorVerifyInvalid",
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
