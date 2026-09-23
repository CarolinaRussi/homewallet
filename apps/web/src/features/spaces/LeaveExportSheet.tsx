import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatMoney } from "../../shared/lib/money";
import { AppSheet } from "../../shared/ui/AppSheet";
import { FeedbackBanner } from "../../shared/ui/FeedbackBanner";
import { Spinner } from "../../shared/ui/Spinner";
import { invalidateMonthSummaryAfterWrite } from "../me/leftover-api";
import { executeLeaveExport, previewLeaveExport } from "./space-api";

type LeaveExportSheetProps = {
  spaceId: string;
  currency: string;
  open: boolean;
  leavePending: boolean;
  onClose: () => void;
  onLeaveWithout: () => void;
  onExported: (newSoloSpaceId: string) => void;
};

export function LeaveExportSheet({
  spaceId,
  currency,
  open,
  leavePending,
  onClose,
  onLeaveWithout,
  onExported,
}: LeaveExportSheetProps) {
  const { t, locale } = useLocale();
  const titleId = useId();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"choose" | "preview">("choose");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("choose");
      setErrorMessage("");
    }
  }, [open]);

  const previewQuery = useQuery({
    queryKey: ["leave-export-preview", spaceId],
    queryFn: () => previewLeaveExport(spaceId),
    enabled: open && step === "preview",
  });
  const preview = previewQuery.data;

  const executeMutation = useMutation({
    mutationFn: () => {
      if (!preview) {
        throw new Error("Missing preview");
      }
      return executeLeaveExport(spaceId, preview.previewToken);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["spaces"] });
      void queryClient.invalidateQueries({ queryKey: ["space-members"] });
      void queryClient.invalidateQueries({ queryKey: ["me-page"] });
      invalidateMonthSummaryAfterWrite(queryClient, result.newSoloSpaceId);
      onExported(result.newSoloSpaceId);
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const pending = leavePending || executeMutation.isPending;

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      pending={pending}
      labelledBy={titleId}
      size="lg"
    >
      <div>
        <h2 id={titleId} className="text-lg font-semibold text-fg">
          {step === "choose"
            ? t("spaces.leaveTake.chooseTitle")
            : t("spaces.leaveTake.previewTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {step === "choose"
            ? t("spaces.leaveTake.chooseHint")
            : t("spaces.leaveTake.previewHint")}
        </p>
      </div>

      {errorMessage ? (
        <FeedbackBanner tone="error" message={errorMessage} />
      ) : null}

      {step === "choose" ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="rounded-md bg-accent px-3 py-2.5 text-left text-sm font-medium text-accent-fg disabled:opacity-70"
            disabled={pending}
            onClick={() => setStep("preview")}
          >
            {t("spaces.leaveTake.take")}
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-2.5 text-left text-sm text-fg disabled:opacity-70"
            disabled={pending}
            onClick={onLeaveWithout}
          >
            {leavePending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner />
                {t("spaces.leaveTake.leaving")}
              </span>
            ) : (
              t("spaces.leaveTake.leaveOnly")
            )}
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm text-muted underline disabled:opacity-70"
            disabled={pending}
            onClick={onClose}
          >
            {t("me.cancel")}
          </button>
        </div>
      ) : previewQuery.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <Spinner />
          {t("me.updating")}
        </p>
      ) : preview ? (
        <div className="flex flex-col gap-3 text-sm text-fg">
          <ul className="flex flex-col gap-1 text-muted">
            <li>
              {t("spaces.leaveTake.moveEntries").replace(
                "{n}",
                String(preview.moveEntryCount)
              )}
            </li>
            <li>
              {t("spaces.leaveTake.stayEntries").replace(
                "{n}",
                String(preview.stayEntryCount)
              )}
            </li>
            {preview.monthFrom && preview.monthTo ? (
              <li>
                {t("spaces.historyImport.months")
                  .replace("{from}", preview.monthFrom)
                  .replace("{to}", preview.monthTo)}
              </li>
            ) : null}
            <li>
              {t("spaces.historyImport.reserve")}:{" "}
              {formatMoney(preview.reserveBalance, currency, locale)}
            </li>
            <li>
              {t("spaces.historyImport.recurring").replace(
                "{n}",
                String(preview.recurringRuleCount)
              )}
            </li>
          </ul>
          {preview.orphanTransferCount > 0 ? (
            <p className="text-xs text-muted">{t("spaces.leaveTake.orphan")}</p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2.5 text-sm text-fg disabled:opacity-70 sm:py-2"
              disabled={pending}
              onClick={() => setStep("choose")}
            >
              {t("me.cancel")}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-expense px-3 py-2.5 text-sm font-medium text-expense-fg disabled:opacity-70 sm:py-2"
              disabled={pending}
              onClick={() => executeMutation.mutate()}
            >
              {executeMutation.isPending ? <Spinner /> : null}
              {executeMutation.isPending
                ? t("spaces.leaveTake.taking")
                : t("spaces.leaveTake.confirmTake")}
            </button>
          </div>
        </div>
      ) : previewQuery.isError ? (
        <FeedbackBanner
          tone="error"
          message={
            previewQuery.error instanceof Error
              ? previewQuery.error.message
              : t("spaces.leaveTake.previewFailed")
          }
        />
      ) : null}
    </AppSheet>
  );
}
