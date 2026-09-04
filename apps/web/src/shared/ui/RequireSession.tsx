import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { fetchSession } from "../../features/auth/auth-api";
import { useLocale } from "../lib/i18n/locale-context";

export function RequireSession() {
  const { t } = useLocale();
  const location = useLocation();
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
  });

  if (sessionQuery.isLoading) {
    return <p className="p-8 text-muted">{t("app.loading")}</p>;
  }

  if (sessionQuery.isError) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
