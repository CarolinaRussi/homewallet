import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { ConfirmSheet } from "../../shared/ui/ConfirmSheet";
import { FeedbackBanner } from "../../shared/ui/FeedbackBanner";
import { Spinner } from "../../shared/ui/Spinner";
import {
  deleteAccount,
  downloadEntriesCsv,
  fetchSession,
  linkGoogle,
  resendVerifyEmail,
} from "../auth/auth-api";
import { mapAuthError } from "../auth/auth-errors";
import { GoogleSignIn } from "../auth/GoogleSignIn";
import { clearWelcomeIntent } from "../me/welcome-intent";
import { clearStoredActiveSpace } from "../spaces/use-active-space";

export function AccountPanel() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
  });
  const user = sessionQuery.data?.user;

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      setConfirmOpen(false);
      clearWelcomeIntent();
      clearStoredActiveSpace();
      await queryClient.clear();
      navigate("/");
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const linkMutation = useMutation({
    mutationFn: linkGoogle,
    onSuccess: (result) => {
      queryClient.setQueryData(["session"], result);
      setSuccessMessage(t("account.googleLinked"));
      setErrorMessage("");
    },
    onError: (error) => {
      setSuccessMessage("");
      setErrorMessage(mapAuthError(error, t));
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendVerifyEmail,
    onSuccess: () => {
      setSuccessMessage(t("account.verifySent"));
      setErrorMessage("");
    },
    onError: (error) => {
      setSuccessMessage("");
      setErrorMessage(mapAuthError(error, t));
    },
  });

  async function onExport() {
    setErrorMessage("");
    setSuccessMessage("");
    setExporting(true);
    try {
      await downloadEntriesCsv();
    } catch (error) {
      setErrorMessage(mapAuthError(error, t) || t("account.exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t("account.title")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("account.hint")}</p>
      </div>

      {errorMessage ? (
        <FeedbackBanner tone="error" message={errorMessage} />
      ) : null}
      {successMessage ? (
        <FeedbackBanner tone="success" message={successMessage} />
      ) : null}

      {user && !user.emailVerified ? (
        <div className="rounded-md border border-border bg-bg/60 px-4 py-3">
          <p className="text-sm font-medium text-fg">
            {t("account.verifyTitle")}
          </p>
          <p className="mt-1 text-xs text-muted">{t("account.verifyHint")}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-fg disabled:opacity-70"
            disabled={resendMutation.isPending}
            onClick={() => resendMutation.mutate()}
          >
            {resendMutation.isPending ? <Spinner /> : null}
            {t("account.verifyResend")}
          </button>
        </div>
      ) : null}

      {user && !user.googleLinked ? (
        <div className="rounded-md border border-border bg-bg/60 px-4 py-3">
          <p className="text-sm font-medium text-fg">
            {t("account.googleTitle")}
          </p>
          <p className="mt-1 text-xs text-muted">{t("account.googleHint")}</p>
          <div className="mt-3">
            <GoogleSignIn
              onCredential={(idToken) => {
                setErrorMessage("");
                setSuccessMessage("");
                linkMutation.mutate(idToken);
              }}
            />
          </div>
        </div>
      ) : user?.googleLinked ? (
        <p className="text-sm text-muted">{t("account.googleLinked")}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-fg disabled:opacity-70"
          disabled={exporting || deleteMutation.isPending}
          onClick={() => void onExport()}
        >
          {exporting ? <Spinner /> : null}
          {exporting ? t("account.exporting") : t("account.exportCsv")}
        </button>
      </div>

      <div className="rounded-md border border-expense-fg/30 bg-expense px-4 py-3">
        <p className="text-sm font-medium text-expense-fg">
          {t("account.dangerZone")}
        </p>
        <p className="mt-1 text-xs text-expense-fg/90">
          {t("account.deleteHint")}
        </p>
        <button
          type="button"
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-expense-fg px-3 py-2 text-sm font-medium text-expense disabled:opacity-70"
          disabled={deleteMutation.isPending}
          onClick={() => {
            setErrorMessage("");
            setConfirmOpen(true);
          }}
        >
          {t("account.delete")}
        </button>
      </div>

      <ConfirmSheet
        open={confirmOpen}
        title={t("account.deleteTitle")}
        description={t("account.deleteConfirm")}
        confirmLabel={t("account.deleteSubmit")}
        cancelLabel={t("me.cancel")}
        danger
        pending={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setConfirmOpen(false);
          }
        }}
        onConfirm={() => deleteMutation.mutate()}
      />
    </section>
  );
}
