import type { QueryClient } from "@tanstack/react-query";
import { fetchCategories } from "../entries/entry-api";
import { fetchSpaceMembers } from "../spaces/space-api";
import { fetchReservePots } from "./reserve-api";

/** Categories and members change rarely on the Me tab. */
export const ME_FORM_STALE_MS = 5 * 60 * 1000;

export function prefetchMeFormQueries(
  queryClient: QueryClient,
  spaceId: string
) {
  void queryClient.prefetchQuery({
    queryKey: ["categories", spaceId],
    queryFn: () => fetchCategories(spaceId),
    staleTime: ME_FORM_STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ["space-members", spaceId],
    queryFn: () => fetchSpaceMembers(spaceId),
    staleTime: ME_FORM_STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ["reserve-pots", spaceId],
    queryFn: () => fetchReservePots(spaceId),
    staleTime: ME_FORM_STALE_MS,
  });
}
