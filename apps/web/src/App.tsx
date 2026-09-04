import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AuthPage } from "./features/auth/AuthPage";
import { fetchSession } from "./features/auth/auth-api";
import { MePage } from "./features/me/MePage";
import { ReservePage } from "./features/me/ReservePage";
import { OverviewPage } from "./features/overview/OverviewPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { AccountPanel } from "./features/settings/AccountPanel";
import { AppShell } from "./features/shell/AppShell";
import { SpacePage } from "./features/space/SpacePage";
import { SpacesPanel } from "./features/spaces/SpacesPanel";
import { RequireSession } from "./shared/ui/RequireSession";

export function App() {
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    retry: false,
  });

  return (
    <Routes>
      <Route
        path="/"
        element={
          sessionQuery.isSuccess ? <Navigate to="/me" replace /> : <AuthPage />
        }
      />
      <Route element={<RequireSession />}>
        <Route element={<AppShell />}>
          <Route path="/me" element={<MePage />} />
          <Route path="/reserve" element={<ReservePage />} />
          <Route path="/space" element={<SpacePage />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/settings" element={<SettingsPage />}>
            <Route index element={<SpacesPanel />} />
            <Route path="account" element={<AccountPanel />} />
          </Route>
          <Route path="/spaces" element={<Navigate to="/settings" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
