import { useLocale } from "../../shared/lib/i18n/locale-context";
import { SpacesPanel } from "../spaces/SpacesPanel";

export function SettingsPage() {
  const { t } = useLocale();

  return (
    <main className="px-6 py-8 md:px-10">
      <h1 className="mb-8 text-3xl font-semibold text-fg">
        {t("settings.title")}
      </h1>
      <SpacesPanel />
    </main>
  );
}
