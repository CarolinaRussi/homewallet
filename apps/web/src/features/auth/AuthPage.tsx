import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { APP_NAME } from "@homewallet/shared";
import { loginAccount, loginWithGoogle, registerAccount } from "./auth-api";
import { GoogleSignIn } from "./GoogleSignIn";

export function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [errorMessage, setErrorMessage] = useState("");

  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const data = new FormData(form);
      const email = String(data.get("email") ?? "");
      const password = String(data.get("password") ?? "");
      if (mode === "register") {
        return registerAccount({
          email,
          password,
          name: String(data.get("name") ?? ""),
        });
      }
      return loginAccount({ email, password });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate("/spaces");
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const googleMutation = useMutation({
    mutationFn: loginWithGoogle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate("/spaces");
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    mutation.mutate(event.currentTarget);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm font-medium tracking-wide text-muted uppercase">
          {APP_NAME}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-fg">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>
      </div>

      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        {mode === "register" ? (
          <label className="flex flex-col gap-1 text-sm text-muted">
            Name
            <input
              name="name"
              required
              className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm text-muted">
          Email
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={mode === "register" ? 8 : undefined}
            className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
          />
        </label>
        {errorMessage ? (
          <p className="text-sm text-expense-fg">{errorMessage}</p>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-2 font-medium text-accent-fg"
          disabled={mutation.isPending}
        >
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <GoogleSignIn
        onCredential={(idToken) => googleMutation.mutate(idToken)}
      />

      <button
        type="button"
        className="text-left text-sm text-muted underline"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setErrorMessage("");
        }}
      >
        {mode === "login"
          ? "Need an account? Register"
          : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
