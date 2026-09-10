import { Link } from "react-router-dom";
import { APP_NAME } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import type { MessageKey } from "../../shared/lib/i18n/messages";

const LANDING_FEATURES: {
  titleKey: MessageKey;
  bodyKey: MessageKey;
}[] = [
  {
    titleKey: "landing.feature.space.title",
    bodyKey: "landing.feature.space.body",
  },
  {
    titleKey: "landing.feature.month.title",
    bodyKey: "landing.feature.month.body",
  },
  {
    titleKey: "landing.feature.card.title",
    bodyKey: "landing.feature.card.body",
  },
  {
    titleKey: "landing.feature.reserve.title",
    bodyKey: "landing.feature.reserve.body",
  },
  {
    titleKey: "landing.feature.overview.title",
    bodyKey: "landing.feature.overview.body",
  },
  {
    titleKey: "landing.feature.privacy.title",
    bodyKey: "landing.feature.privacy.body",
  },
];

export function LandingPage() {
  const { t, locale, setLocale } = useLocale();

  return (
    <div className="hw-landing relative min-h-screen overflow-x-hidden bg-bg text-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(100vh,52rem)] bg-[radial-gradient(ellipse_at_20%_0%,color-mix(in_srgb,var(--hw-accent)_22%,transparent),transparent_55%),radial-gradient(ellipse_at_90%_40%,color-mix(in_srgb,var(--hw-income-fg)_12%,transparent),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <p className="text-sm font-semibold tracking-wide text-accent">
          {APP_NAME}
        </p>
        <div className="flex items-center gap-3">
          <select
            aria-label={t("locale.label")}
            className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-fg"
            value={locale}
            onChange={(event) =>
              setLocale(event.target.value === "en" ? "en" : "pt-BR")
            }
          >
            <option value="pt-BR">PT</option>
            <option value="en">EN</option>
          </select>
          <Link
            to="/login"
            className="hidden text-sm font-medium text-muted hover:text-fg sm:inline"
          >
            {t("auth.signIn")}
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-6 md:grid-cols-2 md:gap-16 md:px-10 md:pb-20 md:pt-10">
          <section className="hw-landing-copy flex flex-col gap-6">
            <p className="text-4xl font-semibold tracking-tight text-accent sm:text-5xl md:text-6xl">
              {APP_NAME}
            </p>
            <h1 className="max-w-xl text-2xl font-semibold leading-snug text-fg sm:text-3xl">
              {t("landing.headline")}
            </h1>
            <p className="max-w-lg text-base text-muted sm:text-lg">
              {t("landing.support")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg"
              >
                {t("landing.ctaCreate")}
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-fg"
              >
                {t("landing.ctaSignIn")}
              </Link>
            </div>
          </section>

          <section
            aria-hidden
            className="hw-landing-device mx-auto w-full max-w-md md:max-w-none"
          >
            <div className="rounded-[1.75rem] border border-border bg-fg/90 p-3 shadow-[0_24px_60px_color-mix(in_srgb,var(--hw-fg)_18%,transparent)]">
              <div className="overflow-hidden rounded-[1.25rem] bg-bg">
                <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
                  <span className="text-xs font-semibold text-accent">
                    {APP_NAME}
                  </span>
                  <span className="text-xs text-muted">{t("nav.me")}</span>
                </div>
                <div className="space-y-3 p-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-income px-2 py-3">
                      <p className="text-[10px] text-income-fg">
                        {t("me.income")}
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-income-fg">
                        4.200
                      </p>
                    </div>
                    <div className="rounded-lg bg-expense px-2 py-3">
                      <p className="text-[10px] text-expense-fg">
                        {t("me.expense")}
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-expense-fg">
                        2.850
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-surface px-2 py-3">
                      <p className="text-[10px] text-muted">
                        {t("me.leftover")}
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-fg">
                        1.350
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-fg">
                          {t("landing.mockShared")}
                        </p>
                        <p className="text-[10px] text-muted">
                          {t("landing.mockCategory")}
                        </p>
                      </div>
                      <p className="text-xs font-semibold tabular-nums text-expense-fg">
                        −189
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-fg">
                          {t("landing.mockPersonal")}
                        </p>
                        <p className="text-[10px] text-muted">
                          {t("landing.mockIncomeCat")}
                        </p>
                      </div>
                      <p className="text-xs font-semibold tabular-nums text-income-fg">
                        +4.200
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 px-3 py-2.5">
                    <p className="text-[10px] text-muted">{t("nav.reserve")}</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-accent">
                      680
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="hw-landing-features mx-auto max-w-6xl px-6 pb-16 md:px-10 md:pb-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              {t("landing.featuresTitle")}
            </h2>
            <p className="mt-3 text-base text-muted">
              {t("landing.featuresIntro")}
            </p>
          </div>

          <ul className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {LANDING_FEATURES.map((feature) => (
              <li key={feature.titleKey} className="flex flex-col gap-2">
                <h3 className="text-base font-semibold text-fg">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {t(feature.bodyKey)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="hw-landing-closing border-t border-border bg-surface/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-12 md:flex-row md:items-center md:justify-between md:px-10 md:py-14">
            <div className="max-w-xl">
              <h2 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                {t("landing.closingTitle")}
              </h2>
              <p className="mt-2 text-sm text-muted sm:text-base">
                {t("landing.closingSupport")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg"
              >
                {t("landing.ctaCreate")}
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md border border-border bg-bg px-4 py-2.5 text-sm font-medium text-fg"
              >
                {t("landing.ctaSignIn")}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
