import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { fetchSession } from "../../features/auth/auth-api";
import { AppBootScreen } from "./AppBootScreen";

export function RequireSession() {
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
  });

  if (sessionQuery.isLoading) {
    return <AppBootScreen />;
  }

  if (sessionQuery.isError) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
