import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";
import type { SpaceSummary } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { FeedbackBanner } from "../../shared/ui/FeedbackBanner";
import { Spinner } from "../../shared/ui/Spinner";
import { CategoryLayerMapper } from "../spaces/CategoryLayerMapper";
import { updateMyLimits } from "../spaces/space-api";
import { useActiveSpace } from "../spaces/use-active-space";

export function MeSettingsPanel() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const { spacesQuery, activeSpace } = useActiveSpace();
  const [errorMessage, setErrorMessage] = useState("");
  const [saved, setSaved] = useState(false);

  const limitsMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateMyLimits>[1]) =>
      updateMyLimits(activeSpace!.id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<SpaceSummary[]>(["spaces"], (current) => {
        if (!current) {
          return current;
        }
        return current.map((item) => (item.id === updated.id ? updated : item));
      });
      void queryClient.invalidateQueries({ queryKey: ["month-summary"] });
      setSaved(true);
    },
    onError: (error: Error) => {
      setSaved(false);
      setErrorMessage(error.message);
    },
  });

  if (spacesQuery.isLoading) {
    return <p className="text-sm text-muted">{t("app.loading")}</p>;
  }

  if (!activeSpace) {
    return <p className="text-sm text-muted">{t("me.noSpace")}</p>;
  }

  function onLimitsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const personalEnabled = data.get("personalLimitEnabled") === "on";
    const leftoverEnabled = data.get("leftoverTargetEnabled") === "on";
    const personalRaw = String(data.get("personalLimitAmount") ?? "").trim();
    const leftoverRaw = String(data.get("leftoverTargetAmount") ?? "").trim();
    setErrorMessage("");
    setSaved(false);
    limitsMutation.mutate({
      personalLimitEnabled: personalEnabled,
      personalLimitAmount: personalEnabled ? Number(personalRaw) : null,
      leftoverTargetEnabled: leftoverEnabled,
      leftoverTargetAmount: leftoverEnabled ? Number(leftoverRaw) : null,
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      {errorMessage ? (
        <FeedbackBanner tone="error" message={errorMessage} />
      ) : null}
      {saved ? (
        <FeedbackBanner tone="success" message={t("limits.saved")} />
      ) : null}

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-5 py-5 md:px-6">
        <div>
          <h2 className="text-sm font-semibold text-fg">
            {t("limits.myLimits")}
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted">
            {t("limits.myLimitsHint")}
          </p>
        </div>
        <form
          key={`my-limits-${activeSpace.id}-${activeSpace.myLimits.personalLimitEnabled}-${activeSpace.myLimits.leftoverTargetEnabled}-${activeSpace.myLimits.personalLimitAmount}-${activeSpace.myLimits.leftoverTargetAmount}`}
          className="flex flex-col gap-3"
          onSubmit={onLimitsSubmit}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-muted">
              <span className="flex items-center gap-2 text-fg">
                <input
                  name="personalLimitEnabled"
                  type="checkbox"
                  defaultChecked={activeSpace.myLimits.personalLimitEnabled}
                />
                {t("limits.personal")}
              </span>
              <input
                name="personalLimitAmount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={activeSpace.myLimits.personalLimitAmount ?? ""}
                placeholder={t("limits.amount")}
                className="rounded-md border border-border bg-bg px-2 py-1.5 text-fg"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-muted">
              <span className="flex items-center gap-2 text-fg">
                <input
                  name="leftoverTargetEnabled"
                  type="checkbox"
                  defaultChecked={activeSpace.myLimits.leftoverTargetEnabled}
                />
                {t("limits.leftoverTarget")}
              </span>
              <input
                name="leftoverTargetAmount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={activeSpace.myLimits.leftoverTargetAmount ?? ""}
                placeholder={t("limits.amount")}
                className="rounded-md border border-border bg-bg px-2 py-1.5 text-fg"
              />
            </label>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 self-start rounded-md border border-border px-3 py-1.5 text-sm text-fg disabled:opacity-70"
            disabled={limitsMutation.isPending}
          >
            {limitsMutation.isPending ? <Spinner /> : null}
            {t("limits.save")}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-5 py-5 md:px-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-fg">
            <input
              type="checkbox"
              checked={activeSpace.myLimits.budgetLayersEnabled}
              disabled={limitsMutation.isPending}
              onChange={(event) => {
                setErrorMessage("");
                setSaved(false);
                limitsMutation.mutate({
                  budgetLayersEnabled: event.target.checked,
                });
              }}
            />
            {t("limits.layersToggle")}
          </label>
          <p className="mt-1 max-w-2xl text-xs text-muted">
            {t("limits.layersExplainMe")}
          </p>
        </div>
        {activeSpace.myLimits.budgetLayersEnabled ? (
          <CategoryLayerMapper spaceId={activeSpace.id} />
        ) : null}
      </section>
    </div>
  );
}
