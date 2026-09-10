import { APP_NAME } from "@homewallet/shared";
import { useLocale } from "../lib/i18n/locale-context";

/** Calm full-viewport placeholder while the session bootstrap runs. */
export function AppBootScreen() {
  const { t } = useLocale();

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-bg text-fg"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{t("app.loading")}</span>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,color-mix(in_srgb,var(--hw-accent)_20%,transparent),transparent_58%)]"
      />
      <div className="hw-boot relative z-10 flex flex-col items-center gap-4">
        <p className="text-lg font-semibold tracking-wide text-accent sm:text-xl">
          {APP_NAME}
        </p>
        <div className="hw-boot-bar h-0.5 w-16 overflow-hidden rounded-full bg-border">
          <div className="hw-boot-bar-fill h-full w-1/2 rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}
