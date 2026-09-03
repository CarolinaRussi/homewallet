import type { SessionUser } from "@homewallet/shared";
import { api } from "../../shared/lib/api";

export function fetchSession() {
  return api<{ user: SessionUser }>("/auth/me");
}

export function registerAccount(body: {
  email: string;
  password: string;
  name: string;
}) {
  return api<{ user: SessionUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function loginAccount(body: { email: string; password: string }) {
  return api<{ user: SessionUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function loginWithGoogle(idToken: string) {
  return api<{ user: SessionUser }>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export function logoutAccount() {
  return api<void>("/auth/logout", { method: "POST" });
}
