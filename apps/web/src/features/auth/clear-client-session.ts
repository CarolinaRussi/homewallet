import type { QueryClient } from "@tanstack/react-query";
import { clearWelcomeIntent } from "../me/welcome-intent";
import { clearStoredActiveSpace } from "../spaces/use-active-space";

export async function clearClientSession(queryClient: QueryClient) {
  clearWelcomeIntent();
  clearStoredActiveSpace();
  await queryClient.cancelQueries();
  queryClient.setQueryData(["session"], null);
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== "session",
  });
}
