import { authedRouteState, publicHomeState } from "./session-gate";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  publicHomeState({
    user: { id: "u1" },
    isPending: false,
    isFetching: false,
  }) === "me",
  "signed-in home should go to /me"
);

assert(
  publicHomeState({ user: undefined, isPending: true, isFetching: true }) ===
    "boot",
  "first session fetch should boot"
);

assert(
  publicHomeState({ user: undefined, isPending: false, isFetching: false }) ===
    "landing",
  "settled logged-out should show landing"
);

assert(
  publicHomeState({ user: undefined, isPending: true, isFetching: false }) ===
    "landing",
  "stuck pending after cache clear must not keep the boot screen"
);

assert(
  publicHomeState({ user: undefined, isPending: false, isFetching: true }) ===
    "landing",
  "logged-out refetch in flight must not bounce to /me"
);

assert(
  authedRouteState({
    user: { id: "u1" },
    isPending: false,
    isFetching: false,
  }) === "authed",
  "signed-in should render the app"
);

assert(
  authedRouteState({ user: undefined, isPending: true, isFetching: true }) ===
    "boot",
  "first protected fetch should boot"
);

assert(
  authedRouteState({ user: undefined, isPending: true, isFetching: false }) ===
    "anon",
  "logout cache-clear must leave /me, not boot forever"
);

assert(
  authedRouteState({ user: undefined, isPending: false, isFetching: false }) ===
    "anon",
  "session error / empty cache should leave /me"
);

console.log("session-gate check ok");
