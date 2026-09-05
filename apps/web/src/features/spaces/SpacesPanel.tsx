import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { SpaceCardsSkeleton } from "../../shared/ui/Skeleton";
import { Spinner } from "../../shared/ui/Spinner";
import { setWelcomeIntent } from "../me/welcome-intent";
import { createSpace, joinSpace } from "./space-api";
import { SpaceSettingsCard } from "./SpaceSettingsCard";
import { useActiveSpace, setStoredActiveSpace } from "./use-active-space";

export function SpacesPanel() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { spacesQuery, spaces, activeSpace, spaceId, selectSpace } =
    useActiveSpace();
  const [errorMessage, setErrorMessage] = useState("");
  const joinPrefill = searchParams.get("join") ?? "";
  const showAddOpen = Boolean(joinPrefill) || spaces.length === 0;

  const createMutation = useMutation({
    mutationFn: createSpace,
    onSuccess: async (space) => {
      await queryClient.invalidateQueries({ queryKey: ["spaces"] });
      setStoredActiveSpace(space.id);
      selectSpace(space.id);
      setWelcomeIntent({ spaceId: space.id, firstSpace: false });
      navigate("/me");
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const joinMutation = useMutation({
    mutationFn: joinSpace,
    onSuccess: async (space) => {
      await queryClient.invalidateQueries({ queryKey: ["spaces"] });
      setStoredActiveSpace(space.id);
      selectSpace(space.id);
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

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

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-fg">{t("spaces.title")}</h2>
        <p className="mt-2 text-sm text-muted">{t("spaces.hint")}</p>
      </div>

      {errorMessage ? (
        <p className="text-sm text-expense-fg">{errorMessage}</p>
      ) : null}

      {spacesQuery.isLoading ? (
        <SpaceCardsSkeleton />
      ) : (
        <>
          {spaces.length > 1 && spaceId ? (
            <label className="flex max-w-sm flex-col gap-1 text-sm text-muted">
              {t("spaces.configureSpace")}
              <select
                className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
                value={spaceId}
                onChange={(event) => selectSpace(event.target.value)}
                aria-label={t("spaces.configureSpace")}
              >
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {activeSpace ? (
            <SpaceSettingsCard
              key={activeSpace.id}
              space={activeSpace}
              onError={setErrorMessage}
            />
          ) : spaces.length === 0 ? (
            <p className="text-sm text-muted">{t("spaces.empty")}</p>
          ) : null}

          <details
            className="rounded-lg border border-border bg-surface"
            open={showAddOpen}
          >
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-fg marker:content-none md:px-6 [&::-webkit-details-marker]:hidden">
              {t("spaces.addSpace")}
            </summary>
            <div className="grid gap-6 border-t border-border px-5 py-5 md:grid-cols-2 md:px-6">
              <form className="flex flex-col gap-2" onSubmit={onCreate}>
                <h3 className="font-medium text-fg">{t("spaces.create")}</h3>
                <input
                  name="name"
                  required
                  placeholder={t("spaces.createName")}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
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
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
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
            </div>
          </details>
        </>
      )}
    </div>
  );
}
