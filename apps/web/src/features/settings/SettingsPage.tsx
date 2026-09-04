import { NavLink, Outlet } from "react-router-dom";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import type { MessageKey } from "../../shared/lib/i18n/messages";

const tabs: { to: string; labelKey: MessageKey; end?: boolean }[] = [
  { to: "/settings", labelKey: "settings.tabSpaces", end: true },
  { to: "/settings/account", labelKey: "settings.tabAccount" },
];

export function SettingsPage() {
  const { t } = useLocale();

  return (
    <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
      <div>
        <h1 className="text-3xl font-semibold text-fg">
          {t("settings.title")}
        </h1>
        <nav className="mt-4 flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                [
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-accent text-fg"
                    : "border-transparent text-muted hover:text-fg",
                ].join(" ")
              }
            >
              {t(tab.labelKey)}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </main>
  );
}
