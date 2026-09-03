import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { createSpace, fetchSpaces, joinSpace } from "./space-api";

export function SpacesPanel() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState("");
  const spacesQuery = useQuery({ queryKey: ["spaces"], queryFn: fetchSpaces });

  const createMutation = useMutation({
    mutationFn: createSpace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["spaces"] }),
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const joinMutation = useMutation({
    mutationFn: joinSpace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["spaces"] }),
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
    <div className="flex max-w-lg flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-fg">{t("spaces.title")}</h2>
        <p className="mt-2 text-sm text-muted">{t("spaces.hint")}</p>
      </div>

      {errorMessage ? (
        <p className="text-sm text-expense-fg">{errorMessage}</p>
      ) : null}

      <section className="flex flex-col gap-3">
        {spacesQuery.data?.map((space) => (
          <article
            key={space.id}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <h3 className="font-medium text-fg">{space.name}</h3>
            <p className="text-sm text-muted">
              {space.role === "owner" ? t("spaces.owner") : t("spaces.member")}{" "}
              · {space.currency} ·{" "}
              {space.privacyMode === "private"
                ? t("spaces.private")
                : t("spaces.transparent")}
            </p>
            <p className="mt-2 text-sm text-muted">
              {t("spaces.joinCode")}:{" "}
              <span className="font-medium text-fg">{space.joinCode}</span>
            </p>
          </article>
        ))}
      </section>

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
          className="rounded-md bg-accent px-3 py-2 font-medium text-accent-fg"
        >
          {t("spaces.createSubmit")}
        </button>
      </form>

      <form className="flex flex-col gap-2" onSubmit={onJoin}>
        <h3 className="font-medium text-fg">{t("spaces.join")}</h3>
        <input
          name="joinCode"
          required
          minLength={8}
          placeholder={t("spaces.joinPlaceholder")}
          className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
        />
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-2 font-medium text-fg"
        >
          {t("spaces.joinSubmit")}
        </button>
      </form>
    </div>
  );
}
