import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { currentMonthValue, monthToOccurredOn } from "../../shared/lib/money";
import { AppSheet } from "../../shared/ui/AppSheet";
import { FeedbackBanner } from "../../shared/ui/FeedbackBanner";
import { Spinner } from "../../shared/ui/Spinner";
import { createLeftoverSeed, createReserveMovement } from "./leftover-api";
import { fetchReservePots } from "./reserve-api";

export type WelcomeSpaceState = {
  welcomeSpace: true;
  firstSpace?: boolean;
  spaceId?: string;
};

export type WelcomeDoneDestination = "me" | "home";

type WelcomeSpaceModalProps = {
  spaceId: string;
  firstSpace: boolean;
  onDone: (destination: WelcomeDoneDestination) => void;
};

export function WelcomeSpaceModal({
  spaceId,
  firstSpace,
  onDone,
}: WelcomeSpaceModalProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState("");
  const [open, setOpen] = useState(true);
  const month = currentMonthValue();

  const potsQuery = useQuery({
    queryKey: ["reserve-pots", spaceId],
    queryFn: () => fetchReservePots(spaceId),
  });

  const saveMutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const data = new FormData(form);
      const leftoverRaw = String(data.get("leftover") ?? "").trim();
      const reserveRaw = String(data.get("reserve") ?? "").trim();
      const leftoverAmount = leftoverRaw ? Number(leftoverRaw) : 0;
      const reserveAmount = reserveRaw ? Number(reserveRaw) : 0;
      const occurredOn = monthToOccurredOn(month);
      const defaultPot = potsQuery.data?.[0];

      if (leftoverAmount > 0) {
        await createLeftoverSeed(spaceId, {
          amount: leftoverAmount,
          occurredOn,
          description: "",
        });
      }
      if (reserveAmount > 0) {
        if (!defaultPot) {
          throw new Error(t("welcome.reserveNeedsPot"));
        }
        await createReserveMovement(spaceId, {
          type: "seed",
          amount: reserveAmount,
          occurredOn,
          description: "",
          reservePotId: defaultPot.id,
        });
      }
    },
    onSuccess: async () => {
      void queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["reserve-pots", spaceId],
      });
      setOpen(false);
      window.setTimeout(() => onDone("me"), 220);
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  function finish(destination: WelcomeDoneDestination) {
    setOpen(false);
    window.setTimeout(() => onDone(destination), 220);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    saveMutation.mutate(event.currentTarget);
  }

  return (
    <AppSheet
      open={open}
      onClose={() => finish("me")}
      pending={saveMutation.isPending}
      labelledBy="welcome-space-title"
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <div>
          <h2
            id="welcome-space-title"
            className="text-lg font-semibold text-fg"
          >
            {firstSpace
              ? t("welcome.firstSpaceTitle")
              : t("welcome.newSpaceTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted">{t("welcome.hint")}</p>
        </div>

        <div className="grid gap-3">
          <label className="flex flex-col gap-1 text-sm text-muted">
            {t("welcome.leftoverLabel")}
            <input
              name="leftover"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg tabular-nums"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            {t("welcome.reserveLabel")}
            <input
              name="reserve"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg tabular-nums"
            />
          </label>
        </div>

        {errorMessage ? (
          <FeedbackBanner tone="error" message={errorMessage} />
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 font-medium text-accent-fg disabled:opacity-70"
            disabled={saveMutation.isPending || potsQuery.isLoading}
          >
            {saveMutation.isPending ? <Spinner /> : null}
            {saveMutation.isPending
              ? t("me.saving")
              : t("welcome.saveAndContinue")}
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-2 text-sm text-fg disabled:opacity-70"
            disabled={saveMutation.isPending}
            onClick={() => finish("me")}
          >
            {t("welcome.skip")}
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm text-muted underline disabled:opacity-70"
            disabled={saveMutation.isPending}
            onClick={() => finish("home")}
          >
            {t("welcome.goHome")}
          </button>
        </div>
      </form>
    </AppSheet>
  );
}
