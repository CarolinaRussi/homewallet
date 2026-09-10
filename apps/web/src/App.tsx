import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AuthPage } from "./features/auth/AuthPage";
import { ForgotPasswordPage } from "./features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./features/auth/ResetPasswordPage";
import { VerifyEmailPage } from "./features/auth/VerifyEmailPage";
import { fetchSession } from "./features/auth/auth-api";
import { LandingPage } from "./features/landing/LandingPage";
import { MePage } from "./features/me/MePage";
import { ReservePage } from "./features/me/ReservePage";
import { OverviewPage } from "./features/overview/OverviewPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { AccountPanel } from "./features/settings/AccountPanel";
import { AppShell } from "./features/shell/AppShell";
import { NotFoundPage } from "./features/shell/NotFoundPage";
import { SpacePage } from "./features/space/SpacePage";
import { SpacesPanel } from "./features/spaces/SpacesPanel";
import { useLocale } from "./shared/lib/i18n/locale-context";
import { RequireSession } from "./shared/ui/RequireSession";

export function App() {
  const { t } = useLocale();
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
          sessionQuery.isSuccess ? (
            <Navigate to="/me" replace />
          ) : sessionQuery.isLoading ? (
            <p className="p-8 text-muted">{t("app.loading")}</p>
          ) : (
            <LandingPage />
          )
        }
      />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
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
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
