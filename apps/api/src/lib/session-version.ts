import { HttpError } from "./http-error.js";

/** Reject JWTs whose session version no longer matches the user row. */
export function assertSessionVersion(
  tokenSessionVersion: unknown,
  userSessionVersion: number
): void {
  if (
    typeof tokenSessionVersion !== "number" ||
    tokenSessionVersion !== userSessionVersion
  ) {
    throw new HttpError(401, "Unauthorized");
  }
}
