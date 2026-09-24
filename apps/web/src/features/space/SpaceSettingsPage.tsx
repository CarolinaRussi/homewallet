import { Link } from "react-router-dom";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { SpacesPanel } from "../spaces/SpacesPanel";
import { useActiveSpace } from "../spaces/use-active-space";

export function SpaceSettingsPage() {
  const { t } = useLocale();
  const { activeSpace } = useActiveSpace();
  const backTo = (activeSpace?.memberCount ?? 0) > 1 ? "/space" : "/me";

  return (
    <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
      <div>
        <Link
          to={backTo}
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          ← {t("space.settingsBack")}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-fg">
          {t("space.settings")}
        </h1>
      </div>
      <SpacesPanel />
    </main>
  );
}
