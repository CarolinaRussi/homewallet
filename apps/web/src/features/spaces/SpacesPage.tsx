import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { APP_NAME } from "@homewallet/shared";
import { logoutAccount } from "../auth/auth-api";
import { createSpace, fetchSpaces, joinSpace } from "./space-api";

export function SpacesPage() {
  const navigate = useNavigate();
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
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted uppercase">
            {APP_NAME}
          </p>
          <h1 className="text-3xl font-semibold text-fg">Your spaces</h1>
        </div>
        <button
          type="button"
          className="text-sm text-muted underline"
          onClick={async () => {
            await logoutAccount();
            await queryClient.clear();
            navigate("/");
          }}
        >
          Sign out
        </button>
      </header>

      {errorMessage ? (
        <p className="text-sm text-expense-fg">{errorMessage}</p>
      ) : null}

      <section className="flex flex-col gap-3">
        {spacesQuery.data?.map((space) => (
          <article
            key={space.id}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <h2 className="font-medium text-fg">{space.name}</h2>
            <p className="text-sm text-muted">
              {space.role} · {space.currency} · {space.privacyMode}
            </p>
            <p className="mt-2 text-sm text-muted">
              Join code:{" "}
              <span className="font-medium text-fg">{space.joinCode}</span>
            </p>
          </article>
        ))}
      </section>

      <form className="flex flex-col gap-2" onSubmit={onCreate}>
        <h2 className="font-medium text-fg">Create space</h2>
        <input
          name="name"
          required
          placeholder="Space name"
          className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-2 font-medium text-accent-fg"
        >
          Create
        </button>
      </form>

      <form className="flex flex-col gap-2" onSubmit={onJoin}>
        <h2 className="font-medium text-fg">Join with code</h2>
        <input
          name="joinCode"
          required
          minLength={8}
          placeholder="Join code"
          className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
        />
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-2 font-medium text-fg"
        >
          Join
        </button>
      </form>
    </main>
  );
}
