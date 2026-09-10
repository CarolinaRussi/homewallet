import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { fetchSession } from "../../features/auth/auth-api";
import { useLocale } from "../lib/i18n/locale-context";

export function RequireSession() {
  const { t } = useLocale();
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
  });

  if (sessionQuery.isLoading) {
    return <p className="p-8 text-muted">{t("app.loading")}</p>;
  }

  if (sessionQuery.isError) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
