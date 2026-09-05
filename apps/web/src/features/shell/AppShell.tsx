import { Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { APP_NAME } from "@homewallet/shared";
import { logoutAccount } from "../auth/auth-api";
import { clearWelcomeIntent } from "../me/welcome-intent";
import { clearStoredActiveSpace } from "../spaces/use-active-space";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { useTheme } from "../../shared/lib/theme/theme-context";
import { SideNav } from "./SideNav";

export function AppShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();

  async function onSignOut() {
    await logoutAccount();
    clearWelcomeIntent();
    clearStoredActiveSpace();
    await queryClient.clear();
    navigate("/");
  }

  return (
    <div className="min-h-screen md:flex">
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <p className="text-sm font-semibold text-accent">{APP_NAME}</p>
        <div className="flex items-center gap-2">
          <select
            aria-label={t("locale.label")}
            className="hw-select py-1 text-sm"
            value={locale}
            onChange={(event) =>
              setLocale(event.target.value === "en" ? "en" : "pt-BR")
            }
          >
            <option value="pt-BR">PT</option>
            <option value="en">EN</option>
          </select>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-sm text-fg"
            onClick={toggleTheme}
          >
            {theme === "light" ? t("theme.dark") : t("theme.light")}
          </button>
          <button
            type="button"
            className="text-sm text-muted underline"
            onClick={onSignOut}
          >
            {t("nav.signOut")}
          </button>
        </div>
      </header>

      <SideNav onSignOut={onSignOut} />

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
