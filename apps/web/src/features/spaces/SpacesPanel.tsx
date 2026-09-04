import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { BudgetLayer, SpaceSummary } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { fetchCategories } from "../entries/entry-api";
import {
  createSpace,
  fetchSpaceMembers,
  fetchSpaces,
  joinSpace,
  leaveSpace,
  promoteSpaceMember,
  regenerateJoinCode,
  updateCategoryLayer,
  updateMyLimits,
  updateSpace,
} from "./space-api";
import { useActiveSpace } from "./use-active-space";
import { ConfirmSheet } from "../../shared/ui/ConfirmSheet";
import { SpaceCardsSkeleton } from "../../shared/ui/Skeleton";
import { Spinner } from "../../shared/ui/Spinner";

function inviteLink(joinCode: string) {
  return `${window.location.origin}/settings?join=${encodeURIComponent(joinCode)}`;
}

export function SpacesPanel() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { selectSpace } = useActiveSpace();
  const [errorMessage, setErrorMessage] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [leaveSpaceId, setLeaveSpaceId] = useState<string | null>(null);
  const joinPrefill = searchParams.get("join") ?? "";
  const spacesQuery = useQuery({ queryKey: ["spaces"], queryFn: fetchSpaces });

  const createMutation = useMutation({
    mutationFn: createSpace,
    onSuccess: async (space) => {
      await queryClient.invalidateQueries({ queryKey: ["spaces"] });
      selectSpace(space.id);
      navigate("/me", {
        state: { welcomeSpace: true, firstSpace: false, spaceId: space.id },
      });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const joinMutation = useMutation({
    mutationFn: joinSpace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["spaces"] }),
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const settingsMutation = useMutation({
    mutationFn: ({
      spaceId,
      body,
    }: {
      spaceId: string;
      body: Parameters<typeof updateSpace>[1];
    }) => updateSpace(spaceId, body),
    onSuccess: async (space) => {
      queryClient.setQueryData<SpaceSummary[]>(["spaces"], (current) => {
        if (!current) {
          return current;
        }
        return current.map((item) => (item.id === space.id ? space : item));
      });
      await queryClient.invalidateQueries({ queryKey: ["month-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["entries-shared"] });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const myLimitsMutation = useMutation({
    mutationFn: ({
      spaceId,
      body,
    }: {
      spaceId: string;
      body: Parameters<typeof updateMyLimits>[1];
    }) => updateMyLimits(spaceId, body),
    onSuccess: async (space) => {
      queryClient.setQueryData<SpaceSummary[]>(["spaces"], (current) => {
        if (!current) {
          return current;
        }
        return current.map((item) => (item.id === space.id ? space : item));
      });
      await queryClient.invalidateQueries({ queryKey: ["month-summary"] });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateJoinCode,
    onSuccess: async (space) => {
      queryClient.setQueryData<SpaceSummary[]>(["spaces"], (current) => {
        if (!current) {
          return current;
        }
        return current.map((item) => (item.id === space.id ? space : item));
      });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const leaveMutation = useMutation({
    mutationFn: leaveSpace,
    onSuccess: async () => {
      setLeaveSpaceId(null);
      await queryClient.invalidateQueries({ queryKey: ["spaces"] });
      await queryClient.invalidateQueries({ queryKey: ["month-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["entries-shared"] });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(label);
      window.setTimeout(() => setCopyFeedback(""), 2000);
    } catch {
      setErrorMessage(t("spaces.copyCode"));
    }
  }

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setErrorMessage("");
    createMutation.mutate({ name: String(data.get("name") ?? "") });
    event.currentTarget.reset();
  }

  function onJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setErrorMessage("");
    joinMutation.mutate(String(data.get("joinCode") ?? ""));
    event.currentTarget.reset();
  }

  function onSpaceLimitSubmit(
    event: FormEvent<HTMLFormElement>,
    space: SpaceSummary
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const enabled = data.get("spaceLimitEnabled") === "on";
    const raw = String(data.get("spaceLimitAmount") ?? "").trim();
    setErrorMessage("");
    settingsMutation.mutate({
      spaceId: space.id,
      body: {
        spaceLimitEnabled: enabled,
        spaceLimitAmount: enabled ? Number(raw) : null,
      },
    });
  }

  function onMyLimitsSubmit(
    event: FormEvent<HTMLFormElement>,
    space: SpaceSummary
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const personalEnabled = data.get("personalLimitEnabled") === "on";
    const leftoverEnabled = data.get("leftoverTargetEnabled") === "on";
    const personalRaw = String(data.get("personalLimitAmount") ?? "").trim();
    const leftoverRaw = String(data.get("leftoverTargetAmount") ?? "").trim();
    setErrorMessage("");
    myLimitsMutation.mutate({
      spaceId: space.id,
      body: {
        personalLimitEnabled: personalEnabled,
        personalLimitAmount: personalEnabled ? Number(personalRaw) : null,
        leftoverTargetEnabled: leftoverEnabled,
        leftoverTargetAmount: leftoverEnabled ? Number(leftoverRaw) : null,
      },
    });
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-fg">{t("spaces.title")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">{t("spaces.hint")}</p>
      </div>

      {errorMessage ? (
        <p className="text-sm text-expense-fg">{errorMessage}</p>
      ) : null}
      {copyFeedback ? (
        <p className="text-sm text-income-fg">{t("spaces.copied")}</p>
      ) : null}

      <section className="grid gap-4 border-b border-border pb-8 md:grid-cols-2">
        <form className="flex flex-col gap-2" onSubmit={onCreate}>
          <h3 className="font-medium text-fg">{t("spaces.create")}</h3>
          <input
            name="name"
            required
            placeholder={t("spaces.createName")}
            className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-accent px-3 py-2 font-medium text-accent-fg disabled:opacity-70"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <Spinner /> : null}
            {createMutation.isPending
              ? t("spaces.creating")
              : t("spaces.createSubmit")}
          </button>
        </form>

        <form className="flex flex-col gap-2" onSubmit={onJoin}>
          <h3 className="font-medium text-fg">{t("spaces.join")}</h3>
          <input
            key={joinPrefill || "join-empty"}
            name="joinCode"
            required
            minLength={8}
            defaultValue={joinPrefill}
            placeholder={t("spaces.joinPlaceholder")}
            className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 self-start rounded-md border border-border px-3 py-2 font-medium text-fg disabled:opacity-70"
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? <Spinner /> : null}
            {joinMutation.isPending
              ? t("spaces.joining")
              : t("spaces.joinSubmit")}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        {spacesQuery.isLoading ? (
          <SpaceCardsSkeleton />
        ) : (
          spacesQuery.data?.map((space) => (
            <article
              key={space.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 md:p-6"
            >
              <div>
                <h3 className="font-medium text-fg">{space.name}</h3>
                <p className="text-sm text-muted">
                  {space.role === "owner"
                    ? t("spaces.owner")
                    : t("spaces.member")}{" "}
                  · {space.currency} ·{" "}
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
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span>
                    {t("spaces.joinCode")}:{" "}
                    <span className="font-medium text-fg">
                      {space.joinCode}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="text-accent underline"
                    onClick={() => void copyText("code", space.joinCode)}
                  >
                    {t("spaces.copyCode")}
                  </button>
                  <button
                    type="button"
                    className="text-accent underline"
                    onClick={() =>
                      void copyText("link", inviteLink(space.joinCode))
                    }
                  >
                    {t("spaces.copyLink")}
                  </button>
                  {space.role === "owner" ? (
                    <button
                      type="button"
                      className="text-muted underline disabled:opacity-70"
                      disabled={regenerateMutation.isPending}
                      onClick={() => {
                        setErrorMessage("");
                        regenerateMutation.mutate(space.id);
                      }}
                      title={t("spaces.regenerateHint")}
                    >
                      {t("spaces.regenerateCode")}
                    </button>
                  ) : null}
                </div>
              </div>

              {space.role === "owner" ? (
                <div className="flex flex-col gap-4 border-t border-border pt-4">
                  <div>
                    <p className="text-sm font-medium text-fg">
                      {t("spaces.privacy")}
                    </p>
                    <p className="mt-1 max-w-3xl text-xs text-muted">
                      {t("spaces.privacyHint")}
                    </p>
                    <select
                      className="mt-2 max-w-md rounded-md border border-border bg-bg px-2 py-1.5 text-fg disabled:opacity-70"
                      value={space.privacyMode}
                      disabled={settingsMutation.isPending}
                      onChange={(event) =>
                        settingsMutation.mutate({
                          spaceId: space.id,
                          body: {
                            privacyMode:
                              event.target.value === "transparent"
                                ? "transparent"
                                : "private",
                          },
                        })
                      }
                    >
                      <option value="private">
                        {t("spaces.privacyPrivate")}
                      </option>
                      <option value="transparent">
                        {t("spaces.privacyTransparent")}
                      </option>
                    </select>
                  </div>

                  <label className="flex max-w-md flex-col gap-1 text-sm text-muted">
                    {t("spaces.entryDateMode")}
                    <select
                      className="rounded-md border border-border bg-bg px-2 py-1.5 text-fg disabled:opacity-70"
                      value={space.entryDateMode}
                      disabled={settingsMutation.isPending}
                      onChange={(event) =>
                        settingsMutation.mutate({
                          spaceId: space.id,
                          body: {
                            entryDateMode:
                              event.target.value === "day" ? "day" : "month",
                          },
                        })
                      }
                    >
                      <option value="month">{t("spaces.dateModeMonth")}</option>
                      <option value="day">{t("spaces.dateModeDay")}</option>
                    </select>
                  </label>

                  <form
                    className="flex flex-col gap-3"
                    onSubmit={(event) => onSpaceLimitSubmit(event, space)}
                  >
                    <div>
                      <p className="text-sm font-medium text-fg">
                        {t("limits.space")}
                      </p>
                      <p className="mt-1 max-w-3xl text-xs text-muted">
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
                              spaceId: space.id,
                              body: {
                                budgetLayersEnabled: event.target.checked,
                              },
                            })
                          }
                        />
                        {t("limits.layersToggle")}
                      </label>
                      <p className="mt-1 max-w-3xl text-xs text-muted">
                        {t("limits.layersExplain")}
                      </p>
                    </div>
                    {space.budgetLayersEnabled ? (
                      <CategoryLayerMapper spaceId={space.id} />
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="border-t border-border pt-3 text-sm text-muted">
                  {t("spaces.entryDateMode")}:{" "}
                  {space.entryDateMode === "month"
                    ? t("spaces.dateModeMonth")
                    : t("spaces.dateModeDay")}
                </p>
              )}

              <form
                key={`my-limits-${space.id}-${space.myLimits.personalLimitEnabled}-${space.myLimits.leftoverTargetEnabled}-${space.myLimits.personalLimitAmount}-${space.myLimits.leftoverTargetAmount}`}
                className="flex flex-col gap-3 border-t border-border pt-4"
                onSubmit={(event) => onMyLimitsSubmit(event, space)}
              >
                <div>
                  <p className="text-sm font-medium text-fg">
                    {t("limits.myLimits")}
                  </p>
                  <p className="mt-1 max-w-3xl text-xs text-muted">
                    {t("limits.myLimitsHint")}
                  </p>
                </div>
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

              <SpaceMembersSection space={space} onError={setErrorMessage} />

              <div className="border-t border-border pt-4">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm text-expense-fg underline disabled:opacity-70"
                  disabled={leaveMutation.isPending}
                  onClick={() => {
                    setErrorMessage("");
                    setLeaveSpaceId(space.id);
                  }}
                >
                  {t("spaces.leave")}
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <ConfirmSheet
        open={Boolean(leaveSpaceId)}
        title={t("spaces.leaveTitle")}
        description={t("spaces.leaveConfirm")}
        confirmLabel={t("spaces.leaveSubmit")}
        cancelLabel={t("me.cancel")}
        danger
        pending={leaveMutation.isPending}
        onClose={() => {
          if (!leaveMutation.isPending) {
            setLeaveSpaceId(null);
          }
        }}
        onConfirm={() => {
          if (leaveSpaceId) {
            leaveMutation.mutate(leaveSpaceId);
          }
        }}
      />
    </div>
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
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <p className="text-sm font-medium text-fg">{t("spaces.members")}</p>
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
                {member.role === "owner"
                  ? t("spaces.owner")
                  : t("spaces.member")}
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
              className="rounded-md border border-border bg-bg px-2 py-1 text-fg disabled:opacity-70"
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
