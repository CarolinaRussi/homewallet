import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import {
  currentMonthValue,
  formatEntryDate,
  formatMoney,
  monthToOccurredOn,
  todayIsoDate,
} from "../../shared/lib/money";
import { ConfirmSheet } from "../../shared/ui/ConfirmSheet";
import { FeedbackBanner } from "../../shared/ui/FeedbackBanner";
import {
  ListRowsSkeleton,
  PotGridSkeleton,
  Skeleton,
} from "../../shared/ui/Skeleton";
import { Spinner } from "../../shared/ui/Spinner";
import { useActiveSpace } from "../spaces/use-active-space";
import {
  createReserveMovement,
  deleteReserveMovement,
  fetchMonthSummary,
} from "./leftover-api";
import {
  createReservePot,
  deleteReservePot,
  fetchReservePots,
  updateReservePot,
} from "./reserve-api";

export function ReservePage() {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const { spacesQuery, spaces, activeSpace, spaceId, selectSpace } =
    useActiveSpace();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deletePotId, setDeletePotId] = useState<string | null>(null);
  const month = currentMonthValue();

  const potsQuery = useQuery({
    queryKey: ["reserve-pots", spaceId],
    queryFn: () => fetchReservePots(spaceId!),
    enabled: Boolean(spaceId),
  });

  const summaryQuery = useQuery({
    queryKey: ["month-summary", spaceId, month],
    queryFn: () => fetchMonthSummary(spaceId!, month),
    enabled: Boolean(spaceId),
  });

  const potMutation = useMutation({
    mutationFn: async ({
      mode,
      name,
      potId,
    }: {
      mode: "create" | "rename" | "delete";
      name?: string;
      potId?: string;
    }) => {
      if (!spaceId) {
        throw new Error("No space");
      }
      if (mode === "create") {
        return createReservePot(spaceId, { name: name! });
      }
      if (mode === "rename") {
        return updateReservePot(potId!, { name: name! });
      }
      return deleteReservePot(potId!);
    },
    onSuccess: async () => {
      setDeletePotId(null);
      setSuccessMessage(t("reserve.potsSaved"));
      setErrorMessage("");
      await queryClient.invalidateQueries({
        queryKey: ["reserve-pots", spaceId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
    },
    onError: (error: Error) => {
      setSuccessMessage("");
      setErrorMessage(error.message);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (body: {
      amount: number;
      occurredOn: string;
      description: string;
      reservePotId: string;
    }) =>
      createReserveMovement(spaceId!, {
        type: "withdraw",
        ...body,
      }),
    onSuccess: async () => {
      setSuccessMessage(t("me.reserveWithdrawn"));
      setErrorMessage("");
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["reserve-pots", spaceId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["entries", spaceId],
      });
    },
    onError: (error: Error) => {
      setSuccessMessage("");
      setErrorMessage(error.message);
    },
  });

  const seedMutation = useMutation({
    mutationFn: (body: {
      amount: number;
      occurredOn: string;
      description: string;
      reservePotId: string;
    }) =>
      createReserveMovement(spaceId!, {
        type: "seed",
        ...body,
      }),
    onSuccess: async () => {
      setSuccessMessage(t("me.reserveSeeded"));
      setErrorMessage("");
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["reserve-pots", spaceId],
      });
    },
    onError: (error: Error) => {
      setSuccessMessage("");
      setErrorMessage(error.message);
    },
  });

  const deleteMovementMutation = useMutation({
    mutationFn: deleteReserveMovement,
    onSuccess: async () => {
      setSuccessMessage(t("me.reserveDeleted"));
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["reserve-pots", spaceId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["entries", spaceId],
      });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  function onCreatePot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    potMutation.mutate({
      mode: "create",
      name: String(data.get("name") ?? ""),
    });
    event.currentTarget.reset();
  }

  function onWithdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSpace) {
      return;
    }
    const data = new FormData(event.currentTarget);
    const rawDate = String(data.get("occurredOn") ?? "");
    const occurredOn =
      activeSpace.entryDateMode === "month"
        ? monthToOccurredOn(rawDate)
        : rawDate;
    withdrawMutation.mutate({
      amount: Number(data.get("amount")),
      occurredOn,
      description: String(data.get("description") ?? ""),
      reservePotId: String(data.get("reservePotId")),
    });
    event.currentTarget.reset();
  }

  function onSeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSpace) {
      return;
    }
    const data = new FormData(event.currentTarget);
    const rawDate = String(data.get("occurredOn") ?? "");
    const occurredOn =
      activeSpace.entryDateMode === "month"
        ? monthToOccurredOn(rawDate)
        : rawDate;
    seedMutation.mutate({
      amount: Number(data.get("amount")),
      occurredOn,
      description: String(data.get("description") ?? ""),
      reservePotId: String(data.get("reservePotId")),
    });
    event.currentTarget.reset();
  }

  if (spacesQuery.isLoading) {
    return (
      <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
        <header>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        </header>
        <div className="rounded-lg border border-border bg-surface p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-9 w-36" />
        </div>
        <PotGridSkeleton />
      </main>
    );
  }

  if (!spaceId || !activeSpace) {
    return (
      <main className="px-6 py-8 md:px-10">
        <h1 className="text-3xl font-semibold text-fg">{t("reserve.title")}</h1>
        <p className="mt-3 text-muted">{t("me.noSpace")}</p>
      </main>
    );
  }

  const pageLoading = potsQuery.isLoading || summaryQuery.isLoading;
  const pots = potsQuery.data ?? [];
  const defaultDate =
    activeSpace.entryDateMode === "month" ? month : todayIsoDate();
  const tabMovements =
    summaryQuery.data?.movements.filter(
      (movement) => movement.type === "withdraw" || movement.type === "seed"
    ) ?? [];

  return (
    <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-fg">
            {t("reserve.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {t("reserve.hint")}
          </p>
        </div>
        {spaces.length > 1 ? (
          <select
            className="hw-select"
            value={spaceId}
            onChange={(event) => selectSpace(event.target.value)}
          >
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        ) : null}
      </header>

      {errorMessage ? (
        <FeedbackBanner tone="error" message={errorMessage} />
      ) : null}
      {successMessage ? (
        <FeedbackBanner tone="success" message={successMessage} />
      ) : null}

      {pageLoading ? (
        <>
          <div className="rounded-lg border border-border bg-surface p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-9 w-36" />
            <Skeleton className="mt-3 h-4 w-64" />
          </div>
          <section className="flex flex-col gap-3">
            <Skeleton className="h-6 w-40" />
            <PotGridSkeleton />
          </section>
          <ListRowsSkeleton count={2} />
        </>
      ) : (
        <>
          <section className="rounded-lg border border-border bg-surface p-5">
            <p className="text-sm text-muted">{t("reserve.total")}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-accent">
              {formatMoney(
                summaryQuery.data?.reserveBalance ?? 0,
                activeSpace.currency,
                locale
              )}
            </p>
            <p className="mt-2 text-sm text-muted">
              {t("reserve.saveViaEntry")}{" "}
              <Link to="/me" className="text-accent underline">
                {t("nav.me")}
              </Link>
              .
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-fg">
              {t("reserve.pots")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pots.map((pot) => (
                <PotCard
                  key={pot.id}
                  pot={pot}
                  currency={activeSpace.currency}
                  locale={locale}
                  busy={potMutation.isPending}
                  onRename={(name) =>
                    potMutation.mutate({ mode: "rename", potId: pot.id, name })
                  }
                  onDelete={() => setDeletePotId(pot.id)}
                />
              ))}
            </div>
            <form
              className="mt-2 flex flex-wrap items-end gap-2"
              onSubmit={onCreatePot}
            >
              <label className="flex flex-col gap-1 text-sm text-muted">
                {t("reserve.newPot")}
                <input
                  name="name"
                  required
                  maxLength={60}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-fg disabled:opacity-70"
                disabled={potMutation.isPending}
              >
                {potMutation.isPending ? <Spinner /> : null}
                {t("reserve.createPot")}
              </button>
            </form>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <form
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
              onSubmit={onWithdraw}
            >
              <h3 className="font-medium text-fg">{t("me.reserveWithdraw")}</h3>
              <p className="text-xs text-muted">{t("reserve.withdrawHint")}</p>
              <label className="flex flex-col gap-1 text-sm text-muted">
                {t("reserve.pot")}
                <select
                  name="reservePotId"
                  required
                  className="hw-select-field"
                  defaultValue={pots[0]?.id ?? ""}
                >
                  {pots.map((pot) => (
                    <option key={pot.id} value={pot.id}>
                      {pot.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                {t("me.amount")}
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                {activeSpace.entryDateMode === "month"
                  ? t("me.month")
                  : t("me.date")}
                <input
                  name="occurredOn"
                  type={
                    activeSpace.entryDateMode === "month" ? "month" : "date"
                  }
                  required
                  defaultValue={defaultDate}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                {t("me.description")}
                <input
                  name="description"
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 font-medium text-fg disabled:opacity-70"
                disabled={withdrawMutation.isPending || pots.length === 0}
              >
                {withdrawMutation.isPending ? <Spinner /> : null}
                {t("me.reserveWithdrawSubmit")}
              </button>
            </form>

            <form
              className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-surface p-4"
              onSubmit={onSeed}
            >
              <h3 className="font-medium text-fg">{t("me.reserveSeed")}</h3>
              <p className="text-xs text-muted">{t("me.reserveSeedHint")}</p>
              <label className="flex flex-col gap-1 text-sm text-muted">
                {t("reserve.pot")}
                <select
                  name="reservePotId"
                  required
                  className="hw-select-field"
                  defaultValue={pots[0]?.id ?? ""}
                >
                  {pots.map((pot) => (
                    <option key={pot.id} value={pot.id}>
                      {pot.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                {t("me.amount")}
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                {activeSpace.entryDateMode === "month"
                  ? t("me.month")
                  : t("me.date")}
                <input
                  name="occurredOn"
                  type={
                    activeSpace.entryDateMode === "month" ? "month" : "date"
                  }
                  required
                  defaultValue={defaultDate}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                {t("me.description")}
                <input
                  name="description"
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-fg disabled:opacity-70"
                disabled={seedMutation.isPending || pots.length === 0}
              >
                {seedMutation.isPending ? <Spinner /> : null}
                {t("me.reserveSeedSubmit")}
              </button>
            </form>
          </section>

          {tabMovements.length ? (
            <section className="flex flex-col gap-2">
              <h2 className="font-medium text-fg">{t("reserve.movements")}</h2>
              {tabMovements.map((movement) => (
                <article
                  key={movement.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-fg">
                      {movement.type === "withdraw"
                        ? t("me.reserveWithdraw")
                        : t("me.reserveSeed")}
                      {movement.reservePotName
                        ? ` · ${movement.reservePotName}`
                        : ""}
                      {movement.description ? (
                        <span className="font-normal text-muted">
                          {" "}
                          · {movement.description}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted">
                      {formatEntryDate(
                        movement.occurredOn,
                        activeSpace.entryDateMode
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="tabular-nums font-semibold text-fg">
                      {formatMoney(
                        movement.amount,
                        activeSpace.currency,
                        locale
                      )}
                    </p>
                    <button
                      type="button"
                      className="text-sm text-expense-fg underline disabled:opacity-70"
                      disabled={deleteMovementMutation.isPending}
                      onClick={() => deleteMovementMutation.mutate(movement.id)}
                    >
                      {t("me.delete")}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ) : null}
        </>
      )}

      <ConfirmSheet
        open={Boolean(deletePotId)}
        title={t("reserve.deleteTitle")}
        description={t("reserve.deleteConfirm")}
        confirmLabel={t("reserve.deleteSubmit")}
        cancelLabel={t("me.cancel")}
        danger
        pending={potMutation.isPending}
        onClose={() => {
          if (!potMutation.isPending) {
            setDeletePotId(null);
          }
        }}
        onConfirm={() => {
          if (deletePotId) {
            potMutation.mutate({ mode: "delete", potId: deletePotId });
          }
        }}
      />
    </main>
  );
}

function PotCard({
  pot,
  currency,
  locale,
  busy,
  onRename,
  onDelete,
}: {
  pot: import("@homewallet/shared").ReservePotSummary;
  currency: string;
  locale: string;
  busy: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pot.name);

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      {editing ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onRename(name.trim());
            setEditing(false);
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-fg"
            required
            maxLength={60}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="text-sm text-accent underline disabled:opacity-70"
              disabled={busy}
            >
              {t("me.save")}
            </button>
            <button
              type="button"
              className="text-sm text-muted underline"
              onClick={() => {
                setName(pot.name);
                setEditing(false);
              }}
            >
              {t("me.cancel")}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="font-medium text-fg">{pot.name}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-accent">
            {formatMoney(pot.balance, currency, locale)}
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              className="text-sm text-muted underline disabled:opacity-70"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              {t("reserve.rename")}
            </button>
            <button
              type="button"
              className="text-sm text-expense-fg underline disabled:opacity-70"
              disabled={busy || pot.balance > 0}
              onClick={onDelete}
              title={pot.balance > 0 ? t("reserve.deleteBlocked") : undefined}
            >
              {t("me.delete")}
            </button>
          </div>
        </>
      )}
    </article>
  );
}
