import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { ConfirmSheet } from "../../shared/ui/ConfirmSheet";
import { Spinner } from "../../shared/ui/Spinner";
import { deleteAccount, downloadEntriesCsv } from "../auth/auth-api";

export function AccountPanel() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      setConfirmOpen(false);
      await queryClient.clear();
      navigate("/");
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  async function onExport() {
    setErrorMessage("");
    setExporting(true);
    try {
      await downloadEntriesCsv();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("account.exportFailed")
      );
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
        <p className="text-sm text-expense-fg">{errorMessage}</p>
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
