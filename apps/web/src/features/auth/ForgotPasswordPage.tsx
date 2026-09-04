import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { APP_NAME } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { Spinner } from "../../shared/ui/Spinner";
import { forgotPassword } from "./auth-api";
import { mapAuthError } from "./auth-errors";

export function ForgotPasswordPage() {
  const { t } = useLocale();
  const [errorMessage, setErrorMessage] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => setSent(true),
    onError: (error) => setErrorMessage(mapAuthError(error, t)),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const data = new FormData(event.currentTarget);
    mutation.mutate({ email: String(data.get("email") ?? "") });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <Link
          to="/"
          className="text-sm font-medium tracking-wide text-muted uppercase"
        >
          {APP_NAME}
        </Link>
        <h1 className="mt-1 text-3xl font-semibold text-fg">
          {t("auth.forgotTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("auth.forgotHint")}</p>
      </div>

      {sent ? (
        <p className="text-sm text-income-fg">{t("auth.forgotSent")}</p>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm text-muted">
            {t("auth.email")}
            <input
              name="email"
              type="email"
              required
              className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
            />
          </label>
          {errorMessage ? (
            <p
              role="alert"
              className="hw-feedback rounded-md border border-expense-fg/30 bg-expense px-3 py-2 text-sm text-expense-fg"
            >
              {errorMessage}
            </p>
          ) : null}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 font-medium text-accent-fg disabled:opacity-70"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Spinner /> : null}
            {mutation.isPending
              ? t("auth.forgotSending")
              : t("auth.forgotSubmit")}
          </button>
        </form>
      )}

      <Link to="/login" className="text-sm text-muted underline">
        {t("auth.backToSignIn")}
      </Link>
    </main>
  );
}
