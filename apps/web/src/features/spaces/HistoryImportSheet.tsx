import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatMoney } from "../../shared/lib/money";
import { AppSheet } from "../../shared/ui/AppSheet";
import { FeedbackBanner } from "../../shared/ui/FeedbackBanner";
import { Spinner } from "../../shared/ui/Spinner";
import { fetchCategories } from "../entries/entry-api";
import { invalidateMonthSummaryAfterWrite } from "../me/leftover-api";
import {
  executeHistoryImport,
  fetchHistoryImportSources,
  previewHistoryImport,
} from "./space-api";

type HistoryImportSheetProps = {
  targetSpaceId: string;
  currency: string;
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

export function HistoryImportSheet({
  targetSpaceId,
  currency,
  open,
  onClose,
  onImported,
}: HistoryImportSheetProps) {
  const { t, locale } = useLocale();
  const titleId = useId();
  const queryClient = useQueryClient();
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [categoryPicks, setCategoryPicks] = useState<Record<string, string>>(
    {}
  );
  const [errorMessage, setErrorMessage] = useState("");

  const sourcesQuery = useQuery({
    queryKey: ["history-import-sources", targetSpaceId],
    queryFn: () => fetchHistoryImportSources(targetSpaceId),
    enabled: open,
  });
  const previewQuery = useQuery({
    queryKey: ["history-import-preview", targetSpaceId, sourceId],
    queryFn: () => previewHistoryImport(targetSpaceId, sourceId!),
    enabled: open && Boolean(sourceId),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories", targetSpaceId],
    queryFn: () => fetchCategories(targetSpaceId),
    enabled: open && Boolean(sourceId),
  });

  useEffect(() => {
    if (!open) {
      setSourceId(null);
      setCategoryPicks({});
      setErrorMessage("");
      return;
    }
    const sources = sourcesQuery.data;
    if (!sources) {
      return;
    }
    if (sources.length === 0) {
      onClose();
      return;
    }
    if (sources.length === 1) {
      setSourceId(sources[0]!.id);
    }
  }, [open, sourcesQuery.data, onClose]);

  const preview = previewQuery.data;
  const unmatched = preview?.categories.filter((row) => !row.matched) ?? [];
  const blocking = preview?.warnings.some((warning) => warning.blocking);
  const dateModeNote = preview?.warnings.some(
    (warning) => warning.code === "entry_date_mode_differs"
  );

  const executeMutation = useMutation({
    mutationFn: () => {
      if (!sourceId || !preview) {
        throw new Error("Missing preview");
      }
      return executeHistoryImport(targetSpaceId, {
        sourceSpaceId: sourceId,
        previewToken: preview.previewToken,
        categoryMap: categoryPicks,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["spaces"] });
      void queryClient.invalidateQueries({
        queryKey: ["history-import-sources"],
      });
      void queryClient.invalidateQueries({ queryKey: ["me-page"] });
      void queryClient.invalidateQueries({ queryKey: ["entries"] });
      invalidateMonthSummaryAfterWrite(queryClient, targetSpaceId);
      onImported();
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const sources = sourcesQuery.data ?? [];

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      pending={executeMutation.isPending}
      labelledBy={titleId}
      size="lg"
    >
      <div>
        <h2 id={titleId} className="text-lg font-semibold text-fg">
          {t("spaces.historyImport.offerTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {t("spaces.historyImport.offerHint")}
        </p>
      </div>

      {errorMessage ? (
        <FeedbackBanner tone="error" message={errorMessage} />
      ) : null}

      {sourcesQuery.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <Spinner />
          {t("me.updating")}
        </p>
      ) : sources.length > 1 && !sourceId ? (
        <ul className="flex flex-col gap-2">
          {sources.map((source) => (
            <li key={source.id}>
              <button
                type="button"
                className="w-full rounded-md border border-border px-3 py-2 text-left text-sm text-fg"
                onClick={() => setSourceId(source.id)}
              >
                {source.name}
                <span className="mt-0.5 block text-xs text-muted">
                  {t("spaces.historyImport.entries").replace(
                    "{n}",
                    String(source.entryCount)
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : previewQuery.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <Spinner />
          {t("me.updating")}
        </p>
      ) : preview ? (
        <div className="flex flex-col gap-3 text-sm text-fg">
          <p className="font-medium">{preview.sourceName}</p>
          <ul className="flex flex-col gap-1 text-muted">
            <li>
              {t("spaces.historyImport.entries").replace(
                "{n}",
                String(preview.entryCount)
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
            <li>
              {t("spaces.historyImport.installments").replace(
                "{n}",
                String(preview.installmentPlanCount)
              )}
            </li>
          </ul>
          {dateModeNote ? (
            <p className="text-xs text-muted">
              {t("spaces.historyImport.dateModeNote")}
            </p>
          ) : null}
          {blocking ? (
            <FeedbackBanner
              tone="error"
              message={t("spaces.historyImport.transferBlock")}
            />
          ) : null}
          {unmatched.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted">
                {t("spaces.historyImport.mapHint")}
              </p>
              {unmatched.map((row) => (
                <label
                  key={row.sourceCategoryId}
                  className="flex flex-col gap-1 text-xs text-muted"
                >
                  {row.sourceName}
                  <select
                    className="hw-select-field"
                    value={categoryPicks[row.sourceCategoryId] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCategoryPicks((current) => {
                        if (!value) {
                          const next = { ...current };
                          delete next[row.sourceCategoryId];
                          return next;
                        }
                        return {
                          ...current,
                          [row.sourceCategoryId]: value,
                        };
                      });
                    }}
                  >
                    <option value="">
                      {t("spaces.historyImport.mapCreate").replace(
                        "{name}",
                        row.sourceName
                      )}
                    </option>
                    {(categoriesQuery.data ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-2.5 text-sm text-fg disabled:opacity-70 sm:py-2"
          disabled={executeMutation.isPending}
          onClick={onClose}
        >
          {t("spaces.historyImport.skip")}
        </button>
        {preview && !blocking ? (
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2.5 text-sm font-medium text-accent-fg disabled:opacity-70 sm:py-2"
            disabled={executeMutation.isPending}
            onClick={() => executeMutation.mutate()}
          >
            {executeMutation.isPending ? <Spinner /> : null}
            {executeMutation.isPending
              ? t("spaces.historyImport.bringing")
              : t("spaces.historyImport.confirm")}
          </button>
        ) : null}
      </div>
    </AppSheet>
  );
}
