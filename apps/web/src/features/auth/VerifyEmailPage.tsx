import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { FeedbackBanner } from "../../shared/ui/FeedbackBanner";
import { Spinner } from "../../shared/ui/Spinner";
import { verifyEmail } from "./auth-api";
import { mapAuthError } from "./auth-errors";

export function VerifyEmailPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : t("auth.verifyInvalid")
  );

  const mutation = useMutation({
    mutationFn: () => verifyEmail(token),
    onSuccess: () => {
      setDone(true);
      void queryClient.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (error) => setErrorMessage(mapAuthError(error, t)),
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-fg">
          {t("auth.verifyTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("auth.verifyHint")}</p>
      </div>

      {errorMessage ? (
        <FeedbackBanner tone="error" message={errorMessage} />
      ) : null}
      {done ? (
        <FeedbackBanner tone="success" message={t("auth.verifyDone")} />
      ) : null}

      {!done && token ? (
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-70"
          disabled={mutation.isPending}
          onClick={() => {
            setErrorMessage("");
            mutation.mutate();
          }}
        >
          {mutation.isPending ? <Spinner /> : null}
          {mutation.isPending
            ? t("auth.verifyConfirming")
            : t("auth.verifySubmit")}
        </button>
      ) : null}

      <Link to="/login" className="text-sm text-accent underline">
        {t("auth.backToSignIn")}
      </Link>
    </main>
  );
}
