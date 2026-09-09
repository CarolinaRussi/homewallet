import { HttpError } from "./http-error.js";
import { assertSessionVersion } from "./session-version.js";

assertSessionVersion(1, 1);

let rejected = false;
try {
  assertSessionVersion(1, 2);
} catch (error) {
  rejected =
    error instanceof HttpError &&
    error.statusCode === 401 &&
    error.message === "Unauthorized";
}

if (!rejected) {
  throw new Error("session-version check: stale sv should be rejected");
}

let rejectedMissing = false;
try {
  assertSessionVersion(undefined, 1);
} catch (error) {
  rejectedMissing = error instanceof HttpError && error.statusCode === 401;
}

if (!rejectedMissing) {
  throw new Error("session-version check: missing sv should be rejected");
}

console.log("session-version check ok");
