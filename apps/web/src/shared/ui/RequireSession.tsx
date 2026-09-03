import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { fetchSession } from "../../features/auth/auth-api";

export function RequireSession() {
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
  });

  if (sessionQuery.isLoading) {
    return <p className="p-8 text-muted">Loading…</p>;
  }

  if (sessionQuery.isError) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
