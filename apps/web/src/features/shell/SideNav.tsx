import { useQuery } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { APP_NAME } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { useTheme } from "../../shared/lib/theme/theme-context";
import type { MessageKey } from "../../shared/lib/i18n/messages";
import { fetchSpaceMembers } from "../spaces/space-api";
import { useActiveSpace } from "../spaces/use-active-space";

const navItems: { to: string; labelKey: MessageKey; end?: boolean }[] = [
  { to: "/overview", labelKey: "nav.overview" },
  { to: "/me", labelKey: "nav.me" },
  { to: "/reserve", labelKey: "nav.reserve" },
  { to: "/space", labelKey: "nav.space" },
  { to: "/settings", labelKey: "nav.settings" },
];

type SideNavProps = {
  onSignOut: () => void;
};

export function SideNav({ onSignOut }: SideNavProps) {
  const { t, locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { spaceId } = useActiveSpace();
  const membersQuery = useQuery({
    queryKey: ["space-members", spaceId],
    queryFn: () => fetchSpaceMembers(spaceId!),
    enabled: Boolean(spaceId),
  });
  const showSpaceTab = (membersQuery.data?.length ?? 0) > 1;
  const visibleNavItems = navItems.filter(
    (item) => item.to !== "/space" || showSpaceTab
  );

  return (
    <aside className="flex w-full flex-col gap-6 border-border bg-surface md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0 md:self-start md:overflow-y-auto md:border-r md:px-4 md:py-6">
      <div className="hidden md:block">
        <p className="text-sm font-semibold tracking-wide text-accent">
          {APP_NAME}
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 py-3 md:flex-col md:overflow-visible md:px-0 md:py-0">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-fg"
                  : "text-muted hover:bg-bg hover:text-fg",
              ].join(" ")
            }
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto hidden flex-col gap-3 border-t border-border pt-4 md:flex">
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t("locale.label")}
          <select
            className="hw-select text-sm"
            value={locale}
            onChange={(event) =>
              setLocale(event.target.value === "en" ? "en" : "pt-BR")
            }
          >
            <option value="pt-BR">PT</option>
            <option value="en">EN</option>
          </select>
        </label>

        <button
          type="button"
          className="rounded-md border border-border px-2 py-1.5 text-left text-sm text-fg"
          onClick={toggleTheme}
        >
          {t("theme.toggle")}:{" "}
          {theme === "light" ? t("theme.dark") : t("theme.light")}
        </button>

        <button
          type="button"
          className="text-left text-sm text-muted underline"
          onClick={onSignOut}
        >
          {t("nav.signOut")}
        </button>
      </div>
    </aside>
  );
}
