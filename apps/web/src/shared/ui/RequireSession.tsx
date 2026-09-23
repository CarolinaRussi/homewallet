import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { fetchSession } from "../../features/auth/auth-api";
import { authedRouteState } from "../../features/auth/session-gate";
import { AppBootScreen } from "./AppBootScreen";

export function RequireSession() {
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
  });
  const routeState = authedRouteState({
    user: sessionQuery.data?.user,
    isPending: sessionQuery.isPending,
    isFetching: sessionQuery.isFetching,
  });

  if (routeState === "boot") {
    return <AppBootScreen />;
  }

  if (routeState === "anon") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
