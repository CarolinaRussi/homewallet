import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { APP_NAME } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { Spinner } from "../../shared/ui/Spinner";
import { loginAccount, loginWithGoogle, registerAccount } from "./auth-api";
import { mapAuthError } from "./auth-errors";
import { GoogleSignIn } from "./GoogleSignIn";
import { setWelcomeIntent } from "../me/welcome-intent";
import {
  clearStoredActiveSpace,
  setStoredActiveSpace,
} from "../spaces/use-active-space";

type AuthPageProps = {
  mode: "login" | "register";
};

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { t, locale, setLocale } = useLocale();
  const [errorMessage, setErrorMessage] = useState("");
  const nextPath = searchParams.get("next");

  function goToWelcome(spaceId: string, firstSpace: boolean) {
    clearStoredActiveSpace();
    setStoredActiveSpace(spaceId);
    setWelcomeIntent({ spaceId, firstSpace });
    navigate("/me");
  }

  function afterAuth(options?: { welcomeSpace?: boolean; spaceId?: string }) {
    if (options?.welcomeSpace && options.spaceId) {
      goToWelcome(options.spaceId, true);
      return;
    }
    if (nextPath?.startsWith("/")) {
      navigate(nextPath);
      return;
    }
    navigate("/me");
  }

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
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      await queryClient.invalidateQueries({ queryKey: ["spaces"] });
      if (mode === "register" && "spaceId" in result) {
        afterAuth({ welcomeSpace: true, spaceId: result.spaceId });
        return;
      }
      afterAuth();
    },
    onError: (error) => setErrorMessage(mapAuthError(error, t)),
  });

  const googleMutation = useMutation({
    mutationFn: loginWithGoogle,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      await queryClient.invalidateQueries({ queryKey: ["spaces"] });
      afterAuth({
        welcomeSpace: result.createdSpace,
        spaceId: result.spaceId,
      });
    },
    onError: (error) => setErrorMessage(mapAuthError(error, t)),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    mutation.mutate(event.currentTarget);
  }

  const switchTo =
    mode === "login"
      ? `/register${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`
      : `/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/"
            className="text-sm font-medium tracking-wide text-muted uppercase"
          >
            {APP_NAME}
          </Link>
          <h1 className="mt-1 text-3xl font-semibold text-fg">
            {mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
          </h1>
        </div>
        <select
          aria-label={t("locale.label")}
          className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-fg"
          value={locale}
          onChange={(event) =>
            setLocale(event.target.value === "en" ? "en" : "pt-BR")
          }
        >
          <option value="pt-BR">PT</option>
          <option value="en">EN</option>
        </select>
      </div>

      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        {mode === "register" ? (
          <label className="flex flex-col gap-1 text-sm text-muted">
            {t("auth.name")}
            <input
              name="name"
              required
              className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm text-muted">
          {t("auth.email")}
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          {t("auth.passLabel")}
          <input
            name="password"
            type="password"
            required
            minLength={mode === "register" ? 8 : undefined}
            className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
          />
        </label>
        {errorMessage ? (
          <p
            role="alert"
            className="hw-feedback rounded-md border border-expense-fg/30 bg-expense px-3 py-2 text-sm text-expense-fg"
          >
            {errorMessage}
          </p>
        ) : null}
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 font-medium text-accent-fg disabled:opacity-70"
          disabled={mutation.isPending || googleMutation.isPending}
        >
          {mutation.isPending ? <Spinner /> : null}
          {mutation.isPending
            ? mode === "login"
              ? t("auth.signingIn")
              : t("auth.creatingAccount")
            : mode === "login"
              ? t("auth.signIn")
              : t("auth.createAccount")}
        </button>
      </form>

      {mode === "login" ? (
        <Link to="/forgot-password" className="text-sm text-muted underline">
          {t("auth.forgotPass")}
        </Link>
      ) : null}

      <GoogleSignIn
        onCredential={(idToken) => googleMutation.mutate(idToken)}
      />

      <Link to={switchTo} className="text-sm text-muted underline">
        {mode === "login" ? t("auth.needAccount") : t("auth.haveAccount")}
      </Link>
    </main>
  );
}
