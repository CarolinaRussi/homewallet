import { Link } from "react-router-dom";
import { APP_NAME } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";

export function NotFoundPage() {
  const { t } = useLocale();

  return (
    <div className="relative flex min-h-screen flex-col bg-bg text-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,color-mix(in_srgb,var(--hw-accent)_18%,transparent),transparent_55%)]"
      />

      <header className="relative z-10 px-6 py-5 md:px-10">
        <p className="text-sm font-semibold tracking-wide text-accent">
          {APP_NAME}
        </p>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-start justify-center gap-4 px-6 pb-16 md:px-10">
        <p className="text-sm font-medium text-muted">{t("notFound.code")}</p>
        <h1 className="max-w-lg text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          {t("notFound.title")}
        </h1>
        <p className="max-w-md text-base text-muted">{t("notFound.support")}</p>
        <Link
          to="/"
          className="mt-2 inline-flex items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg"
        >
          {t("notFound.home")}
        </Link>
      </main>
    </div>
  );
}
