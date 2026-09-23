import { mapAuthError } from "./auth-errors";
import type { MessageKey } from "../../shared/lib/i18n/messages";

const t = (key: MessageKey) => key;

function assertMaps(raw: string, expected: MessageKey) {
  const mapped = mapAuthError(new Error(raw), t);
  if (mapped !== expected) {
    throw new Error(`auth-errors: "${raw}" → ${mapped}, expected ${expected}`);
  }
}

assertMaps("Email already registered", "auth.errorEmailTaken");
assertMaps("Use Google sign-in", "auth.errorUseGoogle");
assertMaps("Invalid email or passcode", "auth.errorInvalidCredentials");
assertMaps("Could not complete registration", "auth.errorRegisterFailed");

console.log("auth-errors check ok");
