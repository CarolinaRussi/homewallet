import { useLocale } from "../../shared/lib/i18n/locale-context";

export function OverviewPage() {
  const { t } = useLocale();

  return (
    <main className="px-6 py-8 md:px-10">
      <h1 className="text-3xl font-semibold text-fg">{t("overview.title")}</h1>
      <p className="mt-3 max-w-lg text-muted">{t("overview.placeholder")}</p>
    </main>
  );
}
