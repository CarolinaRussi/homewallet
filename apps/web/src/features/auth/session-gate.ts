export type SessionGateInput = {
  user: { id: string } | null | undefined;
  isPending: boolean;
  isFetching: boolean;
};

export type PublicHomeState = "me" | "boot" | "landing";
export type AuthedRouteState = "authed" | "boot" | "anon";

/** Where `/` should go. Logged-out must never bounce back to `/me`. */
export function publicHomeState(input: SessionGateInput): PublicHomeState {
  if (input.user) {
    return "me";
  }
  if (input.isPending && input.isFetching) {
    return "boot";
  }
  return "landing";
}

/**
 * Protected routes. A pending query that is not fetching is treated as
 * logged-out so logout cannot leave `/me` on the boot screen forever.
 */
export function authedRouteState(input: SessionGateInput): AuthedRouteState {
  if (input.user) {
    return "authed";
  }
  if (input.isPending && input.isFetching) {
    return "boot";
  }
  return "anon";
}
