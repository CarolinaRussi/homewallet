import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import type { BudgetLayer, SpaceSummary } from "@homewallet/shared";
import { SAVING_CATEGORY_NAME } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { ConfirmSheet } from "../../shared/ui/ConfirmSheet";
import { Spinner } from "../../shared/ui/Spinner";
import { fetchCategories } from "../entries/entry-api";
import {
  fetchSpaceMembers,
  inviteSpaceEmail,
  leaveSpace,
  promoteSpaceMember,
  regenerateJoinCode,
  updateCategory,
  updateCategoryLayer,
  updateMyLimits,
  updateSpace,
} from "./space-api";

function inviteLink(joinCode: string) {
  return `${window.location.origin}/settings?join=${encodeURIComponent(joinCode)}`;
}

type SpaceSettingsCardProps = {
  space: SpaceSummary;
  onError: (message: string) => void;
};

export function SpaceSettingsCard({ space, onError }: SpaceSettingsCardProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const settingsMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateSpace>[1]) =>
      updateSpace(space.id, body),
    onSuccess: async (updated) => {
      queryClient.setQueryData<SpaceSummary[]>(["spaces"], (current) => {
        if (!current) {
          return current;
        }
        return current.map((item) => (item.id === updated.id ? updated : item));
      });
      await queryClient.invalidateQueries({ queryKey: ["month-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["entries-shared"] });
    },
    onError: (error: Error) => onError(error.message),
  });

  const myLimitsMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateMyLimits>[1]) =>
      updateMyLimits(space.id, body),
    onSuccess: async (updated) => {
      queryClient.setQueryData<SpaceSummary[]>(["spaces"], (current) => {
        if (!current) {
          return current;
        }
        return current.map((item) => (item.id === updated.id ? updated : item));
      });
      await queryClient.invalidateQueries({ queryKey: ["month-summary"] });
    },
    onError: (error: Error) => onError(error.message),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateJoinCode(space.id),
    onSuccess: async (updated) => {
      queryClient.setQueryData<SpaceSummary[]>(["spaces"], (current) => {
        if (!current) {
          return current;
        }
        return current.map((item) => (item.id === updated.id ? updated : item));
      });
    },
    onError: (error: Error) => onError(error.message),
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => inviteSpaceEmail(space.id, email),
    onSuccess: () => {
      setInviteFeedback(true);
      window.setTimeout(() => setInviteFeedback(false), 2500);
    },
    onError: (error: Error) => onError(error.message),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveSpace(space.id),
    onSuccess: async () => {
      setLeaveOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["spaces"] });
      await queryClient.invalidateQueries({ queryKey: ["month-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["entries-shared"] });
    },
    onError: (error: Error) => onError(error.message),
  });

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(true);
      window.setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      onError(t("spaces.copyCode"));
    }
  }

  function onSpaceLimitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const enabled = data.get("spaceLimitEnabled") === "on";
    const raw = String(data.get("spaceLimitAmount") ?? "").trim();
    onError("");
    settingsMutation.mutate({
      spaceLimitEnabled: enabled,
      spaceLimitAmount: enabled ? Number(raw) : null,
    });
  }

  function onMyLimitsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const personalEnabled = data.get("personalLimitEnabled") === "on";
    const leftoverEnabled = data.get("leftoverTargetEnabled") === "on";
    const personalRaw = String(data.get("personalLimitAmount") ?? "").trim();
    const leftoverRaw = String(data.get("leftoverTargetAmount") ?? "").trim();
    onError("");
    myLimitsMutation.mutate({
      personalLimitEnabled: personalEnabled,
      personalLimitAmount: personalEnabled ? Number(personalRaw) : null,
      leftoverTargetEnabled: leftoverEnabled,
      leftoverTargetAmount: leftoverEnabled ? Number(leftoverRaw) : null,
    });
  }

  const isOwner = space.role === "owner";

  return (
    <article className="flex flex-col rounded-lg border border-border bg-surface">
      <header className="flex flex-col gap-1 border-b border-border px-5 py-5 md:px-6">
        <h2 className="text-xl font-semibold text-fg">{space.name}</h2>
        <p className="text-sm text-muted">
          {isOwner ? t("spaces.owner") : t("spaces.member")} · {space.currency}{" "}
          ·{" "}
          <span
            className={
              space.privacyMode === "transparent"
                ? "font-medium text-accent"
                : undefined
            }
          >
            {space.privacyMode === "private"
              ? t("spaces.private")
              : t("spaces.transparent")}
          </span>
        </p>
      </header>

      <section className="flex flex-col gap-4 border-b border-border px-5 py-5 md:px-6">
        <div>
          <h3 className="text-sm font-semibold text-fg">
            {t("spaces.sectionPeople")}
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-muted">
            {t("spaces.sectionPeopleHint")}
          </p>
        </div>

        <SpaceMembersSection space={space} onError={onError} />

        {isOwner && space.joinCode ? (
          <div className="rounded-md border border-border bg-bg/60 px-3 py-3">
            <p className="text-xs font-medium text-muted">
              {t("spaces.joinCode")}
            </p>
            <p className="mt-1 font-medium tabular-nums text-fg">
              {space.joinCode}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <button
                type="button"
                className="text-accent underline"
                onClick={() => void copyText(space.joinCode!)}
              >
                {t("spaces.copyCode")}
              </button>
              <button
                type="button"
                className="text-accent underline"
                onClick={() => void copyText(inviteLink(space.joinCode!))}
              >
                {t("spaces.copyLink")}
              </button>
              <button
                type="button"
                className="text-muted underline disabled:opacity-70"
                disabled={regenerateMutation.isPending}
                onClick={() => {
                  onError("");
                  regenerateMutation.mutate();
                }}
                title={t("spaces.regenerateHint")}
              >
                {t("spaces.regenerateCode")}
              </button>
            </div>
            {copyFeedback ? (
              <p className="mt-2 text-xs text-income-fg">
                {t("spaces.copied")}
              </p>
            ) : null}
          </div>
        ) : null}

        {isOwner ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              onError("");
              inviteMutation.mutate(String(data.get("email") ?? ""));
              event.currentTarget.reset();
            }}
          >
            <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs text-muted">
              {t("spaces.inviteEmail")}
              <input
                name="email"
                type="email"
                required
                placeholder={t("spaces.invitePlaceholder")}
                className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-fg disabled:opacity-70"
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? <Spinner /> : null}
              {inviteMutation.isPending
                ? t("spaces.inviteSending")
                : t("spaces.inviteSubmit")}
            </button>
            {inviteFeedback ? (
              <p className="w-full text-xs text-income-fg">
                {t("spaces.inviteSent")}
              </p>
            ) : null}
          </form>
        ) : null}
      </section>

      {isOwner ? (
        <section className="flex flex-col gap-5 border-b border-border px-5 py-5 md:px-6">
          <div>
            <h3 className="text-sm font-semibold text-fg">
              {t("spaces.sectionRules")}
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-muted">
              {t("spaces.sectionRulesHint")}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-fg">{t("spaces.privacy")}</p>
            <p className="mt-1 max-w-2xl text-xs text-muted">
              {t("spaces.privacyHint")}
            </p>
            <select
              className="hw-select-field mt-2 max-w-md disabled:opacity-70"
              value={space.privacyMode}
              disabled={settingsMutation.isPending}
              onChange={(event) =>
                settingsMutation.mutate({
                  privacyMode:
                    event.target.value === "transparent"
                      ? "transparent"
                      : "private",
                })
              }
            >
              <option value="private">{t("spaces.privacyPrivate")}</option>
              <option value="transparent">
                {t("spaces.privacyTransparent")}
              </option>
            </select>
          </div>

          <label className="flex max-w-md flex-col gap-1 text-sm text-muted">
            {t("spaces.entryDateMode")}
            <select
              className="hw-select-field disabled:opacity-70"
              value={space.entryDateMode}
              disabled={settingsMutation.isPending}
              onChange={(event) =>
                settingsMutation.mutate({
                  entryDateMode: event.target.value === "day" ? "day" : "month",
                })
              }
            >
              <option value="month">{t("spaces.dateModeMonth")}</option>
              <option value="day">{t("spaces.dateModeDay")}</option>
            </select>
          </label>

          <form className="flex flex-col gap-3" onSubmit={onSpaceLimitSubmit}>
            <div>
              <p className="text-sm font-medium text-fg">{t("limits.space")}</p>
              <p className="mt-1 max-w-2xl text-xs text-muted">
                {t("limits.spaceHint")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  name="spaceLimitEnabled"
                  type="checkbox"
                  defaultChecked={space.spaceLimitEnabled}
                />
                {t("limits.enable")}
              </label>
              <input
                name="spaceLimitAmount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={space.spaceLimitAmount ?? ""}
                placeholder={t("limits.amount")}
                className="w-40 rounded-md border border-border bg-bg px-2 py-1.5 text-fg"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-fg disabled:opacity-70"
                disabled={settingsMutation.isPending}
              >
                {settingsMutation.isPending ? <Spinner /> : null}
                {t("limits.save")}
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-2">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-fg">
                <input
                  type="checkbox"
                  checked={space.budgetLayersEnabled}
                  disabled={settingsMutation.isPending}
                  onChange={(event) =>
                    settingsMutation.mutate({
                      budgetLayersEnabled: event.target.checked,
                    })
                  }
                />
                {t("limits.layersToggle")}
              </label>
              <p className="mt-1 max-w-2xl text-xs text-muted">
                {t("limits.layersExplain")}
              </p>
            </div>
            {space.budgetLayersEnabled ? (
              <CategoryLayerMapper spaceId={space.id} />
            ) : null}
          </div>
        </section>
      ) : (
        <section className="border-b border-border px-5 py-4 md:px-6">
          <p className="text-sm text-muted">
            {t("spaces.entryDateMode")}:{" "}
            {space.entryDateMode === "month"
              ? t("spaces.dateModeMonth")
              : t("spaces.dateModeDay")}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3 border-b border-border px-5 py-5 md:px-6">
        <div>
          <h3 className="text-sm font-semibold text-fg">
            {t("limits.myLimits")}
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-muted">
            {t("limits.myLimitsHint")}
          </p>
        </div>
        <form
          key={`my-limits-${space.id}-${space.myLimits.personalLimitEnabled}-${space.myLimits.leftoverTargetEnabled}-${space.myLimits.personalLimitAmount}-${space.myLimits.leftoverTargetAmount}`}
          className="flex flex-col gap-3"
          onSubmit={onMyLimitsSubmit}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-muted">
              <span className="flex items-center gap-2 text-fg">
                <input
                  name="personalLimitEnabled"
                  type="checkbox"
                  defaultChecked={space.myLimits.personalLimitEnabled}
                />
                {t("limits.personal")}
              </span>
              <input
                name="personalLimitAmount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={space.myLimits.personalLimitAmount ?? ""}
                placeholder={t("limits.amount")}
                className="rounded-md border border-border bg-bg px-2 py-1.5 text-fg"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-muted">
              <span className="flex items-center gap-2 text-fg">
                <input
                  name="leftoverTargetEnabled"
                  type="checkbox"
                  defaultChecked={space.myLimits.leftoverTargetEnabled}
                />
                {t("limits.leftoverTarget")}
              </span>
              <input
                name="leftoverTargetAmount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={space.myLimits.leftoverTargetAmount ?? ""}
                placeholder={t("limits.amount")}
                className="rounded-md border border-border bg-bg px-2 py-1.5 text-fg"
              />
            </label>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 self-start rounded-md border border-border px-3 py-1.5 text-sm text-fg disabled:opacity-70"
            disabled={myLimitsMutation.isPending}
          >
            {myLimitsMutation.isPending ? <Spinner /> : null}
            {t("limits.save")}
          </button>
        </form>
      </section>

      <details className="group border-b border-border px-5 py-4 md:px-6">
        <summary className="cursor-pointer list-none text-sm font-semibold text-fg marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            {t("spaces.sectionCategories")}
            <span className="text-xs font-normal text-muted group-open:hidden">
              {t("spaces.sectionCategoriesMore")}
            </span>
          </span>
        </summary>
        <p className="mt-2 max-w-2xl text-xs text-muted">
          {t("me.categoryLineDetailHint")}
        </p>
        <div className="mt-3">
          <CategoryLineDetailMapper spaceId={space.id} />
        </div>
      </details>

      <footer className="px-5 py-4 md:px-6">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm text-expense-fg underline disabled:opacity-70"
          disabled={leaveMutation.isPending}
          onClick={() => {
            onError("");
            setLeaveOpen(true);
          }}
        >
          {t("spaces.leave")}
        </button>
      </footer>

      <ConfirmSheet
        open={leaveOpen}
        title={t("spaces.leaveTitle")}
        description={t("spaces.leaveConfirm")}
        confirmLabel={t("spaces.leaveSubmit")}
        cancelLabel={t("me.cancel")}
        danger
        pending={leaveMutation.isPending}
        onClose={() => {
          if (!leaveMutation.isPending) {
            setLeaveOpen(false);
          }
        }}
        onConfirm={() => leaveMutation.mutate()}
      />
    </article>
  );
}

function SpaceMembersSection({
  space,
  onError,
}: {
  space: SpaceSummary;
  onError: (message: string) => void;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const membersQuery = useQuery({
    queryKey: ["space-members", space.id],
    queryFn: () => fetchSpaceMembers(space.id),
  });

  const promoteMutation = useMutation({
    mutationFn: (userId: string) => promoteSpaceMember(space.id, userId),
    onSuccess: async (members) => {
      queryClient.setQueryData(["space-members", space.id], members);
      await queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
    onError: (error: Error) => onError(error.message),
  });

  return (
    <ul className="flex flex-col gap-2">
      {membersQuery.data?.map((member) => (
        <li
          key={member.userId}
          className="flex flex-wrap items-center justify-between gap-2 text-sm"
        >
          <div>
            <p className="text-fg">{member.name}</p>
            <p className="text-xs text-muted">
              {member.email} ·{" "}
              {member.role === "owner" ? t("spaces.owner") : t("spaces.member")}
            </p>
          </div>
          {space.role === "owner" && member.role === "member" ? (
            <button
              type="button"
              className="text-accent underline disabled:opacity-70"
              disabled={promoteMutation.isPending}
              onClick={() => promoteMutation.mutate(member.userId)}
            >
              {t("spaces.promote")}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function CategoryLineDetailMapper({ spaceId }: { spaceId: string }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: ["categories", spaceId],
    queryFn: () => fetchCategories(spaceId),
  });

  const detailMutation = useMutation({
    mutationFn: ({
      categoryId,
      lineDetailEnabled,
    }: {
      categoryId: string;
      lineDetailEnabled: boolean;
    }) => updateCategory(spaceId, categoryId, { lineDetailEnabled }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["categories", spaceId],
      });
    },
  });

  const ledgerCategories = (categoriesQuery.data ?? []).filter(
    (category) => category.name !== SAVING_CATEGORY_NAME
  );

  if (!ledgerCategories.length) {
    return <p className="text-sm text-muted">{t("spaces.categoriesEmpty")}</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ledgerCategories.map((category) => (
        <label
          key={category.id}
          className="flex items-center gap-2 text-sm text-muted"
        >
          <input
            type="checkbox"
            checked={category.lineDetailEnabled}
            disabled={detailMutation.isPending}
            onChange={(event) =>
              detailMutation.mutate({
                categoryId: category.id,
                lineDetailEnabled: event.target.checked,
              })
            }
          />
          <span className="text-fg">{category.name}</span>
        </label>
      ))}
    </div>
  );
}

function CategoryLayerMapper({ spaceId }: { spaceId: string }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: ["categories", spaceId],
    queryFn: () => fetchCategories(spaceId),
  });

  const layerMutation = useMutation({
    mutationFn: ({
      categoryId,
      budgetLayer,
    }: {
      categoryId: string;
      budgetLayer: BudgetLayer | null;
    }) => updateCategoryLayer(spaceId, categoryId, budgetLayer),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["categories", spaceId],
      });
      await queryClient.invalidateQueries({ queryKey: ["month-summary"] });
    },
  });

  if (!categoriesQuery.data?.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
      <p className="text-xs text-muted">{t("limits.layersMapHint")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {categoriesQuery.data.map((category) => (
          <label
            key={category.id}
            className="flex items-center justify-between gap-2 text-sm text-muted"
          >
            <span className="text-fg">{category.name}</span>
            <select
              className="hw-select-field py-1 text-sm disabled:opacity-70"
              value={category.budgetLayer ?? ""}
              disabled={layerMutation.isPending}
              onChange={(event) => {
                const value = event.target.value;
                layerMutation.mutate({
                  categoryId: category.id,
                  budgetLayer:
                    value === "essential" ||
                    value === "personal" ||
                    value === "future"
                      ? value
                      : null,
                });
              }}
            >
              <option value="">{t("limits.layerNone")}</option>
              <option value="essential">{t("limits.layerEssential")}</option>
              <option value="personal">{t("limits.layerPersonal")}</option>
              <option value="future">{t("limits.layerFuture")}</option>
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
